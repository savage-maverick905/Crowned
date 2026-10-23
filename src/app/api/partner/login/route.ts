export const dynamic = "force-dynamic";
import { NextResponse } from "next/server"; import bcrypt from "bcryptjs";
import { db } from "@/lib/db"; import { Partner } from "@/models"; import { signPartner } from "@/lib/partnerAuth"; import { limited } from "@/lib/rate";
export async function POST(req: Request) {
  try {
    if (!process.env.JWT_SECRET) return NextResponse.json({ error: "Server is missing JWT_SECRET." }, { status: 500 });
    await db();
    if (await limited(req, "plogin", 10, 900)) return NextResponse.json({ error: "Too many attempts. Wait 15 minutes." }, { status: 429 });
    const b = await req.json().catch(() => ({})); const email = String(b.email || "").trim().toLowerCase(); const password = String(b.password || "");
    if (!email || !password) return NextResponse.json({ error: "Enter your email and password." }, { status: 400 });
    const d: any = await Partner.findOne({ email });
    if (!d || !(await bcrypt.compare(password, d.passwordHash))) return NextResponse.json({ error: "Wrong email or password." }, { status: 401 });
    if (d.status === "pending") return NextResponse.json({ error: "Your account is waiting for admin approval. Try again once you've been approved." }, { status: 403 });
    if (!d.active) return NextResponse.json({ error: "This account is disabled. Contact the admin." }, { status: 403 });
    const res = NextResponse.json({ ok: true });
    res.cookies.set("ptn", await signPartner(String(d._id)), { httpOnly: true, secure: true, sameSite: "strict", path: "/", maxAge: 86400 });
    return res;
  } catch (e) { console.error("partner login", e); return NextResponse.json({ error: "Server error. Try again." }, { status: 500 }); }
}
