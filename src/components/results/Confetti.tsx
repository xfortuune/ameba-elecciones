"use client";

import { useState, type CSSProperties } from "react";

const COLORS = ["#c9a227", "#a3171d", "#f5dd82", "#1f1c17", "#fbf7ec", "#9ea4ab"];

type Piece = { left: number; color: string; style: CSSProperties };

/** Confeti con CSS puro. Solo se monta en el cliente tras el revelado, nunca en SSR. */
export function Confetti({ count = 90 }: { count?: number }) {
  const [pieces] = useState<Piece[]>(() =>
      Array.from({ length: count }, (_, i) => ({
        left: Math.random() * 100,
        color: COLORS[i % COLORS.length],
        style: {
          "--drift": `${(Math.random() - 0.5) * 30}vw`,
          "--spin": `${Math.random() * 900 - 450}deg`,
          "--dur": `${2.8 + Math.random() * 2.4}s`,
          "--delay": `${Math.random() * 0.8}s`,
        } as CSSProperties,
      })),
  );

  return (
    <div aria-hidden="true">
      {pieces.map((p, i) => (
        <span
          key={i}
          className="confetti-piece"
          style={{ ...p.style, left: `${p.left}vw`, background: p.color, borderRadius: i % 3 === 0 ? "50%" : "1px" }}
        />
      ))}
    </div>
  );
}
