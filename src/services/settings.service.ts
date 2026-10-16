import { prisma } from "@/lib/prisma";
import { isClientRole } from "@/lib/auth";
import { ENV_VARS } from "@/lib/constants/environment";
import type { SettingsData } from "@/types/settings";

/** Configuración visible para el admin. Las variables de entorno solo se reportan como definidas o no. */
export async function getSettings(organizationId: string): Promise<SettingsData> {
  const [organization, members, clients] = await Promise.all([
    prisma.organization.findUniqueOrThrow({
      where: { id: organizationId },
      select: { name: true, slug: true, plan: true },
    }),
    prisma.organizationMember.findMany({
      where: { organizationId, user: { isActive: true } },
      select: { user: { select: { role: true, clientId: true } } },
    }),
    prisma.client.count({ where: { organizationId, isDeleted: false } }),
  ]);

  const clientPortalUsers = members.filter(({ user }) => isClientRole(user.role) || Boolean(user.clientId)).length;

  return {
    organization: {
      ...organization,
      adminUsers: members.length - clientPortalUsers,
      clientPortalUsers,
      clients,
    },
    appUrl: process.env.NEXT_PUBLIC_APP_URL || null,
    environment: ENV_VARS.map((spec) => ({ ...spec, isSet: Boolean(process.env[spec.name]?.trim()) })),
  };
}
