export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { db } from "@/lib/db"; import { Poll, Player, Transaction, Payout } from "@/models"; import { requirePartner, partnerStats, emptyStats } from "@/lib/partnerAuth";
const mask = (e?: string) => { const [u = "", d = ""] = String(e || "").split("@"); return u.slice(0, 2) + "***@" + d; };
export async function GET() {
  const me: any = await requirePartner(); if (!me) return NextResponse.json({}, { status: 401 });
  await db();
  const [stats, txs, payouts, polls] = await Promise.all([
    partnerStats([String(me._id)]),
    Transaction.find({ partnerId: me._id, status: "success" }).sort({ createdAt: -1 }).limit(100).lean(),
    Payout.find({ partnerId: me._id }).sort({ createdAt: -1 }).limit(100).lean(),
    Poll.find({ status: "open" }).sort({ createdAt: -1 }).select("title").lean(),
  ]) as any[];
  const pt: any = {}; for (const x of await Poll.find({ _id: { $in: txs.map((t: any) => t.pollId) } }).select("title").lean() as any[]) pt[String(x._id)] = x.title;
  const pn: any = {}; for (const x of await Player.find({ _id: { $in: txs.map((t: any) => t.playerId) } }).select("name").lean() as any[]) pn[String(x._id)] = x.name;
  return NextResponse.json({
    partner: { name: me.name, email: me.email, code: me.code, commissionPct: me.commissionPct },
    stats: stats.get(String(me._id)) || emptyStats,
    polls: polls.map((p: any) => ({ id: String(p._id), title: p.title })),
    payments: txs.map((t: any) => ({ id: String(t._id), at: t.createdAt, poll: pt[String(t.pollId)] || "", item: pn[String(t.playerId)] || "", votes: t.votes, amountKobo: t.amountKobo, commissionKobo: t.commissionKobo || 0, pct: t.commissionPct, who: mask(t.email) })),
    payouts: payouts.map((p: any) => ({ id: String(p._id), at: p.createdAt, amountKobo: p.amountKobo, note: p.note || "" })),
  });
}
