"use client";
import { useCallback, useEffect, useRef, useState } from "react";

const WEEK = 7 * 24 * 60 * 60 * 1000;

export default function InstallPrompt({ name = "Crowned", storageKey = "crowned-install-snoozed", blurb = "Vote faster from your home screen." }: { name?: string; storageKey?: string; blurb?: string } = {}) {
  const KEY = storageKey;
  const [evt, setEvt] = useState<any>(null);
  const [open, setOpen] = useState(false);
  const [ios, setIos] = useState(false);
  const [installed, setInstalled] = useState(true);
  const primary = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const standalone = matchMedia("(display-mode: standalone)").matches || (navigator as any).standalone === true;
    const isIos = /iphone|ipad|ipod/i.test(navigator.userAgent);
    setInstalled(standalone); setIos(isIos);
    if (standalone) return;
    let snoozed = false;
    try { snoozed = Date.now() - Number(localStorage.getItem(KEY) || 0) < WEEK; } catch {}
    let timer: ReturnType<typeof setTimeout> | undefined;
    const later = () => { if (!snoozed) timer = setTimeout(() => setOpen(true), 3000); };
    if (isIos) later();
    const onPrompt = (e: any) => { e.preventDefault(); setEvt(e); later(); };
    const onInstalled = () => { setOpen(false); setEvt(null); setInstalled(true); };
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => { clearTimeout(timer); window.removeEventListener("beforeinstallprompt", onPrompt); window.removeEventListener("appinstalled", onInstalled); };
  }, []);

  const close = useCallback(() => {
    setOpen(false);
    try { localStorage.setItem(KEY, String(Date.now())); } catch {}
  }, []);

  useEffect(() => {
    if (!open) return;
    primary.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow; document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", onKey); document.body.style.overflow = prev; };
  }, [open, close]);

  async function install() {
    if (!evt) return;
    setOpen(false);
    evt.prompt();
    try { await evt.userChoice; } catch {}
    setEvt(null);
  }

  const available = !installed && (evt || ios);
  if (!available) return null;

  return (
    <>
      <button onClick={() => setOpen(true)} className="btn-ghost !px-3 !py-1.5 text-xs">Install app</button>
      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center" role="presentation">
          <div className="absolute inset-0 animate-fade bg-black/70 backdrop-blur-sm" onClick={close} />
          <div role="dialog" aria-modal="true" aria-labelledby="install-title"
            className="relative w-full max-w-sm animate-sheet rounded-t-3xl border border-line bg-pitch-800 p-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))] shadow-2xl sm:rounded-3xl sm:pb-6">
            <div className="flex items-center gap-4">
              <img src="/icon-192.png" alt="" width={56} height={56} className="h-14 w-14 rounded-2xl border border-line" />
              <div>
                <h2 id="install-title" className="font-display text-xl font-bold">Install {name}</h2>
                <p className="text-sm text-mute">{blurb}</p>
              </div>
            </div>
            {ios && !evt ? (
              <>
                <ol className="mt-5 list-decimal space-y-2 pl-5 text-sm text-chalk marker:font-bold marker:text-gold">
                  <li>Tap the <b>Share</b> button in Safari’s toolbar.</li>
                  <li>Choose <b>Add to Home Screen</b>.</li>
                  <li>Tap <b>Add</b>.</li>
                </ol>
                <button ref={primary} onClick={close} className="btn mt-6 w-full">Got it</button>
              </>
            ) : (
              <div className="mt-6 grid grid-cols-2 gap-3">
                <button onClick={close} className="btn-ghost">Not now</button>
                <button ref={primary} onClick={install} className="btn">Install</button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
