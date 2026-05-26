import "server-only";
import DodoPayments from "dodopayments";

let _client: DodoPayments | null = null;

export function getDodo(): DodoPayments | null {
  if (_client) return _client;
  const key = process.env.DODO_PAYMENTS_API_KEY;
  if (!key) return null;
  const env = (process.env.DODO_PAYMENTS_ENVIRONMENT ?? "test_mode") as "test_mode" | "live_mode";
  _client = new DodoPayments({ bearerToken: key, environment: env });
  return _client;
}
