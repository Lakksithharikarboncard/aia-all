import "server-only";
import crypto from "crypto";

const SESSION_COOKIE = "korefi_session";
const OTP_TTL_MS = 10 * 60 * 1000; // 10 minutes
const SESSION_TTL_MS = 8 * 60 * 60 * 1000; // 8 hours

function secret(): string {
  const s = process.env.AUTH_SECRET ?? process.env.DODO_PAYMENTS_API_KEY ?? "dev-secret-change-me";
  return s.slice(0, 32).padEnd(32, "x");
}

function hmac(data: string): string {
  return crypto.createHmac("sha256", secret()).update(data).digest("hex");
}

// ─── OTP — stateless HMAC (no file storage) ──────────────────────────
// OTP token format: base64(email:otp:expiresAt):hmac
// No server storage needed — verified by signature on submit.

export function generateOTP(email: string): string {
  // Static OTP for prototype: consistent, predictable, no email API needed
  const otp = String(Math.floor(100000 + Math.random() * 900000));
  console.log(`[AUTH] OTP for ${email}: ${otp}`);
  return otp;
}

// We store the token in the URL (_dev param) for dev mode, but for
// stateless verification we need to store otp+expiry server-side.
// On serverless we use a signed cookie approach: store otp+email+expiry
// as a signed token in a short-lived cookie set during send-otp.

export function createOTPToken(email: string, otp: string): string {
  const expiresAt = Date.now() + OTP_TTL_MS;
  const payload = `${email}:${otp}:${expiresAt}`;
  const sig = hmac(payload);
  return `${Buffer.from(payload).toString("base64url")}.${sig}`;
}

export function verifyOTP(email: string, otp: string, token: string): boolean {
  try {
    const [b64, sig] = token.split(".");
    if (!b64 || !sig) return false;
    const payload = Buffer.from(b64, "base64url").toString();
    if (hmac(payload) !== sig) return false;
    const [storedEmail, storedOtp, expiresAtStr] = payload.split(":");
    if (storedEmail !== email.trim().toLowerCase()) return false;
    if (storedOtp !== otp.trim()) return false;
    if (Date.now() > Number(expiresAtStr)) return false;
    return true;
  } catch {
    return false;
  }
}

// ─── Session — signed cookie token (no file storage) ─────────────────
// Session token format: base64(email:expiresAt):hmac

export function createSession(email: string): string {
  const expiresAt = Date.now() + SESSION_TTL_MS;
  const payload = `${email}:${expiresAt}`;
  const sig = hmac(payload);
  return `${Buffer.from(payload).toString("base64url")}.${sig}`;
}

export function getSession(token: string | undefined): { email: string; expiresAt: number } | null {
  if (!token) return null;
  try {
    const [b64, sig] = token.split(".");
    if (!b64 || !sig) return null;
    const payload = Buffer.from(b64, "base64url").toString();
    if (hmac(payload) !== sig) return null;
    const [email, expiresAtStr] = payload.split(":");
    const expiresAt = Number(expiresAtStr);
    if (Date.now() > expiresAt) return null;
    return { email, expiresAt };
  } catch {
    return null;
  }
}

export function deleteSession(_token: string) {
  // Stateless — nothing to delete server-side; caller clears the cookie
}

export { SESSION_COOKIE };
