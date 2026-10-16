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
    <div className="-mx-1">
      <table className="w-full text-xs">
        <thead>
          <tr className="text-[11px] text-[#8C887E] border-b border-[#ECEAE3]">
            <th className="text-left font-semibold py-2.5 px-1">Fuente</th>
            <th className="text-left font-semibold py-2.5 px-1 sm:w-[40%]">Leads</th>
            <th className="text-right font-semibold py-2.5 px-1">Conversión</th>
            <th className="hidden sm:table-cell text-right font-semibold py-2.5 px-1">Valor estimado</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.source} className="border-b border-[#F4F3EE] dark:border-[#2E2E34] last:border-0">
              <td className="py-3 px-1">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <span className="font-semibold text-[#141414]">{row.label}</span>
                  {row.isPaid && (
                    <span className="text-[9px] font-bold uppercase tracking-wide text-[#9A7320] dark:text-[#E5C158] bg-[#FBF7ED] dark:bg-[#2A2415] border border-[#F2E5C4] dark:border-[#473a1e] px-1.5 rounded">
                      Pauta
                    </span>
                  )}
                </div>
              </td>
              <td className="py-3 px-1">
                <div className="flex items-center gap-2.5">
                  <div className="hidden sm:block flex-1 h-2 rounded-full bg-[#F4F3EE] dark:bg-[#26262B] overflow-hidden">
                    <div
                      className="h-full rounded-full bg-[#A27B22] dark:bg-[#AD8828]"
                      style={{ width: `${(row.leads / maxLeads) * 100}%` }}
                    />
                  </div>
                  <span className="sm:w-10 text-right font-mono text-[#141414]">{formatNumber(row.leads)}</span>
                </div>
              </td>
              <td className="py-3 px-1 text-right">
                <span className="font-mono text-[#141414]">{formatPercent(row.conversionRate)}</span>
                <span className="block text-[10px] text-[#9C988F]">{formatNumber(row.converted)} conv.</span>
              </td>
              <td className="hidden sm:table-cell py-3 px-1 text-right font-mono text-[#6B6861]">{formatCompactMoney(row.estimatedValue)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
