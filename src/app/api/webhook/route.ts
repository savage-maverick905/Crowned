export const dynamic = "force-dynamic";
import { NextResponse } from "next/server"; import { db } from "@/lib/db"; import { fulfil, validSignature } from "@/lib/paystack";
export async function POST(req: Request) {
  const raw = await req.text();
  if (!validSignature(raw, req.headers.get("x-paystack-signature"))) return NextResponse.json({}, { status: 401 });
  await db(); const ev = JSON.parse(raw);
  if (ev.event === "charge.success" && ev.data?.reference) await fulfil(ev.data.reference);
  return NextResponse.json({ ok: true });
}
