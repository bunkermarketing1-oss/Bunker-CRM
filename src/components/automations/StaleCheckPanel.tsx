import { Play } from "lucide-react";
import type { StaleLeadsCheckResult } from "@/types/opportunity-automations";

interface StaleCheckPanelProps {
  running: boolean;
  result: StaleLeadsCheckResult | null;
  error: string | null;
  onRun: () => void;
}

// Suficiente para revisar el resultado en pantalla; el detalle completo queda en las tareas.
const MAX_DETAILS_SHOWN = 10;

/** Barrido manual de estancados. El automático corre por cron (`/api/cron/stale-leads`). */
export function StaleCheckPanel({ running, result, error, onRun }: StaleCheckPanelProps) {
  return (
    <div className="p-4 rounded-2xl bg-[#FAF9F5] border border-[#E8E6DF] text-xs space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-[#6B6966] max-w-xl">
          Las reglas de reactivación se revisan solas una vez al día. Puedes correr la revisión ahora para ver qué leads
          están estancados: se crea una tarea por lead, sin enviarle nada.
        </p>
        <button
          type="button"
          onClick={onRun}
          disabled={running}
          className="px-3.5 py-2 rounded-xl bg-white border border-[#E8E6DF] text-[#1F1E1D] font-medium flex items-center gap-1.5 hover:border-[#D1CFCA] disabled:opacity-50"
        >
          <Play className="w-3.5 h-3.5 text-[#D97757]" />
          {running ? "Revisando…" : "Revisar estancados ahora"}
        </button>
      </div>

      {error && <p role="alert" className="text-red-700">{error}</p>}

      {result && (
        <div role="status" className="space-y-1.5">
          <p className="text-[#1F1E1D] font-medium">
            {result.rulesEvaluated === 0
              ? "No hay reglas de reactivación activas."
              : `${result.tasksCreated} tareas creadas · ${result.rulesEvaluated} reglas revisadas`}
          </p>
          {result.details.length > 0 && (
            <ul className="space-y-0.5 text-[#6B6966]">
              {result.details.slice(0, MAX_DETAILS_SHOWN).map((d) => (
                <li key={d.taskId}>
                  {d.leadName} · {d.daysInactive} días sin actividad
                </li>
              ))}
              {result.details.length > MAX_DETAILS_SHOWN && <li>… y {result.details.length - MAX_DETAILS_SHOWN} más</li>}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
