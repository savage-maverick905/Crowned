"use client";
import { useCallback, useEffect, useState } from "react";
import InstallPrompt from "@/components/InstallPrompt";
import ShareButton from "@/components/ShareButton";

async function call(path: string, method = "GET", body?: any) {
  try {
    const r = await fetch("/api/partner/" + path, { method, headers: { "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined });
    const data: any = await r.json().catch(() => ({}));
    return { ok: r.ok, status: r.status, data };
  } catch { return { ok: false, status: 0, data: { error: "Network error. Check your connection." } }; }
}
const naira = (k: number) => "₦" + ((k || 0) / 100).toLocaleString("en-NG", { maximumFractionDigits: 2 });
const when = (iso: string) => new Date(iso).toLocaleString("en-NG", { dateStyle: "medium", timeStyle: "short" });
const TABS = [["home", "Overview"], ["links", "My links"], ["pay", "Payments"], ["acct", "Account"]] as const;
const blueBtn = "inline-flex items-center justify-center rounded-xl bg-blue-500 px-4 py-2.5 text-sm font-bold text-white transition active:scale-[.98] disabled:opacity-40";
const blueGhost = "inline-flex items-center justify-center rounded-xl border border-blue-400/40 px-3 py-1.5 text-xs font-semibold text-blue-300 transition hover:bg-blue-500/10";

function Links({ code, polls }: { code: string; polls: { id: string; title: string }[] }) {
  const [msg, setMsg] = useState("");
  const rows = [{ id: "", title: "All polls (home page)", path: `/?via=${code}` }, ...polls.map(p => ({ id: p.id, title: p.title, path: `/poll/${p.id}?via=${code}` }))];
  async function copy(path: string) { const l = location.origin + path; try { await navigator.clipboard.writeText(l); setMsg("Link copied."); } catch { setMsg("Couldn't copy. Link: " + l); } }
  return (
    <section className="card space-y-3">
      <p className="text-sm text-mute">Anyone who votes after opening one of these links earns you a commission. Share the link for the poll you want people to vote in.</p>
      {msg && <p role="status" className="rounded-xl border border-blue-400/40 bg-blue-950/40 p-2 text-sm text-blue-200">{msg}</p>}
      <ul className="divide-y divide-line">
        {rows.map(r => <li key={r.id || "home"} className="flex flex-wrap items-center gap-2 py-3">
          <span className="min-w-0 flex-1 truncate text-sm font-semibold">{r.title}</span>
          <button className={blueGhost} onClick={() => copy(r.path)}>Copy link</button>
          <ShareButton title={r.title} path={r.path} className={blueGhost} />
        </li>)}
      </ul>
      {polls.length === 0 && <p className="text-sm text-mute">No polls are open right now. Your links for new polls will appear here.</p>}
    </section>
  );
}

function Account({ notify }: { notify: (ok: boolean, t: string) => void }) {
  const [cur, setCur] = useState(""); const [nw, setNw] = useState(""); const [busy, setBusy] = useState(false);
  async function submit(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); const r = await call("password", "POST", { current: cur, next: nw }); setBusy(false);
    notify(r.ok, r.ok ? "Password changed." : r.data.error || "Failed."); if (r.ok) { setCur(""); setNw(""); }
  }
  return (
    <form onSubmit={submit} className="card space-y-3">
      <h2 className="font-display text-lg font-bold">Change password</h2>
      <label className="block"><span className="mb-1 block text-sm font-medium">Current password</span><input className="field" type="password" required autoComplete="current-password" value={cur} onChange={e => setCur(e.target.value)} /></label>
      <label className="block"><span className="mb-1 block text-sm font-medium">New password (8+ characters)</span><input className="field" type="password" required minLength={8} autoComplete="new-password" value={nw} onChange={e => setNw(e.target.value)} /></label>
      <button className={blueBtn + " w-full"} disabled={busy}>{busy ? "Saving…" : "Change password"}</button>
    </form>
  );
}

export default function PartnerPanel() {
  const [d, setD] = useState<any>(undefined); const [tab, setTab] = useState<string>("home");
  const [email, setEmail] = useState(""); const [pw, setPw] = useState(""); const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [signup, setSignup] = useState(false); const [nm, setNm] = useState(""); const [sent, setSent] = useState(false);
  const load = useCallback(async () => { const r = await call("me"); setD(r.ok ? r.data : null); }, []);
  useEffect(() => { load(); }, [load]);
  const notify = useCallback((ok: boolean, text: string) => setMsg({ ok, text }), []);
  const install = <InstallPrompt name="Crowned Partners" storageKey="crowned-partner-install-snoozed" blurb="Open your earnings straight from your home screen." />;

  async function login(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setMsg(null); const r = await call("login", "POST", { email, password: pw }); setBusy(false);
    if (r.ok) { setPw(""); await load(); } else setMsg({ ok: false, text: r.data.error || "Couldn't sign in." });
  }
  async function register(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setMsg(null); const r = await call("signup", "POST", { name: nm, email, password: pw }); setBusy(false);
    if (r.ok) { setSent(true); setPw(""); } else setMsg({ ok: false, text: r.data.error || "Couldn't create the account." });
  }
  async function logout() { await call("logout", "POST", {}); setD(null); setMsg(null); setTab("home"); }

  if (d === undefined) return <main className="grid min-h-[60dvh] place-items-center text-mute">Loading…</main>;
  if (!d) return (
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center px-4 py-10">
      <h1 className="font-display text-3xl font-extrabold text-blue-400">Crowned Partners</h1>
      <p className="mt-1 text-mute">Sign in to see your referral earnings.</p>
      <div className="mt-3 self-start">{install}</div>
      {sent ? <div className="card mt-6 space-y-3"><p className="font-semibold text-blue-300">Application sent ✓</p><p className="text-sm text-mute">An admin will review it. You can sign in once you've been approved.</p>
          <button className={blueGhost} onClick={() => { setSent(false); setSignup(false); }}>Back to sign in</button></div>
      : <form onSubmit={signup ? register : login} className="card mt-6 space-y-4">
        {signup && <label className="block"><span className="mb-1 block text-sm font-medium">Your name</span><input className="field" required maxLength={80} value={nm} onChange={e => setNm(e.target.value)} /></label>}
        <label className="block"><span className="mb-1 block text-sm font-medium">Email</span><input className="field" type="email" autoComplete="username" required value={email} onChange={e => setEmail(e.target.value)} /></label>
        <label className="block"><span className="mb-1 block text-sm font-medium">Password{signup ? " (8+ characters)" : ""}</span><input className="field" type="password" autoComplete={signup ? "new-password" : "current-password"} required minLength={signup ? 8 : undefined} value={pw} onChange={e => setPw(e.target.value)} /></label>
        {msg && <p role="alert" className="rounded-xl border border-red-400/50 bg-red-950/60 p-3 text-sm text-red-200">{msg.text}</p>}
        <button className={blueBtn + " w-full !py-3"} disabled={busy}>{busy ? "Please wait…" : signup ? "Apply to become a partner" : "Sign in"}</button>
        <button type="button" className="w-full text-center text-sm text-blue-300 underline" onClick={() => { setSignup(x => !x); setMsg(null); }}>{signup ? "I already have an account" : "New here? Create an account"}</button>
      </form>}
    </main>
  );

  const s = d.stats;
  return (
    <main className="mx-auto max-w-3xl px-4 pb-20 pt-[max(1rem,env(safe-area-inset-top))]">
      <header className="flex items-center justify-between py-3">
        <div><h1 className="font-display text-2xl font-extrabold text-blue-400">Crowned Partners</h1><span className="mt-1 block text-sm text-mute">{d.partner.name} · {d.partner.commissionPct}% commission</span></div>
        <div className="flex items-center gap-2">{install}<button onClick={logout} className="btn-ghost">Sign out</button></div>
      </header>
      <nav aria-label="Sections" className="-mx-4 mt-2 flex gap-2 overflow-x-auto px-4 pb-2">
        {TABS.map(([id, label]) => <button key={id} onClick={() => { setTab(id); setMsg(null); }} aria-current={tab === id}
          className={`shrink-0 rounded-full border px-4 py-2 text-sm font-semibold ${tab === id ? "border-blue-500 bg-blue-500 text-white" : "border-line text-mute"}`}>{label}</button>)}
      </nav>
      {msg && <p role="status" className={`sticky top-2 z-30 mt-3 rounded-xl border p-3 text-sm backdrop-blur ${msg.ok ? "border-blue-400/50 bg-pitch-800/95" : "border-red-400/50 bg-red-950/90 text-red-200"}`}>{msg.text}</p>}

      <div className="mt-4 space-y-4">
        {tab === "home" && <>
          <div className="flex items-center justify-between"><p className="text-sm text-mute">Only confirmed payments are counted.</p><button onClick={load} className={blueGhost}>Refresh</button></div>
          <section className="card text-center"><p className="text-sm text-mute">Balance to be paid out</p><p className="font-display text-4xl font-extrabold text-blue-400">{naira(s.balance)}</p></section>
          <dl className="grid grid-cols-2 gap-2 text-center sm:grid-cols-4">
            {[["Total earned", naira(s.earned)], ["Paid out", naira(s.paid)], ["Payments", String(s.payments)], ["Votes brought", s.votes.toLocaleString("en-NG")]].map(([k, v]) =>
              <div key={k} className="rounded-xl bg-pitch-900 p-3"><dt className="text-xs text-mute">{k}</dt><dd className="font-display text-lg font-bold">{v}</dd></div>)}
          </dl>
        </>}
        {tab === "links" && <Links code={d.partner.code} polls={d.polls} />}
        {tab === "pay" && <>
          <section className="card"><h2 className="font-display text-lg font-bold">Payments through your links</h2>
            {d.payments.length === 0 && <p className="mt-2 text-sm text-mute">No payments yet. Share your links to get started.</p>}
            <ul className="mt-2 divide-y divide-line">{d.payments.map((p: any) => <li key={p.id} className="flex items-start justify-between gap-3 py-3 text-sm">
              <span className="min-w-0"><span className="block truncate font-semibold">{p.votes.toLocaleString("en-NG")} votes · {p.item || "—"}</span>
                <span className="block truncate text-xs text-mute">{p.poll} · {p.who} · {when(p.at)}</span></span>
              <span className="shrink-0 text-right"><span className="block font-bold text-blue-300">+{naira(p.commissionKobo)}</span><span className="block text-xs text-mute">of {naira(p.amountKobo)}{p.pct != null ? ` · ${p.pct}%` : ""}</span></span></li>)}</ul></section>
          <section className="card"><h2 className="font-display text-lg font-bold">Payouts you've received</h2>
            {d.payouts.length === 0 && <p className="mt-2 text-sm text-mute">No payouts yet.</p>}
            <ul className="mt-2 divide-y divide-line">{d.payouts.map((p: any) => <li key={p.id} className="flex items-center justify-between gap-3 py-3 text-sm">
              <span className="min-w-0"><span className="block text-xs text-mute">{when(p.at)}</span>{p.note && <span className="block truncate">{p.note}</span>}</span>
              <span className="font-bold">{naira(p.amountKobo)}</span></li>)}</ul></section>
        </>}
        {tab === "acct" && <>
          <section className="card text-sm"><p className="text-mute">Signed in as</p><p className="font-semibold">{d.partner.email}</p>
            <p className="mt-2 text-mute">Your commission</p><p className="font-semibold">{d.partner.commissionPct}% of each confirmed payment</p></section>
          <Account notify={notify} />
        </>}
      </div>
    </main>
  );
}
