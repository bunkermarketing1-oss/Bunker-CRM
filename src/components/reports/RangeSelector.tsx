import React from "react";
import { REPORT_RANGE_DAYS, type ReportRangeDays } from "@/lib/constants/reports";

const RANGE_LABEL: Record<ReportRangeDays, string> = {
  30: "30 días",
  90: "90 días",
  180: "6 meses",
  365: "12 meses",
};

interface RangeSelectorProps {
  value: ReportRangeDays;
  onChange: (days: ReportRangeDays) => void;
}

export default function RangeSelector({ value, onChange }: RangeSelectorProps) {
  return (
    <div role="radiogroup" aria-label="Período del reporte" className="inline-flex p-1 rounded-full bg-white dark:bg-[#121417] border border-[#E2E5EB] dark:border-[#1F242D] shadow-orvion">
      {REPORT_RANGE_DAYS.map((days) => {
        const isActive = days === value;
        return (
          <button
            key={days}
            type="button"
            role="radio"
            aria-checked={isActive}
            onClick={() => onChange(days)}
            className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all ${
              isActive
                ? "bg-[#121417] text-white dark:bg-white dark:text-[#121417] shadow-xs"
                : "text-[#8C929D] hover:text-[#121417] dark:hover:text-white hover:bg-[#F3F4F7] dark:hover:bg-[#1E2229]"
            }`}
          >
            {RANGE_LABEL[days]}
          </button>
        );
      })}
    </div>
  );
}
