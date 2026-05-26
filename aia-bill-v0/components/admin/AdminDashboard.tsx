"use client";

import * as React from "react";
import {
  loadCustomers,
  loadAuditLog,
  loadPlanPresets,
  mergeAuditEntries,
  getCustomer,
} from "@/lib/billing";
import type { CustomerAccount, AuditEntry, PlanPreset } from "@/lib/billing";
import type { AdminTab } from "@/components/layout/AppShell";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
} from "@/components/ui/drawer";

interface AdminDashboardProps {
  tab: AdminTab;
  onTabChange: (tab: AdminTab) => void;
  onContextLabelChange?: (label?: string) => void;
  navVersion?: number;
}

// ─── Main Component ────────────────────────────────────────────────────
export function AdminDashboard({ tab, onTabChange, onContextLabelChange, navVersion }: AdminDashboardProps) {
  const [customers, setCustomers] = React.useState<CustomerAccount[]>([]);
  const [auditLog, setAuditLog] = React.useState<AuditEntry[]>([]);
  const [plans, setPlans] = React.useState<PlanPreset[]>([]);

  // View state
  const [selectedCustomerId, setSelectedCustomerId] = React.useState<string | null>(null);
  const [showCreateCustomer, setShowCreateCustomer] = React.useState(false);
  const [showCreatePlan, setShowCreatePlan] = React.useState(false);
  const [editingPlan, setEditingPlan] = React.useState<PlanPreset | undefined>();
  const [viewingPlan, setViewingPlan] = React.useState<PlanPreset | undefined>();
  const [customerStatusFilter, setCustomerStatusFilter] = React.useState("all");

  // Sidebar click resets view to list (not detail / create)
  React.useEffect(() => {
    setSelectedCustomerId(null);
    setShowCreateCustomer(false);
    setShowCreatePlan(false);
    setEditingPlan(undefined);
    setViewingPlan(undefined);
  }, [navVersion]);

  React.useEffect(() => {
    refresh();
    // Push localStorage → billing.json so server-side routes (webhooks) can find customers
    const snapshot = { customers: loadCustomers(), auditLog: [] };
    fetch("/api/sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(snapshot),
    })
      .then(() => fetch("/api/sync"))
      .then((r) => r.json())
      .then((data) => {
        if (data.auditLog?.length) {
          mergeAuditEntries(data.auditLog);
          refresh();
        }
      })
      .catch(() => {/* non-critical */});
  }, []);

  const refresh = React.useCallback(() => {
    setCustomers(loadCustomers());
    setAuditLog(loadAuditLog());
    setPlans(loadPlanPresets());
  }, []);

  const handleSelectCustomer = (id: string) => {
    setSelectedCustomerId(id);
    setShowCreateCustomer(false);
    onTabChange("customers");
    const customer = getCustomer(id);
    onContextLabelChange?.(customer?.companyName);
  };

  const handleCreateCustomer = () => {
    setSelectedCustomerId(null);
    setShowCreateCustomer(true);
    onTabChange("customers");
    onContextLabelChange?.(undefined);
  };

  const handleCustomerCreated = (id: string) => {
    refresh();
    setShowCreateCustomer(false);
    setSelectedCustomerId(id);
    const customer = getCustomer(id);
    onContextLabelChange?.(customer?.companyName);
  };

  const handlePlanCreated = () => {
    refresh();
    setShowCreatePlan(false);
    setEditingPlan(undefined);
    setViewingPlan(undefined);
  };

  return (
    <>
      {/* Overview renders full-bleed inside the inset card (no extra wrapper) */}
      {tab === "overview" && (
        <OverviewLazy
          customers={customers}
          onGoToCustomers={(filter) => { setCustomerStatusFilter(filter ?? "all"); onTabChange("customers"); }}
          onGoToAudit={() => onTabChange("audit")}
          onCreateCustomer={handleCreateCustomer}
          onSelectCustomer={handleSelectCustomer}
        />
      )}

      {/* All other tabs keep the existing padded wrapper */}
      {tab !== "overview" && (
        <div className="p-6 max-w-[1400px] mx-auto">
          {tab === "customers" && !selectedCustomerId && (
            <CustomersListLazy
              customers={customers}
              onSelectCustomer={handleSelectCustomer}
              onCreateCustomer={() => handleCreateCustomer()}
              initialStatusFilter={customerStatusFilter}
            />
          )}

          {tab === "customers" && selectedCustomerId && (
            <CustomerDetailLazy
              customerId={selectedCustomerId}
              onBack={() => { setSelectedCustomerId(null); onContextLabelChange?.(undefined); }}
              onRefresh={refresh}
            />
          )}

          {tab === "plans" && (
            <PlansLazy
              plans={plans}
              onRefresh={refresh}
              onCreatePlan={() => { setEditingPlan(undefined); setViewingPlan(undefined); setShowCreatePlan(true); }}
              onViewPlan={(p) => { setEditingPlan(undefined); setViewingPlan(p); setShowCreatePlan(true); }}
              onEditPlan={(p) => { setViewingPlan(undefined); setEditingPlan(p); setShowCreatePlan(true); }}
            />
          )}

          {tab === "audit" && <AuditLogLazy auditLog={auditLog} />}
        </div>
      )}

      {/* Create Customer — right-side drawer */}
      <Drawer open={showCreateCustomer} onOpenChange={(open) => { setShowCreateCustomer(open); if (!open) refresh(); }} direction="right">
        <DrawerContent className="!w-[40vw] !max-w-[40vw] rounded-l-[2.5px]">
          <DrawerHeader className="border-b border-border-divider">
            <DrawerTitle className="text-lg font-semibold text-text-heading">New Customer</DrawerTitle>
            <DrawerDescription className="text-xs text-text-secondary">Create a customer profile — generate the onboarding link from the detail view</DrawerDescription>
          </DrawerHeader>
          <div className="flex-1 overflow-y-auto px-6 py-4">
            <CreateCustomerLazy
              onCancel={() => setShowCreateCustomer(false)}
              onCreated={handleCustomerCreated}
              onCreatePlan={() => setShowCreatePlan(true)}
            />
          </div>
        </DrawerContent>
      </Drawer>

      {/* Plan drawer — create / edit / view */}
      <Drawer open={showCreatePlan} onOpenChange={(open) => { setShowCreatePlan(open); if (!open) { refresh(); setEditingPlan(undefined); setViewingPlan(undefined); } }} direction="right">
        <DrawerContent className="!w-[40vw] !max-w-[40vw] rounded-l-[2.5px]">
          <DrawerHeader className="border-b border-border-divider">
            <DrawerTitle className="text-lg font-semibold text-text-heading">
              {viewingPlan ? "Plan Details" : editingPlan ? "Edit Plan" : "New Plan"}
            </DrawerTitle>
            <DrawerDescription className="text-xs text-text-secondary">
              {viewingPlan ? "View plan configuration" : editingPlan ? "Update plan details and modules" : "Create a reusable plan preset with modules and pricing"}
            </DrawerDescription>
          </DrawerHeader>
          <div className="flex-1 overflow-y-auto px-6 py-4">
            <CreatePlanLazy
              plan={editingPlan ?? viewingPlan}
              readOnly={!!viewingPlan}
              onCancel={() => { setShowCreatePlan(false); setEditingPlan(undefined); setViewingPlan(undefined); }}
              onCreated={handlePlanCreated}
            />
          </div>
        </DrawerContent>
      </Drawer>
    </>
  );
}

// ─── Component Imports ─────────────────────────────────────────────────
import { OverviewTab } from "./OverviewTab";
import { CustomersListView } from "./CustomersListView";
import { CustomerDetailView } from "./CustomerDetailView";
import { CreateCustomerView } from "./CreateCustomerView";
import { PlansTab } from "./PlansTab";
import { AuditLogTab } from "./AuditLogTab";
import { CreatePlanView } from "./CreatePlanView";

const OverviewLazy = OverviewTab;
const CustomersListLazy = CustomersListView;
const CustomerDetailLazy = CustomerDetailView;
const CreateCustomerLazy = CreateCustomerView;
const PlansLazy = PlansTab;
const AuditLogLazy = AuditLogTab;
const CreatePlanLazy = CreatePlanView;
