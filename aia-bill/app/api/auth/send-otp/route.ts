import { NextResponse } from "next/server";
import { generateOTP, createOTPToken, SESSION_COOKIE } from "@/lib/auth/session";

const ALLOWED_DOMAIN = "karboncard.com";
const OTP_COOKIE = "korefi_otp";

export async function POST(request: Request) {
  const { email } = await request.json();
  if (!email || typeof email !== "string") {
    return NextResponse.json({ error: "Email required" }, { status: 400 });
  }
  const normalized = email.trim().toLowerCase();
  if (!normalized.endsWith(`@${ALLOWED_DOMAIN}`)) {
    return NextResponse.json({ error: `Only @${ALLOWED_DOMAIN} accounts are allowed` }, { status: 403 });
  }

  const otp = generateOTP(normalized);
  const token = createOTPToken(normalized, otp);

  const res = NextResponse.json({ ok: true, otp, email: normalized });
  // Store signed OTP token in a short-lived httpOnly cookie — no file writes needed
  res.cookies.set(OTP_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 10, // 10 minutes
  });
  return res;
}
