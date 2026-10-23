import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { Admin, Audit } from "@/models";
import { db } from "./db";
const key = () => new TextEncoder().encode(process.env.JWT_SECRET);
export type Role = "superadmin" | "editor" | "analyst";
export async function sign(id: string, role: Role) {
  return new SignJWT({ id, role }).setProtectedHeader({ alg: "HS256" }).setExpirationTime("8h").sign(key());
}
export async function requireAdmin(roles: Role[]) {
  const t = cookies().get("adm")?.value; if (!t) return null;
  try { const { payload } = await jwtVerify(t, key()); const p = payload as any;
    // Role comes from the database, so removing or demoting an admin takes effect immediately.
    await db(); const a: any = await Admin.findById(p.id).select("role").lean(); if (!a) return null;
    return roles.includes(a.role) ? { id: String(p.id), role: a.role as Role } : null; } catch { return null; }
}
export const audit = (adminId: string, action: string, target: string, meta?: any) => Audit.create({ adminId, action, target, meta });
