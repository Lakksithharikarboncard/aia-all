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
  billingAddressLine?: string;
  billingCity?: string;
  billingState?: string;
  billingPincode?: string;
  bdOwner?: string;
  status: AccountStatus;
  price: number;
  billingFrequency: BillingFrequency;
  planId?: string;
  modules?: string[];
  dodoCustomerId?: string;
  dodoSubscriptionId?: string;
  dodoProductId?: string;
  checkoutUrl?: string;
  signupUrl?: string;
  createdAt: string;
  activatedAt?: string;
  renewalDueDate?: string;
  subscriptionStartDate?: string;
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

export interface PlanPreset {
  id: string;
  name: string;
  price: number;
  billingFrequency: BillingFrequency;
  description?: string;
  modules: string[];
  dodoProductId?: string;
  createdAt: string;
}

export const DEFAULT_MODULES = [
  "Dashboard & Reports",
  "Banking",
  "Journal Voucher",
  "Accounts Payable",
  "Accounts Receivable",
  "GSTR-2B Reconciliations",
];

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
