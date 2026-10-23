export const dynamic = "force-dynamic";
import { NextResponse } from "next/server"; import { z } from "zod"; import { db } from "@/lib/db"; import { Poll, Player, Transaction } from "@/models"; import { requireAdmin, audit } from "@/lib/auth"; import { sweepImages } from "@/lib/imageSweep"; import { playerTotals } from "@/lib/totals";
import { imageRef } from "@/lib/imageRef";
const url = imageRef;
const term = z.string().trim().min(1).max(30);
const C = z.object({ title: z.string().min(2).max(120), description: z.string().max(1000).optional(), coverUrl: url.optional(), endsAt: z.string().datetime().optional(),
  itemSingular: term.optional(), itemPlural: term.optional(), pricePerVote: z.number().int().min(1).max(1000000).default(100) });
const U = z.object({ id: z.string(), title: z.string().min(2).max(120).optional(), description: z.string().max(1000).optional(),
  coverUrl: url.or(z.literal("")).optional(), endsAt: z.string().datetime().nullable().optional(), itemSingular: term.optional(), itemPlural: term.optional(),
  status: z.enum(["draft", "open", "closed"]).optional(), pricePerVote: z.number().int().min(1).max(1000000).optional(), announcement: z.string().max(500).optional(),
  announcementHtml: z.string().max(20000).optional(), announcementCss: z.string().max(8000).optional(), announcementMode: z.enum(["popup", "inline"]).optional(), resendAnnouncement: z.boolean().optional() });
export async function GET() { if (!(await requireAdmin(["superadmin", "editor", "analyst"]))) return NextResponse.json({}, { status: 403 });
  await db(); const out = [];
  for (const p of (await Poll.find().sort({ createdAt: -1 }).lean()) as any[]) out.push({ ...p, _id: String(p._id), id: String(p._id), players: await playerTotals(p._id) });
  return NextResponse.json({ polls: out }); }
export async function POST(req: Request) { const a = await requireAdmin(["superadmin", "editor"]); if (!a) return NextResponse.json({}, { status: 403 });
  const p = C.safeParse(await req.json().catch(() => null)); if (!p.success) return NextResponse.json({ error: "Invalid (cover image must be an https URL)" }, { status: 400 });
  await db(); const d: any = await Poll.create(p.data); await audit(a.id, "poll.create", String(d._id), p.data); return NextResponse.json({ id: String(d._id) }); }
export async function PATCH(req: Request) { const a = await requireAdmin(["superadmin", "editor"]); if (!a) return NextResponse.json({}, { status: 403 });
  const p = U.safeParse(await req.json().catch(() => null)); if (!p.success) return NextResponse.json({ error: "Invalid (cover image must be an https URL)" }, { status: 400 });
  const { id, resendAnnouncement, ...rest } = p.data; await db(); const upd: any = {}; if (Object.keys(rest).length) upd.$set = rest; if (resendAnnouncement) upd.$inc = { announcementRev: 1 };
  if (upd.$set || upd.$inc) await Poll.updateOne({ _id: id }, upd); await audit(a.id, "poll.update", id, { ...rest, resendAnnouncement }); await sweepImages(); return NextResponse.json({ ok: true }); }
export async function DELETE(req: Request) { const a = await requireAdmin(["superadmin", "editor"]); if (!a) return NextResponse.json({}, { status: 403 });
  const { id, force } = await req.json().catch(() => ({})); if (!id) return NextResponse.json({ error: "Invalid" }, { status: 400 }); await db();
  const paid = await Transaction.countDocuments({ pollId: id, status: "success" });
  if (paid > 0 && !force) return NextResponse.json({ error: "This poll has paid votes. Confirm to delete it anyway.", paid }, { status: 409 });
  if (paid > 0 && a.role !== "superadmin") return NextResponse.json({ error: "Only a superadmin can delete something that has paid votes." }, { status: 403 });
  await Player.deleteMany({ pollId: id }); await Poll.deleteOne({ _id: id });
  await audit(a.id, "poll.delete", id, paid > 0 ? { forced: true, paidPayments: paid } : undefined); await sweepImages(); return NextResponse.json({ ok: true }); }
