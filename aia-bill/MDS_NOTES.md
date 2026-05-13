# MDS Design Language Notes

## Confirmed from live site:
- Page-shell layout: top nav + vertical nav + content area (same pattern we use)
- Navigation: list-group components with indented hierarchy, active state highlighted
- Tabs: underline pattern, "flat" button style
- Buttons: variants include flat, icon-only; used inside tabs as navigation links
- Dark banner at top: promotional message area
- Components documented via iframed HTML pages from @mds packages

## Color (from user spec, verified against MDS site branding):
- Brand: #E81C00 (Morningstar red)
- Surface bg: #F4F5F6
- Surface inverse: #1F2937 (top nav)
- Focus ring: #0073E6 (blue, not brand red)

## Typography:
- Base: 14px (confirmed matching morningstar.com density)
- Font: Univers Next / Univers / Inter stack

## Component details from spec:
- Button: primary=red fill, secondary=white+strong border, tertiary=link red text
- Input: 32px height, 1px border, 2px blue focus ring
- Container: 3px radius, header 44px, body 16px padding
- Table: 36px rows, sortable headers 11px uppercase
- Tag: 20px height, 11px text (separate from StatusIndicator dot pattern)
- Alert: white bg, 4px left accent, no tinted background
- Modal: 480px default, 48px header, dark scrim 40%
- Tabs: underline, 2px bottom border brand-red on active

## Status mapping (MDS financial conventions):
- active → positive (green #00874D)
- trial/renewal → info (blue #0060C1)
- payment_pending/grace → warning (amber #B25D00)
- frozen/inactive → negative (red #C62828)
- lead/draft → pending (grey #5E6B79)
