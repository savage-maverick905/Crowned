"use client";
import { useCallback, useEffect, useState } from "react";
import RichHtml from "@/components/RichHtml";
import ImageField from "@/components/ImageField";
import InstallPrompt from "@/components/InstallPrompt";

async function call(path: string, method = "GET", body?: any) {
  try {
    const r = await fetch("/api/admin/" + path, { method, headers: { "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined });
    const data: any = await r.json().catch(() => ({}));
    if (!r.ok && !data.error) data.error = r.status === 403 || r.status === 401 ? "Not allowed for your role, or your session expired." : `Server error (${r.status}).`;
    return { ok: r.ok, status: r.status, data };
  } catch { return { ok: false, status: 0, data: { error: "Network error. Check your connection." } }; }
}

type Role = "superadmin" | "editor" | "analyst";
type Notify = (ok: boolean, text: string) => void;
const ALL: Role[] = ["superadmin", "editor", "analyst"]; const EDIT: Role[] = ["superadmin", "editor"];
const TABS: { id: string; label: string; roles: Role[] }[] = [
  { id: "stats", label: "Analytics", roles: ALL }, { id: "polls", label: "Polls", roles: EDIT },
  { id: "notices", label: "Notices", roles: EDIT }, { id: "payments", label: "Payments", roles: ALL }, { id: "partners", label: "Partners", roles: ["superadmin"] }, { id: "admins", label: "Admins", roles: ["superadmin"] },
  { id: "audit", label: "Audit log", roles: ["superadmin", "analyst"] }, { id: "data", label: "Data cleanup", roles: ["superadmin"] }, { id: "account", label: "My account", roles: ALL },
];
const fmt = (n: number) => (n || 0).toLocaleString("en-NG");
const toLocal = (iso?: string) => { if (!iso) return ""; const d = new Date(iso); if (isNaN(+d)) return ""; const z = (n: number) => String(n).padStart(2, "0"); return `${d.getFullYear()}-${z(d.getMonth() + 1)}-${z(d.getDate())}T${z(d.getHours())}:${z(d.getMinutes())}`; };

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return <label className="block"><span className="mb-1 block text-sm font-medium text-chalk">{label}</span>{children}{hint && <span className="mt-1 block text-xs text-mute">{hint}</span>}</label>;
}

function Thumb({ src, name, cls = "h-12 w-12" }: { src?: string; name?: string; cls?: string }) {
  return src
    ? <img src={src} alt="" className={`${cls} shrink-0 rounded-xl object-cover`} referrerPolicy="no-referrer" />
    : <span className={`${cls} grid shrink-0 place-items-center rounded-xl bg-pitch-700 font-display text-lg font-bold text-gold/80`}>{name?.[0] || "?"}</span>;
}

function StatusChip({ s }: { s: string }) {
  return <span className={`chip ${s === "open" ? "!border-gold/60 !text-gold" : ""}`}>{s}</span>;
}

async function copyText(text: string, notify: Notify, okText = "Link copied.") {
  try { await navigator.clipboard.writeText(text); notify(true, okText); } catch { notify(false, "Couldn't copy automatically. Link: " + text); }
}

/** Plain text + custom HTML + CSS fields with a live (sandboxed) preview. Shared by notices and poll announcements. */
function RichFields({ text, setText, html, setHtml, css, setCss, textMax = 1000 }: { text: string; setText: (v: string) => void; html: string; setHtml: (v: string) => void; css: string; setCss: (v: string) => void; textMax?: number }) {
  const [prev, setPrev] = useState(false);
  return (
    <>
      <Field label="Plain message" hint="Shown when the HTML box below is empty."><textarea className="field min-h-[72px]" maxLength={textMax} value={text} onChange={e => setText(e.target.value)} /></Field>
      <Field label="Custom HTML (optional)" hint="Headings, buttons, links, tables, images (https only). Scripts never run. If filled, this is shown instead of the plain message.">
        <textarea className="field min-h-[130px] font-mono !text-sm" spellCheck={false} autoCapitalize="off" maxLength={20000} value={html} onChange={e => setHtml(e.target.value)} placeholder={'<div class="box"><h3>Finals tonight!</h3><a href="https://…">Watch live</a></div>'} />
      </Field>
      <Field label="Custom CSS (optional)" hint="Styles the HTML above only.">
        <textarea className="field min-h-[100px] font-mono !text-sm" spellCheck={false} autoCapitalize="off" maxLength={8000} value={css} onChange={e => setCss(e.target.value)} placeholder={".box{padding:16px;border-radius:14px;background:#f5c451;color:#111}"} />
      </Field>
      <button type="button" className="btn-ghost !px-3 !py-1.5 !text-xs" onClick={() => setPrev(p => !p)}>{prev ? "Hide preview" : "Preview"}</button>
      {prev && <div className="rounded-xl border border-line bg-pitch-800 p-4">{html.trim() ? <RichHtml html={html} css={css} /> : <p className="whitespace-pre-line text-sm text-mute">{text || "Nothing to preview yet."}</p>}</div>}
    </>
  );
}

/* ---------- one item (player) row: edit / baseline / delete ---------- */
function ItemRow({ it, one, pollId, notify, reload }: { it: any; one: string; pollId: string; notify: Notify; reload: () => void }) {
  const [mode, setMode] = useState<"" | "edit" | "base">("");
  const [name, setName] = useState(it.name || ""); const [edition, setEdition] = useState(it.edition || ""); const [img, setImg] = useState(it.imageUrl || "");
  const [delta, setDelta] = useState(""); const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);

  async function run(path: string, method: string, body: any, okText: string) {
    setBusy(true); const r = await call(path, method, body); setBusy(false);
    notify(r.ok, r.ok ? okText : r.data.error || "Failed.");
    if (r.ok) { setMode(""); setDelta(""); setReason(""); reload(); }
  }

  return (
    <li className="py-3">
      <div className="flex items-center gap-3">
        <Thumb src={it.imageUrl} name={it.name} />
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold">{it.name}{it.edition ? <span className="font-normal text-mute"> · {it.edition}</span> : null}</p>
          <p className="text-xs text-mute">{fmt(it.total)} total · real {fmt(it.realVotes)} · baseline {fmt(it.seededVotes)}</p>
        </div>
      </div>
      <div className="mt-2 flex flex-wrap gap-2">
        <button className="btn-ghost !px-3 !py-1.5 !text-xs" onClick={() => setMode(mode === "edit" ? "" : "edit")}>Edit</button>
        <button className="btn-ghost !px-3 !py-1.5 !text-xs" onClick={() => setMode(mode === "base" ? "" : "base")}>Baseline</button>
        <button className="btn-ghost !px-3 !py-1.5 !text-xs" onClick={() => copyText(`${location.origin}/poll/${pollId}?item=${it.id}`, notify, `Share link for ${it.name} copied.`)}>Copy link</button>
        <button className="btn-danger !px-3 !py-1.5 !text-xs" disabled={busy}
          onClick={() => {
            const m = it.realVotes > 0 ? `“${it.name}” has ${fmt(it.realVotes)} paid votes. Deleting removes it from the app for good. Payment records stay in your database and Paystack, but it disappears from Analytics. Delete anyway?` : `Delete “${it.name}”? This can't be undone.`;
            if (confirm(m)) run("players", "DELETE", { id: it.id, force: true }, "Deleted.");
          }}>Delete</button>
      </div>

      {mode === "edit" && (
        <form className="mt-3 space-y-3 rounded-xl bg-pitch-950 p-3" onSubmit={e => { e.preventDefault(); run("players", "PATCH", { id: it.id, name, edition, imageUrl: img }, "Saved."); }}>
          <Field label="Name"><input className="field" required value={name} onChange={e => setName(e.target.value)} /></Field>
          <Field label="Label (optional)" hint="Small text under the name, e.g. a year or club."><input className="field" value={edition} onChange={e => setEdition(e.target.value)} /></Field>
          <ImageField label="Image" value={img} onChange={setImg} />
          <button className="btn w-full" disabled={busy}>Save {one.toLowerCase()}</button>
        </form>
      )}
      {mode === "base" && (
        <form className="mt-3 space-y-3 rounded-xl bg-pitch-950 p-3" onSubmit={e => { e.preventDefault(); run("seeded", "POST", { playerId: it.id, delta: parseInt(delta), reason }, "Baseline adjusted."); }}>
          <p className="text-xs text-mute">Baseline never touches real paid votes. Every change is logged.</p>
          <Field label="Votes to add" hint="Use a minus to remove, e.g. -50"><input className="field" type="number" required inputMode="numeric" value={delta} onChange={e => setDelta(e.target.value)} /></Field>
          <Field label="Reason (required)"><input className="field" required value={reason} onChange={e => setReason(e.target.value)} /></Field>
          <button className="btn w-full" disabled={busy}>Apply</button>
        </form>
      )}
    </li>
  );
}

/* ---------- add item form ---------- */
function AddItem({ pollId, one, notify, reload }: { pollId: string; one: string; notify: Notify; reload: () => void }) {
  const [name, setName] = useState(""); const [edition, setEdition] = useState(""); const [img, setImg] = useState(""); const [busy, setBusy] = useState(false);
  async function submit(e: React.FormEvent) {
    e.preventDefault(); setBusy(true);
    const r = await call("players", "POST", { pollId, name, edition: edition || undefined, imageUrl: img || undefined }); setBusy(false);
    notify(r.ok, r.ok ? `${one} added.` : r.data.error || "Failed.");
    if (r.ok) { setName(""); setEdition(""); setImg(""); reload(); }
  }
  return (
    <form onSubmit={submit} className="space-y-3 rounded-xl border border-dashed border-line p-3">
      <p className="text-sm font-semibold">Add {one.toLowerCase()}</p>
      <Field label="Name"><input className="field" required value={name} onChange={e => setName(e.target.value)} /></Field>
      <Field label="Label (optional)"><input className="field" value={edition} onChange={e => setEdition(e.target.value)} /></Field>
      <ImageField label="Image (optional)" value={img} onChange={setImg} />
      <button className="btn w-full" disabled={busy}>Add {one.toLowerCase()}</button>
    </form>
  );
}

/* ---------- one poll: details, items, delete ---------- */
function PollCard({ poll, notify, reload }: { poll: any; notify: Notify; reload: () => void }) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState(poll.title || ""); const [description, setDescription] = useState(poll.description || "");
  const [cover, setCover] = useState(poll.coverUrl || ""); const [one, setOne] = useState(poll.itemSingular || "Item"); const [many, setMany] = useState(poll.itemPlural || "Items");
  const [price, setPrice] = useState(String(poll.pricePerVote ?? 100)); const [status, setStatus] = useState(poll.status || "draft"); const [ann, setAnn] = useState(poll.announcement || "");
  const [annHtml, setAnnHtml] = useState(poll.announcementHtml || ""); const [annCss, setAnnCss] = useState(poll.announcementCss || ""); const [annMode, setAnnMode] = useState(poll.announcementMode || "popup");
  const [ends, setEnds] = useState(toLocal(poll.endsAt));
  const [busy, setBusy] = useState(false);
  const players: any[] = poll.players || [];

  async function save(e: React.FormEvent) {
    e.preventDefault(); setBusy(true);
    const r = await call("polls", "PATCH", { id: poll.id, title, description, coverUrl: cover, itemSingular: one, itemPlural: many, pricePerVote: +price || 100, status, announcement: ann, announcementHtml: annHtml, announcementCss: annCss, announcementMode: annMode, endsAt: ends ? new Date(ends).toISOString() : null });
    setBusy(false); notify(r.ok, r.ok ? "Poll saved." : r.data.error || "Failed."); if (r.ok) reload();
  }
  async function annAction(clear: boolean) {
    if (clear && !confirm("Remove the announcement for everyone? It disappears from the poll straight away.")) return;
    setBusy(true);
    const r = await call("polls", "PATCH", clear ? { id: poll.id, announcement: "", announcementHtml: "", announcementCss: "" } : { id: poll.id, announcement: ann, announcementHtml: annHtml, announcementCss: annCss, announcementMode: annMode, resendAnnouncement: true });
    setBusy(false); notify(r.ok, r.ok ? (clear ? "Announcement removed." : "Saved. Everyone will see the announcement again.") : r.data.error || "Failed.");
    if (r.ok) { if (clear) { setAnn(""); setAnnHtml(""); setAnnCss(""); } reload(); }
  }
  async function del() {
    const paid = players.reduce((s, x) => s + (x.realVotes || 0), 0);
    const m = paid > 0
      ? `This poll has ${fmt(paid)} paid votes. Deleting removes the poll and all its ${many.toLowerCase()} from the app for good. Payment records stay in your database and Paystack, but the poll disappears from Analytics. Delete anyway?`
      : `Delete the poll “${poll.title}” and all its ${many.toLowerCase()}? This can't be undone.`;
    if (!confirm(m)) return;
    setBusy(true); const r = await call("polls", "DELETE", { id: poll.id, force: true }); setBusy(false);
    notify(r.ok, r.ok ? "Poll deleted." : r.data.error || "Failed."); if (r.ok) reload();
  }

  return (
    <section className="overflow-hidden rounded-2xl border border-line bg-pitch-900">
      <button className="flex w-full items-center gap-3 p-3 text-left" onClick={() => setOpen(o => !o)} aria-expanded={open}>
        <Thumb src={poll.coverUrl} name={poll.title} cls="h-14 w-14" />
        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-center gap-2"><span className="truncate font-display text-lg font-bold">{poll.title}</span><StatusChip s={poll.status} /></span>
          <span className="block text-xs text-mute">{players.length} {players.length === 1 ? one.toLowerCase() : many.toLowerCase()} · ₦{fmt(poll.pricePerVote)} per vote{poll.endsAt ? ` · ${new Date(poll.endsAt) < new Date() ? "ended" : "ends"} ${new Date(poll.endsAt).toLocaleString()}` : ""}</span>
        </span>
        <span aria-hidden="true" className={`text-mute transition ${open ? "rotate-180" : ""}`}>▾</span>
      </button>

      {open && (
        <div className="space-y-5 border-t border-line p-3">
          <form onSubmit={save} className="space-y-3">
            <div className="flex items-center justify-between gap-2"><h3 className="font-display text-base font-bold">Poll details</h3><button type="button" className="btn-ghost !px-3 !py-1.5 !text-xs" onClick={() => copyText(`${location.origin}/poll/${poll.id}`, notify, "Poll link copied.")}>Copy poll link</button></div>
            <Field label="Title"><input className="field" required minLength={2} value={title} onChange={e => setTitle(e.target.value)} /></Field>
            <Field label="Description (optional)"><textarea className="field min-h-[72px]" value={description} onChange={e => setDescription(e.target.value)} /></Field>
            <ImageField label="Cover image (optional)" value={cover} onChange={setCover} maxSide={960} hint="If empty, the first item's image is used." />
            <div className="grid grid-cols-2 gap-3">
              <Field label="Item name (singular)" hint="e.g. Player"><input className="field" required maxLength={30} value={one} onChange={e => setOne(e.target.value)} /></Field>
              <Field label="Item name (plural)" hint="e.g. Players"><input className="field" required maxLength={30} value={many} onChange={e => setMany(e.target.value)} /></Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Price per vote (₦)"><input className="field" type="number" min={1} inputMode="numeric" value={price} onChange={e => setPrice(e.target.value)} /></Field>
              <Field label="Status"><select className="field" value={status} onChange={e => setStatus(e.target.value)}><option value="draft">Draft (hidden)</option><option value="open">Open</option><option value="closed">Closed</option></select></Field>
            </div>
            <Field label="Voting deadline (optional)" hint="Voting closes automatically at this time and a countdown shows on the poll. To reopen an ended poll, set a new time or remove the deadline.">
              <input className="field" type="datetime-local" value={ends} onChange={e => setEnds(e.target.value)} />
            </Field>
            {ends && <button type="button" className="text-sm text-mute underline" onClick={() => setEnds("")}>Remove deadline</button>}
            <div className="space-y-3 rounded-xl border border-line p-3">
              <h4 className="font-display text-sm font-bold">Announcement (optional)</h4>
              <RichFields text={ann} setText={setAnn} html={annHtml} setHtml={setAnnHtml} css={annCss} setCss={setAnnCss} textMax={500} />
              <Field label="How it appears" hint="Popup: each visitor presses OK once and doesn't see it again. Inline: always shown in a box on the poll.">
                <select className="field" value={annMode} onChange={e => setAnnMode(e.target.value)}><option value="popup">Popup (once per visitor)</option><option value="inline">Inline box (always visible)</option></select>
              </Field>
              <div className="flex flex-wrap gap-2">
                <button type="button" className="btn-ghost !px-3 !py-1.5 !text-xs" disabled={busy} onClick={() => annAction(false)}>Save &amp; show again to everyone</button>
                <button type="button" className="btn-danger !px-3 !py-1.5 !text-xs" disabled={busy || !(ann || annHtml)} onClick={() => annAction(true)}>Remove announcement</button>
              </div>
              <p className="text-xs text-mute">“Save poll” also saves this. Edited announcements show again automatically.</p>
            </div>
            <button className="btn w-full" disabled={busy}>Save poll</button>
          </form>

          <div>
            <h3 className="font-display text-base font-bold">{many}</h3>
            {players.length === 0 && <p className="mt-2 text-sm text-mute">No {many.toLowerCase()} yet.</p>}
            <ul className="mt-1 divide-y divide-line">{players.map(it => <ItemRow key={it.id} it={it} one={one} pollId={poll.id} notify={notify} reload={reload} />)}</ul>
            <div className="mt-3"><AddItem pollId={poll.id} one={one} notify={notify} reload={reload} /></div>
          </div>

          <div className="rounded-xl border border-red-400/30 p-3">
            <p className="text-sm font-semibold text-red-200">Delete this poll</p>
            <p className="mt-1 text-xs text-mute">Permanently removes the poll and all its {many.toLowerCase()}. If it has paid votes, the payment records stay in the database but the poll disappears from Analytics. Only a superadmin can delete polls with paid votes.</p>
            <button className="btn-danger mt-3 w-full" disabled={busy} onClick={del}>Delete poll</button>
          </div>
        </div>
      )}
    </section>
  );
}

/* ---------- new poll ---------- */
function NewPoll({ notify, reload }: { notify: Notify; reload: () => void }) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState(""); const [description, setDescription] = useState(""); const [cover, setCover] = useState("");
  const [one, setOne] = useState("Player"); const [many, setMany] = useState("Players"); const [price, setPrice] = useState("100"); const [ends, setEnds] = useState(""); const [busy, setBusy] = useState(false);
  async function submit(e: React.FormEvent) {
    e.preventDefault(); setBusy(true);
    const r = await call("polls", "POST", { title, description: description || undefined, coverUrl: cover || undefined, itemSingular: one, itemPlural: many, pricePerVote: +price || 100, endsAt: ends ? new Date(ends).toISOString() : undefined });
    setBusy(false); notify(r.ok, r.ok ? "Poll created as a draft. Open it below to add items and publish." : r.data.error || "Failed.");
    if (r.ok) { setTitle(""); setDescription(""); setCover(""); setEnds(""); setOpen(false); reload(); }
  }
  if (!open) return <button className="btn w-full" onClick={() => setOpen(true)}>+ New poll</button>;
  return (
    <form onSubmit={submit} className="card space-y-3">
      <div className="flex items-center justify-between"><h2 className="font-display text-lg font-bold">New poll</h2><button type="button" className="text-sm text-mute underline" onClick={() => setOpen(false)}>Cancel</button></div>
      <Field label="Title"><input className="field" required minLength={2} value={title} onChange={e => setTitle(e.target.value)} /></Field>
      <Field label="Description (optional)"><textarea className="field min-h-[72px]" value={description} onChange={e => setDescription(e.target.value)} /></Field>
      <ImageField label="Cover image (optional)" value={cover} onChange={setCover} maxSide={960} />
      <div className="grid grid-cols-2 gap-3">
        <Field label="Item name (singular)" hint="What are people voting for?"><input className="field" required maxLength={30} value={one} onChange={e => setOne(e.target.value)} /></Field>
        <Field label="Item name (plural)"><input className="field" required maxLength={30} value={many} onChange={e => setMany(e.target.value)} /></Field>
      </div>
      <Field label="Price per vote (₦)"><input className="field" type="number" min={1} inputMode="numeric" value={price} onChange={e => setPrice(e.target.value)} /></Field>
      <Field label="Voting deadline (optional)" hint="Shows a countdown and closes voting automatically."><input className="field" type="datetime-local" value={ends} onChange={e => setEnds(e.target.value)} /></Field>
      <button className="btn w-full" disabled={busy}>Create poll</button>
    </form>
  );
}

/* ---------- notices ---------- */
function NoticeForm({ init, label, busy, onSubmit, onCancel }: { init?: any; label: string; busy: boolean; onSubmit: (v: any) => void; onCancel?: () => void }) {
  const [title, setTitle] = useState(init?.title || ""); const [text, setText] = useState(init?.text || ""); const [html, setHtml] = useState(init?.html || ""); const [css, setCss] = useState(init?.css || "");
  return (
    <form className="space-y-3" onSubmit={e => { e.preventDefault(); onSubmit({ title, text, html, css }); }}>
      <Field label="Title (optional)" hint="Heading of the popup. Defaults to “Notice”."><input className="field" maxLength={80} value={title} onChange={e => setTitle(e.target.value)} /></Field>
      <RichFields text={text} setText={setText} html={html} setHtml={setHtml} css={css} setCss={setCss} />
      <div className="flex gap-2"><button className="btn flex-1" disabled={busy || !(text.trim() || html.trim())}>{label}</button>{onCancel && <button type="button" className="btn-ghost" onClick={onCancel}>Cancel</button>}</div>
    </form>
  );
}

function Notices({ notify }: { notify: Notify }) {
  const [list, setList] = useState<any[]>([]); const [busy, setBusy] = useState(false); const [editing, setEditing] = useState(""); const [peek, setPeek] = useState("");
  const refresh = useCallback(async () => { const r = await call("notices"); if (r.ok) setList(r.data.notices || []); else notify(false, r.data.error || "Couldn't load notices."); }, [notify]);
  useEffect(() => { refresh(); }, [refresh]);
  async function run(method: string, body: any, okText: string) {
    setBusy(true); const r = await call("notices", method, body); setBusy(false);
    notify(r.ok, r.ok ? okText : r.data.error || "Failed."); if (r.ok) { setEditing(""); refresh(); } return r.ok;
  }
  return (
    <>
      <section className="card space-y-3">
        <h2 className="font-display text-lg font-bold">New notice</h2>
        <p className="text-xs text-mute">Shows as a popup. Each visitor presses OK once and doesn’t see it again unless you edit or resend it.</p>
        <NoticeForm key={list.length} label="Post notice" busy={busy} onSubmit={v => run("POST", v, "Notice posted.")} />
      </section>
      <section className="card">
        <h2 className="font-display text-lg font-bold">All notices</h2>
        <p className="mt-1 text-xs text-mute">Only the 5 newest live notices are shown to visitors. Hide to pull one back, Delete to remove it for good.</p>
        {list.length === 0 && <p className="mt-2 text-sm text-mute">Nothing posted yet.</p>}
        <ul className="mt-1 divide-y divide-line">
          {list.map(n => (
            <li key={n.id} className="py-3 text-sm">
              <div className="flex items-start gap-2">
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-center gap-2"><b className="truncate">{n.title || "Notice"}</b><span className={`chip ${n.active ? "!border-gold/60 !text-gold" : ""}`}>{n.active ? "Live" : "Hidden"}</span>{n.html && <span className="chip">HTML</span>}</span>
                  <span className="mt-1 block truncate text-mute">{n.text || "(custom HTML)"}</span>
                  <span className="text-xs text-mute">{new Date(n.createdAt).toLocaleString()}</span>
                </span>
              </div>
              <div className="mt-2 flex flex-wrap gap-2">
                <button className="btn-ghost !px-3 !py-1.5 !text-xs" onClick={() => setPeek(peek === n.id ? "" : n.id)}>{peek === n.id ? "Close preview" : "Preview"}</button>
                <button className="btn-ghost !px-3 !py-1.5 !text-xs" onClick={() => setEditing(editing === n.id ? "" : n.id)}>Edit</button>
                <button className="btn-ghost !px-3 !py-1.5 !text-xs" disabled={busy} onClick={() => run("PATCH", { id: n.id, active: !n.active }, n.active ? "Notice hidden." : "Notice is live again.")}>{n.active ? "Hide" : "Show"}</button>
                {n.active && <button className="btn-ghost !px-3 !py-1.5 !text-xs" disabled={busy} onClick={() => run("PATCH", { id: n.id, resend: true }, "Everyone will see this notice again.")}>Resend</button>}
                <button className="btn-danger !px-3 !py-1.5 !text-xs" disabled={busy} onClick={() => confirm("Delete this notice permanently? This can't be undone.") && run("DELETE", { id: n.id, permanent: true }, "Notice deleted.")}>Delete</button>
              </div>
              {peek === n.id && <div className="mt-3 rounded-xl border border-line bg-pitch-800 p-4">{n.html ? <RichHtml html={n.html} css={n.css} /> : <p className="whitespace-pre-line text-mute">{n.text}</p>}</div>}
              {editing === n.id && <div className="mt-3 rounded-xl bg-pitch-950 p-3"><NoticeForm init={n} label="Save changes (shows again)" busy={busy} onSubmit={v => run("PATCH", { id: n.id, ...v }, "Notice updated. Everyone will see it again.")} onCancel={() => setEditing("")} /></div>}
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}

/* ---------- payments ---------- */
function Payments({ polls }: { polls: any[] }) {
  const [rows, setRows] = useState<any[]>([]); const [pages, setPages] = useState(1); const [total, setTotal] = useState(0); const [page, setPage] = useState(1);
  const [status, setStatus] = useState("success"); const [pollId, setPollId] = useState(""); const [q, setQ] = useState(""); const [qa, setQa] = useState(""); const [busy, setBusy] = useState(false); const [err, setErr] = useState("");
  useEffect(() => {
    let live = true; setBusy(true);
    call(`transactions?page=${page}&status=${status}&pollId=${pollId}&q=${encodeURIComponent(qa)}`).then(r => {
      if (!live) return; setBusy(false);
      if (r.ok) { setRows(r.data.items || []); setPages(r.data.pages || 1); setTotal(r.data.total || 0); setErr(""); } else setErr(r.data.error || "Couldn't load payments.");
    });
    return () => { live = false; };
  }, [page, status, pollId, qa]);
  const chip = (s: string) => <span className={`chip ${s === "success" ? "!border-gold/60 !text-gold" : s === "failed" ? "!border-red-400/50 !text-red-300" : ""}`}>{s}</span>;
  return (
    <section className="card space-y-3">
      <h2 className="font-display text-lg font-bold">Payments</h2>
      <p className="text-xs text-mute">Read-only. Paid transactions can never be edited or deleted. “Pending” means the voter started checkout but hasn’t paid.</p>
      <div className="grid grid-cols-2 gap-2">
        <select className="field !py-2" value={status} onChange={e => { setStatus(e.target.value); setPage(1); }}><option value="success">Paid</option><option value="pending">Pending</option><option value="failed">Failed</option><option value="">All</option></select>
        <select className="field !py-2" value={pollId} onChange={e => { setPollId(e.target.value); setPage(1); }}><option value="">All polls</option>{polls.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}</select>
      </div>
      <form className="flex gap-2" onSubmit={e => { e.preventDefault(); setQa(q.trim()); setPage(1); }}>
        <input className="field !py-2" placeholder="Search email or reference" value={q} onChange={e => setQ(e.target.value)} /><button className="btn-ghost">Search</button>
      </form>
      {err && <p role="alert" className="rounded-xl border border-red-400/50 bg-red-950/60 p-3 text-sm text-red-200">{err}</p>}
      <p className="text-xs text-mute">{busy ? "Loading…" : `${fmt(total)} payment${total === 1 ? "" : "s"}`}</p>
      <ul className="divide-y divide-line">
        {rows.map(r => (
          <li key={r.id} className="py-2.5 text-sm">
            <div className="flex items-center justify-between gap-2"><b className="min-w-0 truncate">{r.player}</b><span className="shrink-0 font-display font-bold text-gold">₦{fmt(r.amountNaira)}</span></div>
            <p className="text-xs text-mute">{fmt(r.votes)} vote{r.votes === 1 ? "" : "s"} · {r.poll} · {chip(r.status)}</p>
            <p className="truncate text-xs text-mute">{r.email || "no email"} · {new Date(r.createdAt).toLocaleString()}</p>
            <p className="truncate font-mono text-[11px] text-mute/70">{r.reference}</p>
          </li>
        ))}
      </ul>
      {pages > 1 && <div className="flex items-center justify-between"><button className="btn-ghost !py-1.5" disabled={page <= 1 || busy} onClick={() => setPage(p => p - 1)}>Previous</button><span className="text-xs text-mute">Page {page} of {pages}</span><button className="btn-ghost !py-1.5" disabled={page >= pages || busy} onClick={() => setPage(p => p + 1)}>Next</button></div>}
    </section>
  );
}

/* ---------- admins (superadmin) ---------- */

/* ---------- referral partners: create, set %, record payouts ---------- */
const nairaK = (k: number) => "₦" + ((k || 0) / 100).toLocaleString("en-NG", { maximumFractionDigits: 2 });
function Partners({ notify }: { notify: Notify }) {
  const [list, setList] = useState<any[]>([]); const [busy, setBusy] = useState(false); const [open, setOpen] = useState("");
  const [nn, setNn] = useState(""); const [ne, setNe] = useState(""); const [np, setNp] = useState(""); const [nc, setNc] = useState("10");
  const [pct, setPct] = useState<Record<string, string>>({}); const [pw, setPw] = useState<Record<string, string>>({}); const [amt, setAmt] = useState<Record<string, string>>({}); const [note, setNote] = useState<Record<string, string>>({});
  const refresh = useCallback(async () => { const r = await call("partners"); if (r.ok) setList(r.data.partners || []); }, []);
  useEffect(() => { refresh(); }, [refresh]);
  async function run(path: string, method: string, body: any, okText: string) { setBusy(true); const r = await call(path, method, body); setBusy(false); notify(r.ok, r.ok ? okText : r.data.error || "Failed."); if (r.ok) refresh(); return r.ok; }
  const owed = list.reduce((a, p) => a + p.stats.balance, 0);
  const pending = list.filter(p => p.status === "pending"); const rest = list.filter(p => p.status !== "pending"); const [apct, setApct] = useState<Record<string, string>>({});
  return (
    <>
      <form className="card space-y-3" onSubmit={async e => { e.preventDefault(); if (await run("partners", "POST", { name: nn, email: ne, password: np, commissionPct: +nc }, "Partner created. Share their email and password with them.")) { setNn(""); setNe(""); setNp(""); } }}>
        <h2 className="font-display text-lg font-bold">New referral partner</h2>
        <Field label="Name"><input className="field" required value={nn} onChange={e => setNn(e.target.value)} /></Field>
        <Field label="Email (their login)"><input className="field" type="email" required autoComplete="off" value={ne} onChange={e => setNe(e.target.value)} /></Field>
        <Field label="Password (8+ characters)" hint="They can change it from their own panel."><input className="field" type="password" required minLength={8} autoComplete="new-password" value={np} onChange={e => setNp(e.target.value)} /></Field>
        <Field label="Commission (% of each payment)"><input className="field" type="number" required min={0} max={100} step="0.1" value={nc} onChange={e => setNc(e.target.value)} /></Field>
        <button className="btn w-full" disabled={busy}>Create partner</button>
        <p className="text-xs text-mute">Their panel is at <b>/partner</b>. Each partner gets their own referral link automatically.</p>
      </form>
      {pending.length > 0 && <section className="card border-gold/50"><h2 className="font-display text-lg font-bold">Waiting for approval ({pending.length})</h2>
        <ul className="mt-2 divide-y divide-line">{pending.map(p => <li key={p.id} className="py-3 text-sm">
          <p className="font-semibold">{p.name}</p><p className="text-xs text-mute">{p.email} · applied {new Date(p.createdAt).toLocaleDateString("en-NG")}</p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <input aria-label="Commission %" className="field !w-24" type="number" min={0} max={100} step="0.1" value={apct[p.id] ?? "10"} onChange={e => setApct(x => ({ ...x, [p.id]: e.target.value }))} /><span className="text-xs text-mute">% commission</span>
            <button className="btn !px-3 !py-2 !text-xs" disabled={busy} onClick={() => run("partners", "PATCH", { id: p.id, status: "approved", commissionPct: +(apct[p.id] ?? 10) }, `${p.name} approved.`)}>Approve</button>
            <button className="btn-danger !px-3 !py-2 !text-xs" disabled={busy} onClick={() => confirm(`Reject and remove ${p.name}'s application?`) && run("partners", "DELETE", { id: p.id }, "Application rejected.")}>Reject</button>
          </div></li>)}</ul></section>}
      <section className="card"><div className="flex items-center justify-between"><h2 className="font-display text-lg font-bold">Partners</h2><span className="text-sm text-mute">Owed in total: <b className="text-chalk">{nairaK(owed)}</b></span></div>
        {rest.length === 0 && <p className="mt-2 text-sm text-mute">No partners yet.</p>}
        <ul className="mt-2 divide-y divide-line">
          {rest.map(p => <li key={p.id} className="py-3">
            <div className="flex items-center gap-3">
              <button className="min-w-0 flex-1 text-left" onClick={() => setOpen(open === p.id ? "" : p.id)} aria-expanded={open === p.id}>
                <span className="block truncate font-semibold">{p.name} {!p.active && <span className="chip ml-1">disabled</span>}</span>
                <span className="block truncate text-xs text-mute">{p.email} · {p.commissionPct}% · code {p.code}</span></button>
              <span className="shrink-0 text-right"><span className="block font-display font-bold text-gold">{nairaK(p.stats.balance)}</span><span className="block text-xs text-mute">owed</span></span>
            </div>
            {open === p.id && <div className="mt-3 space-y-3 rounded-xl bg-pitch-950 p-3 text-sm">
              <p className="text-xs text-mute">{p.stats.payments} payments · {fmt(p.stats.votes)} votes · brought in {nairaK(p.stats.gross)} · earned {nairaK(p.stats.earned)} · paid {nairaK(p.stats.paid)}</p>
              <form className="space-y-2" onSubmit={async e => { e.preventDefault(); if (await run("payouts", "POST", { partnerId: p.id, amountNaira: +(amt[p.id] || 0), note: note[p.id] || undefined }, "Payout recorded.")) { setAmt(x => ({ ...x, [p.id]: "" })); setNote(x => ({ ...x, [p.id]: "" })); } }}>
                <p className="font-semibold">Record a payout you've made</p>
                <div className="grid grid-cols-2 gap-2"><input className="field" type="number" min={1} step="0.01" required placeholder="Amount (₦)" value={amt[p.id] || ""} onChange={e => setAmt(x => ({ ...x, [p.id]: e.target.value }))} />
                  <input className="field" placeholder="Note (optional)" maxLength={200} value={note[p.id] || ""} onChange={e => setNote(x => ({ ...x, [p.id]: e.target.value }))} /></div>
                <button className="btn w-full" disabled={busy}>Record payout</button>
              </form>
              {p.payouts.length > 0 && <ul className="divide-y divide-line text-xs">{p.payouts.map((x: any) => <li key={x.id} className="flex items-center justify-between gap-2 py-1.5"><span className="min-w-0 truncate text-mute">{new Date(x.at).toLocaleDateString("en-NG")}{x.note ? ` · ${x.note}` : ""}</span><span className="font-semibold">{nairaK(x.amountKobo)}</span>
                <button className="text-red-300 underline" onClick={() => confirm("Delete this payout record? Use this only to fix a mistake.") && run("payouts", "DELETE", { id: x.id }, "Payout removed.")}>remove</button></li>)}</ul>}
              <form className="flex items-end gap-2" onSubmit={e => { e.preventDefault(); run("partners", "PATCH", { id: p.id, commissionPct: +(pct[p.id] ?? p.commissionPct) }, "Percentage updated for future payments."); }}>
                <Field label="Commission %" hint="Applies to new payments only; past earnings keep their original %."><input className="field" type="number" min={0} max={100} step="0.1" value={pct[p.id] ?? String(p.commissionPct)} onChange={e => setPct(x => ({ ...x, [p.id]: e.target.value }))} /></Field>
                <button className="btn-ghost shrink-0" disabled={busy}>Save</button></form>
              <form className="flex items-end gap-2" onSubmit={async e => { e.preventDefault(); if (await run("partners", "PATCH", { id: p.id, password: pw[p.id] }, "Password reset.")) setPw(x => ({ ...x, [p.id]: "" })); }}>
                <Field label="Reset password"><input className="field" type="password" required minLength={8} autoComplete="new-password" value={pw[p.id] || ""} onChange={e => setPw(x => ({ ...x, [p.id]: e.target.value }))} /></Field>
                <button className="btn-ghost shrink-0" disabled={busy}>Reset</button></form>
              <div className="flex flex-wrap gap-2">
                <button className="btn-ghost !px-3 !py-1.5 !text-xs" onClick={() => copyText(`${location.origin}/?via=${p.code}`, notify, "Referral link copied.")}>Copy their link</button>
                <button className="btn-ghost !px-3 !py-1.5 !text-xs" disabled={busy} onClick={() => run("partners", "PATCH", { id: p.id, active: !p.active }, p.active ? "Partner disabled." : "Partner enabled.")}>{p.active ? "Disable" : "Enable"}</button>
                <button className="btn-danger !px-3 !py-1.5 !text-xs" disabled={busy} onClick={() => confirm(`Delete ${p.name}? This removes their account and ${p.payouts.length ? "their payout records" : "any payout records"}. Payments made through their link stay in the payments list. This can't be undone.`) && run("partners", "DELETE", { id: p.id }, "Partner deleted.")}>Delete</button>
              </div>
            </div>}
          </li>)}
        </ul></section>
    </>
  );
}

function DataCleanup({ notify, onDone }: { notify: Notify; onDone: () => void }) {
  const [c, setC] = useState<any>(null); const [busy, setBusy] = useState("");
  const refresh = useCallback(async () => { const r = await call("cleanup"); if (r.ok) setC(r.data); }, []);
  useEffect(() => { refresh(); }, [refresh]);
  const rows: { key: string; title: string; hint: string; n: number | null; ask: string }[] = [
    { key: "audit_old", title: "Audit log: older than 30 days", hint: "Keeps recent activity, removes the rest.", n: c?.auditOld ?? null, ask: "Delete audit entries older than 30 days?" },
    { key: "audit_all", title: "Audit log: everything", hint: "Empties the whole log.", n: c?.auditAll ?? null, ask: "Delete the ENTIRE audit log? This can't be undone." },
    { key: "abandoned", title: "Unpaid checkouts", hint: "Payment attempts never completed after 7 days, and failed ones. Real paid votes are never touched.", n: c?.abandoned ?? null, ask: "Delete unpaid and failed payment attempts?" },
    { key: "notices_off", title: "Turned-off notices", hint: "Notices you've switched off.", n: c?.noticesOff ?? null, ask: "Delete all turned-off notices?" },
    { key: "images", title: "Unused uploaded images", hint: "Images no item or poll cover uses (also cleaned automatically).", n: null, ask: "Delete unused uploaded images?" },
  ];
  async function run(r: typeof rows[number]) {
    if (!confirm(r.ask)) return; setBusy(r.key); const x = await call("cleanup", "POST", { action: r.key }); setBusy("");
    notify(x.ok, x.ok ? `Removed ${fmt(x.data.deleted)} item${x.data.deleted === 1 ? "" : "s"}.` : x.data.error || "Failed."); refresh(); onDone();
  }
  return (
    <section className="card"><h2 className="font-display text-lg font-bold">Data cleanup</h2>
      <p className="mt-1 text-sm text-mute">Free up database space. Each action asks first, and a cleanup note is added to the audit log.</p>
      <ul className="mt-2 divide-y divide-line">{rows.map(r => <li key={r.key} className="flex items-center gap-3 py-3">
        <span className="min-w-0 flex-1"><span className="block text-sm font-semibold">{r.title}{r.n !== null && <span className="chip ml-2">{fmt(r.n)}</span>}</span><span className="block text-xs text-mute">{r.hint}</span></span>
        <button className="btn-danger !px-3 !py-2 !text-xs" disabled={!!busy || r.n === 0} onClick={() => run(r)}>{busy === r.key ? "Working…" : "Clear"}</button></li>)}</ul>
    </section>
  );
}

function Admins({ me, notify }: { me: { id: string }; notify: Notify }) {
  const [list, setList] = useState<any[]>([]); const [busy, setBusy] = useState(false); const [pw, setPw] = useState<Record<string, string>>({}); const [open, setOpen] = useState("");
  const [ne, setNe] = useState(""); const [np, setNp] = useState(""); const [nr, setNr] = useState("editor");
  const refresh = useCallback(async () => { const r = await call("users"); if (r.ok) setList(r.data.admins || []); }, []);
  useEffect(() => { refresh(); }, [refresh]);
  async function run(method: string, body: any, okText: string) { setBusy(true); const r = await call("users", method, body); setBusy(false); notify(r.ok, r.ok ? okText : r.data.error || "Failed."); if (r.ok) refresh(); return r.ok; }
  return (
    <>
      <form className="card space-y-3" onSubmit={async e => { e.preventDefault(); if (await run("POST", { email: ne, password: np, role: nr }, "Admin created.")) { setNe(""); setNp(""); } }}>
        <h2 className="font-display text-lg font-bold">Create admin</h2>
        <Field label="Email"><input className="field" type="email" required autoComplete="off" value={ne} onChange={e => setNe(e.target.value)} /></Field>
        <Field label="Password (12+ characters)"><input className="field" type="password" required minLength={12} autoComplete="new-password" value={np} onChange={e => setNp(e.target.value)} /></Field>
        <Field label="Role"><select className="field" value={nr} onChange={e => setNr(e.target.value)}><option value="editor">Editor</option><option value="analyst">Analyst (read only)</option><option value="superadmin">Superadmin</option></select></Field>
        <button className="btn w-full" disabled={busy}>Create admin</button>
      </form>
      <section className="card">
        <h2 className="font-display text-lg font-bold">Admins</h2>
        <ul className="mt-1 divide-y divide-line">
          {list.map(a => {
            const you = a.id === me.id;
            return (
              <li key={a.id} className="py-3 text-sm">
                <p className="truncate font-semibold">{a.email}{you && <span className="font-normal text-mute"> (you)</span>}</p>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <select className="field !w-auto !py-1.5 !text-sm" disabled={busy || you} value={a.role} onChange={e => run("PATCH", { id: a.id, role: e.target.value }, "Role updated.")} aria-label={`Role for ${a.email}`}>
                    <option value="superadmin">Superadmin</option><option value="editor">Editor</option><option value="analyst">Analyst</option>
                  </select>
                  <button className="btn-ghost !px-3 !py-1.5 !text-xs" onClick={() => setOpen(open === a.id ? "" : a.id)}>Reset password</button>
                  {!you && <button className="btn-danger !px-3 !py-1.5 !text-xs" disabled={busy} onClick={() => confirm(`Remove ${a.email}? They are signed out immediately.`) && run("DELETE", { id: a.id }, "Admin removed.")}>Remove</button>}
                </div>
                {open === a.id && (
                  <form className="mt-3 flex gap-2" onSubmit={async e => { e.preventDefault(); if (await run("PATCH", { id: a.id, password: pw[a.id] }, "Password reset.")) { setPw(x => ({ ...x, [a.id]: "" })); setOpen(""); } }}>
                    <input className="field !py-2" type="password" required minLength={12} autoComplete="new-password" placeholder="New password (12+ chars)" value={pw[a.id] || ""} onChange={e => setPw(x => ({ ...x, [a.id]: e.target.value }))} /><button className="btn" disabled={busy}>Set</button>
                  </form>
                )}
              </li>
            );
          })}
        </ul>
      </section>
    </>
  );
}

/* ---------- my account ---------- */
function Account({ me, role, notify }: { me: { email: string }; role: string; notify: Notify }) {
  const [cur, setCur] = useState(""); const [next, setNext] = useState(""); const [busy, setBusy] = useState(false);
  async function submit(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); const r = await call("password", "POST", { current: cur, next }); setBusy(false);
    notify(r.ok, r.ok ? "Password changed." : r.data.error || "Failed."); if (r.ok) { setCur(""); setNext(""); }
  }
  return (
    <form onSubmit={submit} className="card space-y-3">
      <h2 className="font-display text-lg font-bold">My account</h2>
      <p className="text-sm text-mute">{me.email} · {role}</p>
      <Field label="Current password"><input className="field" type="password" required autoComplete="current-password" value={cur} onChange={e => setCur(e.target.value)} /></Field>
      <Field label="New password (12+ characters)"><input className="field" type="password" required minLength={12} autoComplete="new-password" value={next} onChange={e => setNext(e.target.value)} /></Field>
      <button className="btn w-full" disabled={busy}>Change password</button>
    </form>
  );
}

export default function Admin() {
  const [role, setRole] = useState<Role | null | undefined>(undefined); // undefined = checking, null = signed out
  const [tab, setTab] = useState("stats"); const [me, setMe] = useState({ id: "", email: "" });
  const [f, setF] = useState<Record<string, string>>({});
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [an, setAn] = useState<any[]>([]); const [logs, setLogs] = useState<any[]>([]); const [polls, setPolls] = useState<any[]>([]);
  const v = (k: string) => f[k] ?? "";
  const set = (k: string) => (e: any) => setF(x => ({ ...x, [k]: e.target.value }));
  const clear = (...ks: string[]) => setF(x => { const n = { ...x }; ks.forEach(k => delete n[k]); return n; });
  const notify: Notify = useCallback((ok: boolean, text: string) => setMsg({ ok, text }), []);

  const load = useCallback(async () => {
    const [a, p, l] = await Promise.all([call("analytics"), call("polls"), call("audit")]);
    if (a.ok) setAn(a.data.polls || []); if (p.ok) setPolls(p.data.polls || []); if (l.ok) setLogs(l.data.logs || []);
  }, []);

  useEffect(() => { call("me").then(r => { if (r.ok) { setRole(r.data.role); setMe({ id: r.data.id || "", email: r.data.email || "" }); load(); } else setRole(null); }); }, [load]);

  async function login(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setMsg(null);
    const r = await call("login", "POST", { email: v("email"), password: v("password") });
    setBusy(false);
    if (r.ok) { setRole(r.data.role); call("me").then(m => m.ok && setMe({ id: m.data.id || "", email: m.data.email || "" })); clear("email", "password"); setTab("stats"); load(); } else setMsg({ ok: false, text: r.data.error || "Login failed." });
  }
  async function logout() { await call("logout", "POST", {}); setRole(null); setAn([]); setLogs([]); setPolls([]); setMsg(null); }
  const head = <meta name="robots" content="noindex" />;

  if (role === undefined) return <main className="grid min-h-[60dvh] place-items-center text-mute">{head}Checking session…</main>;

  if (!role) return (
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center px-4 py-10">{head}
      <h1 className="font-display text-3xl font-extrabold">Crowned Admin</h1>
      <p className="mt-1 text-mute">Sign in to manage polls and see votes.</p>
      <div className="mt-3 self-start"><InstallPrompt name="Crowned Admin" storageKey="crowned-admin-install-snoozed" blurb="Open the admin panel straight from your home screen." /></div>
      <form onSubmit={login} className="card mt-6 space-y-4">
        <Field label="Email"><input className="field" type="email" autoComplete="username" required value={v("email")} onChange={set("email")} /></Field>
        <Field label="Password"><input className="field" type="password" autoComplete="current-password" required value={v("password")} onChange={set("password")} /></Field>
        {msg && <p role="alert" className="rounded-xl border border-red-400/50 bg-red-950/60 p-3 text-sm text-red-200">{msg.text}</p>}
        <button className="btn w-full !py-3" disabled={busy}>{busy ? "Signing in…" : "Sign in"}</button>
      </form>
    </main>
  );

  const tabs = TABS.filter(t => t.roles.includes(role));

  return (
    <main className="mx-auto max-w-3xl px-4 pb-20 pt-[max(1rem,env(safe-area-inset-top))]">{head}
      <header className="flex items-center justify-between py-3">
        <div><h1 className="font-display text-2xl font-extrabold">Crowned Admin</h1><span className="chip mt-1">{role}</span></div>
        <div className="flex items-center gap-2"><InstallPrompt name="Crowned Admin" storageKey="crowned-admin-install-snoozed" blurb="Open the admin panel straight from your home screen." /><button onClick={logout} className="btn-ghost">Sign out</button></div>
      </header>

      <nav aria-label="Admin sections" className="-mx-4 mt-2 flex gap-2 overflow-x-auto px-4 pb-2">
        {tabs.map(t => <button key={t.id} onClick={() => { setTab(t.id); setMsg(null); }} aria-current={tab === t.id}
          className={`shrink-0 rounded-full border px-4 py-2 text-sm font-semibold ${tab === t.id ? "border-gold bg-gold text-pitch-950" : "border-line text-mute"}`}>{t.label}</button>)}
      </nav>

      {msg && <p role="status" className={`sticky top-2 z-30 mt-3 flex items-start gap-3 rounded-xl border p-3 text-sm shadow-lg backdrop-blur ${msg.ok ? "border-gold/50 bg-pitch-800/95" : "border-red-400/50 bg-red-950/90 text-red-200"}`}><span className="min-w-0 flex-1 break-words">{msg.text}</span><button type="button" onClick={() => setMsg(null)} aria-label="Dismiss" className="shrink-0 px-1 font-bold">✕</button></p>}

      <div className="mt-4 space-y-4">
        {tab === "stats" && <>
          <div className="flex items-center justify-between"><p className="text-sm text-mute">Real paid votes and baseline votes are kept separate.</p><button onClick={load} className="btn-ghost !py-1.5">Refresh</button></div>
          {an.length === 0 && <p className="card text-center text-mute">No polls yet.</p>}
          {an.map(p => <section key={p.poll} className="card">
            <div className="flex flex-wrap items-center gap-2"><h2 className="font-display text-xl font-bold">{p.poll}</h2><StatusChip s={p.status} /></div>
            <dl className="mt-3 grid grid-cols-2 gap-2 text-center sm:grid-cols-4">
              {[["Real votes", fmt(p.realVotes)], ["Baseline", fmt(p.seededVotes)], ["Revenue", "₦" + fmt(p.revenueNaira)], ["Payments", fmt(p.transactions)]].map(([k, val]) =>
                <div key={k as string} className="rounded-xl bg-pitch-950 p-3"><dt className="text-xs text-mute">{k}</dt><dd className="font-display text-lg font-bold">{val}</dd></div>)}
            </dl>
            <ul className="mt-3 divide-y divide-line">
              {p.rankings.map((r: any, i: number) => <li key={r.id} className="flex items-center gap-3 py-2.5 text-sm">
                <span className="w-5 text-center font-bold text-mute">{i + 1}</span>
                <Thumb src={r.imageUrl} name={r.name} cls="h-9 w-9" />
                <span className="min-w-0 flex-1"><span className="block truncate font-semibold">{r.name}{r.edition ? ` (${r.edition})` : ""}</span>
                  <span className="text-xs text-mute">real {fmt(r.realVotes)} · baseline {fmt(r.seededVotes)} · ₦{fmt(r.revenueKobo / 100)}</span></span>
                <span className="font-display text-lg font-bold text-gold">{fmt(r.total)}</span></li>)}
            </ul></section>)}
        </>}

        {tab === "polls" && <>
          <NewPoll notify={notify} reload={load} />
          {polls.length === 0 && <p className="card text-center text-mute">No polls yet. Create your first one above.</p>}
          {polls.map(p => <PollCard key={p.id} poll={p} notify={notify} reload={load} />)}
        </>}

        {tab === "notices" && <Notices notify={notify} />}

        {tab === "payments" && <Payments polls={polls} />}

        {tab === "partners" && <Partners notify={notify} />}

        {tab === "data" && <DataCleanup notify={notify} onDone={load} />}

        {tab === "admins" && <Admins me={me} notify={notify} />}

        {tab === "account" && <Account me={me} role={role} notify={notify} />}

        {tab === "audit" && <section className="card"><h2 className="font-display text-lg font-bold">Audit log</h2>
          {logs.length === 0 && <p className="mt-2 text-sm text-mute">Nothing logged yet.</p>}
          <ul className="mt-2 divide-y divide-line text-xs text-mute">{logs.map(l => <li key={l._id} className="py-2"><b className="text-chalk">{l.action}</b> · {l.target}<br />{l.adminEmail ? `by ${l.adminEmail} · ` : ""}{new Date(l.createdAt).toLocaleString()}{l.meta ? ` · ${JSON.stringify(l.meta)}` : ""}</li>)}</ul></section>}
      </div>
    </main>
  );
}
