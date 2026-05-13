"use client";

import * as React from "react";
import {
  loadCustomers, loadPlanMappings,
  loadAuditLog, initializeDemoData,
} from "@/lib/billing";
import type { CustomerAccount, PlanMapping, AuditEntry } from "@/lib/billing";
import type { AdminTab } from "@/components/layout/AppShell";

interface AdminDashboardProps {
  tab: AdminTab;
  onTabChange: (tab: AdminTab) => void;
}

// ─── Main Component ────────────────────────────────────────────────────
export function AdminDashboard({ tab, onTabChange }: AdminDashboardProps) {
  const [customers, setCustomers] = React.useState<CustomerAccount[]>([]);
  const [planMappings, setPlanMappings] = React.useState<PlanMapping[]>([]);
  const [auditLog, setAuditLog] = React.useState<AuditEntry[]>([]);

  // View state
  const [selectedCustomerId, setSelectedCustomerId] = React.useState<string | null>(null);
  const [showCreateCustomer, setShowCreateCustomer] = React.useState(false);
  const [customerStatusFilter, setCustomerStatusFilter] = React.useState("all");

  const [isClient, setIsClient] = React.useState(false);

  React.useEffect(() => {
    initializeDemoData();
    setIsClient(true);
    refresh();
  }, []);

  const refresh = React.useCallback(() => {
    setCustomers(loadCustomers());
    setPlanMappings(loadPlanMappings());
    setAuditLog(loadAuditLog());
  }, []);

  const handleSelectCustomer = (id: string) => {
    setSelectedCustomerId(id);
    setShowCreateCustomer(false);
    onTabChange("customers");
  };

  const handleCreateCustomer = () => {
    setSelectedCustomerId(null);
    setShowCreateCustomer(true);
    onTabChange("customers");
  };

  const handleCustomerCreated = (id: string) => {
    refresh();
    setShowCreateCustomer(false);
    setSelectedCustomerId(id);
  };

  if (!isClient) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex items-center gap-3 rounded-full border border-border-default bg-white px-5 py-3">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-action-primary border-t-transparent" />
          <span className="text-sm font-medium text-text-secondary">Loading...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-[1400px] mx-auto">
      {/* Tab Content */}
      {tab === "overview" && (
        <OverviewLazy
          customers={customers}
          onGoToCustomers={(filter) => { setCustomerStatusFilter(filter ?? "all"); onTabChange("customers"); }}
          onCreateCustomer={handleCreateCustomer}
          onSelectCustomer={handleSelectCustomer}
        />
      )}

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

      {tab === "audit" && (
        <AuditLogLazy auditLog={auditLog} />
      )}

      {tab === "plan-mapping" && (
        <PlanMappingLazy
          planMappings={planMappings}
          onRefresh={refresh}
        />
      )}
    </div>
  );
}

// ─── Lazy Import Wrappers (for code splitting) ─────────────────────────
import { OverviewTab } from "./OverviewTab";
import { CustomersListView } from "./CustomersListView";
import { CustomerDetailView } from "./CustomerDetailView";
import { CreateCustomerView } from "./CreateCustomerView";
import { AuditLogTab } from "./AuditLogTab";
import { PlanMappingTab } from "./PlanMappingTab";

// Re-export lazy wrappers
const OverviewLazy = OverviewTab;
const CustomersListLazy = CustomersListView;
const CustomerDetailLazy = CustomerDetailView;
const CreateCustomerLazy = CreateCustomerView;
const AuditLogLazy = AuditLogTab;
const PlanMappingLazy = PlanMappingTab;
