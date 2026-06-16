"use client";

import * as React from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  Sparkles, ArrowRight, CheckCircle2, Loader2, Building2, Mail, Phone, User,
} from "lucide-react";

function SignUpContent() {
  const params = useSearchParams();
  const router = useRouter();

  const checkoutUrl = params.get("checkout_url") || "";
  const planLabel = params.get("plan") || "Your plan";
  const price = params.get("price") || "0";
  const prefilledName = params.get("name") || "";
  const prefilledEmail = params.get("email") || "";

  const [name, setName] = React.useState(prefilledName);
  const [email, setEmail] = React.useState(prefilledEmail);
  const [phone, setPhone] = React.useState("");
  const [agreed, setAgreed] = React.useState(false);
  const [proceeding, setProceeding] = React.useState(false);

  const handleContinue = () => {
    if (!name.trim() || !email.trim() || !agreed) return;
    if (!checkoutUrl) return;
    setProceeding(true);
    // Redirect to Zoho hosted checkout page
    window.location.assign(checkoutUrl);
  };

  return (
    <div className="flex min-h-screen items-center justify-center p-4" style={{ background: "#f3f4f6" }}>
      <div className="w-full max-w-md">
        {/* Brand header */}
        <div className="text-center mb-6">
          <div
            className="inline-flex items-center justify-center rounded-[2.5px] mb-3"
            style={{
              width: 48,
              height: 48,
              background: "rgba(49, 70, 175, 0.08)",
            }}
          >
            <Building2 className="w-6 h-6" style={{ color: "rgb(49, 70, 175)" }} strokeWidth={1.8} />
          </div>
          <h1 className="text-xl font-bold" style={{ color: "#0a0a0a" }}>
            Korefi — AI Accountant
          </h1>
        </div>

        {/* Plan card */}
        <div
          className="bg-white rounded-[2.5px] border border-[#e2e3e5] p-5 mb-4"
          style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.05), 0 1px 2px rgba(0,0,0,0.03)" }}
        >
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="w-4 h-4" style={{ color: "rgb(49, 70, 175)" }} strokeWidth={1.8} />
            <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: "#0a0a0a" }}>
              Your Plan
            </span>
          </div>

          <div className="flex items-center justify-between mb-2">
            <span className="text-sm" style={{ color: "#737373" }}>Plan</span>
            <span className="text-sm font-semibold" style={{ color: "#0a0a0a" }}>{planLabel}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm" style={{ color: "#737373" }}>Amount</span>
            <span className="text-lg font-bold tabular-nums" style={{ color: "rgb(49, 70, 175)" }}>
              ₹{Number(price).toLocaleString("en-IN")}
            </span>
          </div>
        </div>

        {/* Signup form */}
        <div
          className="bg-white rounded-[2.5px] border border-[#e2e3e5] p-5 mb-4"
          style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.05), 0 1px 2px rgba(0,0,0,0.03)" }}
        >
          <h2 className="text-[11px] font-semibold uppercase tracking-wider mb-4" style={{ color: "#0a0a0a" }}>
            Your Details
          </h2>

          <div className="space-y-3">
            <div>
              <label className="text-xs font-medium" style={{ color: "#737373" }}>Full name *</label>
              <div className="relative mt-1">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5" style={{ color: "#a3a3a3" }} strokeWidth={1.8} />
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ravi Kumar"
                  className="w-full rounded-[2.5px] pl-9 pr-3 py-2 text-sm outline-none transition-colors"
                  style={{
                    border: "1px solid #d0d1d3",
                    background: "#fafafa",
                    color: "#0a0a0a",
                  }}
                  onFocus={(e) => { e.target.style.borderColor = "rgb(49, 70, 175)"; }}
                  onBlur={(e) => { e.target.style.borderColor = "#d0d1d3"; }}
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-medium" style={{ color: "#737373" }}>Email *</label>
              <div className="relative mt-1">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5" style={{ color: "#a3a3a3" }} strokeWidth={1.8} />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="ravi@acme.com"
                  className="w-full rounded-[2.5px] pl-9 pr-3 py-2 text-sm outline-none transition-colors"
                  style={{
                    border: "1px solid #d0d1d3",
                    background: "#fafafa",
                    color: "#0a0a0a",
                  }}
                  onFocus={(e) => { e.target.style.borderColor = "rgb(49, 70, 175)"; }}
                  onBlur={(e) => { e.target.style.borderColor = "#d0d1d3"; }}
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-medium" style={{ color: "#737373" }}>Phone</label>
              <div className="relative mt-1">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5" style={{ color: "#a3a3a3" }} strokeWidth={1.8} />
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+91 98765 43210"
                  className="w-full rounded-[2.5px] pl-9 pr-3 py-2 text-sm outline-none transition-colors"
                  style={{
                    border: "1px solid #d0d1d3",
                    background: "#fafafa",
                    color: "#0a0a0a",
                  }}
                  onFocus={(e) => { e.target.style.borderColor = "rgb(49, 70, 175)"; }}
                  onBlur={(e) => { e.target.style.borderColor = "#d0d1d3"; }}
                />
              </div>
            </div>

            <label className="flex items-start gap-2 cursor-pointer mt-4">
              <input
                type="checkbox"
                checked={agreed}
                onChange={(e) => setAgreed(e.target.checked)}
                className="mt-0.5 shrink-0 rounded-[2.5px] border-[#d0d1d3]"
                style={{ accentColor: "rgb(49, 70, 175)" }}
              />
              <span className="text-xs" style={{ color: "#737373" }}>
                I agree to the{" "}
                <span className="font-medium" style={{ color: "rgb(49, 70, 175)" }}>Terms of Service</span>{" "}
                and{" "}
                <span className="font-medium" style={{ color: "rgb(49, 70, 175)" }}>Privacy Policy</span>
              </span>
            </label>
          </div>
        </div>

        {/* Continue button */}
        {checkoutUrl ? (
          <button
            type="button"
            onClick={handleContinue}
            disabled={!name.trim() || !email.trim() || !agreed || proceeding}
            className="w-full rounded-[2.5px] px-6 py-3 text-sm font-semibold transition-all inline-flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            style={{
              background: "rgb(49, 70, 175)",
              color: "#ffffff",
            }}
            onMouseEnter={(e) => {
              if (!proceeding && name.trim() && email.trim() && agreed)
                e.currentTarget.style.background = "rgb(39, 56, 140)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "rgb(49, 70, 175)";
            }}
          >
            {proceeding ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Redirecting to payment&hellip;
              </>
            ) : (
              <>
                Continue to Payment
                <ArrowRight className="h-4 w-4" strokeWidth={2} />
              </>
            )}
          </button>
        ) : (
          <div
            className="rounded-[2.5px] px-4 py-3 text-sm text-center"
            style={{
              background: "rgba(207, 34, 46, 0.05)",
              border: "1px solid rgba(207, 34, 46, 0.2)",
              color: "rgb(207, 34, 46)",
            }}
          >
            Invalid or expired link. Please contact the sender for a new link.
          </div>
        )}

        <p className="text-xs text-center mt-4" style={{ color: "#a3a3a3" }}>
          Secure payment via Zoho Billing
        </p>
      </div>
    </div>
  );
}

export default function SignUpPage() {
  return (
    <React.Suspense fallback={
      <div className="flex min-h-screen items-center justify-center" style={{ background: "#f3f4f6" }}>
        <Loader2 className="h-6 w-6 animate-spin" style={{ color: "rgb(49, 70, 175)" }} />
      </div>
    }>
      <SignUpContent />
    </React.Suspense>
  );
}
