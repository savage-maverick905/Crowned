import mongoose from "mongoose"; import bcrypt from "bcryptjs"; import { Admin, Poll, Player } from "../src/models";
(async () => { await mongoose.connect(process.env.MONGODB_URI!);
  await Admin.updateOne({ email: process.env.SEED_ADMIN_EMAIL!.trim().toLowerCase() }, { email: process.env.SEED_ADMIN_EMAIL!.trim().toLowerCase(), role: "superadmin",
    passwordHash: await bcrypt.hash(process.env.SEED_ADMIN_PASSWORD!, 12) }, { upsert: true });
  if (!(await Poll.countDocuments())) { const p: any = await Poll.create({ title: "Nigeria Football GOAT", status: "open", pricePerVote: 100 });
    await Player.create([{ pollId: p._id, name: "Example Player A" }, { pollId: p._id, name: "Example Player B" }]); }
  console.log("seeded (no votes created)"); process.exit(0); })();
