# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: 02-admin-dashboard.spec.ts >> Admin Dashboard >> packages tab loads plan mappings
- Location: e2e/02-admin-dashboard.spec.ts:42:7

# Error details

```
Test timeout of 60000ms exceeded.
```

```
Error: page.goto: net::ERR_ABORTED; maybe frame was detached?
Call log:
  - navigating to "http://localhost:5660/", waiting until "load"

```

# Test source

```ts
  1  | import { test, expect } from "@playwright/test";
  2  | 
  3  | const BASE = "http://localhost:5660";
  4  | 
  5  | test.describe("Admin Dashboard", () => {
  6  | 
  7  |   test("dashboard loads and shows navigation tabs", async ({ page }) => {
  8  |     await page.goto(BASE);
  9  |     // Nav tabs in AppShell
  10 |     await expect(page.locator("nav").getByText("Customers")).toBeVisible();
  11 |     await expect(page.locator("nav").getByText("Packages")).toBeVisible();
  12 |   });
  13 | 
  14 |   test("overview tab shows status stat cards", async ({ page }) => {
  15 |     await page.goto(BASE);
  16 |     // Wait for React to hydrate and render stat cards
  17 |     await page.waitForFunction(() => document.body.innerText.match(/Active|Trial|Grace|Frozen/), { timeout: 15000 });
  18 |     const body = await page.content();
  19 |     expect(body).toMatch(/Active|Trial|Grace|Frozen/);
  20 |   });
  21 | 
  22 |   test("customers tab lists demo customers", async ({ page }) => {
  23 |     await page.goto(BASE);
  24 |     await page.locator("nav").getByText("Customers").click();
  25 |     // Wait for React to render customers from localStorage
  26 |     await page.waitForFunction(() => document.body.innerText.includes("Acme Industries"), { timeout: 15000 });
  27 |     const body = await page.content();
  28 |     expect(body).toContain("Acme Industries");
  29 |   });
  30 | 
  31 |   test("can search customers by name", async ({ page }) => {
  32 |     await page.goto(BASE);
  33 |     await page.locator("nav").getByText("Customers").click();
  34 |     await page.waitForFunction(() => document.body.innerText.includes("Acme"), { timeout: 15000 });
  35 |     const searchInput = page.locator('input[placeholder*="Search"]').first();
  36 |     await searchInput.fill("Acme");
  37 |     await page.waitForTimeout(400);
  38 |     const body = await page.content();
  39 |     expect(body).toContain("Acme Industries");
  40 |   });
  41 | 
  42 |   test("packages tab loads plan mappings", async ({ page }) => {
> 43 |     await page.goto(BASE);
     |                ^ Error: page.goto: net::ERR_ABORTED; maybe frame was detached?
  44 |     await page.locator("nav").getByText("Packages").click();
  45 |     const body = await page.content();
  46 |     expect(body).toMatch(/Starter|Growth/);
  47 |   });
  48 | 
  49 |   test("packages tab shows Dodo product ID column", async ({ page }) => {
  50 |     await page.goto(BASE);
  51 |     await page.locator("nav").getByText("Packages").click();
  52 |     const body = await page.content();
  53 |     expect(body).toContain("Dodo Product");
  54 |   });
  55 | 
  56 |   test("synced plans show product ID, not Sync button", async ({ page }) => {
  57 |     await page.goto(BASE);
  58 |     await page.locator("nav").getByText("Packages").click();
  59 |     const body = await page.content();
  60 |     // Demo plans have real Dodo product IDs seeded
  61 |     const hasSyncButton = body.includes("Sync to Dodo");
  62 |     console.log(`Sync to Dodo button present: ${hasSyncButton}`);
  63 |     expect(body).toContain("pdt_"); // at least one plan has a real product ID
  64 |   });
  65 | });
  66 | 
```