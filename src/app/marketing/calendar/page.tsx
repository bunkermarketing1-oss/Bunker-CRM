"use client";

import React, { useState, useEffect, useCallback, useMemo, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Plus,
  RefreshCw,
  Share2,
  BarChart3,
  Clock,
  Calendar as CalendarIcon,
} from "lucide-react";
import { useClientOptions } from "@/hooks/useClientOptions";
import { ROUTES } from "@/lib/constants/routes";

interface CalendarPostItem {
  id: string;
  content: string;
  platformsJson?: string | null;
  scheduledFor?: string | null;
  publishedAt?: string | null;
  createdAt: string;
  status: string;
  connectedAccount?: {
    id: string;
    accountName: string;
    accountType: string;
  } | null;
}

interface CalendarCampaignItem {
  id: string;
  name: string;
  platform: string;
  status: string;
  startDate?: string | null;
  endDate?: string | null;
}

export default function EditorialCalendarPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-sm text-[#667085]">Cargando calendario editorial...</div>}>
      <EditorialCalendarContent />
    </Suspense>
  );
}

function EditorialCalendarContent() {
  const searchParams = useSearchParams();
  const clientId = searchParams.get("clientId");
  const clients = useClientOptions();
  const activeClient = clientId && clientId !== "all" ? clients.find((c) => c.id === clientId) : null;

  const [currentDate, setCurrentDate] = useState(() => new Date());
  const [posts, setPosts] = useState<CalendarPostItem[]>([]);
  const [campaigns, setCampaigns] = useState<CalendarCampaignItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDayEvents, setSelectedDayEvents] = useState<{
    date: Date;
    posts: CalendarPostItem[];
  } | null>(null);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const monthName = new Intl.DateTimeFormat("es-CO", { month: "long", year: "numeric" }).format(currentDate);

  const fetchCalendarData = useCallback(async () => {
    setLoading(true);
    try {
      const postsUrl =
        clientId && clientId !== "all"
          ? `/api/posts?clientId=${encodeURIComponent(clientId)}`
          : "/api/posts";
      const campaignsUrl =
        clientId && clientId !== "all"
          ? `/api/campaigns?clientId=${encodeURIComponent(clientId)}`
          : "/api/campaigns";

      const [postsRes, campRes] = await Promise.allSettled([
        fetch(postsUrl).then((r) => r.json()),
        fetch(campaignsUrl).then((r) => r.json()),
      ]);

      if (postsRes.status === "fulfilled" && postsRes.value.success) {
        setPosts(postsRes.value.posts || []);
      }
      if (campRes.status === "fulfilled" && campRes.value.success) {
        setCampaigns(campRes.value.campaigns || []);
      }
    } catch (err) {
      console.error("Error cargando eventos del calendario:", err);
    } finally {
      setLoading(false);
    }
  }, [clientId]);

  useEffect(() => {
    fetchCalendarData();
  }, [fetchCalendarData]);

  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  // Calcular la cuadrícula de días del mes
  const calendarGrid = useMemo(() => {
    const firstDayOfMonth = new Date(year, month, 1);
    const lastDayOfMonth = new Date(year, month + 1, 0);

    // Ajustar para que la semana empiece en Lunes (0=Lunes, 6=Domingo)
    let startDayOfWeek = firstDayOfMonth.getDay() - 1;
    if (startDayOfWeek === -1) startDayOfWeek = 6;

    const daysInMonth = lastDayOfMonth.getDate();

    const days: { date: Date; isCurrentMonth: boolean }[] = [];

    // Días del mes anterior para rellenar
    for (let i = startDayOfWeek - 1; i >= 0; i--) {
      days.push({
        date: new Date(year, month, -i),
        isCurrentMonth: false,
      });
    }

    // Días del mes actual
    for (let d = 1; d <= daysInMonth; d++) {
      days.push({
        date: new Date(year, month, d),
        isCurrentMonth: true,
      });
    }

    // Rellenar hasta múltiplo de 7
    const remaining = 7 - (days.length % 7);
    if (remaining < 7) {
      for (let next = 1; next <= remaining; next++) {
        days.push({
          date: new Date(year, month + 1, next),
          isCurrentMonth: false,
        });
      }
    }

    return days;
  }, [year, month]);

  // Mapear eventos a cada fecha (YYYY-MM-DD)
  const eventsByDate = useMemo(() => {
    const map = new Map<string, { posts: CalendarPostItem[] }>();

    posts.forEach((post) => {
      const targetDate = post.scheduledFor || post.publishedAt || post.createdAt;
      if (!targetDate) return;
      const key = new Date(targetDate).toISOString().split("T")[0];
      const entry = map.get(key) || { posts: [] };
      entry.posts.push(post);
      map.set(key, entry);
    });

    return map;
  }, [posts]);

  const scheduledThisMonthCount = useMemo(() => {
    return posts.filter((p) => {
      if (!p.scheduledFor) return false;
      const d = new Date(p.scheduledFor);
      return d.getMonth() === month && d.getFullYear() === year;
    }).length;
  }, [posts, month, year]);

  const todayStr = new Date().toISOString().split("T")[0];

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-[#EAECF0]">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold text-[#101828] tracking-tight flex items-center gap-2.5">
              <CalendarDays className="w-6 h-6 text-amber-500 shrink-0" />
              <span>Calendario Editorial de Contenidos</span>
            </h1>
            {activeClient && (
              <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-amber-50 text-amber-900 border border-amber-300">
                {activeClient.name}
              </span>
            )}
          </div>
          <p className="text-xs text-[#667085] mt-1 max-w-2xl">
            {activeClient
              ? `Cronograma de publicaciones sociales y pautas programadas para ${activeClient.name}.`
              : "Planificación mensual, semanal y fechas clave de publicaciones para todas las marcas."}
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={fetchCalendarData}
            className="p-2.5 rounded-xl bg-white border border-[#EAECF0] text-[#475467] hover:text-[#101828] text-xs transition-colors shadow-2xs"
            title="Refrescar calendario"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-amber-500" : ""}`} />
          </button>

          <Link
            href={activeClient ? `${ROUTES.SOCIAL_POSTS}?clientId=${activeClient.id}` : ROUTES.SOCIAL_POSTS}
            className="btn-black-gold rounded-xl px-4 py-2 text-xs font-semibold flex items-center gap-2 cursor-pointer shadow-xs"
          >
            <Plus className="w-4 h-4 text-amber-400" />
            <span>Programar Contenido</span>
          </Link>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-2xl bg-white border border-[#EAECF0] shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-xs text-[#667085]">
            <span>Publicaciones Programadas</span>
            <Clock className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-bold text-[#101828]">{scheduledThisMonthCount}</div>
          <div className="text-[11px] text-[#667085]">Para el mes de {monthName}</div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-[#EAECF0] shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-xs text-[#667085]">
            <span>Campañas Activas</span>
            <BarChart3 className="w-4 h-4 text-blue-500" />
          </div>
          <div className="text-2xl font-bold text-[#101828]">{campaigns.length}</div>
          <div className="text-[11px] text-[#667085]">Tráfico e inversión en Meta Ads</div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-[#EAECF0] shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-xs text-[#667085]">
            <span>Total Publicaciones</span>
            <Share2 className="w-4 h-4 text-purple-500" />
          </div>
          <div className="text-2xl font-bold text-[#101828]">{posts.length}</div>
          <div className="text-[11px] text-[#667085]">En histórico y parrilla social</div>
        </div>
      </div>

      {/* Controles de Mes */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-white rounded-2xl border border-[#EAECF0] shadow-2xs">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-bold text-[#101828] capitalize">{monthName}</h2>
          <button
            type="button"
            onClick={handleToday}
            className="px-3 py-1 rounded-lg border border-[#EAECF0] text-xs font-semibold text-[#344054] hover:bg-[#F8F9FA] transition-colors"
          >
            Hoy
          </button>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={handlePrevMonth}
            className="p-2 rounded-lg border border-[#EAECF0] text-[#667085] hover:text-[#101828] hover:bg-[#F8F9FA] transition-colors"
            title="Mes anterior"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={handleNextMonth}
            className="p-2 rounded-lg border border-[#EAECF0] text-[#667085] hover:text-[#101828] hover:bg-[#F8F9FA] transition-colors"
            title="Mes siguiente"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Cuadrícula del Calendario Mensual */}
      <div className="bg-white rounded-2xl border border-[#EAECF0] shadow-2xs overflow-hidden">
        {/* Cabecera de días de la semana */}
        <div className="grid grid-cols-7 border-b border-[#EAECF0] bg-[#F8F9FA] text-center text-xs font-semibold text-[#667085] py-2.5">
          <div>Lun</div>
          <div>Mar</div>
          <div>Mié</div>
          <div>Jue</div>
          <div>Vie</div>
          <div>Sáb</div>
          <div>Dom</div>
        </div>

        {/* Días del calendario */}
        <div className="grid grid-cols-7 auto-rows-fr divide-x divide-y divide-[#EAECF0]">
          {calendarGrid.map((item, idx) => {
            const dateStr = item.date.toISOString().split("T")[0];
            const isToday = dateStr === todayStr;
            const dayEvents = eventsByDate.get(dateStr);
            const postList = dayEvents?.posts || [];

            return (
              <div
                key={idx}
                onClick={() => {
                  if (postList.length > 0) {
                    setSelectedDayEvents({ date: item.date, posts: postList });
                  }
                }}
                className={`min-h-[110px] p-2 flex flex-col justify-between transition-colors ${
                  item.isCurrentMonth ? "bg-white hover:bg-[#FAF9F5]" : "bg-[#F8F9FA]/60 text-[#98A2B3]"
                } ${postList.length > 0 ? "cursor-pointer" : ""}`}
              >
                {/* Número del día */}
                <div className="flex items-center justify-between">
                  <span
                    className={`text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center ${
                      isToday
                        ? "bg-amber-500 text-white shadow-2xs"
                        : item.isCurrentMonth
                        ? "text-[#101828]"
                        : "text-[#98A2B3]"
                    }`}
                  >
                    {item.date.getDate()}
                  </span>

                  {postList.length > 0 && (
                    <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-1.5 py-0.2 rounded border border-amber-200">
                      {postList.length}
                    </span>
                  )}
                </div>

                {/* Eventos del día */}
                <div className="space-y-1 my-1 overflow-hidden">
                  {postList.slice(0, 2).map((post) => (
                    <div
                      key={post.id}
                      className="p-1 rounded-md bg-[#FAF9F5] border border-[#EAECF0] text-[10px] text-[#344054] truncate flex items-center gap-1 font-medium"
                      title={post.content}
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
                      <span className="truncate">{post.content}</span>
                    </div>
                  ))}

                  {postList.length > 2 && (
                    <div className="text-[9px] text-[#667085] font-semibold pl-1">
                      +{postList.length - 2} más
                    </div>
                  )}
                </div>

                <div />
              </div>
            );
          })}
        </div>
      </div>

      {/* Modal / Drawer de Eventos del Día */}
      {selectedDayEvents && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="bg-white rounded-2xl border border-[#EAECF0] w-full max-w-lg overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="p-4 border-b border-[#EAECF0] flex items-center justify-between bg-[#F8F9FA]">
              <div className="flex items-center gap-2">
                <CalendarIcon className="w-4 h-4 text-amber-500" />
                <h3 className="text-sm font-semibold text-[#101828]">
                  Eventos del {selectedDayEvents.date.toLocaleDateString("es-CO", { weekday: "long", day: "numeric", month: "long" })}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedDayEvents(null)}
                className="text-[#667085] hover:text-[#101828] p-1"
              >
                ✕
              </button>
            </div>

            <div className="p-4 space-y-3 max-h-96 overflow-y-auto">
              {selectedDayEvents.posts.map((post) => (
                <div key={post.id} className="p-3.5 rounded-xl bg-[#FAF9F5] border border-[#EAECF0] space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-[#101828]">
                      {post.connectedAccount?.accountName || "Cuenta Social"}
                    </span>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200">
                      {post.status}
                    </span>
                  </div>
                  <p className="text-xs text-[#475467] leading-relaxed whitespace-pre-line">
                    {post.content}
                  </p>
                </div>
              ))}
            </div>

            <div className="p-3 bg-[#F8F9FA] border-t border-[#EAECF0] flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedDayEvents(null)}
                className="px-4 py-2 rounded-xl bg-white border border-[#EAECF0] text-xs font-semibold text-[#344054]"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
