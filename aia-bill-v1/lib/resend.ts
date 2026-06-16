// ─── Resend Email Client ─────────────────────────────────────────────────────
// Sends transactional emails via Resend API. Falls back gracefully if
// RESEND_API_KEY is not set.

export function getResendClient() {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return null;
  return { apiKey };
}

export interface SendEmailInput {
  to: string;
  subject: string;
  html: string;
}

export async function sendEmail(input: SendEmailInput): Promise<{ sent: boolean; error?: string }> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return { sent: false, error: "RESEND_API_KEY not configured" };
  }

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: process.env.RESEND_FROM || "Korefi <billing@korefi.ai>",
        to: input.to,
        subject: input.subject,
        html: input.html,
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      return { sent: false, error: data.message || "Resend API error" };
    }
    return { sent: true };
  } catch (e: any) {
    return { sent: false, error: e.message };
  }
}

// ─── Email Templates ─────────────────────────────────────────────────────────

export function checkoutLinkEmail(opts: {
  leadName: string;
  planLabel: string;
  price: number;
  checkoutUrl: string;
}): string {
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; padding: 24px; background: #f8f9fb;">
  <div style="max-width: 520px; margin: 0 auto; background: white; border-radius: 16px; padding: 32px; border: 1px solid #e5e5e5;">
    <div style="text-align: center; margin-bottom: 24px;">
      <div style="display: inline-flex; align-items: center; gap: 8px; background: #f0f2ff; padding: 8px 16px; border-radius: 12px;">
        <span style="font-size: 20px;">🧾</span>
        <span style="font-weight: 600; color: #3146af;">Korefi</span>
      </div>
    </div>

    <h2 style="margin: 0 0 8px; font-size: 20px; color: #1a1a1a;">Your payment link is ready</h2>
    <p style="margin: 0 0 20px; font-size: 14px; color: #666;">
      Hi <strong>${opts.leadName}</strong>, complete your payment to activate your plan.
    </p>

    <div style="background: #f8f9fb; border-radius: 12px; padding: 16px; margin-bottom: 20px;">
      <table style="width: 100%; font-size: 14px;">
        <tr>
          <td style="color: #666; padding: 4px 0;">Plan</td>
          <td style="text-align: right; font-weight: 600; color: #1a1a1a;">${opts.planLabel}</td>
        </tr>
        <tr>
          <td style="color: #666; padding: 4px 0;">Amount</td>
          <td style="text-align: right; font-weight: 700; color: #3146af; font-size: 18px;">₹${opts.price.toLocaleString("en-IN")}</td>
        </tr>
      </table>
    </div>

    <a href="${opts.checkoutUrl}"
       style="display: block; text-align: center; background: #3146af; color: white; text-decoration: none;
              padding: 14px 24px; border-radius: 12px; font-weight: 600; font-size: 15px;">
      Sign Up &amp; Pay → 
    </a>

    <p style="margin-top: 16px; font-size: 12px; color: #999; text-align: center;">
      Click the button above to sign up, then complete your payment. This link expires in 1 hour.
    </p>
  </div>
</body>
</html>`;
}

export function welcomeEmail(opts: {
  leadName: string;
  planLabel: string;
  price: number;
  dashboardUrl: string;
}): string {
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; padding: 24px; background: #f8f9fb;">
  <div style="max-width: 520px; margin: 0 auto; background: white; border-radius: 16px; padding: 32px; border: 1px solid #e5e5e5;">
    <div style="text-align: center; margin-bottom: 24px;">
      <div style="display: inline-flex; align-items: center; gap: 8px; background: #e8f5e9; padding: 8px 16px; border-radius: 12px;">
        <span style="font-size: 20px;">✅</span>
        <span style="font-weight: 600; color: #16a34a;">Payment Confirmed</span>
      </div>
    </div>

    <h2 style="margin: 0 0 8px; font-size: 20px; color: #1a1a1a;">Welcome to Korefi!</h2>
    <p style="margin: 0 0 20px; font-size: 14px; color: #666;">
      Hi <strong>${opts.leadName}</strong>, your <strong>${opts.planLabel}</strong> plan is now active.
    </p>

    <div style="background: #f8f9fb; border-radius: 12px; padding: 16px; margin-bottom: 20px;">
      <table style="width: 100%; font-size: 14px;">
        <tr>
          <td style="color: #666; padding: 4px 0;">Plan</td>
          <td style="text-align: right; font-weight: 600; color: #1a1a1a;">${opts.planLabel}</td>
        </tr>
        <tr>
          <td style="color: #666; padding: 4px 0;">Amount paid</td>
          <td style="text-align: right; font-weight: 700; color: #16a34a;">₹${opts.price.toLocaleString("en-IN")}</td>
        </tr>
      </table>
    </div>

    <a href="${opts.dashboardUrl}"
       style="display: block; text-align: center; background: #3146af; color: white; text-decoration: none;
              padding: 14px 24px; border-radius: 12px; font-weight: 600; font-size: 15px;">
      Go to Dashboard →
    </a>
  </div>
</body>
</html>`;
}
