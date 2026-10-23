"use client";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Crown from "./Crown";
import SearchBox from "./SearchBox";
import Countdown from "./Countdown";
import Popup, { PayPopup } from "./Popup";
import RichHtml from "./RichHtml";
import NoticePopups from "./NoticePopups";
import { usePayRef } from "@/lib/usePayRef";
import { hasSeen, markSeen, hash } from "@/lib/seen";
import ShareButton from "./ShareButton";
import { getVia } from "@/lib/via";
import { resultsImage } from "@/lib/resultsImage";

const fmt = (n: number) => (n || 0).toLocaleString("en-NG");
const MAXH = 280; // expanded header height (px)

export default function PollView({ id, focusId }: { id: string; focusId?: string }) {
  const [poll, setPoll] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [missing, setMissing] = useState(false);
  const [q, setQ] = useState("");
  const [selId, setSelId] = useState<string | null>(null);
  const [votes, setVotes] = useState(1);
  const [email, setEmail] = useState("");
  const [msg, setMsg] = useState("");
  const [paying, setPaying] = useState(false);
  const [skew, setSkew] = useState(0); const [ended, setEnded] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false); const searchRef = useRef(false); searchRef.current = searchOpen;
  const [imgBusy, setImgBusy] = useState(false); const [canShare, setCanShare] = useState(false);
  const headerRef = useRef<HTMLElement>(null);
  const [annPending, setAnnPending] = useState(false); const focused = useRef(false);

  const load = useCallback(() => {
    fetch("/api/polls/" + id).then(async r => {
      if (r.status === 404) { setMissing(true); return; }
      const d = await r.json(); setPoll(d.poll); setEnded(false); if (d.serverNow) setSkew(d.serverNow - Date.now());
    }).catch(() => setMsg("We couldn’t load this poll. Check your connection and refresh.")).finally(() => setLoading(false));
  }, [id]);

  useEffect(() => { load(); }, [load]);
  const payRef = usePayRef(load);
  useEffect(() => { if (poll?.title) document.title = poll.title + " · Crowned"; }, [poll?.title]);
  useEffect(() => { setCanShare(typeof navigator !== "undefined" && !!(navigator as any).canShare); }, []);
  // Coming back from Paystack with the back button restores the page mid-"redirect"; reset it.
  useEffect(() => { const f = (e: PageTransitionEvent) => { if (e.persisted) { setPaying(false); setMsg(""); } }; window.addEventListener("pageshow", f); return () => window.removeEventListener("pageshow", f); }, []);

  // Announcement: shown once as a popup (or always inline), depending on the admin's choice.
  const hasAnn = !!(poll && (poll.announcementHtml?.trim() || poll.announcement?.trim()));
  const annKey = poll ? `a:${poll.id}:${poll.announcementRev || 0}:${hash((poll.announcement || "") + "|" + (poll.announcementHtml || "") + "|" + (poll.announcementCss || ""))}` : "";
  useEffect(() => { setAnnPending(!!(hasAnn && poll?.announcementMode !== "inline" && !hasSeen(annKey))); }, [hasAnn, annKey, poll?.announcementMode]);
  const annBody = hasAnn ? (poll.announcementHtml?.trim() ? <RichHtml html={poll.announcementHtml} css={poll.announcementCss} /> : <p className="whitespace-pre-line">{poll.announcement}</p>) : null;

  // Opened from a shared item link: scroll to that item and pre-select it.
  useEffect(() => {
    if (!poll || !focusId || focused.current || !poll.players.some((x: any) => x.id === focusId)) return; focused.current = true;
    if (poll.status === "open") setSelId(focusId);
    setTimeout(() => document.getElementById("item-" + focusId)?.scrollIntoView({ block: "center", behavior: "smooth" }), 400);
  }, [poll, focusId]);

  // Collapsing header: scroll position drives CSS variables (--sy px scrolled, --p progress 0..1), no re-render per scroll.
  useEffect(() => {
    const el = headerRef.current; if (!el) return;
    let raf = 0;
    const apply = () => { raf = 0; const y = Math.max(0, window.scrollY); el.style.setProperty("--sy", String(y)); const pr = Math.min(1, y / (MAXH - 56)); el.style.setProperty("--p", String(pr));
      const c = pr >= 0.92 ? "1" : "0"; if (el.dataset.c !== c) el.dataset.c = c;
      if (y < 30 && searchRef.current) setSearchOpen(false); };
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(apply); };
    apply(); window.addEventListener("scroll", onScroll, { passive: true });
    return () => { window.removeEventListener("scroll", onScroll); if (raf) cancelAnimationFrame(raf); };
  }, [poll]);

  const ranked = useMemo(() => poll ? [...poll.players].sort((a: any, b: any) => b.total - a.total).map((p: any, i: number) => ({ ...p, rank: i + 1 })) : [], [poll]);
  const sum = useMemo(() => ranked.reduce((s: number, x: any) => s + x.total, 0) || 1, [ranked]);
  const shown = useMemo(() => { const s = q.trim().toLowerCase(); return s ? ranked.filter((x: any) => `${x.name} ${x.edition || ""}`.toLowerCase().includes(s)) : ranked; }, [ranked, q]);

  const open = poll?.status === "open" && !ended;
  const sel = poll && selId ? poll.players.find((x: any) => x.id === selId) : null;
  const sheetOpen = !!(open && sel);
  const one = poll?.itemSingular || "Item"; const many = poll?.itemPlural || "Items";

  async function pay() {
    if (!poll || !sel) return;
    setPaying(true); setMsg("Taking you to Paystack…");
    try {
      const r = await fetch("/api/checkout", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ pollId: poll.id, playerId: sel.id, votes, email, via: getVia() }) });
      const d = await r.json().catch(() => ({}));
      if (d.url) location.href = d.url; else { setMsg(d.error || "Something went wrong on our side. Please try again."); setPaying(false); }
    } catch { setMsg("We couldn’t reach the server. Check your connection and try again."); setPaying(false); }
  }

  async function shareItem(pl: any) {
    const url = `${location.origin}/poll/${poll.id}?item=${pl.id}`;
    const text = open ? `Vote for ${pl.name} in “${poll.title}”` : `See how ${pl.name} did in “${poll.title}”`;
    try { if ((navigator as any).share) { await (navigator as any).share({ title: poll.title, text, url }); return; } } catch (e: any) { if (e?.name === "AbortError") return; }
    try { await navigator.clipboard.writeText(url); setMsg(`Link copied! Paste it anywhere to send people straight to ${pl.name}.`); } catch { setMsg("Copy this link to share: " + url); }
  }

  const fileName = `${(poll?.title || "poll").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "poll"}-results.png`;
  const makeImage = () => resultsImage({
    title: poll.title, plural: many, open, items: ranked, totalVotes: ranked.reduce((s: number, x: any) => s + x.total, 0),
    baseline: poll.players.reduce((s: number, x: any) => s + x.seededVotes, 0), host: location.host,
  });
  async function saveImage() {
    setImgBusy(true);
    try {
      const blob = await makeImage(); const url = URL.createObjectURL(blob);
      const a = document.createElement("a"); a.href = url; a.download = fileName; document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 5000); setMsg("Saved! Look in your downloads or gallery.");
    } catch { setMsg("We couldn’t create the image. Please try again."); }
    setImgBusy(false);
  }
  async function shareImage() {
    setImgBusy(true);
    try {
      const blob = await makeImage(); const file = new File([blob], fileName, { type: "image/png" });
      if ((navigator as any).canShare?.({ files: [file] })) await (navigator as any).share({ files: [file], title: poll.title });
      else await saveImage();
    } catch (e: any) { if (e?.name !== "AbortError") setMsg("We couldn’t share the image. Try saving it instead."); }
    setImgBusy(false);
  }

  const back = <Link href="/" className="inline-flex items-center gap-1.5 text-sm font-semibold text-mute hover:text-chalk"><span aria-hidden="true">←</span> All polls</Link>;

  if (loading) return <main className="mx-auto max-w-5xl px-4 pt-[max(1rem,env(safe-area-inset-top))]"><div className="py-3">{back}</div><div className="aspect-[16/7] animate-pulse rounded-2xl bg-pitch-800" aria-busy="true" /></main>;
  if (missing || !poll) return (
    <main className="mx-auto max-w-5xl px-4 pt-[max(1rem,env(safe-area-inset-top))]"><div className="py-3">{back}</div>
      <p className="card mt-6 text-center text-mute">{msg || "We couldn’t find this poll. It may have been removed or isn’t public yet."}</p></main>
  );

  const topPos = "calc(10px + env(safe-area-inset-top, 0px))";
  return (
    <>
      <header ref={headerRef} className="group fixed inset-x-0 top-0 z-30 overflow-hidden bg-pitch-950"
        style={{ height: `max(calc(56px + env(safe-area-inset-top, 0px)), calc(${MAXH}px - var(--sy, 0) * 1px))` }}>
        <div className="absolute inset-0" style={{ opacity: "calc(1 - var(--p, 0))" }}>
          {poll.coverUrl
            ? <img src={poll.coverUrl} alt="" className="h-full w-full object-cover" referrerPolicy="no-referrer" />
            : <div className="grid h-full w-full place-items-center bg-gradient-to-br from-pitch-700 to-pitch-900"><Crown className="h-16 w-16 text-gold/70" /></div>}
          <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-black/35" />
        </div>
        <div className="absolute inset-0 border-b border-line bg-pitch-950/90 backdrop-blur-md" style={{ opacity: "var(--p, 0)" }} />
        <Link href="/" aria-label="All polls" className="absolute left-3 grid h-9 w-9 place-items-center rounded-full bg-black/50 text-lg text-chalk backdrop-blur" style={{ top: topPos }}>←</Link>
        <h1 className={`absolute font-display font-extrabold leading-[1.1] tracking-tight transition-opacity ${searchOpen ? "pointer-events-none opacity-0" : ""}`}
          style={{ left: "calc(16px + 40px * var(--p, 0))", right: "calc(16px + 150px * var(--p, 0))", bottom: "calc(18px - 8px * var(--p, 0))", fontSize: "calc(34px - 16px * var(--p, 0))",
            display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{poll.title}</h1>

        <div className={`absolute right-3 flex h-9 items-center gap-2 transition-opacity ${searchOpen ? "pointer-events-none opacity-0" : ""}`} style={{ top: topPos }}>
          <button type="button" aria-label="Search" onClick={() => setSearchOpen(true)}
            className="pointer-events-none relative grid h-9 w-0 shrink-0 place-items-center overflow-hidden rounded-full bg-black/50 text-chalk opacity-0 backdrop-blur transition-all duration-200 group-data-[c=1]:pointer-events-auto group-data-[c=1]:w-9 group-data-[c=1]:opacity-100">
            <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="M20 20l-3.5-3.5" /></svg>
            {q.trim() && <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-gold" />}
          </button>
          {open && poll.endsAt
            ? <Countdown pill endsAt={poll.endsAt} skew={skew} onEnd={() => setEnded(true)} />
            : <span className={`inline-flex h-8 items-center rounded-full bg-black/60 px-3 text-sm font-bold backdrop-blur ${open ? "text-gold" : "text-mute"}`}>{open ? "Voting open" : "Closed"}</span>}
        </div>

        {searchOpen && (
          <div className="absolute right-3 flex h-9 items-center gap-3" style={{ top: topPos, left: 56 }}>
            <div className="relative flex-1">
              <svg viewBox="0 0 24 24" className="pointer-events-none absolute left-3 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-mute" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="M20 20l-3.5-3.5" /></svg>
              <input autoFocus type="search" value={q} onChange={e => setQ(e.target.value)} placeholder={`Search ${many.toLowerCase()}…`} aria-label={`Search ${many.toLowerCase()}`}
                className="field !h-9 !rounded-full !py-0 !pl-10 !pr-3" />
            </div>
            <button type="button" onClick={() => setSearchOpen(false)} className="text-sm font-bold text-gold">Done</button>
          </div>
        )}
      </header>

      <main className={`mx-auto max-w-5xl px-4 ${sheetOpen ? "pb-80" : "pb-16"}`}>
        <div aria-hidden="true" style={{ height: MAXH }} />

        <div className="pt-4">
          {poll.description && <p className="max-w-2xl text-base text-mute">{poll.description}</p>}
          <div className="mt-3"><ShareButton title={poll.title} label="Share this poll" className="btn-ghost !px-4 !py-2 !text-sm" path={`/poll/${poll.id}`} /></div>
          <p className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-mute">
            <span className="font-semibold text-gold">₦{fmt(poll.pricePerVote)} per vote</span>
            <span>{fmt(poll.players.length)} {poll.players.length === 1 ? one : many}</span>
            <span>{fmt(ranked.reduce((s: number, x: any) => s + x.total, 0))} votes</span>
          </p>
        </div>

        {poll.players.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            <button className="btn-ghost" onClick={saveImage} disabled={imgBusy}>{imgBusy ? "Creating image…" : "Save results as image"}</button>
            {canShare && <button className="btn-ghost" onClick={shareImage} disabled={imgBusy}>Share results</button>}
          </div>
        )}

        {hasAnn && poll.announcementMode === "inline" && <div className="mt-4 rounded-xl border border-line bg-pitch-800 p-3 text-sm">{annBody}</div>}

        <div className="mt-6"><SearchBox value={q} onChange={setQ} placeholder={`Search ${many.toLowerCase()}…`} /></div>

        {poll.players.length === 0 && <p className="card mt-6 text-center text-mute">No {many.toLowerCase()} here yet. Check back soon.</p>}
        {poll.players.length > 0 && shown.length === 0 && <p className="card mt-6 text-center text-mute">No {many.toLowerCase()} match “{q}”. Try another name.</p>}

        <ul className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {shown.map((pl: any) => {
            const on = selId === pl.id; const pct = Math.round((pl.total / sum) * 100);
            return (
              <li key={pl.id} id={"item-" + pl.id} className="relative flex scroll-mt-24">
                <button type="button" disabled={!open} aria-pressed={on} onClick={() => setSelId(on ? null : pl.id)}
                  className={`group flex w-full flex-col overflow-hidden rounded-2xl border bg-pitch-900 text-left transition ${on ? "border-gold ring-2 ring-gold" : pl.id === focusId ? "border-gold/70 ring-1 ring-gold/60" : "border-line hover:border-gold/50"} ${open ? "" : "cursor-default"}`}>
                  <span className="relative block aspect-[4/5] w-full overflow-hidden bg-pitch-800 sm:aspect-square">
                    {pl.imageUrl
                      ? <img src={pl.imageUrl} alt={pl.name} className="h-full w-full object-cover object-top transition duration-300 group-hover:scale-105" loading="lazy" referrerPolicy="no-referrer" />
                      : <span className="grid h-full w-full place-items-center bg-gradient-to-br from-pitch-700 to-pitch-900 font-display text-8xl font-extrabold text-gold/80">{pl.name?.[0]}</span>}
                    <span className="absolute left-3 top-3 inline-flex h-9 min-w-9 items-center justify-center rounded-full bg-black/70 px-3 text-sm font-bold backdrop-blur">
                      {pl.rank === 1 ? <Crown className="h-5 w-5 text-gold" /> : "#" + pl.rank}
                    </span>
                    {on && <span className="absolute right-[3.5rem] top-3 grid h-9 w-9 place-items-center rounded-full bg-gold text-pitch-950"><svg viewBox="0 0 20 20" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="3"><path d="M4 10l4 4 8-8" /></svg></span>}
                  </span>
                  <span className="flex flex-1 flex-col p-4">
                    <span className="block font-display text-xl font-bold leading-tight">{pl.name}</span>
                    {pl.edition && <span className="mt-0.5 block text-sm text-mute">{pl.edition}</span>}
                    <span className="mt-3 flex items-baseline justify-between"><span className="font-display text-lg font-bold">{fmt(pl.total)} <span className="text-sm font-normal text-mute">votes</span></span><span className="text-sm text-mute">{pct}%</span></span>
                    <span className="mt-2 block h-2 overflow-hidden rounded-full bg-pitch-950"><span className="block h-full rounded-full bg-gold" style={{ width: pct + "%" }} /></span>
                    {open && <span className="mt-auto block pt-4"><span className={`block rounded-xl py-3 text-center text-base font-bold ${on ? "bg-gold text-pitch-950" : "border border-line text-chalk"}`}>{on ? "Selected" : "Vote"}</span></span>}
                  </span>
                </button>
                <button type="button" aria-label={`Share ${pl.name}`} onClick={() => shareItem(pl)}
                  className="absolute right-3 top-3 z-10 grid h-9 w-9 place-items-center rounded-full bg-black/70 text-chalk backdrop-blur transition hover:text-gold active:scale-95">
                  <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" /><path d="M8.6 10.5l6.8-4M8.6 13.5l6.8 4" /></svg>
                </button>
              </li>
            );
          })}
        </ul>

        <p className="mt-8 text-xs leading-relaxed text-mute">
          A note on the numbers: totals include {fmt(poll.players.reduce((s: number, x: any) => s + x.seededVotes, 0))} baseline votes added by the admin. These are not genuine public votes.
          Real paid votes in this poll: {fmt(poll.players.reduce((s: number, x: any) => s + x.realVotes, 0))}.
        </p>

        {sheetOpen && sel && (
          <div className="fixed inset-x-0 bottom-0 z-40 animate-sheet border-t border-line bg-pitch-900/95 backdrop-blur-md">
            <div className="mx-auto max-w-3xl space-y-3 px-4 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-4">
              <div className="flex items-center justify-between gap-3">
                <p className="min-w-0 truncate text-sm text-mute">You’re backing <b className="text-chalk">{sel.name}</b></p>
                <button onClick={() => setSelId(null)} className="text-sm font-semibold text-mute underline underline-offset-4">Clear</button>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex items-center overflow-hidden rounded-xl border border-line">
                  <button aria-label="Fewer votes" onClick={() => setVotes(v => Math.max(1, v - 1))} className="h-11 w-11 text-xl font-bold hover:bg-pitch-700">−</button>
                  <input aria-label="Number of votes" type="number" inputMode="numeric" min={1} step={1} value={votes}
                    onChange={e => setVotes(Math.max(1, Math.floor(+e.target.value || 1)))} className="h-11 w-16 bg-transparent text-center text-base font-bold" />
                  <button aria-label="More votes" onClick={() => setVotes(v => v + 1)} className="h-11 w-11 text-xl font-bold hover:bg-pitch-700">+</button>
                </div>
                {[5, 10, 50].map(n => <button key={n} onClick={() => setVotes(n)} className={`h-11 flex-1 rounded-xl border text-sm font-semibold ${votes === n ? "border-gold text-gold" : "border-line text-mute"}`}>{n}</button>)}
              </div>
              <input type="email" required autoComplete="email" placeholder="Your email (for your Paystack receipt)" value={email} onChange={e => setEmail(e.target.value)} className="field" />
              <button disabled={!email || paying} onClick={pay} className="btn w-full !py-3.5 !text-base">{paying ? "Opening Paystack…" : `Pay ₦${fmt(votes * poll.pricePerVote)} for ${fmt(votes)} ${votes === 1 ? "vote" : "votes"}`}</button>
            </div>
          </div>
        )}
      </main>

      <PayPopup pay={payRef} />
      <Popup open={!!msg && payRef.status === "idle"} busy={paying && !!msg} onOk={() => setMsg("")}>{msg}</Popup>
      <Popup open={annPending && !msg && payRef.status === "idle"} title="Announcement" onOk={() => { markSeen(annKey); setAnnPending(false); }}>{annBody}</Popup>
      <NoticePopups hold={payRef.status !== "idle" || !!msg || annPending} />
    </>
  );
}
