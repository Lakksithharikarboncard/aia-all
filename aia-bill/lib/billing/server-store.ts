import "server-only";
import fs from "fs";
import path from "path";
import type {
  CustomerAccount,
  Lead,
  PlanMapping,
  UpgradeRequest,
  AuditEntry,
} from "./types";

// ─── Data File ─────────────────────────────────────────────────────────
const DATA_DIR = path.resolve(process.cwd(), ".data");
const DATA_FILE = path.join(DATA_DIR, "billing.json");

const EMPTY: BillingData = { customers: [], leads: [], planMappings: [], upgradeRequests: [], auditLog: [] };

export type BillingData = {
  customers: CustomerAccount[];
  leads: Lead[];
  planMappings: PlanMapping[];
  upgradeRequests: UpgradeRequest[];
  auditLog: AuditEntry[];
};

function readData(): BillingData {
  try {
    const raw = fs.readFileSync(DATA_FILE, "utf-8");
    return JSON.parse(raw) as BillingData;
  } catch {
    return { ...EMPTY };
  }
}

function writeData(data: BillingData): void {
  try {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), "utf-8");
  } catch {
    // Read-only filesystem (Vercel serverless) — writes are no-ops; reads still work from last state
  }
}

// ─── Snapshot ──────────────────────────────────────────────────────────
export function getSnapshot(): BillingData {
  return readData();
}

// ─── Customers ─────────────────────────────────────────────────────────
export function loadCustomers(): CustomerAccount[] {
  return readData().customers;
}

export function saveCustomer(customer: CustomerAccount): void {
  const data = readData();
  const idx = data.customers.findIndex((c) => c.id === customer.id);
  if (idx >= 0) data.customers[idx] = customer;
  else data.customers.push(customer);
  writeData(data);
}

export function getCustomer(id: string): CustomerAccount | undefined {
  return loadCustomers().find((c) => c.id === id);
}

// ─── Leads ─────────────────────────────────────────────────────────────
export function loadLeads(): Lead[] {
  return readData().leads;
}

export function saveLead(lead: Lead): void {
  const data = readData();
  const idx = data.leads.findIndex((l) => l.id === lead.id);
  if (idx >= 0) data.leads[idx] = lead;
  else data.leads.push(lead);
  writeData(data);
}

// ─── Plan Mappings ─────────────────────────────────────────────────────
export function loadPlanMappings(): PlanMapping[] {
  return readData().planMappings;
}

export function getPlanMapping(id: string): PlanMapping | undefined {
  return readData().planMappings.find((m) => m.id === id);
}

export function savePlanMapping(mapping: PlanMapping): void {
  const data = readData();
  const idx = data.planMappings.findIndex((m) => m.id === mapping.id);
  if (idx >= 0) data.planMappings[idx] = mapping;
  else data.planMappings.push(mapping);
  writeData(data);
}

// ─── Upgrade Requests ──────────────────────────────────────────────────
export function loadUpgradeRequests(): UpgradeRequest[] {
  return readData().upgradeRequests;
}

export function saveUpgradeRequest(req: UpgradeRequest): void {
  const data = readData();
  const idx = data.upgradeRequests.findIndex((r) => r.id === req.id);
  if (idx >= 0) data.upgradeRequests[idx] = req;
  else data.upgradeRequests.push(req);
  writeData(data);
}

// ─── Audit Log ─────────────────────────────────────────────────────────
export function loadAuditLog(): AuditEntry[] {
  return readData().auditLog;
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

// ─── Merge ──────────────────────────────────────────────────────────────
export function mergeFromClient(data: BillingData): void {
  writeData(data);
}
