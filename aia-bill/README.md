# KoreFi Billing — AI Accountant

Billing and access control admin portal for AI Accountant (AIA). Built with Next.js 16, React 19, Tailwind CSS 4, and Polar.sh for payment processing.

## Quick Start

```bash
npm install
cp .env.local.example .env.local
# Fill in values from Polar dashboard (see instructions below)
npm run dev
```

Opens at [http://localhost:5660](http://localhost:5660).

## Routes

| Path | Purpose |
|---|---|
| `/` | Admin dashboard (overview, customers, leads, upgrade requests, audit log, packages) |
| `/portal/[customerId]` | Customer-facing portal — billing info, module access, request upgrades |
| `/get-started` | Lead capture form for website visitors |
| `/checkout/success` | Post-payment landing page |
| `/checkout/cancel` | Cancelled checkout landing page |

## Sandbox Dry-Run Setup

You need a Polar.sh sandbox account. These steps are done once.

### 1. Configure Polar Products

1. Log in to https://sandbox.polar.sh with org slug **aia**
2. Create 3 products matching the demo plan mappings:

| Product Name | Price | Billing | Product ID (example) |
|---|---|---|---|
| Starter Monthly | ₹1,499 | 1 month | `prod_starter_monthly_...` |
| Growth Monthly | ₹3,999 | 1 month | `prod_growth_monthly_...` |
| Growth Quarterly | ₹10,799 | 3 months (interval_count=3) | `prod_growth_quarterly_...` |

3. Enable **14-day trial** on Starter Monthly product (for trial-flow testing).
4. Copy each `product_id` and `price_id` into `lib/billing/store.ts` in the `initializeDemoData()` function under `demoPlanMappings`. Replace the stub `polarProductId`/`polarPriceId` values.
5. Bump `CURRENT_VERSION` at `lib/billing/store.ts:26` by 1 to force a reseed on next page load.

### 2. Set Up Tunnel

Polar webhooks need to reach your dev server. Use ngrok or cloudflared:

```bash
npx ngrok http 5660
# or
cloudflared tunnel --url http://localhost:5660
```

Copy the HTTPS tunnel URL (e.g. `https://abc123.ngrok.app`).

### 3. Configure Environment

Edit `.env.local`:

```env
POLAR_ACCESS_TOKEN=polar_oat_PobTPKDDWSHTQiecU340RjXyZaG1OckJI2x0R4MSbeA
POLAR_ORG_ID=dd66354d-88a6-433f-b493-43f58cc3a03f
POLAR_SERVER=sandbox
POLAR_WEBHOOK_SECRET=<from step 4>
NEXT_PUBLIC_APP_URL=https://your-tunnel-url.ngrok.app
```

### 4. Create Webhook Endpoint

1. In Polar sandbox dashboard → Webhooks → Create Endpoint
2. URL: `https://your-tunnel-url.ngrok.app/api/polar/webhooks`
3. Subscribe to these events:
   - `checkout.created`, `checkout.updated`
   - `customer.created`, `customer.updated`, `customer.state_changed`
   - `subscription.created`, `subscription.updated`, `subscription.active`
   - `subscription.canceled`, `subscription.revoked`
   - `order.created`, `order.paid`, `order.refunded`
4. Copy the **Signing Secret** → set as `POLAR_WEBHOOK_SECRET` in `.env.local`
5. Restart the dev server.

### 5. Run End-to-End

1. **Create customer** in admin → check Polar dashboard for customer record
2. **Generate checkout** (payment mode) → pay with Polar test card (`4000000000000077`)
3. **Create customer in trial mode** → verify status is `trial`
4. **Cancel subscription** in Polar dashboard → verify status flips to `inactive`
5. **Customer portal** at `/portal/cust_demo_1` → request module access → approve in admin
6. **Lead form** at `/get-started` → submit → verify entry in admin Leads tab
7. **Audit log** shows both human (`CS User`) and `polar:webhook` actor entries

### Polar Test Cards

| Card Number | Result |
|---|---|
| `4000000000000077` | Success |
| `4000000000000002` | Decline |
| `4000000000000069` | Expired |

## Architecture Notes

- **All state** is persisted to localStorage (client) and mirrored to `.data/billing.json` on disk (server). No database.
- **Server-only code** uses `lib/polar/client.ts` (imports `"server-only"`). Polar SDK is never called from the browser.
- **Webhook handler** verifies Standard Webhooks signatures on the raw body before processing.
- **No auth** — the hardcoded `"CS User"` actor is used throughout the admin UI.
- **No real email** — `mailto:` links remain as placeholders.

## File Structure

```
app/
  page.tsx                          — Admin dashboard (main route)
  layout.tsx                        — Root layout with fonts + Toast
  portal/[customerId]/page.tsx      — Customer portal
  get-started/page.tsx              — Lead capture form
  checkout/success/page.tsx         — Payment success page
  checkout/cancel/page.tsx          — Payment cancel page
  api/
    sync/route.ts                   — GET snapshot of .data/billing.json
    polar/
      customers/route.ts            — POST create Polar customer
      checkout/route.ts             — POST create Polar checkout
      customer-session/route.ts     — POST mint customer portal session
      resync/[customerId]/route.ts  — POST resync from Polar
      subscriptions/[id]/route.ts   — DELETE cancel subscription
      webhooks/route.ts             — POST handle Polar webhook events
components/
  admin/                            — Admin UI components (dashboard, customer views, tabs)
  customer/                         — Customer-facing components (portal, lead form)
  layout/                           — AppShell sidebar layout
  ui/                               — Reusable primitives (Button, Toast)
lib/
  billing/
    types.ts                        — All TypeScript types & constants
    store.ts                        — localStorage-based CRUD + demo seed
    server-store.ts                 — File-system-based CRUD for server routes
    index.ts                        — Barrel export
  polar/
    client.ts                       — Single Polar SDK instance (server-only)
  utils.ts                          — cn() helper (clsx + tailwind-merge)
```

## Out of Scope

- Two-way product sync between PlanMappingTab and Polar (seed manually for now)
- Grace-period cron (depends on Polar dunning events)
- Multi-currency, real auth, real email
- `previousStatusBeforeFreeze` field (declared in types, not yet wired)
