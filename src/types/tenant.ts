/** Scope ya resuelto por la ruta: el service nunca lee la sesión ni el request. */
export interface TenantScope {
  organizationId: string;
  /** Forzado para usuarios CLIENT; null = toda la organización. */
  clientId: string | null;
}
