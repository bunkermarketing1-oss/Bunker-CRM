export interface BulkSmsSkipped {
  withoutPhone: number;
  /** Números que respondieron BAJA/STOP. */
  optedOut: number;
  /** Leads repetidos con el mismo teléfono: reciben un solo SMS. */
  duplicates: number;
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
  matched: number;
  sent: number;
  failed: number;
  skipped: BulkSmsSkipped;
}
