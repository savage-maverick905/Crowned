import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import mongoose from "mongoose";
import { Partner, Payout, Transaction } from "@/models";
import { db } from "./db";
const key = () => new TextEncoder().encode(process.env.JWT_SECRET);
export const signPartner = (id: string) => new SignJWT({ id, kind: "partner" }).setProtectedHeader({ alg: "HS256" }).setExpirationTime("24h").sign(key());
export async function requirePartner() {
  const t = cookies().get("ptn")?.value; if (!t) return null;
  try {
    const { payload } = await jwtVerify(t, key()); const p = payload as any; if (p.kind !== "partner") return null;
    await db(); const d: any = await Partner.findById(p.id);
    return d && d.active ? d : null; // deactivating a partner locks them out immediately
  } catch { return null; }
}
export const makeCode = (name: string) => (name.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 10) || "p") + "-" + Math.random().toString(36).slice(2, 6);
const oid = (id: any) => new mongoose.Types.ObjectId(String(id));
/** Earnings per partner: only verified (success) payments count. Amounts in kobo. */
export async function partnerStats(ids?: string[]) {
  const match: any = { status: "success", partnerId: ids ? { $in: ids.map(oid) } : { $exists: true } };
  const [tx, po] = await Promise.all([
    Transaction.aggregate([{ $match: match }, { $group: { _id: "$partnerId", payments: { $sum: 1 }, votes: { $sum: "$votes" }, gross: { $sum: "$amountKobo" }, earned: { $sum: "$commissionKobo" } } }]),
    Payout.aggregate([{ $match: ids ? { partnerId: { $in: ids.map(oid) } } : {} }, { $group: { _id: "$partnerId", paid: { $sum: "$amountKobo" } } }]),
  ]);
  const m = new Map<string, { payments: number; votes: number; gross: number; earned: number; paid: number; balance: number }>();
  const get = (id: any) => { const k = String(id); if (!m.has(k)) m.set(k, { payments: 0, votes: 0, gross: 0, earned: 0, paid: 0, balance: 0 }); return m.get(k)!; };
  for (const r of tx) Object.assign(get(r._id), { payments: r.payments, votes: r.votes, gross: r.gross, earned: r.earned });
  for (const r of po) get(r._id).paid = r.paid;
  for (const v of m.values()) v.balance = v.earned - v.paid;
  return m;
}
export const emptyStats = { payments: 0, votes: 0, gross: 0, earned: 0, paid: 0, balance: 0 };
