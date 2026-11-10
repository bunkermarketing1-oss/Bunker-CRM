import type { AdvisorStatus } from "@/lib/constants/team";
import type { CallSummary } from "@/types/voice";

/** Llamada en curso de un asesor, para la columna de estado. */
export interface AdvisorCurrentCall {
  callId: string;
  leadName: string | null;
  /** Número de la contraparte, por si no hay lead ligado. */
  counterpart: string;
  /** Segundos desde que contestó (o desde que empezó a timbrar) al momento de la consulta. */
  durationSec: number;
  answered: boolean;
}

/** Contadores de hoy (zona horaria de `TeamLiveView.timeZone`). */
export interface AdvisorDayStats {
  callsMade: number;
  callsAnswered: number;
  talkTimeSec: number;
  smsSent: number;
  whatsappSent: number;
  messengerSent: number;
  instagramSent: number;
  totalMessagesSent: number;
  leadsContacted: number;
  tasksCompleted: number;
  channelsAttended: string[];
  slaOkCount?: number;
  slaWarningCount?: number;
  slaBreachedCount?: number;
  slaResponseRate?: number | null;
}

export interface AdvisorLiveRow {
  userId: string;
  name: string;
  email: string;
  clientId: string;
  clientName: string | null;
  isOwner: boolean;
  status: AdvisorStatus;
  currentCall: AdvisorCurrentCall | null;
  today: AdvisorDayStats;
  /** Última actividad de hoy (ISO) o null si no ha hecho nada hoy. */
  lastActivityAt: string | null;
  /** Asistencia y turnos */
  isCheckedIn: boolean;
  checkedInAt: string | null;
  checkedOutAt: string | null;
}

export interface TeamLiveView {
  advisors: AdvisorLiveRow[];
  /** Salientes en curso que el supervisor puede escuchar o susurrar. */
  liveCalls: CallSummary[];
  timeZone: string;
  /** Inicio de "hoy" usado en los contadores (ISO). */
  dayStart: string;
  generatedAt: string;
}

export interface TeamLiveResponse extends TeamLiveView {
  success: true;
}

/** Registro de asistencia y actividad de un día específico en la bitácora de 15 días */
export interface AttendanceDayLog {
  date: string; // YYYY-MM-DD
  dayLabel: string; // "Lun, 2 Nov"
  checkIn: string | null; // ISO
  checkInTime: string | null; // "08:30 AM"
  checkOut: string | null; // ISO
  checkOutTime: string | null; // "05:45 PM"
  durationMinutes: number;
  durationFormatted: string; // "9h 15m" o "En turno"
  status: "completed" | "in_progress" | "absent";
  callsMade: number;
  whatsappMessages: number;
  messengerMessages: number;
  instagramMessages: number;
  smsMessages: number;
  totalMessages: number;
  tasksCompleted: number;
}

export interface SellerAttendanceHistoryResponse {
  success: boolean;
  sellerId: string;
  sellerName: string;
  sellerEmail: string;
  clientName: string | null;
  days: AttendanceDayLog[];
  totals: {
    daysWorked: number;
    totalMinutesWorked: number;
    totalHoursFormatted: string;
    totalCalls: number;
    totalMessages: number;
    whatsappTotal: number;
    messengerTotal: number;
    instagramTotal: number;
    smsTotal: number;
  };
  error?: string;
}
