import { NextResponse } from "next/server";
import { generateOTP } from "@/lib/auth/session";

const ALLOWED_DOMAIN = "karboncard.com";

export async function POST(request: Request) {
  const { email } = await request.json();

  if (!email || typeof email !== "string") {
    return NextResponse.json({ error: "Email required" }, { status: 400 });
  }

  const normalized = email.trim().toLowerCase();

  if (!normalized.endsWith(`@${ALLOWED_DOMAIN}`)) {
    return NextResponse.json(
      { error: `Only @${ALLOWED_DOMAIN} accounts are allowed` },
      { status: 403 }
    );
  }

  const otp = generateOTP(normalized);

  // In production: send otp via email (Resend / SendGrid)
  // For now: return it in the response (dev prototype)
  console.log(`[AUTH] OTP for ${normalized}: ${otp}`);

  return NextResponse.json({ ok: true, otp, email: normalized });
}
