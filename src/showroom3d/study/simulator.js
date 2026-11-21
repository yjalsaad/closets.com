/* The stress-test calculator of the study (section 12.5.6, year 4 base). PURE. The formula is the study's own; only its constants are data (block.base),
 * so the owner can edit them. rev: base revenue; cogsPct: raw materials % of revenue; intRate: loan interest %; otherOpexPct: other operating costs % of revenue;
 * depreciation; loan: opening loan balance of the year; principal: yearly repayment; maint: maintenance capex; tax: income tax %; minDscr: bank minimum. */
export function simulate(base, { revChange = 0, cogsPct = base.cogsPct, intRate = base.intRate } = {}) {
  const rev = base.rev * (1 + revChange / 100);
  const ebitda = rev - rev * (cogsPct / 100) - rev * (base.otherOpexPct / 100);
  const interest = base.loan * (intRate / 100);
  const ebt = ebitda - base.depreciation - interest;
  const tax = ebt > 0 ? ebt * (base.tax / 100) : 0;
  const net = ebt - tax;
  const cfads = ebitda - tax - base.maint, service = base.principal + interest;
  const dscr = service > 0 ? cfads / service : 0;
  const status = net > 0 && dscr >= base.minDscr ? 'strong' : net > 0 ? 'pressure' : 'loss';
  return { rev, ebitda, net, dscr, status };
}
export const fmtM = (n) => '$' + (n / 1e6).toFixed(2) + 'M';
export const fmtX = (n) => n.toFixed(2) + 'x';
/** USD / IQD display for a stat: mirrors the study's own switcher (USD >= 1M -> $12.5M, else $1,234; IQD in millions with 1 decimal) */
export function fmtMoney(usd, cur, rate = 1320) {
  if (cur === 'IQD') return (Math.round((usd * rate) / 1e5) / 10).toLocaleString('en-US', { maximumFractionDigits: 1 }) + ' م.د.ع';
  if (usd >= 1e6) return '$' + (usd / 1e6).toFixed(2).replace(/\.00$/, '') + 'M';
  return '$' + usd.toLocaleString('en-US');
}
