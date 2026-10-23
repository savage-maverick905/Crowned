export type ResultItem = { name: string; edition?: string; imageUrl?: string; total: number; rank: number };

const FONT = "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif";
const GOLD = "#f5c451"; const MUTE = "#a1a1aa"; const LINE = "#2b2b33";
const CROWN = "M3 8l4.5 4L12 5l4.5 7L21 8l-2 11H5L3 8z";

function loadImg(src: string): Promise<HTMLImageElement | null> {
  return new Promise(res => {
    const im = new Image(); im.crossOrigin = "anonymous"; im.referrerPolicy = "no-referrer";
    const t = setTimeout(() => res(null), 8000);
    im.onload = () => { clearTimeout(t); res(im); }; im.onerror = () => { clearTimeout(t); res(null); };
    im.src = src;
  });
}
function rr(g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath();
}
function fit(g: CanvasRenderingContext2D, text: string, maxW: number) {
  if (g.measureText(text).width <= maxW) return text;
  let t = text; while (t.length > 1 && g.measureText(t + "…").width > maxW) t = t.slice(0, -1); return t.trimEnd() + "…";
}
function wrap(g: CanvasRenderingContext2D, text: string, maxW: number, maxLines: number) {
  const words = text.split(/\s+/); const lines: string[] = []; let cur = "";
  for (const w of words) {
    const next = cur ? cur + " " + w : w;
    if (g.measureText(next).width <= maxW || !cur) cur = next; else { lines.push(cur); cur = w; }
  }
  if (cur) lines.push(cur);
  if (lines.length > maxLines) { const keep = lines.slice(0, maxLines); keep[maxLines - 1] = fit(g, lines.slice(maxLines - 1).join(" "), maxW); return keep; }
  return lines;
}
const n = (x: number) => (x || 0).toLocaleString("en-NG");

/** Draws a shareable PNG of the current poll standings. */
export async function resultsImage(o: { title: string; plural: string; open: boolean; items: ResultItem[]; totalVotes: number; baseline: number; host: string }): Promise<Blob> {
  const W = 1080, PAD = 64, ROW = 128, TOP = 8, HEAD = 340;
  const rows = o.items.slice(0, TOP); const more = o.items.length - rows.length;
  const H = HEAD + rows.length * ROW + (more > 0 ? 50 : 0) + 230;
  const imgs = await Promise.all(rows.map(r => (r.imageUrl ? loadImg(r.imageUrl) : Promise.resolve(null))));

  const c = document.createElement("canvas"); c.width = W; c.height = H; const g = c.getContext("2d")!;
  g.fillStyle = "#0a0a0c"; g.fillRect(0, 0, W, H);
  const glow = g.createRadialGradient(W / 2, 0, 0, W / 2, 0, W * 0.85); glow.addColorStop(0, "rgba(245,196,81,0.24)"); glow.addColorStop(1, "rgba(245,196,81,0)");
  g.fillStyle = glow; g.fillRect(0, 0, W, H);

  // brand
  g.save(); g.translate(PAD, 58); g.scale(2.4, 2.4); g.fillStyle = GOLD; g.fill(new Path2D(CROWN)); g.restore();
  g.fillStyle = GOLD; g.font = `800 38px ${FONT}`; g.textBaseline = "alphabetic"; g.fillText("CROWNED", PAD + 76, 100);
  g.textAlign = "right"; g.fillStyle = o.open ? GOLD : MUTE; g.font = `700 30px ${FONT}`; g.fillText(o.open ? "VOTING OPEN" : "VOTING CLOSED", W - PAD, 100); g.textAlign = "left";

  // title
  g.fillStyle = "#f5f5f4"; g.font = `800 76px ${FONT}`;
  const lines = wrap(g, o.title, W - PAD * 2, 2);
  lines.forEach((l, i) => g.fillText(l, PAD, 200 + i * 88));
  const subY = 200 + (lines.length - 1) * 88 + 62;
  g.fillStyle = MUTE; g.font = `500 32px ${FONT}`;
  g.fillText(`${n(o.items.length)} ${o.plural.toLowerCase()} · ${n(o.totalVotes)} votes`, PAD, subY);

  // rows
  const sum = o.items.reduce((s, x) => s + x.total, 0) || 1;
  rows.forEach((r, i) => {
    const y = HEAD + i * ROW; const h = ROW - 16;
    rr(g, PAD, y, W - PAD * 2, h, 28); g.fillStyle = "#111115"; g.fill(); g.strokeStyle = r.rank === 1 ? GOLD : LINE; g.lineWidth = r.rank === 1 ? 3 : 2; g.stroke();
    // rank
    if (r.rank === 1) { g.save(); g.translate(PAD + 22, y + h / 2 - 22); g.scale(1.85, 1.85); g.fillStyle = GOLD; g.fill(new Path2D(CROWN)); g.restore(); }
    else { g.fillStyle = MUTE; g.font = `800 34px ${FONT}`; g.textAlign = "center"; g.fillText("#" + r.rank, PAD + 44, y + h / 2 + 12); g.textAlign = "left"; }
    // thumb
    const tx = PAD + 100, ts = 84, ty = y + (h - ts) / 2;
    g.save(); rr(g, tx, ty, ts, ts, 18); g.clip();
    const im = imgs[i];
    if (im) { const s = Math.max(ts / im.width, ts / im.height); const w = im.width * s, hh = im.height * s; g.drawImage(im, tx + (ts - w) / 2, ty + (ts - hh) * 0.2, w, hh); }
    else { g.fillStyle = "#24242b"; g.fillRect(tx, ty, ts, ts); g.fillStyle = GOLD; g.font = `800 44px ${FONT}`; g.textAlign = "center"; g.fillText((r.name[0] || "?").toUpperCase(), tx + ts / 2, ty + ts / 2 + 15); g.textAlign = "left"; }
    g.restore();
    // name + bar
    const nx = tx + ts + 28, right = W - PAD - 28, valW = 190;
    g.fillStyle = "#f5f5f4"; g.font = `700 36px ${FONT}`; g.fillText(fit(g, r.name, right - valW - nx), nx, y + 50);
    const bw = right - valW - nx - 10; rr(g, nx, y + 68, bw, 14, 7); g.fillStyle = "#0a0a0c"; g.fill();
    const fw = Math.max(r.total > 0 ? 14 : 0, bw * (r.total / sum)); if (fw > 0) { rr(g, nx, y + 68, fw, 14, 7); g.fillStyle = GOLD; g.fill(); }
    // votes
    g.textAlign = "right"; g.fillStyle = "#f5f5f4"; g.font = `800 38px ${FONT}`; g.fillText(n(r.total), right, y + 54);
    g.fillStyle = MUTE; g.font = `500 26px ${FONT}`; g.fillText(`${Math.round((r.total / sum) * 100)}%`, right, y + 88); g.textAlign = "left";
  });

  let fy = HEAD + rows.length * ROW;
  if (more > 0) { g.fillStyle = MUTE; g.font = `500 28px ${FONT}`; g.textAlign = "center"; g.fillText(`+ ${n(more)} more`, W / 2, fy + 28); g.textAlign = "left"; fy += 50; }

  // footer
  g.fillStyle = LINE; g.fillRect(PAD, fy + 24, W - PAD * 2, 2);
  g.fillStyle = MUTE; g.font = `500 26px ${FONT}`;
  const when = new Date().toLocaleString("en-NG", { dateStyle: "medium", timeStyle: "short" });
  g.fillText(`Results as of ${when}`, PAD, fy + 76);
  if (o.baseline > 0) g.fillText(fit(g, `Totals include ${n(o.baseline)} admin-set baseline votes (not genuine public votes).`, W - PAD * 2), PAD, fy + 118);
  g.fillStyle = GOLD; g.font = `700 30px ${FONT}`; g.fillText(`Cast your vote at ${o.host}`, PAD, fy + (o.baseline > 0 ? 170 : 130));

  return new Promise<Blob>((res, rej) => c.toBlob(b => (b ? res(b) : rej(new Error("toBlob failed"))), "image/png"));
}
