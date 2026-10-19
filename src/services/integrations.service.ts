import { prisma } from "@/lib/prisma";
import { encryptSecret } from "@/lib/crypto";
import { ENV_VARS, TWILIO_SMS_ENV_VARS, TWILIO_VOICE_ENV_VARS } from "@/lib/constants/environment";
import {
  ACCOUNT_STATUS,
  CONNECTED_ACCOUNT_AUDIT_ACTION,
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
