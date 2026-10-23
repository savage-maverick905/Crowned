export const dynamic = "force-dynamic";
import { NextResponse } from "next/server"; import bcrypt from "bcryptjs";
import { db } from "@/lib/db"; import { Admin } from "@/models"; import { sign, audit } from "@/lib/auth"; import { limited } from "@/lib/rate";
const ci = { locale: "en", strength: 2 } as const; // case-insensitive email match
export async function POST(req: Request) {
  try {
    if (!process.env.JWT_SECRET) return NextResponse.json({ error: "Server is missing JWT_SECRET. Add it in Vercel and redeploy." }, { status: 500 });
    await db();
    if (await limited(req, "login", 10, 900)) return NextResponse.json({ error: "Too many attempts. Wait 15 minutes." }, { status: 429 });
    const body = await req.json().catch(() => ({}));
    const email = String(body.email || "").trim().toLowerCase(); const password = String(body.password || "");
    if (!email || !password) return NextResponse.json({ error: "Enter your email and password." }, { status: 400 });

    // First-run bootstrap: if the env seed admin doesn't exist yet, create it when those exact credentials are used.
    const se = (process.env.SEED_ADMIN_EMAIL || "").trim().toLowerCase(); const sp = process.env.SEED_ADMIN_PASSWORD || "";
    if (se && sp && email === se && password === sp && !(await Admin.exists({ email }).collation(ci)))
      await Admin.create({ email, role: "superadmin", passwordHash: await bcrypt.hash(sp, 12) });

    const a: any = await Admin.findOne({ email }).collation(ci);
    if (!a || !(await bcrypt.compare(password, a.passwordHash))) return NextResponse.json({ error: "Wrong email or password." }, { status: 401 });
    await audit(String(a._id), "login", a.email);
    const res = NextResponse.json({ ok: true, role: a.role });
    res.cookies.set("adm", await sign(String(a._id), a.role), { httpOnly: true, secure: true, sameSite: "strict", path: "/", maxAge: 28800 });
    return res;
  } catch (e: any) {
    console.error("login error", e);
    const m = String(e?.message || "");
    const error = /bad auth|authentication failed/i.test(m) ? "Database login failed: the username or password in MONGODB_URI is wrong."
      : /ENOTFOUND|ECONNREFUSED|selection|timed out|ETIMEDOUT/i.test(m) ? "Can't reach the database. In Atlas, allow 0.0.0.0/0 under Network Access."
      : m.includes("MONGODB_URI") ? "MONGODB_URI is missing in Vercel." : "Server error. Check the Vercel function logs.";
    return NextResponse.json({ error }, { status: 500 });
  }
}
