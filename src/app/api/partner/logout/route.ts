import { NextResponse } from "next/server";
export async function POST() { const r = NextResponse.json({ ok: true }); r.cookies.set("ptn", "", { httpOnly: true, secure: true, sameSite: "strict", path: "/", maxAge: 0 }); return r; }
