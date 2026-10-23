export const dynamic = "force-dynamic";
import { NextResponse } from "next/server"; import { z } from "zod"; import bcrypt from "bcryptjs";
import { db } from "@/lib/db"; import { Partner, Payout } from "@/models"; import { requireAdmin, audit } from "@/lib/auth"; import { partnerStats, emptyStats, makeCode } from "@/lib/partnerAuth";
const pct = z.number().min(0).max(100);
const C = z.object({ name: z.string().trim().min(1).max(80), email: z.string().trim().toLowerCase().email(), password: z.string().min(8).max(200), commissionPct: pct });
const U = z.object({ id: z.string(), name: z.string().trim().min(1).max(80).optional(), commissionPct: pct.optional(), active: z.boolean().optional(), status: z.literal("approved").optional(), password: z.string().min(8).max(200).optional() });
export async function GET() {
  if (!(await requireAdmin(["superadmin"]))) return NextResponse.json({}, { status: 403 });
  await db(); const list = await Partner.find().sort({ createdAt: -1 }).select("-passwordHash").lean() as any[];
  const stats = await partnerStats(); const pays = await Payout.find().sort({ createdAt: -1 }).limit(500).lean() as any[];
  return NextResponse.json({ partners: list.map(p => ({ id: String(p._id), name: p.name, email: p.email, code: p.code, commissionPct: p.commissionPct, active: p.active, status: p.status || "approved", createdAt: p.createdAt,
    stats: stats.get(String(p._id)) || emptyStats, payouts: pays.filter(x => String(x.partnerId) === String(p._id)).slice(0, 5).map(x => ({ id: String(x._id), at: x.createdAt, amountKobo: x.amountKobo, note: x.note || "" })) })) });
}
export async function POST(req: Request) {
  const a = await requireAdmin(["superadmin"]); if (!a) return NextResponse.json({}, { status: 403 });
  const p = C.safeParse(await req.json().catch(() => null)); if (!p.success) return NextResponse.json({ error: "Check the name, email, password (8+ characters) and percentage (0-100)." }, { status: 400 });
  await db(); if (await Partner.exists({ email: p.data.email })) return NextResponse.json({ error: "A partner with that email already exists." }, { status: 409 });
  const d: any = await Partner.create({ name: p.data.name, email: p.data.email, commissionPct: p.data.commissionPct, code: makeCode(p.data.name), passwordHash: await bcrypt.hash(p.data.password, 12) });
  await audit(a.id, "partner.create", String(d._id), { email: p.data.email, pct: p.data.commissionPct }); return NextResponse.json({ id: String(d._id), code: d.code });
}
export async function PATCH(req: Request) {
  const a = await requireAdmin(["superadmin"]); if (!a) return NextResponse.json({}, { status: 403 });
  const p = U.safeParse(await req.json().catch(() => null)); if (!p.success) return NextResponse.json({ error: "Invalid values." }, { status: 400 });
  const { id, password, ...rest } = p.data; const set: any = { ...rest }; if (rest.status === "approved") set.active = true; // approving also switches the account on if (password) set.passwordHash = await bcrypt.hash(password, 12);
  await db(); await Partner.updateOne({ _id: id }, set); await audit(a.id, "partner.update", id, { ...rest, passwordReset: !!password });
  return NextResponse.json({ ok: true });
}
export async function DELETE(req: Request) { // removes the partner and their payout records; payments stay in the payments list
  const a = await requireAdmin(["superadmin"]); if (!a) return NextResponse.json({}, { status: 403 });
  const { id } = await req.json().catch(() => ({})); if (!id) return NextResponse.json({ error: "Invalid" }, { status: 400 }); await db();
  const gone = await Payout.deleteMany({ partnerId: id }); await Partner.deleteOne({ _id: id });
  await audit(a.id, "partner.delete", id, { payoutsRemoved: gone.deletedCount }); return NextResponse.json({ ok: true });
}
