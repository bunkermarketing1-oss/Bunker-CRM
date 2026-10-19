export interface BulkSmsSkipped {
  withoutPhone: number;
  /** Números que respondieron BAJA/STOP (en cualquier organización). */
  optedOut: number;
  /** Leads repetidos con el mismo teléfono: reciben un solo SMS. */
  duplicates: number;
  /** Ya recibieron el mismo texto hace poco (BULK_SMS_RESEND_WINDOW_HOURS). */
  recentlySent: number;
}

export interface BulkSmsPreview {
  /** Leads que cumplen los filtros. */
  matched: number;
  /** SMS que se enviarían. */
  eligible: number;
  skipped: BulkSmsSkipped;
  maxRecipients: number;
}

export interface BulkSmsResult {
  batchId: string;
  matched: number;
  sent: number;
  failed: number;
  /** Números que otra ejecución del mismo lote ya había tomado (no se reenvían). */
  alreadyClaimed: number;
  skipped: BulkSmsSkipped;
}
