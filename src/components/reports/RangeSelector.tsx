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
    <div role="radiogroup" aria-label="Período del reporte" className="inline-flex p-1 rounded-2xl bg-white border border-[#ECEAE3]">
      {REPORT_RANGE_DAYS.map((days) => {
        const isActive = days === value;
        return (
          <button
            key={days}
            type="button"
            role="radio"
            aria-checked={isActive}
            onClick={() => onChange(days)}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
              isActive ? "bg-[#141414] text-[#FAF8F3] dark:bg-[#FAF8F3] dark:text-[#141414]" : "text-[#6B6861] hover:text-[#141414]"
            }`}
          >
            {RANGE_LABEL[days]}
          </button>
        );
      })}
    </div>
  );
}
