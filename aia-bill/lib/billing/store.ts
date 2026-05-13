import type {
  CustomerAccount,
  AccountStatus,
  ModuleId,
  Lead,
  PlanMapping,
  UpgradeRequest,
  AuditEntry,
  CalculatorInput,
  CalculatorResult,
  PlanTier,
} from "./types";

export * from "./types";

// ─── Storage Keys ──────────────────────────────────────────────────────
const KEYS = {
  CUSTOMERS: "aia-customers",
  LEADS: "aia-leads",
  PLAN_MAPPINGS: "aia-plan-mappings",
  UPGRADE_REQUESTS: "aia-upgrade-requests",
  AUDIT_LOG: "aia-audit-log",
} as const;

const DATA_VERSION_KEY = "aia-data-version";
const CURRENT_VERSION = 3;

// ─── Generic Storage Helpers ──────────────────────────────────────────
function getStorage<T>(key: string): T[] {
  if (typeof window === "undefined") return [];
  try {
    const data = localStorage.getItem(key);
    return data ? (JSON.parse(data) as T[]) : [];
  } catch {
    return [];
  }
}

function setStorage<T>(key: string, data: T[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(key, JSON.stringify(data));
}

// ─── CustomerAccount CRUD ────────────────────────────────────────────
export function loadCustomers(): CustomerAccount[] {
  return getStorage<CustomerAccount>(KEYS.CUSTOMERS);
}

export function saveCustomer(customer: CustomerAccount): void {
  const customers = loadCustomers();
  const index = customers.findIndex((c) => c.id === customer.id);
  if (index >= 0) {
    customers[index] = customer;
  } else {
    customers.push(customer);
  }
  setStorage(KEYS.CUSTOMERS, customers);
}

export function getCustomer(id: string): CustomerAccount | undefined {
  return loadCustomers().find((c) => c.id === id);
}

export function deleteCustomer(id: string): void {
  const customers = loadCustomers().filter((c) => c.id !== id);
  setStorage(KEYS.CUSTOMERS, customers);
}

export function updateCustomerStatus(
  id: string,
  status: AccountStatus,
  actor: string,
  reason: string
): void {
  const customer = getCustomer(id);
  if (customer) {
    const oldStatus = customer.status;
    customer.status = status;
    if (status === "frozen") {
      customer.frozenAt = new Date().toISOString();
    }
    if (status === "active" && oldStatus === "frozen") {
      customer.frozenAt = undefined;
    }
    if (status === "active" && oldStatus === "trial") {
      customer.trialStartsAt = undefined;
      customer.trialEndsAt = undefined;
    }
    saveCustomer(customer);
    addAuditEntry({
      actor,
      action: "status_changed",
      entityType: "customer",
      entityId: id,
      oldValue: oldStatus,
      newValue: status,
      reason,
    });
  }
}

export function updateCustomerModules(
  id: string,
  modules: ModuleId[],
  actor: string,
  reason: string
): void {
  const customer = getCustomer(id);
  if (customer) {
    const old = customer.purchasedModules.join(", ");
    customer.purchasedModules = modules;
    saveCustomer(customer);
    addAuditEntry({
      actor,
      action: "modules_updated",
      entityType: "customer",
      entityId: id,
      oldValue: old,
      newValue: modules.join(", "),
      reason,
    });
  }
}

export function assignPlanToCustomer(
  customerId: string,
  planMappingId: string,
  actor: string
): void {
  const customer = getCustomer(customerId);
  const mapping = getPlanMapping(planMappingId);
  if (customer && mapping) {
    const oldPlan = customer.selectedPlanMappingId ?? "none";
    customer.selectedPlanMappingId = planMappingId;
    customer.purchasedModules = mapping.modulesUnlocked;
    saveCustomer(customer);
    addAuditEntry({
      actor,
      action: "plan_assigned",
      entityType: "customer",
      entityId: customerId,
      oldValue: oldPlan,
      newValue: planMappingId,
      reason: `Assigned plan: ${mapping.name}`,
    });
  }
}

export function generateCheckoutLink(customerId: string, actor: string): string {
  const customer = getCustomer(customerId);
  if (customer) {
    const fakeUrl = `https://checkout.polar.sh/checkout/${customerId}_${Date.now()}`;
    const oldStatus = customer.status;
    customer.checkoutUrl = fakeUrl;
    customer.status = "payment_pending";
    customer.trialStartsAt = undefined;
    customer.trialEndsAt = undefined;
    saveCustomer(customer);
    addAuditEntry({
      actor,
      action: "checkout_link_generated",
      entityType: "customer",
      entityId: customerId,
      oldValue: oldStatus,
      newValue: "payment_pending",
      reason: "Generated Polar checkout link",
    });
    return fakeUrl;
  }
  return "";
}

export function generateSignupInviteLink(customerId: string, actor: string): string {
  const customer = getCustomer(customerId);
  if (customer) {
    const inviteUrl = `https://app.korefi.ai/signup?customerId=${encodeURIComponent(customerId)}&email=${encodeURIComponent(customer.primaryEmail)}`;
    customer.signupInviteUrl = inviteUrl;
    saveCustomer(customer);
    addAuditEntry({
      actor,
      action: "signup_invite_generated",
      entityType: "customer",
      entityId: customerId,
      newValue: inviteUrl,
      reason: "Generated signup invite link with prefilled email",
    });
    return inviteUrl;
  }
  return "";
}

export function addNoteToCustomer(
  customerId: string,
  note: string,
  actor: string
): void {
  const customer = getCustomer(customerId);
  if (customer) {
    const timestamp = new Date().toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
    const existing = customer.notes ? customer.notes + "\n" : "";
    customer.notes = `${existing}[${timestamp} - ${actor}] ${note}`;
    saveCustomer(customer);
    addAuditEntry({
      actor,
      action: "note_added",
      entityType: "customer",
      entityId: customerId,
      reason: "Note added",
    });
  }
}

// ─── Lead CRUD ───────────────────────────────────────────────────────
export function loadLeads(): Lead[] {
  return getStorage<Lead>(KEYS.LEADS);
}

export function saveLead(lead: Lead): void {
  const leads = loadLeads();
  const index = leads.findIndex((l) => l.id === lead.id);
  if (index >= 0) {
    leads[index] = lead;
  } else {
    leads.push(lead);
  }
  setStorage(KEYS.LEADS, leads);
}

export function getLead(id: string): Lead | undefined {
  return loadLeads().find((l) => l.id === id);
}

export function updateLeadStatus(id: string, status: Lead["status"], actor: string): void {
  const lead = getLead(id);
  if (lead) {
    const old = lead.status;
    lead.status = status;
    saveLead(lead);
    addAuditEntry({
      actor,
      action: "lead_status_changed",
      entityType: "lead",
      entityId: id,
      oldValue: old,
      newValue: status,
      reason: `Lead status updated to ${status}`,
    });
  }
}

// ─── PlanMapping CRUD ─────────────────────────────────────────────────
export function loadPlanMappings(): PlanMapping[] {
  return getStorage<PlanMapping>(KEYS.PLAN_MAPPINGS);
}

export function savePlanMapping(mapping: PlanMapping): void {
  const mappings = loadPlanMappings();
  const index = mappings.findIndex((m) => m.id === mapping.id);
  if (index >= 0) {
    mappings[index] = mapping;
  } else {
    mappings.push(mapping);
  }
  setStorage(KEYS.PLAN_MAPPINGS, mappings);
}

export function getPlanMapping(id: string): PlanMapping | undefined {
  return loadPlanMappings().find((m) => m.id === id);
}

export function deletePlanMapping(id: string): void {
  const mappings = loadPlanMappings().filter((m) => m.id !== id);
  setStorage(KEYS.PLAN_MAPPINGS, mappings);
}

// ─── UpgradeRequest CRUD ──────────────────────────────────────────────
export function loadUpgradeRequests(): UpgradeRequest[] {
  return getStorage<UpgradeRequest>(KEYS.UPGRADE_REQUESTS);
}

export function saveUpgradeRequest(request: UpgradeRequest): void {
  const requests = loadUpgradeRequests();
  const index = requests.findIndex((r) => r.id === request.id);
  if (index >= 0) {
    requests[index] = request;
  } else {
    requests.push(request);
  }
  setStorage(KEYS.UPGRADE_REQUESTS, requests);
}

export function getUpgradeRequestsForCustomer(customerId: string): UpgradeRequest[] {
  return loadUpgradeRequests().filter((r) => r.customerAccountId === customerId);
}

export function getPendingUpgradeRequests(): UpgradeRequest[] {
  return loadUpgradeRequests().filter((r) => r.status === "pending");
}

export function approveUpgradeRequest(
  requestId: string,
  reviewedBy: string,
  reason: string
): void {
  const request = loadUpgradeRequests().find((r) => r.id === requestId);
  if (request) {
    request.status = "approved";
    request.reviewedBy = reviewedBy;
    request.reviewReason = reason;
    request.reviewedAt = new Date().toISOString();
    saveUpgradeRequest(request);

    // Unlock the module for the customer
    const customer = getCustomer(request.customerAccountId);
    if (customer) {
      customer.purchasedModules = [
        ...new Set([...customer.purchasedModules, request.requestedModule]),
      ];
      saveCustomer(customer);
    }

    addAuditEntry({
      actor: reviewedBy,
      action: "upgrade_request_approved",
      entityType: "upgrade_request",
      entityId: requestId,
      newValue: request.requestedModule,
      reason,
    });
  }
}

export function rejectUpgradeRequest(
  requestId: string,
  reviewedBy: string,
  reason: string
): void {
  const request = loadUpgradeRequests().find((r) => r.id === requestId);
  if (request) {
    request.status = "rejected";
    request.reviewedBy = reviewedBy;
    request.reviewReason = reason;
    request.reviewedAt = new Date().toISOString();
    saveUpgradeRequest(request);

    addAuditEntry({
      actor: reviewedBy,
      action: "upgrade_request_rejected",
      entityType: "upgrade_request",
      entityId: requestId,
      newValue: request.requestedModule,
      reason,
    });
  }
}

// ─── Audit Log ──────────────────────────────────────────────────────
export function loadAuditLog(): AuditEntry[] {
  return getStorage<AuditEntry>(KEYS.AUDIT_LOG).sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );
}

export function addAuditEntry(
  entry: Omit<AuditEntry, "id" | "timestamp">
): AuditEntry {
  const log = getStorage<AuditEntry>(KEYS.AUDIT_LOG);
  const newEntry: AuditEntry = {
    ...entry,
    id: `audit_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    timestamp: new Date().toISOString(),
  };
  log.push(newEntry);
  setStorage(KEYS.AUDIT_LOG, log);
  return newEntry;
}

// ─── Calculator ───────────────────────────────────────────────────────
export function suggestPlan(input: CalculatorInput): CalculatorResult {
  const totalDocs =
    input.billsPerMonth +
    input.invoicesPerMonth +
    input.statementsPerMonth * 3;
  const hasComplex =
    input.gstNeeded || input.requiredModules.includes("tally_zoho");

  const reasons: string[] = [];
  let tier: PlanTier;

  const tierPrices: Record<PlanTier, Record<CalculatorInput["billingFrequency"], number>> = {
    starter: { monthly: 1499, quarterly: 4049, annual: 14399 },
    growth: { monthly: 3999, quarterly: 10799, annual: 39999 },
    custom: { monthly: 7999, quarterly: 21599, annual: 79999 },
  };

  if (
    totalDocs > 2000 ||
    hasComplex ||
    input.requiredModules.length >= 5
  ) {
    tier = "custom";
    if (totalDocs > 2000) reasons.push(`High document volume (${totalDocs} docs/month)`);
    if (input.gstNeeded) reasons.push("GST Reconciliation required");
    if (input.requiredModules.includes("tally_zoho"))
      reasons.push("Tally/Zoho integration needed");
    if (input.requiredModules.length >= 5) reasons.push("5+ modules selected");
  } else if (totalDocs > 500 || input.requiredModules.length >= 3) {
    tier = "growth";
    if (totalDocs > 500) reasons.push(`Moderate volume (${totalDocs} docs/month)`);
    if (input.requiredModules.length >= 3) reasons.push(`${input.requiredModules.length} modules selected`);
  } else {
    tier = "starter";
    reasons.push(`Low volume (${totalDocs} docs/month)`);
    reasons.push("Standard module set");
  }

  const suggestedPrice =
    input.manualOverridePrice !== undefined && input.manualOverridePrice > 0
      ? input.manualOverridePrice
      : tierPrices[tier][input.billingFrequency];

  if (input.manualOverridePrice !== undefined && input.manualOverridePrice > 0) {
    reasons.push(`Manual override applied: ₹${input.manualOverridePrice}`);
  }

  return {
    suggestedTier: tier,
    suggestedPrice,
    matchedModules: input.requiredModules,
    reason: reasons,
  };
}

// ─── Demo Data Initialization ────────────────────────────────────────
export function initializeDemoData(): void {
  if (typeof window === "undefined") return;

  // Clear stale demo data if version has changed
  const storedVersion = localStorage.getItem(DATA_VERSION_KEY);
  if (storedVersion !== String(CURRENT_VERSION)) {
    Object.values(KEYS).forEach((k) => localStorage.removeItem(k));
    localStorage.setItem(DATA_VERSION_KEY, String(CURRENT_VERSION));
  }

  if (loadPlanMappings().length === 0) {
    const demoPlanMappings: PlanMapping[] = [
      {
        id: "plan_starter_monthly",
        polarProductId: "prod_starter_001",
        polarPriceId: "price_starter_monthly_001",
        name: "Starter Monthly",
        description: "Entry-level plan for small businesses with basic bill/invoice processing",
        amount: 1499,
        billingFrequency: "monthly",
        modulesUnlocked: ["dashboard", "accounts_payable", "accounts_receivable"],
        active: true,
      },
      {
        id: "plan_growth_monthly",
        polarProductId: "prod_growth_001",
        polarPriceId: "price_growth_monthly_001",
        name: "Growth Monthly",
        description: "Mid-tier plan with transaction processing and GST reconciliation",
        amount: 3999,
        billingFrequency: "monthly",
        modulesUnlocked: [
          "dashboard",
          "accounts_payable",
          "accounts_receivable",
          "transactions",
          "gst_reconciliation",
        ],
        active: true,
      },
      {
        id: "plan_growth_quarterly",
        polarProductId: "prod_growth_001",
        polarPriceId: "price_growth_quarterly_001",
        name: "Growth Quarterly",
        description: "Growth-tier plan at quarterly billing with advanced reporting included",
        amount: 10799,
        billingFrequency: "quarterly",
        modulesUnlocked: [
          "dashboard",
          "accounts_payable",
          "accounts_receivable",
          "transactions",
          "gst_reconciliation",
          "reporting",
        ],
        active: true,
      },
    ];
    demoPlanMappings.forEach((m) => savePlanMapping(m));
  }

  if (loadCustomers().length === 0) {
    const demoCustomers: CustomerAccount[] = [
      // ── Active (6) ──────────────────────────────────────────────
      {
        id: "cust_demo_1",
        companyName: "Acme Industries Pvt Ltd",
        gstin: "27AABCU9603R1ZM",
        primaryName: "Rajesh Sharma",
        primaryEmail: "rajesh@acme.in",
        primaryPhone: "+91 98765 43210",
        billingName: "Priyanka Sharma",
        billingEmail: "billing@acme.in",
        billingPhone: "+91 98765 43211",
        csOwner: "Priya Nair",
        bdOwner: "Arjun Mehta",
        status: "active",
        selectedPlanMappingId: "plan_growth_monthly",
        purchasedModules: ["dashboard", "accounts_payable", "accounts_receivable", "transactions", "gst_reconciliation"],
        polarCustomerId: "cus_demo_acme_001",
        polarSubscriptionId: "sub_demo_acme_001",
        createdAt: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString(),
        activatedAt: new Date(Date.now() - 88 * 24 * 60 * 60 * 1000).toISOString(),
        renewalDueDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString(),
        expectedBills: 200, expectedInvoices: 150, expectedStatements: 10,
        notes: "Key account - priority support. Has been with us since beta.",
      },
      {
        id: "cust_demo_4",
        companyName: "Apex Auto Components",
        gstin: "32AAECA1234H1ZP",
        primaryName: "Kiran Joshi",
        primaryEmail: "kiran@apexauto.in",
        primaryPhone: "+91 97654 32100",
        billingName: "Kiran Joshi",
        billingEmail: "kiran@apexauto.in",
        billingPhone: "+91 97654 32100",
        csOwner: "Priya Nair",
        bdOwner: "Rohit Verma",
        status: "active",
        selectedPlanMappingId: "plan_starter_monthly",
        purchasedModules: ["dashboard"],
        polarCustomerId: "cus_demo_apex_004",
        polarSubscriptionId: "sub_demo_apex_004",
        createdAt: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000).toISOString(),
        activatedAt: new Date(Date.now() - 43 * 24 * 60 * 60 * 1000).toISOString(),
        renewalDueDate: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000).toISOString(),
        expectedBills: 60, expectedInvoices: 30, expectedStatements: 3,
        notes: "Small account, low touch. Happy customer.",
      },
      {
        id: "cust_demo_5",
        companyName: "Bharat Pharma Ltd",
        gstin: "27AABBP4568Q1ZO",
        primaryName: "Dr. Sunita Reddy",
        primaryEmail: "sunita@bharatpharma.in",
        primaryPhone: "+91 96543 21087",
        billingName: "Finance Dept",
        billingEmail: "finance@bharatpharma.in",
        billingPhone: "+91 96543 21088",
        csOwner: "Priya Nair",
        bdOwner: "Arjun Mehta",
        status: "active",
        selectedPlanMappingId: "plan_growth_quarterly",
        purchasedModules: ["dashboard", "accounts_payable", "accounts_receivable", "transactions"],
        polarCustomerId: "cus_demo_bharat_005",
        polarSubscriptionId: "sub_demo_bharat_005",
        createdAt: new Date(Date.now() - 120 * 24 * 60 * 60 * 1000).toISOString(),
        activatedAt: new Date(Date.now() - 118 * 24 * 60 * 60 * 1000).toISOString(),
        renewalDueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        expectedBills: 400, expectedInvoices: 300, expectedStatements: 15,
        notes: "Pharma compliance requirements - dedicated support contact.",
      },
      {
        id: "cust_demo_6",
        companyName: "Coastal Logistics",
        gstin: "33AACCL7890K1ZS",
        primaryName: "Vivek Patil",
        primaryEmail: "vivek@coastallogistics.in",
        primaryPhone: "+91 95432 10987",
        billingName: "Vivek Patil",
        billingEmail: "vivek@coastallogistics.in",
        billingPhone: "+91 95432 10987",
        csOwner: "Rahul Sharma",
        bdOwner: "Kavita Singh",
        status: "active",
        selectedPlanMappingId: "plan_growth_monthly",
        purchasedModules: ["dashboard", "accounts_payable", "accounts_receivable", "transactions", "gst_reconciliation"],
        polarCustomerId: "cus_demo_coastal_006",
        polarSubscriptionId: "sub_demo_coastal_006",
        createdAt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(),
        activatedAt: new Date(Date.now() - 58 * 24 * 60 * 60 * 1000).toISOString(),
        renewalDueDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
        expectedBills: 300, expectedInvoices: 250, expectedStatements: 12,
        notes: "High transaction volume. Regional logistics hub.",
      },
      {
        id: "cust_demo_12",
        companyName: "NexGen Software",
        gstin: "29AABCN1122M1ZS",
        primaryName: "Arvind Menon",
        primaryEmail: "arvind@nexgensoft.dev",
        primaryPhone: "+91 93210 98765",
        billingName: "Accounts Team",
        billingEmail: "accounts@nexgensoft.dev",
        billingPhone: "+91 93210 98766",
        csOwner: "Rahul Sharma",
        bdOwner: "Deepa Iyer",
        status: "active",
        selectedPlanMappingId: "plan_growth_monthly",
        purchasedModules: ["dashboard", "accounts_payable", "accounts_receivable", "transactions", "gst_reconciliation", "reporting"],
        polarCustomerId: "cus_demo_nexgen_012",
        polarSubscriptionId: "sub_demo_nexgen_012",
        createdAt: new Date(Date.now() - 200 * 24 * 60 * 60 * 1000).toISOString(),
        activatedAt: new Date(Date.now() - 198 * 24 * 60 * 60 * 1000).toISOString(),
        renewalDueDate: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000).toISOString(),
        expectedBills: 100, expectedInvoices: 120, expectedStatements: 8,
        notes: "Uses advanced reporting heavily. Power user.",
      },
      {
        id: "cust_demo_17",
        companyName: "Zephyr Electronics",
        gstin: "27AAAZE3456R1ZT",
        primaryName: "Neha Agarwal",
        primaryEmail: "neha@zephyrel.com",
        primaryPhone: "+91 98701 23456",
        billingName: "Neha Agarwal",
        billingEmail: "neha@zephyrel.com",
        billingPhone: "+91 98701 23456",
        csOwner: "Ananya Gupta",
        bdOwner: "Amit Joshi",
        status: "active",
        selectedPlanMappingId: "plan_starter_monthly",
        purchasedModules: ["dashboard"],
        polarCustomerId: "cus_demo_zephyr_017",
        polarSubscriptionId: "sub_demo_zephyr_017",
        createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
        activatedAt: new Date(Date.now() - 28 * 24 * 60 * 60 * 1000).toISOString(),
        renewalDueDate: new Date(Date.now() + 35 * 24 * 60 * 60 * 1000).toISOString(),
        expectedBills: 80, expectedInvoices: 50, expectedStatements: 4,
        notes: "New active customer. Migrated from competitor.",
      },

      // ── Renewal (2) ─────────────────────────────────────────────
      {
        id: "cust_demo_18",
        companyName: "Oriental Exports",
        gstin: "27AAEOE7890R1ZP",
        primaryName: "Rakesh Jain",
        primaryEmail: "rakesh@orientalexports.in",
        primaryPhone: "+91 98123 45678",
        billingName: "Rakesh Jain",
        billingEmail: "rakesh@orientalexports.in",
        billingPhone: "+91 98123 45678",
        csOwner: "Rahul Sharma",
        bdOwner: "Deepa Iyer",
        status: "renewal",
        selectedPlanMappingId: "plan_growth_monthly",
        purchasedModules: ["dashboard", "accounts_payable", "accounts_receivable", "transactions", "gst_reconciliation"],
        polarCustomerId: "cus_demo_oriental_018",
        polarSubscriptionId: "sub_demo_oriental_018",
        createdAt: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString(),
        activatedAt: new Date(Date.now() - 363 * 24 * 60 * 60 * 1000).toISOString(),
        renewalDueDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
        expectedBills: 120, expectedInvoices: 90, expectedStatements: 5,
        notes: "Annual renewal approaching. Payment link sent.",
      },
      {
        id: "cust_demo_19",
        companyName: "Pioneer Logistics Hub",
        gstin: "27AAEPL3456H1ZW",
        primaryName: "Sonia Kapoor",
        primaryEmail: "sonia@pioneerlogistics.in",
        primaryPhone: "+91 97654 32133",
        billingName: "Sonia Kapoor",
        billingEmail: "sonia@pioneerlogistics.in",
        billingPhone: "+91 97654 32133",
        csOwner: "Priya Nair",
        bdOwner: "Arjun Mehta",
        status: "renewal",
        selectedPlanMappingId: "plan_growth_quarterly",
        purchasedModules: ["dashboard", "accounts_payable", "accounts_receivable", "transactions"],
        polarCustomerId: "cus_demo_pioneer_019",
        polarSubscriptionId: "sub_demo_pioneer_019",
        createdAt: new Date(Date.now() - 270 * 24 * 60 * 60 * 1000).toISOString(),
        activatedAt: new Date(Date.now() - 268 * 24 * 60 * 60 * 1000).toISOString(),
        renewalDueDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
        expectedBills: 200, expectedInvoices: 150, expectedStatements: 8,
        notes: "Quarterly renewal overdue by 1 day. Follow up required.",
      },

      // ── Trial (3) ───────────────────────────────────────────────
      {
        id: "cust_demo_7",
        companyName: "Deccan Techworks",
        gstin: "29AACDT5678P1ZP",
        primaryName: "Praveen Kumar",
        primaryEmail: "praveen@deccantech.in",
        primaryPhone: "+91 94321 09876",
        billingName: "Praveen Kumar",
        billingEmail: "praveen@deccantech.in",
        billingPhone: "+91 94321 09876",
        csOwner: "Rahul Sharma",
        bdOwner: "Rohit Verma",
        status: "trial",
        selectedPlanMappingId: "plan_starter_monthly",
        purchasedModules: ["dashboard"],
        polarCustomerId: "cus_demo_deccan_007",
        polarSubscriptionId: "sub_demo_deccan_007",
        createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
        activatedAt: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString(),
        trialEndsAt: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000).toISOString(),
        renewalDueDate: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000).toISOString(),
        expectedBills: 30, expectedInvoices: 20, expectedStatements: 2,
        notes: "14-day trial through BD outreach. High conversion potential.",
      },
      {
        id: "cust_demo_8",
        companyName: "EcoFresh Retail",
        gstin: "27AAECR9012H1ZW",
        primaryName: "Meera Nair",
        primaryEmail: "meera@ecofresh.in",
        primaryPhone: "+91 93210 87654",
        billingName: "Meera Nair",
        billingEmail: "meera@ecofresh.in",
        billingPhone: "+91 93210 87654",
        csOwner: "Ananya Gupta",
        bdOwner: "Kavita Singh",
        status: "trial",
        selectedPlanMappingId: "plan_growth_monthly",
        purchasedModules: ["dashboard", "accounts_payable", "accounts_receivable"],
        polarCustomerId: "cus_demo_ecofresh_008",
        polarSubscriptionId: "sub_demo_ecofresh_008",
        createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
        activatedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
        trialEndsAt: new Date(Date.now() + 9 * 24 * 60 * 60 * 1000).toISOString(),
        renewalDueDate: new Date(Date.now() + 9 * 24 * 60 * 60 * 1000).toISOString(),
        expectedBills: 150, expectedInvoices: 100, expectedStatements: 6,
        notes: "Liking the product so far. CS check-in scheduled.",
      },
      {
        id: "cust_demo_14",
        companyName: "Silverline Constructions",
        gstin: "32AASLC7890K1ZN",
        primaryName: "Dinesh Rao",
        primaryEmail: "dinesh@silverline.in",
        primaryPhone: "+91 98876 54321",
        billingName: "Dinesh Rao",
        billingEmail: "dinesh@silverline.in",
        billingPhone: "+91 98876 54321",
        csOwner: "Sneha Reddy",
        bdOwner: "Amit Joshi",
        status: "trial",
        selectedPlanMappingId: "plan_starter_monthly",
        purchasedModules: ["dashboard"],
        polarCustomerId: "cus_demo_silver_014",
        polarSubscriptionId: "sub_demo_silver_014",
        createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        activatedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
        trialEndsAt: new Date(Date.now() + 12 * 24 * 60 * 60 * 1000).toISOString(),
        renewalDueDate: new Date(Date.now() + 12 * 24 * 60 * 60 * 1000).toISOString(),
        expectedBills: 120, expectedInvoices: 80, expectedStatements: 5,
        notes: "Fresh trial. Early stage - nurture.",
      },

      // ── Payment Pending (2) ─────────────────────────────────────
      {
        id: "cust_demo_2",
        companyName: "TechStart Solutions",
        gstin: "29AALCT1234P1ZN",
        primaryName: "Anita Desai",
        primaryEmail: "anita@techstart.in",
        primaryPhone: "+91 87654 32109",
        billingName: "Anita Desai",
        billingEmail: "anita@techstart.in",
        billingPhone: "+91 87654 32109",
        csOwner: "Vikram Patel",
        bdOwner: "Arjun Mehta",
        status: "payment_pending",
        selectedPlanMappingId: "plan_starter_monthly",
        purchasedModules: ["dashboard"],
        checkoutUrl: "https://checkout.polar.sh/checkout/demo_techstart_001",
        polarCustomerId: "cus_demo_techstart_002",
        createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
        expectedBills: 50, expectedInvoices: 40, expectedStatements: 5,
        notes: "Payment link sent 5 days ago. Follow up needed.",
      },
      {
        id: "cust_demo_13",
        companyName: "Prime Manufacturing",
        gstin: "27AAPRM3456H1ZW",
        primaryName: "Ravi Deshmukh",
        primaryEmail: "ravi@prime-mfg.in",
        primaryPhone: "+91 97654 32122",
        billingName: "Ravi Deshmukh",
        billingEmail: "ravi@prime-mfg.in",
        billingPhone: "+91 97654 32122",
        csOwner: "Priya Nair",
        bdOwner: "Rohit Verma",
        status: "payment_pending",
        selectedPlanMappingId: "plan_growth_monthly",
        purchasedModules: ["dashboard", "accounts_payable", "accounts_receivable", "transactions"],
        checkoutUrl: "https://checkout.polar.sh/checkout/demo_prime_013",
        polarCustomerId: "cus_demo_prime_013",
        createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        expectedBills: 250, expectedInvoices: 180, expectedStatements: 10,
        notes: "Just signed up. Checkout link shared. Awaiting payment.",
      },

      // ── Grace (2) ───────────────────────────────────────────────
      {
        id: "cust_demo_3",
        companyName: "Global Traders Co",
        gstin: "19ABCT5678Q2RS",
        primaryName: "Sanjay Gupta",
        primaryEmail: "sanjay@globaltraders.com",
        primaryPhone: "+91 76543 21098",
        billingName: "Finance Team",
        billingEmail: "finance@globaltraders.com",
        billingPhone: "+91 76543 21099",
        csOwner: "Priya Nair",
        bdOwner: "Sneha Reddy",
        status: "grace",
        selectedPlanMappingId: "plan_growth_quarterly",
        purchasedModules: ["dashboard", "accounts_payable", "accounts_receivable", "transactions"],
        polarCustomerId: "cus_demo_global_003",
        polarSubscriptionId: "sub_demo_global_003",
        createdAt: new Date(Date.now() - 180 * 24 * 60 * 60 * 1000).toISOString(),
        activatedAt: new Date(Date.now() - 178 * 24 * 60 * 60 * 1000).toISOString(),
        renewalDueDate: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
        graceEndsAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        expectedBills: 500, expectedInvoices: 400, expectedStatements: 20,
        notes: "Renewal payment failed - contacted customer. Card expired.",
      },
      {
        id: "cust_demo_15",
        companyName: "Urban Foods Pvt Ltd",
        gstin: "27AAAUF5678R1ZT",
        primaryName: "Pooja Mehta",
        primaryEmail: "pooja@urbanfoods.in",
        primaryPhone: "+91 98765 12345",
        billingName: "Pooja Mehta",
        billingEmail: "pooja@urbanfoods.in",
        billingPhone: "+91 98765 12345",
        csOwner: "Ananya Gupta",
        bdOwner: "Kavita Singh",
        status: "grace",
        selectedPlanMappingId: "plan_growth_monthly",
        purchasedModules: ["dashboard", "accounts_payable", "accounts_receivable", "transactions", "gst_reconciliation"],
        polarCustomerId: "cus_demo_urban_015",
        polarSubscriptionId: "sub_demo_urban_015",
        createdAt: new Date(Date.now() - 150 * 24 * 60 * 60 * 1000).toISOString(),
        activatedAt: new Date(Date.now() - 148 * 24 * 60 * 60 * 1000).toISOString(),
        renewalDueDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
        graceEndsAt: new Date(Date.now() + 9 * 24 * 60 * 60 * 1000).toISOString(),
        expectedBills: 180, expectedInvoices: 140, expectedStatements: 8,
        notes: "Payment overdue. CS reached out - awaiting response.",
      },

      // ── Frozen (2) ──────────────────────────────────────────────
      {
        id: "cust_demo_9",
        companyName: "Fusion Media Group",
        gstin: "07AAEFM6789L1ZR",
        primaryName: "Rohit Malhotra",
        primaryEmail: "rohit@fusionmedia.in",
        primaryPhone: "+91 92109 87654",
        billingName: "Rohit Malhotra",
        billingEmail: "rohit@fusionmedia.in",
        billingPhone: "+91 92109 87654",
        csOwner: "Rahul Sharma",
        bdOwner: "Deepa Iyer",
        status: "frozen",
        selectedPlanMappingId: "plan_growth_monthly",
        purchasedModules: ["dashboard", "accounts_payable", "accounts_receivable"],
        polarCustomerId: "cus_demo_fusion_009",
        polarSubscriptionId: "sub_demo_fusion_009",
        createdAt: new Date(Date.now() - 300 * 24 * 60 * 60 * 1000).toISOString(),
        activatedAt: new Date(Date.now() - 298 * 24 * 60 * 60 * 1000).toISOString(),
        renewalDueDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
        graceEndsAt: new Date(Date.now() - 23 * 24 * 60 * 60 * 1000).toISOString(),
        frozenAt: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString(),
        expectedBills: 100, expectedInvoices: 80, expectedStatements: 5,
        notes: "Account frozen after grace period expired. Payment still not received.",
      },
      {
        id: "cust_demo_16",
        companyName: "Vertex Security Services",
        gstin: "27AAEVS2345H1ZP",
        primaryName: "Suresh Babu",
        primaryEmail: "suresh@vertexsecurity.in",
        primaryPhone: "+91 99887 66554",
        billingName: "Suresh Babu",
        billingEmail: "suresh@vertexsecurity.in",
        billingPhone: "+91 99887 66554",
        csOwner: "Priya Nair",
        bdOwner: "Amit Joshi",
        status: "frozen",
        selectedPlanMappingId: "plan_starter_monthly",
        purchasedModules: ["dashboard"],
        polarCustomerId: "cus_demo_vertex_016",
        polarSubscriptionId: "sub_demo_vertex_016",
        createdAt: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString(),
        activatedAt: new Date(Date.now() - 88 * 24 * 60 * 60 * 1000).toISOString(),
        renewalDueDate: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
        graceEndsAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
        frozenAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
        expectedBills: 40, expectedInvoices: 25, expectedStatements: 2,
        notes: "Recently frozen. Urgent - need to reconnect with customer.",
      },

      // ── Inactive (1) ────────────────────────────────────────────
      {
        id: "cust_demo_10",
        companyName: "Helios Energy Solutions",
        gstin: "24AAEHE3456P1ZQ",
        primaryName: "Anjali Verma",
        primaryEmail: "anjali@heliosenergy.in",
        primaryPhone: "+91 91098 76543",
        billingName: "Anjali Verma",
        billingEmail: "anjali@heliosenergy.in",
        billingPhone: "+91 91098 76543",
        csOwner: "Sneha Reddy",
        bdOwner: "Rohit Verma",
        status: "inactive",
        selectedPlanMappingId: "plan_growth_monthly",
        purchasedModules: ["dashboard", "accounts_payable", "accounts_receivable"],
        polarCustomerId: "cus_demo_helios_010",
        polarSubscriptionId: "sub_demo_helios_010",
        createdAt: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString(),
        activatedAt: new Date(Date.now() - 363 * 24 * 60 * 60 * 1000).toISOString(),
        renewalDueDate: new Date(Date.now() - 180 * 24 * 60 * 60 * 1000).toISOString(),
        expectedBills: 50, expectedInvoices: 40, expectedStatements: 2,
        notes: "Churned after quarterly renewal. Reason: budget constraints.",
      },

      // ── Draft (1) ───────────────────────────────────────────────
      {
        id: "cust_demo_11",
        companyName: "Jupiter Analytics",
        gstin: "27AAEJA7890K1ZS",
        primaryName: "Karthik Iyer",
        primaryEmail: "karthik@jupiteranalytics.ai",
        primaryPhone: "+91 90087 65432",
        billingName: "Karthik Iyer",
        billingEmail: "karthik@jupiteranalytics.ai",
        billingPhone: "+91 90087 65432",
        csOwner: "",
        bdOwner: "Arjun Mehta",
        status: "draft",
        selectedPlanMappingId: "plan_starter_monthly",
        purchasedModules: ["dashboard"],
        polarCustomerId: "cus_demo_jupiter_011",
        createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
        expectedBills: 30, expectedInvoices: 20, expectedStatements: 1,
        notes: "BD created profile. Needs CS to review and activate.",
      },
    ];
    demoCustomers.forEach((c) => saveCustomer(c));
  }

  if (loadLeads().length === 0) {
    const demoLeads: Lead[] = [
      {
        id: "lead_demo_1",
        name: "Vikram Singh",
        company: "StartupX Pvt Ltd",
        email: "vikram@startupx.com",
        phone: "+91 99887 66554",
        role: "CFO",
        expectedBills: 100,
        expectedInvoices: 80,
        expectedStatements: 5,
        accountingSoftware: "tally",
        requestedModules: ["accounts_payable", "accounts_receivable", "gst_reconciliation"],
        status: "new",
        source: "website",
        notes: "Interested in GST reconciliation. Tally user.",
        createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      },
      {
        id: "lead_demo_2",
        name: "Meera Iyer",
        company: "Horizon Logistics",
        email: "meera@horizonlogistics.in",
        phone: "+91 88776 55443",
        role: "Head of Finance",
        expectedBills: 800,
        expectedInvoices: 600,
        expectedStatements: 30,
        accountingSoftware: "zoho",
        requestedModules: [
          "accounts_payable",
          "accounts_receivable",
          "transactions",
          "gst_reconciliation",
          "tally_zoho",
        ],
        status: "demo_needed",
        source: "referral",
        notes: "High volume — likely custom plan. Zoho user wanting full integration.",
        createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
      },
    ];
    demoLeads.forEach((l) => saveLead(l));
  }

  if (loadUpgradeRequests().length === 0) {
    const demoRequests: UpgradeRequest[] = [
      {
        id: "req_demo_1",
        customerAccountId: "cust_demo_1",
        requestedModule: "reporting",
        message:
          "We need access to advanced reporting for our board presentation next month. Would really help us.",
        status: "pending",
        assignedCsOwner: "Priya Nair",
        createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
      },
    ];
    demoRequests.forEach((r) => saveUpgradeRequest(r));
  }
}
