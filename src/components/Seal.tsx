/** Sello circular de la "Junta Electoral de AMEBA CITY". Puramente decorativo. */
export function Seal({ size = 84, className = "" }: { size?: number; className?: string }) {
  return (
    <svg
      viewBox="0 0 120 120"
      width={size}
      height={size}
      className={className}
      aria-hidden="true"
    >
      <defs>
        <path id="seal-ring" d="M60,60 m-44,0 a44,44 0 1,1 88,0 a44,44 0 1,1 -88,0" />
      </defs>
      <g fill="none" stroke="currentColor">
        <circle cx="60" cy="60" r="56" strokeWidth="3" />
        <circle cx="60" cy="60" r="51" strokeWidth="1" />
        <circle cx="60" cy="60" r="33" strokeWidth="1.5" />
      </g>
      <text fill="currentColor" fontSize="10.5" fontWeight="700" letterSpacing="2.2" fontFamily="var(--font-franklin), sans-serif">
        <textPath href="#seal-ring">JUNTA ELECTORAL · AMEBA CITY · </textPath>
      </text>
      {/* Urna estilizada en el centro */}
      <g fill="currentColor">
        <rect x="44" y="58" width="32" height="20" rx="2" />
        <rect x="51" y="55" width="18" height="3" rx="1" />
        <rect x="55" y="40" width="10" height="16" rx="1" transform="rotate(8 60 48)" fillOpacity="0.85" />
      </g>
      <text x="60" y="88" textAnchor="middle" fill="currentColor" fontSize="7" fontWeight="700" letterSpacing="1.5" fontFamily="var(--font-franklin), sans-serif">
        2026
      </text>
    </svg>
  );
}
