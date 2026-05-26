# V0 Billing Module Refactor

**Date:** 2026-05-25  
**Status:** Approved for implementation

## Goal

Retrofit the existing prototype to a minimal, clean V0 billing module. Remove module-by-module access control, plan mappings, free trials, grace periods, and freeze logic. Replace with a simple create-customer → set-price → generate-payment-link flow where all AIA modules are always included.

## Core Simplifications

| Removed | Replaced with |
|---|---|
| Module selection (8 toggles) | All modules always on, no tracking needed |
| Plan Mapping catalogue | Free-form price (₹) + billing cadence on the customer record |
| Free trial flow | Gone entirely |
| Grace period / freeze logic | Gone entirely — failed payment → `payment_failed` status |
| Leads tab | Gone |
| Upgrade Requests tab | Gone |
| Packages tab | Gone |
| 9 account statuses | 4 statuses: `draft`, `payment_pending`, `active`, `payment_failed`, `inactive` |

---

## Data Model

### `CustomerAccount`

```typescript
type AccountStatus = "draft" | "payment_pending" | "active" | "payment_failed" | "inactive";
type BillingFrequency = "monthly" | "quarterly" | "annual";

interface CustomerAccount {
  id: string;                    // "cust_<timestamp>"
  companyName: string;
  gstin?: string;
  primaryName: string;
  primaryEmail: string;
  primaryPhone?: string;
  billingName?: string;          // only populated when different from primary
  billingEmail?: string;
  billingPhone?: string;
  csOwner?: string;
  bdOwner?: string;
  status: AccountStatus;
  price: number;                 // INR, free-form
  billingFrequency: BillingFrequency;
  dodoCustomerId?: string;
  dodoSubscriptionId?: string;
  dodoProductId?: string;        // one product created per customer at link-gen time
  checkoutUrl?: string;          // Dodo checkout session URL (refreshable)
  signupUrl?: string;            // https://app.aiaccountant.com/sign-up?ref=<id>
  createdAt: string;
  activatedAt?: string;
  renewalDueDate?: string;
  notes?: string;
}
```

### Removed Types (delete entirely)
- `Lead`
- `PlanMapping`
- `UpgradeRequest`
- `CalculatorInput` / `CalculatorResult`
- `ModuleId` and all module-related constants

### `AuditEntry` — unchanged

---

## Account Lifecycle

```
draft ──► payment_pending ──► active ──► inactive
                          └──► payment_failed ──► inactive
                                              └──► active  (on retry / manual resync)
```

| Status | Set by |
|---|---|
| `draft` | Admin creates customer |
| `payment_pending` | Admin generates payment link |
| `active` | `subscription.active` or `subscription.renewed` webhook |
| `payment_failed` | `subscription.on_hold` or `subscription.failed` webhook |
| `inactive` | `subscription.cancelled` or `subscription.expired` webhook |

---

## Create Customer Form

Fields (single form, no tabs):
1. Company name (required), GSTIN (optional)
2. Primary contact: name (required), email (required), phone (optional)
3. Billing contact: "Same as primary" checkbox (default on); if unchecked: name, email, phone
4. Pricing: price in ₹ (required, number input), billing frequency (monthly / quarterly / annual, default monthly)
5. Team: CS Owner, BD Owner (optional dropdowns)
6. Notes (optional textarea)

On save → status = `draft`, no Dodo calls.

---

## Generate Payment Link Flow

Route: `POST /api/dodo/generate-link`  
Triggered by admin clicking **Generate Payment Link** on customer detail.

```
Step 1 — Create Dodo product (if dodoProductId not already set)
  POST /products
  { name: "AIA Subscription – <companyName>", price: customer.price,
    currency: "INR", billing_period: customer.billingFrequency,
    tax_category: "saas" }
  → save dodoProductId

Step 2 — Create Dodo customer (if dodoCustomerId not already set)
  POST /customers
  { name: primaryName, email: primaryEmail, phone_number: primaryPhone }
  → save dodoCustomerId

Step 3 — Create checkout session
  POST /checkouts
  { product_cart: [{product_id: dodoProductId, quantity: 1}],
    customer: {customer_id: dodoCustomerId},
    return_url: "https://app.aiaccountant.com/configuration",
    cancel_url: "https://app.aiaccountant.com/sign-up?ref=<id>&cancelled=true",
    metadata: {customer_account_id: customer.id},
    billing_address: {country: "IN"} }
  → save checkoutUrl

Step 4 — Construct sign-up URL
  signupUrl = "https://app.aiaccountant.com/sign-up?ref=<customer.id>"
  → save signupUrl

Step 5 — status → payment_pending, audit log entry
```

On re-generation (link already exists): skip steps 1–2, create fresh checkout session only.

---

## Public Checkout Lookup Endpoint

```
GET /api/customers/[customerId]/checkout
Auth: none (customer ID is the access token)
Response: { checkout_url: string }
```

Used by the AIA app after sign-up to redirect the user to checkout.  
If `checkoutUrl` is missing or expired, auto-regenerates (step 3 above) before responding.

---

## Webhook Handling

Route: `POST /api/dodo/webhooks` (unchanged path, simplified handlers)

| Event | Status | Extra fields updated |
|---|---|---|
| `subscription.active` | `active` | `activatedAt` (if first activation), `dodoSubscriptionId`, `renewalDueDate` from `next_billing_date` |
| `subscription.renewed` | `active` | `renewalDueDate` |
| `subscription.on_hold` | `payment_failed` | — |
| `subscription.failed` | `payment_failed` | — |
| `subscription.cancelled` | `inactive` | — |
| `subscription.expired` | `inactive` | — |

Customer lookup: `metadata.customer_account_id` → fallback `dodoCustomerId`.  
Deduplication: keep existing `webhook-events.json` mechanism.

---

## Admin Navigation

**Remove tabs:** Packages, Leads, Upgrade Requests  
**Keep tabs:** Overview, Customers, Audit Log

### Overview stats
- **Active** — count + total MRR (sum of `price` for all active customers, labelled by frequency)
- **Payment Pending** — count
- **Payment Failed** — count (new, replaces Grace/Frozen)

---

## Customer Detail View

**Remove:** Plan & Modules tab, trial extension action, freeze/unfreeze action, module grant/revoke modal.

**Keep:**
- Company info section (name, GSTIN, CS/BD owner)
- Contact info section (primary + billing)
- Pricing section (price, frequency, renewal date when active)
- Status badge + status timeline
- **Generate Payment Link** — primary CTA; shows sign-up URL after generation with copy button
- Resync from Dodo
- Add Note
- Edit Contact
- Delete customer

---

## Files Changed

| File | Action |
|---|---|
| `lib/billing/types.ts` | Rewrite — 4 types removed, CustomerAccount stripped |
| `lib/billing/store.ts` | Rewrite — remove module/plan/lead/upgrade/calculator logic |
| `lib/billing/index.ts` | Update barrel exports |
| `components/admin/AdminDashboard.tsx` | Remove 3 tabs from nav |
| `components/admin/OverviewTab.tsx` | Rewrite stats section |
| `components/admin/CreateCustomerView.tsx` | Rewrite form |
| `components/admin/CustomerDetailView.tsx` | Remove module/trial/freeze sections |
| `components/admin/PlanMappingTab.tsx` | **Delete** |
| `components/admin/LeadsTab.tsx` | **Delete** |
| `components/admin/UpgradeRequestsTab.tsx` | **Delete** |
| `app/api/dodo/checkout/route.ts` | Rewrite → generate-link logic |
| `app/api/customers/[customerId]/route.ts` | Add `/checkout` sub-route |
| `app/api/dodo/webhooks/route.ts` | Trim grace/freeze handlers |
| `app/portal/[customerId]/page.tsx` | Remove (no customer portal in V0) |
| `app/get-started/page.tsx` | Remove (lead capture gone in V0) |

---

## What Does NOT Change

- Auth system (HMAC OTP + session cookie + middleware)
- MDS component library (`components/mds/`)
- File-based storage pattern (localStorage + `billing.json`)
- Audit log structure and display
- `lib/auth/session.ts`, `lib/dodo/client.ts`, `lib/utils.ts`
- `app/api/sync/route.ts`, `app/api/auth/*`
