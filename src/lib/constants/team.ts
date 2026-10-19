/** Valores de la vista en vivo del equipo comercial (`/team/live`). */

type ValueOf<T> = T[keyof T];

/**
 * Zona horaria con la que se corta "hoy" en los contadores. Ni `Organization` ni `Client` tienen
 * zona horaria en el esquema y los clientes actuales operan en Colombia. Si se agrega el campo,
 * el service debe preferirlo y dejar esta como respaldo.
 */
export const DEFAULT_TEAM_TIME_ZONE = "America/Bogota";

/** Sin actividad ni llamadas en este lapso, el asesor se muestra como inactivo. */
export const ADVISOR_IDLE_MINUTES = 30;

/** Cada cuánto se refresca la vista; igual que el historial de llamadas (useCalls). */
export const TEAM_LIVE_REFRESH_MS = 5000;

export const ADVISOR_STATUS = {
  ON_CALL: "on_call",
  AVAILABLE: "available",
  IDLE: "idle",
} as const;
export type AdvisorStatus = ValueOf<typeof ADVISOR_STATUS>;

export const ADVISOR_STATUS_LABEL: Record<AdvisorStatus, string> = {
  on_call: "En llamada",
  available: "Disponible",
  idle: "Inactivo",
};
