import mongoose from "mongoose";
const g = globalThis as any;
export async function db() {
  if (!process.env.MONGODB_URI) throw new Error("MONGODB_URI missing");
  // Don't cache a failed connection, otherwise one bad attempt breaks every later request on a warm server.
  g._m ||= mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 8000 }).catch((e) => { g._m = undefined; throw e; });
  return g._m;
}
