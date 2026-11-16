import { prisma } from "@/lib/prisma";
import { isOrgMember } from "@/lib/validation-helpers";
import { CLIENT_STATUS, OPPORTUNITY_STATUS } from "@/lib/constants/crm";
import { AD_ACCOUNT_TYPES, CONNECTED_ACCOUNT_AUDIT_ACTION } from "@/lib/constants/integrations";
import type { CreateClientInput } from "@/lib/validations/client";
import type { Actor } from "@/services/integrations.service";

/** Probabilidad con la que arranca la oportunidad del alta: misma que usa por defecto el pipeline. */
const INITIAL_DEAL_PROBABILITY = 50;

/** Error de negocio con el status HTTP que la ruta debe responder. */
export class ClientServiceError extends Error {
  constructor(message: string, public status: 400 | 404 | 409) {
    super(message);
  }
}

type Tx = Parameters<Parameters<typeof prisma.$transaction>[0]>[0];

interface LinkableAccount {
  id: string;
  accountName: string;
  accountType: string | null;
  externalId: string | null;
}

const linkableAccountSelect = { id: true, accountName: true, accountType: true, externalId: true, clientId: true } as const;

/**
 * Busca la cuenta que el asistente pidió vincular. Solo se aceptan cuentas sin cliente: reasignar
 * una cuenta ajena desde un alta movería sus leads y métricas a otro cliente sin que nadie lo note.
 */
async function findLinkableAccount(tx: Tx, organizationId: string, input: CreateClientInput): Promise<LinkableAccount | null> {
  if (input.connectedAccountId) {
    const account = await tx.connectedAccount.findFirst({
      where: { id: input.connectedAccountId, organizationId },
      select: linkableAccountSelect,
    });
    if (!account) throw new ClientServiceError("La cuenta seleccionada no existe en su organización.", 404);
    if (account.clientId) {
      throw new ClientServiceError(`La cuenta "${account.accountName}" ya está asignada a otro cliente.`, 409);
    }
    return account;
  }

  if (!input.adAccountExternalId) return null;

  const matches = await tx.connectedAccount.findMany({
    where: {
      organizationId,
      externalId: input.adAccountExternalId,
      accountType: { in: input.adAccountType ? [input.adAccountType] : AD_ACCOUNT_TYPES },
    },
    select: linkableAccountSelect,
  });
  if (matches.length === 0) {
    throw new ClientServiceError(
      `No hay ninguna cuenta publicitaria conectada con el ID ${input.adAccountExternalId}. Conéctala primero desde Integraciones.`,
      404
    );
  }
  const assigned = matches.find((acc) => acc.clientId);
  if (assigned) {
    throw new ClientServiceError(`La cuenta "${assigned.accountName}" ya está asignada a otro cliente.`, 409);
  }
  if (matches.length > 1) {
    throw new ClientServiceError("Hay varias cuentas con ese ID; selecciónala desde el portafolio de la agencia.", 409);
  }
  return matches[0];
}

/** Alta de cliente con contacto, cuenta vinculada y oportunidad inicial: todo o nada. */
export async function createClient(actor: Actor, input: CreateClientInput) {
  if (input.ownerId && !(await isOrgMember(actor.organizationId, input.ownerId))) {
    throw new ClientServiceError("El responsable asignado no pertenece a su organización.", 400);
  }

  return prisma.$transaction(async (tx) => {
    const account = await findLinkableAccount(tx, actor.organizationId, input);

    const client = await tx.client.create({
      data: {
        organizationId: actor.organizationId,
        name: input.name,
        companyName: input.companyName,
        email: input.email,
        phone: input.phone,
        website: input.website,
        industry: input.industry || "General",
        logoUrl: input.logoUrl,
        revenue: input.revenue ?? 0,
        smsConsent: input.smsConsent ?? true,
        smsConsentAt: input.smsConsent ? new Date() : null,
        notes: input.notes,
        ownerId: input.ownerId || actor.userId,
        status: CLIENT_STATUS.ACTIVE,
        isDemo: false,
      },
    });

    const contact = input.primaryContact;
    if (contact) {
      await tx.contact.create({
        data: {
          organizationId: actor.organizationId,
          clientId: client.id,
          firstName: contact.firstName,
          lastName: contact.lastName,
          email: contact.email,
          phone: contact.phone,
          jobTitle: contact.jobTitle || "Contacto Principal",
          isPrimary: true,
        },
      });
    }

    if (account) {
      // El filtro clientId: null evita pisar una asignación hecha por otra persona entre la lectura y la escritura.
      const { count } = await tx.connectedAccount.updateMany({
        where: { id: account.id, organizationId: actor.organizationId, clientId: null },
        data: { clientId: client.id },
      });
      if (count === 0) {
        throw new ClientServiceError(`La cuenta "${account.accountName}" ya está asignada a otro cliente.`, 409);
      }
      await tx.auditLog.create({
        data: {
          organizationId: actor.organizationId,
          userId: actor.userId,
          action: CONNECTED_ACCOUNT_AUDIT_ACTION.ASSIGNED,
          entityType: "ConnectedAccount",
          entityId: account.id,
          detailsJson: JSON.stringify({
            accountName: account.accountName,
            accountType: account.accountType,
            externalId: account.externalId,
            fromClientId: null,
            toClientId: client.id,
            source: "client_onboarding",
          }),
        },
      });
    }

    if (input.initialDeal?.enabled) {
      const firstStage = await tx.pipelineStage.findFirst({
        where: { organizationId: actor.organizationId },
        orderBy: { order: "asc" },
        select: { id: true },
      });
      if (firstStage) {
        await tx.opportunity.create({
          data: {
            organizationId: actor.organizationId,
            clientId: client.id,
            stageId: firstStage.id,
            title: input.initialDeal.title || `Campaña Inicial - ${client.name}`,
            value: input.initialDeal.value ?? 0,
            probability: INITIAL_DEAL_PROBABILITY,
            status: OPPORTUNITY_STATUS.OPEN,
          },
        });
      }
    }

    await tx.auditLog.create({
      data: {
        organizationId: actor.organizationId,
        userId: actor.userId,
        action: "client_created",
        entityType: "Client",
        entityId: client.id,
        detailsJson: JSON.stringify({
          name: client.name,
          email: client.email,
          hasPrimaryContact: Boolean(contact),
          linkedAccountId: account?.id ?? null,
        }),
      },
    });

    return client;
  });
}
