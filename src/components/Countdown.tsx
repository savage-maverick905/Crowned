"use client";
import { useEffect, useState } from "react";

const pad = (n: number) => String(n).padStart(2, "0");

/** Live countdown to `endsAt` (ISO). `skew` = serverNow - deviceNow, so a wrong phone clock can't cheat it. */
export default function Countdown({ endsAt, skew = 0, compact = false, pill = false, onEnd }: { endsAt: string; skew?: number; compact?: boolean; pill?: boolean; onEnd?: () => void }) {
  const end = new Date(endsAt).getTime();
  const [left, setLeft] = useState<number | null>(null);

  useEffect(() => {
    const tick = () => { const l = end - (Date.now() + skew); setLeft(l); return l; };
    if (tick() <= 0) { onEnd?.(); return; }
    const t = setInterval(() => { if (tick() <= 0) { clearInterval(t); onEnd?.(); } }, 1000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [end, skew]);

  if (left === null) return null;
  if (pill) {
    const sl = Math.max(0, Math.floor(left / 1000)); const dd = Math.floor(sl / 86400), hh = Math.floor((sl % 86400) / 3600), mm = Math.floor((sl % 3600) / 60), ss = sl % 60;
    return (
      <span role="timer" aria-label="Time left to vote" className="inline-flex h-8 items-center gap-1.5 rounded-full bg-black/60 px-3 text-sm font-bold tabular-nums text-gold backdrop-blur">
        <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true"><circle cx="12" cy="13" r="8" /><path d="M12 9v4l2.5 2M9 3h6" /></svg>
        {left <= 0 ? "Ended" : dd > 0 ? `${dd}d ${pad(hh)}h` : `${pad(hh)}:${pad(mm)}:${pad(ss)}`}
      </span>
    );
  }
  if (left <= 0) return compact ? <span>Voting ended</span> : <p className="text-sm font-semibold text-mute">Voting has ended.</p>;

  const s = Math.floor(left / 1000), d = Math.floor(s / 86400), h = Math.floor((s % 86400) / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
  if (compact) return <span>Ends in {d > 0 ? `${d}d ${h}h` : h > 0 ? `${h}h ${m}m` : `${m}m ${pad(sec)}s`}</span>;

  return (
    <div role="timer" aria-label="Time left to vote" className="rounded-2xl border border-gold/30 bg-gold/5 p-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-gold">Voting ends in</p>
      <div className="mt-2 grid grid-cols-4 gap-2 text-center">
        {([["Days", d], ["Hrs", h], ["Min", m], ["Sec", sec]] as [string, number][]).map(([k, n]) => (
          <div key={k} className="rounded-xl bg-pitch-950 py-2"><div className="font-display text-2xl font-extrabold tabular-nums">{pad(n)}</div><div className="text-[10px] uppercase text-mute">{k}</div></div>
        ))}
      </div>
    </div>
  );
}
