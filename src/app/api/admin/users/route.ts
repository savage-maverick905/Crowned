export const dynamic = "force-dynamic";
import { NextResponse } from "next/server"; import mongoose from "mongoose"; import bcrypt from "bcryptjs"; import { z } from "zod"; import { db } from "@/lib/db"; import { Admin } from "@/models"; import { requireAdmin, audit } from "@/lib/auth";
const ROLE = z.enum(["superadmin", "editor", "analyst"]); const PW = z.string().min(12).max(200);
const C = z.object({ email: z.string().email(), password: PW, role: ROLE });
const U = z.object({ id: z.string(), role: ROLE.optional(), password: PW.optional() });
const bad = (error: string, status = 400) => NextResponse.json({ error }, { status });

export async function GET() { if (!(await requireAdmin(["superadmin"]))) return NextResponse.json({}, { status: 403 });
  await db(); const l = (await Admin.find().sort({ createdAt: 1 }).select("email role createdAt").lean()) as any[];
  return NextResponse.json({ admins: l.map(x => ({ id: String(x._id), email: x.email, role: x.role, createdAt: x.createdAt })) }); }

export async function POST(req: Request) { const a = await requireAdmin(["superadmin"]); if (!a) return NextResponse.json({}, { status: 403 });
  const p = C.safeParse(await req.json().catch(() => null)); if (!p.success) return bad("Invalid (password min 12 chars)");
  await db(); const email = p.data.email.toLowerCase();
  if (await Admin.exists({ email })) return bad("An admin with that email already exists.", 409);
  await Admin.create({ email, role: p.data.role, passwordHash: await bcrypt.hash(p.data.password, 12) });
  await audit(a.id, "admin.create", email, { role: p.data.role }); return NextResponse.json({ ok: true }); }

// Change another admin's role or reset their password.
export async function PATCH(req: Request) { const a = await requireAdmin(["superadmin"]); if (!a) return NextResponse.json({}, { status: 403 });
  const p = U.safeParse(await req.json().catch(() => null)); if (!p.success || !mongoose.isValidObjectId(p.data.id)) return bad("Invalid (password min 12 chars)");
  await db(); const t: any = await Admin.findById(p.data.id); if (!t) return bad("Admin not found.", 404);
  if (p.data.role && p.data.role !== t.role) {
    if (String(t._id) === a.id) return bad("Ask another superadmin to change your own role.");
    if (t.role === "superadmin" && (await Admin.countDocuments({ role: "superadmin" })) <= 1) return bad("There must be at least one superadmin.");
    t.role = p.data.role;
  }
  if (p.data.password) t.passwordHash = await bcrypt.hash(p.data.password, 12);
  await t.save(); await audit(a.id, "admin.update", t.email, { role: p.data.role, passwordReset: !!p.data.password }); return NextResponse.json({ ok: true }); }

export async function DELETE(req: Request) { const a = await requireAdmin(["superadmin"]); if (!a) return NextResponse.json({}, { status: 403 });
  const { id } = await req.json().catch(() => ({})); if (!mongoose.isValidObjectId(id)) return bad("Invalid request.");
  if (id === a.id) return bad("You can't delete your own account."); await db();
  const t: any = await Admin.findById(id); if (!t) return bad("Admin not found.", 404);
  await Admin.deleteOne({ _id: id }); await audit(a.id, "admin.delete", t.email); return NextResponse.json({ ok: true }); }
