import { createHmac, timingSafeEqual } from "crypto";
import { Transaction } from "@/models";
const BASE = "https://api.paystack.co";
const H = () => ({ Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`, "Content-Type": "application/json" });
export async function initialize(email: string, amountKobo: number, reference: string, callback_url: string) {
  const r = await fetch(`${BASE}/transaction/initialize`, { method: "POST", headers: H(),
    body: JSON.stringify({ email, amount: amountKobo, currency: "NGN", reference, callback_url }) });
  const j = await r.json(); if (!j.status) throw new Error(j.message); return j.data as { authorization_url: string };
}
/** Server-side verify. Idempotent: only pending->success once, amount must match our record. */
export async function fulfil(reference: string) {
  const tx = await Transaction.findOne({ reference });
  if (!tx) return { ok: false, reason: "unknown" };
  if (tx.status === "success") return { ok: true, already: true };
  const r = await fetch(`${BASE}/transaction/verify/${encodeURIComponent(reference)}`, { headers: H() });
  const j = await r.json();
  const d = j?.data;
  if (!j.status || d?.status !== "success" || d.currency !== "NGN" || (d.requested_amount ?? d.amount) < tx.amountKobo)
    return { ok: false, reason: "not_verified" };
  await Transaction.updateOne({ reference, status: "pending" }, { status: "success" });
  return { ok: true };
}
export function validSignature(raw: string, sig: string | null) {
  if (!sig) return false;
  const h = createHmac("sha512", process.env.PAYSTACK_SECRET_KEY || "").update(raw).digest("hex");
  const a = Buffer.from(h), b = Buffer.from(sig);
  return a.length === b.length && timingSafeEqual(a, b);
}
