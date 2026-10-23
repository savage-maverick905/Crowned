import mongoose, { Schema, models, model } from "mongoose";
const Poll = models.Poll || model("Poll", new Schema({
  title: { type: String, required: true }, description: String,
  status: { type: String, enum: ["draft", "open", "closed"], default: "draft" },
  pricePerVote: { type: Number, default: 100 }, // naira
  announcement: String, announcementHtml: String, announcementCss: String, // announcement: plain text; Html/Css: optional custom markup
  announcementMode: { type: String, enum: ["popup", "inline"], default: "popup" }, announcementRev: { type: Number, default: 0 }, // rev bump = show again to everyone
  coverUrl: String, endsAt: Date,
  itemSingular: { type: String, default: "Item" }, itemPlural: { type: String, default: "Items" },
}, { timestamps: true }));
const Player = models.Player || model("Player", new Schema({
  pollId: { type: Schema.Types.ObjectId, index: true }, name: { type: String, required: true }, edition: String,
  imageUrl: String, bio: String,
  seededVotes: { type: Number, default: 0, min: 0 }, // admin-adjustable baseline, NEVER real votes
}, { timestamps: true }));
const tx = new Schema({
  reference: { type: String, unique: true, required: true },
  pollId: Schema.Types.ObjectId, playerId: { type: Schema.Types.ObjectId, index: true },
  votes: { type: Number, required: true, immutable: true },
  amountKobo: { type: Number, required: true, immutable: true },
  pricePerVote: { type: Number, immutable: true },
  email: String, ipHash: String,
  partnerId: { type: Schema.Types.ObjectId, index: true }, // referral partner who brought this vote, if any
  commissionPct: { type: Number, immutable: true }, commissionKobo: { type: Number, immutable: true }, // snapshot at checkout, so later % changes never rewrite history
  status: { type: String, enum: ["pending", "success", "failed"], default: "pending" },
}, { timestamps: true });
// Verified real votes are immutable: no update/delete of success rows.
for (const h of ["updateOne", "findOneAndUpdate", "updateMany"] as const)
  tx.pre(h as any, function (this: any, next: any) {
    const f = this.getFilter(); if (f.status === "pending") return next();
    next(new Error("Transactions can only be updated via pending->success fulfilment"));
  });
for (const h of ["deleteOne", "deleteMany", "findOneAndDelete"] as const)
  tx.pre(h as any, function (next: any) { next(new Error("Transactions are immutable")); });
const Transaction = models.Transaction || model("Transaction", tx);
const Admin = models.Admin || model("Admin", new Schema({
  email: { type: String, unique: true }, passwordHash: String,
  role: { type: String, enum: ["superadmin", "editor", "analyst"], default: "editor" },
}, { timestamps: true }));
const Audit = models.Audit || model("Audit", new Schema({
  adminId: String, action: String, target: String, meta: Schema.Types.Mixed,
}, { timestamps: true }));
const RateHit = models.RateHit || model("RateHit", new Schema({
  key: { type: String, index: true }, at: { type: Date, default: Date.now, expires: 3600 },
}));
const Notice = models.Notice || model("Notice", new Schema({
  title: String, text: String, html: String, css: String, // custom html/css are rendered in a script-less sandbox
  active: { type: Boolean, default: true }, rev: { type: Number, default: 1 }, // rev bump = show again to everyone
}, { timestamps: true }));
// Images uploaded from the admin panel (resized in the browser, so each is small).
const Img = models.Img || model("Img", new Schema({
  data: { type: Buffer, required: true }, contentType: { type: String, required: true }, size: Number, by: String,
}, { timestamps: true }));
const Partner = models.Partner || model("Partner", new Schema({
  name: { type: String, required: true }, email: { type: String, unique: true }, code: { type: String, unique: true, index: true },
  passwordHash: String, commissionPct: { type: Number, default: 10, min: 0, max: 100 }, active: { type: Boolean, default: true },
  status: { type: String, enum: ["pending", "approved"], default: "approved" }, // self-signups start as pending (and inactive) until an admin approves
}, { timestamps: true }));
const Payout = models.Payout || model("Payout", new Schema({
  partnerId: { type: Schema.Types.ObjectId, index: true }, amountKobo: { type: Number, required: true }, note: String, by: String,
}, { timestamps: true }));
export { Partner, Payout, Img, Notice, Poll, Player, Transaction, Admin, Audit, RateHit };
