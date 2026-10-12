"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  Users,
  ChevronDown,
  MoreVertical,
  Mail,
  Phone,
  ArrowUpRight,
  Filter,
  Layers,
  Sparkles,
  Plus,
  GripVertical,
  Radio,
  FileText,
  Clock,
  CheckCircle2,
} from "lucide-react";

export default function DashboardPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState("JUL");

  const fetchDashboard = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/dashboard");
      const json = await res.json();
      if (json.success) {
        setData(json);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  const recentLeads = data?.recentLeads || [
    {
      id: "1",
      name: "Shawon Black",
      time: "Hoy 9:10 am",
      email: "shawon@mailzone.io",
      phone: "(234) 555-0108",
      campId: "56728",
      message: "Consulta pauta Meta Ads para ecommerce de calzado...",
      avatarColor: "bg-[#F59E0B]",
    },
    {
      id: "2",
      name: "Kamrul Miles",
      time: "Hoy 9:10 am",
      email: "miles87@fastmail.net",
      phone: "(234) 555-0108",
      campId: "12131",
      message: "Interés en auditoría Advantage+ y catálogo dinámico...",
      avatarColor: "bg-[#10B981]",
    },
    {
      id: "3",
      name: "Su Flores",
      time: "Hoy 8:10 am",
      email: "su.m@quickinbox.org",
      phone: "(234) 555-0108",
      campId: "15161",
      message: "Sesión estratégica para reactivación de cuenta B2B...",
      avatarColor: "bg-[#6366F1]",
    },
    {
      id: "4",
      name: "Ma Pena",
      time: "Hoy 7:30 am",
      email: "ma.y@inboxmail.com",
      phone: "(234) 555-0108",
      campId: "81922",
      message: "Atención comercial urgente para campaña de fin de mes...",
      avatarColor: "bg-[#EC4899]",
    },
  ];

  const months = ["ENE", "FEB", "MAR", "ABR", "MAY", "JUN", "JUL", "AGO", "SEP", "OCT", "NOV", "DIC"];

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* 2-Column Responsive Layout (Exact match to reference image) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* ================= LEFT / CENTER WIDE COLUMN (8 cols) ================= */}
        <div className="lg:col-span-8 space-y-6">
          {/* Card 1: Lead Preview Table (Exact match) */}
          <div className="bg-white rounded-3xl border border-[#ECEAE3] p-5 shadow-xs">
            {/* Header */}
            <div className="flex items-center justify-between pb-4 border-b border-[#F4F3EE]">
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-[#141414]">Lead Preview</h2>
              </div>
              <div className="flex items-center gap-3">
                <Link
                  href="/crm/leads"
                  className="flex items-center gap-1 text-xs text-[#6B6861] hover:text-[#141414] font-medium"
                >
                  <span>Ver Todos</span>
                  <ChevronDown className="w-3.5 h-3.5 text-[#8C887E]" />
                </Link>
                <button className="text-[#8C887E] hover:text-[#141414] p-1">
                  <MoreVertical className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="text-[11px] font-semibold text-[#8C887E] border-b border-[#F4F3EE]">
                    <th className="py-3 px-2 font-semibold">
                      <span className="flex items-center gap-1 cursor-pointer hover:text-[#141414]">
                        Perfil <span className="text-[9px]">⇅</span>
                      </span>
                    </th>
                    <th className="py-3 px-2 font-semibold">
                      <span className="flex items-center gap-1 cursor-pointer hover:text-[#141414]">
                        Contacto <span className="text-[9px]">⇅</span>
                      </span>
                    </th>
                    <th className="py-3 px-2 font-semibold">
                      <span className="flex items-center gap-1 cursor-pointer hover:text-[#141414]">
                        Campaña ID <span className="text-[9px]">⇅</span>
                      </span>
                    </th>
                    <th className="py-3 px-2 font-semibold">
                      <span className="flex items-center gap-1 cursor-pointer hover:text-[#141414]">
                        Mensaje / Solicitud <span className="text-[9px]">⇅</span>
                      </span>
                    </th>
                    <th className="py-3 px-2 text-right font-semibold">Opción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F4F3EE] text-xs">
                  {recentLeads.map((lead: any, idx: number) => {
                    const initials = lead.name
                      ? lead.name
                          .split(" ")
                          .map((n: string) => n[0])
                          .slice(0, 2)
                          .join("")
                      : "LD";

                    return (
                      <tr key={lead.id || idx} className="hover:bg-[#FAF9F5] transition-colors group">
                        {/* Profile */}
                        <td className="py-3 px-2">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-full bg-[#141414] text-[#FAF8F3] border border-[#D4AF37]/40 flex items-center justify-center font-bold text-[11px] flex-shrink-0">
                              {initials}
                            </div>
                            <div>
                              <div className="font-bold text-[#141414] leading-tight">{lead.name}</div>
                              <div className="text-[10px] text-[#8C887E] mt-0.5 font-medium">
                                {lead.time || "Hoy registrado"}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Contact */}
                        <td className="py-3 px-2 text-[11px] text-[#6B6861]">
                          <div className="flex items-center gap-1 text-[#141414] font-medium truncate max-w-[170px]">
                            <Mail className="w-3 h-3 text-[#8C887E] flex-shrink-0" />
                            <span className="truncate">{lead.email}</span>
                          </div>
                          <div className="flex items-center gap-1 text-[#8C887E] mt-0.5">
                            <Phone className="w-3 h-3 text-[#8C887E] flex-shrink-0" />
                            <span>{lead.phone || "+52 55 1234 5678"}</span>
                          </div>
                        </td>

                        {/* Camp ID */}
                        <td className="py-3 px-2">
                          <span className="text-[11px] font-mono font-bold text-[#141414] bg-[#F4F3EE] px-2 py-0.5 rounded-lg border border-[#ECEAE3]">
                            {lead.campId || `CAMP-${idx + 1}0`}
                          </span>
                        </td>

                        {/* Message */}
                        <td className="py-3 px-2 text-[11px] text-[#6B6861] max-w-[200px] truncate">
                          <span className="truncate block">
                            {lead.message || lead.notes || "Sesión de consultoría estratégica y pauta..."}
                          </span>
                        </td>

                        {/* Option */}
                        <td className="py-3 px-2 text-right">
                          <button className="text-[#8C887E] hover:text-[#141414] p-1 rounded-lg hover:bg-white">
                            <MoreVertical className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Card 2: Top Conversation / Segmented Pill Chart (Exact match) */}
          <div className="bg-white rounded-3xl border border-[#ECEAE3] p-5 shadow-xs space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-[#141414]">Top conversation</h2>
              <div className="flex items-center gap-2">
                <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-2xl bg-[#F6F5F2] border border-[#ECEAE3] text-xs font-medium text-[#141414] hover:bg-[#EFECE4] transition-colors">
                  <Filter className="w-3 h-3 text-[#8C887E]" />
                  <span>Filtro</span>
                  <ChevronDown className="w-3 h-3 text-[#8C887E]" />
                </button>
                <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-2xl bg-[#F6F5F2] border border-[#ECEAE3] text-xs font-medium text-[#141414] hover:bg-[#EFECE4] transition-colors">
                  <span>Últimos 10 días</span>
                  <ChevronDown className="w-3 h-3 text-[#8C887E]" />
                </button>
              </div>
            </div>

            {/* Months Tabs */}
            <div className="flex items-center justify-between text-[11px] font-bold text-[#8C887E] pt-2 pb-1 border-b border-[#F4F3EE]">
              {months.map((m) => (
                <button
                  key={m}
                  onClick={() => setSelectedMonth(m)}
                  className={`px-2 py-1 transition-colors ${
                    selectedMonth === m
                      ? "text-[#141414] font-black underline underline-offset-4 decoration-[#D4AF37] decoration-2"
                      : "hover:text-[#141414]"
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>

            {/* Chart Area with Stacked Rounded Pill Bars & Floating Tooltip */}
            <div className="relative pt-6 pb-2 min-h-[260px] flex items-end">
              {/* Y-axis Labels */}
              <div className="w-10 text-[10px] font-mono text-[#8C887E] flex flex-col justify-between h-[210px] pb-1 select-none">
                <span>70k</span>
                <span>60k</span>
                <span>50k</span>
                <span>40k</span>
                <span>30k</span>
                <span>20k</span>
                <span>10k</span>
                <span>0</span>
              </div>

              {/* Grid Lines */}
              <div className="flex-1 relative h-[210px]">
                <div className="absolute inset-0 flex flex-col justify-between pointer-events-none opacity-40">
                  {Array.from({ length: 8 }).map((_, i) => (
                    <div key={i} className="border-b border-dashed border-[#ECEAE3] w-full" />
                  ))}
                </div>

                {/* Bars Representation (Segmented Pill Stack Blocks matching reference) */}
                <div className="relative z-10 h-full flex items-end justify-around px-2">
                  {[
                    { heights: [30, 40, 20], active: false },
                    { heights: [45, 30, 25], active: false },
                    { heights: [60, 40, 30], active: false },
                    { heights: [25, 45, 50], active: false },
                    { heights: [80, 50, 40], active: false },
                    { heights: [40, 55, 35], active: false },
                    // Active column (JUL)
                    { heights: [70, 60, 55, 45], active: true, name: "Alex Burg", messages: "30k", calls: "5k" },
                    { heights: [35, 45, 50], active: false },
                    { heights: [50, 30, 40], active: false },
                    { heights: [85, 45, 30], active: false },
                    { heights: [60, 35, 25], active: false },
                  ].map((col, idx) => (
                    <div key={idx} className="flex flex-col items-center justify-end h-full gap-1.5 relative group">
                      {/* Floating Tooltip Card for Active Column (Exact match to reference) */}
                      {col.active && (
                        <div className="absolute -top-12 bg-white rounded-2xl border border-[#ECEAE3] p-2.5 shadow-lg z-20 whitespace-nowrap text-left animate-bounce duration-1000">
                          <div className="flex items-center gap-1.5">
                            <div className="w-4 h-4 rounded-full bg-[#141414] text-[#D4AF37] text-[8px] flex items-center justify-center font-bold">
                              AB
                            </div>
                            <span className="text-[11px] font-bold text-[#141414]">{col.name}</span>
                          </div>
                          <div className="text-[10px] text-[#6B6861] mt-0.5 space-y-0.5 font-mono">
                            <div>• Mensajes: <strong className="text-[#141414]">{col.messages}</strong></div>
                            <div>• Llamadas: <strong className="text-[#141414]">{col.calls}</strong></div>
                          </div>
                        </div>
                      )}

                      {/* Stacked Pill Blocks */}
                      {col.heights.map((h, hIdx) => {
                        const isSolid = col.active && hIdx === 0;

                        return (
                          <div
                            key={hIdx}
                            style={{ height: `${h}px` }}
                            className={`w-10 rounded-2xl transition-all cursor-pointer ${
                              isSolid
                                ? "btn-black-gold shadow-md"
                                : col.active
                                ? "bg-[#141414] opacity-90 border border-[#D4AF37]/30"
                                : "bg-[#E6E4DD] hover:bg-[#D9D6CC] border border-[#DDD9CE]"
                            }`}
                          />
                        );
                      })}

                      {col.active && (
                        <span className="text-[9px] font-bold text-[#141414] font-mono mt-1">Sohan</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ================= RIGHT COLUMN (4 cols) ================= */}
        <div className="lg:col-span-4 space-y-6">
          {/* Card 1: All Departments / Live Activity Feed (Exact match) */}
          <div className="bg-white rounded-3xl border border-[#ECEAE3] p-5 shadow-xs space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-[#F4F3EE]">
              <button className="flex items-center gap-1.5 text-xs font-bold text-[#141414] hover:text-black">
                <ChevronDown className="w-3.5 h-3.5 text-[#8C887E]" />
                <span>Todos los Departamentos</span>
              </button>
              <button className="flex items-center gap-1 text-[11px] font-medium text-[#6B6861] hover:text-[#141414]">
                <FileText className="w-3 h-3 text-[#8C887E]" />
                <span>Exportar</span>
              </button>
            </div>

            {/* Notification Cards Feed */}
            <div className="space-y-2.5">
              {/* Item 1 */}
              <div className="p-3 rounded-2xl bg-[#FAF9F5] border border-[#ECEAE3] hover:border-[#DDD9CE] transition-all flex items-start justify-between gap-2">
                <div className="flex items-start gap-2.5">
                  <div className="w-6 h-6 rounded-lg bg-[#FAF0D7] border border-[#F2E5C4] flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Sparkles className="w-3.5 h-3.5 text-[#9A7320]" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-[#141414]">PRO mode activado</div>
                    <div className="text-[10px] text-[#6B6861] mt-0.5 leading-snug">
                      Módulo de IA y scoring en tiempo real conectado.
                    </div>
                  </div>
                </div>
                <ArrowUpRight className="w-3.5 h-3.5 text-[#8C887E] flex-shrink-0" />
              </div>

              {/* Item 2 (Active Highlighted Card in Reference Image!) */}
              <div className="p-3.5 rounded-2xl bg-white border-2 border-[#141414] shadow-sm flex items-start justify-between gap-2 relative">
                <div className="flex items-start gap-2.5">
                  <div className="w-6 h-6 rounded-lg bg-[#141414] text-[#E5C158] flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Users className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-[#141414]">Nuevo prospecto añadido</div>
                    <div className="text-[10px] text-[#6B6861] mt-0.5 leading-snug">
                      Alex Johnson ingresó al pipeline comercial (Scoring 94/100).
                    </div>
                  </div>
                </div>
                <ArrowUpRight className="w-3.5 h-3.5 text-[#141414] flex-shrink-0 font-bold" />
              </div>

              {/* Item 3 */}
              <div className="p-3 rounded-2xl bg-[#FAF9F5] border border-[#ECEAE3] hover:border-[#DDD9CE] transition-all flex items-start justify-between gap-2">
                <div className="flex items-start gap-2.5">
                  <div className="w-6 h-6 rounded-lg bg-[#FEE2E2] border border-[#FECACA] flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Clock className="w-3.5 h-3.5 text-red-600" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-[#141414]">Vencimiento de fase próximo</div>
                    <div className="text-[10px] text-[#6B6861] mt-0.5 leading-snug">
                      Revisión inicial con Grupo Retail vence en 2 días.
                    </div>
                  </div>
                </div>
                <ArrowUpRight className="w-3.5 h-3.5 text-[#8C887E] flex-shrink-0" />
              </div>

              {/* Item 4 */}
              <div className="p-3 rounded-2xl bg-[#FAF9F5] border border-[#ECEAE3] hover:border-[#DDD9CE] transition-all flex items-start justify-between gap-2">
                <div className="flex items-start gap-2.5">
                  <div className="w-6 h-6 rounded-lg bg-[#DCFCE7] border border-[#BBF7D0] flex items-center justify-center flex-shrink-0 mt-0.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-[#141414]">Optimización Meta Ads OK</div>
                    <div className="text-[10px] text-[#6B6861] mt-0.5 leading-snug">
                      Presupuesto redistribuido hacia creativos ganadores.
                    </div>
                  </div>
                </div>
                <ArrowUpRight className="w-3.5 h-3.5 text-[#8C887E] flex-shrink-0" />
              </div>
            </div>

            {/* Bottom Actions (Exact match: Black-Gold button + Notes link) */}
            <div className="pt-2 flex items-center justify-between gap-3">
              <button className="btn-black-gold rounded-2xl py-2 px-3 text-xs font-semibold flex-1 text-center">
                Ver todas las notificaciones
              </button>
              <button className="text-xs font-medium text-[#6B6861] hover:text-[#141414] px-2 py-1">
                Notas
              </button>
            </div>
          </div>

          {/* Card 2: Sections / Pipeline Stages Checklist (Exact match) */}
          <div className="bg-white rounded-3xl border border-[#ECEAE3] p-5 shadow-xs space-y-4">
            <h2 className="text-base font-bold text-[#141414]">Secciones del Pipeline</h2>

            <div className="divide-y divide-[#F4F3EE]">
              {[
                { title: "Calificación Rápida", desc: "3m . 3 Preguntas" },
                { title: "Auditoría Meta Ads", desc: "5m . 6 Preguntas" },
                { title: "Revisión de Portafolio", desc: "3m . 5 Preguntas" },
                { title: "Validación de Presupuesto", desc: "3m . 3 Preguntas" },
                { title: "Evaluación de Habilidades & Cierre", desc: "4m . 4 Preguntas" },
              ].map((sec, idx) => (
                <div
                  key={idx}
                  className="py-2.5 px-2 flex items-center justify-between hover:bg-[#FAF9F5] rounded-xl transition-colors group cursor-grab"
                >
                  <div>
                    <div className="text-xs font-bold text-[#141414]">{sec.title}</div>
                    <div className="text-[10px] text-[#8C887E] mt-0.5">{sec.desc}</div>
                  </div>
                  <GripVertical className="w-4 h-4 text-[#8C887E] group-hover:text-[#141414]" />
                </div>
              ))}
            </div>

            {/* Bottom Action (Exact match: Black-Gold button "+ Add Section") */}
            <div className="pt-2">
              <Link
                href="/crm/pipeline"
                className="btn-black-gold rounded-2xl py-2.5 px-3 text-xs font-semibold w-full flex items-center justify-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5 text-[#E5C158]" />
                <span>+ Agregar Sección</span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
