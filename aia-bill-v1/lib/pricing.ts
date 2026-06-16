// ─── Pricing Calculator — exact spec from PRD ────────────────────────────────

export type Plan = "base" | "premium";
export type Cycle = "quarterly" | "annual";

export interface PlanCosts {
  infra: number;    // per month
  perBill: number;  // per bill
  perBank: number;  // per bank statement per month
  months: number;   // 3 or 12
  label: string;
}

export const PRICING: Record<Plan, Record<Cycle, PlanCosts>> = {
  base: {
    quarterly: { infra: 133.33, perBill: 7.33, perBank: 46.67, months: 3, label: "Base — Quarterly" },
    annual:   { infra: 106.67, perBill: 5.87, perBank: 37.33, months: 12, label: "Base — Annual" },
  },
  premium: {
    quarterly: { infra: 133.33, perBill: 8.27, perBank: 146.67, months: 3, label: "Premium — Quarterly" },
    annual:   { infra: 106.67, perBill: 6.61, perBank: 117.33, months: 12, label: "Premium — Annual" },
  },
};

export interface PriceBreakdown {
  plan: Plan;
  cycle: Cycle;
  billsPerMonth: number;
  banks: number;
  infraTotal: number;
  billsTotal: number;
  banksTotal: number;
  subtotal: number;
  finalPrice: number;
  months: number;
}

export function calculatePrice(
  plan: Plan,
  cycle: Cycle,
  billsPerMonth: number,
  banks: number,
): PriceBreakdown {
  const cfg = PRICING[plan][cycle];
  const billsPerPeriod = billsPerMonth * cfg.months;
  const banksPerPeriod = banks; // banks is already per-month, but spec says "per bank (per month)"

  // spec: final_price = months × [ infra + (per_bill × bills_per_month) + (per_bank × banks) ]
  const infraTotal = cfg.infra * cfg.months;
  const billsTotal = cfg.perBill * billsPerMonth * cfg.months;
  const banksTotal = cfg.perBank * banks * cfg.months;
  const raw = infraTotal + billsTotal + banksTotal;

  return {
    plan,
    cycle,
    billsPerMonth,
    banks,
    infraTotal: Math.round(infraTotal * 100) / 100,
    billsTotal: Math.round(billsTotal * 100) / 100,
    banksTotal: Math.round(banksTotal * 100) / 100,
    subtotal: Math.round(raw * 100) / 100,
    finalPrice: Math.round(raw),
    months: cfg.months,
  };
}

export function planCode(plan: Plan, cycle: Cycle): string {
  return `${plan}-${cycle}`;
}

export const PLAN_LABELS: Record<Plan, string> = {
  base: "Base",
  premium: "Premium",
};

export const CYCLE_LABELS: Record<Cycle, string> = {
  quarterly: "Quarterly (3 months)",
  annual: "Annual (12 months)",
};
