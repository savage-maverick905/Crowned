import { NextResponse } from "next/server"; import { db } from "@/lib/db"; import { Poll } from "@/models"; import { requireAdmin } from "@/lib/auth"; import { playerTotals } from "@/lib/totals";
export const dynamic = "force-dynamic";
export async function GET() {
  if (!(await requireAdmin(["superadmin", "editor", "analyst"]))) return NextResponse.json({}, { status: 403 });
  await db(); const out = [];
  for (const p of (await Poll.find().lean()) as any[]) { const rows = await playerTotals(p._id);
    out.push({ poll: p.title, status: p.status, rankings: rows,
      realVotes: rows.reduce((s, r) => s + r.realVotes, 0), seededVotes: rows.reduce((s, r) => s + r.seededVotes, 0),
      revenueNaira: rows.reduce((s, r) => s + r.revenueKobo, 0) / 100, transactions: rows.reduce((s, r) => s + r.transactions, 0) }); }
  return NextResponse.json({ polls: out });
}
