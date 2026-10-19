import { Radio } from "lucide-react";
import type { PageLeadgenStatus as PageLeadgenStatusValue } from "@/types/meta-leads";

interface PageLeadgenStatusProps {
  status: PageLeadgenStatusValue | null;
}

/** Línea de estado bajo una página de Facebook: si recibe leads y cuándo llegó el último. */
export function PageLeadgenStatus({ status }: PageLeadgenStatusProps) {
  if (!status) return null;

  if (status.subscribed === false) {
    return (
      <p className="flex items-center gap-1.5 text-red-700" title={status.error ?? undefined}>
        <Radio className="w-3 h-3" />
        No recibe leads: reconecta Meta con permisos de leads
      </p>
    );
  }

  if (status.subscribed === null) {
    return (
      <p className="flex items-center gap-1.5 text-[#82807C]">
        <Radio className="w-3 h-3" />
        Leads sin activar: reconecta Meta para recibirlos
      </p>
    );
  }

  return (
    <p className="flex items-center gap-1.5 text-emerald-700">
      <Radio className="w-3 h-3" />
      Recibiendo leads
      <span className="text-[#82807C]">
        · {status.lastLeadAt ? `último ${new Date(status.lastLeadAt).toLocaleString()}` : "aún sin leads"}
      </span>
    </p>
  );
}
