import { cookies } from "next/headers";
export const dynamic = "force-dynamic";
// The home-screen app's start page. If the visitor arrived through a partner link, it opens with that
// partner's code so the install keeps crediting them (iPhone installs don't share browser storage).
export async function GET() {
  const v = cookies().get("crowned_via")?.value;
  const code = v && /^[a-z0-9-]{3,40}$/i.test(v) ? v.toLowerCase() : null;
  const body = { id: "/", name: "Crowned", short_name: "Crowned", start_url: code ? `/?via=${code}` : "/", scope: "/", display: "standalone", background_color: "#0a0a0c", theme_color: "#0a0a0c",
    icons: [{ src: "/icon-192.png", sizes: "192x192", type: "image/png" }, { src: "/icon-512.png", sizes: "512x512", type: "image/png" }] };
  return new Response(JSON.stringify(body), { headers: { "Content-Type": "application/manifest+json", "Cache-Control": "no-store" } });
}
