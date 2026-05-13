"use client";

import * as React from "react";
import {
  LayoutDashboard,
  Users,
  ClipboardList,
  Folder,
  PanelLeftClose,
  PanelLeft,
} from "lucide-react";
import { cn } from "@/lib/utils";

const LOGO_URL =
  "https://cdn.prod.website-files.com/67ed19ac5d8a1253defd2450/690089a8f61795ffd3233552_67f8c9f1c2388ba1fc177bcb_LOGO%20(NO%20BG)-01%201.svg";

export type AdminTab = "overview" | "customers" | "audit" | "plan-mapping";

interface NavItem {
  id: AdminTab;
  label: string;
  icon: React.ElementType;
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

const navGroups: NavGroup[] = [
  {
    label: "Menu",
    items: [
      { id: "overview", label: "Overview", icon: LayoutDashboard },
      { id: "customers", label: "Customers", icon: Users },
      { id: "audit", label: "Audit Log", icon: ClipboardList },
    ],
  },
  {
    label: "Configuration",
    items: [
      { id: "plan-mapping", label: "Packages", icon: Folder },
    ],
  },
];

interface AppShellProps {
  activeTab: AdminTab;
  onTabChange: (tab: AdminTab) => void;
  children: React.ReactNode;
}

export function AppShell({ activeTab, onTabChange, children }: AppShellProps) {
  const [collapsed, setCollapsed] = React.useState(false);

  return (
    <div className="flex flex-col min-h-screen bg-surface-bg">
      {/* Row: Sidebar + Main Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <aside
          className={cn(
            "flex flex-col bg-surface-container border-r border-border-default shrink-0 transition-[width] duration-300 ease-in-out overflow-hidden",
            collapsed ? "w-[56px]" : "w-[240px]"
          )}
        >
          {/* Brand + Collapse */}
          <div
            className={cn(
              "flex items-center border-b border-border-default h-14 shrink-0",
              collapsed ? "justify-center px-2" : "justify-between px-4"
            )}
          >
            {!collapsed ? (
              <div className="flex items-center gap-2 min-w-0">
                <img
                  src={LOGO_URL}
                  alt="AI Accountant"
                  className="h-7 w-7 shrink-0"
                />
                <div className="min-w-0 leading-tight">
                  <p className="text-sm font-semibold text-text-heading truncate">
                    AI Accountant
                  </p>
                  <p className="text-[11px] text-text-secondary truncate">
                    Billing & Access
                  </p>
                </div>
              </div>
            ) : (
              <img
                src={LOGO_URL}
                alt="AI Accountant"
                className="h-7 w-7"
              />
            )}
            {!collapsed && (
              <button
                type="button"
                onClick={() => setCollapsed(true)}
                className="flex items-center justify-center w-7 h-7 rounded-[3px] text-text-secondary hover:text-text-heading hover:bg-surface-hover transition-colors shrink-0"
                aria-label="Collapse sidebar"
              >
                <PanelLeftClose className="w-4 h-4" />
              </button>
            )}
          </div>
          {collapsed && (
            <button
              type="button"
              onClick={() => setCollapsed(false)}
              className="flex items-center justify-center h-8 mx-2 mt-2 rounded-[3px] text-text-secondary hover:text-text-heading hover:bg-surface-hover transition-colors"
              aria-label="Expand sidebar"
            >
              <PanelLeft className="w-4 h-4" />
            </button>
          )}

          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto no-scrollbar py-3">
            {navGroups.map((group) => {
              if (group.items.length === 0) return null;
              return (
                <div key={group.label} className="mb-4">
                  {!collapsed && (
                    <div className="px-4 mb-1">
                      <span className="text-[10px] font-semibold uppercase tracking-widest text-text-disabled">
                        {group.label}
                      </span>
                    </div>
                  )}
                  <ul className="space-y-0.5 px-2">
                    {group.items.map((item) => {
                      const isActive = activeTab === item.id;
                      return (
                        <li key={item.id}>
                          <button
                            type="button"
                            onClick={() => onTabChange(item.id)}
                            className={cn(
                              "flex items-center w-full text-sm font-medium transition-all duration-150 relative",
                              collapsed ? "justify-center h-10 w-10 mx-auto" : "justify-start gap-3 h-8 px-3",
                              isActive
                                ? "text-action-primary bg-surface-selected"
                                : "text-text-secondary hover:text-text-heading hover:bg-surface-hover",
                              "rounded-[4px]"
                            )}
                          >
                            {/* Active accent stripe */}
                            {isActive && !collapsed && (
                              <span className="absolute left-0 top-0 bottom-0 w-[3px] bg-action-primary rounded-r-sm" />
                            )}
                            <item.icon
                              className={cn(
                                "w-4 h-4 shrink-0",
                                isActive ? "text-action-primary" : "text-text-secondary"
                              )}
                            />
                            <span
                              className={cn(
                                "whitespace-nowrap transition-opacity duration-200",
                                collapsed && "opacity-0 invisible w-0 overflow-hidden"
                              )}
                            >
                              {item.label}
                            </span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              );
            })}
          </nav>

          {/* Footer — user profile */}
          <div className="border-t border-border-default px-3 py-3 shrink-0">
            <button
              type="button"
              className={cn(
                "flex items-center gap-2.5 w-full rounded-[3px] transition-colors hover:bg-surface-hover focus-visible:outline-none focus-visible:bg-surface-hover",
                collapsed ? "justify-center p-1" : "p-1.5 text-left"
              )}
              aria-label="Joe Root, Growth Manager"
            >
              <span className="flex items-center justify-center w-8 h-8 rounded-full bg-action-primary text-text-inverted text-xs font-semibold shrink-0">
                JR
              </span>
              {!collapsed && (
                <div className="min-w-0 flex-1 leading-tight">
                  <p className="text-sm font-medium text-text-heading truncate">
                    Joe Root
                  </p>
                  <p className="text-[11px] text-text-secondary truncate">
                    Growth Manager
                  </p>
                </div>
              )}
            </button>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
