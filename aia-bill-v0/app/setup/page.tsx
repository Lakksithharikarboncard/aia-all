"use client";

import * as React from "react";
import { apiUrl, navUrl } from "@/lib/api-base";
import { Button } from "@/components/ui/Button";
import { Loader2, CheckCircle2, AlertTriangle, Copy, ExternalLink } from "lucide-react";

export default function SetupPage() {
  const [status, setStatus] = React.useState<any>(null);
  const [loading, setLoading] = React.useState(true);
  const [grantToken, setGrantToken] = React.useState("");
  const [exchanging, setExchanging] = React.useState(false);
  const [exchangeResult, setExchangeResult] = React.useState<any>(null);

  React.useEffect(() => {
    fetch(apiUrl("/api/setup"))
      .then((r) => r.json())
      .then(setStatus)
      .catch(() => setStatus({ error: "Failed to load" }))
      .finally(() => setLoading(false));
  }, []);

  const handleExchange = async () => {
    if (!grantToken.trim()) return;
    setExchanging(true);
    setExchangeResult(null);
    try {
      const res = await fetch(apiUrl("/api/setup"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ grantToken: grantToken.trim() }),
      });
      const data = await res.json();
      setExchangeResult(data);
    } catch (e: any) {
      setExchangeResult({ success: false, error: e.message });
    } finally {
      setExchanging(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f8f9fb]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const envVars = status?.environment || {};

  return (
    <div className="min-h-screen bg-[#f8f9fb] p-6">
      <div className="max-w-2xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Zoho Billing Setup</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Configure your Zoho API connection
          </p>
        </div>

        {/* Environment check */}
        <div className="rounded-xl border border-border bg-white p-6">
          <h2 className="text-sm font-semibold text-foreground mb-4">Environment Variables</h2>
          <div className="space-y-2">
            {Object.entries(envVars).map(([key, val]: [string, any]) => (
              <div key={key} className="flex items-center justify-between text-sm">
                <code className="text-xs font-mono bg-muted px-2 py-0.5 rounded">{key}</code>
                <div className="flex items-center gap-2">
                  <span className="text-xs">{val.status}</span>
                  <span className="text-xs text-muted-foreground">{val.value}</span>
                  {val.hint && (
                    <span className="text-[10px] text-amber-600 max-w-xs text-right">{val.hint}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Connection status */}
        {status?.connection && (
          <div className={`rounded-xl border p-4 ${
            status.connection.ok ? "border-success/30 bg-success/5" : "border-amber-200 bg-amber-50"
          }`}>
            <div className="flex items-center gap-2">
              {status.connection.ok ? (
                <CheckCircle2 className="h-5 w-5 text-success" />
              ) : (
                <AlertTriangle className="h-5 w-5 text-amber-500" />
              )}
              <span className="text-sm font-medium">
                Connection: {status.connection.ok ? "OK" : "Not configured"}
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">{status.connection.message}</p>
          </div>
        )}

        {/* Instructions */}
        {status?.instructions && (
          <div className="rounded-xl border border-border bg-white p-6">
            <h2 className="text-sm font-semibold text-foreground mb-3">Setup Instructions</h2>
            <pre className="text-xs font-mono whitespace-pre-wrap bg-muted p-4 rounded-lg text-muted-foreground">
              {status.instructions}
            </pre>
          </div>
        )}

        {/* Grant token exchange */}
        <div className="rounded-xl border border-border bg-white p-6">
          <h2 className="text-sm font-semibold text-foreground mb-3">Exchange Grant Token</h2>
          <p className="text-xs text-muted-foreground mb-3">
            Paste the grant token from Zoho API Console (Self Client) to get your refresh token.
          </p>
          <div className="flex gap-2">
            <input
              type="text"
              value={grantToken}
              onChange={(e) => setGrantToken(e.target.value)}
              placeholder="1000.xxxxx..."
              className="flex-1 rounded-lg border border-border px-3 py-2 text-sm font-mono outline-none focus:ring-2 focus:ring-ring"
            />
            <Button onClick={handleExchange} loading={exchanging} disabled={!grantToken.trim()}>
              Exchange
            </Button>
          </div>
          {exchangeResult && (
            <div className={`mt-3 rounded-lg p-3 text-xs font-mono ${
              exchangeResult.success ? "bg-success/5 border border-success/20" : "bg-danger/5 border border-danger/20"
            }`}>
              {exchangeResult.success ? (
                <>
                  <p className="text-success font-semibold mb-1">✓ Success!</p>
                  <p>Access token: {exchangeResult.access_token}</p>
                  <p className="mt-1">Refresh token: <strong>{exchangeResult.refresh_token}</strong></p>
                  <p className="mt-2 text-amber-600">
                    Add this to .env.local: ZOHO_REFRESH_TOKEN={exchangeResult.refresh_token}
                  </p>
                </>
              ) : (
                <p className="text-danger">{exchangeResult.error}</p>
              )}
            </div>
          )}
        </div>

        <div className="text-center pb-8">
          <a
            href={navUrl("/admin/calculator")}
            className="text-sm text-primary hover:underline"
          >
            Back to Calculator →
          </a>
        </div>
      </div>
    </div>
  );
}
