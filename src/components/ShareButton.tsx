"use client";
import { useState } from "react";
// Shares a link with the phone's share sheet, or copies it when sharing isn't available.
export default function ShareButton({ title, path, className = "btn-ghost !px-3 !py-1.5 !text-xs", label = "Share" }: { title: string; path: string; className?: string; label?: string }) {
  const [done, setDone] = useState(false);
  async function go() {
    const link = location.origin + path; // built on click, so it never carries someone else's ?via= or payment params
    try { if (navigator.share) { await navigator.share({ title, url: link }); return; } } catch (e: any) { if (e?.name === "AbortError") return; }
    try { await navigator.clipboard.writeText(link); setDone(true); setTimeout(() => setDone(false), 2000); } catch { prompt("Copy this link:", link); }
  }
  return <button type="button" className={className} onClick={go}>{done ? "Link copied" : label}</button>;
}
