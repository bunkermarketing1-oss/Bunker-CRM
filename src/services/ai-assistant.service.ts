import { prisma } from "@/lib/prisma";
import { clientBelongsToOrg } from "@/lib/validation-helpers";
import { businessHoursSchema, type ClientAiAssistantInput } from "@/lib/validations/ai-assistant";
import {
  AI_ASSISTANT_AUDIT_ACTION,
  DEFAULT_AI_HANDOFF_MESSAGE,
  DEFAULT_AI_MAX_REPLIES_PER_DAY,
  DEFAULT_AI_TIMEZONE,
  DEFAULT_BUSINESS_HOURS,
} from "@/lib/constants/ai-assistant";
import type { BusinessHours, ClientAiAssistantSettings } from "@/types/ai-assistant";

/** Horario guardado como JSON en texto. null si está corrupto: el asistente no contesta. */
export function parseBusinessHours(raw: string): BusinessHours | null {
  try {
    const parsed = businessHoursSchema.safeParse(JSON.parse(raw));
    // Con `strict: false` Zod infiere las claves como opcionales; el esquema exige las 7.
    return parsed.success ? (parsed.data as BusinessHours) : null;
  } catch {
    return null;
  }
}

const assistantSelect = {
  isEnabled: true,
  timezone: true,
  businessHoursJson: true,
  knowledgeBase: true,
  instructions: true,
  handoffMessage: true,
  maxRepliesPerDay: true,
  updatedAt: true,
} as const;

type AssistantRow = {
  isEnabled: boolean;
  timezone: string;
  businessHoursJson: string;
  knowledgeBase: string;
  instructions: string | null;
  handoffMessage: string;
  maxRepliesPerDay: number;
  updatedAt: Date;
};

function toSettings(clientId: string, row: AssistantRow | null): ClientAiAssistantSettings {
  if (!row) {
    return {
      clientId,
      isEnabled: false,
      timezone: DEFAULT_AI_TIMEZONE,
      businessHours: DEFAULT_BUSINESS_HOURS,
      knowledgeBase: "",
      instructions: "",
      handoffMessage: DEFAULT_AI_HANDOFF_MESSAGE,
      maxRepliesPerDay: DEFAULT_AI_MAX_REPLIES_PER_DAY,
      updatedAt: null,
    };
  }
  return {
    clientId,
    isEnabled: row.isEnabled,
    timezone: row.timezone,
    businessHours: parseBusinessHours(row.businessHoursJson) ?? DEFAULT_BUSINESS_HOURS,
    knowledgeBase: row.knowledgeBase,
    instructions: row.instructions ?? "",
    handoffMessage: row.handoffMessage,
    maxRepliesPerDay: row.maxRepliesPerDay,
    updatedAt: row.updatedAt.toISOString(),
  };
}

/** Configuración del asistente del cliente (valores por defecto si no existe). null = el cliente no es de la organización. */
export async function getClientAiAssistant(organizationId: string, clientId: string) {
  if (!(await clientBelongsToOrg(organizationId, clientId))) return null;
  const row = await prisma.clientAiAssistant.findFirst({ where: { organizationId, clientId }, select: assistantSelect });
  return toSettings(clientId, row);
}

/** Campos que cambiaron, para el AuditLog (sin copiar los textos, que pueden ser largos). */
function changedFields(previous: ClientAiAssistantSettings, next: ClientAiAssistantInput) {
  const fields: string[] = [];
  if (previous.isEnabled !== next.isEnabled) fields.push("isEnabled");
  if (previous.timezone !== next.timezone) fields.push("timezone");
  if (JSON.stringify(previous.businessHours) !== JSON.stringify(next.businessHours)) fields.push("businessHours");
  if (previous.knowledgeBase !== next.knowledgeBase) fields.push("knowledgeBase");
  if (previous.instructions !== next.instructions) fields.push("instructions");
  if (previous.handoffMessage !== next.handoffMessage) fields.push("handoffMessage");
  if (previous.maxRepliesPerDay !== next.maxRepliesPerDay) fields.push("maxRepliesPerDay");
  return fields;
}

/** Crea o reemplaza la configuración. null = el cliente no es de la organización. */
export async function saveClientAiAssistant(organizationId: string, userId: string, clientId: string, input: ClientAiAssistantInput) {
  const previous = await getClientAiAssistant(organizationId, clientId);
  if (!previous) return null;

  const data = {
    isEnabled: input.isEnabled,
    timezone: input.timezone,
    businessHoursJson: JSON.stringify(input.businessHours),
    knowledgeBase: input.knowledgeBase,
    instructions: input.instructions || null,
    handoffMessage: input.handoffMessage,
    maxRepliesPerDay: input.maxRepliesPerDay,
    updatedById: userId,
  };
  const row = await prisma.clientAiAssistant.upsert({
    where: { clientId },
    create: { organizationId, clientId, ...data },
    update: data,
    select: assistantSelect,
  });

  await prisma.auditLog.create({
    data: {
      organizationId,
      userId,
      action: AI_ASSISTANT_AUDIT_ACTION.UPDATED,
      entityType: "ClientAiAssistant",
      entityId: clientId,
      detailsJson: JSON.stringify({
        changed: changedFields(previous, input),
        isEnabled: input.isEnabled,
        timezone: input.timezone,
        maxRepliesPerDay: input.maxRepliesPerDay,
        knowledgeBaseLength: input.knowledgeBase.length,
      }),
    },
  });
  return toSettings(clientId, row);
}
