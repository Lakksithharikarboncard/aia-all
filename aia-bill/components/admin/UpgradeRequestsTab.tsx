"use client";

import * as React from "react";
import { Bell, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ReasonModal } from "./components/ReasonModal";
import { MODULES } from "@/lib/billing";
import { approveUpgradeRequest, rejectUpgradeRequest } from "@/lib/billing";
import type { UpgradeRequest, CustomerAccount } from "@/lib/billing";

interface UpgradeRequestsTabProps {
  requests: UpgradeRequest[];
  customers: CustomerAccount[];
  onRefresh: () => void;
}

export function UpgradeRequestsTab({ requests, customers, onRefresh }: UpgradeRequestsTabProps) {
  const [activeFilter, setActiveFilter] = React.useState<"pending" | "approved" | "rejected">("pending");
  const [modal, setModal] = React.useState<{ id: string; action: "approve" | "reject" } | null>(null);

  const filtered = requests.filter((r) => r.status === activeFilter);
  const counts = { pending: requests.filter((r) => r.status === "pending").length, approved: requests.filter((r) => r.status === "approved").length, rejected: requests.filter((r) => r.status === "rejected").length };
  const getCustomerName = (id: string) => customers.find((c) => c.id === id)?.companyName ?? id;

  return (
    <div className="space-y-5">
      {modal && (
        <ReasonModal
          title={modal.action === "approve" ? "Approve Request" : "Reject Request"}
          description={modal.action === "approve" ? "The module will be unlocked." : "The request will be declined."}
          confirmLabel={modal.action === "approve" ? "Approve" : "Reject"}
          confirmVariant={modal.action === "approve" ? "primary" : "danger"}
          onConfirm={(reason) => {
            if (modal.action === "approve") approveUpgradeRequest(modal.id, "CS User", reason);
            else rejectUpgradeRequest(modal.id, "CS User", reason);
            onRefresh();
            setModal(null);
          }}
          onClose={() => setModal(null)}
        />
      )}

      <div className="flex gap-2">
        {(["pending", "approved", "rejected"] as const).map((f) => (
          <button key={f} onClick={() => setActiveFilter(f)} className={cn("px-4 py-2 rounded-full text-sm font-medium flex items-center gap-1.5 transition-colors", activeFilter === f ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200")}>
            {f.charAt(0).toUpperCase() + f.slice(1)}
            <span className={cn("px-1.5 py-0.5 text-xs rounded-full", activeFilter === f ? "bg-white/20" : "bg-gray-300 text-gray-600")}>{counts[f]}</span>
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-10 text-center">
          <CheckCircle2 className="w-12 h-12 mx-auto text-green-400 mb-3" />
          <p className="text-gray-600 font-medium">All clear</p>
          <p className="text-gray-400 text-sm mt-1">No {activeFilter} requests</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((req) => (
            <div key={req.id} className="bg-white rounded-xl border border-gray-200 p-6">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-4 flex-1">
                  <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center shrink-0">
                    <Bell className="w-5 h-5 text-blue-600" />
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-gray-900">{MODULES.find((m) => m.id === req.requestedModule)?.name ?? req.requestedModule} access requested</p>
                    <p className="text-sm text-gray-500 mt-0.5">by <span className="font-medium text-gray-700">{getCustomerName(req.customerAccountId)}</span></p>
                    {req.message && <p className="text-sm text-gray-600 mt-2 bg-gray-50 p-3 rounded-lg italic">"{req.message}"</p>}
                    <p className="text-xs text-gray-400 mt-2">{new Date(req.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</p>
                    {req.reviewReason && <p className="text-xs text-gray-500 mt-1">Review: {req.reviewReason} (by {req.reviewedBy})</p>}
                  </div>
                </div>
                {req.status === "pending" && (
                  <div className="flex gap-2 shrink-0">
                    <Button size="sm" variant="outline" onClick={() => setModal({ id: req.id, action: "reject" })}>Reject</Button>
                    <Button size="sm" onClick={() => setModal({ id: req.id, action: "approve" })}><CheckCircle2 className="w-3 h-3 mr-1" /> Approve</Button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
