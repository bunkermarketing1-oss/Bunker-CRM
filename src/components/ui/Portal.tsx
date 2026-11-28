"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

/**
 * Dibuja a sus hijos directamente en <body>. Una ventana con `position: fixed` dentro de un contenedor con
 * animación o transform se queda "presa" en ese contenedor (no cubre el menú ni la barra superior y se corta
 * arriba); sacarla al <body> hace que ocupe de verdad toda la pantalla.
 */
export function Portal({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return mounted ? createPortal(children, document.body) : null;
}
