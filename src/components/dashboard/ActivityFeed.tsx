import React from "react";
import { FileText, Mail, MessageSquare, PhoneCall, Video, type LucideIcon } from "lucide-react";
import { ACTIVITY_TYPE } from "@/lib/constants/crm";
import { formatRelativeTime } from "@/lib/format";
import type { DashboardActivity } from "@/types/dashboard";

const ACTIVITY_ICON: Record<string, LucideIcon> = {
  [ACTIVITY_TYPE.CALL]: PhoneCall,
  [ACTIVITY_TYPE.MEETING]: Video,
  [ACTIVITY_TYPE.EMAIL]: Mail,
  [ACTIVITY_TYPE.SMS]: MessageSquare,
  [ACTIVITY_TYPE.NOTE]: FileText,
};

/** Línea de tiempo de las últimas actividades: tipo, quién, sobre qué y cuándo. */
export default function ActivityFeed({ activities }: { activities: DashboardActivity[] }) {
  return (
    <ol className="relative space-y-4 before:absolute before:left-[15px] before:top-2 before:bottom-2 before:w-px before:bg-[#ECEAE3] dark:before:bg-[#2E2E34]">
      {activities.map((activity) => {
        const Icon = ACTIVITY_ICON[activity.type] ?? FileText;
        const context = [activity.relatedName, activity.userName].filter(Boolean).join(" · ");
        return (
          <li key={activity.id} className="relative flex gap-3">
            <span className="relative z-10 w-8 h-8 rounded-xl bg-[#FBF7ED] dark:bg-[#2A2415] border border-[#F2E5C4] dark:border-[#473a1e] flex items-center justify-center flex-shrink-0">
              <Icon className="w-3.5 h-3.5 text-[#9A7320] dark:text-[#E5C158]" />
            </span>
            <div className="min-w-0 pt-0.5">
              <p className="text-xs font-semibold text-[#141414] leading-snug">{activity.title}</p>
              <p className="text-[11px] text-[#8C887E] truncate">
                {context ? `${context} · ` : ""}
                {formatRelativeTime(activity.performedAt)}
              </p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
