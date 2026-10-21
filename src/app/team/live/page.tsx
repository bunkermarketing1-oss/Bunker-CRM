import React from "react";
import UnderConstruction from "@/components/ui/UnderConstruction";

export default function TeamLivePage() {
  return (
    <UnderConstruction
      section="Mensajería & Automatización"
      title="Asesores en vivo"
      description="Supervisión en tiempo real de asesores comerciales y monitoreo de llamadas activas."
      upcomingFeatures={[
        "Tablero de presencia y estado en vivo de los asesores (disponible, en llamada, ausente).",
        "Escucha en vivo y susurro (whisper) a asesores durante llamadas de venta.",
        "Métricas de tiempo en llamada, llamadas atendidas y tasa de conversión diaria.",
        "Alertas en vivo cuando un prospecto prioritario entra en llamada.",
      ]}
    />
  );
}
