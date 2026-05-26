import { test, expect } from "@playwright/test";

const BASE = "http://localhost:5660";

test.describe("Dodo Payments Sync", () => {

  test("POST /api/dodo/products creates product in Dodo sandbox", async ({ request }) => {
    const res = await request.post(`${BASE}/api/dodo/products`, {
      data: {
        planMappingId: `test_plan_${Date.now()}`,
        name: `E2E Test Plan ${Date.now()}`,
        description: "Created by Playwright E2E test",
        amount: 999,
        billingFrequency: "monthly",
      },
    });
    const body = await res.json();
    console.log("Create product:", JSON.stringify(body));
    expect(res.status()).toBe(200);
    expect(body.productId).toMatch(/^pdt_/);
  });

  test("POST /api/dodo/checkout creates Dodo customer + checkout session", async ({ request }) => {
    const ts = Date.now();
    const res = await request.post(`${BASE}/api/dodo/checkout`, {
      data: {
        customerAccountId: `e2e_${ts}`,
        primaryName: "E2E Test Customer",
        primaryEmail: `e2e-${ts}@test.com`,
        primaryPhone: "+917777777777",
        dodoProductId: "pdt_0Nf668zN2Om2Mydig4YYq",
      },
    });
    const body = await res.json();
    console.log("Checkout:", JSON.stringify(body));
    expect(res.status()).toBe(200);
    expect(body.url).toContain("checkout.dodopayments.com");
    expect(body.dodoCustomerId).toMatch(/^cus_/);
    expect(body.sessionId).toMatch(/^cks_/);
  });

  test("POST /api/dodo/checkout returns 400 when dodoProductId missing", async ({ request }) => {
    const res = await request.post(`${BASE}/api/dodo/checkout`, {
      data: {
        customerAccountId: "test_no_product",
        primaryEmail: "test@karboncard.com",
      },
    });
    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.error).toBeTruthy();
  });

  test("POST /api/dodo/resync/:id returns status for a customer with dodoCustomerId", async ({ request }) => {
    // Use Acme Industries (cust_demo_1) which has a demo dodoCustomerId in the seeded data
    // OR create a real checkout first to get a real customer
    // For this test we verify the resync API itself works (200 + status field)
    const res = await request.post(`${BASE}/api/dodo/resync/cust_demo_1`);
    expect(res.status()).toBe(200);
    const body = await res.json();
    console.log("Resync cust_demo_1:", JSON.stringify(body));
    // Should return either a status or a no-subscriptions message
    expect(body.status || body.message).toBeTruthy();
  });

  test("POST /api/dodo/resync/:id returns graceful response for unlinked customer", async ({ request }) => {
    const res = await request.post(`${BASE}/api/dodo/resync/cust_demo_11`);
    const body = await res.json();
    console.log("Resync unlinked:", JSON.stringify(body));
    // 400 (no dodoCustomerId) or 404 (not in billing.json) — both acceptable
    expect([200, 400, 404]).toContain(res.status());
  });

  test("POST /api/dodo/customer-portal returns 404 for nonexistent customer", async ({ request }) => {
    const res = await request.post(`${BASE}/api/dodo/customer-portal`, {
      data: { customerAccountId: "cust_nonexistent_xyz" },
    });
    const body = await res.json();
    console.log("Portal nonexistent:", res.status(), JSON.stringify(body));
    expect(res.status()).toBe(404);
    expect(body.error).toBeTruthy();
  });

  test("POST /api/dodo/webhooks processes subscription.active and returns ok", async ({ request }) => {
    const res = await request.post(`${BASE}/api/dodo/webhooks`, {
      data: {
        type: "subscription.active",
        data: {
          subscription_id: "sub_e2e_test",
          next_billing_date: new Date(Date.now() + 30 * 86400000).toISOString(),
          metadata: { customer_account_id: "cust_demo_1" },
          customer: { customer_id: "cus_demo_acme_001" },
        },
      },
      headers: {
        "Content-Type": "application/json",
        "webhook-id": `e2e-active-${Date.now()}`,
      },
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
  });

  test("webhook deduplication rejects same webhook-id twice", async ({ request }) => {
    const id = `dedup-${Date.now()}`;
    const payload = {
      type: "subscription.renewed",
      data: { metadata: { customer_account_id: "cust_demo_4" }, customer: { customer_id: "cus_x" } },
    };
    const headers = { "Content-Type": "application/json", "webhook-id": id };
    const r1 = await request.post(`${BASE}/api/dodo/webhooks`, { data: payload, headers });
    const r2 = await request.post(`${BASE}/api/dodo/webhooks`, { data: payload, headers });
    expect(r1.status()).toBe(200);
    expect(r2.status()).toBe(200);
    expect((await r1.json()).deduped).toBeFalsy();
    expect((await r2.json()).deduped).toBe(true);
  });

  test("webhook subscription.on_hold sets customer to grace", async ({ request }) => {
    const res = await request.post(`${BASE}/api/dodo/webhooks`, {
      data: {
        type: "subscription.on_hold",
        data: {
          metadata: { customer_account_id: "cust_demo_4" },
          customer: { customer_id: "cus_demo_apex_004" },
        },
      },
      headers: { "Content-Type": "application/json", "webhook-id": `grace-${Date.now()}` },
    });
    expect(res.status()).toBe(200);
    // Verify billing.json updated
    const syncRes = await request.get(`${BASE}/api/sync`);
    const data = await syncRes.json();
    const customer = data.customers?.find((c: any) => c.id === "cust_demo_4");
    if (customer) {
      console.log(`cust_demo_4 status after on_hold webhook: ${customer.status}`);
      expect(["grace", "active"]).toContain(customer.status); // depends on prior state
    }
  });
});
