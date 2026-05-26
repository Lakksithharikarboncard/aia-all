# Amount Receivable Card Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign the `Receivables` component in `OverviewTab.tsx` to use flowing bucket chips and a clean outstanding-accounts list — removing absolute-position hacks, zero-value columns, and noisy inline status text.

**Architecture:** Single function rewrite inside `components/admin/OverviewTab.tsx`. No new files. The `Receivables` function is self-contained; all helpers (`formatINR`, `RECEIVABLE_STATUSES`, `RECEIVABLE_BAR`) stay in the same file. The outer card shell (`bg-white border border-border-default rounded-[3px]`) and all prop signatures remain unchanged.

**Tech Stack:** React 19, TypeScript, Tailwind CSS 4, Next.js 16 (client component)

---

### Task 1: Rewrite the bucket section — chips replacing the 3-column grid

**Files:**
- Modify: `components/admin/OverviewTab.tsx` — `Receivables` function, lines 409–538

- [ ] **Step 1: Replace the bucket grid markup**

In `OverviewTab.tsx`, find the `Receivables` function. Replace the entire `{/* Breakdown — 3 buckets side by side */}` section (the `<div className="grid grid-cols-1 sm:grid-cols-3 border-t border-border-divider">` block) with the chips row below.

The chips row renders **only** buckets where `b.count > 0`. If no bucket has count > 0, the entire section is hidden.

```tsx
{/* Bucket chips — only render non-zero buckets */}
{buckets.some((b) => b.count > 0) && (
  <div className="flex flex-wrap gap-2 px-5 pb-4">
    {buckets
      .filter((b) => b.count > 0)
      .map((b) => (
        <button
          key={b.status}
          type="button"
          onClick={() => onGoToCustomers(b.status)}
          className="inline-flex items-center gap-2 px-3 py-2 border border-border-default rounded-[3px] hover:bg-surface-hover focus-visible:outline-none focus-visible:bg-surface-hover transition-colors text-left"
        >
          <span
            className={cn("inline-block w-2 h-2 rounded-full shrink-0", RECEIVABLE_BAR[b.tone])}
            aria-hidden="true"
          />
          <span className="text-sm text-text-secondary">{b.label}</span>
          <span className="text-sm font-semibold text-text-heading tabular-nums">
            {formatINR(b.total)}
          </span>
          <span className="text-xs text-text-disabled tabular-nums">
            · {b.count}
          </span>
        </button>
      ))}
  </div>
)}
```

- [ ] **Step 2: Remove the now-unused `RECEIVABLE_BAR` type cast for border-t**

The `border-t border-border-divider` that was on the grid is now gone. The chips row has no top border — it sits directly below the header with `pb-4` spacing. Confirm the header `<div>` still ends with `pb-3` (we will adjust in Task 2).

- [ ] **Step 3: Verify the file still compiles**

```bash
cd /root/Codespace/ember/aia/korefi-billing && npx tsc --noEmit 2>&1 | head -30
```

Expected: no errors related to `Receivables`.

---

### Task 2: Increase header breathing room

**Files:**
- Modify: `components/admin/OverviewTab.tsx` — header `<div>` inside `Receivables`

- [ ] **Step 1: Change header bottom padding from `pb-3` to `pb-4`**

Find this line inside `Receivables`:
```tsx
<div className="flex items-end justify-between px-5 pt-4 pb-3">
```
Change to:
```tsx
<div className="flex items-end justify-between px-5 pt-4 pb-4">
```

This adds 4px more space between the grand-total line and the chips row, giving the header room to breathe without leaving dead space.

---

### Task 3: Rewrite the outstanding accounts list — remove inline status text

**Files:**
- Modify: `components/admin/OverviewTab.tsx` — `{/* Top outstanding accounts */}` block inside `Receivables`

- [ ] **Step 1: Replace the outstanding accounts `<ul>` rows**

Find the `{topPending.map((c) => (` block. Replace the inner `<button>` contents to remove the `· {c.status.replace(/_/g, " ")}` span. The dot color already encodes the status — text is redundant.

Replace the entire inner `<button>` with:

```tsx
<button
  type="button"
  onClick={() => onSelectCustomer(c.id)}
  className="w-full flex items-center justify-between py-2.5 text-left hover:bg-surface-hover rounded-[3px] -mx-1 px-1 transition-colors"
>
  <div className="flex items-center gap-2.5 min-w-0">
    <span
      className={cn(
        "inline-block w-2 h-2 rounded-full shrink-0",
        c.status === "grace" ? "bg-status-warning" : "bg-status-attention"
      )}
      aria-hidden="true"
    />
    <span className="text-sm text-text-heading truncate">
      {c.companyName}
    </span>
  </div>
  <span className="text-sm font-semibold text-text-heading tabular-nums shrink-0 pl-4">
    {formatINR(c.packageAmount ?? 0)}
  </span>
</button>
```

Changes from current:
- `py-2` → `py-2.5` (more row height)
- `rounded-[2px]` → `rounded-[3px]` (uniform with card spec)
- `w-1.5 h-1.5` dot → `w-2 h-2` (matches chip dots)
- `gap-2` → `gap-2.5`
- `pl-3` → `pl-4` (more separation between name and amount)
- Removed: `<span className="text-[11px] text-text-secondary capitalize shrink-0">· {c.status.replace(/_/g, " ")}</span>`

- [ ] **Step 2: Verify the file still compiles**

```bash
cd /root/Codespace/ember/aia/korefi-billing && npx tsc --noEmit 2>&1 | head -30
```

Expected: no errors.

---

### Task 4: Remove dead code — absolute-position left-bar helpers

**Files:**
- Modify: `components/admin/OverviewTab.tsx` — top of `Receivables` section

- [ ] **Step 1: Remove `RECEIVABLE_BAR` record if it is now only used by chips**

`RECEIVABLE_BAR` is still used by chips (dot background colors). Keep it. Confirm no other remnant of the old left-bar pattern remains — specifically the `<span className="absolute left-0 top-4 bottom-4 w-[3px] ...">` span. It should have been removed in Task 1. Do a quick grep to confirm:

```bash
grep -n "absolute left-0" /root/Codespace/ember/aia/korefi-billing/components/admin/OverviewTab.tsx
```

Expected: no output (0 matches).

- [ ] **Step 2: Final compile check**

```bash
cd /root/Codespace/ember/aia/korefi-billing && npx tsc --noEmit 2>&1 | head -30
```

Expected: clean.

---

### Task 5: Visual verification

**Files:** none changed — verification only

- [ ] **Step 1: Start the dev server if not already running**

```bash
cd /root/Codespace/ember/aia/korefi-billing && npm run dev &
sleep 4
```

- [ ] **Step 2: Open the dashboard and verify the Amount Receivable card**

Navigate to `http://localhost:5660`. Check:
1. The Amount Receivable card shows the grand total header with breathing room
2. Only populated buckets (count > 0) appear as chips — no empty/₹0 chips
3. Outstanding accounts list rows show dot + company name + amount — no `· payment pending` text
4. Clicking a chip navigates to the filtered customers list
5. Clicking an account row opens the customer detail

- [ ] **Step 3: Verify zero-data state**

If all buckets happen to be zero (e.g., filter to a state where no customers are payment_pending/grace/renewal), confirm the chips row disappears entirely and the card shows only the header.

- [ ] **Step 4: Run E2E smoke test**

```bash
cd /root/Codespace/ember/aia/korefi-billing && npx playwright test e2e/02-admin-dashboard.spec.ts --reporter=line 2>&1 | tail -20
```

Expected: all 6 tests pass.

---

### Task 6: Commit

- [ ] **Step 1: Stage and commit**

```bash
cd /root/Codespace/ember/aia/korefi-billing && git add components/admin/OverviewTab.tsx docs/superpowers/specs/2026-05-25-receivables-card-redesign.md docs/superpowers/plans/2026-05-25-receivables-card-redesign.md
git commit -m "redesign: Amount Receivable card — chips layout, clean outstanding list"
```
