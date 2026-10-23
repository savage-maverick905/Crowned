import { NextResponse } from "next/server"; import { db } from "@/lib/db"; import { Audit, Admin } from "@/models"; import { requireAdmin } from "@/lib/auth";
export const dynamic = "force-dynamic";
export async function GET() { if (!(await requireAdmin(["superadmin", "analyst"]))) return NextResponse.json({}, { status: 403 });
  await db(); const logs = (await Audit.find().sort({ createdAt: -1 }).limit(200).lean()) as any[];
  const who = new Map(((await Admin.find().select("email").lean()) as any[]).map(x => [String(x._id), x.email]));
  return NextResponse.json({ logs: logs.map(l => ({ ...l, adminEmail: who.get(String(l.adminId)) || "" })) }); }
