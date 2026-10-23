export const dynamic = "force-dynamic";
import { NextResponse } from "next/server"; import bcrypt from "bcryptjs";
import { db } from "@/lib/db"; import { requirePartner } from "@/lib/partnerAuth"; import { limited } from "@/lib/rate";
export async function POST(req: Request) {
  const me: any = await requirePartner(); if (!me) return NextResponse.json({}, { status: 401 });
  await db(); if (await limited(req, "ppw", 10, 900)) return NextResponse.json({ error: "Too many attempts. Wait 15 minutes." }, { status: 429 });
  const b = await req.json().catch(() => ({})); const cur = String(b.current || ""), next = String(b.next || "");
  if (next.length < 8 || next.length > 200) return NextResponse.json({ error: "New password must be at least 8 characters." }, { status: 400 });
  if (!(await bcrypt.compare(cur, me.passwordHash))) return NextResponse.json({ error: "Current password is wrong." }, { status: 400 });
  me.passwordHash = await bcrypt.hash(next, 12); await me.save(); return NextResponse.json({ ok: true });
}
