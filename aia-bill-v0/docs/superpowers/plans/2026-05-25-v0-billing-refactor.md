# V0 Billing Module Refactor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Retrofit the korefi-billing prototype to the V0 spec — removing module management, plan mappings, trials, grace/freeze, and replacing with a simple create-customer → set-price → generate-payment-link flow.

**Architecture:** Work bottom-up: types first (everything imports from here), then server/client stores, then API routes, then UI components. Each task is independently compilable after the previous one completes. CustomerDetailView rewritten last since it depends on all prior layers.

**Tech Stack:** Next.js 16, React 19, TypeScript 5, Tailwind CSS 4, dodopayments SDK v2.31.2, standardwebhooks

---

## File Map

| File | Action |
|---|---|
| `lib/billing/types.ts` | Rewrite |
| `lib/billing/store.ts` | Rewrite |
| `lib/billing/server-store.ts` | Rewrite |
| `lib/billing/index.ts` | Unchanged (re-exports store) |
| `app/api/sync/route.ts` | Update BillingData shape |
| `app/api/dodo/checkout/route.ts` | Rewrite → generate-link logic |
| `app/api/customers/[customerId]/checkout/route.ts` | Create new |
| `app/api/dodo/webhooks/route.ts` | Trim grace/freeze handlers |
| `components/layout/AppShell.tsx` | Remove plan-mapping tab |
| `components/admin/AdminDashboard.tsx` | Remove plan/lead/upgrade refs |
| `components/admin/OverviewTab.tsx` | Update stats for new statuses |
| `components/admin/CreateCustomerView.tsx` | Rewrite |
| `components/admin/CustomerDetailView.tsx` | Rewrite |
| `components/admin/PlanMappingTab.tsx` | Delete |
| `components/admin/LeadsTab.tsx` | Delete |
| `components/admin/UpgradeRequestsTab.tsx` | Delete |
| `app/portal/[customerId]/` | Delete |
| `app/get-started/` | Delete |

---

### Task 1: Rewrite `lib/billing/types.ts`

**Files:**
- Modify: `lib/billing/types.ts`

- [ ] **Step 1: Replace the entire file**

```typescript
export type AccountStatus =
  | "draft"
  | "payment_pending"
  | "active"
  | "payment_failed"
  | "inactive";

export type BillingFrequency = "monthly" | "quarterly" | "annual";

export interface CustomerAccount {
  id: string;
  companyName: string;
  gstin?: string;
  primaryName: string;
  primaryEmail: string;
  primaryPhone?: string;
  billingName?: string;
  billingEmail?: string;
  billingPhone?: string;
  csOwner?: string;
  bdOwner?: string;
  status: AccountStatus;
  price: number;
  billingFrequency: BillingFrequency;
  dodoCustomerId?: string;
  dodoSubscriptionId?: string;
  dodoProductId?: string;
  checkoutUrl?: string;
  signupUrl?: string;
  createdAt: string;
  activatedAt?: string;
  renewalDueDate?: string;
  notes?: string;
}

export interface AuditEntry {
  id: string;
  actor: string;
  action: string;
  entityType: "customer" | "system";
  entityId: string;
  oldValue?: unknown;
  newValue?: unknown;
  reason?: string;
  timestamp: string;
}

export const CS_OWNERS = [
  "Priya Nair",
  "Rahul Sharma",
  "Ananya Gupta",
  "Vikram Patel",
  "Sneha Reddy",
];

export const BD_OWNERS = [
  "Arjun Mehta",
  "Kavita Singh",
  "Rohit Verma",
  "Deepa Iyer",
  "Amit Joshi",
];
```

- [ ] **Step 2: Compile check**

```bash
cd /root/Codespace/ember/aia/korefi-billing && npx tsc --noEmit 2>&1 | grep "types.ts" | head -20
```

Expected: no errors in `types.ts` itself (downstream files will error — that's fine at this stage).

- [ ] **Step 3: Commit**

```bash
cd /root/Codespace/ember/aia/korefi-billing && git add lib/billing/types.ts && git commit -m "refactor(types): v0 — strip to CustomerAccount + AuditEntry only"
```

---

### Task 2: Rewrite `lib/billing/store.ts`

**Files:**
- Modify: `lib/billing/store.ts`

- [ ] **Step 1: Replace the entire file**

```typescript
"use client";

import type { CustomerAccount, AuditEntry } from "./types";

const KEYS = {
  CUSTOMERS: "aia-customers",
  AUDIT_LOG: "aia-audit-log",
  DATA_VERSION: "aia-data-version",
} as const;

const CURRENT_VERSION = 5;

function get<T>(key: string): T[] {
  if (typeof window === "undefined") return [];
  try { return JSON.parse(localStorage.getItem(key) ?? "[]"); } catch { return []; }
}

function set<T>(key: string, data: T[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(key, JSON.stringify(data));
}

// ── Customers ──────────────────────────────────────────────────────────────

export function loadCustomers(): CustomerAccount[] {
  return get<CustomerAccount>(KEYS.CUSTOMERS);
}

export function saveCustomer(customer: CustomerAccount): void {
  const all = loadCustomers();
  const idx = all.findIndex((c) => c.id === customer.id);
  if (idx >= 0) all[idx] = customer; else all.unshift(customer);
  set(KEYS.CUSTOMERS, all);
}

export function getCustomer(id: string): CustomerAccount | undefined {
  return loadCustomers().find((c) => c.id === id);
}

export function deleteCustomer(id: string): void {
  set(KEYS.CUSTOMERS, loadCustomers().filter((c) => c.id !== id));
}

// ── Audit Log ──────────────────────────────────────────────────────────────

export function loadAuditLog(): AuditEntry[] {
  return get<AuditEntry>(KEYS.AUDIT_LOG);
}

export function addAuditEntry(entry: Omit<AuditEntry, "id" | "timestamp">): AuditEntry {
  const full: AuditEntry = {
    ...entry,
    id: `audit_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    timestamp: new Date().toISOString(),
  };
  const log = loadAuditLog();
  log.unshift(full);
  set(KEYS.AUDIT_LOG, log.slice(0, 500));
  return full;
}

export function addNoteToCustomer(id: string, note: string, actor: string): void {
  const customer = getCustomer(id);
  if (!customer) return;
  const timestamp = new Date().toLocaleString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
  const appended = customer.notes
    ? `${customer.notes}\n\n[${timestamp}] ${note}`
    : `[${timestamp}] ${note}`;
  saveCustomer({ ...customer, notes: appended });
  addAuditEntry({ actor, action: "note_added", entityType: "customer", entityId: id });
}

// ── Demo Seed ──────────────────────────────────────────────────────────────

export function initializeDemoData(): void {
  if (typeof window === "undefined") return;
  const version = parseInt(localStorage.getItem(KEYS.DATA_VERSION) ?? "0", 10);
  if (version >= CURRENT_VERSION) return;

  const now = Date.now();
  const ago = (days: number) => new Date(now - days * 86400000).toISOString();
  const from = (days: number) => new Date(now + days * 86400000).toISOString();

  const demo: CustomerAccount[] = [
    {
      id: "cust_demo_001",
      companyName: "Acme Industries Pvt Ltd",
      gstin: "29ABCDE1234F1Z5",
      primaryName: "Rajesh Sharma",
      primaryEmail: "rajesh@acmeindustries.in",
      primaryPhone: "+919876543210",
      csOwner: "Priya Nair",
      bdOwner: "Arjun Mehta",
      status: "active",
      price: 3999,
      billingFrequency: "monthly",
      dodoCustomerId: "cus_demo_acme",
      dodoSubscriptionId: "sub_demo_acme",
      dodoProductId: "pdt_demo_acme",
      signupUrl: "https://app.aiaccountant.com/sign-up?ref=cust_demo_001",
      createdAt: ago(30),
      activatedAt: ago(25),
      renewalDueDate: from(5),
    },
    {
      id: "cust_demo_002",
      companyName: "TechStart Solutions",
      primaryName: "Anita Desai",
      primaryEmail: "anita@techstart.in",
      primaryPhone: "+918765432109",
      csOwner: "Rahul Sharma",
      bdOwner: "Kavita Singh",
      status: "payment_pending",
      price: 1499,
      billingFrequency: "monthly",
      dodoCustomerId: "cus_demo_techstart",
      dodoProductId: "pdt_demo_techstart",
      checkoutUrl: "https://test.dodopayments.com/checkout/cs_demo_techstart",
      signupUrl: "https://app.aiaccountant.com/sign-up?ref=cust_demo_002",
      createdAt: ago(5),
    },
    {
      id: "cust_demo_003",
      companyName: "Global Traders Co",
      gstin: "27XYZAB5678G2H9",
      primaryName: "Sanjay Gupta",
      primaryEmail: "sanjay@globaltraders.in",
      billingName: "Accounts Team",
      billingEmail: "billing@globaltraders.in",
      csOwner: "Ananya Gupta",
      bdOwner: "Rohit Verma",
      status: "payment_failed",
      price: 11997,
      billingFrequency: "quarterly",
      dodoCustomerId: "cus_demo_global",
      dodoSubscriptionId: "sub_demo_global",
      dodoProductId: "pdt_demo_global",
      signupUrl: "https://app.aiaccountant.com/sign-up?ref=cust_demo_003",
      createdAt: ago(60),
      activatedAt: ago(55),
    },
    {
      id: "cust_demo_004",
      companyName: "Pinnacle Tech Ventures Pvt Ltd",
      primaryName: "Meera Iyer",
      primaryEmail: "meera@pinnacletech.in",
      primaryPhone: "+917654321098",
      csOwner: "Priya Nair",
      bdOwner: "Arjun Mehta",
      status: "draft",
      price: 3999,
      billingFrequency: "monthly",
      createdAt: ago(2),
    },
  ];

  set(KEYS.CUSTOMERS, demo);
  set(KEYS.AUDIT_LOG, []);
  localStorage.setItem(KEYS.DATA_VERSION, String(CURRENT_VERSION));
}
```

- [ ] **Step 2: Compile check**

```bash
cd /root/Codespace/ember/aia/korefi-billing && npx tsc --noEmit 2>&1 | grep "store.ts" | head -20
```

Expected: no errors in `store.ts` itself.

- [ ] **Step 3: Commit**

```bash
cd /root/Codespace/ember/aia/korefi-billing && git add lib/billing/store.ts && git commit -m "refactor(store): v0 — remove module/plan/lead/upgrade logic"
```

---

### Task 3: Rewrite `lib/billing/server-store.ts`

**Files:**
- Modify: `lib/billing/server-store.ts`

- [ ] **Step 1: Replace the entire file**

```typescript
import "server-only";
import fs from "fs";
import path from "path";
import type { CustomerAccount, AuditEntry } from "./types";

const DATA_DIR = path.resolve(process.cwd(), ".data");
const DATA_FILE = path.join(DATA_DIR, "billing.json");

export type BillingData = {
  customers: CustomerAccount[];
  auditLog: AuditEntry[];
};

const EMPTY: BillingData = { customers: [], auditLog: [] };

function readData(): BillingData {
  try { return JSON.parse(fs.readFileSync(DATA_FILE, "utf-8")) as BillingData; }
  catch { return { ...EMPTY }; }
}

function writeData(data: BillingData): void {
  try {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), "utf-8");
  } catch { /* read-only filesystem (Vercel) — writes are no-ops */ }
}

export function getSnapshot(): BillingData { return readData(); }

export function loadCustomers(): CustomerAccount[] { return readData().customers; }

export function saveCustomer(customer: CustomerAccount): void {
  const data = readData();
  const idx = data.customers.findIndex((c) => c.id === customer.id);
  if (idx >= 0) data.customers[idx] = customer; else data.customers.push(customer);
  writeData(data);
}

export function getCustomer(id: string): CustomerAccount | undefined {
  return loadCustomers().find((c) => c.id === id);
}

export function addAuditEntry(entry: Omit<AuditEntry, "id" | "timestamp">): AuditEntry {
  const data = readData();
  const newEntry: AuditEntry = {
    ...entry,
    id: `audit_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    timestamp: new Date().toISOString(),
  };
  data.auditLog.push(newEntry);
  writeData(data);
  return newEntry;
}

export function mergeFromClient(data: BillingData): void { writeData(data); }
```

- [ ] **Step 2: Commit**

```bash
cd /root/Codespace/ember/aia/korefi-billing && git add lib/billing/server-store.ts && git commit -m "refactor(server-store): v0 — remove Lead/PlanMapping/UpgradeRequest"
```

---

### Task 4: Update `app/api/sync/route.ts`

**Files:**
- Modify: `app/api/sync/route.ts`

- [ ] **Step 1: Replace the file**

The sync route needs to use the new simplified `BillingData` type (no leads/planMappings/upgradeRequests). The POST logic stays the same — only seed if server store is empty.

```typescript
import { NextResponse } from "next/server";
import { getSnapshot, mergeFromClient } from "@/lib/billing/server-store";
import type { BillingData } from "@/lib/billing/server-store";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(getSnapshot());
}

export async function POST(request: Request) {
  const data = await request.json() as BillingData;
  const existing = getSnapshot();
  if (existing.customers.length === 0) {
    mergeFromClient(data);
    return NextResponse.json({ ok: true, seeded: true });
  }
  return NextResponse.json({ ok: true, seeded: false });
}
```

- [ ] **Step 2: Commit**

```bash
cd /root/Codespace/ember/aia/korefi-billing && git add app/api/sync/route.ts && git commit -m "refactor(sync): update BillingData to v0 shape"
```

---

### Task 5: Rewrite `app/api/dodo/checkout/route.ts` → generate-link

**Files:**
- Modify: `app/api/dodo/checkout/route.ts`

This route now does three things in one call: create Dodo product (if needed), create Dodo customer (if needed), create checkout session, return the sign-up URL.

- [ ] **Step 1: Replace the entire file**

```typescript
import { NextResponse } from "next/server";
import { getDodo } from "@/lib/dodo/client";
import { addAuditEntry, saveCustomer, getCustomer } from "@/lib/billing/server-store";
import type { TimeInterval } from "dodopayments/resources/subscriptions";

function toInterval(freq: string): { count: number; interval: TimeInterval } {
  switch (freq) {
    case "quarterly": return { count: 3, interval: "Month" };
    case "annual":    return { count: 1, interval: "Year" };
    default:          return { count: 1, interval: "Month" };
  }
}

// POST /api/dodo/checkout
// Creates Dodo product + customer + checkout session in one call.
// Returns { signupUrl, checkoutUrl, dodoCustomerId, dodoProductId }.
// If dodoProductId / dodoCustomerId already exist on the customer, reuses them
// and only creates a fresh checkout session.
export async function POST(request: Request) {
  const dodo = getDodo();
  if (!dodo) return NextResponse.json({ error: "Dodo not configured" }, { status: 503 });

  const body = await request.json();
  const { customerAccountId } = body;
  if (!customerAccountId) {
    return NextResponse.json({ error: "customerAccountId required" }, { status: 400 });
  }

  const customer = getCustomer(customerAccountId);
  if (!customer) {
    return NextResponse.json({ error: "Customer not found" }, { status: 404 });
  }

  try {
    // Step 1 — Create Dodo product (skip if already exists)
    let dodoProductId = customer.dodoProductId ?? "";
    if (!dodoProductId) {
      const { count, interval } = toInterval(customer.billingFrequency);
      const paise = Math.round(customer.price * 100);
      const product = await dodo.products.create({
        name: `AIA Subscription – ${customer.companyName}`,
        description: `${customer.billingFrequency} subscription to AI Accountant`,
        tax_category: "saas",
        price: {
          type: "recurring_price",
          currency: "INR",
          discount: 0,
          price: paise,
          purchasing_power_parity: false,
          payment_frequency_count: count,
          payment_frequency_interval: interval,
          subscription_period_count: count,
          subscription_period_interval: interval,
        },
      });
      dodoProductId = product.product_id;
    }

    // Step 2 — Create Dodo customer (skip if already exists)
    let dodoCustomerId = customer.dodoCustomerId ?? "";
    if (!dodoCustomerId) {
      if (!customer.primaryEmail) {
        return NextResponse.json({ error: "primaryEmail required" }, { status: 400 });
      }
      const stripped = (customer.primaryPhone ?? "").replace(/\s+/g, "").replace(/[^\d+]/g, "");
      const validPhone = /^\+\d{10,15}$/.test(stripped) ? stripped : undefined;
      const dc = await dodo.customers.create({
        name: customer.primaryName ?? customer.primaryEmail,
        email: customer.primaryEmail,
        phone_number: validPhone,
      });
      dodoCustomerId = dc.customer_id;
    }

    // Step 3 — Create fresh checkout session
    const session = await dodo.checkoutSessions.create({
      product_cart: [{ product_id: dodoProductId, quantity: 1 }],
      customer: { customer_id: dodoCustomerId },
      billing_address: { country: "IN" },
      return_url: "https://app.aiaccountant.com/configuration",
      cancel_url: `https://app.aiaccountant.com/sign-up?ref=${customerAccountId}&cancelled=true`,
      metadata: { customer_account_id: customerAccountId },
    });

    const checkoutUrl = session.checkout_url ?? "";
    const signupUrl = `https://app.aiaccountant.com/sign-up?ref=${customerAccountId}`;

    // Persist to billing.json so webhook handler can find this customer
    saveCustomer({
      ...customer,
      dodoCustomerId,
      dodoProductId,
      checkoutUrl,
      signupUrl,
      status: "payment_pending",
    });

    addAuditEntry({
      actor: "CS User",
      action: "payment_link_generated",
      entityType: "customer",
      entityId: customerAccountId,
      newValue: signupUrl,
      reason: "Payment link generated",
    });

    return NextResponse.json({ signupUrl, checkoutUrl, dodoCustomerId, dodoProductId });
  } catch (err: any) {
    console.error("POST /api/dodo/checkout error:", err);
    return NextResponse.json({ error: err?.message ?? "Failed to generate link" }, { status: 500 });
  }
}
```

- [ ] **Step 2: Commit**

```bash
cd /root/Codespace/ember/aia/korefi-billing && git add app/api/dodo/checkout/route.ts && git commit -m "refactor(api): rewrite checkout → generate-link (product+customer+session)"
```

---

### Task 6: Create `app/api/customers/[customerId]/checkout/route.ts`

**Files:**
- Create: `app/api/customers/[customerId]/checkout/route.ts`

This is the public endpoint the AIA app calls after sign-up to get the checkout URL.

- [ ] **Step 1: Create the file**

```typescript
import { NextResponse } from "next/server";
import { getDodo } from "@/lib/dodo/client";
import { getCustomer, saveCustomer } from "@/lib/billing/server-store";
import type { TimeInterval } from "dodopayments/resources/subscriptions";

export const dynamic = "force-dynamic";

function toInterval(freq: string): { count: number; interval: TimeInterval } {
  switch (freq) {
    case "quarterly": return { count: 3, interval: "Month" };
    case "annual":    return { count: 1, interval: "Year" };
    default:          return { count: 1, interval: "Month" };
  }
}

// GET /api/customers/[customerId]/checkout
// Public — no auth. Returns the Dodo checkout URL for this customer.
// If the checkout session is missing, regenerates it (requires dodoProductId + dodoCustomerId).
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ customerId: string }> }
) {
  const { customerId } = await params;
  const customer = getCustomer(customerId);
  if (!customer) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Return existing checkout URL if present
  if (customer.checkoutUrl) {
    return NextResponse.json({ checkout_url: customer.checkoutUrl });
  }

  // Regenerate checkout session if product + customer IDs already exist
  if (!customer.dodoProductId || !customer.dodoCustomerId) {
    return NextResponse.json({ error: "Payment link not yet generated" }, { status: 404 });
  }

  const dodo = getDodo();
  if (!dodo) return NextResponse.json({ error: "Dodo not configured" }, { status: 503 });

  try {
    const session = await dodo.checkoutSessions.create({
      product_cart: [{ product_id: customer.dodoProductId, quantity: 1 }],
      customer: { customer_id: customer.dodoCustomerId },
      billing_address: { country: "IN" },
      return_url: "https://app.aiaccountant.com/configuration",
      cancel_url: `https://app.aiaccountant.com/sign-up?ref=${customerId}&cancelled=true`,
      metadata: { customer_account_id: customerId },
    });

    const checkoutUrl = session.checkout_url ?? "";
    saveCustomer({ ...customer, checkoutUrl });

    return NextResponse.json({ checkout_url: checkoutUrl });
  } catch (err: any) {
    console.error("GET /api/customers/[customerId]/checkout error:", err);
    return NextResponse.json({ error: err?.message ?? "Failed to regenerate checkout" }, { status: 500 });
  }
}
```

- [ ] **Step 2: Commit**

```bash
cd /root/Codespace/ember/aia/korefi-billing && git add "app/api/customers/[customerId]/checkout/route.ts" && git commit -m "feat(api): public checkout lookup endpoint for AIA app sign-up flow"
```

---

### Task 7: Trim `app/api/dodo/webhooks/route.ts`

**Files:**
- Modify: `app/api/dodo/webhooks/route.ts`

Remove `handleSubscriptionOnHold`, `handleSubscriptionFailed`, `handleSubscriptionExpired`, `handlePaymentSucceeded` (grace/freeze handlers). Replace with `payment_failed` and `inactive` status updates. Remove all `graceEndsAt`/`frozenAt` field writes.

- [ ] **Step 1: Replace the `handleEvent` switch and all handler functions** (keep `verifySignature`, `findCustomer`, `loadProcessedIds`, `markProcessed`, and the `POST` handler unchanged)

Find this block (lines 87–237) and replace it entirely:

```typescript
function handleEvent(type: string, data: any) {
  console.log(`Dodo webhook: ${type}`);
  switch (type) {
    case "subscription.active":    return handleSubscriptionActive(data);
    case "subscription.renewed":   return handleSubscriptionRenewed(data);
    case "subscription.on_hold":   return handleSubscriptionFailed(data);
    case "subscription.failed":    return handleSubscriptionFailed(data);
    case "subscription.cancelled": return handleSubscriptionCancelled(data);
    case "subscription.expired":   return handleSubscriptionCancelled(data);
    default:
      console.log(`Unhandled Dodo event: ${type}`);
  }
}

function handleSubscriptionActive(data: any) {
  const customer = findCustomer(data);
  if (!customer) return;
  customer.status = "active";
  customer.dodoSubscriptionId = data.subscription_id ?? customer.dodoSubscriptionId;
  customer.activatedAt = customer.activatedAt ?? new Date().toISOString();
  if (data.next_billing_date) {
    customer.renewalDueDate = new Date(data.next_billing_date).toISOString();
  }
  saveCustomer(customer);
  addAuditEntry({
    actor: "dodo:webhook",
    action: "subscription_activated",
    entityType: "customer",
    entityId: customer.id,
    newValue: "active",
    reason: "Subscription became active via Dodo webhook",
  });
}

function handleSubscriptionRenewed(data: any) {
  const customer = findCustomer(data);
  if (!customer) return;
  customer.status = "active";
  if (data.next_billing_date) {
    customer.renewalDueDate = new Date(data.next_billing_date).toISOString();
  }
  saveCustomer(customer);
  addAuditEntry({
    actor: "dodo:webhook",
    action: "subscription_renewed",
    entityType: "customer",
    entityId: customer.id,
    reason: "Subscription renewed via Dodo webhook",
  });
}

function handleSubscriptionFailed(data: any) {
  const customer = findCustomer(data);
  if (!customer) return;
  customer.status = "payment_failed";
  saveCustomer(customer);
  addAuditEntry({
    actor: "dodo:webhook",
    action: "subscription_payment_failed",
    entityType: "customer",
    entityId: customer.id,
    newValue: "payment_failed",
    reason: "Payment failed or subscription on hold via Dodo webhook",
  });
}

function handleSubscriptionCancelled(data: any) {
  const customer = findCustomer(data);
  if (!customer) return;
  customer.status = "inactive";
  saveCustomer(customer);
  addAuditEntry({
    actor: "dodo:webhook",
    action: "subscription_cancelled",
    entityType: "customer",
    entityId: customer.id,
    newValue: "inactive",
    reason: "Subscription cancelled or expired via Dodo webhook",
  });
}
```

- [ ] **Step 2: Compile check**

```bash
cd /root/Codespace/ember/aia/korefi-billing && npx tsc --noEmit 2>&1 | grep "webhooks" | head -20
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
cd /root/Codespace/ember/aia/korefi-billing && git add app/api/dodo/webhooks/route.ts && git commit -m "refactor(webhooks): v0 — remove grace/freeze, map to payment_failed/inactive"
```

---

### Task 8: Remove `plan-mapping` tab from `AppShell`

**Files:**
- Modify: `components/layout/AppShell.tsx`

- [ ] **Step 1: Update `AdminTab` type** — remove `"plan-mapping"`

Find:
```typescript
export type AdminTab = "overview" | "customers" | "audit" | "plan-mapping";
```
Replace with:
```typescript
export type AdminTab = "overview" | "customers" | "audit";
```

- [ ] **Step 2: Remove the "Configuration" nav group**

Find and delete this entire block:
```typescript
  {
    label: "Configuration",
    items: [
      { id: "plan-mapping", label: "Packages", icon: Folder },
    ],
  },
```

- [ ] **Step 3: Remove the `Folder` icon import**

Find:
```typescript
  LayoutDashboard,
  Users,
  ClipboardList,
  Folder,
```
Replace with:
```typescript
  LayoutDashboard,
  Users,
  ClipboardList,
```

- [ ] **Step 4: Commit**

```bash
cd /root/Codespace/ember/aia/korefi-billing && git add components/layout/AppShell.tsx && git commit -m "refactor(nav): remove plan-mapping tab from sidebar"
```

---

### Task 9: Update `AdminDashboard.tsx`

**Files:**
- Modify: `components/admin/AdminDashboard.tsx`

- [ ] **Step 1: Replace the import block at the top**

Find:
```typescript
import {
  loadCustomers, loadPlanMappings, loadLeads, loadUpgradeRequests,
  loadAuditLog, initializeDemoData,
} from "@/lib/billing";
import type { CustomerAccount, PlanMapping, AuditEntry } from "@/lib/billing";
import type { AdminTab } from "@/components/layout/AppShell";
```
Replace with:
```typescript
import {
  loadCustomers,
  loadAuditLog,
  initializeDemoData,
} from "@/lib/billing";
import type { CustomerAccount, AuditEntry } from "@/lib/billing";
import type { AdminTab } from "@/components/layout/AppShell";
```

- [ ] **Step 2: Remove `planMappings` state and its setter**

Find:
```typescript
  const [customers, setCustomers] = React.useState<CustomerAccount[]>([]);
  const [planMappings, setPlanMappings] = React.useState<PlanMapping[]>([]);
  const [auditLog, setAuditLog] = React.useState<AuditEntry[]>([]);
```
Replace with:
```typescript
  const [customers, setCustomers] = React.useState<CustomerAccount[]>([]);
  const [auditLog, setAuditLog] = React.useState<AuditEntry[]>([]);
```

- [ ] **Step 3: Simplify the sync payload in `useEffect`**

Find:
```typescript
    const snapshot = {
      customers: loadCustomers(),
      leads: loadLeads(),
      planMappings: loadPlanMappings(),
      upgradeRequests: loadUpgradeRequests(),
      auditLog: [],
    };
```
Replace with:
```typescript
    const snapshot = {
      customers: loadCustomers(),
      auditLog: [],
    };
```

- [ ] **Step 4: Simplify `refresh` callback**

Find:
```typescript
  const refresh = React.useCallback(() => {
    setCustomers(loadCustomers());
    setPlanMappings(loadPlanMappings());
    setAuditLog(loadAuditLog());
  }, []);
```
Replace with:
```typescript
  const refresh = React.useCallback(() => {
    setCustomers(loadCustomers());
    setAuditLog(loadAuditLog());
  }, []);
```

- [ ] **Step 5: Remove the `planMappings` prop from customer views and remove the `plan-mapping` tab block**

Find:
```typescript
      {tab === "customers" && showCreateCustomer && (
        <CreateCustomerLazy
          planMappings={planMappings}
          onBack={() => { setShowCreateCustomer(false); refresh(); }}
          onCreated={handleCustomerCreated}
        />
      )}

      {tab === "customers" && !showCreateCustomer && !selectedCustomerId && (
        <CustomersListLazy
          customers={customers}
          planMappings={planMappings}
          onSelectCustomer={handleSelectCustomer}
          onCreateCustomer={() => handleCreateCustomer()}
          initialStatusFilter={customerStatusFilter}
        />
      )}

      {tab === "customers" && !showCreateCustomer && selectedCustomerId && (
        <CustomerDetailLazy
          customerId={selectedCustomerId}
          planMappings={planMappings}
          onBack={() => setSelectedCustomerId(null)}
          onRefresh={refresh}
        />
      )}
```
Replace with:
```typescript
      {tab === "customers" && showCreateCustomer && (
        <CreateCustomerLazy
          onBack={() => { setShowCreateCustomer(false); refresh(); }}
          onCreated={handleCustomerCreated}
        />
      )}

      {tab === "customers" && !showCreateCustomer && !selectedCustomerId && (
        <CustomersListLazy
          customers={customers}
          onSelectCustomer={handleSelectCustomer}
          onCreateCustomer={() => handleCreateCustomer()}
          initialStatusFilter={customerStatusFilter}
        />
      )}

      {tab === "customers" && !showCreateCustomer && selectedCustomerId && (
        <CustomerDetailLazy
          customerId={selectedCustomerId}
          onBack={() => setSelectedCustomerId(null)}
          onRefresh={refresh}
        />
      )}
```

- [ ] **Step 6: Remove the `plan-mapping` tab block**

Find and delete:
```typescript
      {tab === "plan-mapping" && (
        <PlanMappingLazy
          planMappings={planMappings}
          onRefresh={refresh}
        />
      )}
```

- [ ] **Step 7: Remove PlanMappingTab import and lazy alias**

Find and delete:
```typescript
import { PlanMappingTab } from "./PlanMappingTab";
```
And delete:
```typescript
const PlanMappingLazy = PlanMappingTab;
```

- [ ] **Step 8: Compile check**

```bash
cd /root/Codespace/ember/aia/korefi-billing && npx tsc --noEmit 2>&1 | grep "AdminDashboard" | head -20
```

Expected: no errors.

- [ ] **Step 9: Commit**

```bash
cd /root/Codespace/ember/aia/korefi-billing && git add components/admin/AdminDashboard.tsx && git commit -m "refactor(dashboard): v0 — remove plan/lead/upgrade tab references"
```

---

### Task 10: Update `components/admin/OverviewTab.tsx` — stats and status references

**Files:**
- Modify: `components/admin/OverviewTab.tsx`

The OverviewTab currently references statuses `trial`, `renewal`, `grace`, `frozen`, `payment_pending`. V0 has: `draft`, `payment_pending`, `active`, `payment_failed`, `inactive`. The AttentionStrip and CustomerDistribution components also need updating.

- [ ] **Step 1: Update stats computation**

Find:
```typescript
  const stats = {
    total:   customers.length,
    active:  customers.filter((c) => c.status === "active").length,
    trial:   customers.filter((c) => c.status === "trial").length,
    renewal: customers.filter((c) => c.status === "renewal").length,
    grace:   customers.filter((c) => c.status === "grace").length,
    frozen:  customers.filter((c) => c.status === "frozen").length,
    pending: customers.filter((c) => c.status === "payment_pending").length,
  };

  const trialsEndingSoon = customers.filter((c) => {
    if (c.status !== "trial" || !c.trialEndsAt) return false;
    const daysLeft = Math.ceil((new Date(c.trialEndsAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    return daysLeft >= 0 && daysLeft <= 3;
  });
```
Replace with:
```typescript
  const stats = {
    total:         customers.length,
    active:        customers.filter((c) => c.status === "active").length,
    pending:       customers.filter((c) => c.status === "payment_pending").length,
    paymentFailed: customers.filter((c) => c.status === "payment_failed").length,
    draft:         customers.filter((c) => c.status === "draft").length,
    inactive:      customers.filter((c) => c.status === "inactive").length,
  };

  const mrr = customers
    .filter((c) => c.status === "active")
    .reduce((sum, c) => {
      if (c.billingFrequency === "quarterly") return sum + c.price / 3;
      if (c.billingFrequency === "annual") return sum + c.price / 12;
      return sum + c.price;
    }, 0);
```

- [ ] **Step 2: Replace `AttentionStrip` usage**

Find the `<AttentionStrip` block and replace with:
```tsx
      <AttentionStrip
        segments={[
          {
            key: "pending",
            visible: stats.pending > 0,
            count: stats.pending,
            label: "Payment Pending",
            tone: "attention",
            icon: Clock,
            filter: "payment_pending",
          },
          {
            key: "payment_failed",
            visible: stats.paymentFailed > 0,
            count: stats.paymentFailed,
            label: "Payment Failed",
            tone: "error",
            icon: AlertTriangle,
            filter: "payment_failed",
          },
        ]}
        onSegmentClick={(filter: string) => onGoToCustomers(filter)}
      />
```

- [ ] **Step 3: Replace `CustomerDistribution` usage**

Find the `<CustomerDistribution` block and replace with:
```tsx
      <CustomerDistribution
        total={stats.total}
        mrr={mrr}
        segments={[
          { key: "active",          label: "Active",          value: stats.active,        tone: "success",   filter: "active" },
          { key: "payment_pending", label: "Payment Pending", value: stats.pending,       tone: "attention", filter: "payment_pending" },
          { key: "payment_failed",  label: "Payment Failed",  value: stats.paymentFailed, tone: "error",     filter: "payment_failed" },
          { key: "draft",           label: "Draft",           value: stats.draft,         tone: "pending",   filter: "draft" },
          { key: "inactive",        label: "Inactive",        value: stats.inactive,      tone: "pending",   filter: "inactive" },
        ]}
        onTotalClick={() => onGoToCustomers()}
        onSegmentClick={(filter: string) => onGoToCustomers(filter)}
      />
```

- [ ] **Step 4: Update `CustomerDistribution` component to show MRR**

Find the `CustomerDistributionProps` interface and add `mrr: number`:
```typescript
interface CustomerDistributionProps {
  total: number;
  mrr: number;
  segments: DistSegment[];
  onTotalClick: () => void;
  onSegmentClick: (filter: string) => void;
}
```

Find the header section inside `CustomerDistribution` and replace the `<div>` that shows total:
```tsx
      <div className="flex items-end justify-between px-5 pt-4 pb-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-text-secondary">
            Customer Distribution
          </p>
          <button
            type="button"
            onClick={onTotalClick}
            className="mt-1 inline-flex items-baseline gap-2 text-left hover:underline focus-visible:outline-none focus-visible:underline"
          >
            <span className="text-3xl font-semibold text-text-heading tabular-nums leading-none">
              {total}
            </span>
            <span className="text-xs text-text-secondary">total customers</span>
          </button>
        </div>
        <div className="text-right">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-text-secondary">MRR</p>
          <p className="text-xl font-semibold text-text-heading tabular-nums leading-none mt-1">
            ₹{Math.round(mrr).toLocaleString("en-IN")}
          </p>
        </div>
      </div>
```

- [ ] **Step 5: Remove now-unused imports**

Find the imports at the top of OverviewTab.tsx. Remove `AlertCircle`, `Snowflake` if present. The file imports from lucide-react — keep `Plus`, `Clock`, `AlertTriangle`, `ChevronRight`.

- [ ] **Step 6: Add `"pending"` tone to `DIST_BG` map**

Find:
```typescript
const DIST_BG: Record<DistTone, string> = {
  success: "bg-status-success",
  info: "bg-status-info",
  accent: "bg-status-accent",
  attention: "bg-status-attention",
  warning: "bg-status-warning",
  error: "bg-status-error",
};
```
Replace with:
```typescript
const DIST_BG: Record<DistTone, string> = {
  success: "bg-status-success",
  info: "bg-status-info",
  accent: "bg-status-accent",
  attention: "bg-status-attention",
  warning: "bg-status-warning",
  error: "bg-status-error",
  pending: "bg-status-pending",
};
```

Also update the `DistTone` type to include `"pending"`:
```typescript
type DistTone =
  | "success"
  | "info"
  | "accent"
  | "attention"
  | "warning"
  | "error"
  | "pending";
```

- [ ] **Step 7: Compile check**

```bash
cd /root/Codespace/ember/aia/korefi-billing && npx tsc --noEmit 2>&1 | grep "OverviewTab" | head -20
```

- [ ] **Step 8: Commit**

```bash
cd /root/Codespace/ember/aia/korefi-billing && git add components/admin/OverviewTab.tsx && git commit -m "refactor(overview): v0 stats — payment_failed/draft/inactive, MRR display"
```

---

### Task 11: Rewrite `components/admin/CreateCustomerView.tsx`

**Files:**
- Modify: `components/admin/CreateCustomerView.tsx`

Simplified form: no module selection, no plan picker, no trial mode. Price + cadence entered directly.

- [ ] **Step 1: Replace the entire file**

```tsx
"use client";

import * as React from "react";
import { ArrowLeft } from "lucide-react";
import { FormField } from "@/components/mds/FormField";
import { Input } from "@/components/mds/Input";
import { Select } from "@/components/mds/Select";
import { Textarea } from "@/components/mds/Textarea";
import { Button } from "@/components/mds/Button";
import { saveCustomer, addAuditEntry } from "@/lib/billing";
import type { CustomerAccount, BillingFrequency } from "@/lib/billing";

interface CreateCustomerViewProps {
  onBack: () => void;
  onCreated: (id: string) => void;
}

export function CreateCustomerView({ onBack, onCreated }: CreateCustomerViewProps) {
  const [form, setForm] = React.useState({
    companyName: "",
    gstin: "",
    primaryName: "",
    primaryEmail: "",
    primaryPhone: "",
    billingName: "",
    billingEmail: "",
    billingPhone: "",
    price: "",
    billingFrequency: "monthly" as BillingFrequency,
    csOwner: "",
    bdOwner: "",
    notes: "",
  });
  const [billingSameAsPrimary, setBillingSameAsPrimary] = React.useState(true);
  const [errors, setErrors] = React.useState<Record<string, string>>({});

  const set = <K extends keyof typeof form>(k: K, v: typeof form[K]) =>
    setForm((p) => ({ ...p, [k]: v }));

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.companyName.trim()) e.companyName = "Required";
    if (!form.primaryName.trim()) e.primaryName = "Required";
    if (!form.primaryEmail.trim()) e.primaryEmail = "Required";
    const price = Number(form.price);
    if (!form.price || isNaN(price) || price <= 0) e.price = "Enter a valid price";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleCreate = () => {
    if (!validate()) return;
    const id = `cust_${Date.now()}`;
    const customer: CustomerAccount = {
      id,
      companyName: form.companyName.trim(),
      gstin: form.gstin.trim() || undefined,
      primaryName: form.primaryName.trim(),
      primaryEmail: form.primaryEmail.trim(),
      primaryPhone: form.primaryPhone.trim() || undefined,
      billingName: billingSameAsPrimary ? undefined : form.billingName.trim() || undefined,
      billingEmail: billingSameAsPrimary ? undefined : form.billingEmail.trim() || undefined,
      billingPhone: billingSameAsPrimary ? undefined : form.billingPhone.trim() || undefined,
      csOwner: form.csOwner || undefined,
      bdOwner: form.bdOwner || undefined,
      status: "draft",
      price: Number(form.price),
      billingFrequency: form.billingFrequency,
      notes: form.notes.trim() || undefined,
      createdAt: new Date().toISOString(),
    };
    saveCustomer(customer);
    addAuditEntry({
      actor: "CS User",
      action: "customer_created",
      entityType: "customer",
      entityId: id,
      newValue: customer.companyName,
      reason: "Customer created",
    });
    onCreated(id);
  };

  return (
    <div className="max-w-3xl">
      <div className="flex items-center gap-3 mb-7">
        <button
          onClick={onBack}
          className="flex items-center justify-center w-7 h-7 rounded-[4px] border border-border-default text-text-secondary hover:text-text-heading hover:bg-surface-hover transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
        </button>
        <div>
          <h1 className="text-lg font-semibold text-text-heading leading-tight">New Customer</h1>
          <p className="text-xs text-text-secondary mt-0.5">Create a customer profile — generate the payment link from the detail view</p>
        </div>
      </div>

      <div className="space-y-8">

        {/* Company */}
        <section>
          <p className="text-[11px] font-semibold uppercase tracking-widest text-text-secondary mb-3">Company</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField label="Company Name" required error={errors.companyName}>
              <Input value={form.companyName} onChange={(v) => set("companyName", v)} placeholder="Acme Industries Pvt Ltd" />
            </FormField>
            <FormField label="GSTIN">
              <Input value={form.gstin} onChange={(v) => set("gstin", v)} placeholder="27AABCU9603R1ZM" />
            </FormField>
          </div>
        </section>

        <hr className="border-border-divider" />

        {/* Primary contact */}
        <section>
          <p className="text-[11px] font-semibold uppercase tracking-widest text-text-secondary mb-3">Primary Contact</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <FormField label="Name" required error={errors.primaryName}>
              <Input value={form.primaryName} onChange={(v) => set("primaryName", v)} placeholder="Rajesh Sharma" />
            </FormField>
            <FormField label="Email" required error={errors.primaryEmail}>
              <Input type="email" value={form.primaryEmail} onChange={(v) => set("primaryEmail", v)} placeholder="rajesh@acme.in" />
            </FormField>
            <FormField label="Phone">
              <Input value={form.primaryPhone} onChange={(v) => set("primaryPhone", v)} placeholder="+91 98765 43210" />
            </FormField>
          </div>
        </section>

        <hr className="border-border-divider" />

        {/* Billing contact */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-text-secondary">Billing Contact</p>
            <label className="flex items-center gap-1.5 text-xs text-text-secondary cursor-pointer select-none">
              <input
                type="checkbox"
                checked={billingSameAsPrimary}
                onChange={(e) => setBillingSameAsPrimary(e.target.checked)}
                className="h-3.5 w-3.5 rounded border-border-default"
              />
              Same as primary
            </label>
          </div>
          {billingSameAsPrimary ? (
            <p className="text-sm text-text-secondary">
              Invoices sent to <span className="font-medium text-text-body">{form.primaryName || "primary contact"}</span>
              {form.primaryEmail && <span className="text-text-disabled"> · {form.primaryEmail}</span>}
            </p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <FormField label="Name"><Input value={form.billingName} onChange={(v) => set("billingName", v)} /></FormField>
              <FormField label="Email"><Input type="email" value={form.billingEmail} onChange={(v) => set("billingEmail", v)} /></FormField>
              <FormField label="Phone"><Input value={form.billingPhone} onChange={(v) => set("billingPhone", v)} /></FormField>
            </div>
          )}
        </section>

        <hr className="border-border-divider" />

        {/* Pricing */}
        <section>
          <p className="text-[11px] font-semibold uppercase tracking-widest text-text-secondary mb-3">Pricing</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField label="Price (₹)" required error={errors.price}>
              <Input
                type="number"
                value={form.price}
                onChange={(v) => set("price", v)}
                placeholder="3999"
              />
            </FormField>
            <FormField label="Billing Frequency">
              <Select
                value={form.billingFrequency}
                onChange={(v) => set("billingFrequency", v as BillingFrequency)}
                options={[
                  { value: "monthly", label: "Monthly" },
                  { value: "quarterly", label: "Quarterly" },
                  { value: "annual", label: "Annual" },
                ]}
              />
            </FormField>
          </div>
        </section>

        <hr className="border-border-divider" />

        {/* Team */}
        <section>
          <p className="text-[11px] font-semibold uppercase tracking-widest text-text-secondary mb-3">Team</p>
          <div className="grid grid-cols-2 gap-4">
            <FormField label="CS Owner">
              <Select value={form.csOwner} onChange={(v) => set("csOwner", v)} placeholder="Unassigned"
                options={["Priya Nair","Rahul Sharma","Ananya Gupta","Vikram Patel","Sneha Reddy"].map((n) => ({ value: n, label: n }))} />
            </FormField>
            <FormField label="BD Owner">
              <Select value={form.bdOwner} onChange={(v) => set("bdOwner", v)} placeholder="Unassigned"
                options={["Arjun Mehta","Kavita Singh","Rohit Verma","Deepa Iyer","Amit Joshi"].map((n) => ({ value: n, label: n }))} />
            </FormField>
          </div>
        </section>

        <hr className="border-border-divider" />

        {/* Notes */}
        <section>
          <p className="text-[11px] font-semibold uppercase tracking-widest text-text-secondary mb-3">Internal Notes</p>
          <Textarea value={form.notes} onChange={(v) => set("notes", v)} rows={3} placeholder="Anything the team should know…" />
        </section>

        <div className="flex items-center justify-end gap-2 pt-2 pb-6">
          <Button variant="secondary" size="sm" onClick={onBack}>Cancel</Button>
          <Button size="sm" onClick={handleCreate}>Create Customer</Button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Compile check**

```bash
cd /root/Codespace/ember/aia/korefi-billing && npx tsc --noEmit 2>&1 | grep "CreateCustomerView" | head -20
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
cd /root/Codespace/ember/aia/korefi-billing && git add components/admin/CreateCustomerView.tsx && git commit -m "refactor(create-customer): v0 — price+cadence form, no modules/plan/trial"
```

---

### Task 12: Rewrite `components/admin/CustomerDetailView.tsx`

**Files:**
- Modify: `components/admin/CustomerDetailView.tsx`

This is the largest change — remove planMappings prop, Plan & Modules tab, trial/freeze/grace actions, module modals. Add Generate Payment Link flow using the new `/api/dodo/checkout` endpoint.

- [ ] **Step 1: Replace the entire file**

```tsx
"use client";

import * as React from "react";
import { Link as LinkIcon, RefreshCw, Copy, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { Container } from "@/components/mds/Container";
import { Header } from "@/components/mds/Header";
import { Breadcrumbs } from "@/components/mds/Breadcrumbs";
import { StatusIndicator, STATUS_MAP, STATUS_LABELS } from "@/components/mds/StatusIndicator";
import { Button } from "@/components/mds/Button";
import { Tabs } from "@base-ui/react/tabs";
import { InfoRow, InfoGrid } from "./components/InfoRow";
import {
  getCustomer, saveCustomer, deleteCustomer, addNoteToCustomer, addAuditEntry,
} from "@/lib/billing";
import { useToast } from "@/components/ui/Toast";
import type { CustomerAccount } from "@/lib/billing";

interface CustomerDetailViewProps {
  customerId: string;
  onBack: () => void;
  onRefresh: () => void;
}

export function CustomerDetailView({ customerId, onBack, onRefresh }: CustomerDetailViewProps) {
  const [customer, setCustomer] = React.useState<CustomerAccount | undefined>(
    () => getCustomer(customerId)
  );
  const [modal, setModal] = React.useState<string | null>(null);
  const [generatingLink, setGeneratingLink] = React.useState(false);
  const [copied, setCopied] = React.useState(false);
  const { addToast } = useToast();

  const reload = () => setCustomer(getCustomer(customerId));
  React.useEffect(() => { reload(); }, [customerId]);

  const copyToClipboard = (text: string) => {
    navigator.clipboard?.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }).catch(() => {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.style.cssText = "position:fixed;opacity:0";
      document.body.appendChild(ta);
      ta.select();
      try { document.execCommand("copy"); } catch { /* unsupported */ }
      document.body.removeChild(ta);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const generatePaymentLink = async () => {
    if (!customer) return;
    // First persist current customer snapshot to billing.json so the route can read it
    await fetch("/api/sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ customers: [customer], auditLog: [] }),
    }).catch(() => {});

    setGeneratingLink(true);
    try {
      const res = await fetch("/api/dodo/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customerAccountId: customerId }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? "Failed to generate link");
      }
      const data = await res.json();
      // Update localStorage with new Dodo IDs + URLs
      const updated = getCustomer(customerId);
      if (updated) {
        saveCustomer({
          ...updated,
          dodoCustomerId: data.dodoCustomerId ?? updated.dodoCustomerId,
          dodoProductId: data.dodoProductId ?? updated.dodoProductId,
          checkoutUrl: data.checkoutUrl,
          signupUrl: data.signupUrl,
          status: "payment_pending",
        });
      }
      onRefresh();
      reload();
      copyToClipboard(data.signupUrl);
      addToast("Payment link generated and copied!", "success");
    } catch (err: any) {
      addToast(err?.message ?? "Failed to generate payment link", "error");
    } finally {
      setGeneratingLink(false);
    }
  };

  const resyncFromDodo = async () => {
    try {
      const res = await fetch(`/api/dodo/resync/${customerId}`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Resync failed");
      const updated = getCustomer(customerId);
      if (updated) saveCustomer({ ...updated, status: data.status, dodoSubscriptionId: data.subscriptionId ?? updated.dodoSubscriptionId });
      onRefresh();
      reload();
      addToast(`Resynced — status is now "${data.status}"`, "success");
    } catch (err: any) {
      addToast(err?.message ?? "Resync failed", "error");
    }
  };

  if (!customer) return <div className="p-8 text-text-disabled">Customer not found.</div>;

  const formatINR = (n: number) => `₹${n.toLocaleString("en-IN")}`;
  const freqLabel = { monthly: "month", quarterly: "quarter", annual: "year" }[customer.billingFrequency] ?? customer.billingFrequency;

  return (
    <div>
      {modal === "note" && (
        <NoteModal
          onConfirm={(note) => { addNoteToCustomer(customerId, note, "CS User"); onRefresh(); reload(); setModal(null); }}
          onClose={() => setModal(null)}
        />
      )}
      {modal === "editContact" && (
        <EditContactModal
          customer={customer}
          onConfirm={(patch) => { saveCustomer({ ...customer, ...patch }); onRefresh(); reload(); setModal(null); addToast("Contact updated", "success"); }}
          onClose={() => setModal(null)}
        />
      )}
      {modal === "delete" && (
        <DeleteConfirmModal
          companyName={customer.companyName}
          onConfirm={() => { deleteCustomer(customerId); setModal(null); onRefresh(); onBack(); }}
          onClose={() => setModal(null)}
        />
      )}

      <Breadcrumbs
        items={[
          { label: "Korefi" },
          { label: "Customers", onClick: onBack },
          { label: customer.companyName },
        ]}
      />

      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-lg font-semibold text-text-heading">{customer.companyName}</h1>
          <p className="text-sm text-text-secondary mt-0.5">
            {customer.primaryName} · {customer.primaryEmail}
          </p>
        </div>
        <StatusIndicator
          type={STATUS_MAP[customer.status] ?? "pending"}
          label={STATUS_LABELS[customer.status] ?? customer.status}
        />
      </div>

      <Tabs.Root className="mt-6" defaultValue="overview">
        <Tabs.List className="flex gap-1 border-b border-border-default">
          {(["overview", "payments", "actions"] as const).map((tab) => (
            <Tabs.Tab
              key={tab}
              value={tab}
              className="px-4 py-2.5 text-sm font-medium border-b-2 transition-colors outline-none data-[active]:border-action-primary data-[active]:text-action-primary border-transparent text-text-secondary hover:text-text-heading cursor-pointer capitalize"
            >
              {tab === "actions" ? "Admin Actions" : tab.charAt(0).toUpperCase() + tab.slice(1)}
            </Tabs.Tab>
          ))}
        </Tabs.List>

        {/* ── Overview ── */}
        <Tabs.Panel value="overview" className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <InfoGrid title="Company">
              <InfoRow label="Company Name" value={customer.companyName} />
              <InfoRow label="GSTIN" value={customer.gstin ?? "—"} />
              <InfoRow label="CS Owner" value={customer.csOwner ?? "—"} />
              <InfoRow label="BD Owner" value={customer.bdOwner ?? "—"} />
              <InfoRow label="Created" value={new Date(customer.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })} />
            </InfoGrid>

            <InfoGrid
              title="Primary Contact"
              action={<button onClick={() => setModal("editContact")} className="text-xs text-action-primary hover:underline font-medium">Edit</button>}
            >
              <InfoRow label="Name" value={customer.primaryName} />
              <InfoRow label="Phone" value={customer.primaryPhone ?? "—"} />
              <InfoRow label="Email" value={customer.primaryEmail} full />
              {(customer.billingName || customer.billingEmail) && (
                <>
                  <InfoRow label="Billing Name" value={customer.billingName ?? "—"} />
                  <InfoRow label="Billing Email" value={customer.billingEmail ?? "—"} full />
                </>
              )}
            </InfoGrid>
          </div>

          {/* Pricing */}
          <div className="mt-5">
            <Container header={<Header variant="container" title="Pricing" />}>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-semibold text-text-heading tabular-nums">
                  {formatINR(customer.price)}
                </span>
                <span className="text-sm text-text-secondary">/ {freqLabel}</span>
              </div>
              {customer.renewalDueDate && (
                <p className="text-xs text-text-secondary mt-1">
                  Next renewal: {new Date(customer.renewalDueDate).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                </p>
              )}
            </Container>
          </div>

          {/* Payment link section */}
          <div className="mt-5">
            <Container header={<Header variant="container" title="Payment Link" />}>
              <div className="space-y-3">
                <Button
                  size="sm"
                  loading={generatingLink}
                  onClick={generatePaymentLink}
                >
                  <LinkIcon className="w-3.5 h-3.5 mr-1.5" />
                  {customer.signupUrl ? "Regenerate Payment Link" : "Generate Payment Link"}
                </Button>

                {customer.signupUrl && (
                  <div className="flex items-center gap-2">
                    <code className="flex-1 text-xs bg-surface-hover px-2.5 py-1.5 rounded-[3px] truncate text-text-secondary">
                      {customer.signupUrl}
                    </code>
                    <button
                      onClick={() => copyToClipboard(customer.signupUrl!)}
                      className="flex items-center gap-1 text-xs text-action-primary hover:underline shrink-0 font-medium"
                    >
                      {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                      {copied ? "Copied!" : "Copy"}
                    </button>
                  </div>
                )}
              </div>
            </Container>
          </div>

          {/* Notes */}
          {customer.notes && (
            <div className="mt-5">
              <Container header={<Header variant="container" title="Notes" />}>
                <p className="text-sm text-text-body whitespace-pre-wrap">{customer.notes}</p>
              </Container>
            </div>
          )}
        </Tabs.Panel>

        {/* ── Payments ── */}
        <Tabs.Panel value="payments" className="pt-6">
          <Container header={<Header variant="container" title="Dodo Payments" />}>
            <dl className="space-y-3">
              <div className="flex justify-between text-sm">
                <dt className="text-text-secondary">Dodo Customer ID</dt>
                <dd className="font-mono text-xs text-text-body">{customer.dodoCustomerId ?? "—"}</dd>
              </div>
              <div className="flex justify-between text-sm">
                <dt className="text-text-secondary">Dodo Subscription ID</dt>
                <dd className="font-mono text-xs text-text-body">{customer.dodoSubscriptionId ?? "—"}</dd>
              </div>
              <div className="flex justify-between text-sm">
                <dt className="text-text-secondary">Status</dt>
                <dd className="capitalize text-text-body">{customer.status.replace(/_/g, " ")}</dd>
              </div>
              {customer.activatedAt && (
                <div className="flex justify-between text-sm">
                  <dt className="text-text-secondary">Activated</dt>
                  <dd className="text-text-body">{new Date(customer.activatedAt).toLocaleDateString("en-IN")}</dd>
                </div>
              )}
              {customer.renewalDueDate && (
                <div className="flex justify-between text-sm">
                  <dt className="text-text-secondary">Next Renewal</dt>
                  <dd className="text-text-body">{new Date(customer.renewalDueDate).toLocaleDateString("en-IN")}</dd>
                </div>
              )}
            </dl>
            <div className="mt-4 pt-4 border-t border-border-divider">
              <Button size="sm" variant="secondary" onClick={resyncFromDodo}>
                <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
                Resync from Dodo
              </Button>
            </div>
          </Container>
        </Tabs.Panel>

        {/* ── Admin Actions ── */}
        <Tabs.Panel value="actions" className="pt-6 space-y-4">
          <Container header={<Header variant="container" title="Add Note" />}>
            <Button size="sm" variant="secondary" onClick={() => setModal("note")}>
              Add Note
            </Button>
          </Container>

          <Container header={<Header variant="container" title="Edit Contact" />}>
            <Button size="sm" variant="secondary" onClick={() => setModal("editContact")}>
              Edit Contact Info
            </Button>
          </Container>

          <Container header={<Header variant="container" title="Danger Zone" />}>
            <p className="text-sm text-text-secondary mb-3">
              Permanently delete this customer and all associated data.
            </p>
            <Button size="sm" variant="secondary" onClick={() => setModal("delete")}
              className="!text-status-error !border-status-error hover:!bg-[#fff0f0]"
            >
              Delete Customer
            </Button>
          </Container>
        </Tabs.Panel>
      </Tabs.Root>
    </div>
  );
}

// ─── Modals ────────────────────────────────────────────────────────────────

function NoteModal({ onConfirm, onClose }: { onConfirm: (note: string) => void; onClose: () => void }) {
  const [note, setNote] = React.useState("");
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-surface-mask p-4">
      <div className="bg-white rounded-[6px] border border-border-default w-full max-w-md shadow-lg">
        <div className="px-5 py-4 border-b border-border-divider">
          <p className="text-sm font-semibold text-text-heading">Add Note</p>
        </div>
        <div className="p-5">
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={4}
            placeholder="Internal note…"
            className="w-full border border-border-default rounded-[4px] p-2.5 text-sm text-text-body outline-none focus:border-action-primary resize-none"
          />
        </div>
        <div className="flex justify-end gap-2 px-5 py-3 border-t border-border-divider bg-surface-bg">
          <Button size="sm" variant="secondary" onClick={onClose}>Cancel</Button>
          <Button size="sm" onClick={() => note.trim() && onConfirm(note.trim())} disabled={!note.trim()}>Save Note</Button>
        </div>
      </div>
    </div>
  );
}

function EditContactModal({ customer, onConfirm, onClose }: {
  customer: CustomerAccount;
  onConfirm: (patch: Partial<CustomerAccount>) => void;
  onClose: () => void;
}) {
  const [primaryEmail, setPrimaryEmail] = React.useState(customer.primaryEmail);
  const [primaryPhone, setPrimaryPhone] = React.useState(customer.primaryPhone ?? "");
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-surface-mask p-4">
      <div className="bg-white rounded-[6px] border border-border-default w-full max-w-md shadow-lg">
        <div className="px-5 py-4 border-b border-border-divider">
          <p className="text-sm font-semibold text-text-heading">Edit Contact</p>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <label className="block text-xs text-text-secondary mb-1.5">Email</label>
            <input value={primaryEmail} onChange={(e) => setPrimaryEmail(e.target.value)}
              className="w-full h-8 px-2.5 border border-border-default rounded-[4px] text-sm outline-none focus:border-action-primary" />
          </div>
          <div>
            <label className="block text-xs text-text-secondary mb-1.5">Phone</label>
            <input value={primaryPhone} onChange={(e) => setPrimaryPhone(e.target.value)}
              className="w-full h-8 px-2.5 border border-border-default rounded-[4px] text-sm outline-none focus:border-action-primary" />
          </div>
        </div>
        <div className="flex justify-end gap-2 px-5 py-3 border-t border-border-divider bg-surface-bg">
          <Button size="sm" variant="secondary" onClick={onClose}>Cancel</Button>
          <Button size="sm" onClick={() => onConfirm({ primaryEmail, primaryPhone: primaryPhone || undefined })}>Save</Button>
        </div>
      </div>
    </div>
  );
}

function DeleteConfirmModal({ companyName, onConfirm, onClose }: {
  companyName: string;
  onConfirm: () => void;
  onClose: () => void;
}) {
  const [input, setInput] = React.useState("");
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-surface-mask p-4">
      <div className="bg-white rounded-[6px] border border-border-default w-full max-w-md shadow-lg">
        <div className="px-5 py-4 border-b border-border-divider">
          <p className="text-sm font-semibold text-text-heading">Delete Customer</p>
        </div>
        <div className="p-5 space-y-3">
          <p className="text-sm text-text-body">
            This will permanently delete <span className="font-semibold">{companyName}</span> and all associated data. Type the company name to confirm.
          </p>
          <input value={input} onChange={(e) => setInput(e.target.value)} placeholder={companyName}
            className="w-full h-8 px-2.5 border border-border-default rounded-[4px] text-sm outline-none focus:border-action-primary" />
        </div>
        <div className="flex justify-end gap-2 px-5 py-3 border-t border-border-divider bg-surface-bg">
          <Button size="sm" variant="secondary" onClick={onClose}>Cancel</Button>
          <Button size="sm" onClick={onConfirm} disabled={input !== companyName}
            className="!bg-status-error !border-status-error hover:!bg-[#b91c1c]">
            Delete
          </Button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Compile check**

```bash
cd /root/Codespace/ember/aia/korefi-billing && npx tsc --noEmit 2>&1 | grep "CustomerDetailView" | head -20
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
cd /root/Codespace/ember/aia/korefi-billing && git add components/admin/CustomerDetailView.tsx && git commit -m "refactor(customer-detail): v0 — remove modules/trial/freeze, add generate-link"
```

---

### Task 13: Update `CustomersListView` — remove `planMappings` prop

**Files:**
- Modify: `components/admin/CustomersListView.tsx`

The `CustomersListView` receives `planMappings` from `AdminDashboard` for displaying plan names in the list. Since plans are gone, remove this prop and any references to it.

- [ ] **Step 1: Read the current prop interface**

```bash
grep -n "planMappings\|PlanMapping" /root/Codespace/ember/aia/korefi-billing/components/admin/CustomersListView.tsx | head -20
```

- [ ] **Step 2: Remove `planMappings` from the props interface**

Find the interface (likely near line 1–20):
```typescript
interface CustomersListViewProps {
  customers: CustomerAccount[];
  planMappings: PlanMapping[];
  onSelectCustomer: (id: string) => void;
  onCreateCustomer: () => void;
  initialStatusFilter?: string;
}
```
Replace with:
```typescript
interface CustomersListViewProps {
  customers: CustomerAccount[];
  onSelectCustomer: (id: string) => void;
  onCreateCustomer: () => void;
  initialStatusFilter?: string;
}
```

- [ ] **Step 3: Remove the `planMappings` parameter from the function signature**

Find: `{ customers, planMappings, onSelectCustomer, ...`  
Replace with: `{ customers, onSelectCustomer, ...`

- [ ] **Step 4: Remove any `PlanMapping` import and any code that uses `planMappings`**

```bash
grep -n "planMappings\|PlanMapping\|packageName\|packageAmount\|selectedPlanMappingId" /root/Codespace/ember/aia/korefi-billing/components/admin/CustomersListView.tsx
```

For each hit: remove the reference or replace with the equivalent from `CustomerAccount` directly (e.g., display `customer.price` instead of `plan.amount`).

- [ ] **Step 5: Update status filter options**

Find any status filter options that include `trial`, `renewal`, `grace`, `frozen` and update to: `draft`, `payment_pending`, `active`, `payment_failed`, `inactive`.

- [ ] **Step 6: Compile check**

```bash
cd /root/Codespace/ember/aia/korefi-billing && npx tsc --noEmit 2>&1 | grep "CustomersListView" | head -20
```

- [ ] **Step 7: Commit**

```bash
cd /root/Codespace/ember/aia/korefi-billing && git add components/admin/CustomersListView.tsx && git commit -m "refactor(customers-list): remove planMappings prop, update status filters"
```

---

### Task 14: Delete dead files

**Files:**
- Delete: `components/admin/PlanMappingTab.tsx`
- Delete: `components/admin/LeadsTab.tsx`
- Delete: `components/admin/UpgradeRequestsTab.tsx`
- Delete: `app/portal/` directory
- Delete: `app/get-started/` directory

- [ ] **Step 1: Delete component files**

```bash
cd /root/Codespace/ember/aia/korefi-billing && rm components/admin/PlanMappingTab.tsx components/admin/LeadsTab.tsx components/admin/UpgradeRequestsTab.tsx
```

- [ ] **Step 2: Delete app routes**

```bash
cd /root/Codespace/ember/aia/korefi-billing && rm -rf app/portal app/get-started
```

- [ ] **Step 3: Check for remaining references**

```bash
grep -rn "PlanMappingTab\|LeadsTab\|UpgradeRequestsTab\|/portal\|/get-started\|PlanMapping\|Lead\b\|UpgradeRequest\|ModuleId\|MODULES\b\|purchasedModules\|selectedPlanMappingId\|packageAmount\|trialEndsAt\|graceEndsAt\|frozenAt" \
  /root/Codespace/ember/aia/korefi-billing/components \
  /root/Codespace/ember/aia/korefi-billing/app \
  /root/Codespace/ember/aia/korefi-billing/lib \
  2>/dev/null | grep -v "node_modules\|\.next\|\.git" | head -40
```

Fix any remaining references found.

- [ ] **Step 4: Commit**

```bash
cd /root/Codespace/ember/aia/korefi-billing && git add -A && git commit -m "refactor: delete dead files — PlanMappingTab, LeadsTab, UpgradeRequestsTab, portal, get-started"
```

---

### Task 15: Full compile check + update StatusIndicator status map

**Files:**
- Possibly modify: `components/mds/StatusIndicator.tsx`

The `STATUS_MAP` and `STATUS_LABELS` in `StatusIndicator` likely reference old statuses (`trial`, `grace`, `frozen`, `renewal`). Update for V0.

- [ ] **Step 1: Read current STATUS_MAP**

```bash
grep -A 30 "STATUS_MAP" /root/Codespace/ember/aia/korefi-billing/components/mds/StatusIndicator.tsx | head -35
```

- [ ] **Step 2: Update STATUS_MAP and STATUS_LABELS**

Find the `STATUS_MAP` record and replace with:
```typescript
export const STATUS_MAP: Record<string, StatusType> = {
  draft:           "pending",
  payment_pending: "warning",
  active:          "positive",
  payment_failed:  "negative",
  inactive:        "pending",
};

export const STATUS_LABELS: Record<string, string> = {
  draft:           "Draft",
  payment_pending: "Payment Pending",
  active:          "Active",
  payment_failed:  "Payment Failed",
  inactive:        "Inactive",
};
```

- [ ] **Step 3: Full TypeScript compile**

```bash
cd /root/Codespace/ember/aia/korefi-billing && npx tsc --noEmit 2>&1 | head -50
```

Expected: zero errors. Fix any remaining type errors (likely stale field references) before continuing.

- [ ] **Step 4: Commit StatusIndicator fix**

```bash
cd /root/Codespace/ember/aia/korefi-billing && git add components/mds/StatusIndicator.tsx && git commit -m "refactor(status): update STATUS_MAP for v0 account statuses"
```

---

### Task 16: E2E smoke test

- [ ] **Step 1: Ensure dev server is running**

```bash
curl -s -o /dev/null -w "%{http_code}" http://localhost:5660
```

Expected: `307` (auth redirect — server is up). If not running: `cd /root/Codespace/ember/aia/korefi-billing && npm run dev &` then wait 5s.

- [ ] **Step 2: Run dashboard E2E tests**

```bash
cd /root/Codespace/ember/aia/korefi-billing && npx playwright test e2e/02-admin-dashboard.spec.ts --reporter=line 2>&1 | tail -15
```

Expected: all tests pass (they check for "Active\|Trial\|Grace\|Frozen" which still matches "Active" in the demo data).

- [ ] **Step 3: Final commit**

```bash
cd /root/Codespace/ember/aia/korefi-billing && git add -A && git status
```

Only untracked/modified E2E test files should remain (the plan + spec docs are already committed). If clean:

```bash
cd /root/Codespace/ember/aia/korefi-billing && git log --oneline -12
```

Expected: 12 commits visible from this branch showing all tasks completed.
