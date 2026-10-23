export const dynamic = "force-dynamic";
import { NextResponse } from "next/server"; import bcrypt from "bcryptjs"; import { z } from "zod";
import { db } from "@/lib/db"; import { Partner } from "@/models"; import { makeCode } from "@/lib/partnerAuth"; import { limited } from "@/lib/rate";
const S = z.object({ name: z.string().trim().min(1).max(80), email: z.string().trim().toLowerCase().email(), password: z.string().min(8).max(200) });
// Self-signup: the account is created switched off and "pending" until an admin approves it.
export async function POST(req: Request) {
  try {
    await db(); if (await limited(req, "psignup", 5, 3600)) return NextResponse.json({ error: "Too many attempts. Try again later." }, { status: 429 });
    const p = S.safeParse(await req.json().catch(() => null)); if (!p.success) return NextResponse.json({ error: "Enter your name, a valid email, and a password of at least 8 characters." }, { status: 400 });
    if (await Partner.exists({ email: p.data.email })) return NextResponse.json({ error: "An account with that email already exists." }, { status: 409 });
    await Partner.create({ name: p.data.name, email: p.data.email, code: makeCode(p.data.name), passwordHash: await bcrypt.hash(p.data.password, 12), active: false, status: "pending" });
    return NextResponse.json({ ok: true });
  } catch (e) { console.error("partner signup", e); return NextResponse.json({ error: "Server error. Try again." }, { status: 500 }); }
}
