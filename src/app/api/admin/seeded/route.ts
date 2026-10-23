export const dynamic = "force-dynamic";
import { NextResponse } from "next/server"; import { db } from "@/lib/db"; import { Player } from "@/models"; import { requireAdmin, audit } from "@/lib/auth";
export async function POST(req: Request) {
  const a = await requireAdmin(["superadmin", "editor"]); if (!a) return NextResponse.json({}, { status: 403 });
  await db(); const { playerId, delta, reason } = await req.json();
  if (!Number.isInteger(delta) || !reason) return NextResponse.json({ error: "delta(int) and reason required" }, { status: 400 });
  const p: any = await Player.findById(playerId); if (!p) return NextResponse.json({}, { status: 404 });
  const before = p.seededVotes; p.seededVotes = Math.max(0, before + delta); await p.save();
  await audit(a.id, "seeded.adjust", String(p._id), { before, after: p.seededVotes, delta, reason });
  return NextResponse.json({ seededVotes: p.seededVotes });
}
