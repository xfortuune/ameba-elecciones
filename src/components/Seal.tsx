import { useId } from "react";

/**
 * Sello circular de la "Junta Electoral de AMEBA CITY". Decorativo.
 * Texto superior e inferior centrados en el anillo, estrellas a los lados
 * y una urna en el centro.
 */
export function Seal({ size = 84, className = "" }: { size?: number; className?: string }) {
  const id = useId().replace(/:/g, "");
  const top = `seal-top-${id}`;
  const bottom = `seal-bottom-${id}`;
  const font = "var(--font-franklin), sans-serif";

  return (
    <svg viewBox="0 0 120 120" width={size} height={size} className={className} aria-hidden="true">
      <defs>
        {/* Arco superior, de izquierda a derecha por arriba: las letras miran hacia fuera */}
        <path id={top} d="M 20.5,60 A 39.5,39.5 0 0,1 99.5,60" />
        {/* Arco inferior, de izquierda a derecha por abajo: las letras quedan derechas */}
        <path id={bottom} d="M 12,60 A 48,48 0 0,0 108,60" />
      </defs>

      <g fill="none" stroke="currentColor">
        <circle cx="60" cy="60" r="57" strokeWidth="3" />
        <circle cx="60" cy="60" r="52.5" strokeWidth="1" />
        <circle cx="60" cy="60" r="31" strokeWidth="1.5" />
      </g>

      <g fill="currentColor" fontFamily={font} fontWeight="800">
        <text fontSize="8.6" letterSpacing="0.9">
          <textPath href={`#${top}`} startOffset="50%" textAnchor="middle">
            JUNTA ELECTORAL
          </textPath>
        </text>
        <text fontSize="9.5" letterSpacing="2.2">
          <textPath href={`#${bottom}`} startOffset="50%" textAnchor="middle">
            AMEBA CITY
          </textPath>
        </text>
      </g>

      {/* Estrellas separadoras a izquierda y derecha */}
      <g fill="currentColor">
        <Star cx={16} cy={60} r={3.4} />
        <Star cx={104} cy={60} r={3.4} />
      </g>

      {/* Urna centrada */}
      <g fill="currentColor">
        <rect x="54" y="39" width="12" height="15" rx="1" transform="rotate(8 60 46.5)" fillOpacity="0.85" />
        <rect x="48.5" y="53" width="23" height="2.6" rx="1" />
        <rect x="46" y="55.5" width="28" height="15" rx="2" />
      </g>
      <text
        x="60"
        y="80.5"
        textAnchor="middle"
        fill="currentColor"
        fontFamily={font}
        fontSize="7"
        fontWeight="800"
        letterSpacing="1.5"
      >
        2026
      </text>
    </svg>
  );
}

function Star({ cx, cy, r }: { cx: number; cy: number; r: number }) {
  const points = Array.from({ length: 10 }, (_, i) => {
    const angle = (Math.PI / 5) * i - Math.PI / 2;
    const radius = i % 2 === 0 ? r : r * 0.45;
    return `${(cx + radius * Math.cos(angle)).toFixed(2)},${(cy + radius * Math.sin(angle)).toFixed(2)}`;
  }).join(" ");
  return <polygon points={points} />;
}
