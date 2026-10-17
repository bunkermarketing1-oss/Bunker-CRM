/** Estado de captura de leads de una página de Facebook, para la pantalla de Integraciones. */
export interface PageLeadgenStatus {
  /** null = la página nunca se intentó suscribir (conectada antes de esta función). */
  subscribed: boolean | null;
  error: string | null;
  /** ISO 8601 del último lead procesado de esta página. */
  lastLeadAt: string | null;
}
