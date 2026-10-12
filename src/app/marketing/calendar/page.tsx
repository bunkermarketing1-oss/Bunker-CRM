"use client";

import React, { useState, useEffect } from "react";
import { Calendar, ChevronLeft, ChevronRight, Clock, Plus, Layers } from "lucide-react";
import Link from "next/link";

export default function EditorialCalendarPage() {
  const [posts, setPosts] = useState<any[]>([]);

  useEffect(() => {
    fetch("/api/posts")
      .then((res) => res.json())
      .then((json) => {
        if (json.success) setPosts(json.posts);
      });
  }, []);

  const daysOfWeek = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-black text-white flex items-center gap-2">
            <Calendar className="w-5 h-5 text-pink-400" />
            Calendario Editorial de Contenidos
          </h1>
          <p className="text-xs text-gray-400 mt-0.5">
            Cronograma mensual de publicaciones en redes sociales de cuentas gestionadas por la agencia.
          </p>
        </div>

        <Link
          href="/marketing/posts"
          className="px-4 py-2.5 rounded-xl bg-bunker-600 hover:bg-bunker-500 text-white text-xs font-semibold flex items-center gap-2 shadow-lg shadow-bunker-600/30 transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>Programar Nuevo Post</span>
        </Link>
      </div>

      {/* Calendar Grid Representation */}
      <div className="p-5 rounded-2xl bg-[#0c111e] border border-[#1b2538] space-y-4">
        <div className="grid grid-cols-7 gap-2 text-center text-xs font-bold text-gray-400 pb-2 border-b border-[#1b2538]">
          {daysOfWeek.map((day) => (
            <div key={day} className="py-1">{day}</div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-2">
          {Array.from({ length: 28 }).map((_, i) => {
            const dayNum = i + 1;
            const dayPosts = posts.filter((p) => p.scheduledFor && new Date(p.scheduledFor).getDate() === dayNum);

            return (
              <div
                key={i}
                className="min-h-[90px] p-2 rounded-xl bg-[#080d16] border border-[#172238] flex flex-col justify-between hover:border-[#243554] transition-colors"
              >
                <span className="text-[11px] font-bold text-gray-400">{dayNum}</span>

                <div className="space-y-1">
                  {dayPosts.map((dp) => (
                    <div
                      key={dp.id}
                      className="p-1 rounded bg-bunker-600/20 border border-bunker-500/30 text-[9px] text-bunker-200 line-clamp-1"
                    >
                      {dp.content}
                    </div>
                  ))}
                  {dayNum === 15 && (
                    <div className="p-1 rounded bg-emerald-500/10 border border-emerald-500/30 text-[9px] text-emerald-300 font-semibold truncate">
                      Lanzamiento Meta Ads
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
