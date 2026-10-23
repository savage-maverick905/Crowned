import { NextResponse } from "next/server"; import { db } from "@/lib/db"; import { Notice } from "@/models";
export const dynamic = "force-dynamic";
export async function GET() { await db(); const n = await Notice.find({ active: true }).sort({ createdAt: -1 }).limit(5).lean();
  return NextResponse.json({ notices: (n as any[]).map(x => ({ id: String(x._id), rev: x.rev ?? 0, title: x.title || "", text: x.text || "", html: x.html || "", css: x.css || "" })) }); }
