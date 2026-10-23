export const dynamic = "force-dynamic";
import { NextResponse } from "next/server"; import { randomUUID } from "crypto"; import { z } from "zod";
import { db } from "@/lib/db"; import { Poll, Player, Transaction, Partner } from "@/models";
import { calcAmountKobo } from "@/lib/price"; import { initialize } from "@/lib/paystack"; import { limited, hashIp } from "@/lib/rate";
const S = z.object({ pollId: z.string(), playerId: z.string(), votes: z.number().int().min(1).max(100000), email: z.string().email(), via: z.string().regex(/^[a-z0-9-]{3,40}$/i).optional() });
export async function POST(req: Request) {
  try {
    await db();
    if (await limited(req, "checkout", 10, 600)) return NextResponse.json({ error: "Too many attempts. Please wait a few minutes and try again." }, { status: 429 });
    const p = S.safeParse(await req.json().catch(() => null)); if (!p.success) return NextResponse.json({ error: "Please check the number of votes and your email address." }, { status: 400 });
    const poll: any = await Poll.findById(p.data.pollId); const player = await Player.findOne({ _id: p.data.playerId, pollId: p.data.pollId });
    if (!poll || poll.status !== "open" || !player) return NextResponse.json({ error: "Voting isn’t open for this poll right now." }, { status: 400 });
    if (poll.endsAt && new Date(poll.endsAt).getTime() <= Date.now()) return NextResponse.json({ error: "Voting for this poll has ended." }, { status: 400 });
    const amountKobo = calcAmountKobo(p.data.votes, poll.pricePerVote);
    const ptn: any = p.data.via ? await Partner.findOne({ code: p.data.via.toLowerCase(), active: true }).select("commissionPct").lean() : null;
    const commissionPct = ptn ? ptn.commissionPct : undefined;
    const reference = "gv_" + randomUUID().replace(/-/g, "");
    await Transaction.create({ reference, pollId: poll._id, playerId: player._id, votes: p.data.votes, amountKobo,
      pricePerVote: poll.pricePerVote, ...(ptn ? { partnerId: ptn._id, commissionPct, commissionKobo: Math.floor(amountKobo * commissionPct / 100) } : {}), email: p.data.email, ipHash: hashIp(req.headers.get("x-forwarded-for") || "") });
    const d = await initialize(p.data.email, amountKobo, reference, `${process.env.NEXT_PUBLIC_SITE_URL}/poll/${poll._id}?ref=${reference}`);
    return NextResponse.json({ url: d.authorization_url });
  } catch (e: any) {
    console.error("checkout failed:", e);
    return NextResponse.json({ error: e?.message || "Something went wrong starting your payment. Please try again." }, { status: 500 });
  }
}
