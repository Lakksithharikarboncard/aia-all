"use client";

import * as React from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Calculator,
  ChevronRight,
  PanelLeft,
  Package,
  HelpCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";

const LOGO_URL =
  "https://cdn.prod.website-files.com/67ed19ac5d8a1253defd2450/690089a8f61795ffd3233552_67f8c9f1c2388ba1fc177bcb_LOGO%20(NO%20BG)-01%201.svg";

const NAV_ITEMS = [
  { id: "/admin", label: "Overview", icon: LayoutDashboard },
  { id: "/admin/calculator", label: "Calculator", icon: Calculator },
] as const;

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [collapsed, setCollapsed] = React.useState(false);

  const activeItem = NAV_ITEMS.find((item) => pathname === item.id) ?? NAV_ITEMS[0];
  const contextLabel: string | null = null;

  const navigate = (href: string) => {
    router.push(href);
  };

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: "#e8e9eb" }}>
      {/* ── Sidebar ──────────────────────────────────────────────────── */}
      <aside
        className="flex flex-col shrink-0 bg-white overflow-hidden"
        style={{
          width: collapsed ? 52 : 220,
          borderRight: "1px solid #d0d1d3",
          transition: "width 200ms ease",
        }}
      >
        {/* Brand header */}
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
              <img src={LOGO_URL} alt="Korefi" className="shrink-0" style={{ width: 20, height: 20 }} />
            </button>
          ) : (
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <img src={LOGO_URL} alt="Korefi" className="shrink-0" style={{ width: 20, height: 20 }} />
              <div className="grid flex-1 min-w-0 text-left leading-tight">
                <span className="truncate text-base font-semibold" style={{ color: "#0a0a0a" }}>
                  AI Accountant
                </span>
                <span className="truncate text-[11px]" style={{ color: "#a3a3a3" }}>
                  Billing &amp; Access
                </span>
              </div>
              <button
                type="button"
                onClick={() => setCollapsed(true)}
                className="inline-flex shrink-0 items-center justify-center rounded-[2.5px] transition-colors duration-150 outline-none hover:bg-[#f5f5f5] size-7"
                style={{ color: "#c0c0c0" }}
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
              const active = pathname === item.id;
              return (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => navigate(item.id)}
                    title={collapsed ? item.label : undefined}
                    className={cn(
                      "flex w-full items-center overflow-hidden rounded-[2.5px] p-2 text-sm text-left transition-colors duration-150 outline-none",
                      collapsed ? "justify-center" : "gap-2",
                      active
                        ? "font-medium"
                        : "hover:bg-[#f5f5f5]"
                    )}
                    style={{
                      height: 32,
                      ...(active
                        ? { background: "#f0f0f0", color: "#0a0a0a" }
                        : { color: "#525252" }),
                    }}
                  >
                    <item.icon className="w-4 h-4 shrink-0" strokeWidth={1.8} />
                    {!collapsed && <span className="truncate">{item.label}</span>}
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* User widget */}
        <div className="relative p-2" style={{ borderTop: "1px solid #d0d1d3" }}>
          <div
            className={cn(
              "flex w-full items-center gap-2 overflow-hidden rounded-[2.5px] p-2",
              collapsed ? "justify-center" : ""
            )}
            style={{ height: collapsed ? 36 : 48 }}
          >
            <span
              className="relative inline-flex items-center justify-center shrink-0 rounded-[2.5px] font-mono font-semibold text-[10.5px]"
              style={{
                width: 32,
                height: 32,
                letterSpacing: "0.04em",
                color: "#0a0a0a",
                background: "rgba(0,0,0,0.04)",
                border: "1px solid rgba(0,0,0,0.12)",
              }}
            >
              BD
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
              <div className="grid flex-1 text-left leading-tight min-w-0">
                <span className="truncate text-sm font-medium" style={{ color: "#0a0a0a" }}>
                  BD Team
                </span>
                <span
                  className="truncate font-mono text-[10.5px]"
                  style={{ letterSpacing: "0.02em", color: "#a3a3a3" }}
                >
                  bd@korefi.app
                </span>
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* ── Main canvas ───────────────────────────────────────────────── */}
      <div className="flex-1 min-w-0 flex flex-col overflow-hidden" style={{ background: "#f3f4f6" }}>
        {/* Topbar */}
        <header
          className="flex h-14 shrink-0 items-center px-6 bg-white"
          style={{ borderBottom: "1px solid #e2e3e5" }}
        >
          <nav className="flex items-center gap-1.5 text-sm">
            <span style={{ color: "#a3a3a3" }}>AI Accountant</span>
            <ChevronRight className="w-3.5 h-3.5 shrink-0" style={{ color: "#d4d4d4" }} />
            {contextLabel ? (
              <button
                type="button"
                onClick={() => navigate("/admin")}
                className="font-medium hover:underline cursor-pointer bg-transparent border-0 p-0"
                style={{ color: "#0a0a0a" }}
              >
                {activeItem.label}
              </button>
            ) : (
              <span className="font-medium" style={{ color: "#0a0a0a" }}>
                {activeItem.label}
              </span>
            )}
            {contextLabel && (
              <>
                <ChevronRight className="w-3.5 h-3.5 shrink-0" style={{ color: "#d4d4d4" }} />
                <span className="font-medium" style={{ color: "#0a0a0a" }}>{contextLabel}</span>
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
