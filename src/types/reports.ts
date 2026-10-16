export interface ReportKpis {
  newLeads: number;
  /** % de los leads del período que ya están convertidos. */
  conversionRate: number;
  wonRevenue: number;
  wonDeals: number;
  averageTicket: number;
  openPipelineValue: number;
  /** Valor abierto ponderado por la probabilidad de cada oportunidad. */
  weightedPipelineValue: number;
  /** Mediana en horas entre el alta del lead y su primera actividad; null si ninguno fue contactado. */
  medianFirstResponseHours: number | null;
  /** % de leads del período con al menos una actividad registrada. */
  contactedRate: number;
  adSpend: number;
  /** null cuando las campañas usan monedas distintas y la suma no es comparable. */
  adSpendCurrency: string | null;
  /** Inversión / leads de fuentes pagadas; null sin inversión o sin leads pagados. */
  costPerLead: number | null;
}

export interface SourceBreakdownRow {
  source: string;
  label: string;
  leads: number;
  converted: number;
  conversionRate: number;
  estimatedValue: number;
  isPaid: boolean;
}

export interface TrendPoint {
  /** Inicio del período (ISO, yyyy-mm-dd). */
  periodStart: string;
  label: string;
  leads: number;
  converted: number;
}

export interface StageRow {
  stageId: string;
  name: string;
  color: string;
  deals: number;
  value: number;
}

export interface ReportsData {
  days: number;
  generatedAt: string;
  kpis: ReportKpis;
  sources: SourceBreakdownRow[];
  trend: TrendPoint[];
  stages: StageRow[];
}

export interface ReportsResponse extends ReportsData {
  success: true;
}
