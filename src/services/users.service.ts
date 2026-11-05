import { prisma } from "@/lib/prisma";
import { isRoleAllowedForUser, toStoredRole, isBunkerRole, type StoredUserRole } from "@/lib/roles";
import { getSupabaseAdmin } from "@/lib/supabase";

/** Error de negocio con el status HTTP que debe responder la ruta. */
export class UserAccessError extends Error {
  status: 400 | 403 | 404;
  constructor(message: string, status: 400 | 403 | 404) {
    super(message);
    this.status = status;
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

/**
 * Elimina permanentemente a un usuario de la organización, desvinculando de forma segura sus
 * leads, tareas, actividades y llamadas, y eliminando sus credenciales de Supabase Auth.
 * Solo puede ser invocado por administradores internos de Bunker Agency. Los equipos de ventas
 * y usuarios de portal no tienen acceso a esta operación bajo ningún concepto.
 */
export async function deleteUser(organizationId: string, actorId: string, userId: string) {
  if (actorId === userId) {
    throw new UserAccessError("No puedes eliminar tu propia cuenta de usuario.", 400);
  }

  // Defensa en profundidad: verificar que el actor sea administrador interno de Bunker
  const actor = await prisma.user.findFirst({
    where: { id: actorId, memberships: { some: { organizationId } } },
    select: { id: true, role: true, clientId: true },
  });

  if (!actor || actor.clientId || !isBunkerRole(actor.role)) {
    throw new UserAccessError(
      "Acceso denegado. Los equipos de ventas y usuarios de portal no tienen permisos para eliminar usuarios.",
      403
    );
  }

  const target = await prisma.user.findFirst({
    where: { id: userId, memberships: { some: { organizationId } } },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      clientId: true,
      supabaseAuthId: true,
    },
  });

  if (!target) {
    throw new UserAccessError("Usuario no encontrado en su organización.", 404);
  }

  await prisma.$transaction(async (tx) => {
    // Desvincular de clientes donde sea dueño o asesor asignado
    await tx.client.updateMany({ where: { ownerId: target.id }, data: { ownerId: null } });

    // Desvincular de leads
    await tx.lead.updateMany({ where: { ownerId: target.id }, data: { ownerId: null } });

    // Desvincular de tareas y actividades
    await tx.task.updateMany({ where: { userId: target.id }, data: { userId: null } });
    await tx.activity.updateMany({ where: { userId: target.id }, data: { userId: null } });
    await tx.call.updateMany({ where: { userId: target.id }, data: { userId: null } });

    // Eliminar membresías de organización
    await tx.organizationMember.deleteMany({ where: { userId: target.id } });

    // Eliminar el registro del usuario en la base de datos
    await tx.user.delete({ where: { id: target.id } });

    // Registrar en AuditLog
    await tx.auditLog.create({
      data: {
        organizationId,
        userId: actorId,
        action: "user_deleted",
        entityType: "User",
        entityId: target.id,
        detailsJson: JSON.stringify({
          email: target.email,
          name: target.name,
          role: target.role,
          clientId: target.clientId,
        }),
      },
    });
  });

  // Eliminar de Supabase Auth si existe
  if (target.supabaseAuthId) {
    try {
      const supabaseAdmin = getSupabaseAdmin();
      await supabaseAdmin.auth.admin.deleteUser(target.supabaseAuthId);
    } catch (authErr) {
      console.warn("Advertencia al eliminar usuario de Supabase Auth:", authErr);
    }
  }

  return { success: true, deletedId: target.id, deletedEmail: target.email };
}
