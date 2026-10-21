import React from "react";
import UnderConstruction from "@/components/ui/UnderConstruction";

export default function SmsMessagingPage() {
  return (
    <UnderConstruction
      section="Mensajería & Automatización"
      title="Mensajería SMS"
      description="Campañas de mensajería masiva y comunicación bidireccional por SMS con prospectos."
      upcomingFeatures={[
        "Envío masivo y programado de recordatorios y confirmaciones por SMS.",
        "Bandeja de entrada y chat bidireccional en tiempo real con clientes.",
        "Plantillas pre-aprobadas con variables dinámicas de personalización.",
        "Historial y métricas de entrega, apertura y clics de enlaces.",
      ]}
    />
  );
}
