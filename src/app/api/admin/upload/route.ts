export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { Img } from "@/models";
import { requireAdmin, audit } from "@/lib/auth";
import { sweepImages } from "@/lib/imageSweep";

const MAX = 600_000; // the browser resizes first (typically 30-100 KB); this just stops oversized files

// Decide the type from the file's own bytes; never trust the filename or the client's content-type.
function sniff(b: Buffer): string | null {
  if (b.length > 12 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return "image/jpeg";
  if (b.length > 12 && b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return "image/png";
  if (b.length > 12 && b.subarray(0, 4).toString("latin1") === "RIFF" && b.subarray(8, 12).toString("latin1") === "WEBP") return "image/webp";
  return null;
}

export async function POST(req: Request) {
  const a = await requireAdmin(["superadmin", "editor"]);
  if (!a) return NextResponse.json({ error: "Not allowed for your role, or your session expired." }, { status: 403 });
  const form = await req.formData().catch(() => null);
  const f = form?.get("file");
  if (!f || typeof f === "string") return NextResponse.json({ error: "No image received." }, { status: 400 });
  if (f.size > MAX) return NextResponse.json({ error: "Image is too large (max 600 KB after resizing)." }, { status: 413 });
  const buf = Buffer.from(await f.arrayBuffer());
  const type = sniff(buf);
  if (!type) return NextResponse.json({ error: "Only JPEG, PNG or WebP images are allowed." }, { status: 415 });
  await db();
  const d: any = await Img.create({ data: buf, contentType: type, size: buf.length, by: a.id });
  await audit(a.id, "image.upload", String(d._id), { bytes: buf.length, type });
  await sweepImages(); // clears abandoned uploads from earlier
  return NextResponse.json({ url: `/api/img/${d._id}` });
}
