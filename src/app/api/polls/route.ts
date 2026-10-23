import { NextResponse } from "next/server";
import { db } from "@/lib/db"; import { Poll } from "@/models"; import { playerTotals } from "@/lib/totals";
export const dynamic = "force-dynamic";
export async function GET() {
  await db();
  const polls = await Poll.find({ status: { $in: ["open", "closed"] } }).sort({ createdAt: -1 }).lean();
  const out = []; const now = Date.now();
  for (const p of polls as any[]) {
    const rows = await playerTotals(p._id);
    const totalVotes = rows.reduce((s, x) => s + x.total, 0);
    const ended = !!p.endsAt && new Date(p.endsAt).getTime() <= now;
    out.push({
      id: String(p._id), title: p.title, description: p.description, status: p.status === "open" && ended ? "closed" : p.status, pricePerVote: p.pricePerVote,
      endsAt: p.endsAt ? new Date(p.endsAt).toISOString() : null,
      coverUrl: p.coverUrl || rows.find(x => x.imageUrl)?.imageUrl || null,
      itemSingular: p.itemSingular || "Item", itemPlural: p.itemPlural || "Items",
      itemCount: rows.length, totalVotes, leader: totalVotes > 0 ? rows[0]?.name || null : null,
    });
  }
  return NextResponse.json({ polls: out, serverNow: now });
}
