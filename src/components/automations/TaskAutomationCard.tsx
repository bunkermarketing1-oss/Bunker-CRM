import { ArrowRight, ListChecks, Pencil, Trash2 } from "lucide-react";
import { TASK_AUTOMATION_KIND, TASK_AUTOMATION_KIND_LABEL } from "@/lib/constants/automations";
import type { TaskAutomationSummary } from "@/types/task-automations";

interface TaskAutomationCardProps {
  automation: TaskAutomationSummary;
  busy: boolean;
  onToggle: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

function TriggerText({ automation }: { automation: TaskAutomationSummary }) {
  switch (automation.kind) {
    case TASK_AUTOMATION_KIND.ONBOARDING:
      return <>Oportunidad cerrada como ganada</>;
    case TASK_AUTOMATION_KIND.STAGE_FOLLOWUP:
      return <>Oportunidad entra a la etapa «{automation.config.stageNameMatch ?? "cualquiera"}»</>;
    case TASK_AUTOMATION_KIND.STALE_REACTIVATION:
      return <>Lead abierto sin actividad en {automation.config.inactiveDays} días</>;
  }
}

function ActionText({ automation }: { automation: TaskAutomationSummary }) {
  switch (automation.kind) {
    case TASK_AUTOMATION_KIND.ONBOARDING:
      return (
        <span>
          {automation.config.tasks.length} tareas, vencen en {automation.config.dueInDays} días:
          <ul className="mt-1 list-disc pl-4 space-y-0.5">
            {automation.config.tasks.map((task, i) => (
              <li key={i}>{task}</li>
            ))}
          </ul>
        </span>
      );
    case TASK_AUTOMATION_KIND.STAGE_FOLLOWUP:
      return (
        <span>
          «{automation.config.taskTitle}», vence en {automation.config.hoursDue} h
        </span>
      );
    case TASK_AUTOMATION_KIND.STALE_REACTIVATION:
      return (
        <span>
          Tarea de reactivación para el asesor
          {automation.config.suggestedMessage && (
            <span className="block mt-1 italic whitespace-pre-line">«{automation.config.suggestedMessage}»</span>
          )}
        </span>
      );
  }
}

export function TaskAutomationCard({ automation, busy, onToggle, onEdit, onDelete }: TaskAutomationCardProps) {
  return (
    <div className="p-5 rounded-2xl bg-white border border-[#E8E6DF] hover:border-[#D1CFCA] transition-all flex flex-col justify-between space-y-4 shadow-sm">
      <div>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[10px] uppercase tracking-wide text-[#82807C]">{TASK_AUTOMATION_KIND_LABEL[automation.kind]}</p>
            <h3 className="font-semibold text-base text-[#1F1E1D] flex items-center gap-2 min-w-0">
              <ListChecks className={`w-4 h-4 flex-shrink-0 ${automation.isActive ? "text-[#D97757]" : "text-[#82807C]"}`} />
              <span className="truncate">{automation.name}</span>
            </h3>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={automation.isActive}
            aria-label={automation.isActive ? "Pausar automatización" : "Activar automatización"}
            disabled={busy}
            onClick={onToggle}
            className={`w-10 h-5 rounded-full transition-colors relative flex items-center px-0.5 flex-shrink-0 disabled:opacity-50 ${
              automation.isActive ? "bg-[#D97757]" : "bg-[#E8E6DF]"
            }`}
          >
            <span className={`w-4 h-4 rounded-full bg-white transition-transform ${automation.isActive ? "translate-x-5" : "translate-x-0"}`} />
          </button>
        </div>

        <div className="mt-4 p-3.5 rounded-xl bg-[#FAF9F5] border border-[#E8E6DF] text-xs space-y-2">
          <div className="text-[#6B6966]">
            <strong className="text-[#1F1E1D]">Disparador:</strong> <TriggerText automation={automation} /> ·{" "}
            {automation.clientName ?? "todos los clientes"}
          </div>
          <div className="text-[#6B6966] flex items-start gap-1.5">
            <ArrowRight className="w-3.5 h-3.5 text-[#D97757] flex-shrink-0 mt-0.5" />
            <ActionText automation={automation} />
          </div>
        </div>
      </div>

      <div className="pt-3 border-t border-[#F0EFEA] flex items-center justify-between gap-2 text-xs text-[#82807C]">
        <span className="font-mono">
          {automation.executionCount} ejecuciones
          {automation.lastRunAt && ` · última ${new Date(automation.lastRunAt).toLocaleString()}`}
        </span>
        <div className="flex items-center gap-1">
          <button type="button" onClick={onEdit} disabled={busy} aria-label="Editar" className="p-1.5 rounded-lg hover:bg-[#F4F3EE] hover:text-[#1F1E1D]">
            <Pencil className="w-3.5 h-3.5" />
          </button>
          <button type="button" onClick={onDelete} disabled={busy} aria-label="Eliminar" className="p-1.5 rounded-lg hover:bg-red-50 hover:text-red-700">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
