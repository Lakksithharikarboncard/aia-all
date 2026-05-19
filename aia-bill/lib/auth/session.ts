import "server-only";
import fs from "fs";
import path from "path";
import crypto from "crypto";

const DATA_DIR = path.resolve(process.cwd(), ".data");
const OTP_FILE = path.join(DATA_DIR, "otps.json");
const SESSION_FILE = path.join(DATA_DIR, "sessions.json");
const SESSION_COOKIE = "korefi_session";
const OTP_TTL_MS = 10 * 60 * 1000; // 10 minutes
const SESSION_TTL_MS = 8 * 60 * 60 * 1000; // 8 hours

function ensureDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
}

// ─── OTP ─────────────────────────────────────────────────────────────

type OTPRecord = { otp: string; email: string; expiresAt: number };

function readOTPs(): Record<string, OTPRecord> {
  ensureDir();
  try { return JSON.parse(fs.readFileSync(OTP_FILE, "utf-8")); } catch { return {}; }
}

function writeOTPs(data: Record<string, OTPRecord>) {
  ensureDir();
  fs.writeFileSync(OTP_FILE, JSON.stringify(data), "utf-8");
}

export function generateOTP(email: string): string {
  const otp = String(Math.floor(100000 + Math.random() * 900000));
  const records = readOTPs();
  records[email] = { otp, email, expiresAt: Date.now() + OTP_TTL_MS };
  writeOTPs(records);
  return otp;
}

export function verifyOTP(email: string, otp: string): boolean {
  const records = readOTPs();
  const record = records[email];
  if (!record) return false;
  if (Date.now() > record.expiresAt) { delete records[email]; writeOTPs(records); return false; }
  if (record.otp !== otp.trim()) return false;
  delete records[email];
  writeOTPs(records);
  return true;
}

// ─── Session ──────────────────────────────────────────────────────────

type SessionRecord = { email: string; expiresAt: number };

function readSessions(): Record<string, SessionRecord> {
  ensureDir();
  try { return JSON.parse(fs.readFileSync(SESSION_FILE, "utf-8")); } catch { return {}; }
}

function writeSessions(data: Record<string, SessionRecord>) {
  ensureDir();
  fs.writeFileSync(SESSION_FILE, JSON.stringify(data), "utf-8");
}

export function createSession(email: string): string {
  const token = crypto.randomBytes(32).toString("hex");
  const sessions = readSessions();
  // Prune expired sessions
  const now = Date.now();
  for (const [k, v] of Object.entries(sessions)) {
    if (v.expiresAt < now) delete sessions[k];
  }
  sessions[token] = { email, expiresAt: now + SESSION_TTL_MS };
  writeSessions(sessions);
  return token;
}

export function getSession(token: string | undefined): SessionRecord | null {
  if (!token) return null;
  const sessions = readSessions();
  const session = sessions[token];
  if (!session) return null;
  if (Date.now() > session.expiresAt) { delete sessions[token]; writeSessions(sessions); return null; }
  return session;
}

export function deleteSession(token: string) {
  const sessions = readSessions();
  delete sessions[token];
  writeSessions(sessions);
}

export { SESSION_COOKIE };
