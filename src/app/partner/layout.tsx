import type { Metadata } from "next";
export const metadata: Metadata = {
  title: "Crowned Partners", manifest: "/partner.webmanifest", robots: { index: false, follow: false },
  icons: { icon: "/partner-192.png", apple: "/partner-192.png" }, appleWebApp: { capable: true, title: "Crowned Partners" },
};
export default function PartnerLayout({ children }: { children: React.ReactNode }) { return children; }
