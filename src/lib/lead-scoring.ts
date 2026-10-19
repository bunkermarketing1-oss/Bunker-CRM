import { LEAD_SOURCE } from "@/lib/constants/crm";

export interface LeadScoringInput {
  email?: string | null;
  phone?: string | null;
  companyName?: string | null;
  estimatedValue?: number | null;
  source: string;
}

const BASE_SCORE = 50;

/**
 * Calificación inicial (0-100) de un lead nuevo según qué tan completo llega y su
 * presupuesto en USD. Es la misma regla que usaba `POST /api/leads`, compartida con la
 * ingesta de Meta.
 */
export function computeInitialQualification(lead: LeadScoringInput) {
  let score = BASE_SCORE;
  if (lead.email && lead.phone) score += 20;
  if (lead.companyName) score += 10;
  const value = lead.estimatedValue ?? 0;
  if (value >= 3000) score += 15;
  else if (value >= 1500) score += 10;
  if (lead.source === LEAD_SOURCE.REFERRAL) score += 10;
  return Math.min(100, Math.max(0, score));
}
