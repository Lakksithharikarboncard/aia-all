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
