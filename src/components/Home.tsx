"use client";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import InstallPrompt from "./InstallPrompt";
import Crown from "./Crown";
import SearchBox from "./SearchBox";
import Countdown from "./Countdown";
import { PayPopup } from "./Popup";
import NoticePopups from "./NoticePopups";
import { usePayRef } from "@/lib/usePayRef";

const fmt = (n: number) => (n || 0).toLocaleString("en-NG");

export default function Home({ preview = false }: { preview?: boolean }) {
  const [polls, setPolls] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [q, setQ] = useState(""); const [skew, setSkew] = useState(0);
  const pay = usePayRef();

  useEffect(() => {
    fetch("/api/polls").then(r => r.json()).then(d => { setPolls(d.polls || []); if (d.serverNow) setSkew(d.serverNow - Date.now()); })
      .catch(() => setErr("We couldn’t load the polls. Check your connection and try again.")).finally(() => setLoading(false));
  }, []);

  const shown = useMemo(() => {
    const s = q.trim().toLowerCase();
    const list = s ? polls.filter(p => `${p.title} ${p.description || ""}`.toLowerCase().includes(s)) : polls;
    return [...list].sort((a, b) => (a.status === "open" ? 0 : 1) - (b.status === "open" ? 0 : 1));
  }, [polls, q]);

  return (
    <main className="mx-auto max-w-5xl px-4 pb-16 pt-[max(1rem,env(safe-area-inset-top))]">
      <header className="flex items-center justify-between py-3">
        <h1 className="flex items-center gap-2 font-display text-2xl font-extrabold tracking-tight">
          <Crown className="h-6 w-6 text-gold" />Crowned
        </h1>
        <InstallPrompt />
      </header>

      <section className="pb-2 pt-6 sm:pt-10">
        <h2 className="max-w-xl font-display text-4xl font-extrabold leading-[1.05] tracking-tight sm:text-5xl">Back your <span className="text-gold">greatest.</span></h2>
        <p className="mt-3 max-w-md text-base text-mute">Pick a poll, back your favourite, and help crown a champion. Every vote is paid for and counted.</p>
      </section>

      {preview && <p className="mt-4 rounded-xl border border-gold/40 bg-gold/10 p-3 text-sm text-gold">Preview mode: this is exactly what visitors see. Payments here are live.</p>}
      {err && <p role="alert" className="mt-4 rounded-xl border border-red-400/50 bg-red-950/60 p-3 text-sm text-red-200">{err}</p>}

      <div className="mt-6"><SearchBox value={q} onChange={setQ} placeholder="Search for a poll…" /></div>

      {loading && <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3" aria-busy="true">{[0, 1, 2].map(i => <div key={i} className="h-64 animate-pulse rounded-2xl bg-pitch-800" />)}</div>}
      {!loading && !err && polls.length === 0 && <p className="card mt-6 text-center text-mute">Nothing to vote on just yet. New polls are on the way, so check back soon.</p>}
      {!loading && polls.length > 0 && shown.length === 0 && <p className="card mt-6 text-center text-mute">Nothing found for “{q}”. Try a different word.</p>}

      <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {shown.map(p => {
          const open = p.status === "open";
          return (
            <li key={p.id}>
              <Link href={`/poll/${p.id}`} className="group block overflow-hidden rounded-2xl border border-line bg-pitch-900 transition hover:-translate-y-0.5 hover:border-gold/60">
                <div className="relative aspect-[16/10] w-full overflow-hidden bg-pitch-800">
                  {p.coverUrl
                    ? <img src={p.coverUrl} alt="" className="h-full w-full object-cover transition duration-300 group-hover:scale-105" loading="lazy" referrerPolicy="no-referrer" />
                    : <div className="grid h-full w-full place-items-center bg-gradient-to-br from-pitch-700 to-pitch-900"><Crown className="h-14 w-14 text-gold/70" /></div>}
                  <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/60 to-transparent" />
                  <span className={`absolute left-3 top-3 rounded-full px-2.5 py-1 text-xs font-bold backdrop-blur ${open ? "bg-gold text-pitch-950" : "bg-black/70 text-mute"}`}>{open ? "Voting open" : "Closed"}</span>
                </div>
                <div className="p-4">
                  <h3 className="font-display text-xl font-bold leading-tight">{p.title}</h3>
                  {p.description && <p className="mt-1 truncate text-sm text-mute">{p.description}</p>}
                  <p className="mt-3 text-sm text-mute">{fmt(p.itemCount)} {p.itemCount === 1 ? p.itemSingular : p.itemPlural} · {fmt(p.totalVotes)} votes</p>
                  {open && p.endsAt && <p className="mt-1 text-sm font-semibold text-gold"><Countdown endsAt={p.endsAt} skew={skew} compact /></p>}
                  {p.leader && <p className="mt-1 flex items-center gap-1.5 text-sm"><Crown className="h-4 w-4 text-gold" /><span className="truncate"><b>{p.leader}</b> is leading</span></p>}
                  <div className="mt-4 flex items-center justify-between">
                    <span className="text-sm font-semibold text-gold">₦{fmt(p.pricePerVote)} <span className="font-normal text-mute">per vote</span></span>
                    <span className="text-sm font-semibold text-chalk transition group-hover:translate-x-0.5">{open ? "Vote now →" : "See results →"}</span>
                  </div>
                </div>
              </Link>
            </li>
          );
        })}
      </ul>

      <PayPopup pay={pay} />
      <NoticePopups hold={pay.status !== "idle"} />
    </main>
  );
}
