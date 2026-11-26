/**
 * Estandarte de las elecciones en versión plana y minimalista,
 * con los colores de la web: rojo sello, dorado y papel.
 */
const RED = "#8f141a";
const GOLD = "var(--gold)";
const CREAM = "var(--paper)";
const SERIF = "var(--font-serif4), serif";
const SANS = "var(--font-franklin), sans-serif";

export function Banner({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 200 300"
      className={className}
      role="img"
      aria-label="Estandarte: Elecciones a la Presidencia de AMEBA CITY"
    >
      {/* Cordón y barra */}
      <path d="M40,18 L100,3 L160,18" fill="none" stroke={GOLD} strokeWidth="1.6" />
      <circle cx="100" cy="3.5" r="2.4" fill={GOLD} />
      <rect x="18" y="16" width="164" height="5" rx="2.5" fill={GOLD} />
      <circle cx="16" cy="18.5" r="4.5" fill={GOLD} />
      <circle cx="184" cy="18.5" r="4.5" fill={GOLD} />

      {/* Flecos: trazo discontinuo justo por fuera del pico */}
      <path
        d="M30,233 L100,289 L170,233"
        fill="none"
        stroke={GOLD}
        strokeWidth="7"
        strokeDasharray="1.2 2.4"
        opacity="0.9"
      />

      {/* Paño */}
      <path d="M30,21 H170 V230 L100,285 L30,230 Z" fill={RED} />
      {/* Ribete interior */}
      <path d="M38,29 H162 V226 L100,275 L38,226 Z" fill="none" stroke={GOLD} strokeWidth="1.3" />

      {/* Corona */}
      <g fill={GOLD} transform="translate(100 47)">
        <path d="M-11,6 L-13,-6 L-6,0 L0,-9 L6,0 L13,-6 L11,6 Z" />
        <rect x="-11" y="7" width="22" height="3" rx="1" />
        <circle cx="-13" cy="-7" r="1.6" />
        <circle cx="0" cy="-10.5" r="1.8" />
        <circle cx="13" cy="-7" r="1.6" />
      </g>

      <text
        x="100"
        y="75"
        textAnchor="middle"
        fill={GOLD}
        fontFamily={SANS}
        fontWeight="800"
        fontSize="10"
        letterSpacing="3"
      >
        AMEBA CITY
      </text>
      <Divider y={85} />

      <text
        x="100"
        y="117"
        textAnchor="middle"
        fill={CREAM}
        fontFamily={SERIF}
        fontWeight="800"
        fontSize="22"
        textLength="110"
        lengthAdjust="spacingAndGlyphs"
      >
        ELECCIONES
      </text>
      <text
        x="100"
        y="136"
        textAnchor="middle"
        fill={GOLD}
        fontFamily={SANS}
        fontWeight="700"
        fontSize="8.5"
        letterSpacing="2.2"
      >
        A LA PRESIDENCIA
      </text>
      <Divider y={148} />

      {/* Urna con papeleta */}
      <g transform="translate(100 190)">
        <g transform="rotate(-8)">
          <rect x="-8" y="-27" width="16" height="20" rx="1" fill={CREAM} />
          <path d="M-4,-17 L-1,-14 L4,-21" fill="none" stroke={RED} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </g>
        <rect x="-18" y="-8" width="36" height="3.5" rx="1" fill={GOLD} />
        <rect x="-15" y="-4.5" width="30" height="22" rx="1.5" fill={GOLD} />
        <rect x="-7" y="-7.2" width="14" height="1.6" rx="0.8" fill={RED} />
      </g>
      <Laurel x={66} y={212} />
      <Laurel x={134} y={212} flip />

      {/* Remate del pico */}
      <path d="M100,252 l4,6 l-4,6 l-4,-6 Z" fill={GOLD} />
    </svg>
  );
}

function Divider({ y }: { y: number }) {
  return (
    <g fill={GOLD}>
      <rect x="58" y={y - 0.5} width="34" height="1" />
      <rect x="108" y={y - 0.5} width="34" height="1" />
      <path d={`M100,${y - 3.5} l3.5,3.5 l-3.5,3.5 l-3.5,-3.5 Z`} />
    </g>
  );
}

/** Rama de laurel: tallo curvo con hojas alternas. */
function Laurel({ x, y, flip = false }: { x: number; y: number; flip?: boolean }) {
  const leaves = [
    { cx: -3, cy: -6, r: -35 },
    { cx: 3, cy: -12, r: 35 },
    { cx: -2, cy: -19, r: -30 },
    { cx: 4, cy: -25, r: 40 },
    { cx: 0, cy: -32, r: -20 },
    { cx: 6, cy: -37, r: 50 },
  ];
  return (
    <g transform={`translate(${x} ${y}) scale(${flip ? -1 : 1} 1)`} fill={GOLD}>
      <path d="M0,0 C-2,-14 0,-28 8,-40" fill="none" stroke={GOLD} strokeWidth="1.2" />
      {leaves.map((l, i) => (
        <ellipse key={i} cx={l.cx} cy={l.cy} rx="2.2" ry="4.6" transform={`rotate(${l.r} ${l.cx} ${l.cy})`} />
      ))}
    </g>
  );
}
