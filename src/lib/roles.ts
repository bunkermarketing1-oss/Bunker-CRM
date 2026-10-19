/**
 * Roles y permisos puros. Sin imports a propósito: lo usan el middleware (edge), `lib/auth.ts`
 * y los services, y se prueba directo con Node (tests/roles.test.mjs).
 *
 * `User.role` es texto libre en la base. Se guardan tres valores:
 * - ADMIN: equipo interno de Bunker.
 * - CLIENT: asesor comercial del portal de un cliente.
 * - CLIENT_OWNER: dueño del negocio del cliente. Para el aislamiento es un usuario CLIENT más
 *   (mismo `clientId` forzado); solo suma permisos de supervisión sobre su propia empresa.
 */

export const ROLES = {
  ADMIN: "ADMIN",
  CLIENT: "CLIENT",
  CLIENT_OWNER: "CLIENT_OWNER",
} as const;

/** Valor que se guarda en `User.role`. */
export type StoredUserRole = (typeof ROLES)[keyof typeof ROLES];

/**
 * Rol de acceso canónico. El dueño se resuelve como CLIENT a propósito: todo `requireRole`,
 * filtro por `clientId` y chequeo `role === CLIENT` existente lo trata como usuario de portal
 * sin tener que tocarlo, y nada que pida ADMIN lo deja pasar.
 */
export type UserRole = typeof ROLES.ADMIN | typeof ROLES.CLIENT;

/** Roles asignables a un usuario de portal (con `clientId`). */
export const CLIENT_PORTAL_ROLES = [ROLES.CLIENT, ROLES.CLIENT_OWNER] as const;

/** Valores que acepta la API al crear o editar usuarios. */
export const ASSIGNABLE_ROLES = [ROLES.ADMIN, ROLES.CLIENT, ROLES.CLIENT_OWNER] as const;

// CLIENT_USER y CLIENT_ADMIN son nombres heredados de la primera versión del portal. CLIENT_ADMIN
// no se promueve a dueño: darle supervisión a cuentas viejas sin que nadie lo decida sería un
// permiso nuevo silencioso.
const CLIENT_ROLE_ALIASES = new Set<string>([ROLES.CLIENT, ROLES.CLIENT_OWNER, "CLIENT_USER", "CLIENT_ADMIN"]);

export function normalizeRole(role?: string | null): UserRole {
  if (!role) return ROLES.ADMIN;
  return CLIENT_ROLE_ALIASES.has(role.toUpperCase()) ? ROLES.CLIENT : ROLES.ADMIN;
}

export function isClientRole(role?: string | null): boolean {
  return normalizeRole(role) === ROLES.CLIENT;
}

export function isBunkerRole(role?: string | null): boolean {
  return normalizeRole(role) === ROLES.ADMIN;
}

export function isClientOwnerRole(role?: string | null): boolean {
  return role?.toUpperCase() === ROLES.CLIENT_OWNER;
}

/** Valor a guardar en `User.role`: conserva al dueño, el resto queda en ADMIN o CLIENT. */
export function toStoredRole(role?: string | null): StoredUserRole {
  return isClientOwnerRole(role) ? ROLES.CLIENT_OWNER : normalizeRole(role);
}

/**
 * Un usuario con empresa (`clientId`) solo puede ser CLIENT o CLIENT_OWNER, y uno de Bunker
 * solo ADMIN. Un "admin" con `clientId` seguiría siendo cliente por el `clientId`, y un dueño
 * sin empresa no tendría a quién supervisar: ambas combinaciones solo confunden.
 */
export function isRoleAllowedForUser(role: StoredUserRole, clientId: string | null): boolean {
  if (clientId) return role === ROLES.CLIENT || role === ROLES.CLIENT_OWNER;
  return role === ROLES.ADMIN;
}

export interface MonitorSupervisor {
  role: string;
  clientId: string | null;
  isActive: boolean;
  /** Organizaciones de las que es miembro. */
  organizationIds: readonly string[];
}

export interface MonitoredCall {
  organizationId: string;
  clientId: string | null;
}

/**
 * Quién puede escuchar o susurrar una llamada en curso: un admin de Bunker de la organización
 * de la llamada, o el dueño del cliente al que pertenece la llamada. Un asesor (CLIENT) nunca,
 * ni siquiera en llamadas de su propia empresa.
 */
export function canMonitorCall(supervisor: MonitorSupervisor, call: MonitoredCall): boolean {
  if (!supervisor.isActive || !supervisor.organizationIds.includes(call.organizationId)) return false;
  if (isBunkerRole(supervisor.role) && !supervisor.clientId) return true;
  return isClientOwnerRole(supervisor.role) && Boolean(supervisor.clientId) && supervisor.clientId === call.clientId;
}
