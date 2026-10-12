import { prisma } from "@/lib/prisma";

export interface DuplicateCheckParams {
  organizationId: string;
  email?: string | null;
  phone?: string | null;
  normalizedPhone?: string | null;
  excludeLeadId?: string;
}

export interface DuplicateMatch {
  id: string;
  name: string;
  companyName: string | null;
  email: string | null;
  phone: string | null;
  status: string;
  createdAt: Date;
}

/**
 * Searches for possible duplicates within the authorized organization using
 * normalized email and normalized telephone number.
 */
export async function findDuplicateLeads({
  organizationId,
  email,
  phone,
  normalizedPhone,
  excludeLeadId,
}: DuplicateCheckParams): Promise<DuplicateMatch[]> {
  const orConditions: any[] = [];

  const cleanEmail = email?.trim().toLowerCase();
  if (cleanEmail) {
    orConditions.push({
      email: { equals: cleanEmail, mode: "insensitive" },
    });
  }

  if (normalizedPhone) {
    orConditions.push({ normalizedPhone });
    orConditions.push({ phone: normalizedPhone });
  } else if (phone && phone.trim() !== "") {
    orConditions.push({
      phone: { equals: phone.trim() },
    });
  }

  if (orConditions.length === 0) {
    return [];
  }

  const whereClause: any = {
    organizationId,
    isDeleted: false,
    OR: orConditions,
  };

  if (excludeLeadId) {
    whereClause.id = { not: excludeLeadId };
  }

  const matches = await prisma.lead.findMany({
    where: whereClause,
    select: {
      id: true,
      name: true,
      companyName: true,
      email: true,
      phone: true,
      status: true,
      createdAt: true,
    },
    take: 5,
  });

  return matches;
}
