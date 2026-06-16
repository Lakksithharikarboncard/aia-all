"use client";

import * as React from "react";
import { useSearchParams } from "next/navigation";
import { AlertTriangle, RotateCcw } from "lucide-react";
import { navUrl } from "@/lib/api-base";

function FailedContent() {
  const params = useSearchParams();
  const hostedpage_id = params.get("hostedpage_id") || "";

  const reasons = [
    "Insufficient funds in the account",
    "Card details do not match bank records",
    "Bank declined the transaction",
    "Network timeout during processing",
  ];

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f8f9fb] p-4">
      <div className="w-full max-w-lg">
        <div className="rounded-2xl border border-border bg-white p-8 text-center">
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-amber-50">
            <AlertTriangle className="h-8 w-8 text-amber-500" />
          </div>

          <h1 className="text-2xl font-bold text-foreground">Payment could not be processed</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Don&apos;t worry — your plan selection has been saved and you can retry anytime.
          </p>

          <div className="mt-6 rounded-xl border border-border p-4 text-left">
            <p className="mb-3 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Common reasons
            </p>
            <ul className="space-y-2">
              {reasons.map((r, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#ccc]" />
                  {r}
                </li>
              ))}
            </ul>
          </div>

          <div className="mt-6">
            {hostedpage_id ? (
              <a
                href={`https://billing.zoho.com/hostedpage/redirect/${hostedpage_id}`}
                className="inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-white hover:bg-primary/90 transition-colors"
              >
                <RotateCcw className="h-4 w-4" />
                Retry Payment
              </a>
            ) : (
              <a
                href={navUrl("/admin/calculator")}
                className="inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-white hover:bg-primary/90 transition-colors"
              >
                Back to Calculator
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function CheckoutFailedPage() {
  return (
    <React.Suspense fallback={null}>
      <FailedContent />
    </React.Suspense>
  );
}
