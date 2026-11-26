"use client";

import { useEffect, useState, type ReactNode } from "react";
import { Confetti } from "../results/Confetti";

/**
 * Easter eggs: popups que salen a ciertos votantes justo después de meter
 * su PIN, antes de la papeleta. Para añadir uno nuevo, añade una entrada a
 * EASTER_EGGS con el nombre exacto del votante.
 */
type EggProps = {
  onClose: () => void;
  /** Modo creador: activa la papeleta dorada. */
  onGold?: () => void;
  /** Para las estadísticas del modo creador. */
  votedCount?: number;
};

export const EASTER_EGGS: Record<string, (props: EggProps) => ReactNode> = {
  Valentin: CotizaEgg,
  Luis: LuisEgg,
  Ach: AchEgg,
  Kike: KikeEgg,
  Fortune: (p) => <CreatorEgg {...p} name="Fortune" />,
  Bruno: (p) => <CreatorEgg {...p} name="Bruno" />,
};

/** Pinta el easter egg de ese votante como componente (puede tener estado propio). */
export function EasterEgg({ name, ...props }: EggProps & { name: string }) {
  const Egg = EASTER_EGGS[name];
  return Egg ? <Egg {...props} /> : null;
}

// ---------------------------------------------------------------------------
// Base común: fondo oscuro, tarjeta de papel, Escape o clic fuera para cerrar.
// ---------------------------------------------------------------------------
function EggModal({
  onClose,
  labelledBy,
  children,
  dismissible = true,
}: EggProps & { labelledBy: string; children: ReactNode; dismissible?: boolean }) {
  useEffect(() => {
    if (!dismissible) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, dismissible]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={labelledBy}
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/70 px-4 backdrop-blur-sm"
      onClick={dismissible ? onClose : undefined}
    >
      <div
        className="paper animate-pop relative w-full max-w-sm overflow-hidden rounded-sm px-6 pt-8 pb-6 text-center"
        onClick={(e) => e.stopPropagation()}
      >
        <p className="text-[11px] font-bold uppercase tracking-[0.3em] text-ink-soft">Aviso de la Junta Electoral</p>
        {children}
      </div>
    </div>
  );
}

function CloseButton({ onClose, children }: EggProps & { children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClose}
      autoFocus
      className="mt-7 w-full rounded-sm bg-ink px-4 py-3 font-bold uppercase tracking-wider text-paper"
    >
      {children}
    </button>
  );
}

// ---------------------------------------------------------------------------
// Valentin: ¡COTIZA!
// ---------------------------------------------------------------------------
const JOB_APPS = [
  { name: "LinkedIn", href: "https://www.linkedin.com/jobs/", bg: "#0A66C2", label: "in", font: "text-3xl" },
  { name: "InfoJobs", href: "https://www.infojobs.net/", bg: "#167DB7", label: "infojobs", font: "text-[13px]" },
  { name: "Indeed", href: "https://es.indeed.com/", bg: "#2557A7", label: "indeed", font: "text-base" },
];

function CotizaEgg({ onClose }: EggProps) {
  return (
    <EggModal onClose={onClose} labelledBy="egg-title">
      <h2
        id="egg-title"
        className="animate-stamp mx-auto mt-8 mb-4 w-fit rounded border-[4px] border-stamp px-4 py-1.5 font-sans text-4xl font-black tracking-wider text-stamp sm:border-[5px] sm:px-5 sm:py-2 sm:text-5xl"
      >
        ¡COTIZA!
      </h2>
      <p className="mt-6 text-sm text-ink-soft">Valentin, antes de elegir presidente… ¿has echado algún currículum hoy?</p>
      <ul className="mt-5 flex justify-center gap-4">
        {JOB_APPS.map((app, i) => (
          <li key={app.name} className="animate-rise" style={{ animationDelay: `${0.35 + i * 0.15}s` }}>
            <a
              href={app.href}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={app.name}
              className="flex flex-col items-center gap-1.5 transition active:scale-95"
            >
              <span
                className={`flex h-16 w-16 items-center justify-center rounded-2xl font-sans font-extrabold text-white shadow-lg ${app.font}`}
                style={{ background: app.bg }}
              >
                {app.label}
              </span>
              <span className="text-xs font-semibold">{app.name}</span>
            </a>
          </li>
        ))}
      </ul>
      <CloseButton onClose={onClose}>Vale, vale… a votar</CloseButton>
    </EggModal>
  );
}

// ---------------------------------------------------------------------------
// Luis: ¿Aún le echas de menos?
// ---------------------------------------------------------------------------
function LuisEgg({ onClose }: EggProps) {
  return (
    <EggModal onClose={onClose} labelledBy="egg-title">
      {/* Polaroid con un corazón partido que late */}
      <div className="animate-rise mx-auto mt-6 w-44 rotate-[-4deg] bg-white p-2.5 pb-3 shadow-lg">
        <div className="flex h-36 items-center justify-center bg-gradient-to-br from-[#f7d7da] via-[#f3e3d3] to-[#e9dcf2]">
          <svg viewBox="0 0 64 60" className="h-20 w-20 animate-[heartbeat_1.4s_ease-in-out_infinite]" aria-hidden="true">
            <path d="M32,56 L8,32 A13,13 0 0,1 30,13 L32,15 L27,27 L35,33 L30,45 Z" fill="var(--stamp)" />
            <path d="M34,56 L36,46 L41,34 L33,28 L36,14 A13,13 0 0,1 58,32 Z" fill="var(--stamp)" opacity="0.85" />
          </svg>
        </div>
        <p className="mt-2 font-serif text-sm italic text-ink-soft">@xfedericusx ♡</p>
      </div>

      <h2 id="egg-title" className="mt-6 font-serif text-3xl leading-tight font-bold">
        ¿Aún le echas de menos?
      </h2>
      <p className="mt-2 text-sm text-ink-soft">
        Luis, antes de votar con la cabeza… dale un último vistazo con el corazón.
      </p>

      <a
        href="https://www.instagram.com/xfedericusx/"
        target="_blank"
        rel="noopener noreferrer"
        className="mt-5 flex w-full items-center justify-center gap-2 rounded-sm px-4 py-3 font-bold text-white shadow transition active:scale-[0.98]"
        style={{ background: "linear-gradient(45deg,#f09433,#e6683c,#dc2743,#cc2366,#bc1888)" }}
      >
        <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
          <rect x="3" y="3" width="18" height="18" rx="5" fill="none" stroke="currentColor" strokeWidth="2" />
          <circle cx="12" cy="12" r="4" fill="none" stroke="currentColor" strokeWidth="2" />
          <circle cx="17.3" cy="6.7" r="1.2" fill="currentColor" />
        </svg>
        Ver su Instagram
      </a>
      <CloseButton onClose={onClose}>Ya lo he superado (mentira)</CloseButton>
      <style>{`@keyframes heartbeat{0%,100%{transform:scale(1)}15%{transform:scale(1.12)}30%{transform:scale(1)}45%{transform:scale(1.08)}}`}</style>
    </EggModal>
  );
}

// ---------------------------------------------------------------------------
// Ach: Marruecos
// ---------------------------------------------------------------------------
function MoroccoFlag({ className = "" }: { className?: string }) {
  // Pentagrama verde sobre fondo rojo
  const r = 9;
  const pts = Array.from({ length: 5 }, (_, i) => {
    const a = -Math.PI / 2 + (i * 4 * Math.PI) / 5;
    return `${(30 + r * Math.cos(a)).toFixed(2)},${(20 + r * Math.sin(a)).toFixed(2)}`;
  }).join(" ");
  return (
    <svg viewBox="0 0 60 40" className={className} aria-label="Bandera de Marruecos" role="img">
      <rect width="60" height="40" fill="#c1272d" />
      <polygon points={pts} fill="none" stroke="#006233" strokeWidth="1.8" strokeLinejoin="round" />
    </svg>
  );
}

function AchEgg({ onClose }: EggProps) {
  return (
    <EggModal onClose={onClose} labelledBy="egg-title">
      {/* Franja de zellige arriba */}
      <div
        aria-hidden="true"
        className="absolute inset-x-0 top-0 h-2.5"
        style={{
          background:
            "repeating-linear-gradient(45deg,#006233 0 6px,#c9a227 6px 9px,#c1272d 9px 15px,#c9a227 15px 18px)",
        }}
      />

      <div className="mt-6 flex justify-center">
        <MoroccoFlag className="animate-[wave_2.6s_ease-in-out_infinite] h-20 w-30 origin-left rounded-[2px] shadow-md" />
      </div>

      <p className="mt-5 font-serif text-xl text-ink-soft" lang="ar" dir="rtl">
        مرحبا
      </p>
      <h2 id="egg-title" className="font-serif text-3xl leading-tight font-bold">
        ¡Marhaba, Ach!
      </h2>
      <p className="mt-2 text-sm text-ink-soft">
        La Junta Electoral te recibe como se merece: antes de votar, un tecito de menta bien servido desde arriba.
      </p>

      <div className="mt-5 flex items-center justify-center gap-3 text-4xl" aria-hidden="true">
        <span className="animate-rise [animation-delay:0.3s]">🫖</span>
        <span className="animate-rise [animation-delay:0.45s]">🍵</span>
        <span className="animate-rise [animation-delay:0.6s]">🌿</span>
      </div>
      <p className="mt-2 text-xs text-ink-soft">Atay · Desde el Atlas hasta AMEBA CITY</p>

      <CloseButton onClose={onClose}>Yalla, a votar</CloseButton>
      <style>{`@keyframes wave{0%,100%{transform:skewY(0deg) scaleX(1)}50%{transform:skewY(-3deg) scaleX(.97)}}`}</style>
    </EggModal>
  );
}

// ---------------------------------------------------------------------------
// Kike: recordatorio de su alopecia, en 6 avisos seguidos. No se puede saltar
// con Escape ni tocando fuera: hay que pasarlos todos.
// ---------------------------------------------------------------------------
function BaldCaricature({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 120 120" className={className} role="img" aria-label="Caricatura de una cabeza calva con bigote">
      {/* Orejas */}
      <ellipse cx="24" cy="66" rx="7" ry="10" fill="#e9b48f" />
      <ellipse cx="96" cy="66" rx="7" ry="10" fill="#e9b48f" />
      {/* Cabeza */}
      <ellipse cx="60" cy="60" rx="36" ry="44" fill="#f1c29d" />
      {/* Brillo de la calva */}
      <ellipse cx="46" cy="28" rx="11" ry="6" fill="#fff" opacity="0.85" transform="rotate(-20 46 28)" />
      <ellipse cx="62" cy="22" rx="4" ry="2.5" fill="#fff" opacity="0.7" />
      {/* Los últimos pelos de los lados */}
      <path d="M26,58 q3,-10 8,-14 M28,64 q2,-9 7,-13" stroke="#3b2a1e" strokeWidth="2.2" strokeLinecap="round" fill="none" />
      <path d="M94,58 q-3,-10 -8,-14 M92,64 q-2,-9 -7,-13" stroke="#3b2a1e" strokeWidth="2.2" strokeLinecap="round" fill="none" />
      {/* Cejas y ojos */}
      <path d="M40,56 q7,-5 14,0 M66,56 q7,-5 14,0" stroke="#3b2a1e" strokeWidth="2.6" strokeLinecap="round" fill="none" />
      <circle cx="47" cy="63" r="3.4" fill="#2b3f63" />
      <circle cx="73" cy="63" r="3.4" fill="#2b3f63" />
      {/* Nariz */}
      <path d="M60,66 q-5,12 0,15" stroke="#c98d67" strokeWidth="2" fill="none" strokeLinecap="round" />
      {/* Bigotazo */}
      <path d="M38,88 Q48,78 60,84 Q72,78 82,88 Q72,86 60,90 Q48,86 38,88 Z" fill="#3b2a1e" />
      {/* Boca */}
      <path d="M52,95 q8,4 16,0" stroke="#b5655a" strokeWidth="2" fill="none" strokeLinecap="round" />
      {/* Destellos */}
      <g fill="var(--gold)" className="animate-pulse">
        <path d="M18,22 l2,5 l5,2 l-5,2 l-2,5 l-2,-5 l-5,-2 l5,-2 Z" />
        <path d="M100,14 l1.5,4 l4,1.5 l-4,1.5 l-1.5,4 l-1.5,-4 l-4,-1.5 l4,-1.5 Z" />
        <path d="M104,40 l1,3 l3,1 l-3,1 l-1,3 l-1,-3 l-3,-1 l3,-1 Z" />
      </g>
    </svg>
  );
}

function NextButton({ onClick, children }: { onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      autoFocus
      className="mt-6 w-full rounded-sm bg-ink px-4 py-3 font-bold uppercase tracking-wider text-paper"
    >
      {children}
    </button>
  );
}

const KIKE_DENIALS = ["Respuesta incorrecta. Inténtalo otra vez.", "La Junta no acepta mentiras.", "Kike…", "KIKE."];

function KikeEgg({ onClose }: EggProps) {
  const [step, setStep] = useState(0);
  const [denied, setDenied] = useState(0);
  const next = () => setStep((s) => s + 1);

  const screens: ReactNode[] = [
    <>
      <h2
        id="egg-title"
        className="animate-stamp mx-auto mt-6 w-fit rounded border-[4px] border-stamp px-4 py-1.5 font-sans text-3xl font-black tracking-wider text-stamp"
      >
        ¡ALERTA!
      </h2>
      <p className="mt-5 text-sm text-ink-soft">
        Kike, los sensores de la Junta Electoral han detectado un <b className="text-ink">reflejo cegador</b> delante
        de la pantalla.
      </p>
      <NextButton onClick={next}>¿Qué reflejo?</NextButton>
    </>,
    <>
      <BaldCaricature className="mx-auto mt-5 h-36 w-36" />
      <h2 id="egg-title" className="mt-3 font-serif text-3xl font-bold">
        Es tu cabeza ✨
      </h2>
      <p className="mt-2 text-sm text-ink-soft">Bájale el brillo, que no vemos la papeleta.</p>
      <NextButton onClick={next}>Muy gracioso</NextButton>
    </>,
    <>
      <h2 id="egg-title" className="mt-6 font-serif text-2xl font-bold">
        Informe capilar oficial
      </h2>
      <div className="mt-5 text-left">
        <div className="flex justify-between text-xs font-bold uppercase tracking-wider text-ink-soft">
          <span>Pelo restante</span>
          <span className="text-stamp">3 %</span>
        </div>
        <div className="mt-1.5 h-3 overflow-hidden rounded-full border border-rule bg-paper-edge">
          <div className="h-full w-[3%] bg-stamp" />
        </div>
        <p className="mt-3 text-xs text-ink-soft">
          Estado: <b className="text-ink">calvo</b> · Tendencia: <b className="text-ink">más calvo</b>
        </p>
      </div>
      <NextButton onClick={next}>Ya lo sé</NextButton>
    </>,
    <>
      <p className="mt-6 text-5xl" aria-hidden="true">
        🧴
      </p>
      <h2 id="egg-title" className="mt-3 font-serif text-2xl font-bold">
        Dato curioso
      </h2>
      <p className="mt-2 text-sm text-ink-soft">
        Un bote de champú te dura <b className="text-ink">tres legislaturas</b>. Más que cualquier presidente.
      </p>
      <NextButton onClick={next}>…</NextButton>
    </>,
    <>
      <p className="mt-6 text-5xl" aria-hidden="true">
        ✈️
      </p>
      <h2 id="egg-title" className="mt-3 font-serif text-2xl font-bold">
        Tarjeta de embarque
      </h2>
      <div className="mt-4 rounded-sm border-2 border-dashed border-ink bg-white p-3 text-left font-mono text-xs leading-relaxed">
        <p>PASAJERO: KIKE</p>
        <p>DESTINO: ESTAMBUL (IST)</p>
        <p>MOTIVO: INJERTO CAPILAR</p>
        <p>BILLETE: SOLO IDA HASTA QUE CREZCA</p>
      </div>
      <NextButton onClick={next}>No pienso ir</NextButton>
    </>,
    <>
      <h2 id="egg-title" className="mt-6 font-serif text-2xl font-bold">
        Última comprobación antes de votar
      </h2>
      <p className="mt-2 text-base text-ink-soft">¿Sigues calvo?</p>
      {denied > 0 && (
        <p key={denied} className="animate-pop mt-3 text-sm font-bold text-stamp">
          {KIKE_DENIALS[Math.min(denied, KIKE_DENIALS.length) - 1]}
        </p>
      )}
      <div className="mt-6 flex items-center justify-center gap-3">
        <button
          type="button"
          onClick={onClose}
          autoFocus
          className="flex-1 rounded-sm bg-ink px-4 py-3 font-bold uppercase tracking-wider text-paper"
        >
          Sí, soy calvo
        </button>
        <button
          type="button"
          onClick={() => setDenied((d) => d + 1)}
          className="rounded-sm border-2 border-ink px-3 py-2 font-semibold transition-all"
          style={{ transform: `scale(${Math.max(0.4, 1 - denied * 0.2)})`, opacity: Math.max(0.35, 1 - denied * 0.2) }}
        >
          No
        </button>
      </div>
    </>,
  ];
  const total = screens.length;

  return (
    <EggModal onClose={onClose} labelledBy="egg-title" dismissible={false}>
      <p className="mt-1 text-[10px] font-bold tracking-widest text-ink-soft/70">
        AVISO {Math.min(step + 1, total)} DE {total}
      </p>
      <div key={step} className="animate-rise [animation-duration:0.35s]">
        {screens[Math.min(step, total - 1)]}
      </div>
    </EggModal>
  );
}

// ---------------------------------------------------------------------------
// Fortune y Bruno: MODO CREADOR. Terminal que "hackea" la Junta y un panel
// con ventajas puramente estéticas. No puede ver ni tocar votos.
// ---------------------------------------------------------------------------
const TERMINAL_LINES = (name: string) => [
  `ameba-os v26.11 · sesión de ${name.toLowerCase()}`,
  "$ sudo junta-electoral --modo-creador",
  "[sudo] contraseña para creador: ********",
  "Verificando firma de InfielesApps.com… OK",
  "Cargando privilegios de creador… ██████████ 100%",
  `✓ Acceso concedido. Bienvenido, ${name}.`,
];

function Terminal({ lines, onDone }: { lines: string[]; onDone: () => void }) {
  const full = lines.join("\n");
  const [shown, setShown] = useState(0);

  useEffect(() => {
    if (shown >= full.length) {
      const t = setTimeout(onDone, 500);
      return () => clearTimeout(t);
    }
    // Más rápido en los espacios, pausa en los saltos de línea
    const ch = full[shown];
    const t = setTimeout(() => setShown((n) => n + 1), ch === "\n" ? 260 : ch === " " ? 12 : 24);
    return () => clearTimeout(t);
  }, [shown, full, onDone]);

  return (
    <pre
      className="mt-5 min-h-48 overflow-hidden rounded-sm bg-[#0d1117] p-4 text-left font-mono text-[12px] leading-relaxed whitespace-pre-wrap text-[#4ade80] shadow-inner"
      aria-live="polite"
    >
      {full.slice(0, shown)}
      <span className="animate-pulse">▋</span>
    </pre>
  );
}

function CreatorEgg({ onClose, onGold, votedCount = 0, name }: EggProps & { name: string }) {
  const [stage, setStage] = useState<"terminal" | "panel">("terminal");
  const [gold, setGold] = useState(false);
  const [confetti, setConfetti] = useState(0);

  const stats: [string, string][] = [
    ["Votos en la urna", `${votedCount}/10`],
    ["Calvos detectados", "1 (Kike)"],
    ["Currículums enviados por Valentin", "0"],
    ["Tés de menta servidos a Ach", "∞"],
    ["Veces que Luis ha mirado cierto Instagram hoy", "37"],
    ["Nivel de corrupción de la Junta", "0 % (de momento)"],
  ];

  return (
    <EggModal onClose={onClose} labelledBy="egg-title" dismissible={stage === "panel"}>
      {stage === "terminal" ? (
        <>
          <h2 id="egg-title" className="sr-only">
            Modo creador
          </h2>
          <Terminal lines={TERMINAL_LINES(name)} onDone={() => setStage("panel")} />
          <button
            type="button"
            onClick={() => setStage("panel")}
            className="mt-3 text-xs text-ink-soft underline underline-offset-2"
          >
            Saltar
          </button>
        </>
      ) : (
        <div className="animate-rise">
          <div
            className="gold-shimmer mx-auto mt-5 w-fit rounded-sm px-4 py-1 text-xs font-black uppercase tracking-[0.3em] text-ink"
          >
            ✦ Modo creador ✦
          </div>
          <h2 id="egg-title" className="mt-3 font-serif text-2xl font-bold">
            Bienvenido, {name}
          </h2>
          <p className="text-xs text-ink-soft">Panel reservado a los creadores de la app.</p>

          <dl className="mt-4 divide-y divide-rule rounded-sm border border-rule bg-white text-left text-xs">
            {stats.map(([k, v]) => (
              <div key={k} className="flex items-center justify-between gap-3 px-3 py-1.5">
                <dt className="text-ink-soft">{k}</dt>
                <dd className="shrink-0 font-mono font-bold">{v}</dd>
              </div>
            ))}
          </dl>

          <div className="mt-4 grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => {
                setGold(true);
                onGold?.();
              }}
              disabled={gold}
              className={`rounded-sm border-2 px-2 py-2.5 text-sm font-bold transition ${
                gold ? "border-gold bg-gold/20 text-ink" : "border-ink hover:bg-white"
              }`}
            >
              {gold ? "✦ Papeleta dorada ✓" : "✦ Papeleta dorada"}
            </button>
            <button
              type="button"
              onClick={() => setConfetti((n) => n + 1)}
              className="rounded-sm border-2 border-ink px-2 py-2.5 text-sm font-bold transition hover:bg-white active:scale-95"
            >
              🎉 Cañón de confeti
            </button>
          </div>

          <p className="mt-4 rounded-sm bg-paper-edge px-3 py-2 text-[11px] leading-snug text-ink-soft">
            🔒 Por transparencia democrática, el modo creador <b className="text-ink">no puede ver ni cambiar votos</b>.
            Ni siquiera el tuyo.
          </p>

          <CloseButton onClose={onClose}>A votar como un creador</CloseButton>
          {confetti > 0 && <Confetti key={confetti} count={120} />}
        </div>
      )}
    </EggModal>
  );
}
