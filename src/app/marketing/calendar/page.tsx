import React from "react";
import UnderConstruction from "@/components/ui/UnderConstruction";

export default function EditorialCalendarPage() {
  return (
    <UnderConstruction
      section="Marketing"
      title="Calendario Editorial"
      description="Cronograma mensual de publicaciones y pautas para clientes de la agencia."
      upcomingFeatures={[
        "Vista de parrilla mensual, semanal y diaria de contenidos planificados.",
        "Filtro rápido por cliente asignado, canal social y estado de aprobación.",
        "Arrastrar y soltar (drag & drop) para reprogramar publicaciones rápidamente.",
        "Sincronización directa con las campañas pagadas activas.",
      ]}
    />
  );
}
