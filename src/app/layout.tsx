import type { Metadata, Viewport } from "next";
import { Libre_Franklin, Source_Serif_4 } from "next/font/google";
import { MusicProvider } from "@/components/music/MusicProvider";
import "./globals.css";

const franklin = Libre_Franklin({ variable: "--font-franklin", subsets: ["latin"] });
const serif = Source_Serif_4({ variable: "--font-serif4", subsets: ["latin"] });

function siteUrl(): URL {
  if (process.env.NEXT_PUBLIC_SITE_URL) return new URL(process.env.NEXT_PUBLIC_SITE_URL);
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) return new URL(`https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`);
  return new URL("http://localhost:3000");
}

const title = "Elecciones a Presidente · AMEBA CITY";
const description =
  "Papeleta oficial de AMEBA CITY. Reparte tus 3, 2 y 1 puntos y elige al Presidente del Grupo. Voto secreto.";

export const metadata: Metadata = {
  metadataBase: siteUrl(),
  title,
  description,
  openGraph: {
    title,
    description,
    siteName: "AMEBA CITY",
    locale: "es_ES",
    type: "website",
  },
  twitter: { card: "summary_large_image", title, description },
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  themeColor: "#a3171d",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="es" className={`${franklin.variable} ${serif.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col font-sans">
        <MusicProvider>{children}</MusicProvider>
      </body>
    </html>
  );
}
