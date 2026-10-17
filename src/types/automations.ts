export interface AutomationRuleDto {
  id: string;
  organizationId: string;
  name: string;
  triggerEvent: string;
  conditionJson: string | null;
  actionType: string;
  actionPayload: string | null;
  isActive: boolean;
  executionCount: number;
  lastRunAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface StaleLeadsCheckResult {
  leadsAnalyzed: number;
  staleLeadsFound: number;
  tasksCreated: number;
  details: Array<{
    leadId: string;
    leadName: string;
    daysInactive: number;
    taskId: string;
  }>;
}

export interface AutomationExecutionResult {
  ruleId: string;
  ruleName: string;
  executed: boolean;
  reason?: string;
  actionTaken?: string;
  details?: Record<string, unknown>;
}
