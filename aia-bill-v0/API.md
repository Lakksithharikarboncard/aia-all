# Korefi Billing — API Endpoints

## Auth

### `POST /api/auth/send-otp`
Sends a one-time password to the provided email address. Only `@karboncard.com` domain is allowed.

**Body:**
```json
{ "email": "user@karboncard.com" }
```

**Response:**
```json
{ "ok": true, "otp": "000000", "email": "user@karboncard.com" }
```

---

### `POST /api/auth/verify-otp`
Verifies the OTP and creates a session cookie.

**Body:**
```json
{ "email": "user@karboncard.com", "otp": "000000" }
```

**Response:**
```json
{ "ok": true }
```

---

### `POST /api/auth/logout`
Destroys the session and redirects to `/auth/login`.

**Response:** 302 Redirect to `/auth/login`

---

## Customers

### `GET /api/customers/[customerId]`
Returns a single customer by internal ID.

**Response:**
```json
{ "customer": { ... } }
```

---

### `GET /api/customers/[customerId]/checkout`
Public endpoint (no auth). Returns or creates a Dodo checkout URL for the customer.

**Query params (optional):**
- `name` — updated customer name from signup form
- `email` — updated customer email from signup form

**Response:**
```json
{ "checkout_url": "https://test.dodopayments.com/checkout/..." }
```

---

## Dodo Payments

### `POST /api/dodo/checkout`
Creates a Dodo product, Dodo customer, and checkout session in one call.

**Body:**
```json
{
  "customerAccountId": "cust_123",
  "customerData": { ... }
}
```

**Response:**
```json
{
  "signupUrl": "https://app.aiaccountant.com/sign-up?ref=cust_123",
  "checkoutUrl": "https://test.dodopayments.com/checkout/...",
  "dodoCustomerId": "cus_xxx",
  "dodoProductId": "pdt_xxx"
}
```

---

### `POST /api/dodo/customers`
Creates a Dodo customer from primary contact info.

**Body:**
```json
{
  "primaryName": "Rajesh Sharma",
  "primaryEmail": "rajesh@acme.in",
  "primaryPhone": "+919876543210"
}
```

**Response:**
```json
{ "dodoCustomerId": "cus_xxx" }
```

---

### `POST /api/dodo/products`
Creates a Dodo product from a plan preset.

**Body:**
```json
{
  "name": "Growth",
  "price": 3999,
  "billingFrequency": "monthly",
  "description": "Full-featured plan"
}
```

**Response:**
```json
{ "dodoProductId": "pdt_xxx" }
```

---

### `POST /api/dodo/customer-portal`
Creates a Dodo customer portal session for managing subscriptions.

**Body:**
```json
{ "customerAccountId": "cust_123" }
```

**Response:**
```json
{ "url": "https://test.dodopayments.com/customer-portal/..." }
```

---

### `POST /api/dodo/resync/[customerId]`
Fetches the latest subscription status from Dodo and syncs it back to the local store.

**Response:**
```json
{
  "status": "active",
  "dodoStatus": "active",
  "subscriptionId": "sub_xxx"
}
```

---

### `POST /api/dodo/webhooks`
Receives Dodo webhook events. Verifies signature if `DODO_PAYMENTS_WEBHOOK_SECRET` is set.

**Handled events:**
- `subscription.active`
- `subscription.renewed`
- `subscription.on_hold`
- `subscription.failed`
- `subscription.cancelled`
- `subscription.expired`

**Response:**
```json
{ "ok": true }
```

---

## Sync

### `GET /api/sync`
Returns the current server-side billing snapshot.

**Response:**
```json
{
  "customers": [ ... ],
  "auditLog": [ ... ]
}
```

---

### `POST /api/sync`
Pushes client-side localStorage data to the server store. Only writes if the server store is empty.

**Body:**
```json
{
  "customers": [ ... ],
  "auditLog": [ ... ]
}
```

**Response:**
```json
{ "ok": true, "seeded": true }
```
