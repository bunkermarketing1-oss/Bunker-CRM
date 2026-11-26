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
  Building2,
  X,
} from "lucide-react";
import { useClientOptions } from "@/hooks/useClientOptions";
import { ROUTES } from "@/lib/constants/routes";
import EmptyState from "@/components/ui/EmptyState";

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
    <Suspense
      fallback={
        <div className="p-8 text-center text-xs text-[#8C929D] font-mono animate-pulse">
          Cargando calendario editorial...
        </div>
      }
    >
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
    <div className="space-y-6">
      {/* Cabecera Estilo Cápsula Orvion con Paleta Dorado y Negro */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="orvion-badge-gold text-[10px]">
              Estrategia & Parrilla Social
            </span>
            {activeClient ? (
              <span className="text-[11px] font-semibold text-[#121417] dark:text-white bg-white dark:bg-[#121417] px-3 py-1 rounded-full border border-[#E2E5EB] dark:border-[#1F242D] shadow-orvion flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-amber-500" />
                Marca: <strong>{activeClient.name}</strong>
              </span>
            ) : (
              <span className="text-[11px] font-medium text-[#8C929D] bg-white dark:bg-[#121417] px-3 py-1 rounded-full border border-[#E2E5EB] dark:border-[#1F242D] shadow-orvion">
                Todas las Marcas de la Agencia
              </span>
            )}
          </div>

          <h1 className="text-3xl font-extrabold text-[#121417] dark:text-white tracking-tight leading-tight flex items-center gap-2.5">
            <CalendarDays className="w-7 h-7 text-amber-400 shrink-0" />
            <span>Calendario Editorial de Contenidos</span>
          </h1>
          <p className="text-xs text-[#8C929D] font-medium flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-amber-400 shadow-xs animate-pulse" />
            <span>
              {activeClient
                ? `Cronograma de publicaciones en Instagram, Facebook y TikTok para ${activeClient.name}.`
                : "Planificación mensual, semanal y fechas clave de lanzamientos para todas las marcas."}
            </span>
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            type="button"
            onClick={fetchCalendarData}
            className="w-10 h-10 rounded-full bg-white dark:bg-[#121417] border border-[#E2E5EB] dark:border-[#1F242D] flex items-center justify-center text-[#121417] dark:text-white hover:bg-[#F3F4F7] dark:hover:bg-[#1E2229] shadow-orvion transition-all cursor-pointer"
            title="Refrescar calendario"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-amber-500" : ""}`} />
          </button>

          <Link
            href={activeClient ? `${ROUTES.SOCIAL_POSTS}?clientId=${activeClient.id}` : ROUTES.SOCIAL_POSTS}
            className="btn-black-gold rounded-full px-4 py-2 text-xs font-semibold flex items-center gap-2 cursor-pointer shadow-orvion"
          >
            <Plus className="w-4 h-4 text-amber-400" />
            <span>Programar Contenido</span>
          </Link>
        </div>
      </div>

      {/* KPI Cards de Resumen en Cápsula Orvion */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 rounded-[24px] bg-white dark:bg-[#121417] border border-[#E2E5EB] dark:border-[#1F242D] shadow-orvion space-y-1.5">
          <div className="flex items-center justify-between text-xs font-semibold text-[#8C929D]">
            <span>Publicaciones Programadas</span>
            <div className="w-8 h-8 rounded-full bg-amber-400/10 flex items-center justify-center text-amber-500">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-[#121417] dark:text-white">{scheduledThisMonthCount}</div>
          <div className="text-[11px] text-[#8C929D]">Para el mes de {monthName}</div>
        </div>

        <div className="p-5 rounded-[24px] bg-white dark:bg-[#121417] border border-[#E2E5EB] dark:border-[#1F242D] shadow-orvion space-y-1.5">
          <div className="flex items-center justify-between text-xs font-semibold text-[#8C929D]">
            <span>Campañas Activas de Pauta</span>
            <div className="w-8 h-8 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-500">
              <BarChart3 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-[#121417] dark:text-white">{campaigns.length}</div>
          <div className="text-[11px] text-[#8C929D]">Tráfico e inversión en Meta Ads</div>
        </div>

        <div className="p-5 rounded-[24px] bg-white dark:bg-[#121417] border border-[#E2E5EB] dark:border-[#1F242D] shadow-orvion space-y-1.5">
          <div className="flex items-center justify-between text-xs font-semibold text-[#8C929D]">
            <span>Total Publicaciones</span>
            <div className="w-8 h-8 rounded-full bg-purple-500/10 flex items-center justify-center text-purple-500">
              <Share2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-[#121417] dark:text-white">{posts.length}</div>
          <div className="text-[11px] text-[#8C929D]">En histórico y parrilla social</div>
        </div>
      </div>

      {/* Controles de Mes en Cápsula Orvion */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-white dark:bg-[#121417] rounded-[24px] border border-[#E2E5EB] dark:border-[#1F242D] shadow-orvion">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-extrabold text-[#121417] dark:text-white capitalize">{monthName}</h2>
          <button
            type="button"
            onClick={handleToday}
            className="px-3.5 py-1 rounded-full border border-[#E2E5EB] dark:border-[#262C36] text-xs font-bold text-[#121417] dark:text-white hover:bg-[#F3F4F7] dark:hover:bg-[#1E2229] transition-colors cursor-pointer"
          >
            Hoy
          </button>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={handlePrevMonth}
            className="w-9 h-9 rounded-full border border-[#E2E5EB] dark:border-[#262C36] text-[#8C929D] hover:text-[#121417] dark:hover:text-white hover:bg-[#F3F4F7] dark:hover:bg-[#1E2229] flex items-center justify-center transition-colors cursor-pointer"
            title="Mes anterior"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={handleNextMonth}
            className="w-9 h-9 rounded-full border border-[#E2E5EB] dark:border-[#262C36] text-[#8C929D] hover:text-[#121417] dark:hover:text-white hover:bg-[#F3F4F7] dark:hover:bg-[#1E2229] flex items-center justify-center transition-colors cursor-pointer"
            title="Mes siguiente"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {!loading && posts.length === 0 && (
        <div className="bg-white dark:bg-[#121417] rounded-[28px] border border-[#E2E5EB] dark:border-[#1F242D] shadow-orvion">
          <EmptyState
            icon={CalendarDays}
            title="Aún no hay publicaciones"
            description="Programa contenido y aparecerá en la parrilla del calendario."
          />
        </div>
      )}

      {/* Cuadrícula del Calendario Mensual en Cápsula Orvion */}
      <div className="bg-white dark:bg-[#121417] rounded-[28px] border border-[#E2E5EB] dark:border-[#1F242D] shadow-orvion overflow-hidden">
        {/* Cabecera de días de la semana */}
        <div className="grid grid-cols-7 border-b border-[#E2E5EB] dark:border-[#1F242D] bg-[#F8F9FB] dark:bg-[#161A20] text-center text-xs font-bold text-[#8C929D] py-3 uppercase tracking-wider">
          <div>Lun</div>
          <div>Mar</div>
          <div>Mié</div>
          <div>Jue</div>
          <div>Vie</div>
          <div>Sáb</div>
          <div>Dom</div>
        </div>

        {/* Días del calendario */}
        <div className="grid grid-cols-7 auto-rows-fr divide-x divide-y divide-[#E2E5EB] dark:divide-[#1F242D]">
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
                className={`min-h-[120px] p-2.5 flex flex-col justify-between transition-colors ${
                  item.isCurrentMonth
                    ? "bg-white dark:bg-[#121417] hover:bg-[#F8F9FB] dark:hover:bg-[#181C22]"
                    : "bg-[#F8F9FA]/60 dark:bg-[#0D0F12]/60 text-[#8C929D]"
                } ${postList.length > 0 ? "cursor-pointer" : ""}`}
              >
                {/* Número del día */}
                <div className="flex items-center justify-between">
                  <span
                    className={`text-xs font-extrabold w-7 h-7 rounded-full flex items-center justify-center ${
                      isToday
                        ? "bg-amber-400 text-[#121417] shadow-orvion"
                        : item.isCurrentMonth
                        ? "text-[#121417] dark:text-white"
                        : "text-[#8C929D]"
                    }`}
                  >
                    {item.date.getDate()}
                  </span>

                  {postList.length > 0 && (
                    <span className="text-[10px] font-bold text-amber-900 dark:text-amber-200 bg-amber-100 dark:bg-amber-950/60 px-2 py-0.5 rounded-full border border-amber-300 dark:border-amber-700/50">
                      {postList.length}
                    </span>
                  )}
                </div>

                {/* Eventos del día */}
                <div className="space-y-1.5 my-1.5 overflow-hidden">
                  {postList.slice(0, 2).map((post) => (
                    <div
                      key={post.id}
                      className="p-1.5 rounded-[12px] bg-[#F8F9FB] dark:bg-[#181C22] border border-[#E2E5EB]/80 dark:border-[#262C36] text-[10px] text-[#121417] dark:text-[#C5CAD4] truncate flex items-center gap-1.5 font-medium shadow-2xs"
                      title={post.content}
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />
                      <span className="truncate">{post.content}</span>
                    </div>
                  ))}

                  {postList.length > 2 && (
                    <div className="text-[10px] text-[#8C929D] font-bold pl-1">
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

      {/* Modal de Eventos del Día con Diseño Orvion */}
      {selectedDayEvents && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white dark:bg-[#121417] rounded-[28px] border border-[#E2E5EB] dark:border-[#1F242D] w-full max-w-lg overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="p-5 border-b border-[#E2E5EB] dark:border-[#1F242D] flex items-center justify-between bg-white dark:bg-[#121417]">
              <div className="flex items-center gap-2">
                <CalendarIcon className="w-4 h-4 text-amber-500" />
                <h3 className="text-sm font-extrabold text-[#121417] dark:text-white capitalize">
                  Eventos del {selectedDayEvents.date.toLocaleDateString("es-CO", { weekday: "long", day: "numeric", month: "long" })}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedDayEvents(null)}
                className="w-8 h-8 rounded-full bg-[#F3F4F7] dark:bg-[#1E2229] text-[#8C929D] hover:text-[#121417] dark:hover:text-white flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-3.5 max-h-96 overflow-y-auto">
              {selectedDayEvents.posts.map((post) => (
                <div
                  key={post.id}
                  className="p-4 rounded-[20px] bg-[#F8F9FB] dark:bg-[#161A20] border border-[#E2E5EB]/80 dark:border-[#262C36] space-y-2 shadow-2xs"
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-[#121417] dark:text-white">
                      {post.connectedAccount?.accountName || "Cuenta Social"}
                    </span>
                    <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-900 dark:text-amber-200 border border-amber-300 dark:border-amber-700/50">
                      {post.status}
                    </span>
                  </div>
                  <p className="text-xs text-[#525866] dark:text-[#A0A6B2] leading-relaxed whitespace-pre-line">
                    {post.content}
                  </p>
                </div>
              ))}
            </div>

            <div className="p-4 bg-white dark:bg-[#121417] border-t border-[#E2E5EB] dark:border-[#1F242D] flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedDayEvents(null)}
                className="px-4 py-2 rounded-full bg-[#F3F4F7] dark:bg-[#1E2229] border border-[#E2E5EB] dark:border-[#262C36] text-xs font-semibold text-[#121417] dark:text-white hover:bg-[#E2E5EB] cursor-pointer"
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
