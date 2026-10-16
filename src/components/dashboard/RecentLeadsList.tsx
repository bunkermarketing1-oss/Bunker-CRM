import React from "react";
import Link from "next/link";
import { Mail, Phone } from "lucide-react";
import LeadStatusBadge from "@/components/crm/LeadStatusBadge";
import { leadSourceLabel } from "@/lib/constants/crm";
import { leadSearchRoute } from "@/lib/constants/routes";
import { formatRelativeTime } from "@/lib/format";
import { initialsOf } from "@/lib/greeting";
import type { DashboardLead } from "@/types/dashboard";

export default function RecentLeadsList({ leads }: { leads: DashboardLead[] }) {
  return (
    <ul className="divide-y divide-[#F4F3EE] dark:divide-[#2E2E34] -mx-2">
      {leads.map((lead) => (
        <li key={lead.id}>
          <Link
            href={leadSearchRoute(lead.name)}
            className="flex items-center gap-3 px-2 py-3 rounded-2xl hover:bg-[#FAF9F5] transition-colors"
          >
            <span className="w-9 h-9 rounded-full bg-[#141414] text-[#FAF8F3] border border-[#D4AF37]/40 flex items-center justify-center font-bold text-[11px] flex-shrink-0">
              {initialsOf(lead.name, "LD")}
            </span>

            <span className="min-w-0 flex-1">
              <span className="flex items-center gap-2">
                <span className="text-xs font-bold text-[#141414] truncate">{lead.name}</span>
                <span className="text-[10px] text-[#9C988F] flex-shrink-0">{formatRelativeTime(lead.createdAt)}</span>
              </span>
              <span className="block text-[11px] text-[#6B6861] truncate">
                {[lead.companyName, leadSourceLabel(lead.source)].filter(Boolean).join(" · ")}
              </span>
            </span>

            <span className="hidden md:flex flex-col items-start gap-0.5 w-48 text-[11px] text-[#6B6861] min-w-0">
              {lead.email && (
                <span className="flex items-center gap-1 w-full min-w-0">
                  <Mail className="w-3 h-3 text-[#9C988F] flex-shrink-0" />
                  <span className="truncate">{lead.email}</span>
                </span>
              )}
              {lead.phone && (
                <span className="flex items-center gap-1">
                  <Phone className="w-3 h-3 text-[#9C988F] flex-shrink-0" />
                  {lead.phone}
                </span>
              )}
            </span>

            <LeadStatusBadge status={lead.status} />
          </Link>
        </li>
      ))}
    </ul>
  );
}
