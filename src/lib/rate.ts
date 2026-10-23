import { createHash } from "crypto";
import { RateHit } from "@/models";
export const hashIp = (ip: string) => createHash("sha256").update(ip + (process.env.JWT_SECRET || "")).digest("hex").slice(0, 24);
export async function limited(req: Request, bucket: string, max: number, windowSec: number) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim() || "unknown";
  const key = `${bucket}:${hashIp(ip)}`;
  const since = new Date(Date.now() - windowSec * 1000);
  const n = await RateHit.countDocuments({ key, at: { $gte: since } });
  if (n >= max) return true;
  await RateHit.create({ key });
  return false;
}
