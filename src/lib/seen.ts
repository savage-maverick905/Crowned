// Remembers which popups a visitor already pressed OK on (per browser).
const KEY = "crowned-seen-v1";
const mem = new Set<string>(); // fallback when localStorage is blocked (private mode)
function read(): string[] { try { return JSON.parse(localStorage.getItem(KEY) || "[]"); } catch { return []; } }
export const hasSeen = (k: string) => mem.has(k) || read().includes(k);
export function markSeen(k: string) {
  mem.add(k);
  try { const l = read().filter(x => x !== k); l.push(k); localStorage.setItem(KEY, JSON.stringify(l.slice(-300))); } catch {}
}
/** Small stable hash, used so editing an announcement makes it show again. */
export const hash = (s: string) => { let h = 5381; for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0; return (h >>> 0).toString(36); };
