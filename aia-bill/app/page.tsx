"use client";

import * as React from "react";
import { AppShell } from "@/components/layout/AppShell";
import { AdminDashboard } from "@/components/admin/AdminDashboard";
import { initializeDemoData } from "@/lib/billing";
import type { AdminTab } from "@/components/layout/AppShell";

export default function App() {
  const [tab, setTab] = React.useState<AdminTab>("overview");
  const [initialized, setInitialized] = React.useState(false);

  React.useEffect(() => {
    initializeDemoData();
    setInitialized(true);
    document.title = "AI Accountant — Billing & Access Control";
  }, []);

  if (!initialized) {
    return (
      <div className="h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex items-center gap-3 rounded-full border border-slate-200/80 bg-white px-5 py-3">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
          <span className="text-sm font-medium text-slate-600">Loading...</span>
        </div>
      </div>
    );
  }

  return (
    <AppShell activeTab={tab} onTabChange={setTab}>
      <AdminDashboard tab={tab} onTabChange={setTab} />
    </AppShell>
  );
}
