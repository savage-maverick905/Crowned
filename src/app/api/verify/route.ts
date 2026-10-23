export const dynamic = "force-dynamic";
import { NextResponse } from "next/server"; import { db } from "@/lib/db"; import { fulfil } from "@/lib/paystack"; import { limited } from "@/lib/rate";
export async function GET(req: Request) {
  await db(); if (await limited(req, "verify", 30, 600)) return NextResponse.json({ error: "Too many" }, { status: 429 });
  const ref = new URL(req.url).searchParams.get("ref"); if (!ref) return NextResponse.json({ error: "ref" }, { status: 400 });
  const r = await fulfil(ref); return NextResponse.json({ confirmed: r.ok });
}
