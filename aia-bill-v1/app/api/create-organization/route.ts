import { NextRequest, NextResponse } from "next/server";
import { getHostedPage } from "@/lib/zoho";

// In-memory store for organizations created post-payment
const organizations: Map<string, {
  id: string;
  name: string;
  gstin?: string;
  zohoCustomerId: string;
  zohoSubscriptionId: string;
  hostedPageId: string;
  createdAt: string;
}> = new Map();

function isZohoConfigured(): boolean {
  return !!(process.env.ZOHO_CLIENT_ID && process.env.ZOHO_CLIENT_SECRET);
}

// ─── GET: Fetch hosted page details to verify payment ────────────────────────
export async function GET(request: NextRequest) {
  const hostedPageId = request.nextUrl.searchParams.get("hostedpage_id");

  if (!hostedPageId) {
    return NextResponse.json(
      { success: false, error: "hostedpage_id is required" },
      { status: 400 },
    );
  }

  // Mock mode: return fake subscription data for mock IDs
  if (hostedPageId.startsWith("mock_hp_")) {
    return NextResponse.json({
      success: true,
      status: "success",
      subscription: {
        subscriptionId: `mock_sub_${hostedPageId.slice(8, 16)}`,
        planName: "Base — Quarterly",
        amount: 1780,
        status: "active",
        customerEmail: "lead@example.com",
        customerName: "Test Lead",
        termEndsAt: new Date(Date.now() + 90 * 86400000).toISOString(),
      },
    });
  }

  // Live mode
  if (!isZohoConfigured()) {
    return NextResponse.json(
      { success: false, error: "Zoho not configured. Set ZOHO_REFRESH_TOKEN or ZOHO_ACCESS_TOKEN." },
      { status: 502 },
    );
  }

  try {
    const page = await getHostedPage(hostedPageId);

    if (page.status !== "success") {
      return NextResponse.json({
        success: true,
        status: page.status,
        subscription: null,
        message: "Payment is pending. Please complete the payment on the checkout page.",
      });
    }

    const sub = page.data?.subscription;
    if (!sub) {
      return NextResponse.json({
        success: true,
        status: page.status,
        subscription: null,
        message: "Payment confirmed but subscription details are not yet available.",
      });
    }

    return NextResponse.json({
      success: true,
      status: page.status,
      subscription: {
        subscriptionId: sub.subscription_id,
        planName: sub.plan?.name || sub.plan?.plan_code || "Unknown",
        amount: sub.amount,
        status: sub.status,
        customerEmail: sub.customer?.email || "",
        customerName: sub.customer?.display_name || "",
        termEndsAt: sub.current_term_ends_at,
      },
    });
  } catch (e: any) {
    return NextResponse.json(
      { success: false, error: `Failed to fetch payment details: ${e.message}` },
      { status: 502 },
    );
  }
}

// ─── POST: Create organization after payment ─────────────────────────────────
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { hostedpage_id, organizationName, gstin } = body;

    if (!hostedpage_id || !organizationName) {
      return NextResponse.json(
        { success: false, error: "hostedpage_id and organizationName are required" },
        { status: 400 },
      );
    }

    let zohoCustomerId = "";
    let zohoSubscriptionId = "";

    if (hostedpage_id.startsWith("mock_hp_")) {
      // Mock mode
      zohoCustomerId = `mock_cust_${hostedpage_id.slice(8, 16)}`;
      zohoSubscriptionId = `mock_sub_${hostedpage_id.slice(8, 16)}`;
    } else {
      // Live mode — verify with Zoho
      if (!isZohoConfigured()) {
        return NextResponse.json(
          { success: false, error: "Zoho not configured." },
          { status: 502 },
        );
      }

      const page = await getHostedPage(hostedpage_id);
      if (page.status !== "success" || !page.data?.subscription) {
        return NextResponse.json(
          { success: false, error: "Payment not completed or subscription not found" },
          { status: 400 },
        );
      }

      zohoCustomerId = page.data.subscription.customer?.customer_id || "";
      zohoSubscriptionId = page.data.subscription.subscription_id;
    }

    // Check if already created
    const existing = Array.from(organizations.values()).find(
      (o) => o.hostedPageId === hostedpage_id,
    );
    if (existing) {
      return NextResponse.json({
        success: true,
        organization: existing,
        message: "Organization already exists",
      });
    }

    // Create organization record
    const org = {
      id: `org-${crypto.randomUUID().slice(0, 8)}`,
      name: organizationName,
      gstin: gstin || undefined,
      zohoCustomerId,
      zohoSubscriptionId,
      hostedPageId: hostedpage_id,
      createdAt: new Date().toISOString(),
    };

    organizations.set(org.id, org);

    return NextResponse.json({
      success: true,
      organization: org,
    });
  } catch (e: any) {
    return NextResponse.json(
      { success: false, error: `Failed to create organization: ${e.message}` },
      { status: 500 },
    );
  }
}
