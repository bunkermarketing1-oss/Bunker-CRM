"use client";

import React, { useState } from "react";
import { getLeadAvatarUrl } from "@/lib/avatar";
import { initialsOf } from "@/lib/greeting";

interface LeadAvatarProps {
  name: string;
  avatarUrl?: string | null;
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  className?: string;
  fallbackText?: string;
}

const SIZE_MAP = {
  xs: "w-7 h-7 text-[10px]",
  sm: "w-8 h-8 text-[11px]",
  md: "w-9 h-9 text-xs",
  lg: "w-11 h-11 text-sm",
  xl: "w-24 h-24 text-2xl font-black",
};

export default function LeadAvatar({
  name,
  avatarUrl,
  size = "md",
  className = "",
  fallbackText,
}: LeadAvatarProps) {
  const [hasError, setHasError] = useState(false);
  const resolvedUrl = getLeadAvatarUrl(name, avatarUrl);
  const sizeClass = SIZE_MAP[size] || SIZE_MAP.md;
  const initials = fallbackText || initialsOf(name, "LD");

  return (
    <span
      className={`relative inline-flex items-center justify-center rounded-full shrink-0 overflow-hidden font-bold select-none border border-amber-500/20 shadow-xs ${sizeClass} ${className}`}
    >
      {!hasError ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={resolvedUrl}
          alt={name || "Prospecto"}
          loading="lazy"
          onError={() => setHasError(true)}
          className="w-full h-full object-cover rounded-full"
        />
      ) : (
        <span className="w-full h-full flex items-center justify-center bg-[#121417] text-amber-400 dark:bg-white dark:text-[#121417]">
          {initials}
        </span>
      )}
    </span>
  );
}
