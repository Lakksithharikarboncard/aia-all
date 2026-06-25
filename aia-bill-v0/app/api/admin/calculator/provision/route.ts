import { NextRequest, NextResponse } from "next/server";
import { calculatePrice, planCode, PRICING, type Plan, type Cycle } from "@/lib/pricing";
import { createCustomer, createSubscription, createInvoiceHostedPage } from "@/lib/zoho";
import { sendEmail, checkoutLinkEmail } from "@/lib/resend";

// ─── Mock mode: returns fake data so the UI can be tested end-to-end ─────────
// When client_credentials, refresh_token, or access_token is available, we go live.
function isZohoConfigured(): boolean {
  return !!(process.env.ZOHO_CLIENT_ID && process.env.ZOHO_CLIENT_SECRET);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      plan,
      cycle,
      billsPerMonth,
      banks,
      leadName,
      leadEmail,
      leadPhone,
      orgName,
      freeTrialEnabled,
      trialDays,
    } = body;

    // ── Validate inputs ──────────────────────────────────────────────────
    if (!plan || !cycle || billsPerMonth == null || banks == null || !leadName || !leadEmail) {
      return NextResponse.json(
        { error: "Missing required fields: plan, cycle, billsPerMonth, banks, leadName, leadEmail" },
        { status: 400 },
      );
    }

    if (!["base", "premium"].includes(plan)) {
      return NextResponse.json({ error: "plan must be 'base' or 'premium'" }, { status: 400 });
    }
    if (!["quarterly", "annual"].includes(cycle)) {
      return NextResponse.json({ error: "cycle must be 'quarterly' or 'annual'" }, { status: 400 });
    }

    const pPlan = plan as Plan;
    const pCycle = cycle as Cycle;
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3020";
    const redirectUrl = `${baseUrl}/create-organization`;
    const planLabel = PRICING[pPlan][pCycle].label;

    // Helper to build signup URL (lead sees this first, then redirected to checkout)
    const buildSignupUrl = (checkoutUrl: string) =>
      `${baseUrl}/sign-up?checkout_url=${encodeURIComponent(checkoutUrl)}&plan=${encodeURIComponent(planLabel)}&price=${breakdown.finalPrice}&name=${encodeURIComponent(leadName)}&email=${encodeURIComponent(leadEmail)}`;

    // Helper to build mailto URL for BD to send via their email client
    const buildMailtoUrl = (signupUrl: string) => {
      const subject = encodeURIComponent(`Your Korefi plan — ${planLabel}`);
      const trialLine = parsedTrialDays > 0
        ? `\n\nYou have a ${parsedTrialDays}-day free trial — no payment required to get started.`
        : "";
      const body = encodeURIComponent(
        `Hi ${leadName},\n\nYour Korefi plan (${planLabel} — ₹${breakdown.finalPrice.toLocaleString("en-IN")}) is ready.${trialLine}\n\nSign up here: ${signupUrl}\n\nBest regards,\nKorefi Team`,
      );
      return `mailto:${encodeURIComponent(leadEmail)}?subject=${subject}&body=${body}`;
    };

    // ── Parse trial inputs ──────────────────────────────────────────────
    const parsedTrialDays = freeTrialEnabled ? Math.max(0, Math.floor(Number(trialDays) || 0)) : 0;

    // ── Calculate price ──────────────────────────────────────────────────
    const breakdown = calculatePrice(pPlan, pCycle, Number(billsPerMonth), Number(banks));

    // ── Zoho mode or Mock mode? ──────────────────────────────────────────
    if (!isZohoConfigured()) {
      // ── MOCK MODE ──────────────────────────────────────────────────────
      const mockHostedPageId = `mock_hp_${crypto.randomUUID().slice(0, 12)}`;
      const mockCustomerId = `mock_cust_${crypto.randomUUID().slice(0, 8)}`;
      const mockSubscriptionId = `mock_sub_${crypto.randomUUID().slice(0, 10)}`;
      const mockInvoiceId = `mock_inv_${crypto.randomUUID().slice(0, 10)}`;
      const mockCheckoutUrl = `${baseUrl}/checkout/success?hostedpage_id=${mockHostedPageId}&plan=${encodeURIComponent(planLabel)}`;
      const signupUrl = buildSignupUrl(mockCheckoutUrl);

      // Send email (Resend will work here if configured)
      const emailResult = await sendEmail({
        to: leadEmail,
        subject: `[MOCK] Sign up for your Korefi plan — ${planLabel}`,
        html: checkoutLinkEmail({
          leadName,
          planLabel,
          price: breakdown.finalPrice,
          checkoutUrl: signupUrl,
        }),
      });

      const waText = encodeURIComponent(
        `Hi ${leadName}, your Korefi plan (${planLabel} — ₹${breakdown.finalPrice.toLocaleString("en-IN")}) is ready. Sign up here: ${signupUrl}`,
      );
      const waNumber = leadPhone ? leadPhone.replace(/\D/g, "") : "";
      const waLink = waNumber ? `https://wa.me/${waNumber}?text=${waText}` : null;

      return NextResponse.json({
        success: true,
        mode: "mock",
        checkoutUrl: mockCheckoutUrl,
        signupUrl,
        hostedPageId: mockHostedPageId,
        expiresAt: new Date(Date.now() + 3600_000).toISOString(),
        customerId: mockCustomerId,
        subscriptionId: mockSubscriptionId,
        invoiceId: mockInvoiceId,
        price: breakdown.finalPrice,
        planLabel,
        emailSent: emailResult.sent,
        emailError: emailResult.error || null,
        waLink,
        mailtoUrl: buildMailtoUrl(signupUrl),
        trialDays: parsedTrialDays,
        breakdown: {
          infraTotal: breakdown.infraTotal,
          billsTotal: breakdown.billsTotal,
          banksTotal: breakdown.banksTotal,
          subtotal: breakdown.subtotal,
          finalPrice: breakdown.finalPrice,
          months: breakdown.months,
        },
        notice: "MOCK MODE — no Zoho API calls made.",
      });
    }

    // ── LIVE ZOHO MODE ───────────────────────────────────────────────────
    // Flow: Create customer → Create subscription (plan assigned, auto_collect=false)
    //       → Create invoice payment hosted page
    let customer;
    try {
      customer = await createCustomer({
        displayName: orgName || leadName,
        email: leadEmail,
        companyName: orgName,
        phone: leadPhone,
      });
    } catch (e: any) {
      return NextResponse.json(
        { error: `Failed to create Zoho customer: ${e.message}` },
        { status: 502 },
      );
    }

    let subscriptionRes;
    try {
      subscriptionRes = await createSubscription({
        customerId: customer.customer_id,
        planCode: planCode(pPlan, pCycle),
        price: breakdown.finalPrice,
        ...(parsedTrialDays > 0 ? { trialDays: parsedTrialDays } : {}),
      });
    } catch (e: any) {
      return NextResponse.json(
        { error: `Failed to create Zoho subscription: ${e.message}` },
        { status: 502 },
      );
    }

    const zohoSubscription = subscriptionRes.subscription;
    const invoiceId = zohoSubscription.child_invoice_id;

    if (!invoiceId) {
      return NextResponse.json(
        { error: `Zoho subscription created but no invoice generated. Sub ID: ${zohoSubscription?.subscription_id || 'unknown'}. Try enabling invoice generation in Zoho settings.` },
        { status: 502 },
      );
    }

    let hostedPage;
    try {
      hostedPage = await createInvoiceHostedPage({
        invoiceId,
        redirectUrl,
      });
    } catch (e: any) {
      return NextResponse.json(
        { error: `Failed to create Zoho hosted page: ${e.message}` },
        { status: 502 },
      );
    }

    const signupUrl = buildSignupUrl(hostedPage.url);

    const emailResult = await sendEmail({
      to: leadEmail,
      subject: `Sign up for your Korefi plan — ${planLabel}`,
      html: checkoutLinkEmail({
        leadName,
        planLabel,
        price: breakdown.finalPrice,
        checkoutUrl: signupUrl,
      }),
    });

    const waText = encodeURIComponent(
      `Hi ${leadName}, your Korefi plan (${planLabel} — ₹${breakdown.finalPrice.toLocaleString("en-IN")}) is ready. Sign up here: ${signupUrl}`,
    );
    const waNumber = leadPhone ? leadPhone.replace(/\D/g, "") : "";
    const waLink = waNumber ? `https://wa.me/${waNumber}?text=${waText}` : null;

    return NextResponse.json({
      success: true,
      mode: "live",
      checkoutUrl: hostedPage.url,
      signupUrl,
      hostedPageId: hostedPage.hostedpage_id,
      expiresAt: hostedPage.expiring_time,
      customerId: customer.customer_id,
      subscriptionId: zohoSubscription.subscription_id,
      invoiceId,
      price: breakdown.finalPrice,
      planLabel,
      emailSent: emailResult.sent,
      emailError: emailResult.error || null,
      waLink,
      mailtoUrl: buildMailtoUrl(signupUrl),
      trialDays: parsedTrialDays,
      breakdown: {
        infraTotal: breakdown.infraTotal,
        billsTotal: breakdown.billsTotal,
        banksTotal: breakdown.banksTotal,
        subtotal: breakdown.subtotal,
        finalPrice: breakdown.finalPrice,
        months: breakdown.months,
      },
    });
  } catch (e: any) {
    return NextResponse.json(
      { error: `Server error: ${e.message}` },
      { status: 500 },
    );
  }
}
