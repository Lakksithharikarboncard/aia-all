"use client";

import * as React from "react";
import {
  LayoutDashboard,
  Users,
  ClipboardList,
  LayoutList,
  MoreVertical,
  PanelLeft,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";

export type AdminTab = "overview" | "customers" | "plans" | "audit";

const LOGO_URL =
  "https://cdn.prod.website-files.com/67ed19ac5d8a1253defd2450/690089a8f61795ffd3233552_67f8c9f1c2388ba1fc177bcb_LOGO%20(NO%20BG)-01%201.svg";

const NAV_ITEMS: { id: AdminTab; label: string; icon: React.ElementType }[] = [
  { id: "overview",  label: "Overview",  icon: LayoutDashboard },
  { id: "customers", label: "Customers", icon: Users },
  { id: "plans",     label: "Plans",     icon: LayoutList },
  { id: "audit",     label: "Audit Log", icon: ClipboardList },
];

interface AppShellProps {
  activeTab: AdminTab;
  onTabChange: (tab: AdminTab) => void;
  contextLabel?: string;
  onContextBack?: () => void;
  children: React.ReactNode;
}

export function AppShell({ activeTab, onTabChange, contextLabel, onContextBack, children }: AppShellProps) {
  const [collapsed, setCollapsed] = React.useState(false);

  return (
    <div className="flex h-screen overflow-hidden bg-[#e8e9eb]">
      {/* ── Sidebar ──────────────────────────────────────────────────── */}
      <aside
        className="flex flex-col shrink-0 bg-white overflow-hidden"
        style={{
          width: collapsed ? 52 : 220,
          borderRight: "1px solid #d0d1d3",
          transition: "width 200ms ease",
        }}
        aria-label="Workspace navigation"
      >
        {/* Brand header — h-14 matches topbar */}
        <div
          className="flex items-center shrink-0 px-3"
          style={{ height: 56, borderBottom: "1px solid #d0d1d3" }}
        >
          {collapsed ? (
            <button
              type="button"
              onClick={() => setCollapsed(false)}
              className="flex w-full items-center justify-center rounded-[2.5px] p-2 transition-colors duration-150 hover:bg-[#f5f5f5] outline-none"
              title="Expand sidebar"
            >
              <img src={LOGO_URL} alt="AIA" className="shrink-0" style={{ width: 20, height: 20 }} />
            </button>
          ) : (
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <img src={LOGO_URL} alt="AIA" className="shrink-0" style={{ width: 20, height: 20 }} />
              <div className="grid flex-1 min-w-0 text-left leading-tight">
                <span className="truncate text-base font-semibold text-[#0a0a0a]">
                  AI Accountant
                </span>
                <span className="truncate text-[11px] text-[#a3a3a3]">
                  Billing &amp; Access
                </span>
              </div>
              <button
                type="button"
                onClick={() => setCollapsed(true)}
                className="inline-flex shrink-0 items-center justify-center rounded-[2.5px] transition-colors duration-150 outline-none hover:bg-[#f5f5f5] text-[#c0c0c0] hover:text-[#737373] size-7"
                title="Collapse sidebar"
              >
                <PanelLeft className="w-4 h-4" strokeWidth={1.8} />
              </button>
            </div>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 min-h-0 overflow-y-auto p-2">
          <ul className="flex flex-col gap-0.5 list-none m-0 p-0">
            {NAV_ITEMS.map((item) => {
              const active = activeTab === item.id;
              return (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => onTabChange(item.id)}
                    title={collapsed ? item.label : undefined}
                    className={cn(
                      "flex w-full items-center overflow-hidden rounded-[2.5px] p-2 text-sm text-left transition-colors duration-150 outline-none",
                      collapsed ? "justify-center" : "gap-2",
                      active
                        ? "bg-[#f0f0f0] font-medium text-[#0a0a0a]"
                        : "text-[#525252] hover:bg-[#f5f5f5] hover:text-[#0a0a0a]"
                    )}
                    style={{ height: 32 }}
                  >
                    <item.icon className="w-4 h-4 shrink-0" strokeWidth={1.8} />
                    {!collapsed && <span className="truncate">{item.label}</span>}
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* User footer */}
        <UserWidget collapsed={collapsed} />
      </aside>

      {/* ── Main canvas ───────────────────────────────────────────────── */}
      <div className="flex-1 min-w-0 flex flex-col overflow-hidden bg-[#f3f4f6]">
        {/* Topbar */}
        <header
          className="flex h-14 shrink-0 items-center px-6 bg-white"
          style={{ borderBottom: "1px solid #e2e3e5" }}
        >
          <nav className="flex items-center gap-1.5 text-sm">
            <span className="text-[#a3a3a3]">AI Accountant</span>
            <ChevronRight className="w-3.5 h-3.5 shrink-0 text-[#d4d4d4]" />
            {contextLabel ? (
              <button
                type="button"
                onClick={onContextBack}
                className="font-medium text-[#0a0a0a] hover:underline cursor-pointer bg-transparent border-0 p-0"
              >
                {NAV_ITEMS.find((n) => n.id === activeTab)?.label}
              </button>
            ) : (
              <span className="font-medium text-[#0a0a0a]">
                {NAV_ITEMS.find((n) => n.id === activeTab)?.label}
              </span>
            )}
            {contextLabel && (
              <>
                <ChevronRight className="w-3.5 h-3.5 shrink-0 text-[#d4d4d4]" />
                <span className="font-medium text-[#0a0a0a]">{contextLabel}</span>
              </>
            )}
          </nav>
        </header>

        {/* Scrollable content */}
        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}



// ── User Widget (sidebar footer) ──────────────────────────────────────────
function UserWidget({ collapsed }: { collapsed: boolean }) {
  return (
    <div className="relative p-2" style={{ borderTop: "1px solid #d0d1d3" }}>
      <div
        className={cn(
          "flex w-full items-center gap-2 overflow-hidden rounded-[2.5px] p-2",
          collapsed ? "justify-center" : ""
        )}
        style={{ height: collapsed ? 36 : 48 }}
      >
        {/* Avatar */}
        <span
          className="relative inline-flex items-center justify-center shrink-0 rounded-[2.5px] font-mono font-semibold text-[10.5px] text-[#0a0a0a]"
          style={{
            width: 32,
            height: 32,
            letterSpacing: "0.04em",
            background: "rgba(0,0,0,0.04)",
            border: "1px solid rgba(0,0,0,0.12)",
          }}
        >
          CS
          <span
            className="absolute rounded-full border-2 border-white"
            style={{
              bottom: -2,
              right: -2,
              width: 8,
              height: 8,
              background: "oklch(70.5% 0.18 153)",
            }}
          />
        </span>

        {!collapsed && (
          <>
            <div className="grid flex-1 text-left leading-tight min-w-0">
              <span className="truncate text-sm font-medium text-[#0a0a0a]">
                CS Team
              </span>
              <span
                className="truncate font-mono text-[10.5px] text-[#a3a3a3]"
                style={{ letterSpacing: "0.02em" }}
              >
                cs@karboncard.com
              </span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
