import { redirect } from "next/navigation";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Sign in · AI Accountant" };

const LOGO = "https://cdn.prod.website-files.com/67ed19ac5d8a1253defd2450/690089a8f61795ffd3233552_67f8c9f1c2388ba1fc177bcb_LOGO%20(NO%20BG)-01%201.svg";

async function sendOtp(formData: FormData) {
  "use server";
  const email = (formData.get("email") as string ?? "").trim().toLowerCase();
  if (!email.endsWith("@karboncard.com")) {
    redirect(`/auth/login?error=domain`);
  }
  // Static OTP for prototype: user enters "000000"
  const otp = "000000";
  redirect(`/auth/verify?email=${encodeURIComponent(email)}&_dev=${otp}`);
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; next?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <>
      <style>{`
        .auth-wrap input[type="email"] {
          width: 100%;
          height: 38px;
          padding: 0 12px;
          border: 1px solid #d4d4d4;
          border-radius: 6px;
          font-size: 14px;
          font-family: inherit;
          color: #0a0a0a;
          background: #fff;
          outline: none;
          transition: border-color .15s;
          margin-bottom: 12px;
        }
        .auth-wrap input[type="email"]:focus { border-color: #0a0a0a; }
        .auth-wrap input[type="email"]::placeholder { color: #9ca3af; }
        .auth-wrap .footer-note {
          text-align: center;
          font-size: 11px;
          color: #9ca3af;
          margin-top: 1.25rem;
        }
      `}</style>
      <div className="card">
        <div className="brand">
          <img src={LOGO} alt="AI Accountant" />
          <span className="brand-name">Korefi Admin</span>
        </div>
        <h1>Welcome back</h1>
        <p className="subtitle">Sign in with your Karbon Card email</p>

        <form action={sendOtp}>
          <label htmlFor="email">Work email</label>
          <input
            id="email"
            name="email"
            type="email"
            placeholder="you@karboncard.com"
            autoFocus
            required
            autoComplete="email"
          />
          {error === "domain" && (
            <p className="error-msg">Only @karboncard.com accounts are allowed.</p>
          )}
          <button type="submit">Continue with email →</button>
        </form>

        <p className="footer-note">Access restricted to @karboncard.com</p>
      </div>
    </>
  );
}
