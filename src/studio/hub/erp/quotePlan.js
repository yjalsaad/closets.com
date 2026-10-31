// src/erp/quotePlan.js — [ERP-OF 2026-11-10] the quote's deposit / balance come from a PAYMENT PLAN, not from a hard-coded 70 %.
// Pure helpers (no React, no fetching). Owner decision: the default plan stays 50 / 30 / 20 - deposit 50 % - and its percentages are editable
// (erp_default_plan_pcts_set, per order erp_so_plan_edit, per quote customer_quotes.config.payment_plan).
//
//   deposit % of a plan = the percentage of its FIRST milestone (the advance taken at quote approval)
//   balance            = everything else (the remaining milestones), always the exact remainder of the total
//   once the quote has a sales order, THAT order's milestones decide what is printed (never a different number than the invoices).
import { r3 } from '../pricingMath';

export const DEFAULT_DEPOSIT_PCT = 50;

const pctOf = (v) => { const n = Number(v); return Number.isFinite(n) ? n : null; };
const clamp = (n) => Math.max(0, Math.min(100, n));

// milestones: [{ seq, pct }, ...] in any order; returns the first one's pct, or null when unusable
export function planDepositPct(milestones) {
  if (!Array.isArray(milestones) || !milestones.length) return null;
  const first = [...milestones].filter((m) => m && pctOf(m.pct) != null).sort((a, b) => (Number(a.seq) || 0) - (Number(b.seq) || 0))[0];
  const p = first ? pctOf(first.pct) : null;
  return p != null && p > 0 && p <= 100 ? p : null;
}

// erp_config_get() payload -> the default plan's deposit % (null when the payload has no usable default plan)
export function defaultPlanDeposit(cfg) {
  const plans = cfg && Array.isArray(cfg.payment_plans) ? cfg.payment_plans : [];
  const p = plans.find((x) => x && x.is_default && x.active !== false);
  return p ? planDepositPct(p.milestones) : null;
}

// The editable Deposit % box: a blank / invalid entry falls back to the plan default; a deliberate 0 stays 0.
export function resolveDepositPct(entered, defaultPct) {
  const d = pctOf(defaultPct);
  const fallback = d != null ? clamp(d) : DEFAULT_DEPOSIT_PCT;
  if (entered === '' || entered == null) return fallback;
  const n = pctOf(entered);
  return n == null ? fallback : clamp(n);
}

// What the quotation prints. soPlan = { ms: [{ seq, pct }] } of the quote's sales order (when it has one) wins over the typed deposit %.
export function quoteSplit({ total, depositPct, soPlan }) {
  const t = Number(total) || 0;
  const fromOrder = soPlan && Array.isArray(soPlan.ms) ? planDepositPct(soPlan.ms) : null;
  const pct = fromOrder != null ? fromOrder : clamp(pctOf(depositPct) == null ? DEFAULT_DEPOSIT_PCT : pctOf(depositPct));
  const deposit = r3(t * pct / 100);
  return { pct, deposit, balance: r3(t - deposit), source: fromOrder != null ? 'order' : 'quote' };
}
