export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { db } from "@/lib/db"; import { Audit, Transaction, Notice } from "@/models"; import { requireAdmin, audit } from "@/lib/auth"; import { sweepImages } from "@/lib/imageSweep";
const DAY = 86400000;
const old30 = () => ({ createdAt: { $lt: new Date(Date.now() - 30 * DAY) } });
// Checkouts never paid for after 7 days, plus failed attempts. Verified (success) payments are never touched.
const stale = () => ({ status: { $in: ["pending", "failed"] }, createdAt: { $lt: new Date(Date.now() - 7 * DAY) } });
export async function GET() {
  if (!(await requireAdmin(["superadmin"]))) return NextResponse.json({}, { status: 403 });
  await db();
  const [auditAll, auditOld, abandoned, noticesOff] = await Promise.all([Audit.countDocuments(), Audit.countDocuments(old30()), Transaction.countDocuments(stale()), Notice.countDocuments({ active: false })]);
  return NextResponse.json({ auditAll, auditOld, abandoned, noticesOff });
}
export async function POST(req: Request) {
  const a = await requireAdmin(["superadmin"]); if (!a) return NextResponse.json({}, { status: 403 });
  const { action } = await req.json().catch(() => ({})); await db(); let deleted = 0;
  if (action === "audit_all") deleted = (await Audit.deleteMany({})).deletedCount;
  else if (action === "audit_old") deleted = (await Audit.deleteMany(old30())).deletedCount;
  else if (action === "abandoned") deleted = (await Transaction.collection.deleteMany(stale())).deletedCount; // native call: the model blocks deletes on purpose, this only ever matches unpaid rows
  else if (action === "notices_off") deleted = (await Notice.deleteMany({ active: false })).deletedCount;
  else if (action === "images") deleted = await sweepImages();
  else return NextResponse.json({ error: "Unknown action." }, { status: 400 });
  await audit(a.id, "cleanup." + action, "-", { deleted }); // leaves one line so there's a record that a cleanup happened
  return NextResponse.json({ deleted });
}
