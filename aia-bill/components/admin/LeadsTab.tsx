"use client";

import * as React from "react";
import { Search, User, Calendar, CheckCircle2, XCircle, Calculator, ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { LeadStatusBadge } from "./components/StatusBadge";
import { FieldInput } from "./components/FieldInput";
import { MODULES, saveLead, addAuditEntry, suggestPlan } from "@/lib/billing";
import type { Lead, CalculatorInput, ModuleId, PlanTier } from "@/lib/billing";

interface LeadsTabProps {
  leads: Lead[];
  onRefresh: () => void;
  onOpenCalculator: (lead: Lead) => void;
  onConvertToCustomer: (lead: Lead) => void;
}

const LEAD_STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  new:         { label: "New",          color: "bg-blue-100 text-blue-700" },
  qualified:   { label: "Qualified",    color: "bg-green-100 text-green-700" },
  demo_needed: { label: "Demo Needed",  color: "bg-yellow-100 text-yellow-700" },
  converted:   { label: "Converted",    color: "bg-purple-100 text-purple-700" },
  rejected:    { label: "Rejected",     color: "bg-red-100 text-red-700" },
};

const PACKAGE_PRICE_MATRIX: Record<PlanTier, Record<CalculatorInput["billingFrequency"], number>> = {
  starter: { monthly: 1499, quarterly: 4049, annual: 14399 },
  growth: { monthly: 3999, quarterly: 10799, annual: 39999 },
  custom: { monthly: 7999, quarterly: 21599, annual: 79999 },
};

export function LeadsTab({ leads, onRefresh, onOpenCalculator, onConvertToCustomer }: LeadsTabProps) {
  const [search, setSearch] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState("all");
  const [selectedLeadId, setSelectedLeadId] = React.useState<string | null>(null);

  const filtered = leads.filter((l) => {
    const matchSearch = l.company.toLowerCase().includes(search.toLowerCase()) || l.name.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || l.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const selected = leads.find((l) => l.id === selectedLeadId) ?? null;

  const updateStatus = (leadId: string, status: Lead["status"]) => {
    const lead = leads.find((l) => l.id === leadId);
    if (lead) {
      const oldStatus = lead.status;
      lead.status = status;
      saveLead(lead);
      addAuditEntry({ actor: "CS User", action: "lead_status_changed", entityType: "lead", entityId: leadId, oldValue: oldStatus, newValue: status, reason: `Status set to ${status}` });
      onRefresh();
    }
  };

  const calcResult = React.useMemo(() => {
    if (!selected) return null;
    const input: CalculatorInput = {
      customerName: selected.name,
      companyName: selected.company,
      billsPerMonth: selected.expectedBills,
      invoicesPerMonth: selected.expectedInvoices,
      statementsPerMonth: selected.expectedStatements,
      accountingSoftware: selected.accountingSoftware,
      gstNeeded: selected.requestedModules.includes("gst_reconciliation"),
      requiredModules: selected.requestedModules,
      billingFrequency: "monthly",
      notes: "",
    };
    return suggestPlan(input);
  }, [selected]);

  return (
    <div className="space-y-5">
      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input type="text" placeholder="Search leads..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-full h-9 pl-9 pr-3 rounded-lg border border-gray-300 text-sm outline-none focus:border-blue-500" />
        </div>
        <div className="flex gap-2">
          {["all", "new", "qualified", "demo_needed", "converted", "rejected"].map((s) => (
            <button key={s} onClick={() => setStatusFilter(s)} className={cn("px-3 py-1.5 rounded-full text-xs font-medium", statusFilter === s ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200")}>
              {s === "all" ? "All" : LEAD_STATUS_CONFIG[s]?.label ?? s}
            </button>
          ))}
        </div>
      </div>

      {/* List + Detail */}
      <div className="flex gap-6">
        {/* Lead List */}
        <div className="w-80 shrink-0 space-y-2">
          {filtered.length === 0 && <div className="text-center py-8 text-gray-400 text-sm">No leads found</div>}
          {filtered.map((lead) => (
            <button key={lead.id} onClick={() => setSelectedLeadId(lead.id)} className={cn("w-full text-left p-3 rounded-xl border transition-colors", selectedLeadId === lead.id ? "border-blue-400 bg-blue-50" : "border-gray-200 bg-white hover:border-gray-300")}>
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-gray-900 truncate">{lead.company}</p>
                  <p className="text-xs text-gray-500 truncate">{lead.name} · {lead.role || "—"}</p>
                  <p className="text-xs text-gray-400 mt-1">{lead.expectedBills}B / {lead.expectedInvoices}I / {lead.expectedStatements}S</p>
                </div>
                <span className={cn("px-1.5 py-0.5 rounded-full text-xs font-medium shrink-0", LEAD_STATUS_CONFIG[lead.status]?.color ?? "bg-gray-100")}>
                  {LEAD_STATUS_CONFIG[lead.status]?.label}
                </span>
              </div>
            </button>
          ))}
        </div>

        {/* Lead Detail */}
        <div className="flex-1">
          {!selected ? (
            <div className="flex flex-col items-center justify-center h-64 text-gray-400">
              <User className="w-12 h-12 mb-3" />
              <p className="text-sm">Select a lead to view details</p>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-6">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-xl font-bold text-gray-900">{selected.company}</h2>
                  <p className="text-sm text-gray-500 mt-0.5">{selected.name} · {selected.role || "No role"}</p>
                </div>
                <span className={cn("px-2 py-1 rounded-full text-xs font-medium", LEAD_STATUS_CONFIG[selected.status]?.color)}>{LEAD_STATUS_CONFIG[selected.status]?.label}</span>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div><span className="text-gray-500">Email:</span> <span className="font-medium ml-1">{selected.email}</span></div>
                <div><span className="text-gray-500">Phone:</span> <span className="font-medium ml-1">{selected.phone}</span></div>
                <div><span className="text-gray-500">Source:</span> <span className="font-medium ml-1 capitalize">{selected.source}</span></div>
                <div><span className="text-gray-500">Software:</span> <span className="font-medium ml-1 capitalize">{selected.accountingSoftware}</span></div>
              </div>

              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Expected Volume</p>
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div><p className="text-2xl font-bold text-gray-900">{selected.expectedBills}</p><p className="text-xs text-gray-500">Bills/mo</p></div>
                  <div><p className="text-2xl font-bold text-gray-900">{selected.expectedInvoices}</p><p className="text-xs text-gray-500">Invoices/mo</p></div>
                  <div><p className="text-2xl font-bold text-gray-900">{selected.expectedStatements}</p><p className="text-xs text-gray-500">Statements/mo</p></div>
                </div>
              </div>

              {calcResult && (
                <div className="bg-blue-50 border border-blue-100 rounded-lg p-4">
                  <p className="text-xs font-semibold text-blue-700 uppercase tracking-wide mb-2">Suggested Plan</p>
                  <div className="flex items-center gap-3">
                    <span className="inline-flex items-center px-3 py-1 rounded-full border text-sm font-semibold capitalize bg-blue-100 text-blue-700 border-blue-200">{calcResult.suggestedTier}</span>
                    <span className="text-xl font-bold text-gray-900">₹{calcResult.suggestedPrice.toLocaleString("en-IN")}<span className="text-sm font-normal text-gray-500">/mo</span></span>
                  </div>
                </div>
              )}

              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Requested Modules</p>
                <div className="flex flex-wrap gap-2">
                  {selected.requestedModules.length === 0 && <span className="text-sm text-gray-400">None specified</span>}
                  {selected.requestedModules.map((mid) => (
                    <span key={mid} className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs font-medium">{MODULES.find((m) => m.id === mid)?.name ?? mid}</span>
                  ))}
                </div>
              </div>

              {selected.notes && <div><p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Notes</p><p className="text-sm text-gray-700 bg-gray-50 rounded-lg p-3">{selected.notes}</p></div>}

              <div className="flex flex-wrap gap-2 pt-2 border-t">
                {selected.status !== "qualified" && <Button size="sm" variant="outline" onClick={() => updateStatus(selected.id, "qualified")}><CheckCircle2 className="w-3 h-3 mr-1" /> Qualify</Button>}
                {selected.status !== "demo_needed" && <Button size="sm" variant="outline" onClick={() => updateStatus(selected.id, "demo_needed")}><Calendar className="w-3 h-3 mr-1" /> Demo Needed</Button>}
                {selected.status !== "rejected" && <Button size="sm" variant="outline" onClick={() => updateStatus(selected.id, "rejected")}><XCircle className="w-3 h-3 mr-1" /> Reject</Button>}
                <Button size="sm" variant="outline" onClick={() => onOpenCalculator(selected)}><Calculator className="w-3 h-3 mr-1" /> Calculator</Button>
                {selected.status !== "converted" && <Button size="sm" onClick={() => onConvertToCustomer(selected)}><ArrowLeft className="w-3 h-3 mr-1 rotate-180" /> Convert</Button>}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
