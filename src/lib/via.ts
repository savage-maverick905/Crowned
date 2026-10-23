// Remembers which referral partner sent this visitor (?via=code). It stays until a different partner link
// replaces it. Kept in localStorage and in a cookie; the cookie lets the install manifest carry it to the installed app.
const K = "crowned_via", MAX = 400 * 86400;
const ok = (c: any): c is string => typeof c === "string" && /^[a-z0-9-]{3,40}$/i.test(c);
function save(c: string) {
  try { localStorage.setItem(K, c); } catch {}
  try { document.cookie = `${K}=${c}; Max-Age=${MAX}; Path=/; SameSite=Lax${location.protocol === "https:" ? "; Secure" : ""}`; } catch {}
}
export function getVia(): string | undefined {
  try { const raw = localStorage.getItem(K); if (raw) { let v: any = raw; try { v = JSON.parse(raw)?.c ?? raw; } catch {} if (ok(v)) return v.toLowerCase(); } } catch {}
  try { const m = document.cookie.match(new RegExp(`(?:^|; )${K}=([^;]+)`)); if (m && ok(m[1])) return m[1].toLowerCase(); } catch {}
  return undefined;
}
export function captureVia() {
  try {
    const c = new URLSearchParams(location.search).get("via");
    if (ok(c)) save(c.toLowerCase()); // a new partner link takes over
    else { const cur = getVia(); if (cur) save(cur); } // otherwise keep the previous one and keep storage + cookie in sync
  } catch {}
}
