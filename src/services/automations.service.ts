import { prisma } from "@/lib/prisma";
import { clientBelongsToOrg } from "@/lib/validation-helpers";
import { sendTwilioSms } from "@/lib/integrations/twilio";
import { firstNameOf, renderSmsTemplate } from "@/lib/automations/sms-template";
import { AUTOMATION_ACTION, AUTOMATION_TRIGGER } from "@/lib/constants/automations";
import { ACTIVITY_TYPE } from "@/lib/constants/crm";
import { MESSAGE_CHANNEL, MESSAGE_DIRECTION, MESSAGE_STATUS } from "@/lib/constants/messaging";
import type { LeadSource } from "@/lib/validations/lead";
import type { CreateSmsAutomationInput, UpdateSmsAutomationInput } from "@/lib/validations/automation";
import type { SmsAutomationSummary } from "@/types/automations";

/** El cliente indicado no existe en la organización (la ruta responde 400). */
export class AutomationClientNotFoundError extends Error {
  constructor() {
    super("El cliente seleccionado no existe en tu organización.");
  }
}

interface SmsCondition {
  sources?: LeadSource[];
}

interface SmsPayload {
  template?: string;
}

function parseJson<T>(raw: string | null): T {
  try {
    return raw ? (JSON.parse(raw) as T) : ({} as T);
  } catch {
    return {} as T;
  }
}

const ruleSelect = {
  id: true,
  name: true,
  clientId: true,
  conditionJson: true,
  actionPayload: true,
  isActive: true,
  executionCount: true,
  lastRunAt: true,
  createdAt: true,
  client: { select: { name: true } },
} as const;

type RuleRow = {
  id: string;
  name: string;
  clientId: string | null;
  conditionJson: string | null;
  actionPayload: string | null;
  isActive: boolean;
  executionCount: number;
  lastRunAt: Date | null;
  createdAt: Date;
  client: { name: string } | null;
};

function toSummary(rule: RuleRow): SmsAutomationSummary {
  return {
    id: rule.id,
    name: rule.name,
    clientId: rule.clientId,
    clientName: rule.client?.name ?? null,
    sources: parseJson<SmsCondition>(rule.conditionJson).sources ?? [],
    template: parseJson<SmsPayload>(rule.actionPayload).template ?? "",
    isActive: rule.isActive,
    executionCount: rule.executionCount,
    lastRunAt: rule.lastRunAt?.toISOString() ?? null,
    createdAt: rule.createdAt.toISOString(),
  };
}

const smsRuleWhere = (organizationId: string) => ({
  organizationId,
  triggerEvent: AUTOMATION_TRIGGER.LEAD_CREATED,
  actionType: AUTOMATION_ACTION.SEND_SMS,
});

async function audit(organizationId: string, userId: string, action: string, ruleId: string, details: object) {
  await prisma.auditLog.create({
    data: { organizationId, userId, action, entityType: "AutomationRule", entityId: ruleId, detailsJson: JSON.stringify(details) },
  });
}

export async function listSmsAutomations(organizationId: string) {
  const rules = await prisma.automationRule.findMany({
    where: smsRuleWhere(organizationId),
    select: ruleSelect,
    orderBy: { createdAt: "desc" },
  });
  return rules.map(toSummary);
}

export async function createSmsAutomation(organizationId: string, userId: string, input: CreateSmsAutomationInput) {
  if (input.clientId && !(await clientBelongsToOrg(organizationId, input.clientId))) {
    throw new AutomationClientNotFoundError();
  }

  const rule = await prisma.automationRule.create({
    data: {
      organizationId,
      clientId: input.clientId,
      name: input.name,
      triggerEvent: AUTOMATION_TRIGGER.LEAD_CREATED,
      actionType: AUTOMATION_ACTION.SEND_SMS,
      conditionJson: JSON.stringify({ sources: input.sources } satisfies SmsCondition),
      actionPayload: JSON.stringify({ template: input.template } satisfies SmsPayload),
      isActive: input.isActive,
    },
    select: ruleSelect,
  });

  await audit(organizationId, userId, "automation_created", rule.id, { name: rule.name, clientId: rule.clientId });
  return toSummary(rule);
}

/** Devuelve null si la regla no existe en la organización. */
export async function updateSmsAutomation(
  organizationId: string,
  userId: string,
  ruleId: string,
  input: UpdateSmsAutomationInput
) {
  const existing = await prisma.automationRule.findFirst({
    where: { id: ruleId, ...smsRuleWhere(organizationId) },
    select: { id: true },
  });
  if (!existing) return null;

  if (input.clientId && !(await clientBelongsToOrg(organizationId, input.clientId))) {
    throw new AutomationClientNotFoundError();
  }

  const rule = await prisma.automationRule.update({
    where: { id: ruleId },
    data: {
      name: input.name,
      clientId: input.clientId,
      isActive: input.isActive,
      conditionJson: input.sources ? JSON.stringify({ sources: input.sources } satisfies SmsCondition) : undefined,
      actionPayload: input.template ? JSON.stringify({ template: input.template } satisfies SmsPayload) : undefined,
    },
    select: ruleSelect,
  });

  await audit(organizationId, userId, "automation_updated", rule.id, { changes: Object.keys(input) });
  return toSummary(rule);
}

/** Devuelve false si la regla no existe en la organización. */
export async function deleteSmsAutomation(organizationId: string, userId: string, ruleId: string) {
  const { count } = await prisma.automationRule.deleteMany({ where: { id: ruleId, ...smsRuleWhere(organizationId) } });
  if (count) await audit(organizationId, userId, "automation_deleted", ruleId, {});
  return count > 0;
}

/**
 * Ejecuta las reglas "lead nuevo → SMS" que aplican al lead: las de su cliente y las
 * generales, filtradas por fuente. Se llama solo al crear el lead, así un reintento no
 * reenvía el SMS. Nunca lanza: un SMS fallido no debe impedir que el lead exista.
 */
export async function runLeadCreatedAutomations(leadId: string) {
  try {
    const lead = await prisma.lead.findUnique({
      where: { id: leadId },
      select: {
        id: true,
        organizationId: true,
        clientId: true,
        name: true,
        normalizedPhone: true,
        source: true,
        campaign: true,
        client: { select: { name: true } },
      },
    });
    // Sin teléfono normalizado (E.164) Twilio rechazaría el envío.
    if (!lead?.normalizedPhone) return 0;

    const rules = await prisma.automationRule.findMany({
      where: {
        ...smsRuleWhere(lead.organizationId),
        isActive: true,
        OR: [{ clientId: null }, ...(lead.clientId ? [{ clientId: lead.clientId }] : [])],
      },
      select: { id: true, name: true, conditionJson: true, actionPayload: true },
    });

    let sent = 0;
    for (const rule of rules) {
      const sources = parseJson<SmsCondition>(rule.conditionJson).sources ?? [];
      if (sources.length && !sources.includes(lead.source as LeadSource)) continue;

      const template = parseJson<SmsPayload>(rule.actionPayload).template;
      if (!template) continue;

      const body = renderSmsTemplate(template, {
        nombre: firstNameOf(lead.name),
        nombre_completo: lead.name,
        cliente: lead.client?.name,
        campana: lead.campaign,
      });
      const result = await sendTwilioSms(lead.normalizedPhone, body);

      await prisma.message.create({
        data: {
          organizationId: lead.organizationId,
          clientId: lead.clientId,
          leadId: lead.id,
          channel: MESSAGE_CHANNEL.SMS,
          direction: MESSAGE_DIRECTION.OUTBOUND,
          recipient: lead.normalizedPhone,
          body,
          status: result.status,
          providerMsgId: result.providerMsgId,
          errorMessage: result.errorMessage,
          isDemo: result.isDemo,
        },
      });
      await prisma.activity.create({
        data: {
          clientId: lead.clientId,
          leadId: lead.id,
          type: ACTIVITY_TYPE.SMS,
          title: `SMS automático: ${rule.name}`,
          description: body,
          outcome: result.status === MESSAGE_STATUS.SENT ? "completed" : "pending",
        },
      });
      await prisma.automationRule.update({
        where: { id: rule.id },
        data: { executionCount: { increment: 1 }, lastRunAt: new Date() },
      });
      if (result.status === MESSAGE_STATUS.SENT) sent++;
    }
    return sent;
  } catch (error) {
    console.error(`Automatizaciones del lead ${leadId} fallaron:`, error);
    return 0;
  }
}
