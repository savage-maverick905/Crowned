import { NextResponse } from "next/server"; import mongoose from "mongoose";
import { db } from "@/lib/db"; import { Poll } from "@/models"; import { playerTotals } from "@/lib/totals";
export const dynamic = "force-dynamic";
export async function GET(_req: Request, { params }: { params: { id: string } }) {
  if (!mongoose.isValidObjectId(params.id)) return NextResponse.json({ error: "Not found" }, { status: 404 });
  await db();
  const p: any = await Poll.findOne({ _id: params.id, status: { $in: ["open", "closed"] } }).lean();
  if (!p) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const rows = await playerTotals(p._id); const now = Date.now();
  const ended = !!p.endsAt && new Date(p.endsAt).getTime() <= now;
  return NextResponse.json({ poll: {
    id: String(p._id), title: p.title, description: p.description, status: p.status === "open" && ended ? "closed" : p.status, endsAt: p.endsAt ? new Date(p.endsAt).toISOString() : null, pricePerVote: p.pricePerVote, announcement: p.announcement || "", announcementHtml: p.announcementHtml || "", announcementCss: p.announcementCss || "", announcementMode: p.announcementMode || "popup", announcementRev: p.announcementRev || 0,
    coverUrl: p.coverUrl || null, itemSingular: p.itemSingular || "Item", itemPlural: p.itemPlural || "Items",
    players: rows.map(({ id, name, edition, imageUrl, bio, total, realVotes, seededVotes }) => ({ id, name, edition, imageUrl, bio, total, realVotes, seededVotes })),
  }, serverNow: now });
}
