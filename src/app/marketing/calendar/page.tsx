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
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-[#E8E6DF]">
        <div>
          <div className="flex items-center gap-2 text-xs text-[#82807C] mb-1">
            <span>Marketing</span>
            <span>/</span>
            <span className="text-[#1F1E1D] font-medium">Calendario</span>
          </div>
          <h1 className="text-2xl font-semibold text-[#1F1E1D] tracking-tight">
            Calendario Editorial de Contenidos
          </h1>
          <p className="text-xs text-[#6B6966] mt-0.5">
            Cronograma mensual de publicaciones y pautas gestionadas directamente por Bunker Agency.
          </p>
        </div>

        <Link
          href="/marketing/posts"
          className="btn-black-gold rounded-2xl px-4 py-2 text-xs font-semibold flex items-center gap-2"
        >
          <Plus className="w-4 h-4 text-[#E5C158]" />
          <span>Programar Post</span>
        </Link>
      </div>

      {/* Calendar Grid */}
      <div className="p-5 rounded-2xl bg-white border border-[#E8E6DF] shadow-sm space-y-4">
        <div className="grid grid-cols-7 gap-2 text-center text-xs font-semibold text-[#6B6966] pb-3 border-b border-[#E8E6DF]">
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
                className="min-h-[96px] p-2.5 rounded-xl bg-[#FAF9F5] border border-[#E8E6DF] flex flex-col justify-between hover:border-[#D1CFCA] transition-colors"
              >
                <span className="text-[11px] font-mono font-medium text-[#82807C]">{dayNum}</span>

                <div className="space-y-1.5 mt-1">
                  {dayPosts.map((dp) => (
                    <div
                      key={dp.id}
                      className="p-1.5 rounded-lg bg-white border border-[#E8E6DF] text-[10px] text-[#1F1E1D] line-clamp-1 shadow-xs"
                    >
                      {dp.content}
                    </div>
                  ))}
                  {dayNum === 15 && (
                    <div className="p-1 rounded bg-[#EBF5EE] border border-[#C2E2CC] text-[10px] text-emerald-800 font-medium truncate">
                      Meta Ads Campaña A
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
