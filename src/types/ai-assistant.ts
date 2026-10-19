import type { WEEKDAYS } from "@/lib/constants/ai-assistant";

export type Weekday = (typeof WEEKDAYS)[number];

/** Franja de atención de un día, en hora local del cliente ("HH:MM", 24 h). */
export interface DaySchedule {
  start: string;
  end: string;
}

/** null = ese día no se atiende (todo el día cuenta como fuera de horario). */
export type BusinessHours = Record<Weekday, DaySchedule | null>;

/** Configuración del asistente que ve y edita un admin en la ficha del cliente. */
export interface ClientAiAssistantSettings {
  clientId: string;
  isEnabled: boolean;
  timezone: string;
  businessHours: BusinessHours;
  knowledgeBase: string;
  instructions: string;
  handoffMessage: string;
  maxRepliesPerDay: number;
  /** null = todavía no se guardó (se muestran los valores por defecto). */
  updatedAt: string | null;
}

export interface ClientAiAssistantResponse {
  success: true;
  settings: ClientAiAssistantSettings;
  /** AI_API_KEY definida en el servidor: sin ella solo se envía el mensaje de traspaso. */
  aiConfigured: boolean;
  model: string;
}
