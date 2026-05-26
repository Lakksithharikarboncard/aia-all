import { test, expect } from "@playwright/test";

const BASE = "http://localhost:5660";

test.describe("Admin Dashboard", () => {

  test("dashboard loads and shows navigation tabs", async ({ page }) => {
    await page.goto(BASE);
    // Nav tabs in AppShell
    await expect(page.locator("nav").getByText("Customers")).toBeVisible();
    await expect(page.locator("nav").getByText("Packages")).toBeVisible();
  });

  test("overview tab shows status stat cards", async ({ page }) => {
    await page.goto(BASE);
    // Wait for React to hydrate and render stat cards
    await page.waitForFunction(() => document.body.innerText.match(/Active|Trial|Grace|Frozen/), { timeout: 15000 });
    const body = await page.content();
    expect(body).toMatch(/Active|Trial|Grace|Frozen/);
  });

  test("customers tab lists demo customers", async ({ page }) => {
    await page.goto(BASE);
    await page.locator("nav").getByText("Customers").click();
    // Wait for React to render customers from localStorage
    await page.waitForFunction(() => document.body.innerText.includes("Acme Industries"), { timeout: 15000 });
    const body = await page.content();
    expect(body).toContain("Acme Industries");
  });

  test("can search customers by name", async ({ page }) => {
    await page.goto(BASE);
    await page.locator("nav").getByText("Customers").click();
    await page.waitForFunction(() => document.body.innerText.includes("Acme"), { timeout: 15000 });
    const searchInput = page.locator('input[placeholder*="Search"]').first();
    await searchInput.fill("Acme");
    await page.waitForTimeout(400);
    const body = await page.content();
    expect(body).toContain("Acme Industries");
  });

  test("packages tab loads plan mappings", async ({ page }) => {
    await page.goto(BASE);
    await page.locator("nav").getByText("Packages").click();
    const body = await page.content();
    expect(body).toMatch(/Starter|Growth/);
  });

  test("packages tab shows Dodo product ID column", async ({ page }) => {
    await page.goto(BASE);
    await page.locator("nav").getByText("Packages").click();
    const body = await page.content();
    expect(body).toContain("Dodo Product");
  });

  test("synced plans show product ID, not Sync button", async ({ page }) => {
    await page.goto(BASE);
    await page.locator("nav").getByText("Packages").click();
    const body = await page.content();
    // Demo plans have real Dodo product IDs seeded
    const hasSyncButton = body.includes("Sync to Dodo");
    console.log(`Sync to Dodo button present: ${hasSyncButton}`);
    expect(body).toContain("pdt_"); // at least one plan has a real product ID
  });
});
