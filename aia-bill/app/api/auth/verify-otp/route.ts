import { NextResponse } from "next/server";
import { verifyOTP, createSession, SESSION_COOKIE } from "@/lib/auth/session";

export async function POST(request: Request) {
  const { email, otp } = await request.json();

  if (!email || !otp) {
    return NextResponse.json({ error: "Email and OTP required" }, { status: 400 });
  }

  const valid = verifyOTP(email.trim().toLowerCase(), otp.trim());

  if (!valid) {
    return NextResponse.json({ error: "Invalid or expired OTP" }, { status: 401 });
  }

  const token = createSession(email.trim().toLowerCase());

  const response = NextResponse.json({ ok: true });
  response.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 8, // 8 hours
  });

  return response;
}
