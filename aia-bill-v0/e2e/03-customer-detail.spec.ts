import { test, expect } from "@playwright/test";

const BASE = "http://localhost:5660";

test.describe("Customer Detail View", () => {

  test("clicking a customer opens their detail view with sub-tabs", async ({ page }) => {
    await page.goto(BASE);
    await page.locator("nav").getByText("Customers").click();
    await page.waitForFunction(() => document.body.innerText.includes("Acme Industries"), { timeout: 15000 });
    await page.getByText("Acme Industries").first().click();
    // Wait for the detail view — it shows "Payments" tab which is unique to customer detail
    await page.waitForFunction(() => document.body.innerText.includes("Payments") && document.body.innerText.includes("Admin Actions"), { timeout: 15000 });
    const body = await page.content();
    expect(body).toContain("Payments");
    expect(body).toContain("Admin Actions");
    expect(body).toContain("Plan");
  });

  test("overview tab shows primary contact info", async ({ page }) => {
    await page.goto(BASE);
    await page.locator("nav").getByText("Customers").click();
    await page.getByText("Acme Industries").first().click();
    const body = await page.content();
    expect(body).toContain("Rajesh Sharma");
    expect(body).toContain("rajesh@acme.in");
  });

  test("plan tab shows pricing and module grid", async ({ page }) => {
    await page.goto(BASE);
    await page.locator("nav").getByText("Customers").click();
    await page.getByText("Acme Industries").first().click();
    await page.getByRole("tab", { name: /Plan/i }).or(page.locator("text=Plan & Modules")).first().click();
    const body = await page.content();
    expect(body).toContain("Current Plan");
    expect(body).toContain("Module Access");
    expect(body).toMatch(/₹/);
  });

  test("payments tab shows Dodo integration fields and Resync button", async ({ page }) => {
    await page.goto(BASE);
    await page.locator("nav").getByText("Customers").click();
    await page.getByText("Acme Industries").first().click();
    await page.getByRole("tab", { name: "Payments" }).or(page.locator("text=Payments")).first().click();
    const body = await page.content();
    expect(body).toContain("Dodo Customer ID");
    expect(body).toContain("Dodo Subscription ID");
    expect(body).toContain("Resync from Dodo");
  });

  test("admin actions tab has Freeze, Module Access, Add Note, Delete", async ({ page }) => {
    await page.goto(BASE);
    await page.locator("nav").getByText("Customers").click();
    await page.getByText("Acme Industries").first().click();
    await page.getByRole("tab", { name: /Admin/i }).or(page.locator("text=Admin Actions")).first().click();
    const body = await page.content();
    expect(body).toContain("Freeze Account");
    expect(body).toContain("Module Access");
    expect(body).toContain("Add Note");
    expect(body).toContain("Delete customer");
  });

  test("delete modal requires exact company name before enabling button", async ({ page }) => {
    await page.goto(BASE);
    await page.locator("nav").getByText("Customers").click();
    await page.getByText("Acme Industries").first().click();
    await page.getByRole("tab", { name: /Admin/i }).or(page.locator("text=Admin Actions")).first().click();
    await page.locator("button:has-text('Delete')").last().click();
    // Modal appears
    await page.waitForSelector("text=Delete permanently");
    const confirmBtn = page.locator("button:has-text('Delete permanently')");
    await expect(confirmBtn).toBeDisabled();
    await page.locator("input[placeholder]").last().fill("Acme Industries Pvt Ltd");
    await expect(confirmBtn).toBeEnabled();
    await page.click("text=Cancel");
  });

  test("freeze modal appears and requires a reason", async ({ page }) => {
    await page.goto(BASE);
    await page.locator("nav").getByText("Customers").click();
    await page.getByText("Acme Industries").first().click();
    await page.getByRole("tab", { name: /Admin/i }).or(page.locator("text=Admin Actions")).first().click();
    await page.locator("button:has-text('Freeze')").click();
    await page.waitForSelector("text=Freeze account");
    const freezeBtn = page.locator("button:has-text('Freeze account')");
    await expect(freezeBtn).toBeDisabled();
    await page.locator("textarea").fill("Non-payment compliance hold");
    await expect(freezeBtn).toBeEnabled();
    await page.click("text=Cancel");
  });
});
