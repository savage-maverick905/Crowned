"use client";
import { useEffect, useRef, type ReactNode } from "react";
import Crown from "./Crown";
import type { PayState } from "@/lib/usePayRef";

/** Modal the visitor dismisses with OK. While `busy` there is no button (e.g. redirecting to Paystack). */
export default function Popup({ open, title, children, onOk, okLabel = "OK", busy = false, tone = "default" }:
  { open: boolean; title?: string; children: ReactNode; onOk: () => void; okLabel?: string; busy?: boolean; tone?: "default" | "error" }) {
  const btn = useRef<HTMLButtonElement>(null); const okRef = useRef(onOk); okRef.current = onOk;
  useEffect(() => {
    if (!open) return;
    btn.current?.focus();
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape" && !busy) okRef.current(); };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow; document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", onKey); document.body.style.overflow = prev; };
  }, [open, busy]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center sm:items-center" role="presentation">
      <div className="absolute inset-0 animate-fade bg-black/70 backdrop-blur-sm" onClick={() => !busy && onOk()} />
      <div role="alertdialog" aria-modal="true" aria-label={title || "Message"}
        className={`relative max-h-[85dvh] w-full max-w-sm animate-sheet overflow-y-auto rounded-t-3xl border bg-pitch-800 p-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))] shadow-2xl sm:rounded-3xl sm:pb-6 ${tone === "error" ? "border-red-400/50" : "border-gold/40"}`}>
        {title && <h2 className="flex items-center gap-2 font-display text-xl font-bold">{tone === "default" && <Crown className="h-5 w-5 shrink-0 text-gold" />}{title}</h2>}
        <div className={`${title ? "mt-3" : ""} break-words text-sm text-chalk`}>{children}</div>
        {busy
          ? <div className="mt-5 flex justify-center"><span className="h-6 w-6 animate-spin rounded-full border-2 border-gold border-t-transparent" aria-label="Loading" /></div>
          : <button ref={btn} onClick={onOk} className="btn mt-6 w-full !py-3 !text-base">{okLabel}</button>}
      </div>
    </div>
  );
}

/** The payment confirmation popup (used on the home page and poll pages). */
export function PayPopup({ pay }: { pay: PayState & { dismiss: () => void } }) {
  if (pay.status === "idle") return null;
  const checking = pay.status === "checking";
  return <Popup open title={checking ? "Confirming payment" : pay.status === "ok" ? "Payment confirmed" : "Payment not confirmed yet"} busy={checking}
    tone={pay.status === "fail" ? "error" : "default"} onOk={pay.dismiss}>{pay.text}</Popup>;
}
