# Crowned (Next.js + MongoDB + Paystack)
**Before going live:** get written confirmation from Paystack that this paid-voting model is permitted.

## Setup
1. `npm i`; copy `.env.example` to `.env.local` and fill it in.
2. MongoDB Atlas: create a free cluster, add a DB user, allow Vercel IPs (0.0.0.0/0 for serverless), paste the SRV string into `MONGODB_URI`.
3. Paystack: Dashboard > Settings > API Keys. Use `sk_test_` for sandbox, `sk_live_` for live. Set the webhook URL to `https://YOUR_DOMAIN/api/webhook`.
4. `npm run seed` (creates the superadmin and a sample poll with zero votes), `npm run dev`, `npm test`.
5. Add `public/icon-192.png` and `public/icon-512.png` (needed for PWA install).
## Deploy on Vercel
Push to GitHub, import in Vercel, add all env vars, deploy, set `NEXT_PUBLIC_SITE_URL`.
## Design
- Price is computed server-side. A transaction is counted only after server-side Paystack verification (amount, currency, status). The webhook is HMAC-SHA512 signed and idempotent.
- Real votes are derived from immutable `success` transactions. Seeded baseline lives on the player and is adjusted via `/api/admin/seeded` with an audit log entry.
- Images are uploaded from the admin panel (resized in the browser, stored in MongoDB, auto-deleted once nothing uses them, served from `/api/img/<id>`). Pasting an https link still works.
- Public pages disclose that totals include admin-set baseline votes.
- Roles: superadmin, editor, analyst. Rate limits on checkout, verify and login.

## Popups, announcements and notices
- Payment confirmations and other messages are popups with an OK button. After OK on a payment, `?ref=` is removed from the URL and remembered, so it never shows again.
- Notices (Admin > Notices) and poll announcements are popups shown once per visitor (remembered in their browser). Editing one, or pressing **Resend**, shows it to everyone again.
- You can write custom **HTML + CSS** for both. They render inside a sandboxed iframe with scripts disabled, so pasted code can style things but can never run JavaScript or touch the site.
- Notices can be edited, hidden, shown again, resent, or deleted permanently. Poll announcements can be edited or removed from the poll card.

## Sharing an item
Every item card has a share button. The link is `/poll/<id>?item=<itemId>`: it scrolls to and pre-selects that item, and link previews (WhatsApp, X, etc.) show that item's name and photo. Admins can copy the same links from the poll card.

## Admin tabs
Analytics, Polls (poll/item CRUD, baseline, announcement), Notices, Payments (read-only list with filters), Admins (create, change role, reset password, remove), Audit log, My account (change password). Role changes and removals take effect immediately.

Dependencies were not installed and tests not run here (no network).
## Admin
Open `/admin`. Superadmin: everything, including creating admins and deleting players with no paid votes. Editor: polls, players, seeded adjustments, notifications. Analyst: read-only analytics and audit log.
Players with verified paid votes can never be deleted, and paid transactions can never be edited.
## Status
Run `npm i && npm test && npm run build` yourself; dependencies were not installed in the build environment. Replace the placeholder crown icons in `public/` with your own artwork if you like.
