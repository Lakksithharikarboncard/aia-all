"use client";

import * as React from "react";
import { useSearchParams } from "next/navigation";
import {
  CheckCircle2, AlertTriangle, Loader2, Building2,
  ArrowRight, Sparkles, Package,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { apiUrl, navUrl } from "@/lib/api-base";

function CreateOrgContent() {
  const params = useSearchParams();
  const hostedPageId = params.get("hostedpage_id");

  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [subscription, setSubscription] = React.useState<{
    subscriptionId: string;
    planName: string;
    amount: number;
    status: string;
    customerEmail: string;
    customerName: string;
    termEndsAt: string;
  } | null>(null);

  const [orgName, setOrgName] = React.useState("");
  const [gstin, setGstin] = React.useState("");
  const [saving, setSaving] = React.useState(false);
  const [saved, setSaved] = React.useState(false);

  // Fetch hosted page details on mount
  React.useEffect(() => {
    if (!hostedPageId) {
      setLoading(false);
      setError("No payment reference found. If you just paid, your subscription is already active in Zoho.");
      return;
    }

    fetch(apiUrl(`/api/create-organization?hostedpage_id=${hostedPageId}`))
      .then((r) => r.json())
      .then((data) => {
        if (!data.success) {
          setError(data.error || "Could not verify payment status.");
          return;
        }
        setSubscription(data.subscription);
        // Pre-fill name from customer
        if (data.subscription.customerName) {
          setOrgName(data.subscription.customerName);
        }
      })
      .catch((e) => setError(`Network error: ${e.message}`))
      .finally(() => setLoading(false));
  }, [hostedPageId]);

  const handleSave = async () => {
    if (!orgName.trim()) return;
    setSaving(true);
    try {
      const res = await fetch(apiUrl("/api/create-organization"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          hostedpage_id: hostedPageId,
          organizationName: orgName.trim(),
          gstin: gstin.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!data.success) {
        setError(data.error || "Failed to create organization.");
        return;
      }
      setSaved(true);
    } catch (e: any) {
      setError(`Error: ${e.message}`);
    } finally {
      setSaving(false);
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f8f9fb] p-4">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
          <p className="text-sm text-muted-foreground">Verifying payment...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error && !subscription) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f8f9fb] p-4">
        <div className="w-full max-w-md text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-amber-50">
            <AlertTriangle className="h-8 w-8 text-amber-500" />
          </div>
          <h1 className="text-xl font-bold text-foreground mb-2">Payment received</h1>
          <p className="text-sm text-muted-foreground mb-6">{error}</p>
          <p className="text-xs text-muted-foreground">
            Your subscription is active in Zoho. Your account will be set up shortly by the Korefi team.
          </p>
        </div>
      </div>
    );
  }

  // Saved / Success state
  if (saved) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f8f9fb] p-4">
        <div className="w-full max-w-md text-center animate-fade-in">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[#e8f5e9]">
            <CheckCircle2 className="h-8 w-8 text-success" />
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-2">All set!</h1>
          <p className="text-sm text-muted-foreground mb-2">
            Your organization <strong>{orgName}</strong> is ready.
          </p>
          <p className="text-xs text-muted-foreground mb-6">
            Your {subscription?.planName} plan is active. You can now access the dashboard.
          </p>
          <a
            href={navUrl("/admin")}
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-white hover:bg-primary/90 transition-colors"
          >
            Go to Dashboard
            <ArrowRight className="h-4 w-4" />
          </a>
        </div>
      </div>
    );
  }

  // Default: payment confirmed, show org setup form
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f8f9fb] p-4">
      <div className="w-full max-w-lg">
        <div className="rounded-2xl border border-border bg-white p-8">
          {/* Header */}
          <div className="text-center mb-6">
            <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-[#e8f5e9]">
              <CheckCircle2 className="h-7 w-7 text-success" />
            </div>
            <h1 className="text-xl font-bold text-foreground">Payment confirmed!</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Your subscription is active. Set up your organization to continue.
            </p>
          </div>

          {/* Subscription summary */}
          {subscription && (
            <div className="bg-[#f8f9fb] rounded-xl p-4 mb-6">
              <div className="flex items-center gap-2 mb-3">
                <Package className="h-4 w-4 text-primary" />
                <span className="text-sm font-semibold text-foreground">Subscription Details</span>
              </div>
              <table className="w-full text-sm">
                <tbody>
                  <tr>
                    <td className="text-muted-foreground py-1">Plan</td>
                    <td className="text-right font-medium text-foreground">{subscription.planName}</td>
                  </tr>
                  <tr>
                    <td className="text-muted-foreground py-1">Amount paid</td>
                    <td className="text-right font-bold text-success">₹{subscription.amount.toLocaleString("en-IN")}</td>
                  </tr>
                  <tr>
                    <td className="text-muted-foreground py-1">Status</td>
                    <td className="text-right">
                      <span className="inline-flex items-center gap-1 rounded-full bg-success/10 px-2 py-0.5 text-xs font-medium text-success">
                        Active
                      </span>
                    </td>
                  </tr>
                  <tr>
                    <td className="text-muted-foreground py-1">Valid until</td>
                    <td className="text-right text-foreground">
                      {new Date(subscription.termEndsAt).toLocaleDateString("en-IN")}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}

          {/* Organization setup form */}
          <form
            onSubmit={(e) => { e.preventDefault(); handleSave(); }}
            className="space-y-4"
          >
            <div>
              <label className="text-xs font-medium text-muted-foreground">Organization name *</label>
              <input
                type="text"
                value={orgName}
                onChange={(e) => setOrgName(e.target.value)}
                placeholder="Acme Corp"
                required
                className="mt-1 w-full rounded-xl border border-border bg-white px-4 py-3 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">GSTIN (optional)</label>
              <input
                type="text"
                value={gstin}
                onChange={(e) => setGstin(e.target.value.toUpperCase())}
                placeholder="33AAAAA0000A1Z5"
                className="mt-1 w-full rounded-xl border border-border bg-white px-4 py-3 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring"
              />
            </div>

            {error && (
              <div className="flex items-start gap-2 rounded-xl bg-danger/5 border border-danger/20 px-4 py-3 text-sm text-danger">
                <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={saving || !orgName.trim()}
              className={cn(
                "w-full flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold transition-all",
                "bg-primary text-white hover:bg-primary/90 disabled:opacity-50",
              )}
            >
              {saving ? (
                <><Loader2 className="h-4 w-4 animate-spin" /> Saving...</>
              ) : (
                <><Building2 className="h-4 w-4" /> Create Organization & Continue</>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default function CreateOrganizationPage() {
  return (
    <React.Suspense fallback={
      <div className="flex min-h-screen items-center justify-center bg-[#f8f9fb] p-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    }>
      <CreateOrgContent />
    </React.Suspense>
  );
}
