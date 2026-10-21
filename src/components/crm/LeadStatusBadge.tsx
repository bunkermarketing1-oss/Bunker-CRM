import React from "react";
import { LEAD_STATUS, LEAD_STATUS_LABEL, type LeadStatusValue } from "@/lib/constants/crm";

const STATUS_STYLE: Record<LeadStatusValue, string> = {
  [LEAD_STATUS.NEW]: "bg-stone-100 text-stone-700 border-stone-200 dark:bg-stone-800/60 dark:text-stone-300 dark:border-stone-700",
  [LEAD_STATUS.CONTACTED]: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/50 dark:text-blue-300 dark:border-blue-900",
  [LEAD_STATUS.QUALIFIED]: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-900",
  [LEAD_STATUS.CONVERTED]: "bg-amber-50 text-amber-800 border-amber-300 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800",
  [LEAD_STATUS.LOST]: "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/50 dark:text-red-300 dark:border-red-900",
};

function isLeadStatus(status: string): status is LeadStatusValue {
  return status in LEAD_STATUS_LABEL;
}

export default function LeadStatusBadge({ status }: { status: string }) {
  const known = isLeadStatus(status) ? status : LEAD_STATUS.NEW;
  return (
    <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold uppercase border inline-block whitespace-nowrap ${STATUS_STYLE[known]}`}>
      {LEAD_STATUS_LABEL[known]}
    </span>
  );
}
