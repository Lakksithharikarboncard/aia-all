export type AccountStatus = "lead" | "draft" | "trial" | "payment_pending" | "active" | "renewal" | "grace" | "frozen" | "inactive";

export type ModuleId =
  | "dashboard"
  | "accounts_payable"
  | "accounts_receivable"
  | "transactions"
  | "gst_reconciliation"
  | "reporting"
  | "journal_voucher"
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

// PlanMapping — links Dodo Payments product to AIA module access
export type PlanMapping = {
  id: string;
  dodoProductId?: string;
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
  secondaryEmail?: string;
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
  // Dodo Payments integration
  dodoCustomerId?: string;
  dodoSubscriptionId?: string;
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
  // Volume & needs context (reference only)
  expectedBills?: number;
  expectedInvoices?: number;
  expectedStatements?: number;
  accountingSoftware?: Array<"tally" | "zoho" | "excel" | "other">;
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
  accountingSoftware: Array<"tally" | "zoho" | "excel" | "other">;
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

export const MODULES: Module[] = [
  { id: "transactions", name: "Banking", description: "Bank statement processing and reconciliation" },
  { id: "accounts_receivable", name: "Accounts Receivable", description: "Upload and process invoices" },
  { id: "accounts_payable", name: "Accounts Payable", description: "Upload and process bills" },
  { id: "journal_voucher", name: "Journal Voucher", description: "Journal entry management" },
  { id: "dashboard", name: "Dashboard & Reports", description: "Main dashboard and advanced analytics" },
  { id: "reporting", name: "Reporting", description: "Advanced reports and analytics" },
  { id: "gst_reconciliation", name: "GSTR-2B Recon", description: "GSTR-2B reconciliation" },
  { id: "tally_zoho", name: "Tally / Zoho Integration", description: "Sync with accounting software" },
];

// Modules shown as checkboxes in customer needs (tally_zoho is always included)
export const SELECTABLE_MODULES: ModuleId[] = [
  "transactions",
  "accounts_receivable",
  "accounts_payable",
  "journal_voucher",
  "dashboard",
  "gst_reconciliation",
];
