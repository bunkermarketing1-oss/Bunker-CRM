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
            <tr className="text-[11px] text-[#8C929D] border-b border-[#E2E5EB] dark:border-[#2A2E37]">
              <th className="text-left font-bold py-2.5">Período</th>
              <th className="text-right font-bold py-2.5">Leads</th>
              <th className="text-right font-bold py-2.5">Convertidos</th>
              <th className="text-right font-bold py-2.5">Conversión</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E2E5EB] dark:divide-[#1F242D]">
            {points.map((p) => (
              <tr key={p.periodStart} className="hover:bg-[#F8F9FA] dark:hover:bg-[#1A1D24] transition-colors">
                <td className="py-2.5 text-[#121417] dark:text-white font-medium">{p.label}</td>
                <td className="py-2.5 text-right font-mono font-bold text-[#121417] dark:text-white">{formatNumber(p.leads)}</td>
                <td className="py-2.5 text-right font-mono text-[#64748B] dark:text-[#94A3B8]">{formatNumber(p.converted)}</td>
                <td className="py-2.5 text-right font-mono text-[#64748B] dark:text-[#94A3B8] font-semibold">{formatPercent(percentage(p.converted, p.leads))}</td>
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
            className="absolute right-0 -translate-y-1/2 text-[10px] font-mono text-[#8C929D]"
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
              className={`absolute inset-x-0 border-t ${i === GRID_STEPS ? "border-[#E2E5EB] dark:border-[#2A2E37]" : "border-dashed border-[#E2E5EB]/60 dark:border-[#2A2E37]/60"}`}
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
                  className="relative flex-1 h-full flex items-end justify-center group focus:outline-none cursor-pointer"
                  onMouseEnter={() => setHovered(index)}
                  onFocus={() => setHovered(index)}
                  onBlur={() => setHovered(null)}
                  aria-label={`${p.label}: ${p.leads} leads, ${p.converted} convertidos`}
                >
                  <span
                    className={`w-full max-w-[28px] rounded-t-md bg-amber-500 dark:bg-amber-400 transition-all ${
                      hovered !== null && !isHovered ? "opacity-40" : "opacity-100"
                    } ${p.leads === 0 ? "opacity-0" : ""}`}
                    style={{ height: `${heightPct}%`, minHeight: p.leads > 0 ? 3 : 0 }}
                  />
                  {isHovered && (
                    <span
                      className="absolute z-10 left-1/2 -translate-x-1/2 px-3.5 py-2.5 rounded-2xl bg-[#121417] dark:bg-white text-white dark:text-[#121417] text-left shadow-orvion pointer-events-none whitespace-nowrap border border-white/10 dark:border-black/10 animate-in fade-in"
                      style={{ bottom: `calc(${heightPct}% + 8px)` }}
                    >
                      <span className="block text-[10px] text-[#8C929D] font-medium">{p.label}</span>
                      <span className="block text-sm font-extrabold text-amber-400 dark:text-amber-600">{formatNumber(p.leads)} leads</span>
                      <span className="block text-[10px] text-[#8C929D] font-medium">
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
              className={`flex-1 min-w-0 text-center text-[10px] text-[#8C929D] font-medium whitespace-nowrap ${
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
