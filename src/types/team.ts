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
  leadsContacted: number;
  tasksCompleted: number;
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
