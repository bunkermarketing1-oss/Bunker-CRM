import { prisma } from "@/lib/prisma";
import { isRoleAllowedForUser, toStoredRole, type StoredUserRole } from "@/lib/roles";

/** Error de negocio con el status HTTP que debe responder la ruta. */
export class UserAccessError extends Error {
  constructor(message: string, public status: 400 | 404) {
    super(message);
  }
}

export interface UserAccessChange {
  isActive?: boolean;
  role?: StoredUserRole;
}

const updatedUserSelect = {
  id: true,
  email: true,
  name: true,
  role: true,
  isActive: true,
  clientId: true,
} as const;

/**
 * Activa/desactiva a un usuario o cambia su rol (p. ej. asesor → dueño del cliente) dentro de la
 * organización del admin. Un cambio de rol queda en AuditLog con el rol anterior: es una
 * concesión de permisos (el dueño puede escuchar llamadas de su empresa).
 */
export async function updateUserAccess(organizationId: string, actorId: string, userId: string, change: UserAccessChange) {
  const target = await prisma.user.findFirst({
    where: { id: userId, memberships: { some: { organizationId } } },
    select: { id: true, role: true, clientId: true },
  });
  if (!target) throw new UserAccessError("Usuario no encontrado en su organización.", 404);

  if (change.role && !isRoleAllowedForUser(change.role, target.clientId)) {
    throw new UserAccessError(
      target.clientId
        ? "Un usuario de empresa solo puede ser asesor (CLIENT) o dueño (CLIENT_OWNER)."
        : "Un usuario de Bunker solo puede tener rol ADMIN; para hacerlo dueño debe pertenecer a una empresa.",
      400
    );
  }

  const previousRole = toStoredRole(target.role);
  const roleChanged = Boolean(change.role) && change.role !== previousRole;

  return prisma.$transaction(async (tx) => {
    const updated = await tx.user.update({
      where: { id: target.id },
      data: {
        isActive: change.isActive,
        role: roleChanged ? change.role : undefined,
      },
      select: updatedUserSelect,
    });

    await tx.auditLog.create({
      data: {
        organizationId,
        userId: actorId,
        action: roleChanged ? "user_role_changed" : "user_updated",
        entityType: "User",
        entityId: updated.id,
        detailsJson: JSON.stringify({
          isActive: updated.isActive,
          role: updated.role,
          ...(roleChanged ? { previousRole, clientId: updated.clientId } : {}),
        }),
      },
    });

    return updated;
  });
}
