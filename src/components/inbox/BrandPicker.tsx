"use client";

import Link from "next/link";
import { Building2 } from "lucide-react";
import { useClientOptions } from "@/hooks/useClientOptions";

/**
 * Regla de oro: cada marca es un mundo. La bandeja nunca mezcla chats de varias marcas, así que sin marca activa
 * se pide elegir una (también se cambia desde la barra lateral).
 */
export function BrandPicker() {
  const clients = useClientOptions({ includeAll: true });

  return (
    <div className="max-w-xl mx-auto py-16 text-center space-y-5">
      <Building2 className="w-10 h-10 text-amber-500 mx-auto" />
      <div className="space-y-1">
        <h1 className="text-2xl font-extrabold text-[#121417] dark:text-white">Elige una marca</h1>
        <p className="text-xs text-[#8C929D]">Cada marca tiene su propia bandeja. También puedes cambiar de marca en la barra lateral.</p>
      </div>
      <div className="flex flex-wrap justify-center gap-2">
        {clients.map((client) => (
          <Link
            key={client.id}
            href={`/inbox?clientId=${encodeURIComponent(client.id)}`}
            className="px-4 py-2 rounded-full bg-white dark:bg-[#121417] border border-[#E2E5EB] dark:border-[#1F242D] text-sm font-semibold text-[#121417] dark:text-white hover:border-amber-500 transition-colors shadow-orvion"
          >
            {client.name}
          </Link>
        ))}
      </div>
    </div>
  );
}
