import { z } from "zod";
import { TRIGGER_EVENT, ACTION_TYPE } from "@/lib/constants/automations";

const triggerValues = [
  TRIGGER_EVENT.LEAD_CREATED,
  TRIGGER_EVENT.STAGE_CHANGED,
  TRIGGER_EVENT.DEAL_WON,
  TRIGGER_EVENT.STALE_LEADS_CHECK,
] as const;

const actionValues = [
  ACTION_TYPE.IMMEDIATE_QUALIFICATION_SMS,
  ACTION_TYPE.AI_OUT_OF_HOURS_SMS,
  ACTION_TYPE.CREATE_FOLLOWUP_TASK,
  ACTION_TYPE.ONBOARDING_DEAL_WON,
  ACTION_TYPE.REACTIVATE_STALE_LEAD,
] as const;

export const createAutomationRuleSchema = z.object({
  name: z.string().min(3, "El nombre de la regla debe tener al menos 3 caracteres"),
  triggerEvent: z.enum(triggerValues),
  actionType: z.enum(actionValues),
  conditionJson: z.string().nullable().optional(),
  actionPayload: z.string().nullable().optional(),
  isActive: z.boolean().optional().default(true),
});

export const updateAutomationRuleSchema = z.object({
  name: z.string().min(3, "El nombre debe tener al menos 3 caracteres").optional(),
  triggerEvent: z.enum(triggerValues).optional(),
  actionType: z.enum(actionValues).optional(),
  conditionJson: z.string().nullable().optional(),
  actionPayload: z.string().nullable().optional(),
  isActive: z.boolean().optional(),
});

export const toggleRuleSchema = z.object({
  isActive: z.boolean(),
});
