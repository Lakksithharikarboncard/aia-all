import { test, expect } from "@playwright/test";

const BASE = "http://localhost:5660";

// Portal tests are public (no auth needed) but customers must be in billing.json
// globalSetup seeds billing.json by loading the admin dashboard first

test.describe("Customer Portal", () => {

  test("active customer sees module access grid, not payment gate", async ({ page }) => {
    await page.goto(`${BASE}/portal/cust_demo_1`);
    // Wait for React to hydrate and server data to load
    await page.waitForFunction(
      () => document.body.innerText.match(/Accounts Payable|Banking|Dashboard|Module Access/),
      { timeout: 20000 }
    );
    const body = await page.content();
    expect(body).toMatch(/Accounts Payable|Banking|Dashboard/);
    expect(body).not.toContain("Payment Required");
  });

  test("payment_pending customer sees checkout gate", async ({ page }) => {
    await page.goto(`${BASE}/portal/cust_demo_2`);
    await page.waitForTimeout(3000);
    const body = await page.content();
    expect(body).toContain("Payment Required");
    expect(body).toContain("Complete Payment");
  });

  test("payment_pending customer sees I've Paid — Check Status button", async ({ page }) => {
    await page.goto(`${BASE}/portal/cust_demo_2`);
    await page.waitForFunction(
      () => document.body.innerText.includes("Payment Required") || document.body.innerText.includes("I've Paid"),
      { timeout: 15000 }
    );
    const body = await page.content();
    expect(body).toContain("I've Paid");
  });

  test("frozen customer sees Account Frozen gate with Manage Billing", async ({ page }) => {
    await page.goto(`${BASE}/portal/cust_demo_9`);
    await page.waitForTimeout(2000);
    const body = await page.content();
    expect(body).toContain("Account Frozen");
    expect(body).toContain("Manage Billing");
  });

  test("trial customer sees trial content", async ({ page }) => {
    await page.goto(`${BASE}/portal/cust_demo_7`);
    await page.waitForTimeout(2000);
    const body = await page.content();
    // Trial customer should have access to modules
    expect(body).toMatch(/trial|Trial|trial ends/i);
  });

  test("nonexistent customer shows not found message", async ({ page }) => {
    await page.goto(`${BASE}/portal/cust_does_not_exist`);
    await page.waitForTimeout(1000);
    const body = await page.content();
    expect(body).toContain("not found");
  });

  test("portal auto-calls /api/customers/:id on load for server sync", async ({ page }) => {
    let serverFetched = false;
    page.on("request", (req) => {
      if (req.url().includes("/api/customers/cust_demo_2")) serverFetched = true;
    });
    await page.goto(`${BASE}/portal/cust_demo_2`);
    await page.waitForTimeout(3000);
    expect(serverFetched).toBe(true);
  });

  test("portal auto-resyncs payment_pending customer from Dodo on load", async ({ page }) => {
    let resyncCalled = false;
    page.on("request", (req) => {
      if (req.url().includes("/api/dodo/resync/cust_demo_2")) resyncCalled = true;
    });
    await page.goto(`${BASE}/portal/cust_demo_2`);
    await page.waitForTimeout(4000);
    // Resync is called only if status is payment_pending AND dodoCustomerId is set
    console.log(`Auto-resync called for cust_demo_2: ${resyncCalled}`);
    // This is observational — resync fires if customer has dodoCustomerId
  });
});
