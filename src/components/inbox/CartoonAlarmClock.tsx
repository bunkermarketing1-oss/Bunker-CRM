/** Reloj despertador de caricatura. Las animaciones (salto, sacudida, manecillas) viven en globals.css (`cc-*`). */
export function CartoonAlarmClock({ size = 64 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true">
      <ellipse className="cc-shadow" cx="32" cy="60" rx="15" ry="3" fill="#0f172a" />

      <g className="cc-body">
        {/* Patitas */}
        <path d="M22 54 L18 60 M42 54 L46 60" stroke="#7f1d1d" strokeWidth="3" strokeLinecap="round" />

        {/* Campanas y martillo: se sacuden */}
        <g className="cc-bells">
          <path d="M12 20 a10 10 0 0 1 14 -8 Z" fill="#fbbf24" stroke="#92400e" strokeWidth="2" strokeLinejoin="round" />
          <path d="M52 20 a10 10 0 0 0 -14 -8 Z" fill="#fbbf24" stroke="#92400e" strokeWidth="2" strokeLinejoin="round" />
          <path d="M32 9 v5 M28 9 h8" stroke="#92400e" strokeWidth="2.5" strokeLinecap="round" />
        </g>

        {/* Cuerpo y carátula */}
        <circle cx="32" cy="36" r="19" fill="#ef4444" stroke="#7f1d1d" strokeWidth="2.5" />
        <circle cx="32" cy="36" r="14.5" fill="#fffbeb" stroke="#fecaca" strokeWidth="1.5" />
        <path d="M32 23.5 v3 M32 45.5 v3 M19.5 36 h3 M41.5 36 h3" stroke="#92400e" strokeWidth="1.8" strokeLinecap="round" />

        {/* Manecillas */}
        <g className="cc-hour">
          <path d="M32 36 L32 29.5" stroke="#1f2937" strokeWidth="2.6" strokeLinecap="round" />
        </g>
        <g className="cc-minute">
          <path d="M32 36 L32 25.5" stroke="#dc2626" strokeWidth="2" strokeLinecap="round" />
        </g>
        <circle cx="32" cy="36" r="2" fill="#1f2937" />

        {/* Rayitas de "está sonando" a los lados */}
        <g className="cc-ring-lines" stroke="#b45309" strokeWidth="2" strokeLinecap="round" fill="none">
          <path d="M6 28 q-3 4 0 8 M3 25 q-5 7 0 14" />
          <path d="M58 28 q3 4 0 8 M61 25 q5 7 0 14" />
        </g>
      </g>
    </svg>
  );
}
