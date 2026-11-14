import React from "react";
import { formatCompactMoney, formatNumber, formatPercent } from "@/lib/format";
import type { SourceBreakdownRow } from "@/types/reports";

interface SourceBreakdownTableProps {
  rows: SourceBreakdownRow[];
}

/** Leads por fuente de captación: volumen (barra), conversión y valor estimado. */
export default function SourceBreakdownTable({ rows }: SourceBreakdownTableProps) {
  const maxLeads = Math.max(1, ...rows.map((row) => row.leads));

  return (
    <div className="-mx-1 overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr className="text-[11px] text-[#8C929D] border-b border-[#E2E5EB] dark:border-[#2A2E37]">
            <th className="text-left font-bold py-2.5 px-2">Canal / Fuente</th>
            <th className="text-left font-bold py-2.5 px-2 sm:w-[40%]">Volumen de Leads</th>
            <th className="text-right font-bold py-2.5 px-2">Conversión</th>
            <th className="hidden sm:table-cell text-right font-bold py-2.5 px-2">Valor Estimado</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[#E2E5EB] dark:divide-[#1F242D]">
          {rows.map((row) => (
            <tr key={row.source} className="hover:bg-[#F8F9FA] dark:hover:bg-[#1A1D24] transition-colors">
              <td className="py-3 px-2">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <span className="font-bold text-[#121417] dark:text-white">{row.label}</span>
                  {row.isPaid && (
                    <span className="orvion-badge-gold text-[9px] px-2 py-0.5">
                      Pauta
                    </span>
                  )}
                </div>
              </td>
              <td className="py-3 px-2">
                <div className="flex items-center gap-3">
                  <div className="hidden sm:block flex-1 h-2 rounded-full bg-[#F3F4F7] dark:bg-[#1E2229] overflow-hidden">
                    <div
                      className="h-full rounded-full bg-amber-500 dark:bg-amber-400 shadow-2xs"
                      style={{ width: `${(row.leads / maxLeads) * 100}%` }}
                    />
                  </div>
                  <span className="sm:w-10 text-right font-mono font-bold text-[#121417] dark:text-white">{formatNumber(row.leads)}</span>
                </div>
              </td>
              <td className="py-3 px-2 text-right">
                <span className="font-mono font-bold text-[#121417] dark:text-white">{formatPercent(row.conversionRate)}</span>
                <span className="block text-[10px] text-[#8C929D] font-medium">{formatNumber(row.converted)} conv.</span>
              </td>
              <td className="hidden sm:table-cell py-3 px-2 text-right font-mono font-bold text-[#64748B] dark:text-[#94A3B8]">{formatCompactMoney(row.estimatedValue)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
