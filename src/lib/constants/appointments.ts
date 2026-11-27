export const APPOINTMENT_STATUS = {
  SCHEDULED: "scheduled",
  CONFIRMED: "confirmed",
  COMPLETED: "completed",
  CANCELLED: "cancelled",
  NO_SHOW: "no_show",
} as const;

export type AppointmentStatus = (typeof APPOINTMENT_STATUS)[keyof typeof APPOINTMENT_STATUS];

export const APPOINTMENT_LOCATION = {
  IN_STORE: "in_store",
  PHONE_CALL: "phone_call",
  VIDEO_CALL: "video_call",
} as const;

/** Cada bloque de la agenda dura 20 minutos: citas ágiles y una agenda apretada para que el equipo comercial haga más llamadas. */
export const APPOINTMENT_SLOT_MINUTES = 20;

/** Horario que ofrece la página pública de reservas (hora local de quien reserva). */
export const BOOKING_DAY_START = "09:00";
export const BOOKING_DAY_END = "18:00";

/** Duraciones al crear una cita desde el CRM: uno, dos o tres bloques. */
export const APPOINTMENT_DURATION_OPTIONS = [
  { minutes: APPOINTMENT_SLOT_MINUTES, label: "20 minutos" },
  { minutes: APPOINTMENT_SLOT_MINUTES * 2, label: "40 minutos" },
  { minutes: APPOINTMENT_SLOT_MINUTES * 3, label: "1 hora" },
] as const;

export const BLOCK_KIND = {
  ONCE: "once",
  WEEKLY: "weekly",
} as const;

export type BlockKind = (typeof BLOCK_KIND)[keyof typeof BLOCK_KIND];

export const WEEKDAY_LABELS = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"] as const;

export type AppointmentLocation = (typeof APPOINTMENT_LOCATION)[keyof typeof APPOINTMENT_LOCATION];

export const APPOINTMENT_STATUS_LABELS: Record<AppointmentStatus, { label: string; color: string; bg: string }> = {
  [APPOINTMENT_STATUS.SCHEDULED]: {
    label: "Programada",
    color: "text-amber-600 dark:text-amber-400",
    bg: "bg-amber-500/10 border-amber-500/20",
  },
  [APPOINTMENT_STATUS.CONFIRMED]: {
    label: "Confirmada",
    color: "text-blue-600 dark:text-blue-400",
    bg: "bg-blue-500/10 border-blue-500/20",
  },
  [APPOINTMENT_STATUS.COMPLETED]: {
    label: "Completada",
    color: "text-emerald-600 dark:text-emerald-400",
    bg: "bg-emerald-500/10 border-emerald-500/20",
  },
  [APPOINTMENT_STATUS.CANCELLED]: {
    label: "Cancelada",
    color: "text-slate-500 dark:text-slate-400",
    bg: "bg-slate-500/10 border-slate-500/20",
  },
  [APPOINTMENT_STATUS.NO_SHOW]: {
    label: "No Asistió",
    color: "text-rose-600 dark:text-rose-400",
    bg: "bg-rose-500/10 border-rose-500/20",
  },
};

export const APPOINTMENT_LOCATION_LABELS: Record<AppointmentLocation, string> = {
  [APPOINTMENT_LOCATION.IN_STORE]: "Tienda / Showroom",
  [APPOINTMENT_LOCATION.PHONE_CALL]: "Llamada Telefónica",
  [APPOINTMENT_LOCATION.VIDEO_CALL]: "Videollamada",
};
