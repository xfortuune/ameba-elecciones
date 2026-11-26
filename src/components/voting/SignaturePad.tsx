"use client";

import { useEffect, useRef, useState } from "react";

/** Longitud mínima del trazo (en px CSS) para que cuente como firma y no como un punto. */
const MIN_INK = 120;
const INK = "#1b2a6b";

/**
 * Recuadro de firma: se dibuja manteniendo pulsado el ratón o con el dedo.
 * Llama a onChange(true) cuando hay trazo suficiente.
 *
 * forcedText (easter egg): al tocar el recuadro, la firma se "autoescribe"
 * con ese texto letra a letra y ya no se puede cambiar ni borrar.
 */
export function SignaturePad({
  onChange,
  forcedText,
}: {
  onChange: (signed: boolean) => void;
  forcedText?: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const last = useRef<{ x: number; y: number } | null>(null);
  const ink = useRef(0);
  const [signed, setSigned] = useState(false);
  const [empty, setEmpty] = useState(true);
  const autoWriting = useRef(false);

  /** Escribe forcedText letra a letra con letra de mano y bloquea la firma. */
  function autoWrite(canvas: HTMLCanvasElement) {
    if (!forcedText || autoWriting.current) return;
    autoWriting.current = true;
    setEmpty(false);
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const { width, height } = canvas.getBoundingClientRect();
    const size = Math.min(44, height * 0.38);
    ctx.font = `italic ${size}px "Segoe Script", "Brush Script MT", "Snell Roundhand", "Comic Sans MS", cursive`;
    ctx.textBaseline = "alphabetic";
    const total = ctx.measureText(forcedText).width;
    const x0 = Math.max(36, (width - total) / 2);
    const y = height - 30;
    let i = 0;
    const step = () => {
      i += 1;
      ctx.clearRect(0, 0, width, height);
      ctx.fillText(forcedText.slice(0, i), x0, y);
      if (i < forcedText.length) {
        setTimeout(step, 110);
      } else {
        // Subrayado final de "firma"
        ctx.beginPath();
        ctx.moveTo(x0, y + 8);
        ctx.quadraticCurveTo(x0 + total / 2, y + 16, x0 + total + 10, y + 4);
        ctx.stroke();
        setSigned(true);
        onChange(true);
      }
    };
    step();
  }

  // Ajusta la resolución al tamaño real y a la densidad de la pantalla.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const resize = () => {
      const { width, height } = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.scale(dpr, dpr);
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.lineWidth = 2.4;
      ctx.strokeStyle = INK;
      ctx.fillStyle = INK;
    };
    resize();
    // Al redimensionar se borra el lienzo: reiniciamos la firma.
    const onResize = () => {
      resize();
      ink.current = 0;
      autoWriting.current = false;
      setEmpty(true);
      setSigned(false);
      onChange(false);
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [onChange]);

  const point = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };

  function down(e: React.PointerEvent<HTMLCanvasElement>) {
    e.preventDefault();
    if (forcedText) return autoWrite(e.currentTarget);
    e.currentTarget.setPointerCapture(e.pointerId);
    drawing.current = true;
    const p = point(e);
    last.current = p;
    const ctx = e.currentTarget.getContext("2d");
    ctx?.beginPath();
    ctx?.arc(p.x, p.y, 1.2, 0, Math.PI * 2);
    ctx?.fill();
    if (empty) setEmpty(false);
  }

  function move(e: React.PointerEvent<HTMLCanvasElement>) {
    if (forcedText || !drawing.current || !last.current) return;
    const ctx = e.currentTarget.getContext("2d");
    if (!ctx) return;
    const p = point(e);
    const from = last.current;
    const mid = { x: (from.x + p.x) / 2, y: (from.y + p.y) / 2 };
    ctx.beginPath();
    ctx.moveTo(from.x, from.y);
    ctx.quadraticCurveTo(from.x, from.y, mid.x, mid.y);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
    ink.current += Math.hypot(p.x - from.x, p.y - from.y);
    last.current = p;
    if (!signed && ink.current >= MIN_INK) {
      setSigned(true);
      onChange(true);
    }
  }

  function up() {
    drawing.current = false;
    last.current = null;
  }

  function clear() {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (canvas && ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
    ink.current = 0;
    setEmpty(true);
    setSigned(false);
    onChange(false);
  }

  return (
    <div>
      <div className="flex items-baseline justify-between">
        <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-ink-soft">Firma del votante</p>
        <button
          type="button"
          onClick={clear}
          disabled={empty || Boolean(forcedText)}
          hidden={Boolean(forcedText)}
          className="text-xs font-semibold text-ink-soft underline underline-offset-2 disabled:opacity-30"
        >
          Borrar
        </button>
      </div>
      <div className={`relative mt-1.5 rounded-sm border-2 bg-white ${signed ? "border-ink" : "border-dashed border-rule"}`}>
        <canvas
          ref={canvasRef}
          onPointerDown={down}
          onPointerMove={move}
          onPointerUp={up}
          onPointerCancel={up}
          aria-label="Recuadro para firmar. Mantén pulsado y dibuja tu firma."
          className="block h-32 w-full cursor-crosshair touch-none"
        />
        {/* Línea y "X" de firma, como en un documento */}
        <div className="pointer-events-none absolute inset-x-4 bottom-6 flex items-end gap-2 text-ink-soft/50">
          <span className="font-serif text-lg leading-none">✗</span>
          <span className="mb-0.5 h-px flex-1 bg-ink-soft/40" />
        </div>
        {empty && (
          <p className="pointer-events-none absolute inset-0 flex items-center justify-center pb-6 text-sm text-ink-soft/60">
            Mantén pulsado y firma aquí
          </p>
        )}
      </div>
      {!empty && !signed && !forcedText && <p className="mt-1 text-xs text-stamp">Sigue firmando: eso es muy corto para una firma.</p>}
    </div>
  );
}
