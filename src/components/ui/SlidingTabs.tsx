"use client";

import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";

export interface SlidingTabOption<T extends string> {
  value: T;
  label: string;
  count?: number;
  /** Clase de color del punto indicador del canal (ej. "bg-emerald-500"). */
  dotClassName?: string;
}

interface SlidingTabsProps<T extends string> {
  options: SlidingTabOption<T>[];
  value: T;
  onChange: (value: T) => void;
  ariaLabel: string;
  className?: string;
}

interface IndicatorBox {
  left: number;
  top: number;
  width: number;
  height: number;
}

// Curva estándar de iOS: arranque rápido y frenado suave, para que la pastilla "se acomode".
const IOS_EASING = "cubic-bezier(0.32, 0.72, 0, 1)";
const SLIDE_DURATION_MS = 420;

/**
 * Pestañas con una pastilla de vidrio que se desliza desde la pestaña anterior hasta la
 * elegida, al estilo de los controles segmentados de iPhone. La posición se mide con el DOM
 * (no se calcula con anchos fijos) porque cada pestaña tiene un ancho distinto.
 */
export default function SlidingTabs<T extends string>({
  options,
  value,
  onChange,
  ariaLabel,
  className = "",
}: SlidingTabsProps<T>) {
  const containerRef = useRef<HTMLDivElement>(null);
  const tabRefs = useRef(new Map<T, HTMLButtonElement>());
  const [indicator, setIndicator] = useState<IndicatorBox | null>(null);
  // La primera posición se coloca sin animar; si no, la pastilla cruzaría desde la esquina.
  const [canAnimate, setCanAnimate] = useState(false);

  const measure = useCallback(() => {
    const el = tabRefs.current.get(value);
    if (!el) return;
    const next = { left: el.offsetLeft, top: el.offsetTop, width: el.offsetWidth, height: el.offsetHeight };
    setIndicator((prev) =>
      prev && prev.left === next.left && prev.top === next.top && prev.width === next.width && prev.height === next.height
        ? prev
        : next
    );
  }, [value]);

  useLayoutEffect(() => {
    measure();
  }, [measure, options]);

  useEffect(() => {
    const frame = requestAnimationFrame(() => setCanAnimate(true));
    return () => cancelAnimationFrame(frame);
  }, []);

  // Los contadores cambian el ancho de cada pestaña y la ventana puede redimensionarse.
  useEffect(() => {
    const container = containerRef.current;
    if (!container || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(measure);
    observer.observe(container);
    container.querySelectorAll("button").forEach((button) => observer.observe(button));
    return () => observer.disconnect();
  }, [measure, options.length]);

  return (
    <div
      ref={containerRef}
      role="tablist"
      aria-label={ariaLabel}
      className={`relative flex items-center gap-1 overflow-x-auto ${className}`}
    >
      {indicator && (
        <span
          aria-hidden
          className="absolute left-0 top-0 rounded-lg border border-white/20 bg-gradient-to-b from-[#1E293B]/95 to-[#0F172A]/95 shadow-[0_4px_12px_rgba(15,23,42,0.22),inset_0_1px_0_rgba(255,255,255,0.28)] backdrop-blur-md motion-reduce:!transition-none"
          style={{
            width: indicator.width,
            height: indicator.height,
            transform: `translate(${indicator.left}px, ${indicator.top}px)`,
            transition: canAnimate
              ? `transform ${SLIDE_DURATION_MS}ms ${IOS_EASING}, width ${SLIDE_DURATION_MS}ms ${IOS_EASING}, height ${SLIDE_DURATION_MS}ms ${IOS_EASING}`
              : "none",
          }}
        />
      )}

      {options.map((option) => {
        const isActive = option.value === value;
        return (
          <button
            key={option.value}
            ref={(el) => {
              if (el) tabRefs.current.set(option.value, el);
              else tabRefs.current.delete(option.value);
            }}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(option.value)}
            className={`relative z-10 px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-2 whitespace-nowrap transition-[color,transform] duration-300 active:scale-95 motion-reduce:transition-none ${
              isActive ? "text-white" : "text-[#475467] hover:text-[#101828]"
            }`}
          >
            {option.dotClassName && <div className={`w-2 h-2 rounded-full ${option.dotClassName}`} />}
            <span>{option.label}</span>
            {option.count !== undefined && (
              <span
                className={`text-[10px] font-mono px-1.5 py-0.5 rounded transition-colors duration-300 ${
                  isActive ? "bg-white/20 text-white font-medium" : "bg-[#F2F4F7] text-[#475467]"
                }`}
              >
                {option.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
