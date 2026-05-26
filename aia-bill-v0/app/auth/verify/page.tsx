import { redirect } from "next/navigation";
import { createSession, SESSION_COOKIE } from "@/lib/auth/session";
import { cookies } from "next/headers";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Verify · AI Accountant" };

const LOGO = "https://cdn.prod.website-files.com/67ed19ac5d8a1253defd2450/690089a8f61795ffd3233552_67f8c9f1c2388ba1fc177bcb_LOGO%20(NO%20BG)-01%201.svg";

async function verifyOtp(formData: FormData) {
  "use server";
  const email = (formData.get("email") as string ?? "").trim().toLowerCase();
  const otp = (formData.get("otp") as string ?? "").trim();

  // Static OTP for prototype - user must enter "000000"
  if (otp !== "000000") {
    redirect(`/auth/verify?email=${encodeURIComponent(email)}&error=invalid`);
  }

  const token = createSession(email);
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 8,
  });

  redirect("/");
}

export default async function VerifyPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string; _dev?: string; error?: string }>;
}) {
  const { email = "", _dev: devOtp = "", error } = await searchParams;

  return (
    <>
      <style>{`
        .auth-wrap input[type="text"] {
          width: 100%;
          height: 38px;
          padding: 0 12px;
          border: 1px solid #d4d4d4;
          border-radius: 6px;
          font-size: 20px;
          font-family: 'Courier New', monospace;
          letter-spacing: .25em;
          color: #0a0a0a;
          background: #fff;
          outline: none;
          transition: border-color .15s;
          margin-bottom: 12px;
          text-align: center;
        }
        .auth-wrap input[type="text"]:focus { border-color: #0a0a0a; }
        .auth-wrap input[type="text"]::placeholder { color: #d1d5db; font-size: 16px; letter-spacing: .2em; }
        .auth-wrap .dev-badge {
          display: flex;
          align-items: center;
          gap: 8px;
          background: #fff8c5;
          border: 1px solid rgba(212,167,44,.4);
          border-radius: 6px;
          padding: 8px 12px;
          margin-bottom: 14px;
        }
        .auth-wrap .dev-badge span:first-child {
          font-size: 10px;
          font-weight: 700;
          letter-spacing: .1em;
          text-transform: uppercase;
          color: #9a6700;
          flex-shrink: 0;
        }
        .auth-wrap .dev-badge span:last-child {
          font-family: 'Courier New', monospace;
          font-size: 18px;
          font-weight: 700;
          letter-spacing: .25em;
          color: #1f2937;
        }
        .auth-wrap .back-link {
          display: block;
          text-align: center;
          font-size: 12px;
          color: #6b7280;
          text-decoration: none;
          margin-top: 1.25rem;
        }
        .auth-wrap .back-link:hover { color: #0a0a0a; }
      `}</style>
      <div className="card">
        <div className="brand">
          <img src={LOGO} alt="AI Accountant" />
          <span className="brand-name">Korefi Admin</span>
        </div>
        <h1>Check your email</h1>
        <p className="subtitle">
          We sent a 6-digit code to <strong>{email}</strong>
        </p>

        {devOtp && (
          <div className="dev-badge">
            <span>Dev OTP</span>
            <span>{devOtp}</span>
          </div>
        )}

        <form action={verifyOtp}>
          <input type="hidden" name="email" value={email} />
          <label htmlFor="otp">6-digit code</label>
          <input
            id="otp"
            name="otp"
            type="text"
            inputMode="numeric"
            maxLength={6}
            placeholder="000000"
            defaultValue="000000"
            autoFocus={!devOtp}
            autoComplete="one-time-code"
            required
          />
          {error === "invalid" && (
            <p className="error-msg">Invalid or expired code. Please try again.</p>
          )}
          <button type="submit">Verify & sign in →</button>
        </form>

        <a href={`/auth/login`} className="back-link">← Use a different email</a>
      </div>
    </>
  );
}
