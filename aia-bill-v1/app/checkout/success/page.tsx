"use client";

import * as React from "react";
import { useSearchParams } from "next/navigation";
import { CheckCircle2, ArrowRight, Package } from "lucide-react";
import { navUrl } from "@/lib/api-base";

function SuccessContent() {
  const params = useSearchParams();
  const hostedpage_id = params.get("hostedpage_id") || "";
  const planLabel = params.get("plan") || "your plan";

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f8f9fb] p-4">
      <div className="w-full max-w-lg">
        <div className="rounded-2xl border border-border bg-white p-8 text-center">
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-[#e8f5e9]">
            <CheckCircle2 className="h-8 w-8 text-success" />
          </div>

          <h1 className="text-2xl font-bold text-foreground">Payment confirmed!</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Your <strong>{planLabel}</strong> is now active
          </p>

          <div className="mt-6 rounded-xl bg-[#f8f9fb] p-4">
            <div className="flex items-center gap-2 mb-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                <Package className="h-4 w-4 text-primary" />
              </div>
              <span className="text-sm font-semibold text-foreground">{planLabel}</span>
            </div>
            <p className="text-xs text-muted-foreground">
              Set up your organization to start using Korefi.
            </p>
          </div>

          <div className="mt-6">
            <a
              href={navUrl(`/create-organization?hostedpage_id=${hostedpage_id}`)}
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-white hover:bg-primary/90 transition-colors"
            >
              Set up organization
              <ArrowRight className="h-4 w-4" />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function CheckoutSuccessPage() {
  return (
    <React.Suspense fallback={null}>
      <SuccessContent />
    </React.Suspense>
  );
}
