"use client";

import React, { useState } from "react";
import { formatNumber, formatPercent } from "@/lib/format";
import { percentage } from "@/lib/reports";
import type { TrendPoint } from "@/types/reports";

const CHART_HEIGHT_PX = 180;
const GRID_STEPS = 4;
/** Más allá de esto las etiquetas del eje X se pisan; se muestra una de cada N. */
const MAX_X_LABELS = 8;

/** Tope del eje redondeado a 1·2·5×10ⁿ por paso, para que las marcas sean enteros legibles. */
function niceMax(value: number): number {
  if (value <= GRID_STEPS) return GRID_STEPS;
  const rawStep = value / GRID_STEPS;
  const magnitude = 10 ** Math.floor(Math.log10(rawStep));
  const normalized = rawStep / magnitude;
  const niceStep = normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10;
  return niceStep * magnitude * GRID_STEPS;
}

interface LeadsTrendChartProps {
  points: TrendPoint[];
  showTable: boolean;
}

/** Leads nuevos por período (una sola serie). Conversión en el tooltip y en la vista de tabla. */
export default function LeadsTrendChart({ points, showTable }: LeadsTrendChartProps) {
  const [hovered, setHovered] = useState<number | null>(null);
  const maxValue = niceMax(Math.max(0, ...points.map((p) => p.leads)));
  const labelEvery = Math.ceil(points.length / MAX_X_LABELS);
  const ticks = Array.from({ length: GRID_STEPS + 1 }, (_, i) => (maxValue / GRID_STEPS) * (GRID_STEPS - i));

  if (showTable) {
    return (
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="text-[11px] text-[#8C887E] border-b border-[#ECEAE3]">
              <th className="text-left font-semibold py-2">Período</th>
              <th className="text-right font-semibold py-2">Leads</th>
              <th className="text-right font-semibold py-2">Convertidos</th>
              <th className="text-right font-semibold py-2">Conversión</th>
            </tr>
          </thead>
          <tbody>
            {points.map((p) => (
              <tr key={p.periodStart} className="border-b border-[#F4F3EE] dark:border-[#2E2E34] last:border-0">
                <td className="py-2 text-[#141414]">{p.label}</td>
                <td className="py-2 text-right font-mono text-[#141414]">{formatNumber(p.leads)}</td>
                <td className="py-2 text-right font-mono text-[#6B6861]">{formatNumber(p.converted)}</td>
                <td className="py-2 text-right font-mono text-[#6B6861]">{formatPercent(percentage(p.converted, p.leads))}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <div className="flex gap-3">
      <div className="relative flex-shrink-0 w-8 text-right" style={{ height: CHART_HEIGHT_PX }} aria-hidden>
        {ticks.map((tick, i) => (
          <span
            key={tick}
            className="absolute right-0 -translate-y-1/2 text-[10px] font-mono text-[#9C988F]"
            style={{ top: `${(i / GRID_STEPS) * 100}%` }}
          >
            {formatNumber(Math.round(tick))}
          </span>
        ))}
      </div>

      <div className="flex-1 min-w-0">
        <div className="relative" style={{ height: CHART_HEIGHT_PX }}>
          {ticks.map((tick, i) => (
            <div
              key={tick}
              className={`absolute inset-x-0 border-t ${i === GRID_STEPS ? "border-[#DDD9CF]" : "border-dashed border-[#F0EEE6]"}`}
              style={{ top: `${(i / GRID_STEPS) * 100}%` }}
              aria-hidden
            />
          ))}

          <div className="absolute inset-0 flex items-end gap-[2px]" onMouseLeave={() => setHovered(null)}>
            {points.map((p, index) => {
              const heightPct = (p.leads / maxValue) * 100;
              const isHovered = hovered === index;
              return (
                <button
                  key={p.periodStart}
                  type="button"
                  className="relative flex-1 h-full flex items-end justify-center group focus:outline-none"
                  onMouseEnter={() => setHovered(index)}
                  onFocus={() => setHovered(index)}
                  onBlur={() => setHovered(null)}
                  aria-label={`${p.label}: ${p.leads} leads, ${p.converted} convertidos`}
                >
                  <span
                    className={`w-full max-w-[28px] rounded-t-[4px] bg-[#A27B22] dark:bg-[#AD8828] transition-opacity ${
                      hovered !== null && !isHovered ? "opacity-50" : ""
                    } ${p.leads === 0 ? "opacity-0" : ""}`}
                    style={{ height: `${heightPct}%`, minHeight: p.leads > 0 ? 2 : 0 }}
                  />
                  {isHovered && (
                    <span
                      className="absolute z-10 left-1/2 -translate-x-1/2 px-3 py-2 rounded-xl bg-[#141414] text-left shadow-xl pointer-events-none whitespace-nowrap"
                      style={{ bottom: `calc(${heightPct}% + 8px)` }}
                    >
                      <span className="block text-[10px] text-[#A09B90]">{p.label}</span>
                      <span className="block text-sm font-bold text-[#FAF8F3]">{formatNumber(p.leads)} leads</span>
                      <span className="block text-[10px] text-[#C5C2BA]">
                        {formatNumber(p.converted)} convertidos · {formatPercent(percentage(p.converted, p.leads))}
                      </span>
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex gap-[2px] mt-2" aria-hidden>
          {points.map((p, index) => (
            <span
              key={p.periodStart}
              // En móvil cabe la mitad de etiquetas: se ocultan las intercaladas sin mover las columnas.
              className={`flex-1 min-w-0 text-center text-[10px] text-[#9C988F] whitespace-nowrap ${
                index % (labelEvery * 2) !== 0 ? "invisible sm:visible" : ""
              }`}
            >
              {index % labelEvery === 0 ? p.label : ""}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
