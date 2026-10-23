export const dynamic = "force-dynamic";
import { NextResponse } from "next/server"; import mongoose from "mongoose"; import { z } from "zod"; import { db } from "@/lib/db"; import { Notice } from "@/models"; import { requireAdmin, audit } from "@/lib/auth";
const F = { title: z.string().trim().max(80).optional(), text: z.string().max(1000).optional(), html: z.string().max(20000).optional(), css: z.string().max(8000).optional() };
const C = z.object(F); const U = z.object({ id: z.string(), ...F, active: z.boolean().optional(), resend: z.boolean().optional() });
const has = (v: { text?: string; html?: string }) => !!((v.text || "").trim() || (v.html || "").trim());
const bad = (error: string, status = 400) => NextResponse.json({ error }, { status });
const out = (x: any) => ({ id: String(x._id), rev: x.rev ?? 0, active: x.active !== false, title: x.title || "", text: x.text || "", html: x.html || "", css: x.css || "", createdAt: x.createdAt });

// Every notice, including hidden ones, so nothing you sent is out of reach.
export async function GET() { if (!(await requireAdmin(["superadmin", "editor"]))) return NextResponse.json({}, { status: 403 });
  await db(); return NextResponse.json({ notices: ((await Notice.find().sort({ createdAt: -1 }).limit(200).lean()) as any[]).map(out) }); }

export async function POST(req: Request) { const a = await requireAdmin(["superadmin", "editor"]); if (!a) return NextResponse.json({}, { status: 403 });
  const p = C.safeParse(await req.json().catch(() => null)); if (!p.success || !has(p.data)) return bad("Add a message or some HTML.");
  await db(); const n: any = await Notice.create(p.data); await audit(a.id, "notice.create", String(n._id), { title: p.data.title, text: p.data.text, hasHtml: !!p.data.html });
  return NextResponse.json({ id: String(n._id) }); }

export async function PATCH(req: Request) { const a = await requireAdmin(["superadmin", "editor"]); if (!a) return NextResponse.json({}, { status: 403 });
  const p = U.safeParse(await req.json().catch(() => null)); if (!p.success || !mongoose.isValidObjectId(p.data.id)) return bad("Invalid request.");
  const { id, active, resend, ...content } = p.data; await db(); const cur: any = await Notice.findById(id).lean(); if (!cur) return bad("Notice not found.", 404);
  const set: any = { ...content }; if (active !== undefined) set.active = active;
  if (!has({ text: set.text ?? cur.text, html: set.html ?? cur.html })) return bad("A notice needs a message or some HTML.");
  const changed = Object.keys(content).length > 0 || resend; // content edits or "resend" make everyone see it again
  const upd: any = {}; if (Object.keys(set).length) upd.$set = set; if (changed) upd.$inc = { rev: 1 };
  if (!upd.$set && !upd.$inc) return bad("Nothing to change.");
  await Notice.updateOne({ _id: id }, upd); await audit(a.id, "notice.update", id, { ...content, active, resend }); return NextResponse.json({ ok: true }); }

// permanent:true deletes it for good; otherwise it is just hidden (and can be shown again).
export async function DELETE(req: Request) { const a = await requireAdmin(["superadmin", "editor"]); if (!a) return NextResponse.json({}, { status: 403 });
  const { id, permanent } = await req.json().catch(() => ({})); if (!mongoose.isValidObjectId(id)) return bad("Invalid request."); await db();
  if (permanent) await Notice.deleteOne({ _id: id }); else await Notice.updateOne({ _id: id }, { active: false });
  await audit(a.id, permanent ? "notice.delete" : "notice.hide", id); return NextResponse.json({ ok: true }); }
