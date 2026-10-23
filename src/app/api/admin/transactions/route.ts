export const dynamic = "force-dynamic";
import { NextResponse } from "next/server"; import mongoose from "mongoose"; import { db } from "@/lib/db"; import { Poll, Player, Transaction } from "@/models"; import { requireAdmin } from "@/lib/auth";
const PER = 30; const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
// Read-only payment list. Paid transactions can never be edited or deleted.
export async function GET(req: Request) { if (!(await requireAdmin(["superadmin", "editor", "analyst"]))) return NextResponse.json({}, { status: 403 });
  const u = new URL(req.url).searchParams; const status = u.get("status") || ""; const pollId = u.get("pollId") || ""; const q = (u.get("q") || "").trim().slice(0, 80); const page = Math.max(1, parseInt(u.get("page") || "1") || 1);
  const f: any = {}; if (["pending", "success", "failed"].includes(status)) f.status = status; if (mongoose.isValidObjectId(pollId)) f.pollId = pollId;
  if (q) { const rx = new RegExp(esc(q), "i"); f.$or = [{ reference: rx }, { email: rx }]; }
  await db(); const [rows, total] = await Promise.all([Transaction.find(f).sort({ createdAt: -1 }).skip((page - 1) * PER).limit(PER).lean(), Transaction.countDocuments(f)]) as [any[], number];
  const polls = new Map(((await Poll.find({ _id: { $in: rows.map(r => r.pollId) } }).select("title").lean()) as any[]).map(x => [String(x._id), x.title]));
  const players = new Map(((await Player.find({ _id: { $in: rows.map(r => r.playerId) } }).select("name").lean()) as any[]).map(x => [String(x._id), x.name]));
  return NextResponse.json({ total, pages: Math.max(1, Math.ceil(total / PER)), items: rows.map(r => ({ id: String(r._id), reference: r.reference, status: r.status, votes: r.votes, amountNaira: r.amountKobo / 100, email: r.email || "",
    poll: polls.get(String(r.pollId)) || "(deleted poll)", player: players.get(String(r.playerId)) || "(deleted)", createdAt: r.createdAt })) }); }
