import { NextResponse } from "next/server";
import { verifyOTP, createSession, SESSION_COOKIE } from "@/lib/auth/session";
import { cookies } from "next/headers";

const OTP_COOKIE = "korefi_otp";

export async function POST(request: Request) {
  const { email, otp } = await request.json();
  if (!email || !otp) {
    return NextResponse.json({ error: "Email and OTP required" }, { status: 400 });
  }

  const cookieStore = await cookies();
  const otpToken = cookieStore.get(OTP_COOKIE)?.value ?? "";

  if (!verifyOTP(email.trim().toLowerCase(), otp.trim(), otpToken)) {
    return NextResponse.json({ error: "Invalid or expired OTP" }, { status: 401 });
  }

  const sessionToken = createSession(email.trim().toLowerCase());
  const res = NextResponse.json({ ok: true });

  res.cookies.set(SESSION_COOKIE, sessionToken, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 8,
  });
  // Clear the OTP cookie
  res.cookies.set(OTP_COOKIE, "", { maxAge: 0, path: "/" });
  return res;
}
