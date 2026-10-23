import type { Metadata } from "next";

// Gives /admin its own manifest so it installs as a separate "Crowned Admin" app
// (start_url and scope are /admin) instead of the public voting app.
export const metadata: Metadata = {
  title: "Crowned Admin",
  manifest: "/admin.webmanifest",
  icons: { icon: "/admin-192.png", apple: "/admin-192.png" },
  robots: { index: false, follow: false },
  appleWebApp: { capable: true, title: "Crowned Admin" },
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return children;
}
