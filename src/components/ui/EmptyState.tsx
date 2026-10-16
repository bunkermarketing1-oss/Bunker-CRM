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
      <span className="w-11 h-11 rounded-2xl bg-[#FAF9F5] border border-[#ECEAE3] flex items-center justify-center mb-3">
        <Icon className="w-5 h-5 text-[#9C988F]" />
      </span>
      <p className="text-sm font-semibold text-[#141414]">{title}</p>
      {description && <p className="text-xs text-[#6B6861] mt-1 max-w-sm">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
