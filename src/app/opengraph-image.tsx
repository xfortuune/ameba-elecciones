import { ImageResponse } from "next/og";

export const alt = "Elecciones a Presidente del Grupo · AMEBA CITY";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const INK = "#1f1c17";
const STAMP = "#a3171d";
const GOLD = "#c9a227";
const PAPER = "#fbf7ec";

/** Imagen de vista previa para cuando se pega el enlace en Discord. */
export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", background: "#e7e1d3" }}>
        <div style={{ height: 22, background: STAMP, display: "flex" }} />
        <div style={{ height: 8, background: GOLD, display: "flex" }} />
        <div style={{ flex: 1, display: "flex", alignItems: "center", padding: "0 70px", gap: 60 }}>
          <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
            <div style={{ fontSize: 30, letterSpacing: 10, color: "#5d574b", fontWeight: 700 }}>AMEBA CITY</div>
            <div style={{ fontSize: 76, lineHeight: 1.05, color: INK, fontWeight: 800, marginTop: 14 }}>
              Elecciones a Presidente del Grupo
            </div>
            <div style={{ fontSize: 32, color: "#5d574b", marginTop: 26 }}>
              Reparte 3, 2 y 1 puntos · Voto secreto
            </div>
            <div
              style={{
                display: "flex",
                marginTop: 34,
                alignSelf: "flex-start",
                border: `5px solid ${STAMP}`,
                color: STAMP,
                fontSize: 34,
                fontWeight: 900,
                letterSpacing: 6,
                padding: "8px 22px",
                transform: "rotate(-4deg)",
              }}
            >
              ¡VOTA YA!
            </div>
          </div>

          {/* Papeleta */}
          <div
            style={{
              width: 330,
              height: 440,
              background: PAPER,
              display: "flex",
              flexDirection: "column",
              padding: 26,
              boxShadow: "0 20px 40px rgba(60,45,20,0.35)",
              transform: "rotate(4deg)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "center", fontSize: 16, letterSpacing: 4, color: "#5d574b", fontWeight: 700 }}>
              PAPELETA OFICIAL
            </div>
            <div style={{ display: "flex", height: 3, background: INK, margin: "12px 0 18px" }} />
            {[
              { n: "3", mark: true },
              { n: "2", mark: true },
              { n: "1", mark: true },
              { n: "", mark: false },
              { n: "", mark: false },
            ].map((row, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", marginBottom: 18, gap: 16 }}>
                <div style={{ display: "flex", height: 12, flex: 1, background: i < 3 ? "#bdb29a" : "#d9d0bb" }} />
                <div
                  style={{
                    width: 50,
                    height: 50,
                    border: `4px solid ${INK}`,
                    background: "white",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 40,
                    fontWeight: 900,
                    color: "#1b2a6b",
                  }}
                >
                  {row.mark && (
                    <div style={{ display: "flex", position: "relative", width: 34, height: 34 }}>
                      <div style={{ position: "absolute", left: 14, top: -3, width: 6, height: 40, background: "#1b2a6b", borderRadius: 3, transform: "rotate(45deg)" }} />
                      <div style={{ position: "absolute", left: 14, top: -3, width: 6, height: 40, background: "#1b2a6b", borderRadius: 3, transform: "rotate(-45deg)" }} />
                    </div>
                  )}
                </div>
                <div style={{ display: "flex", width: 26, fontSize: 30, fontWeight: 800, color: INK }}>{row.n}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    ),
    { ...size },
  );
}
