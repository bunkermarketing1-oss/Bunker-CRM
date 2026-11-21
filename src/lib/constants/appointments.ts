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
