import { test, expect } from "@playwright/test";

const BASE = "http://localhost:5660";

// Auth tests use fresh context (no storageState) to test login flow
test.describe("Auth Flow", () => {

  test("login page renders AI Accountant branding", async ({ browser }) => {
    const ctx = await browser.newContext(); // no storageState
    const page = await ctx.newPage();
    await page.goto(`${BASE}/auth/login`);
    const body = await page.content();
    expect(body).toContain("Welcome back");
    expect(body).toContain("karboncard.com");
    // Logo URL contains the brand CDN path
    expect(body).toContain("website-files.com");
    await ctx.close();
  });

  test("rejects non-karboncard.com email", async ({ browser }) => {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    await page.goto(`${BASE}/auth/login`);
    await page.fill('input[type="email"]', "hacker@gmail.com");
    await page.click('button[type="submit"]');
    await page.waitForURL(/error=domain/);
    const body = await page.content();
    expect(body).toContain("Only @karboncard.com");
    await ctx.close();
  });

  test("valid karboncard email advances to verify page with dev OTP shown", async ({ browser }) => {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    await page.goto(`${BASE}/auth/login`);
    await page.fill('input[type="email"]', "test@karboncard.com");
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/auth\/verify/);
    const url = page.url();
    expect(url).toContain("email=test%40karboncard.com");
    expect(url).toContain("_dev=");
    const body = await page.content();
    expect(body).toContain("Dev OTP");
    await ctx.close();
  });

  test("wrong OTP shows error", async ({ browser }) => {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    await page.goto(`${BASE}/auth/login`);
    await page.fill('input[type="email"]', "test@karboncard.com");
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/auth\/verify/);
    await page.fill('input[name="otp"]', "000000");
    await page.click('button[type="submit"]');
    await page.waitForURL(/error=invalid/);
    const body = await page.content();
    expect(body).toContain("Invalid or expired");
    await ctx.close();
  });

  test("correct OTP logs in and redirects to dashboard", async ({ browser }) => {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    await page.goto(`${BASE}/auth/login`);
    await page.fill('input[type="email"]', "test@karboncard.com");
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/auth\/verify/);
    const otp = new URL(page.url()).searchParams.get("_dev") ?? "";
    expect(otp).toHaveLength(6);
    await page.fill('input[name="otp"]', otp);
    await page.click('button[type="submit"]');
    await page.waitForURL(`${BASE}/`);
    expect(page.url()).toBe(`${BASE}/`);
    await ctx.close();
  });
});
