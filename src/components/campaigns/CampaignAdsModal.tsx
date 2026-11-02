"use client";

import React, { useEffect, useState } from "react";
import {
  X,
  Play,
  Image as ImageIcon,
  ExternalLink,
  DollarSign,
  Eye,
  MousePointer,
  Users,
  AlertCircle,
  RefreshCw,
  Sparkles,
} from "lucide-react";
import { CampaignAdCreative, CampaignAdsResponse } from "@/types/campaigns";
import SocialNetworkIcon from "@/components/common/SocialNetworkIcon";

interface CampaignAdsModalProps {
  campaignId: string | null;
  campaignName: string;
  platform?: string;
  accountName?: string | null;
  onClose: () => void;
}

function fmtMoney(n: number) {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(n);
}

function fmtNumber(n: number) {
  return new Intl.NumberFormat("es-CO", { maximumFractionDigits: 0 }).format(n);
}

export default function CampaignAdsModal({
  campaignId,
  campaignName,
  platform = "meta_ads",
  accountName,
  onClose,
}: CampaignAdsModalProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [ads, setAds] = useState<CampaignAdCreative[]>([]);
  const [expandedBodies, setExpandedBodies] = useState<Record<string, boolean>>({});
  const [playingAdId, setPlayingAdId] = useState<string | null>(null);

  useEffect(() => {
    if (!campaignId) return;

    let isMounted = true;
    setLoading(true);
    setError(null);

    fetch(`/api/campaigns/${campaignId}/ads`)
      .then((res) => res.json())
      .then((json: CampaignAdsResponse) => {
        if (!isMounted) return;
        if (json.success && json.ads) {
          setAds(json.ads);
        } else {
          setError(json.error || "No fue posible cargar los anuncios.");
        }
      })
      .catch((err) => {
        if (!isMounted) return;
        setError(err instanceof Error ? err.message : "Error de conexión con el servidor.");
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [campaignId]);

  // Listener para cerrar con tecla Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  if (!campaignId) return null;

  const toggleExpand = (id: string) => {
    setExpandedBodies((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-5xl max-h-[92vh] bg-white rounded-3xl border border-[#EAECF0] shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200"
        role="dialog"
        aria-modal="true"
        aria-label="Detalle de Anuncios y Creativos"
      >
        {/* Header Modal */}
        <div className="flex items-start justify-between gap-4 p-5 sm:p-6 border-b border-[#EAECF0] bg-gradient-to-r from-[#F8F9FA] to-white">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <SocialNetworkIcon provider={platform} size="sm" className="shrink-0" />
              <span className="text-[11px] font-semibold tracking-wider uppercase text-[#667085]">
                {accountName ? `${accountName} · ` : ""}Creativos de Campaña
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-[#101828] tracking-tight">
              {campaignName}
            </h2>
            <p className="text-xs text-[#475467]">
              Visualiza en tiempo real los anuncios, imágenes, videos y textos persuasivos configurados en Meta.
            </p>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-[#667085] hover:text-[#101828] hover:bg-[#EAECF0] transition-colors"
            aria-label="Cerrar modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6 bg-[#F8F9FA]/40">
          {loading && (
            <div className="py-16 flex flex-col items-center justify-center space-y-3 text-[#667085]">
              <RefreshCw className="w-8 h-8 animate-spin text-amber-500" />
              <p className="text-sm font-medium text-[#101828]">
                Consultando creativos y anuncios en Meta Marketing API...
              </p>
              <p className="text-xs text-[#667085]">
                Descargando recursos multimedia, textos y métricas individuales.
              </p>
            </div>
          )}

          {error && !loading && (
            <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div className="text-xs space-y-1">
                <p className="font-semibold">No se pudieron obtener los anuncios de Meta</p>
                <p className="text-amber-800/90">{error}</p>
              </div>
            </div>
          )}

          {!loading && !error && ads.length === 0 && (
            <div className="py-16 text-center space-y-3 bg-white rounded-2xl border border-[#EAECF0] p-8">
              <Sparkles className="w-8 h-8 text-amber-500 mx-auto opacity-70" />
              <h3 className="text-base font-semibold text-[#101828]">
                No hay anuncios registrados para esta campaña
              </h3>
              <p className="text-xs text-[#475467] max-w-md mx-auto">
                Es posible que la campaña aún no contenga conjuntos de anuncios con creativos activos o que estén en proceso de aprobación por Meta.
              </p>
            </div>
          )}

          {!loading && !error && ads.length > 0 && (
            <>
              <div className="flex items-center justify-between text-xs text-[#667085]">
                <span>
                  Mostrando <strong>{ads.length}</strong> anuncio(s) detectado(s) en esta campaña
                </span>
                <span className="hidden sm:inline">
                  Haz clic en el enlace para abrir el destino del anuncio
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {ads.map((ad) => {
                  const isExpanded = Boolean(expandedBodies[ad.id]);
                  const hasLongBody = ad.body.length > 180;
                  const displayBody =
                    hasLongBody && !isExpanded
                      ? `${ad.body.slice(0, 180)}...`
                      : ad.body;

                  const isActive = ad.status === "active";

                  return (
                    <div
                      key={ad.id}
                      className="bg-white rounded-2xl border border-[#EAECF0] shadow-sm hover:shadow-md transition-shadow flex flex-col overflow-hidden"
                    >
                      {/* Top bar of ad */}
                      <div className="p-4 border-b border-[#F0EFEA] flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <h4 className="text-xs font-semibold text-[#101828] truncate" title={ad.name}>
                            {ad.name}
                          </h4>
                          <span className="text-[10px] text-[#667085] font-mono">
                            ID: {ad.id}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <span
                            className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${
                              isActive
                                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                : "bg-zinc-100 text-zinc-600 border-zinc-200"
                            }`}
                          >
                            {isActive ? "Activo" : ad.status.toUpperCase()}
                          </span>
                          {ad.isVideo ? (
                            <button
                              type="button"
                              onClick={() => setPlayingAdId(playingAdId === ad.id ? null : ad.id)}
                              className={`flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border transition-colors cursor-pointer ${
                                playingAdId === ad.id
                                  ? "bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100"
                                  : "bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100"
                              }`}
                              title={playingAdId === ad.id ? "Detener reproducción" : "Reproducir video"}
                            >
                              {playingAdId === ad.id ? (
                                <>
                                  <X className="w-2.5 h-2.5" />
                                  Detener
                                </>
                              ) : (
                                <>
                                  <Play className="w-2.5 h-2.5 text-amber-600 fill-amber-600" />
                                  Reproducir Video
                                </>
                              )}
                            </button>
                          ) : (
                            <span className="flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#F8F9FA] text-[#475467] border border-[#EAECF0]">
                              <ImageIcon className="w-2.5 h-2.5 text-amber-600" />
                              Imagen
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Visual Media Showcase */}
                      <div className="relative aspect-video bg-[#101828] flex items-center justify-center overflow-hidden group">
                        {ad.isVideo && playingAdId === ad.id ? (
                          <div className="relative w-full h-full bg-black flex items-center justify-center">
                            {ad.videoUrl ? (
                              <video
                                src={ad.videoUrl}
                                controls
                                autoPlay
                                playsInline
                                className="w-full h-full object-contain"
                              />
                            ) : ad.videoEmbedUrl ? (
                              <iframe
                                src={ad.videoEmbedUrl}
                                allow="autoplay; clipboard-write; encrypted-media; picture-in-picture; fullscreen"
                                allowFullScreen
                                className="w-full h-full border-0"
                                title={`Reproductor de video: ${ad.name}`}
                              />
                            ) : (
                              <div className="text-center text-zinc-400 text-xs p-4 space-y-2">
                                <p>No se pudo cargar la fuente del video.</p>
                                <button
                                  type="button"
                                  onClick={() => setPlayingAdId(null)}
                                  className="px-2.5 py-1 rounded bg-zinc-800 text-white text-[11px] hover:bg-zinc-700 cursor-pointer"
                                >
                                  Cerrar
                                </button>
                              </div>
                            )}

                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setPlayingAdId(null);
                              }}
                              className="absolute top-2 right-2 p-1.5 rounded-full bg-black/75 hover:bg-black text-white transition-colors z-20 cursor-pointer shadow-md"
                              title="Cerrar video"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        ) : (
                          <>
                            {ad.thumbnailUrl || ad.imageUrl ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={ad.thumbnailUrl || ad.imageUrl || ""}
                                alt={ad.headline || ad.name}
                                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                                loading="lazy"
                              />
                            ) : (
                              <div className="flex flex-col items-center gap-1.5 text-zinc-500 text-xs">
                                <ImageIcon className="w-8 h-8 opacity-40" />
                                <span>Sin vista previa multimedia disponible</span>
                              </div>
                            )}

                            {ad.isVideo && (
                              <button
                                type="button"
                                onClick={() => setPlayingAdId(ad.id)}
                                className="absolute inset-0 bg-black/35 hover:bg-black/50 transition-colors flex items-center justify-center cursor-pointer group/btn"
                                aria-label="Reproducir video de este anuncio"
                              >
                                <div className="w-14 h-14 rounded-full bg-white/95 text-[#101828] shadow-2xl flex items-center justify-center transition-all group-hover/btn:scale-115 group-hover/btn:bg-amber-400 ring-4 ring-black/20">
                                  <Play className="w-6 h-6 ml-0.5 fill-[#101828]" />
                                </div>
                                <span className="absolute bottom-3 px-3 py-1 rounded-full bg-black/70 backdrop-blur-xs text-white text-[11px] font-semibold tracking-wide flex items-center gap-1.5 group-hover/btn:bg-amber-500 transition-colors shadow-sm">
                                  <Play className="w-3 h-3 fill-current" />
                                  Haz clic para reproducir
                                </span>
                              </button>
                            )}
                          </>
                        )}
                      </div>

                      {/* Headline & Body Copy */}
                      <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                        <div className="space-y-2">
                          {ad.headline && (
                            <h3 className="text-sm font-bold text-[#101828] leading-snug">
                              {ad.headline}
                            </h3>
                          )}

                          {ad.body && (
                            <div className="text-xs text-[#475467] whitespace-pre-line leading-relaxed">
                              {displayBody}
                              {hasLongBody && (
                                <button
                                  type="button"
                                  onClick={() => toggleExpand(ad.id)}
                                  className="ml-1 text-amber-600 font-semibold hover:underline"
                                >
                                  {isExpanded ? "Ver menos" : "Ver más"}
                                </button>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Call To Action Button (Simulating Meta ad CTA) */}
                        <div className="pt-2 flex items-center justify-between gap-3 border-t border-[#F0EFEA]">
                          {ad.callToAction ? (
                            <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#F8F9FA] border border-[#EAECF0] text-xs font-semibold text-[#101828]">
                              {ad.callToAction.replace(/_/g, " ")}
                            </span>
                          ) : (
                            <span className="text-[11px] text-[#667085] italic">Sin botón CTA</span>
                          )}

                          {ad.linkUrl && (
                            <a
                              href={ad.linkUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-600 hover:text-amber-700 hover:underline"
                            >
                              <span>Visitar enlace</span>
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          )}
                        </div>
                      </div>

                      {/* Performance Mini KPIs */}
                      <div className="bg-[#F8F9FA] border-t border-[#EAECF0] p-3 px-4 grid grid-cols-4 gap-2 text-center text-[10px]">
                        <div>
                          <div className="text-[#667085] flex items-center justify-center gap-0.5">
                            <DollarSign className="w-3 h-3 text-amber-500" /> Gasto
                          </div>
                          <div className="font-semibold text-[#101828] mt-0.5">
                            {fmtMoney(ad.spend)}
                          </div>
                        </div>
                        <div>
                          <div className="text-[#667085] flex items-center justify-center gap-0.5">
                            <Eye className="w-3 h-3 text-blue-500" /> Impr.
                          </div>
                          <div className="font-semibold text-[#101828] mt-0.5">
                            {fmtNumber(ad.impressions)}
                          </div>
                        </div>
                        <div>
                          <div className="text-[#667085] flex items-center justify-center gap-0.5">
                            <MousePointer className="w-3 h-3 text-emerald-500" /> Clics
                          </div>
                          <div className="font-semibold text-[#101828] mt-0.5">
                            {fmtNumber(ad.clicks)}
                          </div>
                        </div>
                        <div>
                          <div className="text-[#667085] flex items-center justify-center gap-0.5">
                            <Users className="w-3 h-3 text-amber-600" /> Leads
                          </div>
                          <div className="font-semibold text-[#101828] mt-0.5">
                            {fmtNumber(ad.leads)}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 px-6 border-t border-[#EAECF0] bg-white flex items-center justify-between">
          <span className="text-xs text-[#667085]">
            Datos sincronizados directamente desde Meta Marketing API.
          </span>
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl btn-black-gold text-xs font-semibold"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
