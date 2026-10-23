export const dynamic = "force-dynamic";
import { db } from "@/lib/db";
import { Img } from "@/models";

// Public: serves images uploaded from the admin panel. IDs are never reused, so browsers can cache forever.
export async function GET(_: Request, { params }: { params: { id: string } }) {
  if (!/^[a-f0-9]{24}$/.test(params.id)) return new Response("Not found", { status: 404 });
  await db();
  const d: any = await Img.findById(params.id).select("data contentType");
  if (!d) return new Response("Not found", { status: 404 });
  return new Response(new Uint8Array(d.data), {
    headers: { "Content-Type": d.contentType, "Cache-Control": "public, max-age=31536000, immutable", "X-Content-Type-Options": "nosniff" },
  });
}
