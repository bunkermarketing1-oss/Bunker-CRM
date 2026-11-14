import React from "react";
import type { LucideIcon } from "lucide-react";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export default function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-10 px-6">
      <span className="w-12 h-12 rounded-full bg-[#F8F9FA] dark:bg-[#1A1D24] border border-[#E2E5EB] dark:border-[#2A2E37] shadow-orvion flex items-center justify-center mb-3.5">
        <Icon className="w-5 h-5 text-amber-500" />
      </span>
      <p className="text-sm font-bold text-[#121417] dark:text-white">{title}</p>
      {description && <p className="text-xs text-[#8C929D] font-medium mt-1 max-w-sm">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
