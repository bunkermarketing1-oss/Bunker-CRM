export type OpportunityAutomationEvent = "deal_won" | "stage_changed";

export interface OpportunityAutomationInput {
  id: string;
  title: string;
  stageName?: string;
  clientId: string | null;
  leadId: string | null;
  ownerId?: string | null;
}

export interface OpportunityAutomationResult {
  ruleId: string;
  ruleName: string;
  tasksCreated: number;
}

export interface StaleLeadsCheckResult {
  leadsAnalyzed: number;
  tasksCreated: number;
  details: Array<{
    leadId: string;
    leadName: string;
    daysInactive: number;
    taskId: string;
  }>;
}
