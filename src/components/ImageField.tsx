"use client";
import { useRef, useState } from "react";

// Shrinks a photo in the browser so phone pictures (often 5+ MB) upload quickly and stay small on the server.
async function shrink(file: File, maxSide: number): Promise<Blob> {
  const url = URL.createObjectURL(file);
  try {
    const im: HTMLImageElement = await new Promise((ok, no) => { const i = new Image(); i.onload = () => ok(i); i.onerror = () => no(new Error("decode")); i.src = url; });
    const s = Math.min(1, maxSide / Math.max(im.naturalWidth, im.naturalHeight));
    const w = Math.max(1, Math.round(im.naturalWidth * s)), h = Math.max(1, Math.round(im.naturalHeight * s));
    const c = document.createElement("canvas"); c.width = w; c.height = h;
    const g = c.getContext("2d")!; g.drawImage(im, 0, 0, w, h);
    const toBlob = (t: string, q: number) => new Promise<Blob | null>(r => c.toBlob(r, t, q));
    let b = await toBlob("image/webp", 0.8);
    if (!b || b.type !== "image/webp") { // older Safari can't encode WebP
      g.globalCompositeOperation = "destination-over"; g.fillStyle = "#0a0a0c"; g.fillRect(0, 0, w, h);
      b = await toBlob("image/jpeg", 0.8);
    }
    if (!b) throw new Error("encode");
    return b;
  } finally { URL.revokeObjectURL(url); }
}

export default function ImageField({ label, value, onChange, maxSide = 640, hint }: { label: string; value: string; onChange: (url: string) => void; maxSide?: number; hint?: string }) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  async function pick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; e.target.value = "";
    if (!file) return;
    setErr(""); setBusy(true);
    try {
      if (!file.type.startsWith("image/")) throw new Error("Please choose an image file.");
      const blob = await shrink(file, maxSide);
      const fd = new FormData(); fd.append("file", blob, "image");
      const r = await fetch("/api/admin/upload", { method: "POST", body: fd });
      const d: any = await r.json().catch(() => ({}));
      if (!r.ok || !d.url) throw new Error(d.error || (r.status === 403 || r.status === 401 ? "Your session expired. Sign in again." : `Upload failed (${r.status}).`));
      onChange(d.url);
    } catch (x: any) {
      setErr(x?.message === "decode" ? "That image couldn't be read. Try a JPEG, PNG or WebP." : x?.message || "Upload failed. Check your connection.");
    } finally { setBusy(false); }
  }

  return (
    <div>
      <span className="mb-1 block text-sm font-medium text-chalk">{label}</span>
      <div className="flex items-center gap-3">
        {value
          ? <img src={value} alt="" className="h-16 w-16 shrink-0 rounded-xl border border-line object-cover" referrerPolicy="no-referrer" />
          : <span className="grid h-16 w-16 shrink-0 place-items-center rounded-xl border border-dashed border-line text-xs text-mute">None</span>}
        <div className="flex flex-wrap gap-2">
          <button type="button" className="btn-ghost !px-3 !py-2 !text-xs" disabled={busy} onClick={() => input.current?.click()}>{busy ? "Uploading…" : value ? "Replace image" : "Choose image"}</button>
          {value && !busy && <button type="button" className="btn-ghost !px-3 !py-2 !text-xs" onClick={() => onChange("")}>Remove</button>}
        </div>
        <input ref={input} type="file" accept="image/*" className="hidden" onChange={pick} />
      </div>
      {err && <p role="alert" className="mt-2 text-xs text-red-300">{err}</p>}
      <details className="mt-2">
        <summary className="cursor-pointer text-xs text-mute">Or paste an image link</summary>
        <input className="field mt-2" type="url" value={value.startsWith("/api/img/") ? "" : value} onChange={e => onChange(e.target.value)} placeholder="https://" />
      </details>
      {hint && <span className="mt-1 block text-xs text-mute">{hint}</span>}
    </div>
  );
}
