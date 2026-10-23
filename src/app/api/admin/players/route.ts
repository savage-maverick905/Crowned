export const dynamic = "force-dynamic";
import { NextResponse } from "next/server"; import { z } from "zod"; import { db } from "@/lib/db"; import { Player, Transaction } from "@/models"; import { requireAdmin, audit } from "@/lib/auth"; import { sweepImages } from "@/lib/imageSweep";
import { imageRef } from "@/lib/imageRef";
const img = imageRef;
const C = z.object({ pollId: z.string(), name: z.string().min(1).max(100), edition: z.string().max(40).optional(), imageUrl: img.optional(), bio: z.string().max(500).optional(), seededVotes: z.number().int().min(0).default(0) });
const U = z.object({ id: z.string(), name: z.string().min(1).max(100).optional(), edition: z.string().max(40).optional(), imageUrl: img.or(z.literal("")).optional(), bio: z.string().max(500).optional() });
export async function POST(req: Request) { const a = await requireAdmin(["superadmin", "editor"]); if (!a) return NextResponse.json({}, { status: 403 });
  const p = C.safeParse(await req.json().catch(() => null)); if (!p.success) return NextResponse.json({ error: "Invalid (image must be an https link or an uploaded image)" }, { status: 400 });
  await db(); const d: any = await Player.create(p.data);
  await audit(a.id, "player.create", String(d._id), { name: p.data.name, seededVotes: p.data.seededVotes }); return NextResponse.json({ id: String(d._id) }); }
export async function PATCH(req: Request) { const a = await requireAdmin(["superadmin", "editor"]); if (!a) return NextResponse.json({}, { status: 403 });
  const p = U.safeParse(await req.json().catch(() => null)); if (!p.success) return NextResponse.json({ error: "Invalid (image must be an https link or an uploaded image)" }, { status: 400 });
  const { id, ...rest } = p.data; await db(); await Player.updateOne({ _id: id }, rest); await audit(a.id, "player.update", id, rest); await sweepImages(); return NextResponse.json({ ok: true }); }
export async function DELETE(req: Request) { const a = await requireAdmin(["superadmin", "editor"]); if (!a) return NextResponse.json({}, { status: 403 });
  const { id, force } = await req.json().catch(() => ({})); if (!id) return NextResponse.json({ error: "Invalid" }, { status: 400 }); await db();
  const paid = await Transaction.countDocuments({ playerId: id, status: "success" });
  if (paid > 0 && !force) return NextResponse.json({ error: "This item has paid votes. Confirm to delete it anyway.", paid }, { status: 409 });
  if (paid > 0 && a.role !== "superadmin") return NextResponse.json({ error: "Only a superadmin can delete something that has paid votes." }, { status: 403 });
  await Player.deleteOne({ _id: id });
  await audit(a.id, "player.delete", id, paid > 0 ? { forced: true, paidPayments: paid } : undefined); await sweepImages(); return NextResponse.json({ ok: true }); }
