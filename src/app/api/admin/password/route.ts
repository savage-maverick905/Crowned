export const dynamic = "force-dynamic";
import { NextResponse } from "next/server"; import bcrypt from "bcryptjs"; import { db } from "@/lib/db"; import { Admin } from "@/models"; import { requireAdmin, audit } from "@/lib/auth"; import { limited } from "@/lib/rate";
// Any signed-in admin can change their own password.
export async function POST(req: Request) { const a = await requireAdmin(["superadmin", "editor", "analyst"]); if (!a) return NextResponse.json({}, { status: 403 });
  await db(); if (await limited(req, "pw", 10, 900)) return NextResponse.json({ error: "Too many attempts. Wait 15 minutes." }, { status: 429 });
  const b = await req.json().catch(() => ({})); const cur = String(b.current || ""), next = String(b.next || "");
  if (next.length < 12 || next.length > 200) return NextResponse.json({ error: "New password must be at least 12 characters." }, { status: 400 });
  const me: any = await Admin.findById(a.id); if (!me || !(await bcrypt.compare(cur, me.passwordHash))) return NextResponse.json({ error: "Current password is wrong." }, { status: 400 });
  me.passwordHash = await bcrypt.hash(next, 12); await me.save(); await audit(a.id, "admin.password", me.email); return NextResponse.json({ ok: true }); }
