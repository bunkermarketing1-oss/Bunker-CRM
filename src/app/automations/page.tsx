import React from "react";
import UnderConstruction from "@/components/ui/UnderConstruction";

export default function AutomationsPage() {
  return (
    <UnderConstruction
      section="Mensajería & Automatización"
      title="Automatizaciones & Flujos"
      description="Disparadores y secuencias automáticas de tareas, SMS y cambios de etapa en el pipeline."
      upcomingFeatures={[
        "Constructor visual de flujos de trabajo (triggers y acciones condicionadas).",
        "Asignación automática inteligente de leads según horario y carga de asesores.",
        "Secuencias de seguimiento automático por WhatsApp, SMS y correo.",
        "Reactivación automática de prospectos estancados en el embudo comercial.",
      ]}
    />
  );
}
