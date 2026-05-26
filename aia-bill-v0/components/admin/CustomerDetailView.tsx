"use client";

import * as React from "react";
import { Link as LinkIcon, RefreshCw, Copy, Check, Mail } from "lucide-react";
import { cn } from "@/lib/utils";
import { Container } from "@/components/mds/Container";
import { Header } from "@/components/mds/Header";
import { StatusIndicator, STATUS_MAP, STATUS_LABELS } from "@/components/mds/StatusIndicator";
import { Button } from "@/components/mds/Button";
import { FormField } from "@/components/mds/FormField";
import { Input } from "@/components/mds/Input";
import { Textarea } from "@/components/mds/Textarea";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/ui/tabs";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
} from "@/components/ui/drawer";
import { InfoRow, InfoGrid } from "./components/InfoRow";
import {
  getCustomer, saveCustomer, loadPlanPresets, addAuditEntry,
} from "@/lib/billing";
import { DatePicker } from "@/components/mds/DatePicker";
import { useToast } from "@/components/ui/Toast";
import type { CustomerAccount } from "@/lib/billing";

interface CustomerDetailViewProps {
  customerId: string;
  onBack: () => void;
  onRefresh: () => void;
}

interface DodoPayment {
  paymentId: string;
  amount: number;
  currency: string;
  status: string;
  paymentMethod: string;
  paymentMethodType: string | null;
  createdAt: string | null;
  errorMessage: string | null;
  invoiceUrl: string | null;
}

export function CustomerDetailView({ customerId, onBack, onRefresh }: CustomerDetailViewProps) {
  const [customer, setCustomer] = React.useState<CustomerAccount | undefined>(
    () => getCustomer(customerId)
  );
  const [showEditDrawer, setShowEditDrawer] = React.useState(false);
  const [generatingLink, setGeneratingLink] = React.useState(false);
  const [copied, setCopied] = React.useState(false);
  const [payments, setPayments] = React.useState<DodoPayment[]>([]);
  const [paymentsLoading, setPaymentsLoading] = React.useState(false);
  const { addToast } = useToast();

  const reload = () => {
    setCustomer(getCustomer(customerId));
    loadPayments();
  };

  const loadPayments = React.useCallback(async () => {
    if (!customerId) return;
    setPaymentsLoading(true);
    try {
      const res = await fetch(`/api/dodo/payments?customer_id=${customerId}`);
      const data = await res.json();
      if (res.ok) {
        setPayments(data.payments ?? []);
      }
    } catch {
      /* non-critical */
    } finally {
      setPaymentsLoading(false);
    }
  }, [customerId]);

  React.useEffect(() => { reload(); }, [customerId]);
  React.useEffect(() => { loadPayments(); }, [loadPayments]);

  const copyToClipboard = (text: string) => {
    navigator.clipboard?.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }).catch(() => {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.style.cssText = "position:fixed;opacity:0";
      document.body.appendChild(ta);
      ta.select();
      try { document.execCommand("copy"); } catch { /* unsupported */ }
      document.body.removeChild(ta);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const generatePaymentLink = async () => {
    if (!customer) return;
    setGeneratingLink(true);
    try {
      const res = await fetch("/api/dodo/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customerAccountId: customerId, customerData: customer }),
      });
      if (!res.ok) {
        let errMsg = "Failed to generate link";
        try { const err = await res.json(); errMsg = err.error ?? errMsg; } catch { /* non-JSON body */ }
        throw new Error(errMsg);
      }
      const data = await res.json();
      const updated = getCustomer(customerId);
      if (updated) {
        saveCustomer({
          ...updated,
          dodoCustomerId: data.dodoCustomerId ?? updated.dodoCustomerId,
          dodoProductId: data.dodoProductId ?? updated.dodoProductId,
          checkoutUrl: data.checkoutUrl,
          signupUrl: data.signupUrl,
          status: "payment_pending",
        });
      }
      onRefresh();
      reload();
      copyToClipboard(data.signupUrl);
      addToast("Onboarding link generated and copied!", "success");
    } catch (err: any) {
      addToast(err?.message ?? "Failed to generate onboarding link", "error");
    } finally {
      setGeneratingLink(false);
    }
  };

  const resyncFromDodo = async () => {
    try {
      const res = await fetch(`/api/dodo/resync/${customerId}`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Resync failed");
      const updated = getCustomer(customerId);
      if (updated) saveCustomer({ ...updated, status: data.status, dodoSubscriptionId: data.subscriptionId ?? updated.dodoSubscriptionId });
      onRefresh();
      reload();
      addToast(`Resynced — status is now "${data.status}"`, "success");
    } catch (err: any) {
      addToast(err?.message ?? "Resync failed", "error");
    }
  };

  if (!customer) return <div className="p-8 text-text-disabled">Customer not found.</div>;

  const formatINR = (n: number) => `₹${n.toLocaleString("en-IN")}`;
  const freqLabel = { monthly: "month", quarterly: "quarter", annual: "year" }[customer.billingFrequency] ?? customer.billingFrequency;

  return (
    <div>
      <Drawer open={showEditDrawer} onOpenChange={(open) => { setShowEditDrawer(open); if (!open) reload(); }} direction="right">
        <DrawerContent className="!w-[40vw] !max-w-[40vw] rounded-l-[2.5px]">
          <DrawerHeader className="border-b border-border-divider">
            <DrawerTitle className="text-lg font-semibold text-text-heading">Edit Details</DrawerTitle>
            <DrawerDescription className="text-xs text-text-secondary">Update contact and billing information</DrawerDescription>
          </DrawerHeader>
          <div className="flex-1 overflow-y-auto px-6 py-4">
            <EditContactForm
              customer={customer}
              onConfirm={async (patch) => {
                const updated = { ...customer, ...patch };
                saveCustomer(updated);
                addAuditEntry({
                  actor: "CS User",
                  action: "customer_updated",
                  entityType: "customer",
                  entityId: customerId,
                  newValue: updated.companyName,
                  reason: "Contact details updated",
                });

                // Always sync effective billing contact to Dodo — invoices are raised on billing contact.
                // Falls back to primary fields when billing fields are blank.
                if (customer.dodoCustomerId) {
                  try {
                    const res = await fetch(`/api/dodo/customers/${customer.dodoCustomerId}`, {
                      method: "PATCH",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        name:  updated.billingName  || updated.primaryName,
                        email: updated.billingEmail || updated.primaryEmail,
                        phone: updated.billingPhone || updated.primaryPhone || null,
                      }),
                    });
                    if (res.ok) addToast("Billing contact synced to Dodo", "success");
                  } catch {
                    addToast("Saved locally but Dodo sync failed", "info");
                  }
                }

                // Sync next_billing_date to Dodo if subscription exists and start date changed
                if (
                  patch.subscriptionStartDate !== undefined &&
                  customer.dodoSubscriptionId &&
                  patch.subscriptionStartDate !== customer.subscriptionStartDate
                ) {
                  try {
                    const iso = new Date(patch.subscriptionStartDate).toISOString();
                    const res = await fetch(`/api/dodo/subscriptions/${customer.dodoSubscriptionId}`, {
                      method: "PATCH",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ next_billing_date: iso }),
                    });
                    if (!res.ok) throw new Error("Dodo update failed");
                    addToast("Start date synced to Dodo", "success");
                  } catch {
                    addToast("Start date saved locally but Dodo sync failed", "info");
                  }
                }

                onRefresh();
                reload();
                setShowEditDrawer(false);
                addToast("Details updated", "success");
              }}
              onCancel={() => setShowEditDrawer(false)}
            />
          </div>
        </DrawerContent>
      </Drawer>

      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-lg font-semibold text-text-heading">{customer.companyName}</h1>
          <p className="text-sm text-text-secondary mt-0.5">
            {customer.primaryName} · {customer.primaryEmail}
          </p>
        </div>
        <StatusIndicator
          type={STATUS_MAP[customer.status] ?? "pending"}
          label={STATUS_LABELS[customer.status] ?? customer.status}
        />
      </div>

      <Tabs defaultValue="overview" className="mt-6">
        <TabsList variant="line">
          {(["overview", "payments"] as const).map((tab) => (
            <TabsTrigger key={tab} value={tab}>
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </TabsTrigger>
          ))}
        </TabsList>

        {/* ── Overview ── */}
        <TabsContent value="overview" className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <InfoGrid title="Company">
              <InfoRow label="Company Name" value={customer.companyName} />
              <InfoRow label="GSTIN" value={customer.gstin ?? "—"} />
              <InfoRow label="Plan" value={loadPlanPresets().find((p) => p.id === customer.planId)?.name ?? "Custom"} />
              <InfoRow label="BD Owner" value={customer.bdOwner ?? "—"} />
              <InfoRow label="Created" value={new Date(customer.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })} />
            </InfoGrid>

            <InfoGrid
              title="Primary Contact"
              action={<button onClick={() => setShowEditDrawer(true)} className="text-xs text-action-primary hover:underline font-medium">Edit</button>}
            >
              <InfoRow label="Name" value={customer.primaryName} />
              <InfoRow label="Phone" value={customer.primaryPhone ?? "—"} />
              <InfoRow label="Email" value={customer.primaryEmail} full />
              {(customer.billingName || customer.billingEmail || customer.billingAddressLine) && (
                <>
                  <InfoRow label="Billing Name" value={customer.billingName ?? "—"} />
                  <InfoRow label="Billing Email" value={customer.billingEmail ?? "—"} full />
                  {customer.billingAddressLine && (
                    <InfoRow label="Billing Address" value={`${customer.billingAddressLine}${customer.billingCity ? `, ${customer.billingCity}` : ""}${customer.billingState ? `, ${customer.billingState}` : ""}${customer.billingPincode ? ` — ${customer.billingPincode}` : ""}`} full />
                  )}
                </>
              )}
            </InfoGrid>
          </div>

          {/* Pricing */}
          <div className="mt-5">
            <Container header={<Header variant="container" title="Plan Details" />}>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-semibold text-text-heading tabular-nums">
                  {formatINR(customer.price)}
                </span>
                <span className="text-sm text-text-secondary">/ {freqLabel}</span>
              </div>
              {customer.subscriptionStartDate && (
                <p className="text-xs text-text-secondary mt-1">
                  Billing starts: {new Date(customer.subscriptionStartDate).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                </p>
              )}
              {customer.renewalDueDate && (
                <p className="text-xs text-text-secondary mt-1">
                  Next billing: {new Date(customer.renewalDueDate).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                </p>
              )}
              <div className="mt-4 pt-4 border-t border-border-divider">
                <p className="text-[11px] text-text-secondary uppercase tracking-wider font-medium mb-2">
                  Modules Included
                </p>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
                  {(customer.modules ?? []).map((m) => (
                    <div key={m} className="flex items-center gap-1.5 text-[12.5px] text-text-body">
                      <span className="w-1 h-1 rounded-full bg-action-primary shrink-0" />
                      {m}
                    </div>
                  ))}
                  {(customer.modules ?? []).length === 0 && (
                    <span className="text-[12.5px] text-text-secondary">No modules assigned</span>
                  )}
                </div>
              </div>
            </Container>
          </div>

          {/* Onboarding link section */}
          <div className="mt-5">
            <Container header={<Header variant="container" title="Onboarding Link" />}>
              <div className="space-y-3">
                <div className="flex items-center gap-2 flex-wrap">
                  <Button
                    size="sm"
                    loading={generatingLink}
                    onClick={generatePaymentLink}
                  >
                    <LinkIcon className="w-3.5 h-3.5 mr-1.5" />
                    {customer.signupUrl ? "Regenerate Onboarding Link" : "Generate Onboarding Link"}
                  </Button>

                  {customer.signupUrl && (
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => {
                        const subject = encodeURIComponent(`Your onboarding link for ${customer.companyName}`);
                        const body = encodeURIComponent(`Hi ${customer.primaryName},\n\nHere is your onboarding link:\n\n${customer.signupUrl}\n\nPlease complete the signup to activate your account.\n\nThanks,\nAI Accountant Team`);
                        window.open(`mailto:${customer.primaryEmail}?subject=${subject}&body=${body}`, "_blank");
                      }}
                    >
                      <Mail className="w-3.5 h-3.5 mr-1.5" />
                      Send in email
                    </Button>
                  )}
                </div>

                {customer.signupUrl && (
                  <div className="flex items-center gap-2">
                    <code className="flex-1 text-xs bg-surface-hover px-2.5 py-1.5 rounded-[2.5px] truncate text-text-secondary">
                      {customer.signupUrl}
                    </code>
                    <button
                      onClick={() => copyToClipboard(customer.signupUrl!)}
                      className="flex items-center gap-1 text-xs text-action-primary hover:underline shrink-0 font-medium"
                    >
                      {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                      {copied ? "Copied!" : "Copy"}
                    </button>
                  </div>
                )}
              </div>
            </Container>
          </div>

          {/* Notes */}
          {customer.notes && (
            <div className="mt-5">
              <Container header={<Header variant="container" title="Notes" />}>
                <p className="text-sm text-text-body whitespace-pre-wrap">{customer.notes}</p>
              </Container>
            </div>
          )}
        </TabsContent>

        {/* ── Payments ── */}
        <TabsContent value="payments" className="pt-6">
          <Container header={<Header variant="container" title="Dodo Payments" />}>
            <dl className="space-y-3">
              <div className="flex justify-between text-sm">
                <dt className="text-text-secondary">Dodo Customer ID</dt>
                <dd className="font-mono text-xs text-text-body">{customer.dodoCustomerId ?? "—"}</dd>
              </div>
              <div className="flex justify-between text-sm">
                <dt className="text-text-secondary">Dodo Subscription ID</dt>
                <dd className="font-mono text-xs text-text-body">{customer.dodoSubscriptionId ?? "—"}</dd>
              </div>
              <div className="flex justify-between text-sm">
                <dt className="text-text-secondary">Status</dt>
                <dd className="capitalize text-text-body">{customer.status.replace(/_/g, " ")}</dd>
              </div>
              {customer.activatedAt && (
                <div className="flex justify-between text-sm">
                  <dt className="text-text-secondary">Activated</dt>
                  <dd className="text-text-body">{new Date(customer.activatedAt).toLocaleDateString("en-IN")}</dd>
                </div>
              )}
              {customer.renewalDueDate && (
                <div className="flex justify-between text-sm">
                  <dt className="text-text-secondary">Next Renewal</dt>
                  <dd className="text-text-body">{new Date(customer.renewalDueDate).toLocaleDateString("en-IN")}</dd>
                </div>
              )}
            </dl>
            <div className="mt-4 pt-4 border-t border-border-divider">
              <Button size="sm" variant="secondary" onClick={resyncFromDodo}>
                <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
                Resync from Dodo
              </Button>
            </div>
          </Container>

          {/* Payment Log */}
          <div className="mt-5">
            <Container header={<Header variant="container" title="Payment Log" />}>
              <div className="rounded-[2.5px] border border-[#e2e3e5] overflow-hidden">
                <table className="w-full text-left text-[12.5px]">
                  <thead>
                    <tr className="border-b border-[#e2e3e5] bg-[#fafafa]">
                      <th className="px-4 py-2.5 font-medium text-[#737373]">Payment ID</th>
                      <th className="px-4 py-2.5 font-medium text-[#737373]">Amount</th>
                      <th className="px-4 py-2.5 font-medium text-[#737373]">Status</th>
                      <th className="px-4 py-2.5 font-medium text-[#737373]">Method</th>
                      <th className="px-4 py-2.5 font-medium text-[#737373]">Date</th>
                      <th className="px-4 py-2.5 font-medium text-[#737373]">Invoice</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#edeef0]">
                    {paymentsLoading ? (
                      <tr>
                        <td colSpan={6} className="px-4 py-7 text-center text-[#a3a3a3]">
                          Loading payments…
                        </td>
                      </tr>
                    ) : payments.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-4 py-7 text-center text-[#a3a3a3]">
                          No payments recorded yet
                        </td>
                      </tr>
                    ) : (
                      payments.map((p) => (
                        <tr key={p.paymentId} className="hover:bg-[#f2f3f5] transition-colors">
                          <td className="px-4 py-3 font-mono text-[11px] text-text-body tabular-nums">
                            {p.paymentId}
                          </td>
                          <td className="px-4 py-3 text-text-body tabular-nums">
                            {p.currency === "INR" ? "₹" : `${p.currency} `}
                            {(p.amount / 100).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                          </td>
                          <td className="px-4 py-3">
                            <PaymentStatusBadge status={p.status} />
                          </td>
                          <td className="px-4 py-3 text-text-secondary">
                            {p.paymentMethod === "—" ? "—" : formatPaymentMethod(p)}
                          </td>
                          <td className="px-4 py-3 text-text-secondary tabular-nums">
                            {p.createdAt
                              ? new Date(p.createdAt).toLocaleDateString("en-IN", {
                                  day: "numeric",
                                  month: "short",
                                  year: "numeric",
                                })
                              : "—"}
                          </td>
                          <td className="px-4 py-3">
                            {p.invoiceUrl ? (
                              <a
                                href={p.invoiceUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-[11px] font-medium text-action-primary hover:underline"
                              >
                                View
                              </a>
                            ) : (
                              <span className="text-[11px] text-[#a3a3a3]">—</span>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </Container>
          </div>
        </TabsContent>


      </Tabs>
    </div>
  );
}

function formatPaymentMethod(p: DodoPayment): string {
  const method = p.paymentMethod ?? "";
  const type = p.paymentMethodType ?? "";
  const map: Record<string, string> = {
    card: "Card",
    bank_transfer: "Bank Transfer",
    upi: "UPI",
    wallet: "Wallet",
    crypto: "Crypto",
  };
  const label = map[method] ?? method;
  return type ? `${label} (${type})` : label;
}

function PaymentStatusBadge({ status }: { status: string }) {
  const config: Record<string, { bg: string; text: string; label: string }> = {
    succeeded: { bg: "bg-[#f0fdf4]", text: "text-[#15803d]", label: "Successful" },
    failed: { bg: "bg-[#fef2f2]", text: "text-[#dc2626]", label: "Failed" },
    processing: { bg: "bg-[#fff7ed]", text: "text-[#c2410c]", label: "Processing" },
    cancelled: { bg: "bg-[#f3f4f6]", text: "text-[#737373]", label: "Cancelled" },
    requires_customer_action: { bg: "bg-[#fff7ed]", text: "text-[#c2410c]", label: "Pending" },
    requires_payment_method: { bg: "bg-[#fff7ed]", text: "text-[#c2410c]", label: "Pending" },
  };
  const c = config[status] ?? { bg: "bg-[#f3f4f6]", text: "text-[#737373]", label: status.replace(/_/g, " ") };
  return (
    <span className={cn("inline-flex items-center px-2 py-0.5 rounded-[2.5px] text-[11px] font-medium leading-none", c.bg, c.text)}>
      {c.label}
    </span>
  );
}

// ─── Modals ────────────────────────────────────────────────────────────────

function EditContactForm({ customer, onConfirm, onCancel }: {
  customer: CustomerAccount;
  onConfirm: (patch: Partial<CustomerAccount>) => Promise<void>;
  onCancel: () => void;
}) {
  const [primaryName, setPrimaryName] = React.useState(customer.primaryName);
  const [primaryEmail, setPrimaryEmail] = React.useState(customer.primaryEmail);
  const [primaryPhone, setPrimaryPhone] = React.useState(customer.primaryPhone ?? "");
  const [subscriptionStartDate, setSubscriptionStartDate] = React.useState(
    customer.subscriptionStartDate ?? new Date().toISOString().split("T")[0]
  );
  const [billingName, setBillingName] = React.useState(customer.billingName ?? "");
  const [billingEmail, setBillingEmail] = React.useState(customer.billingEmail ?? "");
  const [billingPhone, setBillingPhone] = React.useState(customer.billingPhone ?? "");
  const [billingAddressLine, setBillingAddressLine] = React.useState(customer.billingAddressLine ?? "");
  const [billingCity, setBillingCity] = React.useState(customer.billingCity ?? "");
  const [billingState, setBillingState] = React.useState(customer.billingState ?? "");
  const [billingPincode, setBillingPincode] = React.useState(customer.billingPincode ?? "");
  const [saving, setSaving] = React.useState(false);

  const handleSave = async () => {
    setSaving(true);
    await onConfirm({
      primaryName,
      primaryEmail,
      primaryPhone: primaryPhone || undefined,
      subscriptionStartDate,
      billingName: billingName || undefined,
      billingEmail: billingEmail || undefined,
      billingPhone: billingPhone || undefined,
      billingAddressLine: billingAddressLine || undefined,
      billingCity: billingCity || undefined,
      billingState: billingState || undefined,
      billingPincode: billingPincode || undefined,
    });
    setSaving(false);
  };

  return (
    <div className="space-y-6">

      {/* Primary contact */}
      <section>
        <p className="text-[11px] font-semibold uppercase tracking-widest text-text-secondary mb-3">Primary Contact</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <FormField label="Name">
            <Input value={primaryName} onChange={setPrimaryName} placeholder="Rajesh Sharma" />
          </FormField>
          <FormField label="Email">
            <Input value={primaryEmail} onChange={setPrimaryEmail} type="email" placeholder="rajesh@acme.in" />
          </FormField>
          <FormField label="Phone">
            <Input value={primaryPhone} onChange={setPrimaryPhone} placeholder="+91 98765 43210" />
          </FormField>
        </div>
      </section>

      <hr className="border-border-divider" />

      {/* Billing contact */}
      <section>
        <p className="text-[11px] font-semibold uppercase tracking-widest text-text-secondary mb-3">Billing Contact</p>
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <FormField label="Name">
              <Input value={billingName} onChange={setBillingName} />
            </FormField>
            <FormField label="Email">
              <Input value={billingEmail} onChange={setBillingEmail} type="email" />
            </FormField>
            <FormField label="Phone">
              <Input value={billingPhone} onChange={setBillingPhone} />
            </FormField>
          </div>
          <FormField label="Address Line">
            <Textarea value={billingAddressLine} onChange={setBillingAddressLine} rows={2} placeholder="Street, Building, Landmark" />
          </FormField>
          <div className="grid grid-cols-3 gap-4">
            <FormField label="City">
              <Input value={billingCity} onChange={setBillingCity} placeholder="Bangalore" />
            </FormField>
            <FormField label="State">
              <Input value={billingState} onChange={setBillingState} placeholder="Karnataka" />
            </FormField>
            <FormField label="PIN Code">
              <Input value={billingPincode} onChange={setBillingPincode} placeholder="560001" />
            </FormField>
          </div>
        </div>
      </section>

      <hr className="border-border-divider" />

      {/* Plan dates */}
      <section>
        <p className="text-[11px] font-semibold uppercase tracking-widest text-text-secondary mb-3">Plan</p>
        <FormField label="Subscription Start Date">
          <DatePicker
            value={subscriptionStartDate}
            onChange={setSubscriptionStartDate}
            min={new Date().toISOString().split("T")[0]}
            placeholder="Pick start date"
          />
        </FormField>
      </section>

      <div className="flex items-center justify-end gap-2 pt-2 pb-4">
        <Button size="sm" variant="secondary" onClick={onCancel} disabled={saving}>Cancel</Button>
        <Button size="sm" onClick={handleSave} loading={saving}>Save</Button>
      </div>
    </div>
  );
}


