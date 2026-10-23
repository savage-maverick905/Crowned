import { Img, Player, Poll } from "@/models";

const GRACE_MS = 60 * 60 * 1000; // an upload not yet saved into a form is left alone for an hour

/**
 * Deletes uploaded images that no item or poll cover uses any more, so replaced, removed,
 * abandoned and deleted images never pile up in the database (free-tier storage is small).
 * Runs after every change that can orphan an image. Never throws.
 */
export async function sweepImages(): Promise<number> {
  try {
    const [pics, covers, imgs] = await Promise.all([
      Player.distinct("imageUrl"), Poll.distinct("coverUrl"),
      Img.find({ createdAt: { $lt: new Date(Date.now() - GRACE_MS) } }).select("_id").lean(), // metadata only, not the image data
    ]);
    const used = new Set<string>();
    for (const u of [...pics, ...covers]) { const m = /^\/api\/img\/([a-f0-9]{24})$/.exec(String(u || "")); if (m) used.add(m[1]); }
    const dead = (imgs as any[]).map(i => String(i._id)).filter(id => !used.has(id));
    if (dead.length) await Img.deleteMany({ _id: { $in: dead } });
    return dead.length;
  } catch { return 0; }
}
