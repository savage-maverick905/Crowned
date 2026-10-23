import { z } from "zod";
// An image is either an external https URL or one uploaded through the admin panel (/api/img/<id>).
export const imageRef = z.string().refine(
  u => /^\/api\/img\/[a-f0-9]{24}$/.test(u) || (/^https:\/\/\S+$/.test(u) && (() => { try { new URL(u); return true; } catch { return false; } })()),
  "Image must be an https link or an uploaded image",
);
