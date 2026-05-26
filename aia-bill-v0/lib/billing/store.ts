"use client";

import type { CustomerAccount, AuditEntry, PlanPreset } from "./types";
import { DEFAULT_MODULES } from "./types";

const KEYS = {
  CUSTOMERS: "aia-customers",
  AUDIT_LOG: "aia-audit-log",
  PLAN_PRESETS: "aia-plan-presets",
  DATA_VERSION: "aia-data-version",
} as const;

const CURRENT_VERSION = 8;

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

export function mergeAuditEntries(serverEntries: AuditEntry[]): void {
  const existing = loadAuditLog();
  const existingIds = new Set(existing.map((e) => e.id));
  const incoming = serverEntries.filter((e) => !existingIds.has(e.id));
  if (incoming.length === 0) return;
  const merged = [...existing, ...incoming].sort((a, b) =>
    b.timestamp.localeCompare(a.timestamp)
  );
  set(KEYS.AUDIT_LOG, merged.slice(0, 500));
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

// ── Plan Presets ───────────────────────────────────────────────────────────

export function loadPlanPresets(): PlanPreset[] {
  return get<PlanPreset>(KEYS.PLAN_PRESETS);
}

export function savePlanPreset(plan: PlanPreset): void {
  const all = loadPlanPresets();
  const idx = all.findIndex((p) => p.id === plan.id);
  if (idx >= 0) all[idx] = plan; else all.unshift(plan);
  set(KEYS.PLAN_PRESETS, all);
}

export function deletePlanPreset(id: string): void {
  set(KEYS.PLAN_PRESETS, loadPlanPresets().filter((p) => p.id !== id));
}

// ── Demo Seed ──────────────────────────────────────────────────────────────

export function initializeDemoData(): void {
  if (typeof window === "undefined") return;
  const version = parseInt(localStorage.getItem(KEYS.DATA_VERSION) ?? "0", 10);
  if (version >= CURRENT_VERSION) return;

  const now = Date.now();
  const ago = (days: number) => new Date(now - days * 86400000).toISOString();
  const from = (days: number) => new Date(now + days * 86400000).toISOString();

  const demoPlans: PlanPreset[] = [
    {
      id: "plan_demo_001",
      name: "Growth",
      price: 3999,
      billingFrequency: "monthly",
      description: "Full-featured plan for growing businesses",
      modules: DEFAULT_MODULES,
      createdAt: ago(90),
    },
    {
      id: "plan_demo_002",
      name: "Lite",
      price: 1499,
      billingFrequency: "monthly",
      description: "Essential modules for small teams",
      modules: DEFAULT_MODULES.slice(0, 4),
      createdAt: ago(85),
    },
    {
      id: "plan_demo_003",
      name: "Enterprise",
      price: 11997,
      billingFrequency: "quarterly",
      description: "Quarterly billing with all modules",
      modules: DEFAULT_MODULES,
      createdAt: ago(80),
    },
  ];

  const demo: CustomerAccount[] = [
    {
      id: "cust_demo_001",
      companyName: "Acme Industries Pvt Ltd",
      gstin: "29ABCDE1234F1Z5",
      primaryName: "Rajesh Sharma",
      primaryEmail: "rajesh@acmeindustries.in",
      primaryPhone: "+919876543210",
      bdOwner: "Arjun Mehta",
      status: "active",
      price: 3999,
      billingFrequency: "monthly",
      planId: "plan_demo_001",
      modules: DEFAULT_MODULES,
      dodoCustomerId: "cus_demo_acme",
      dodoSubscriptionId: "sub_demo_acme",
      dodoProductId: "pdt_demo_acme",
      signupUrl: "https://app.aiaccountant.com/sign-up?ref=cust_demo_001",
      createdAt: ago(30),
      activatedAt: ago(25),
      subscriptionStartDate: ago(25),
      renewalDueDate: from(5),
    },
    {
      id: "cust_demo_002",
      companyName: "TechStart Solutions",
      primaryName: "Anita Desai",
      primaryEmail: "anita@techstart.in",
      primaryPhone: "+918765432109",
      bdOwner: "Kavita Singh",
      status: "payment_pending",
      price: 1499,
      billingFrequency: "monthly",
      planId: "plan_demo_002",
      modules: DEFAULT_MODULES.slice(0, 4),
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
      billingAddressLine: "123 MG Road",
      billingCity: "Bangalore",
      billingState: "Karnataka",
      billingPincode: "560001",
      bdOwner: "Rohit Verma",
      status: "payment_failed",
      price: 11997,
      billingFrequency: "quarterly",
      planId: "plan_demo_003",
      modules: DEFAULT_MODULES,
      dodoCustomerId: "cus_demo_global",
      dodoSubscriptionId: "sub_demo_global",
      dodoProductId: "pdt_demo_global",
      signupUrl: "https://app.aiaccountant.com/sign-up?ref=cust_demo_003",
      createdAt: ago(60),
      activatedAt: ago(55),
      subscriptionStartDate: ago(55),
    },
    {
      id: "cust_demo_004",
      companyName: "Pinnacle Tech Ventures Pvt Ltd",
      primaryName: "Meera Iyer",
      primaryEmail: "meera@pinnacletech.in",
      primaryPhone: "+917654321098",
      bdOwner: "Arjun Mehta",
      status: "draft",
      price: 3999,
      billingFrequency: "monthly",
      planId: "plan_demo_001",
      modules: DEFAULT_MODULES,
      createdAt: ago(2),
    },
  ];

  set(KEYS.CUSTOMERS, demo);
  set(KEYS.PLAN_PRESETS, demoPlans);
  set(KEYS.AUDIT_LOG, []);
  localStorage.setItem(KEYS.DATA_VERSION, String(CURRENT_VERSION));
}
