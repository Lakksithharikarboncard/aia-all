import { redirect } from "next/navigation";
import { verifyOTP, createSession, SESSION_COOKIE } from "@/lib/auth/session";
import { cookies } from "next/headers";

const LOGO = "https://cdn.prod.website-files.com/67ed19ac5d8a1253defd2450/690089a8f61795ffd3233552_67f8c9f1c2388ba1fc177bcb_LOGO%20(NO%20BG)-01%201.svg";

async function verifyOtp(formData: FormData) {
  "use server";
  const email = (formData.get("email") as string ?? "").trim().toLowerCase();
  const otp = (formData.get("otp") as string ?? "").trim();

  if (!verifyOTP(email, otp)) {
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
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>Verify · AI Accountant</title>
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
          .subtitle strong { color: #374151; font-weight: 500; }
          .dev-badge {
            display: flex;
            align-items: center;
            gap: 8px;
            background: #fff8c5;
            border: 1px solid rgba(212,167,44,.4);
            border-radius: 6px;
            padding: 8px 12px;
            margin-bottom: 14px;
          }
          .dev-badge span:first-child {
            font-size: 10px;
            font-weight: 700;
            letter-spacing: .1em;
            text-transform: uppercase;
            color: #9a6700;
            flex-shrink: 0;
          }
          .dev-badge span:last-child {
            font-family: 'Courier New', monospace;
            font-size: 18px;
            font-weight: 700;
            letter-spacing: .25em;
            color: #1f2937;
          }
          label {
            display: block;
            font-size: 12px;
            font-weight: 500;
            color: #374151;
            margin-bottom: 6px;
          }
          input[type="text"] {
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
          input[type="text"]:focus { border-color: #0a0a0a; }
          input[type="text"]::placeholder { color: #d1d5db; font-size: 16px; letter-spacing: .2em; }
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
          .back-link {
            display: block;
            text-align: center;
            font-size: 12px;
            color: #6b7280;
            text-decoration: none;
            margin-top: 1.25rem;
          }
          .back-link:hover { color: #0a0a0a; }
        `}</style>
      </head>
      <body>
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

          <form action={verifyOtp} method="post">
            <input type="hidden" name="email" value={email} />
            <label htmlFor="otp">6-digit code</label>
            <input
              id="otp"
              name="otp"
              type="text"
              inputMode="numeric"
              maxLength={6}
              placeholder="000000"
              defaultValue={devOtp}
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
      </body>
    </html>
  );
}
