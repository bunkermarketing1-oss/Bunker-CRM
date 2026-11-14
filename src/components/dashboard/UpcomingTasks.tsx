import React from "react";
import { CalendarClock } from "lucide-react";
import { TASK_PRIORITY, TASK_PRIORITY_LABEL, type TaskPriority } from "@/lib/constants/crm";
import { formatShortDate } from "@/lib/format";
import type { DashboardTask } from "@/types/dashboard";

const PRIORITY_STYLE: Record<TaskPriority, string> = {
  [TASK_PRIORITY.URGENT]: "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/50 dark:text-red-300 dark:border-red-900",
  [TASK_PRIORITY.HIGH]: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-900",
  [TASK_PRIORITY.MEDIUM]: "bg-stone-100 text-stone-700 border-stone-200 dark:bg-stone-800/60 dark:text-stone-300 dark:border-stone-700",
  [TASK_PRIORITY.LOW]: "bg-stone-50 text-stone-500 border-stone-200 dark:bg-stone-900/60 dark:text-stone-400 dark:border-stone-800",
};

function priorityOf(value: string): TaskPriority {
  return value in TASK_PRIORITY_LABEL ? (value as TaskPriority) : TASK_PRIORITY.MEDIUM;
}

export default function UpcomingTasks({ tasks, now }: { tasks: DashboardTask[]; now: Date }) {
  return (
    <ul className="space-y-2">
      {tasks.map((task) => {
        const priority = priorityOf(task.priority);
        const isOverdue = task.dueDate !== null && new Date(task.dueDate) < now;
        return (
          <li key={task.id} className="p-3.5 rounded-2xl bg-[#F8F9FA] dark:bg-[#1A1D24] border border-[#E2E5EB] dark:border-[#2A2E37] flex items-start justify-between gap-3 shadow-2xs transition-colors">
            <div className="min-w-0">
              <p className="text-xs font-bold text-[#121417] dark:text-white leading-snug">{task.title}</p>
              <p className="text-[11px] text-[#8C929D] flex items-center gap-1.5 mt-1 min-w-0 font-medium">
                <CalendarClock className={`w-3.5 h-3.5 flex-shrink-0 ${isOverdue ? "text-red-500" : "text-[#8C929D]"}`} />
                <span className={`whitespace-nowrap flex-shrink-0 ${isOverdue ? "text-red-600 dark:text-red-400 font-bold" : ""}`}>
                  {task.dueDate ? `${isOverdue ? "Venció" : "Vence"} ${formatShortDate(task.dueDate)}` : "Sin fecha"}
                </span>
                {task.relatedName && <span className="truncate min-w-0 text-[#64748B] dark:text-[#94A3B8]">· {task.relatedName}</span>}
              </p>
            </div>
            <span className={`text-[9px] font-bold uppercase px-2.5 py-0.5 rounded-full border flex-shrink-0 ${PRIORITY_STYLE[priority]}`}>
              {TASK_PRIORITY_LABEL[priority]}
            </span>
          </li>
        );
      })}
    </ul>
  );
}
