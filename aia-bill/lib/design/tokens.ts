// Design tokens — black & white theme
// Primary action and brand are near-black; status colors retain semantic meaning.

export const tokens = {
  surfaces: {
    bg: "var(--color-surface-bg)",
    container: "var(--color-surface-container)",
    elevated: "var(--color-surface-elevated)",
    hover: "var(--color-surface-hover)",
    selected: "var(--color-surface-selected)",
    inverse: "var(--color-surface-inverse)",
    mask: "var(--color-surface-mask)",
  },
  borders: {
    default: "var(--color-border-default)",
    strong: "var(--color-border-strong)",
    divider: "var(--color-border-divider)",
    focus: "var(--color-border-focus)",
  },
  text: {
    heading: "var(--color-text-heading)",
    body: "var(--color-text-body)",
    secondary: "var(--color-text-secondary)",
    disabled: "var(--color-text-disabled)",
    inverted: "var(--color-text-inverted)",
    link: "var(--color-text-link)",
  },
  action: {
    primary: "var(--color-action-primary)",
    primaryHover: "var(--color-action-primary-hover)",
    primaryActive: "var(--color-action-primary-active)",
    secondary: "var(--color-action-secondary)",
    secondaryHover: "var(--color-action-secondary-hover)",
  },
  status: {
    success: "var(--color-status-success)",
    info: "var(--color-status-info)",
    warning: "var(--color-status-warning)",
    error: "var(--color-status-error)",
    pending: "var(--color-status-pending)",
  },
  brand: {
    red: "var(--color-brand-red)",
  },
  radius: {
    sm: "var(--radius-sm)",
    md: "var(--radius-md)",
    lg: "var(--radius-lg)",
  },
  shadow: {
    container: "var(--shadow-container)",
    popover: "var(--shadow-popover)",
    modal: "var(--shadow-modal)",
  },
} as const;
