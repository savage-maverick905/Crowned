import type { Metadata } from "next"; import mongoose from "mongoose";
import { db } from "@/lib/db"; import { Poll, Player } from "@/models"; import PollView from "@/components/PollView";
export const dynamic = "force-dynamic";
type Props = { params: { id: string }; searchParams: { item?: string | string[] } };
const first = (v?: string | string[]) => (Array.isArray(v) ? v[0] : v);

// Shared item links (?item=...) get that item's name and photo in WhatsApp/Twitter/etc. previews.
export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  try {
    if (!mongoose.isValidObjectId(params.id)) return {};
    await db(); const poll: any = await Poll.findOne({ _id: params.id, status: { $in: ["open", "closed"] } }).lean(); if (!poll) return {};
    const itemId = first(searchParams.item); let pl: any = null;
    if (itemId && mongoose.isValidObjectId(itemId)) pl = await Player.findOne({ _id: itemId, pollId: params.id }).lean();
    const title = pl ? `Vote for ${pl.name} · ${poll.title}` : poll.title;
    const description = pl ? `Back ${pl.name} in “${poll.title}” on Crowned. ₦${poll.pricePerVote} per vote.` : poll.description || `Vote in “${poll.title}” on Crowned.`;
    const img: string | undefined = pl?.imageUrl || poll.coverUrl || undefined;
    return { title, description, openGraph: { title, description, type: "website", images: img ? [img] : undefined },
      twitter: { card: img ? "summary_large_image" : "summary", title, description, images: img ? [img] : undefined } };
  } catch { return {}; }
}
export default function P({ params, searchParams }: Props) { return <PollView id={params.id} focusId={first(searchParams.item)} /> }
