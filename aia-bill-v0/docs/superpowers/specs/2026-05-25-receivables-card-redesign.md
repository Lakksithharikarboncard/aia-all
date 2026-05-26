# Amount Receivable Card Redesign

**Date:** 2026-05-25  
**File:** `components/admin/OverviewTab.tsx` — `Receivables` component  
**Status:** Approved

## Goal

Redesign the Amount Receivable dashboard card to have more breathing room while eliminating all empty/zero-value visual clutter. Cleaner layout with no structural hacks.

## Problems with Current Design

- Absolute-positioned `w-[3px]` left bar on bucket columns requires `pl-2.5` offsets on every child element — fragile and hard to read
- Three-column grid always renders all 3 buckets even when amount = ₹0 and count = 0
- "Top outstanding" list appends `· payment pending` inline text alongside company name — visually noisy
- Status already communicated by dot color; text is redundant

## New Design

### Header (unchanged structure, slightly more padding)

- 11px uppercase label: "Amount Receivable"
- 3xl bold grand total + xs muted subtext "across N customers"
- `pb-4` bottom padding (was `pb-3`)

### Bucket Chips (replaces 3-column grid)

Render **only** buckets where `count > 0` as horizontal flowing pills.

Each chip:
- `border border-border-default rounded-[3px] px-3 py-2`
- Colored dot (tone-matched) + label + bold amount + muted count
- Clickable → filters customers list to that status
- If all buckets are zero: entire chips row is hidden (no border-t, no empty space)

Tones: `payment_pending` → attention, `grace` → warning, `renewal` → accent

### Outstanding Accounts List (below `border-t divider`)

Shown only when `topPending.length > 0`.

Header row: "Top outstanding" label (left) + "View all →" link (right).

Each account row:
- Colored dot (attention/warning by status) — replaces inline `· payment pending` text
- Company name (truncated, `text-text-heading`)
- Amount right-aligned bold
- `py-2.5` row height, hover highlight, click → customer detail

## Adaptive Behaviour

| Data state | Renders |
|---|---|
| Buckets all zero, no outstanding | Header only (grand total = ₹0) |
| Some buckets non-zero, no outstanding | Header + chips |
| No buckets, but outstanding exists | Header + outstanding list (no chips row) |
| Full data | Header + chips + outstanding list |

## What Is Removed

- Absolute-position left-bar pattern and associated `pl-2.5` padding hacks
- Zero-count/zero-amount bucket columns
- Inline status text (`· payment pending`) in outstanding rows

## Files Changed

- `components/admin/OverviewTab.tsx` — `Receivables` function only
