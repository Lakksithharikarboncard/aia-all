"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  Calculator,
  ArrowRight,
  Users,
  DollarSign,
  TrendingUp,
  AlertTriangle,
  ChevronRight,
  Sparkles,
} from "lucide-react";

export default function AdminDashboard() {
  const router = useRouter();

  return (
    <div className="p-6 max-w-[1400px] mx-auto space-y-5">
      {/* ── Quick Actions ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-4 items-start">
        {/* Left: Main action card */}
        <div className="space-y-4 min-w-0">
          {/* Calculator launch card */}
          <div
            className="bg-white rounded-[2.5px] border border-[#e2e3e5] overflow-hidden transition-colors hover:border-[#d0d1d3] cursor-pointer"
            onClick={() => router.push("/admin/calculator")}
          >
            <div className="p-6">
              <div className="flex items-start justify-between">
                <div>
                  <div
                    className="inline-flex items-center justify-center rounded-[2.5px] mb-3"
                    style={{
                      width: 40,
                      height: 40,
                      background: "rgba(49, 70, 175, 0.08)",
                    }}
                  >
                    <Calculator className="w-5 h-5" style={{ color: "rgb(49, 70, 175)" }} strokeWidth={1.8} />
                  </div>
                  <h2 className="text-base font-semibold" style={{ color: "#0a0a0a" }}>
                    Pricing Calculator
                  </h2>
                  <p className="text-sm mt-1 max-w-lg" style={{ color: "#737373" }}>
                    Input lead requirements, calculate pricing, create a Zoho customer &amp; plan,
                    and share the checkout link via email or WhatsApp.
                  </p>
                </div>
                <div
                  className="inline-flex items-center justify-center rounded-[2.5px] shrink-0"
                  style={{
                    width: 32,
                    height: 32,
                    background: "rgba(49, 70, 175, 0.08)",
                  }}
                >
                  <ArrowRight className="w-4 h-4" style={{ color: "rgb(49, 70, 175)" }} strokeWidth={2} />
                </div>
              </div>

              {/* Features */}
              <div className="flex flex-wrap gap-4 mt-5 pt-4" style={{ borderTop: "1px solid #edeef0" }}>
                {[
                  { icon: Users, label: "Customer creation" },
                  { icon: Sparkles, label: "Custom pricing" },
                  { icon: ArrowRight, label: "Checkout link" },
                ].map((feat) => (
                  <div key={feat.label} className="flex items-center gap-1.5 text-xs" style={{ color: "#737373" }}>
                    <feat.icon className="w-3.5 h-3.5" style={{ color: "rgb(49, 70, 175)" }} strokeWidth={1.8} />
                    {feat.label}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* System status cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <StatusCard
              label="Zoho Billing"
              value="Connected"
              color="success"
              subtext="India region"
            />
            <StatusCard
              label="Resend Email"
              value={typeof process !== "undefined" && process.env.NEXT_PUBLIC_HAS_RESEND === "1" ? "Configured" : "Optional"}
              color={typeof process !== "undefined" && process.env.NEXT_PUBLIC_HAS_RESEND === "1" ? "success" : "muted"}
              subtext="Email sending"
            />
            <StatusCard
              label="WhatsApp"
              value="wa.me links"
              color="muted"
              subtext="Manual send"
            />
          </div>
        </div>

        {/* Right: Quick stats */}
        <div className="space-y-4">
          {/* Recent activity / placeholder */}
          <div className="bg-white rounded-[2.5px] border border-[#e2e3e5] overflow-hidden">
            <div className="px-5 py-4 border-b border-[#e2e3e5] flex items-center justify-between">
              <h2 className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: "#0a0a0a" }}>
                Quick Start
              </h2>
            </div>
            <div className="p-5 text-center">
              <div
                className="inline-flex items-center justify-center rounded-[2.5px] mb-3"
                style={{
                  width: 44,
                  height: 44,
                  background: "rgba(49, 70, 175, 0.08)",
                }}
              >
                <Calculator className="w-5 h-5" style={{ color: "rgb(49, 70, 175)" }} strokeWidth={1.8} />
              </div>
              <p className="text-sm font-medium" style={{ color: "#0a0a0a" }}>
                Ready to create a plan
              </p>
              <p className="text-xs mt-1" style={{ color: "#a3a3a3" }}>
                Use the calculator to generate a checkout link in seconds
              </p>
              <button
                type="button"
                onClick={() => router.push("/admin/calculator")}
                className="mt-4 inline-flex items-center gap-1.5 rounded-[2.5px] px-4 py-2 text-xs font-medium transition-colors"
                style={{
                  background: "rgb(49, 70, 175)",
                  color: "#ffffff",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "rgb(39, 56, 140)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "rgb(49, 70, 175)";
                }}
              >
                Open Calculator
                <ArrowRight className="w-3 h-3" strokeWidth={2} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Status Card ────────────────────────────────────────────────────────
function StatusCard({
  label,
  value,
  color,
  subtext,
}: {
  label: string;
  value: string;
  color: "success" | "muted";
  subtext?: string;
}) {
  const dotColor = color === "success" ? "oklch(70.5% 0.18 153)" : "#d4d4d4";
  const textColor = color === "success" ? "rgb(26, 127, 55)" : "#a3a3a3";

  return (
    <div className="bg-white rounded-[2.5px] border border-[#e2e3e5] p-4">
      <div className="flex items-center gap-2">
        <span
          className="inline-block w-2 h-2 rounded-full shrink-0"
          style={{ background: dotColor }}
        />
        <span className="text-xs font-medium" style={{ color: textColor }}>
          {value}
        </span>
      </div>
      <p className="text-[11px] mt-1.5" style={{ color: "#737373" }}>
        {label}
      </p>
      {subtext && (
        <p className="text-[10px] mt-0.5" style={{ color: "#a3a3a3" }}>
          {subtext}
        </p>
      )}
    </div>
  );
}
