"use client";
import { useCallback, useEffect, useRef, useState } from "react";

const BASE = `:root{color-scheme:dark}html,body{margin:0;padding:0;background:transparent}body{font:15px/1.5 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;color:#f5f5f4;overflow-wrap:anywhere}a{color:#f5c451}img,video{max-width:100%;height:auto}`;

/** Builds the document for admin-written HTML + CSS. Scripts are blocked twice: by the iframe sandbox and by this CSP. */
export function buildSrcDoc(html: string, css = "") {
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="dark">` +
    `<meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src https: data:; media-src https:; style-src 'unsafe-inline' https:; font-src https: data:; script-src 'none'; form-action 'none'; base-uri 'none'">` +
    `<base target="_blank"><style>${BASE}</style><style>${css}</style></head><body>${html}</body></html>`;
}

/** Shows admin HTML/CSS safely. No allow-scripts, so nothing the admin pastes can run code or touch the site. */
export default function RichHtml({ html, css = "" }: { html: string; css?: string }) {
  const ref = useRef<HTMLIFrameElement>(null); const [h, setH] = useState(60);
  const measure = useCallback(() => { const d = ref.current?.contentDocument; if (d?.documentElement) setH(Math.min(4000, Math.max(24, d.documentElement.scrollHeight))); }, []);
  useEffect(() => {
    const ts = [300, 1000, 2500].map(ms => setTimeout(measure, ms)); window.addEventListener("resize", measure);
    return () => { ts.forEach(clearTimeout); window.removeEventListener("resize", measure); };
  }, [html, css, measure]);
  return <iframe ref={ref} title="Message" sandbox="allow-same-origin allow-popups allow-popups-to-escape-sandbox" srcDoc={buildSrcDoc(html, css)} onLoad={measure}
    style={{ width: "100%", height: h, border: 0, display: "block", background: "transparent" }} />;
}
