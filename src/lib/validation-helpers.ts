import { prisma } from "@/lib/prisma";

export const OPPORTUNITY_STATUSES = ["open", "won", "lost"] as const;
export const CLIENT_STATUSES = ["active", "churned", "on_hold"] as const;

const MAX_AMOUNT = 1_000_000_000;

/**
 * Parses a monetary amount (USD). Empty/undefined => 0. Returns null when invalid
 * (non numeric, negative, non finite or absurdly large) so callers can answer HTTP 400.
 */
export function parseAmount(raw: unknown): number | null {
  if (raw === undefined || raw === null || raw === "") return 0;
  const n = typeof raw === "number" ? raw : Number(String(raw).replace(/,/g, "").trim());
  if (!Number.isFinite(n) || n < 0 || n > MAX_AMOUNT) return null;
  return n;
}

/** Parses an integer percentage 0-100. Returns null when invalid. */
export function parseProbability(raw: unknown): number | null {
  if (raw === undefined || raw === null || raw === "") return 50;
  const n = typeof raw === "number" ? raw : Number(String(raw).trim());
  if (!Number.isInteger(n) || n < 0 || n > 100) return null;
  return n;
}

export async function isOrgMember(organizationId: string, userId: string): Promise<boolean> {
  const member = await prisma.organizationMember.findFirst({ where: { organizationId, userId } });
  return Boolean(member);
}

export async function stageBelongsToOrg(organizationId: string, stageId: string): Promise<boolean> {
  const stage = await prisma.pipelineStage.findFirst({ where: { id: stageId, organizationId } });
  return Boolean(stage);
}

export async function clientBelongsToOrg(organizationId: string, clientId: string): Promise<boolean> {
  const client = await prisma.client.findFirst({ where: { id: clientId, organizationId, isDeleted: false } });
  return Boolean(client);
}

export async function leadBelongsToOrg(organizationId: string, leadId: string): Promise<boolean> {
  const lead = await prisma.lead.findFirst({ where: { id: leadId, organizationId, isDeleted: false } });
  return Boolean(lead);
}
