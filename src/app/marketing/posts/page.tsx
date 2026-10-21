import React from "react";
import UnderConstruction from "@/components/ui/UnderConstruction";

export default function PostsPage() {
  return (
    <UnderConstruction
      section="Marketing"
      title="Publicaciones Sociales"
      description="Creación, programación y publicación multicanal en redes sociales."
      upcomingFeatures={[
        "Publicación y programación simultánea en Instagram, Facebook y TikTok.",
        "Generador de copies con inteligencia artificial adaptado a la voz de la marca.",
        "Previsualización exacta del feed y carruseles en tiempo real antes de publicar.",
        "Flujo de trabajo con aprobaciones por cliente y calendario de estados.",
      ]}
    />
  );
}
