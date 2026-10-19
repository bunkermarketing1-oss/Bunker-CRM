import type { LeadSource } from "@/lib/validations/lead";

/** Regla "lead nuevo → SMS" tal como la ve la pantalla de Automatizaciones. */
export interface SmsAutomationSummary {
  id: string;
  name: string;
  clientId: string | null;
  clientName: string | null;
  /** Vacío = cualquier fuente. */
  sources: LeadSource[];
  template: string;
  isActive: boolean;
  executionCount: number;
  lastRunAt: string | null;
  createdAt: string;
}

export interface SmsAutomationsResponse {
  success: true;
  automations: SmsAutomationSummary[];
}
