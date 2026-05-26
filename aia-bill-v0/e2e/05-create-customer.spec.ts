import { test, expect } from "@playwright/test";

const BASE = "http://localhost:5660";

test.describe("Create Customer Flow", () => {

  test("Create Customer button navigates to form", async ({ page }) => {
    await page.goto(BASE);
    await page.locator("nav").getByText("Customers").click();
    await page.waitForFunction(() => document.body.innerText.includes("Create Customer"), { timeout: 15000 });
    await page.getByText("Create Customer").click();
    await page.waitForFunction(() => document.body.innerText.includes("New Customer"), { timeout: 10000 });
    const body = await page.content();
    expect(body).toContain("New Customer");
    expect(body).toContain("Primary Contact");
    expect(body).toContain("Customer Needs");
  });

  test("all 6 required module checkboxes are present", async ({ page }) => {
    await page.goto(BASE);
    await page.locator("nav").getByText("Customers").click();
    await page.getByText("Create Customer").click();
    const body = await page.content();
    expect(body).toContain("Banking");
    expect(body).toContain("Accounts Receivable");
    expect(body).toContain("Accounts Payable");
    expect(body).toContain("Journal Voucher");
    // & is HTML-encoded — check for both
    expect(body).toMatch(/Dashboard.*Reports|Dashboard &amp; Reports/);
    expect(body).toContain("GSTR-2B Recon");
  });

  test("Tally Zoho included-by-default note visible", async ({ page }) => {
    await page.goto(BASE);
    await page.locator("nav").getByText("Customers").click();
    await page.getByText("Create Customer").click();
    const body = await page.content();
    expect(body).toContain("Tally");
    expect(body).toContain("included by default");
  });

  test("selecting a module shows plan recommendation panel", async ({ page }) => {
    await page.goto(BASE);
    await page.locator("nav").getByText("Customers").click();
    await page.getByText("Create Customer").click();
    await page.locator("label:has-text('Banking')").click();
    await page.waitForTimeout(300);
    const body = await page.content();
    expect(body).toMatch(/Starter|Growth|Custom/);
    expect(body).toMatch(/₹/);
  });

  test("volume > 100 bills triggers Growth plan recommendation", async ({ page }) => {
    await page.goto(BASE);
    await page.locator("nav").getByText("Customers").click();
    await page.getByText("Create Customer").click();
    await page.locator("label:has-text('Banking')").click();
    await page.locator('input[placeholder="0"]').first().fill("150");
    await page.waitForTimeout(400);
    const body = await page.content();
    expect(body).toMatch(/Growth/i);
  });

  test("quarterly frequency shows 10% discount price", async ({ page }) => {
    await page.goto(BASE);
    await page.locator("nav").getByText("Customers").click();
    await page.getByText("Create Customer").click();
    await page.locator("label:has-text('Banking')").click();
    await page.locator("button:has-text('quarterly')").click();
    await page.waitForTimeout(300);
    const body = await page.content();
    // Starter quarterly = 4047
    expect(body).toMatch(/4,047|4047/);
  });

  test("accounting software allows multiple selection", async ({ page }) => {
    await page.goto(BASE);
    await page.locator("nav").getByText("Customers").click();
    await page.getByText("Create Customer").click();
    await page.locator("button:has-text('tally')").click();
    await page.locator("button:has-text('zoho')").click();
    await page.waitForTimeout(200);
    const body = await page.content();
    // Both selected — should appear in the page with selected styling classes
    const tallyBtn = page.locator("button:has-text('tally')");
    const classes = await tallyBtn.getAttribute("class") ?? "";
    expect(classes).toMatch(/action-primary|selected|bg-surface/);
  });
});
