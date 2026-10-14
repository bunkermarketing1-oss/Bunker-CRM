import React from "react";
import { INTEGRATION_STATUS } from "@/lib/constants/integrations";
import { formatRelativeTime } from "@/lib/format";
import type { DashboardIntegration } from "@/types/dashboard";

const STATUS_META: Record<string, { label: string; dot: string }> = {
  [INTEGRATION_STATUS.CONNECTED]: { label: "Conectada", dot: "bg-emerald-500" },
  [INTEGRATION_STATUS.ERROR]: { label: "Con error", dot: "bg-red-500" },
  [INTEGRATION_STATUS.PENDING_CREDENTIALS]: { label: "Faltan credenciales", dot: "bg-amber-500" },
  [INTEGRATION_STATUS.DISCONNECTED]: { label: "Desconectada", dot: "bg-stone-400" },
};

/** Estado real de cada integración (el color siempre va con su texto, nunca solo). */
export default function IntegrationStatusList({ integrations }: { integrations: DashboardIntegration[] }) {
  return (
    <ul className="space-y-2.5">
      {integrations.map((integration) => {
        const meta = STATUS_META[integration.status] ?? STATUS_META[INTEGRATION_STATUS.DISCONNECTED];
        return (
          <li key={integration.id} className="flex items-center justify-between gap-3 text-xs">
            <span className="font-semibold text-[#141414] truncate">{integration.name}</span>
            <span className="flex items-center gap-1.5 text-[11px] text-[#6B6861] flex-shrink-0">
              <span className={`w-1.5 h-1.5 rounded-full ${meta.dot}`} aria-hidden />
              {meta.label}
              {integration.lastSyncAt && <span className="text-[#9C988F]">· {formatRelativeTime(integration.lastSyncAt)}</span>}
            </span>
          </li>
        );
      })}
    </ul>
  );
}
