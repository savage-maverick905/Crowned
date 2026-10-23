import "./globals.css";
import type { Metadata, Viewport } from "next";
import Script from "next/script";
import ViaCapture from "@/components/ViaCapture";
import { Bricolage_Grotesque, Figtree } from "next/font/google";

const display = Bricolage_Grotesque({ subsets: ["latin"], variable: "--font-display", display: "swap" });
const body = Figtree({ subsets: ["latin"], variable: "--font-body", display: "swap" });

const url = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
export const metadata: Metadata = {
  metadataBase: new URL(url), title: "Crowned", description: "Vote for the greatest of all time.",
  manifest: "/manifest.webmanifest",
  openGraph: { title: "Crowned", description: "Cast your votes for the GOAT.", type: "website" },
  twitter: { card: "summary_large_image" }, appleWebApp: { capable: true, title: "Crowned" },
};
export const viewport: Viewport = { themeColor: "#0a0a0c", width: "device-width", initialScale: 1, maximumScale: 1, userScalable: false, viewportFit: "cover" };

export default function R({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${body.variable}`}>
      <body>
        {children}
        <ViaCapture />
        <Script id="sw" strategy="afterInteractive">{`if('serviceWorker'in navigator)navigator.serviceWorker.register('/sw.js')`}</Script>
      </body>
    </html>
  );
}
