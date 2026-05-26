import fs from "fs";
import path from "path";
import crypto from "crypto";
import { chromium } from "@playwright/test";

const DATA_DIR = path.resolve(__dirname, "../.data");
const SESSION_FILE = path.join(DATA_DIR, "sessions.json");
const AUTH_FILE = path.resolve(__dirname, ".auth.json");
const SESSION_COOKIE = "korefi_session";
const SESSION_TTL_MS = 8 * 60 * 60 * 1000;
const BASE = "http://localhost:5660";

export default async function globalSetup() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

  // Create session token
  const token = crypto.randomBytes(32).toString("hex");
  let sessions: Record<string, { email: string; expiresAt: number }> = {};
  try { sessions = JSON.parse(fs.readFileSync(SESSION_FILE, "utf-8")); } catch { /**/ }
  sessions[token] = { email: "test@karboncard.com", expiresAt: Date.now() + SESSION_TTL_MS };
  fs.writeFileSync(SESSION_FILE, JSON.stringify(sessions), "utf-8");

  const storageState = {
    cookies: [
      {
        name: SESSION_COOKIE,
        value: token,
        domain: "localhost",
        path: "/",
        httpOnly: true,
        sameSite: "Lax" as const,
        secure: false,
        expires: Math.floor((Date.now() + SESSION_TTL_MS) / 1000),
      },
    ],
    origins: [],
  };
  fs.writeFileSync(AUTH_FILE, JSON.stringify(storageState, null, 2));
  console.log("[E2E] Auth session:", token.slice(0, 8) + "...");

  // Load admin dashboard in a real browser to trigger localStorage init + POST /api/sync
  // This seeds billing.json so server-side routes (webhooks, portal, resync) can find customers
  console.log("[E2E] Seeding billing.json via admin dashboard load...");
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    storageState: { cookies: storageState.cookies, origins: [] },
  });
  const page = await context.newPage();
  try {
    await page.goto(BASE, { waitUntil: "networkidle", timeout: 20000 });
    // Wait for initializeDemoData + POST /api/sync to complete
    await page.waitForTimeout(3000);
    // Verify billing.json has data by checking sync endpoint
    const checkRes = await page.evaluate(async () => {
      const r = await fetch("/api/sync");
      const d = await r.json();
      return { customers: d.customers?.length ?? 0, plans: d.planMappings?.length ?? 0 };
    });
    console.log(`[E2E] billing.json seeded — ${checkRes.customers} customers, ${checkRes.plans} plans ✓`);
  } catch (err) {
    console.warn("[E2E] Could not seed billing.json:", err);
  } finally {
    await browser.close();
  }
}
