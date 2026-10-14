import React from "react";
import { formatCompactMoney, formatNumber } from "@/lib/format";
import type { StageRow } from "@/types/reports";

interface PipelineStageListProps {
  stages: StageRow[];
}

/** Valor abierto por etapa. El punto usa el color configurado de la etapa; la barra, el tono único del reporte. */
export default function PipelineStageList({ stages }: PipelineStageListProps) {
  const maxValue = Math.max(1, ...stages.map((stage) => stage.value));

  return (
    <ul className="space-y-3.5">
      {stages.map((stage) => (
        <li key={stage.stageId}>
          <div className="flex items-center justify-between gap-3 text-xs mb-1.5">
            <span className="flex items-center gap-2 min-w-0">
              <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: stage.color }} aria-hidden />
              <span className="font-semibold text-[#141414] truncate">{stage.name}</span>
              <span className="text-[10px] text-[#9C988F] flex-shrink-0">{formatNumber(stage.deals)} negocios</span>
            </span>
            <span className="font-mono text-[#141414] flex-shrink-0">{formatCompactMoney(stage.value)}</span>
          </div>
          <div className="h-2 rounded-full bg-[#F4F3EE] dark:bg-[#26262B] overflow-hidden">
            <div
              className="h-full rounded-full bg-[#A27B22] dark:bg-[#AD8828]"
              style={{ width: `${(stage.value / maxValue) * 100}%` }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}
