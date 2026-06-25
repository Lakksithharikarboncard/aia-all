// ─── Zoho Billing API Client ─────────────────────────────────────────────────
// Supports: OAuth client_credentials, refresh_token, or pre-set access_token.
// Data center: India (zohoapis.in)

const AUTH_URL = "https://accounts.zoho.in/oauth/v2/token";
const API_BASE = "https://www.zohoapis.in/billing/v1";

let cachedToken: { access_token: string; expires_at: number } | null = null;

interface ZohoTokenResponse {
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
  error?: string;
}

interface ZohoCustomer {
  customer_id: string;
  display_name: string;
  email: string;
  company_name?: string;
  phone?: string;
  mobile?: string;
  status: string;
}

interface ZohoHostedPage {
  hostedpage_id: string;
  status: string;
  url: string;
  action: string;
  expiring_time: string;
  created_time: string;
}

interface ZohoSubscription {
  subscription_id: string;
  name: string;
  status: string;
  amount: number;
  plan: { plan_code: string; name: string; price: number };
  current_term_ends_at: string;
  child_invoice_id?: string;
  customer: { customer_id: string; display_name: string; email: string };
}

// ─── Token Management ────────────────────────────────────────────────────────

async function getAccessToken(): Promise<string> {
  // 1. Use cached token if still valid (5 min buffer)
  if (cachedToken && Date.now() < cachedToken.expires_at - 300_000) {
    return cachedToken.access_token;
  }

  const clientId = process.env.ZOHO_CLIENT_ID!;
  const clientSecret = process.env.ZOHO_CLIENT_SECRET!;

  // 2. Try client_credentials grant first (fastest, no refresh token needed)
  {
    const res = await fetch(AUTH_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: "client_credentials",
        scope: "ZohoSubscriptions.fullaccess.all",
      }),
    });
    const data: ZohoTokenResponse = await res.json();
    if (data.access_token) {
      cachedToken = {
        access_token: data.access_token,
        expires_at: Date.now() + (data.expires_in ?? 3600) * 1000,
      };
      return data.access_token;
    }
  }

  // 3. Fallback: refresh_token grant
  const refreshToken = process.env.ZOHO_REFRESH_TOKEN;
  if (refreshToken) {
    const res = await fetch(AUTH_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        refresh_token: refreshToken,
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: "refresh_token",
      }),
    });
    const data: ZohoTokenResponse = await res.json();
    if (data.access_token) {
      cachedToken = {
        access_token: data.access_token,
        expires_at: Date.now() + (data.expires_in ?? 3600) * 1000,
      };
      return data.access_token;
    }
  }

  // 4. Last resort: pre-set access token from env
  const presetToken = process.env.ZOHO_ACCESS_TOKEN;
  if (presetToken) {
    return presetToken;
  }

  throw new Error(
    "Zoho OAuth failed. Ensure ZOHO_CLIENT_ID and ZOHO_CLIENT_SECRET are correct, " +
    "or set ZOHO_REFRESH_TOKEN / ZOHO_ACCESS_TOKEN as fallback.",
  );
}

// ─── API Helpers ─────────────────────────────────────────────────────────────

async function zohoFetch(
  method: string,
  path: string,
  body?: Record<string, unknown>,
): Promise<any> {
  const token = await getAccessToken();
  const orgId = process.env.ZOHO_ORG_ID!;

  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers: {
      Authorization: `Zoho-oauthtoken ${token}`,
      "X-com-zoho-subscriptions-organizationid": orgId,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = await res.json();
  if (data.code !== 0) {
    throw new Error(`Zoho API error (${res.status}): ${data.message || JSON.stringify(data)}`);
  }
  return data;
}

export interface CreateSubscriptionInput {
  customerId: string;
  planCode: string;
  price: number;
  quantity?: number;
  trialDays?: number;
}

export interface CreateInvoiceHostedPageInput {
  invoiceId: string;
  redirectUrl: string;
}

// ─── Public API ──────────────────────────────────────────────────────────────

export interface CreateCustomerInput {
  displayName: string;
  email: string;
  companyName?: string;
  phone?: string;
}

export async function createCustomer(input: CreateCustomerInput): Promise<ZohoCustomer> {
  const body: Record<string, unknown> = {
    display_name: input.displayName,
    email: input.email,
  };
  if (input.companyName) body.company_name = input.companyName;
  if (input.phone) body.mobile = input.phone;

  const data = await zohoFetch("POST", "/customers", body);
  return data.customer;
}

export interface CreateHostedPageInput {
  customerId: string;
  planCode: string;
  price: number;
  redirectUrl: string;
}

export async function createHostedPage(input: CreateHostedPageInput): Promise<ZohoHostedPage> {
  const body = {
    customer_id: input.customerId,
    plan: {
      plan_code: input.planCode,
      price: input.price,
      exclude_trial: true,
      trial_days: 0,
    },
    redirect_url: input.redirectUrl,
  };

  const data = await zohoFetch("POST", "/hostedpages/newsubscription", body);
  return data.hostedpage;
}

export async function createSubscription(input: CreateSubscriptionInput): Promise<{
  subscription: ZohoSubscription;
}> {
  const hasTrial = input.trialDays && input.trialDays > 0;
  const body: Record<string, unknown> = {
    customer_id: input.customerId,
    plan: {
      plan_code: input.planCode,
      price: input.price,
      quantity: input.quantity ?? 1,
      ...(hasTrial ? { trial_days: input.trialDays } : {}),
    },
    auto_collect: false,
    exclude_trial: !hasTrial,
  };

  const data = await zohoFetch("POST", "/subscriptions", body);
  return data;
}

export async function createInvoiceHostedPage(input: CreateInvoiceHostedPageInput): Promise<ZohoHostedPage> {
  const body = {
    invoice_id: input.invoiceId,
    redirect_url: input.redirectUrl,
  };

  const data = await zohoFetch("POST", "/hostedpages/invoicepayment", body);
  return data.hostedpage;
}

export async function getHostedPage(hostedPageId: string): Promise<{
  hostedpage_id: string;
  status: string;
  data?: { subscription: ZohoSubscription };
}> {
  const data = await zohoFetch("GET", `/hostedpages/${hostedPageId}`);
  return {
    hostedpage_id: data.hostedpage_id,
    status: data.status,
    data: data.data,
  };
}

export async function testConnection(): Promise<{ ok: boolean; message: string }> {
  try {
    await zohoFetch("GET", "/customers?page=1&per_page=1");
    return { ok: true, message: "Zoho API connection successful" };
  } catch (e: any) {
    return { ok: false, message: e.message };
  }
}
