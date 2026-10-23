export const dynamic = "force-dynamic";
import { NextResponse } from "next/server"; import { z } from "zod";
import { db } from "@/lib/db"; import { Partner, Payout } from "@/models"; import { requireAdmin, audit } from "@/lib/auth";
const C = z.object({ partnerId: z.string(), amountNaira: z.number().positive().max(100_000_000), note: z.string().max(200).optional() });
export async function POST(req: Request) {
  const a = await requireAdmin(["superadmin"]); if (!a) return NextResponse.json({}, { status: 403 });
  const p = C.safeParse(await req.json().catch(() => null)); if (!p.success) return NextResponse.json({ error: "Enter a valid amount." }, { status: 400 });
  await db(); if (!(await Partner.exists({ _id: p.data.partnerId }))) return NextResponse.json({ error: "Partner not found." }, { status: 404 });
  const amountKobo = Math.round(p.data.amountNaira * 100);
  const d: any = await Payout.create({ partnerId: p.data.partnerId, amountKobo, note: p.data.note, by: a.id });
  await audit(a.id, "payout.create", String(d._id), { partnerId: p.data.partnerId, amountKobo }); return NextResponse.json({ id: String(d._id) });
}
export async function DELETE(req: Request) { // for correcting a mistaken entry
  const a = await requireAdmin(["superadmin"]); if (!a) return NextResponse.json({}, { status: 403 });
  const { id } = await req.json().catch(() => ({})); if (!id) return NextResponse.json({ error: "Invalid" }, { status: 400 });
  await db(); await Payout.deleteOne({ _id: id }); await audit(a.id, "payout.delete", id); return NextResponse.json({ ok: true });
}
