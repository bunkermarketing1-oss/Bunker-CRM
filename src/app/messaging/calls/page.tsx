import React from "react";
import UnderConstruction from "@/components/ui/UnderConstruction";

export default function CallsPage() {
  return (
    <UnderConstruction
      section="Mensajería & Automatización"
      title="Llamadas & Líneas"
      description="Central telefónica en la nube, marcación directa vía WebRTC y grabación de llamadas."
      upcomingFeatures={[
        "Marcador telefónico integrado en el navegador para asesores comerciales.",
        "Grabación y transcripción automática de llamadas con inteligencia artificial.",
        "Asignación de números virtuales y líneas de entrada/salida por cliente.",
        "Historial completo de llamadas conectado automáticamente con el CRM.",
      ]}
    />
  );
}
