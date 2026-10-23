export const dynamic = "force-dynamic";
import { NextResponse } from "next/server"; import { db } from "@/lib/db"; import { Admin } from "@/models"; import { requireAdmin } from "@/lib/auth";
export async function GET() {
  const a = await requireAdmin(["superadmin", "editor", "analyst"]); if (!a) return NextResponse.json({}, { status: 401 });
  await db(); const me: any = await Admin.findById(a.id).select("email").lean();
  return NextResponse.json({ role: a.role, id: a.id, email: me?.email || "" });
}
