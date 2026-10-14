import type { AuthenticatedUser } from "@/lib/auth";
import type { TenantScope } from "@/types/tenant";

/**
 * Scope de datos de la sesión. Devuelve null para un usuario CLIENT sin empresa asignada:
 * con clientId null el scope abarcaría toda la organización, así que la ruta debe responder vacío.
 */
export function scopeFromUser(user: AuthenticatedUser): TenantScope | null {
  if (!user.isClientUser) return { organizationId: user.organizationId, clientId: null };
  if (!user.clientId) return null;
  return { organizationId: user.organizationId, clientId: user.clientId };
}
