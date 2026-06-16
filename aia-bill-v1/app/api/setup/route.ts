import { NextRequest, NextResponse } from "next/server";
import { testConnection } from "@/lib/zoho";

// ─── GET: Test Zoho connection status ────────────────────────────────────────
export async function GET() {
  const checks: Record<string, { status: string; value: string; hint?: string }> = {};

  // Check env vars
  checks["ZOHO_CLIENT_ID"] = process.env.ZOHO_CLIENT_ID
    ? { status: "✅", value: `${process.env.ZOHO_CLIENT_ID.slice(0, 12)}...` }
    : { status: "❌", value: "Missing", hint: "Set in .env.local" };

  checks["ZOHO_CLIENT_SECRET"] = process.env.ZOHO_CLIENT_SECRET
    ? { status: "✅", value: `${process.env.ZOHO_CLIENT_SECRET.slice(0, 8)}...` }
    : { status: "❌", value: "Missing", hint: "Set in .env.local" };

  checks["ZOHO_ORG_ID"] = process.env.ZOHO_ORG_ID
    ? { status: "✅", value: process.env.ZOHO_ORG_ID }
    : { status: "❌", value: "Missing", hint: "Set in .env.local" };

  const hasClientCreds = !!(process.env.ZOHO_CLIENT_ID && process.env.ZOHO_CLIENT_SECRET);
  const hasRefreshToken = !!process.env.ZOHO_REFRESH_TOKEN;
  const hasAccessToken = !!process.env.ZOHO_ACCESS_TOKEN;

  if (hasClientCreds) {
    checks["ZOHO_AUTH_METHOD"] = { status: "✅", value: "client_credentials (auto)" };
  } else if (hasRefreshToken) {
    checks["ZOHO_AUTH_METHOD"] = { status: "✅", value: "refresh_token" };
  } else if (hasAccessToken) {
    checks["ZOHO_AUTH_METHOD"] = { status: "⚠️", value: "pre-set access_token (expires 1hr)" };
  } else {
    checks["ZOHO_AUTH_METHOD"] = { status: "❌", value: "None", hint: "Check ZOHO_CLIENT_ID and ZOHO_CLIENT_SECRET" };
  }

  checks["RESEND_API_KEY"] = process.env.RESEND_API_KEY
    ? { status: "✅", value: "Configured" }
    : { status: "⚠️", value: "Optional", hint: "Email will not be sent without it" };

  // Test Zoho connection if possible
  let connectionTest = { ok: false, message: "Skipped - no Zoho credentials" };
  if (hasClientCreds || hasRefreshToken || hasAccessToken) {
    connectionTest = await testConnection();
  }

  return NextResponse.json({
    success: true,
    environment: checks,
    connection: connectionTest,
    appUrl: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3020",
  });
}

// ─── POST: Exchange a grant token for access + refresh tokens ────────────────
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { grantToken } = body;

    if (!grantToken) {
      return NextResponse.json(
        { success: false, error: "grantToken is required" },
        { status: 400 },
      );
    }

    const res = await fetch("https://accounts.zoho.in/oauth/v2/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        client_id: process.env.ZOHO_CLIENT_ID!,
        client_secret: process.env.ZOHO_CLIENT_SECRET!,
        code: grantToken,
        redirect_uri: "https://api-console.zoho.in/",
      }),
    });

    const data = await res.json();
    if (data.error) {
      return NextResponse.json(
        { success: false, error: `Zoho error: ${data.error}`, details: data },
        { status: 400 },
      );
    }

    return NextResponse.json({
      success: true,
      access_token: data.access_token?.slice(0, 20) + "...",
      refresh_token: data.refresh_token,
      expires_in: data.expires_in,
      hint: "Add this to .env.local: ZOHO_REFRESH_TOKEN=" + (data.refresh_token || "<not provided>"),
    });
  } catch (e: any) {
    return NextResponse.json(
      { success: false, error: e.message },
      { status: 500 },
    );
  }
}
