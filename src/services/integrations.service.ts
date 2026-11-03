import { prisma } from "@/lib/prisma";
import { decryptSecret, encryptSecret } from "@/lib/crypto";
import { listMetaAdAccounts, listMetaPages } from "@/lib/integrations/meta";
import { provisionTwilioVoiceCredentials } from "@/lib/integrations/twilio";
import { subscribeMetaPagesToLeadgen } from "@/services/meta-leads.service";
import { ENV_VARS, TWILIO_SMS_ENV_VARS, TWILIO_VOICE_ENV_VARS } from "@/lib/constants/environment";
import {
  ACCOUNT_STATUS,
  ACCOUNT_TYPE,
  CONNECTED_ACCOUNT_AUDIT_ACTION,
  INTEGRATION_PROVIDER,
  INTEGRATION_PROVIDER_NAME,
  INTEGRATION_STATUS,
} from "@/lib/constants/integrations";
import type { ConnectAccountInput } from "@/lib/validations/integrations";
import type { ConnectedAccountSummary, TwilioEnvStatus } from "@/types/integrations";

/** Error de negocio con el status HTTP que la ruta debe responder. */
export class ConnectedAccountError extends Error {
  constructor(message: string, public status: 400 | 404 | 409) {
    super(message);
  }
}

export interface Actor {
  organizationId: string;
  userId: string;
}

export interface StoredTwilioVoiceConfig {
  fromPhone?: string | null;
  apiKeySid?: string;
  apiKeySecret?: string;
  twimlAppSid?: string;
}

let twilioRuntimePromise: Promise<void> | null = null;

function hasAllTwilioRuntimeVars(): boolean {
  return Boolean(
    process.env.TWILIO_PHONE_NUMBER &&
      process.env.TWILIO_API_KEY_SID &&
      process.env.TWILIO_API_KEY_SECRET &&
      process.env.TWILIO_TWIML_APP_SID
  );
}

async function loadTwilioRuntimeConfig(): Promise<void> {
  if (hasAllTwilioRuntimeVars()) return;

  try {
    const integration = await prisma.integration.findFirst({
      where: { provider: INTEGRATION_PROVIDER.TWILIO },
      select: { id: true, configJson: true },
    });

    if (integration?.configJson) {
      try {
        const raw = decryptSecret(integration.configJson);
        const parsed = JSON.parse(raw) as StoredTwilioVoiceConfig;
        if (!process.env.TWILIO_PHONE_NUMBER && parsed.fromPhone) {
          process.env.TWILIO_PHONE_NUMBER = parsed.fromPhone;
        }
        if (!process.env.TWILIO_API_KEY_SID && parsed.apiKeySid) {
          process.env.TWILIO_API_KEY_SID = parsed.apiKeySid;
        }
        if (!process.env.TWILIO_API_KEY_SECRET && parsed.apiKeySecret) {
          process.env.TWILIO_API_KEY_SECRET = parsed.apiKeySecret;
        }
        if (!process.env.TWILIO_TWIML_APP_SID && parsed.twimlAppSid) {
          process.env.TWILIO_TWIML_APP_SID = parsed.twimlAppSid;
        }
      } catch {
        // Si configJson fue cifrado con otra clave o no es válido, continúa al auto-aprovisionamiento
      }
    }

    if (
      (!process.env.TWILIO_API_KEY_SID ||
        !process.env.TWILIO_API_KEY_SECRET ||
        !process.env.TWILIO_TWIML_APP_SID) &&
      process.env.TWILIO_ACCOUNT_SID &&
      process.env.TWILIO_AUTH_TOKEN
    ) {
      const provisioned = await provisionTwilioVoiceCredentials(
        process.env.TWILIO_ACCOUNT_SID,
        process.env.TWILIO_AUTH_TOKEN,
        process.env.TWILIO_PHONE_NUMBER
      );
      if (provisioned) {
        if (!process.env.TWILIO_PHONE_NUMBER && provisioned.fromPhone) {
          process.env.TWILIO_PHONE_NUMBER = provisioned.fromPhone;
        }
        process.env.TWILIO_API_KEY_SID = provisioned.apiKeySid;
        process.env.TWILIO_API_KEY_SECRET = provisioned.apiKeySecret;
        process.env.TWILIO_TWIML_APP_SID = provisioned.twimlAppSid;

        if (integration) {
          try {
            const encrypted = encryptSecret(JSON.stringify(provisioned));
            await prisma.integration.update({
              where: { id: integration.id },
              data: {
                configJson: encrypted,
                status: INTEGRATION_STATUS.CONNECTED,
                lastSyncAt: new Date(),
                errorMessage: null,
              },
            });
          } catch {
            // No bloquear si el cifrado local no está disponible
          }
        }
      }
    }
  } catch (error) {
    console.warn("Advertencia al sincronizar configuración de voz de Twilio:", error);
  }
}

/**
 * Garantiza que las variables de voz de Twilio (`TWILIO_API_KEY_SID`, `TWILIO_API_KEY_SECRET`,
 * `TWILIO_TWIML_APP_SID`, `TWILIO_PHONE_NUMBER`) estén cargadas en memoria desde la base de datos
 * o auto-aprovisionadas desde Twilio REST API si solo se definieron `TWILIO_ACCOUNT_SID` y `TWILIO_AUTH_TOKEN`.
 */
export async function ensureTwilioRuntimeConfig(): Promise<void> {
  if (hasAllTwilioRuntimeVars()) return;
  if (!twilioRuntimePromise) {
    twilioRuntimePromise = loadTwilioRuntimeConfig().finally(() => {
      twilioRuntimePromise = null;
    });
  }
  await twilioRuntimePromise;
}

/** Nunca incluye `accessTokenEnc`: esta forma es la que viaja al navegador. */
const accountSummarySelect = {
  id: true,
  accountName: true,
  accountType: true,
  externalId: true,
  status: true,
  clientId: true,
  client: { select: { id: true, name: true } },
} as const;

/**
 * Registra (o actualiza) a mano una cuenta publicitaria o página y la vincula a un cliente o al
 * portafolio de la agencia. `input.clientId` undefined conserva la asignación actual.
 */
export async function connectAccount(
  actor: Actor,
  input: ConnectAccountInput
): Promise<{ account: ConnectedAccountSummary; clientName: string | null }> {
  let clientName: string | null = null;
  if (input.clientId) {
    const client = await prisma.client.findFirst({
      where: { id: input.clientId, organizationId: actor.organizationId, isDeleted: false },
      select: { name: true },
    });
    if (!client) {
      throw new ConnectedAccountError("El cliente seleccionado no pertenece a su organización.", 404);
    }
    clientName = client.name;
  }

  const tokenEnc = input.accessToken ? encryptSecret(input.accessToken) : null;

  return prisma.$transaction(async (tx) => {
    let integration = await tx.integration.findFirst({
      where: { organizationId: actor.organizationId, provider: input.provider },
      select: { id: true, status: true },
    });

    if (!integration) {
      integration = await tx.integration.create({
        data: {
          organizationId: actor.organizationId,
          provider: input.provider,
          name: INTEGRATION_PROVIDER_NAME[input.provider],
          status: INTEGRATION_STATUS.CONNECTED,
          description: "Cuentas publicitarias y páginas conectadas para captura de leads y métricas.",
        },
        select: { id: true, status: true },
      });
    } else if (integration.status !== INTEGRATION_STATUS.CONNECTED) {
      await tx.integration.update({
        where: { id: integration.id },
        data: { status: INTEGRATION_STATUS.CONNECTED, errorMessage: null },
      });
    }

    const uniqueKey = {
      integrationId: integration.id,
      accountType: input.accountType,
      externalId: input.externalId,
    };
    const existing = await tx.connectedAccount.findUnique({
      where: { integrationId_accountType_externalId: uniqueKey },
      select: { id: true, clientId: true },
    });

    const account = existing
      ? await tx.connectedAccount.update({
          where: { id: existing.id },
          data: {
            accountName: input.accountName,
            status: ACCOUNT_STATUS.ACTIVE,
            ...(input.clientId !== undefined ? { clientId: input.clientId } : {}),
            ...(tokenEnc ? { accessTokenEnc: tokenEnc } : {}),
          },
          select: accountSummarySelect,
        })
      : await tx.connectedAccount.create({
          data: {
            organizationId: actor.organizationId,
            ...uniqueKey,
            clientId: input.clientId ?? null,
            accountName: input.accountName,
            status: ACCOUNT_STATUS.ACTIVE,
            accessTokenEnc: tokenEnc,
          },
          select: accountSummarySelect,
        });

    await tx.auditLog.create({
      data: {
        organizationId: actor.organizationId,
        userId: actor.userId,
        action: CONNECTED_ACCOUNT_AUDIT_ACTION.LINKED,
        entityType: "ConnectedAccount",
        entityId: account.id,
        detailsJson: JSON.stringify({
          provider: input.provider,
          accountType: input.accountType,
          accountName: account.accountName,
          externalId: input.externalId,
          created: !existing,
          fromClientId: existing?.clientId ?? null,
          toClientId: account.clientId,
          tokenUpdated: Boolean(tokenEnc),
        }),
      },
    });

    // Si no se pidió cambiar el cliente, el nombre a mostrar es el de la asignación que se conservó.
    return { account, clientName: clientName ?? account.client?.name ?? null };
  });
}

/** Solo reporta si cada variable está definida, jamás su valor. */
export function getTwilioEnvStatus(): TwilioEnvStatus {
  const isSet = (name: string) => Boolean(process.env[name]?.trim());
  const twilioNames: readonly string[] = [...TWILIO_SMS_ENV_VARS, ...TWILIO_VOICE_ENV_VARS];
  const smsReady = TWILIO_SMS_ENV_VARS.every(isSet);

  return {
    smsReady,
    voiceReady: smsReady && TWILIO_VOICE_ENV_VARS.every(isSet),
    variables: ENV_VARS.filter((spec) => twilioNames.includes(spec.name)).map((spec) => ({
      ...spec,
      isSet: isSet(spec.name),
    })),
  };
}

export interface RefreshMetaCatalogResult {
  adAccountsCount: number;
  pagesCount: number;
  newAccountsCount: number;
  newPagesCount: number;
  message: string;
}

/**
 * Re-escanea el catálogo de Meta (cuentas publicitarias, páginas de FB e Instagram)
 * utilizando el token de larga duración almacenado, sin requerir re-autorización OAuth.
 */
export async function refreshMetaCatalog(actor: Actor): Promise<RefreshMetaCatalogResult> {
  const integration = await prisma.integration.findFirst({
    where: { organizationId: actor.organizationId, provider: INTEGRATION_PROVIDER.META },
  });

  if (!integration || integration.status !== INTEGRATION_STATUS.CONNECTED) {
    throw new ConnectedAccountError(
      "Meta for Business no está conectado en el sistema. Conéctalo primero con el botón de Facebook.",
      400
    );
  }

  // Buscar el token de usuario guardado (específicamente en META_AD_ACCOUNT, donde vive el token de usuario y no el token de página)
  let accountWithUserToken = await prisma.connectedAccount.findFirst({
    where: {
      integrationId: integration.id,
      organizationId: actor.organizationId,
      accountType: ACCOUNT_TYPE.META_AD_ACCOUNT,
      accessTokenEnc: { not: null },
      status: { not: ACCOUNT_STATUS.DISABLED },
    },
    orderBy: { createdAt: "desc" },
    select: { accessTokenEnc: true },
  });

  // Fallback si no hay ad accounts registradas
  if (!accountWithUserToken) {
    accountWithUserToken = await prisma.connectedAccount.findFirst({
      where: {
        integrationId: integration.id,
        organizationId: actor.organizationId,
        accessTokenEnc: { not: null },
        status: { not: ACCOUNT_STATUS.DISABLED },
      },
      orderBy: { createdAt: "desc" },
      select: { accessTokenEnc: true },
    });
  }

  if (!accountWithUserToken?.accessTokenEnc) {
    throw new ConnectedAccountError(
      "No se encontró un token de acceso guardado para Meta. Por favor vuelve a conectar con Facebook.",
      400
    );
  }

  let userToken: string;
  try {
    userToken = decryptSecret(accountWithUserToken.accessTokenEnc);
  } catch {
    throw new ConnectedAccountError(
      "No se pudo descifrar el token de Meta. Por favor vuelve a conectar con Facebook.",
      400
    );
  }

  let adAccounts: Awaited<ReturnType<typeof listMetaAdAccounts>> = [];
  let pages: Awaited<ReturnType<typeof listMetaPages>> = [];
  let adAccountsError: string | null = null;
  let pagesError: string | null = null;

  try {
    adAccounts = await listMetaAdAccounts(userToken);
  } catch (err: unknown) {
    adAccountsError = err instanceof Error ? err.message : String(err);
    console.warn("Advertencia al obtener cuentas publicitarias de Meta:", adAccountsError);
  }

  try {
    pages = await listMetaPages(userToken);
  } catch (err: unknown) {
    pagesError = err instanceof Error ? err.message : String(err);
    console.warn("Advertencia al obtener páginas de Meta:", pagesError);
  }

  if (adAccounts.length === 0 && pages.length === 0 && (adAccountsError || pagesError)) {
    throw new ConnectedAccountError(`Error de Meta API: ${adAccountsError || pagesError}`, 400);
  }

  let newAccountsCount = 0;
  let newPagesCount = 0;

  const userTokenEnc = encryptSecret(userToken);
  const base = {
    organizationId: actor.organizationId,
    integrationId: integration.id,
    status: ACCOUNT_STATUS.ACTIVE,
  };

  // Cuentas de anuncios
  for (const acc of adAccounts) {
    const existing = await prisma.connectedAccount.findUnique({
      where: {
        integrationId_accountType_externalId: {
          integrationId: integration.id,
          accountType: ACCOUNT_TYPE.META_AD_ACCOUNT,
          externalId: acc.id,
        },
      },
      select: { id: true },
    });

    if (!existing) newAccountsCount++;

    await prisma.connectedAccount.upsert({
      where: {
        integrationId_accountType_externalId: {
          integrationId: integration.id,
          accountType: ACCOUNT_TYPE.META_AD_ACCOUNT,
          externalId: acc.id,
        },
      },
      create: {
        ...base,
        accountType: ACCOUNT_TYPE.META_AD_ACCOUNT,
        externalId: acc.id,
        accountName: acc.name,
        accessTokenEnc: userTokenEnc,
        metadataJson: JSON.stringify({ currency: acc.currency, accountStatus: acc.account_status }),
      },
      update: {
        accountName: acc.name,
        metadataJson: JSON.stringify({ currency: acc.currency, accountStatus: acc.account_status }),
      },
    });
  }

  // Páginas de Facebook e Instagram
  for (const page of pages) {
    const pageTokenEnc = encryptSecret(page.access_token);
    const existing = await prisma.connectedAccount.findUnique({
      where: {
        integrationId_accountType_externalId: {
          integrationId: integration.id,
          accountType: ACCOUNT_TYPE.FACEBOOK_PAGE,
          externalId: page.id,
        },
      },
      select: { id: true },
    });

    if (!existing) newPagesCount++;

    await prisma.connectedAccount.upsert({
      where: {
        integrationId_accountType_externalId: {
          integrationId: integration.id,
          accountType: ACCOUNT_TYPE.FACEBOOK_PAGE,
          externalId: page.id,
        },
      },
      create: {
        ...base,
        accountType: ACCOUNT_TYPE.FACEBOOK_PAGE,
        externalId: page.id,
        accountName: page.name,
        accessTokenEnc: pageTokenEnc,
      },
      update: {
        accountName: page.name,
        accessTokenEnc: pageTokenEnc,
      },
    });

    if (page.instagram_business_account) {
      const ig = page.instagram_business_account;
      await prisma.connectedAccount.upsert({
        where: {
          integrationId_accountType_externalId: {
            integrationId: integration.id,
            accountType: ACCOUNT_TYPE.INSTAGRAM_BUSINESS,
            externalId: ig.id,
          },
        },
        create: {
          ...base,
          accountType: ACCOUNT_TYPE.INSTAGRAM_BUSINESS,
          externalId: ig.id,
          accountName: ig.username ? `@${ig.username}` : `Instagram de ${page.name}`,
          accessTokenEnc: pageTokenEnc,
          metadataJson: JSON.stringify({ pageId: page.id }),
        },
        update: {
          accountName: ig.username ? `@${ig.username}` : `Instagram de ${page.name}`,
          accessTokenEnc: pageTokenEnc,
          metadataJson: JSON.stringify({ pageId: page.id }),
        },
      });
    }
  }

  // Actualizar suscripción leadgen en páginas
  await subscribeMetaPagesToLeadgen(integration.id);

  await prisma.integration.update({
    where: { id: integration.id },
    data: { lastSyncAt: new Date() },
  });

  await prisma.auditLog.create({
    data: {
      organizationId: actor.organizationId,
      userId: actor.userId,
      action: "meta_catalog_refreshed",
      entityType: "Integration",
      entityId: integration.id,
      detailsJson: JSON.stringify({
        adAccountsCount: adAccounts.length,
        pagesCount: pages.length,
        newAccountsCount,
        newPagesCount,
      }),
    },
  });

  return {
    adAccountsCount: adAccounts.length,
    pagesCount: pages.length,
    newAccountsCount,
    newPagesCount,
    message: `Catálogo de Meta actualizado: ${adAccounts.length} cuenta(s) publicitaria(s) y ${pages.length} página(s) sincronizadas (${newAccountsCount + newPagesCount} nuevas añadidas).`,
  };
}
