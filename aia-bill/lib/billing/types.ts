export type AccountStatus = "lead" | "draft" | "trial" | "payment_pending" | "active" | "renewal" | "grace" | "frozen" | "inactive";

// Module IDs — expand to include reporting and tally_zoho
export type ModuleId =
  | "dashboard"
  | "accounts_payable"
  | "accounts_receivable"
  | "transactions"
  | "gst_reconciliation"
  | "reporting"
  | "tally_zoho";

export type Module = {
  id: ModuleId;
  name: string;
  description: string;
};

// Lead — inbound interest from website
export type Lead = {
  id: string;
  name: string;
  company: string;
  email: string;
  phone: string;
  role: string;
  expectedBills: number;
  expectedInvoices: number;
  expectedStatements: number;
  accountingSoftware: "tally" | "zoho" | "excel" | "other";
  requestedModules: ModuleId[];
  status: "new" | "qualified" | "demo_needed" | "converted" | "rejected";
  source: "website" | "bd" | "referral";
  notes: string;
  createdAt: string;
};

// PlanMapping — links Polar plan to AIA module access
export type PlanMapping = {
  id: string;
  polarProductId: string;
  polarPriceId: string;
  name: string;
  description?: string;
  amount: number;
  currency?: string;
  billingFrequency: "monthly" | "quarterly" | "annual";
  modulesUnlocked: ModuleId[];
  trialEligible?: boolean;
  customAllowed?: boolean;
  displayOrder?: number;
  active: boolean;
};

// CustomerAccount — the core billing record
export type CustomerAccount = {
  id: string;
  companyName: string;
  gstin?: string;
  // Primary user
  primaryName: string;
  primaryEmail: string;
  primaryPhone: string;
  // Billing contact
  billingName: string;
  billingEmail: string;
  billingPhone: string;
  // Ownership
  csOwner: string;
  bdOwner: string;
  // Status & plan
  status: AccountStatus;
  selectedPlanMappingId?: string;
  purchasedModules: ModuleId[];
  packageType?: "mapped" | "custom";
  packageName?: string;
  packageAmount?: number;
  packageBillingFrequency?: "monthly" | "quarterly" | "annual";
  packageModules?: ModuleId[];
  customPackageReason?: string;
  // Polar integration
  polarCustomerId?: string;
  polarSubscriptionId?: string;
  checkoutUrl?: string;
  signupInviteUrl?: string;
  // Dates
  createdAt: string;
  activatedAt?: string;
  trialStartsAt?: string;
  trialEndsAt?: string;
  renewalDueDate?: string;
  graceEndsAt?: string;
  frozenAt?: string;
  // Volume context (for reference only, not enforced)
  expectedBills?: number;
  expectedInvoices?: number;
  expectedStatements?: number;
  startDate?: string;
  previousStatusBeforeFreeze?: AccountStatus;
  // Source
  sourceLeadId?: string;
  notes: string;
};

// UpgradeRequest — customer requests access to a locked module
export type UpgradeRequest = {
  id: string;
  customerAccountId: string;
  requestedModule: ModuleId;
  message: string;
  status: "pending" | "approved" | "rejected";
  assignedCsOwner?: string;
  reviewedBy?: string;
  reviewReason?: string;
  createdAt: string;
  reviewedAt?: string;
};

// AuditLog
export type AuditEntry = {
  id: string;
  actor: string;
  action: string;
  entityType: "customer" | "lead" | "plan_mapping" | "upgrade_request" | "system";
  entityId: string;
  oldValue?: string;
  newValue?: string;
  reason: string;
  timestamp: string;
};

// Calculator types (no credits — volume drives plan suggestion only)
export type CalculatorInput = {
  customerName: string;
  companyName: string;
  billsPerMonth: number;
  invoicesPerMonth: number;
  statementsPerMonth: number;
  accountingSoftware: "tally" | "zoho" | "excel" | "other";
  gstNeeded: boolean;
  requiredModules: ModuleId[];
  billingFrequency: "monthly" | "quarterly" | "annual";
  notes: string;
  manualOverridePrice?: number;
  manualOverrideReason?: string;
};

export type PlanTier = "starter" | "growth" | "custom";

export type CalculatorResult = {
  suggestedTier: PlanTier;
  suggestedPrice: number;
  matchedModules: ModuleId[];
  reason: string[];
};

// MODULES constant
export const MODULES: Module[] = [
  { id: "dashboard", name: "Dashboard", description: "Main dashboard view" },
  { id: "accounts_payable", name: "Accounts Payable", description: "Upload and process bills" },
  { id: "accounts_receivable", name: "Accounts Receivable", description: "Upload and process invoices" },
  { id: "transactions", name: "Bank Statements", description: "Analyze bank statements" },
  { id: "gst_reconciliation", name: "GST Reconciliation", description: "GSTR-2B reconciliation" },
  { id: "reporting", name: "Reporting", description: "Advanced reports and analytics" },
  { id: "tally_zoho", name: "Tally / Zoho Integration", description: "Sync with accounting software" },
];
