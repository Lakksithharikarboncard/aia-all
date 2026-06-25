"use client";

import * as React from "react";
import {
  Calculator, Users, Mail, Copy, CheckCircle2,
  ExternalLink, AlertTriangle, Loader2, MessageSquare,
  Sparkles, Plus,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { apiUrl } from "@/lib/api-base";
import {
  PRICING, calculatePrice, type Plan, type Cycle,
} from "@/lib/pricing";

// ─── Cost table for reference ────────────────────────────────────────────────

const COST_TABLE: { label: string; baseQ: number; premQ: number; baseA: number; premA: number }[] = [
  { label: "Infra (per month)", baseQ: 133.33, premQ: 133.33, baseA: 106.67, premA: 106.67 },
  { label: "Per bill", baseQ: 7.33, premQ: 8.27, baseA: 5.87, premA: 6.61 },
  { label: "Per bank statement (per mo.)", baseQ: 46.67, premQ: 146.67, baseA: 37.33, premA: 117.33 },
];

export default function CalculatorPage() {
  const [plan, setPlan] = React.useState<Plan>("base");
  const [cycle, setCycle] = React.useState<Cycle>("quarterly");
  const [billsPerMonth, setBillsPerMonth] = React.useState(50);
  const [banks, setBanks] = React.useState(2);
  const [leadName, setLeadName] = React.useState("");
  const [leadEmail, setLeadEmail] = React.useState("");
  const [leadPhone, setLeadPhone] = React.useState("");
  const [orgName, setOrgName] = React.useState("");

  const [freeTrialEnabled, setFreeTrialEnabled] = React.useState(false);
  const [trialDays, setTrialDays] = React.useState(14);

  const [loading, setLoading] = React.useState(false);
  const [result, setResult] = React.useState<{
    checkoutUrl: string;
    signupUrl?: string;
    hostedPageId: string;
    expiresAt: string;
    customerId: string;
    subscriptionId?: string;
    invoiceId?: string;
    price: number;
    planLabel: string;
    emailSent: boolean;
    emailError: string | null;
    waLink: string | null;
    mailtoUrl: string;
    trialDays: number;
    mode?: string;
    breakdown: {
      infraTotal: number;
      billsTotal: number;
      banksTotal: number;
      subtotal: number;
      finalPrice: number;
      months: number;
    };
  } | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [copied, setCopied] = React.useState(false);
  const [showCosts, setShowCosts] = React.useState(false);

  const cfg = PRICING[plan][cycle];
  const breakdown = calculatePrice(plan, cycle, billsPerMonth, banks);

  const handleProvision = async () => {
    if (!leadName.trim() || !leadEmail.trim()) {
      setError("Lead name and email are required");
      return;
    }
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 20000);
      const res = await fetch(apiUrl("/api/admin/calculator/provision"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          plan,
          cycle,
          billsPerMonth,
          banks,
          leadName: leadName.trim(),
          leadEmail: leadEmail.trim(),
          leadPhone: leadPhone.trim() || undefined,
          orgName: orgName.trim() || undefined,
          freeTrialEnabled,
          trialDays: freeTrialEnabled ? trialDays : 0,
        }),
      });
      clearTimeout(timeoutId);

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Provisioning failed");
        return;
      }
      setResult(data);
    } catch (e: any) {
      setError(`Network error: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  const copyLink = () => {
    if (!result) return;
    const url = result.signupUrl || result.checkoutUrl;
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const openWhatsApp = () => {
    if (!result?.waLink) return;
    window.open(result.waLink, "_blank");
  };

  const openMailto = () => {
    if (!result?.mailtoUrl) return;
    window.location.href = result.mailtoUrl;
  };

  const expiryTime = result
    ? new Date(result.expiresAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })
    : null;

  // ── Shared palette ──────────────────────────────────────────────────
  const PRIMARY = "rgb(49, 70, 175)";
  const SUCCESS = "rgb(26, 127, 37)";
  const DANGER = "rgb(207, 34, 46)";

  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto">
      {result?.mode === "mock" && (
        <div
          className="mb-4 inline-flex items-center gap-1.5 rounded-[2.5px] px-3 py-1.5 text-[11px] font-medium"
          style={{
            background: "#fffbeb",
            color: "#9a6700",
            border: "1px solid #f0d58c",
          }}
        >
          ⚡ Mock Mode — no Zoho calls made
        </div>
      )}
      {result?.mode === "live" && (
        <div
          className="mb-4 inline-flex items-center gap-1.5 rounded-[2.5px] px-3 py-1.5 text-[11px] font-medium"
          style={{
            background: "rgba(26, 127, 37, 0.06)",
            color: SUCCESS,
            border: "1px solid rgba(26, 127, 37, 0.2)",
          }}
        >
          ● Live — Zoho connected
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
        {/* ── LEFT: Inputs ──────────────────────────────────────────────── */}
        <div className="lg:col-span-3 flex flex-col gap-4">

          {/* Plan & Cycle */}
          <div className="bg-white rounded-[2.5px] border border-[#e2e3e5] p-5">
            <h2 className="text-[11px] font-semibold uppercase tracking-wider mb-4" style={{ color: "#0a0a0a" }}>
              Plan &amp; Billing
            </h2>

            <div className="flex gap-2 mb-3">
              {(["base", "premium"] as Plan[]).map((p) => (
                <button
                  key={p}
                  onClick={() => setPlan(p)}
                  className={cn(
                    "flex-1 rounded-[2.5px] px-4 py-2.5 text-sm font-medium transition-all border",
                    plan === p
                      ? "text-white"
                      : "hover:bg-[#f5f5f5]"
                  )}
                  style={plan === p
                    ? { background: PRIMARY, borderColor: PRIMARY, color: "#fff" }
                    : { borderColor: "#d0d1d3", color: "#525252" }
                  }
                >
                  {p === "base" ? "Base" : "Premium"}
                </button>
              ))}
            </div>

            <div className="flex gap-2">
              {(["quarterly", "annual"] as Cycle[]).map((c) => (
                <button
                  key={c}
                  onClick={() => setCycle(c)}
                  className={cn(
                    "flex-1 rounded-[2.5px] px-4 py-2.5 text-sm font-medium transition-all border",
                    cycle === c
                      ? "text-white"
                      : "hover:bg-[#f5f5f5]"
                  )}
                  style={cycle === c
                    ? { background: PRIMARY, borderColor: PRIMARY, color: "#fff" }
                    : { borderColor: "#d0d1d3", color: "#525252" }
                  }
                >
                  {c === "quarterly" ? "Quarterly (3 mo)" : "Annual (12 mo)"}
                </button>
              ))}
            </div>
          </div>

          {/* Usage inputs */}
          <div className="bg-white rounded-[2.5px] border border-[#e2e3e5] p-5">
            <h2 className="text-[11px] font-semibold uppercase tracking-wider mb-4" style={{ color: "#0a0a0a" }}>
              Usage Estimate
            </h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-medium" style={{ color: "#737373" }}>Bills per month</label>
                <input
                  type="number"
                  min={0}
                  value={billsPerMonth}
                  onChange={(e) => setBillsPerMonth(Math.max(0, Number(e.target.value)))}
                  className="mt-1 w-full rounded-[2.5px] px-3 py-2 text-sm outline-none transition-colors"
                  style={{
                    border: "1px solid #d0d1d3",
                    background: "#fafafa",
                    color: "#0a0a0a",
                  }}
                  onFocus={(e) => { e.target.style.borderColor = PRIMARY; }}
                  onBlur={(e) => { e.target.style.borderColor = "#d0d1d3"; }}
                />
              </div>
              <div>
                <label className="text-xs font-medium" style={{ color: "#737373" }}>Bank statements per month</label>
                <input
                  type="number"
                  min={0}
                  value={banks}
                  onChange={(e) => setBanks(Math.max(0, Number(e.target.value)))}
                  className="mt-1 w-full rounded-[2.5px] px-3 py-2 text-sm outline-none transition-colors"
                  style={{
                    border: "1px solid #d0d1d3",
                    background: "#fafafa",
                    color: "#0a0a0a",
                  }}
                  onFocus={(e) => { e.target.style.borderColor = PRIMARY; }}
                  onBlur={(e) => { e.target.style.borderColor = "#d0d1d3"; }}
                />
              </div>
            </div>

            <button
              onClick={() => setShowCosts(!showCosts)}
              className="mt-3 text-xs font-medium transition-colors hover:underline"
              style={{ color: PRIMARY }}
            >
              {showCosts ? "Hide" : "Show"} cost breakdown table
            </button>
            {showCosts && (
              <div className="mt-3 overflow-x-auto border border-[#e2e3e5] rounded-[2.5px]">
                <table className="w-full text-xs border-collapse">
                  <thead>
                    <tr style={{ background: "#f6f8fa" }}>
                      <th className="text-left px-3 py-1.5 border-r border-[#e2e3e5]" style={{ color: "#525252" }}>Cost</th>
                      <th className="text-right px-3 py-1.5 border-r border-[#e2e3e5]" style={{ color: "#525252" }}>Base Q</th>
                      <th className="text-right px-3 py-1.5 border-r border-[#e2e3e5]" style={{ color: "#525252" }}>Prem Q</th>
                      <th className="text-right px-3 py-1.5 border-r border-[#e2e3e5]" style={{ color: "#525252" }}>Base A</th>
                      <th className="text-right px-3 py-1.5" style={{ color: "#525252" }}>Prem A</th>
                    </tr>
                  </thead>
                  <tbody>
                    {COST_TABLE.map((row) => (
                      <tr key={row.label} className="border-t border-[#edeef0]">
                        <td className="px-3 py-1.5 border-r border-[#edeef0]" style={{ color: "#737373" }}>{row.label}</td>
                        <td className="px-3 py-1.5 text-right border-r border-[#edeef0]" style={{ color: "#171717" }}>₹{row.baseQ}</td>
                        <td className="px-3 py-1.5 text-right border-r border-[#edeef0]" style={{ color: "#171717" }}>₹{row.premQ}</td>
                        <td className="px-3 py-1.5 text-right border-r border-[#edeef0]" style={{ color: "#171717" }}>₹{row.baseA}</td>
                        <td className="px-3 py-1.5 text-right" style={{ color: "#171717" }}>₹{row.premA}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Free trial */}
          <div className="bg-white rounded-[2.5px] border border-[#e2e3e5] p-5">
            <h2 className="text-[11px] font-semibold uppercase tracking-wider mb-4" style={{ color: "#0a0a0a" }}>
              Free Trial
            </h2>
            <label className="flex items-center gap-2.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={freeTrialEnabled}
                onChange={(e) => setFreeTrialEnabled(e.target.checked)}
                className="w-4 h-4 rounded-[2px] accent-[rgb(49,70,175)]"
              />
              <span className="text-sm font-medium" style={{ color: "#0a0a0a" }}>Enable free trial</span>
            </label>
            {freeTrialEnabled && (
              <div className="mt-3">
                <label className="text-xs font-medium" style={{ color: "#737373" }}>Trial duration (days)</label>
                <input
                  type="number"
                  min={1}
                  max={365}
                  value={trialDays}
                  onChange={(e) => setTrialDays(Math.max(1, Number(e.target.value)))}
                  className="mt-1 w-full rounded-[2.5px] px-3 py-2 text-sm outline-none transition-colors"
                  style={{
                    border: "1px solid #d0d1d3",
                    background: "#fafafa",
                    color: "#0a0a0a",
                  }}
                  onFocus={(e) => { e.target.style.borderColor = PRIMARY; }}
                  onBlur={(e) => { e.target.style.borderColor = "#d0d1d3"; }}
                />
                <p className="text-[10px] mt-1.5" style={{ color: "#a3a3a3" }}>
                  Customer gets full access for {trialDays} day{trialDays !== 1 ? "s" : ""} before billing starts
                </p>
              </div>
            )}
          </div>

          {/* Lead details */}
          <div className="bg-white rounded-[2.5px] border border-[#e2e3e5] p-5">
            <h2 className="text-[11px] font-semibold uppercase tracking-wider mb-4 flex items-center gap-2" style={{ color: "#0a0a0a" }}>
              <Users className="w-3.5 h-3.5" style={{ color: "#a3a3a3" }} strokeWidth={1.8} />
              Lead Details
            </h2>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2 sm:col-span-1">
                <label className="text-xs font-medium" style={{ color: "#737373" }}>Lead name *</label>
                <input
                  type="text"
                  value={leadName}
                  onChange={(e) => setLeadName(e.target.value)}
                  placeholder="Ravi Kumar"
                  className="mt-1 w-full rounded-[2.5px] px-3 py-2 text-sm outline-none transition-colors"
                  style={{
                    border: "1px solid #d0d1d3",
                    background: "#fafafa",
                    color: "#0a0a0a",
                  }}
                  onFocus={(e) => { e.target.style.borderColor = PRIMARY; }}
                  onBlur={(e) => { e.target.style.borderColor = "#d0d1d3"; }}
                />
              </div>
              <div className="col-span-2 sm:col-span-1">
                <label className="text-xs font-medium" style={{ color: "#737373" }}>Organization</label>
                <input
                  type="text"
                  value={orgName}
                  onChange={(e) => setOrgName(e.target.value)}
                  placeholder="Acme Corp"
                  className="mt-1 w-full rounded-[2.5px] px-3 py-2 text-sm outline-none transition-colors"
                  style={{
                    border: "1px solid #d0d1d3",
                    background: "#fafafa",
                    color: "#0a0a0a",
                  }}
                  onFocus={(e) => { e.target.style.borderColor = PRIMARY; }}
                  onBlur={(e) => { e.target.style.borderColor = "#d0d1d3"; }}
                />
              </div>
              <div>
                <label className="text-xs font-medium" style={{ color: "#737373" }}>Email *</label>
                <input
                  type="email"
                  value={leadEmail}
                  onChange={(e) => setLeadEmail(e.target.value)}
                  placeholder="ravi@acme.com"
                  className="mt-1 w-full rounded-[2.5px] px-3 py-2 text-sm outline-none transition-colors"
                  style={{
                    border: "1px solid #d0d1d3",
                    background: "#fafafa",
                    color: "#0a0a0a",
                  }}
                  onFocus={(e) => { e.target.style.borderColor = PRIMARY; }}
                  onBlur={(e) => { e.target.style.borderColor = "#d0d1d3"; }}
                />
              </div>
              <div>
                <label className="text-xs font-medium" style={{ color: "#737373" }}>Phone (for WhatsApp)</label>
                <input
                  type="tel"
                  value={leadPhone}
                  onChange={(e) => setLeadPhone(e.target.value)}
                  placeholder="+91 98765 43210"
                  className="mt-1 w-full rounded-[2.5px] px-3 py-2 text-sm outline-none transition-colors"
                  style={{
                    border: "1px solid #d0d1d3",
                    background: "#fafafa",
                    color: "#0a0a0a",
                  }}
                  onFocus={(e) => { e.target.style.borderColor = PRIMARY; }}
                  onBlur={(e) => { e.target.style.borderColor = "#d0d1d3"; }}
                />
              </div>
            </div>
          </div>

          {/* Action button */}
          <button
            type="button"
            onClick={handleProvision}
            disabled={loading}
            className={cn(
              "w-full rounded-[2.5px] px-6 py-3 text-sm font-semibold transition-colors inline-flex items-center justify-center gap-2",
              loading && "opacity-70 cursor-not-allowed"
            )}
            style={{
              background: PRIMARY,
              color: "#ffffff",
            }}
            onMouseEnter={(e) => { if (!loading) e.currentTarget.style.background = "rgb(39, 56, 140)"; }}
            onMouseLeave={(e) => { if (!loading) e.currentTarget.style.background = PRIMARY; }}
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Creating Customer &amp; Plan&hellip;
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" strokeWidth={1.8} />
                Create Customer &amp; Plan
              </>
            )}
          </button>

          {error && (
            <div
              className="flex items-start gap-2 rounded-[2.5px] px-4 py-3 text-sm"
              style={{
                background: "rgba(207, 34, 46, 0.05)",
                border: "1px solid rgba(207, 34, 46, 0.2)",
                color: DANGER,
              }}
            >
              <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" strokeWidth={1.8} />
              <span>{error}</span>
            </div>
          )}

          {/* Result */}
          {result && (
            <div
              className="rounded-[2.5px] border p-4 animate-fade-in space-y-3"
              style={{
                borderColor: "rgba(26, 127, 37, 0.3)",
                background: "rgba(26, 127, 37, 0.04)",
              }}
            >
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 shrink-0" style={{ color: SUCCESS }} strokeWidth={1.8} />
                <span className="font-semibold text-sm" style={{ color: SUCCESS }}>
                  Customer created &amp; plan assigned
                </span>
              </div>

              {/* Plan & subscription summary */}
              <div className="bg-white rounded-[2.5px] border border-[#e2e3e5] p-3 space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span style={{ color: "#737373" }}>Plan</span>
                  <span className="font-semibold" style={{ color: "#0a0a0a" }}>{result.planLabel}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span style={{ color: "#737373" }}>Amount</span>
                  <span className="font-semibold" style={{ color: "#0a0a0a" }}>₹{result.price.toLocaleString("en-IN")}</span>
                </div>
                {result.subscriptionId && (
                  <div className="flex items-center justify-between text-xs">
                    <span style={{ color: "#737373" }}>Subscription</span>
                    <span className="font-mono" style={{ color: "#0a0a0a" }}>{result.subscriptionId.slice(0, 16)}&hellip;</span>
                  </div>
                )}
                {result.invoiceId && (
                  <div className="flex items-center justify-between text-xs">
                    <span style={{ color: "#737373" }}>Invoice</span>
                    <span className="font-mono" style={{ color: "#0a0a0a" }}>{result.invoiceId.slice(0, 16)}&hellip;</span>
                  </div>
                )}
              </div>

              {/* Signup link (primary) */}
              {result.signupUrl && (
                <div className="bg-white rounded-[2.5px] border border-[#e2e3e5] p-3" style={{ borderColor: PRIMARY }}>
                  <p className="text-xs mb-1 flex items-center gap-1.5" style={{ color: "#737373" }}>
                    <Sparkles className="w-3 h-3" style={{ color: PRIMARY }} strokeWidth={1.8} />
                    Signup link — send this to the lead
                  </p>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      readOnly
                      value={result.signupUrl}
                      className="flex-1 bg-transparent text-sm font-mono outline-none truncate"
                      style={{ color: "#0a0a0a" }}
                    />
                    <button
                      onClick={copyLink}
                      className="shrink-0 p-1.5 rounded-[2.5px] transition-colors"
                      style={{ color: "#a3a3a3" }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = "#f5f5f5"; e.currentTarget.style.color = "#0a0a0a"; }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "#a3a3a3"; }}
                      title="Copy to clipboard"
                    >
                      {copied ? <CheckCircle2 className="h-4 w-4" style={{ color: SUCCESS }} /> : <Copy className="h-4 w-4" />}
                    </button>
                    <a
                      href={result.signupUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="shrink-0 p-1.5 rounded-[2.5px] transition-colors"
                      style={{ color: "#a3a3a3" }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = "#f5f5f5"; e.currentTarget.style.color = "#0a0a0a"; }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "#a3a3a3"; }}
                      title="Open signup page"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  </div>
                  <p className="text-[10px] mt-1.5" style={{ color: "#a3a3a3" }}>
                    Lead signs up → sees plan details → clicks continue → pays on Zoho checkout
                  </p>
                </div>
              )}

              {/* Raw checkout URL (secondary) */}
              <div className="bg-white rounded-[2.5px] border border-[#e2e3e5] p-3">
                <p className="text-xs mb-1" style={{ color: "#a3a3a3" }}>Zoho checkout URL (direct, for debugging)</p>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={result.checkoutUrl}
                    className="flex-1 bg-transparent text-xs font-mono outline-none truncate"
                    style={{ color: "#a3a3a3" }}
                  />
                  <button
                    onClick={copyLink}
                    className="shrink-0 p-1 rounded-[2.5px] transition-colors"
                    style={{ color: "#a3a3a3" }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = "#f5f5f5"; e.currentTarget.style.color = "#0a0a0a"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "#a3a3a3"; }}
                    title="Copy to clipboard"
                  >
                    {copied ? <CheckCircle2 className="h-3 w-3" style={{ color: SUCCESS }} /> : <Copy className="h-3 w-3" />}
                  </button>
                  <a
                    href={result.checkoutUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="shrink-0 p-1 rounded-[2.5px] transition-colors"
                    style={{ color: "#a3a3a3" }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = "#f5f5f5"; e.currentTarget.style.color = "#0a0a0a"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "#a3a3a3"; }}
                    title="Open checkout page"
                  >
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              </div>

              {/* Trial info */}
              {result.trialDays > 0 && (
                <div
                  className="flex items-center gap-2 rounded-[2.5px] px-3 py-2 text-xs font-medium"
                  style={{
                    background: "rgba(49, 70, 175, 0.06)",
                    border: "1px solid rgba(49, 70, 175, 0.2)",
                    color: PRIMARY,
                  }}
                >
                  <Sparkles className="h-3.5 w-3.5" strokeWidth={1.8} />
                  {result.trialDays}-day free trial enabled — billing starts after trial ends
                </div>
              )}

              {/* Share buttons */}
              <div className="flex gap-2 flex-wrap">
                <button
                  onClick={openMailto}
                  className="flex items-center gap-1.5 rounded-[2.5px] px-3 py-2 text-xs font-medium transition-colors"
                  style={{
                    background: "rgba(49, 70, 175, 0.08)",
                    border: "1px solid rgba(49, 70, 175, 0.25)",
                    color: PRIMARY,
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(49, 70, 175, 0.15)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(49, 70, 175, 0.08)"; }}
                >
                  <Mail className="h-3.5 w-3.5" strokeWidth={1.8} />
                  Send via Email
                </button>
                {result.waLink && (
                  <button
                    onClick={openWhatsApp}
                    className="flex items-center gap-1.5 rounded-[2.5px] px-3 py-2 text-xs font-medium transition-colors"
                    style={{
                      background: "rgba(37, 211, 102, 0.08)",
                      border: "1px solid rgba(37, 211, 102, 0.25)",
                      color: "#075E54",
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(37, 211, 102, 0.15)"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(37, 211, 102, 0.08)"; }}
                  >
                    <MessageSquare className="h-3.5 w-3.5" strokeWidth={1.8} />
                    Open WhatsApp
                  </button>
                )}
                <button
                  onClick={copyLink}
                  className="flex items-center gap-1.5 rounded-[2.5px] px-3 py-2 text-xs transition-colors"
                  style={{
                    background: "#ffffff",
                    border: "1px solid #e2e3e5",
                    color: "#737373",
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = "#f5f5f5"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = "#ffffff"; }}
                >
                  <Copy className="h-3.5 w-3.5" strokeWidth={1.8} />
                  Copy link
                </button>
              </div>

              <div className="flex items-center justify-between text-xs" style={{ color: "#a3a3a3" }}>
                <span>Checkout link expires at {expiryTime} (1 hour)</span>
                <span>Customer: {result.customerId.slice(0, 12)}&hellip;</span>
              </div>
            </div>
          )}
        </div>

        {/* ── RIGHT: Price Preview ───────────────────────────────────────── */}
        <div className="lg:col-span-2 lg:sticky lg:top-24 lg:self-start">
          <div
            className="bg-white rounded-[2.5px] border border-[#e2e3e5] p-6"
            style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.05), 0 1px 2px rgba(0,0,0,0.03)" }}
          >
            <h3 className="text-[11px] font-semibold uppercase tracking-wider mb-5 flex items-center gap-2" style={{ color: "#0a0a0a" }}>
              <Sparkles className="w-3.5 h-3.5" style={{ color: PRIMARY }} strokeWidth={1.8} />
              Price Preview
            </h3>

            <div className="mb-5 text-center">
              <p className="text-3xl font-bold tabular-nums" style={{ color: PRIMARY }}>
                ₹{breakdown.finalPrice.toLocaleString("en-IN")}
              </p>
              <p className="text-xs mt-1" style={{ color: "#a3a3a3" }}>
                {cfg.label} · {breakdown.months} month{breakdown.months > 1 ? "s" : ""}
              </p>
            </div>

            <div className="space-y-2.5 pt-4" style={{ borderTop: "1px solid #edeef0" }}>
              {[
                { label: `Infra (${breakdown.months} mo × ₹${cfg.infra}/mo)`, value: breakdown.infraTotal },
                { label: `Bills (${billsPerMonth}/mo × ${breakdown.months} mo × ₹${cfg.perBill})`, value: breakdown.billsTotal },
                { label: `Banks (${banks} × ${breakdown.months} mo × ₹${cfg.perBank})`, value: breakdown.banksTotal },
              ].map((row) => (
                <div key={row.label} className="flex justify-between text-sm">
                  <span style={{ color: "#737373" }}>{row.label}</span>
                  <span className="font-medium tabular-nums" style={{ color: "#0a0a0a" }}>
                    ₹{row.value.toFixed(2)}
                  </span>
                </div>
              ))}
              <div className="pt-2 mt-2" style={{ borderTop: "1px solid #edeef0" }}>
                <div className="flex justify-between">
                  <span className="text-sm font-semibold" style={{ color: "#0a0a0a" }}>Total (rounded)</span>
                  <span className="text-lg font-bold tabular-nums" style={{ color: PRIMARY }}>
                    ₹{breakdown.finalPrice.toLocaleString("en-IN")}
                  </span>
                </div>
              </div>
            </div>

            {/* Trial badge */}
            {freeTrialEnabled && (
              <div className="mt-4 pt-3 text-center" style={{ borderTop: "1px solid #edeef0" }}>
                <span
                  className="inline-flex items-center gap-1.5 rounded-[2.5px] px-2.5 py-1 text-xs font-medium"
                  style={{
                    background: "rgba(49, 70, 175, 0.06)",
                    color: PRIMARY,
                    border: "1px solid rgba(49, 70, 175, 0.15)",
                  }}
                >
                  {trialDays}-day free trial
                </span>
              </div>
            )}

            {/* Usage summary */}
            <div className="mt-5 pt-4" style={{ borderTop: "1px solid #edeef0" }}>
              <p className="text-xs font-medium mb-2" style={{ color: "#737373" }}>Usage summary</p>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="rounded-[2.5px] p-2.5 text-center" style={{ background: "#f6f8fa" }}>
                  <p className="font-semibold tabular-nums" style={{ color: "#0a0a0a" }}>{billsPerMonth}</p>
                  <p style={{ color: "#737373" }}>Bills/month</p>
                </div>
                <div className="rounded-[2.5px] p-2.5 text-center" style={{ background: "#f6f8fa" }}>
                  <p className="font-semibold tabular-nums" style={{ color: "#0a0a0a" }}>{banks}</p>
                  <p style={{ color: "#737373" }}>Banks/month</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
