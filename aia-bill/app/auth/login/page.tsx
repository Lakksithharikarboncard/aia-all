import { redirect } from "next/navigation";
import { generateOTP, createOTPToken } from "@/lib/auth/session";
import { cookies } from "next/headers";

const LOGO = "https://cdn.prod.website-files.com/67ed19ac5d8a1253defd2450/690089a8f61795ffd3233552_67f8c9f1c2388ba1fc177bcb_LOGO%20(NO%20BG)-01%201.svg";
const OTP_COOKIE = "korefi_otp";

async function sendOtp(formData: FormData) {
  "use server";
  const email = (formData.get("email") as string ?? "").trim().toLowerCase();
  if (!email.endsWith("@karboncard.com")) {
    redirect(`/auth/login?error=domain`);
  }
  const otp = generateOTP(email);
  const token = createOTPToken(email, otp);
  // Store signed OTP in a cookie so verify page can validate without file I/O
  const cookieStore = await cookies();
  cookieStore.set(OTP_COOKIE, token, { httpOnly: true, sameSite: "lax", path: "/", maxAge: 600 });
  redirect(`/auth/verify?email=${encodeURIComponent(email)}&_dev=${otp}`);
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; next?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>Sign in · AI Accountant</title>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap" rel="stylesheet" />
        <style>{`
          *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
          body {
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            background: #f5f5f5;
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 1.5rem;
            color: #1f2937;
            font-size: 14px;
            line-height: 1.5;
            -webkit-font-smoothing: antialiased;
          }
          .card {
            background: #fff;
            border: 1px solid #d4d4d4;
            border-radius: 8px;
            padding: 2.5rem 2rem;
            width: 100%;
            max-width: 380px;
          }
          .brand {
            text-align: center;
            margin-bottom: 2rem;
          }
          .brand img {
            height: 36px;
            width: auto;
            display: inline-block;
          }
          .brand-name {
            display: block;
            font-size: 11px;
            font-weight: 600;
            letter-spacing: .12em;
            text-transform: uppercase;
            color: #6b7280;
            margin-top: 10px;
          }
          h1 {
            font-size: 18px;
            font-weight: 600;
            color: #0a0a0a;
            margin-bottom: 4px;
            text-align: center;
          }
          .subtitle {
            font-size: 13px;
            color: #6b7280;
            text-align: center;
            margin-bottom: 1.75rem;
          }
          label {
            display: block;
            font-size: 12px;
            font-weight: 500;
            color: #374151;
            margin-bottom: 6px;
          }
          input[type="email"] {
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
          input[type="email"]:focus { border-color: #0a0a0a; }
          input[type="email"]::placeholder { color: #9ca3af; }
          .error-msg {
            font-size: 12px;
            color: #cf222e;
            margin-bottom: 10px;
          }
          button[type="submit"] {
            width: 100%;
            height: 38px;
            background: #0a0a0a;
            color: #fff;
            border: none;
            border-radius: 6px;
            font-size: 14px;
            font-weight: 500;
            font-family: inherit;
            cursor: pointer;
            transition: background .15s;
          }
          button[type="submit"]:hover { background: #262626; }
          .footer-note {
            text-align: center;
            font-size: 11px;
            color: #9ca3af;
            margin-top: 1.25rem;
          }
        `}</style>
      </head>
      <body>
        <div className="card">
          <div className="brand">
            <img src={LOGO} alt="AI Accountant" />
            <span className="brand-name">Korefi Admin</span>
          </div>
          <h1>Welcome back</h1>
          <p className="subtitle">Sign in with your Karbon Card email</p>

          <form action={sendOtp} method="post">
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
      </body>
    </html>
  );
}
