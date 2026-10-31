// src/ui.js — the shared UI kit for Bonsai Hub.
//
// WHY THIS FILE EXISTS
// -------------------
// The design-system primitives (buttons, tables, KPI cards) lived inside App.js and
// were never exported. So every module hand-rolled its own: 51 modules declared their
// own `btn`, 34 their own `card`, 24 their own `Stat`. That is the real reason screens
// drifted apart visually, and why a theme change did not reach every page.
//
// Everything here is TOKEN-ONLY — no hardcoded hex. Change a token in App.js and every
// screen that imports from here follows automatically, in both light and dark.
//
// See DESIGN.md for the rules these encode:
//   · one filled primary button per section; everything else outlined or icon-only
//   · colour signals STATUS; if it is not status, it is gray
//   · cards get shadow, not heavy borders; a colour border means "selected"
//   · bold is for key values (IDs, money) — not for whole rows
//
import React, { useState, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
// Apple-grade motion: interruptible springs, momentum projection and
// rubber-banding. Zero dependencies — see src/motion.js for the reasoning.
import { spring, project, rubberband, createVelocityTracker, SPRING } from './motion';

/* ═══════════════════════════════════════════════════════════════════════════
   BUTTONS — one filled primary per section. Everything else steps back.
   ═══════════════════════════════════════════════════════════════════════════ */
const _BTN = {
  cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap', boxSizing: 'border-box',
  transition: 'background var(--dur-fast) var(--ease-move), box-shadow var(--dur-fast) var(--ease-move), transform var(--dur-instant) linear',
  outline: 'none',
};
export const BTN = {
  // PRIMARY — solid brand. [UI-STD 2026-10-30] Flat fill (no gradient, no glow — the glow was
  // rgba(99,91,255): purple, leaked from the old palette). White on Deep Blue #1D4ED8 is 6.7:1.
  primary: { ..._BTN, background: 'var(--color-brand)', color: '#fff',
    border: '1px solid var(--color-brand)', borderRadius: 'var(--radius-md)',
    padding: '10px 18px', minHeight: 40, fontSize: 'var(--text-base)', fontWeight: 600,
    boxShadow: 'none' },
  // SECONDARY — outlined. The default for everything that is not THE action.
  secondary: { ..._BTN, background: 'var(--bg-2)', color: 'var(--text-1)',
    border: '1px solid var(--border-2)', borderRadius: 'var(--radius-md)',
    padding: '10px 16px', minHeight: 40, fontSize: 'var(--text-base)', fontWeight: 600,
    boxShadow: 'none' },
  small: { ..._BTN, background: 'var(--bg-2)', color: 'var(--text-1)',
    border: '1px solid var(--border-2)', borderRadius: 'var(--radius-sm)',
    padding: '7px 12px', minHeight: 32, fontSize: 'var(--text-small)', fontWeight: 600 },
  // TERTIARY — text button for low-emphasis actions (master prompt Phase 7). [UI-STD 2026-10-30]
  tertiary: { ..._BTN, background: 'transparent', color: 'var(--color-brand-text)',
    border: '1px solid transparent', borderRadius: 'var(--radius-md)',
    padding: '10px 12px', minHeight: 40, fontSize: 'var(--text-base)', fontWeight: 600 },
  // ICON — icon-only (always give it aria-label + title).
  icon: { ..._BTN, background: 'transparent', border: '1px solid transparent',
    borderRadius: 'var(--radius-sm)', padding: 0, width: 36, height: 36, minWidth: 36,
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    fontSize: 'var(--text-base)', color: 'var(--text-2)' },
  success: { ..._BTN, background: 'var(--color-success)', color: '#fff',
    border: '1px solid var(--color-success)', borderRadius: 'var(--radius-md)',
    padding: '10px 16px', minHeight: 40, fontSize: 'var(--text-base)', fontWeight: 600 },
  danger: { ..._BTN, background: 'var(--color-danger-bg)', color: 'var(--color-danger)',
    border: '1px solid var(--color-danger)', borderRadius: 'var(--radius-md)',
    padding: '10px 14px', minHeight: 40, fontSize: 'var(--text-base)', fontWeight: 600 },
};

/* ═══ FORM ═══ */
export const INPUT = {
  // [UI-STD 2026-10-30] --border-control (>= 3:1) — an input's edge must be visible (WCAG 1.4.11);
  // --border-2 was 1.55:1. Falls back to --border-2 where the v3 layer is absent.
  background: 'var(--bg-2)', border: '1px solid var(--border-control, var(--border-2))', borderRadius: 'var(--radius-md)',
  padding: '11px 14px', minHeight: 44, color: 'var(--text-1)', fontFamily: 'inherit',
  fontSize: 'var(--text-base)', outline: 'none', width: '100%', boxSizing: 'border-box',
  transition: 'border-color var(--dur-fast) var(--ease-move), box-shadow var(--dur-fast) var(--ease-move)',
};
export const LABEL = {
  fontSize: 'var(--text-label)', fontWeight: 700, color: 'var(--text-2)',
  textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 6, userSelect: 'none',
};

/* ═══ TABLE — 52px rows, quiet headers, tabular numbers ═══ */
export const TH = {
  padding: '14px 18px', textAlign: 'left', fontSize: 'var(--text-small)', fontWeight: 600,
  color: 'var(--text-2)', letterSpacing: '0',
  whiteSpace: 'nowrap', userSelect: 'none', background: 'var(--bg-2)',
  borderBottom: '1px solid var(--border)',
};
export const TD = {
  padding: '16px 18px', fontSize: 'var(--text-base)', fontWeight: 400, color: 'var(--text-1)',
  verticalAlign: 'middle', fontVariantNumeric: 'tabular-nums',
  borderBottom: '1px solid var(--border)',
};
// The ONE thing worth making bold in a row: the ID, or the money.
export const TD_KEY = { ...TD, fontWeight: 700 };

/* ═══ SURFACES ═══ */
export const CARD = {
  background: 'var(--bg-2)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)',
  padding: 'var(--card-pad)', boxShadow: 'none', // [UI-STD 2026-10-30] cards are flat; shadows are for floating layers
};

/* ═══ PAGE HEADER — the one masthead every module starts with. ═══
   Title left (optional small brand-tinted icon tile), actions right.
   Keeps every page's top edge identical so modules stop drifting apart. */
// [UI-STD3 2026-10-30] accent: optional department identity (e.g. 'var(--dept-finance)') — a 3px inline-start bar
// beside the title and a tinted icon tile. Never a background. Actions stay on the title row (end-aligned) and keep
// end alignment when a narrow screen wraps them under the title.
export function PageHeader({ title, subtitle, actions, icon, tabs, active, onTab, sticky, accent }) {
  return (
    <div data-kit="PageHeader" style={{
      marginBottom: 'var(--space-6)',
      ...(sticky ? { position: 'sticky', top: 0, zIndex: 20, background: 'var(--bg)',
        paddingTop: 'var(--space-3)', marginInline: 'calc(-1 * var(--space-2))',
        paddingInline: 'var(--space-2)' } : {}),
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        gap: 'var(--space-4)', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', minWidth: 0, flex: '1 1 320px',
          ...(accent ? { borderInlineStart: '3px solid ' + accent, paddingInlineStart: 'var(--space-3)' } : {}) }}>
          {icon != null && (
            <div aria-hidden="true" style={{ width: 40, height: 40, flexShrink: 0,
              borderRadius: 'var(--radius-md)', background: accent ? 'color-mix(in srgb, ' + accent + ' 14%, transparent)' : 'var(--color-brand-muted)',
              color: accent || 'var(--color-brand-text)', display: 'inline-flex', alignItems: 'center',
              justifyContent: 'center', fontSize: 'var(--text-large)' }}>{icon}</div>
          )}
          <div style={{ minWidth: 0 }}>
            <h1 style={{ margin: 0, fontSize: 'var(--text-heading)', fontWeight: 700,
              color: 'var(--text-1)', letterSpacing: '-0.02em', lineHeight: 1.15,
              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{title}</h1>
            {subtitle && <div style={{ fontSize: 'var(--text-small)', color: 'var(--text-3)',
              marginTop: 2 }}>{subtitle}</div>}
          </div>
        </div>
        {actions && <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap',
          alignItems: 'center', justifyContent: 'flex-end', marginInlineStart: 'auto', flexShrink: 0 }}>{actions}</div>}
      </div>
      {tabs && tabs.length > 0 && (
        <div style={{ marginTop: 'var(--space-4)' }}>
          <Tabs tabs={tabs} active={active} onChange={onTab} />
        </div>
      )}
    </div>
  );
}

/* ═══ TABS — flat segmented control. No gradient, no glow: the active tab is a
   solid brand-tinted pill with brand text, per the brand rule (blue = action). ═══ */
// Accessible tabs (WAI-ARIA Tabs pattern): role=tablist/tab + aria-selected, roving
// tabindex (only the active tab is Tab-focusable), and Left/Right/Up/Down/Home/End
// arrow-key navigation that activates as it moves. Pass `idBase` to link each tab to
// its role="tabpanel" via aria-controls/id (put id={`${idBase}-panel-<id>`} +
// role="tabpanel" aria-labelledby={`${idBase}-tab-<id>`} on your panel).
export function Tabs({ tabs = [], active, onChange, style, idBase, ariaLabel }) {
  const norm = tabs.map((t) => (typeof t === 'object' ? t : { id: t, label: t }));
  const refs = React.useRef({});
  const curIdx = Math.max(0, norm.findIndex((t) => t.id === active));
  const go = (i) => { const t = norm[(i + norm.length) % norm.length]; if (!t) return; onChange && onChange(t.id); const el = refs.current[t.id]; if (el && el.focus) el.focus(); };
  const onKey = (e) => {
    const k = e.key;
    if (k === 'ArrowRight' || k === 'ArrowDown') { e.preventDefault(); go(curIdx + 1); }
    else if (k === 'ArrowLeft' || k === 'ArrowUp') { e.preventDefault(); go(curIdx - 1); }
    else if (k === 'Home') { e.preventDefault(); go(0); }
    else if (k === 'End') { e.preventDefault(); go(norm.length - 1); }
  };
  return (
    <div role="tablist" aria-label={ariaLabel || 'Views'} aria-orientation="horizontal" onKeyDown={onKey}
      style={{ display: 'inline-flex', gap: 3, padding: 4, maxWidth: '100%',
        background: 'var(--bg-3)', borderRadius: 'var(--radius-full)', overflowX: 'auto', ...style }}>
      {norm.map((tab) => {
        const isActive = tab.id === active;
        const count = tab.count;
        return (
          <button key={tab.id} ref={(el) => { refs.current[tab.id] = el; }}
            role="tab" aria-selected={isActive} tabIndex={isActive ? 0 : -1}
            id={idBase ? idBase + '-tab-' + tab.id : undefined}
            aria-controls={idBase ? idBase + '-panel-' + tab.id : undefined}
            onClick={() => onChange && onChange(tab.id)}
            style={{ padding: '8px 16px', fontSize: 'var(--text-small)', fontWeight: isActive ? 700 : 600,
              fontFamily: 'inherit', whiteSpace: 'nowrap', cursor: 'pointer', flex: '0 0 auto',
              background: isActive ? 'var(--bg-2)' : 'transparent',
              color: isActive ? 'var(--text-1)' : 'var(--text-2)',
              boxShadow: isActive ? 'var(--shadow-xs)' : 'none',
              border: 'none', borderRadius: 'var(--radius-full)', outlineOffset: 2,
              transition: 'background var(--dur-fast) var(--ease-move), color var(--dur-fast) var(--ease-move), box-shadow var(--dur-fast) var(--ease-move)',
              display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            {tab.label}
            {count !== null && count !== undefined && (
              <span style={{ background: isActive ? 'var(--color-brand)' : 'var(--text-3)',
                color: '#fff', borderRadius: 999, padding: '0 6px', fontSize: 'var(--text-xs)',
                fontWeight: 700, minWidth: 16, textAlign: 'center',
                fontVariantNumeric: 'tabular-nums' }}>{count}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}

export function SectionCard({ children, title, subtitle, action, color, noPad }) {
  return (
    <div style={{ background: 'var(--bg-2)', border: '1px solid var(--border)',
      borderRadius: 'var(--radius-lg)', overflow: 'hidden', marginBottom: 'var(--space-6)',
      boxShadow: 'none' }}>{/* [UI-STD] flat card */}
      {color && <div style={{ height: 3, background: color }} />}
      {(title || action) && (
        <div style={{ padding: '18px var(--card-pad)', borderBottom: '1px solid var(--border)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
          <div style={{ minWidth: 0 }}>
            {title && <div style={{ fontSize: 'var(--text-title)', fontWeight: 600, color: 'var(--text-1)' }}>{title}</div>}
            {subtitle && <div style={{ fontSize: 'var(--text-small)', color: 'var(--text-3)', marginTop: 3 }}>{subtitle}</div>}
          </div>
          {action}
        </div>
      )}
      <div style={noPad ? {} : { padding: 'var(--card-pad)' }}>{children}</div>
    </div>
  );
}

/* ═══ KPI CARD — the NUMBER is the hierarchy, not the colour. ═══ */
export function Stat({ label, value, accent, icon, sub, trend, trendInvert, onClick, dept }) {
  const col = kpiAccent(accent, value, dept || 'var(--color-brand)'); // [UI-STD3] rail = dept colour; red/amber only for a live alert
  return (
    <div className="u-stat" role={onClick ? "button" : undefined} tabIndex={onClick ? 0 : undefined} onKeyDown={onClick ? onKeyActivate : undefined} onClick={onClick}
      style={{ position: 'relative', background: 'var(--bg-2)', border: '1px solid var(--border)',
        borderRadius: 'var(--radius-lg)', padding: 'var(--card-pad)', overflow: 'hidden',
        flex: 1, minWidth: 'min(180px, 100%)', boxShadow: 'none', // [UI-STD] flat card
        cursor: onClick ? 'pointer' : 'default',
        transition: 'transform var(--dur-normal) var(--ease-move), box-shadow var(--dur-normal) var(--ease-move)' }}
      onMouseEnter={e => { if (onClick) { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = 'var(--shadow-md)'; } }}
      onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'var(--shadow-sm)'; }}>
      {/* accent rail — the card's only colour */}
      <div style={{ position: 'absolute', insetInlineStart: 0, top: 0, bottom: 0, width: 3, background: col }} />{/* [UI-STD] inline-start: right edge in Arabic */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
        <div style={{ fontSize: 'var(--text-label)', color: 'var(--text-3)', fontWeight: 700,
          textTransform: 'uppercase', letterSpacing: '.06em' }}>{label}</div>
        {icon && <div style={{ fontSize: 'var(--text-large)', lineHeight: 1, opacity: .55 }}>{icon}</div>}
      </div>
      <div style={{ fontSize: 'var(--text-hero)', fontWeight: 700, color: 'var(--text-1)', lineHeight: 1.1,
        marginTop: 12, letterSpacing: '-0.02em', fontVariantNumeric: 'tabular-nums' }}>{value}</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8, minHeight: 18 }}>
        {trend !== undefined && (
          <span style={{ fontSize: 'var(--text-xs)', fontWeight: 600,
            color: (trendInvert ? trend <= 0 : trend >= 0) ? 'var(--color-success)' : 'var(--color-danger)' }}>
            {trend >= 0 ? '↑' : '↓'} {Math.abs(trend)}%
          </span>
        )}
        {sub && <span style={{ fontSize: 'var(--text-small)', color: 'var(--text-3)' }}>{sub}</span>}
      </div>
    </div>
  );
}
export function KPIRow({ stats, dept }) {
  return (
    <div style={{ display: 'flex', gap: 'var(--space-4)', flexWrap: 'wrap', marginBottom: 'var(--space-8)' }}>
      {(stats || []).map((s, i) => <Stat key={s.label || i} dept={dept} {...s} />)}
    </div>
  );
}

/* ═══ CHIP — neutral by default. Colour is opt-in and means STATUS. ═══ */
export function Chip({ children, tone, dot }) {
  const semantic = ['success', 'warning', 'danger', 'info'].includes(tone);
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 6, padding: '3px 10px',
      borderRadius: 'var(--radius-full)', whiteSpace: 'nowrap',
      fontSize: 'var(--text-xs)', fontWeight: 600,
      background: semantic ? `var(--color-${tone}-bg)` : 'var(--chip-bg)',
      color: semantic ? `var(--color-${tone})` : 'var(--chip-text)',
      border: '1px solid ' + (semantic ? 'transparent' : 'var(--chip-border)'),
    }}>
      {/* status is never conveyed by colour ALONE (WCAG 1.4.1) — dot + text label */}
      {(dot || semantic) && <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'currentColor' }} />}
      {children}
    </span>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   LIST CONTROLS — sort · per-page · export · bulk select
   One implementation. Modules pass their rows in and render what comes back,
   so the toolbar, the pager, the bulk bar and Export CSV can never disagree
   about what "current" means.
   ═══════════════════════════════════════════════════════════════════════════ */
export function useListControls(rows, { sorters, defaultSort, defaultPerPage = 25 } = {}) {
  const [sortBy, setSortBy] = useState(defaultSort || Object.keys(sorters || {})[0] || '');
  const [perPage, setPerPage] = useState(defaultPerPage);
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState([]);

  const sorted = useMemo(() => {
    const fn = sorters && sorters[sortBy];
    return fn ? [...(rows || [])].sort(fn) : (rows || []);
  }, [rows, sorters, sortBy]);

  const totalPages = perPage === 'all' ? 1 : Math.max(1, Math.ceil(sorted.length / perPage));
  const page_ = Math.min(page, totalPages);
  const paged = perPage === 'all' ? sorted : sorted.slice((page_ - 1) * perPage, page_ * perPage);

  // Any change to the result set returns you to page 1 — otherwise you can filter down
  // to 10 rows while still sitting on page 6 and stare at an empty table.
  useEffect(() => { setPage(1); }, [rows, sortBy, perPage]);

  // Selection is intersected with what the filters currently SHOW, so the "N selected"
  // count never promises something a bulk action will not actually touch.
  const selectedRows = useMemo(
    () => sorted.filter(r => selected.includes(r.id)), [sorted, selected]);
  const toggle = (id) => setSelected(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id]);
  const toggleAllOnPage = () => setSelected(p => {
    const ids = paged.map(r => r.id);
    return ids.every(i => p.includes(i)) ? p.filter(i => !ids.includes(i)) : Array.from(new Set([...p, ...ids]));
  });
  const clear = () => setSelected([]);
  const allOnPageSelected = paged.length > 0 && paged.every(r => selected.includes(r.id));

  return { sortBy, setSortBy, perPage, setPerPage, page: page_, setPage, totalPages,
    sorted, paged, selected, selectedRows, toggle, toggleAllOnPage, clear, allOnPageSelected };
}

export function ListToolbar({ ctl, sortOptions, onExport, countLabel = 'rows', children }) {
  const sel = { background: 'var(--bg-2)', border: '1px solid var(--border-2)',
    borderRadius: 'var(--radius-sm)', padding: '7px 10px', minHeight: 34,
    color: 'var(--text-1)', fontFamily: 'inherit', fontSize: 'var(--text-small)' };
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', flexWrap: 'wrap',
      marginBottom: 'var(--space-4)' }}>
      {children}
      {sortOptions && (
        <label style={{ display: 'inline-flex', alignItems: 'center', gap: 7, fontSize: 'var(--text-small)', color: 'var(--text-3)' }}>
          Sort
          <select value={ctl.sortBy} onChange={e => ctl.setSortBy(e.target.value)} style={sel}>
            {sortOptions.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </label>
      )}
      <label style={{ display: 'inline-flex', alignItems: 'center', gap: 7, fontSize: 'var(--text-small)', color: 'var(--text-3)' }}>
        Show
        <select value={String(ctl.perPage)}
          onChange={e => ctl.setPerPage(e.target.value === 'all' ? 'all' : +e.target.value)} style={sel}>
          <option value="25">25 per page</option>
          <option value="50">50 per page</option>
          <option value="100">100 per page</option>
          <option value="all">Show all</option>
        </select>
      </label>
      <div style={{ flex: 1 }} />
      <span style={{ fontSize: 'var(--text-small)', color: 'var(--text-3)', fontVariantNumeric: 'tabular-nums' }}>
        {ctl.sorted.length} {countLabel}
        {ctl.perPage !== 'all' && ctl.totalPages > 1 ? ` · page ${ctl.page} of ${ctl.totalPages}` : ''}
      </span>
      {onExport && <button onClick={onExport} style={{ ...BTN.secondary, fontSize: 'var(--text-small)' }}>↓ Export CSV</button>}
    </div>
  );
}

export function BulkBar({ ctl, children }) {
  if (!ctl.selectedRows.length) return null;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', flexWrap: 'wrap',
      background: 'var(--color-brand-muted)', border: '1px solid var(--color-brand)',
      borderRadius: 'var(--radius-md)', padding: '12px 16px', marginBottom: 'var(--space-4)' }}>
      <span style={{ fontSize: 'var(--text-small)', fontWeight: 600,
        color: 'var(--color-brand-text)', fontVariantNumeric: 'tabular-nums' }}>
        {ctl.selectedRows.length} selected
      </span>
      {children}
      <div style={{ flex: 1 }} />
      <button onClick={ctl.clear} style={BTN.small}>Clear</button>
    </div>
  );
}

export function Pager({ ctl }) {
  if (ctl.perPage === 'all' || ctl.totalPages <= 1) return null;
  const nums = Array.from({ length: ctl.totalPages }, (_, i) => i + 1)
    .filter(n => n === 1 || n === ctl.totalPages || Math.abs(n - ctl.page) <= 1);
  const b = (on) => ({ minWidth: 36, minHeight: 32, padding: '6px 10px', borderRadius: 'var(--radius-sm)',
    cursor: 'pointer', fontFamily: 'inherit', fontSize: 'var(--text-small)', fontWeight: 600,
    fontVariantNumeric: 'tabular-nums',
    background: on ? 'var(--color-brand-strong)' : 'var(--bg-2)',
    color: on ? '#fff' : 'var(--text-2)',
    border: '1px solid ' + (on ? 'var(--color-brand-strong)' : 'var(--border-2)') });
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 'var(--space-2)',
      marginTop: 'var(--space-6)', flexWrap: 'wrap' }}>
      <button onClick={() => ctl.setPage(p => Math.max(1, p - 1))} disabled={ctl.page <= 1}
        style={{ ...b(false), opacity: ctl.page <= 1 ? .45 : 1, cursor: ctl.page <= 1 ? 'not-allowed' : 'pointer' }}>← Prev</button>
      {nums.map((n, i) => (
        <React.Fragment key={n}>
          {i > 0 && nums[i - 1] !== n - 1 && <span style={{ color: 'var(--text-3)', padding: '0 4px' }}>…</span>}
          <button onClick={() => ctl.setPage(n)} style={b(n === ctl.page)}>{n}</button>
        </React.Fragment>
      ))}
      <button onClick={() => ctl.setPage(p => Math.min(ctl.totalPages, p + 1))} disabled={ctl.page >= ctl.totalPages}
        style={{ ...b(false), opacity: ctl.page >= ctl.totalPages ? .45 : 1, cursor: ctl.page >= ctl.totalPages ? 'not-allowed' : 'pointer' }}>Next →</button>
      <span style={{ marginLeft: 8, fontSize: 'var(--text-small)', color: 'var(--text-3)', fontVariantNumeric: 'tabular-nums' }}>
        Page {ctl.page} of {ctl.totalPages}
      </span>
    </div>
  );
}

export function SelectBox({ checked, onChange, label }) {
  return (
    <input type="checkbox" aria-label={label} checked={!!checked}
      onClick={e => e.stopPropagation()} onChange={onChange}
      style={{ width: 16, height: 16, accentColor: 'var(--color-brand)', cursor: 'pointer', flexShrink: 0 }} />
  );
}

/* ═══ CSV — exports what the filters + sort produce, every page, not just this one ═══ */
export function downloadCsv(filename, rows, columns) {
  if (!rows || !rows.length) return false;
  const esc = (v) => '"' + String(v == null ? '' : v).replace(/"/g, '""') + '"';
  const head = columns.map(c => c.label || c.key).join(',');
  const body = rows.map(r => columns.map(c => esc(c.get ? c.get(r) : r[c.key])).join(',')).join('\n');
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([head + '\n' + body], { type: 'text/csv;charset=utf-8;' }));
  a.download = filename + '_' + new Date().toISOString().slice(0, 10) + '.csv';
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  return true;
}

/* ═══════════════════════════════════════════════════════════════════════════
   FilterBar — one row of pill controls above any list.  (2026-07-14)

   Replaces the ad-hoc mix of raw <select>/<input> that every module hand-rolled
   (736 selects across 209 files — see FILTER-BAR-INVENTORY.md).

   CRITICAL: App.js sets a GLOBAL `input, select, textarea { width:100% }`.
   Any <select> in a flex toolbar therefore stretches full-width and shoves its
   siblings onto separate rows — this is what shattered the Leads toolbar.
   FilterBar never uses a native <select>: every control is a button + popover,
   so the global rule cannot reach it. Modules get this fix for free.

   USAGE
   -----
   <FilterBar
     search={{ value: q, onChange: setQ, placeholder: 'Search leads…' }}
     filters={[
       { key:'owner', icon:'user', label:'All Owners', value: owner, onChange: setOwner,
         options: [{value:'ali', label:'Ali Hasan'}, …] },                      // single-select
       { key:'stage', icon:'columns', label:'Stage', multi:true,                 // → "Stage 6/7"
         value: stages, onChange: setStages, options: […] },
       { key:'range', icon:'calendar', type:'daterange', label:'Select Date Range',
         value: {from,to}, onChange: setRange },
     ]}
     right={<ViewToggle/>}                       // optional: pinned to the end
     overflow={[{ label:'Export CSV', onClick: … }]}   // the "…" menu
   />
   ═══════════════════════════════════════════════════════════════════════════ */

const FB_ICONS = {
  search:   'M11 4a7 7 0 1 0 4.2 12.6l3.6 3.6 1.4-1.4-3.6-3.6A7 7 0 0 0 11 4Zm0 2a5 5 0 1 1 0 10 5 5 0 0 1 0-10Z',
  user:     'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm0 2c-3.9 0-7 2.2-7 5v1h14v-1c0-2.8-3.1-5-7-5Z',
  calendar: 'M7 2v2H5.5A2.5 2.5 0 0 0 3 6.5v12A2.5 2.5 0 0 0 5.5 21h13a2.5 2.5 0 0 0 2.5-2.5v-12A2.5 2.5 0 0 0 18.5 4H17V2h-2v2H9V2H7Zm12 8v8.5a.5.5 0 0 1-.5.5h-13a.5.5 0 0 1-.5-.5V10h14Z',
  columns:  'M3 4h18v16H3V4Zm2 2v12h4V6H5Zm6 0v12h3V6h-3Zm5 0v12h3V6h-3Z',
  tag:      'M2 12 12 2h8v8L10 20l-8-8Zm15-7a2 2 0 1 0 0 4 2 2 0 0 0 0-4Z',
  filter:   'M3 5h18l-7 8v6l-4-2v-4L3 5Z',
  building: 'M4 21V4h9v6h7v11H4Zm2-2h5V6H6v13Zm7 0h5v-7h-5v7Z',
  sort:     'M7 4l4 5H3l4-5Zm10 16-4-5h8l-4 5Z',
};

function FbIcon({ name, color = 'currentColor', size = 15 }) {
  const d = FB_ICONS[name] || FB_ICONS.filter;
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color} aria-hidden="true" style={{ flexShrink: 0 }}>
      <path d={d} />
    </svg>
  );
}

const FB_PILL = {
  display: 'inline-flex', alignItems: 'center', gap: 8,
  height: 38, padding: '0 12px',
  background: 'var(--bg-2)',
  border: '1px solid var(--border)',
  borderRadius: 'var(--radius-md)',
  color: 'var(--text-3)',
  fontFamily: 'inherit', fontSize: 'var(--text-small)', fontWeight: 500,
  cursor: 'pointer', whiteSpace: 'nowrap',
  transition: 'border-color .12s, background .12s',
};

/** One filter control: button + popover. Never a native <select>. */
function FbControl({ f }) {
  const [open, setOpen] = useState(false);
  const multi  = !!f.multi;
  const isRange = f.type === 'daterange';

  const sel = multi ? (Array.isArray(f.value) ? f.value : []) : f.value;
  const active = isRange ? !!(f.value && (f.value.from || f.value.to))
               : multi   ? sel.length > 0 && sel.length < (f.options || []).length
               : !!sel && sel !== 'all';

  // What the pill reads when a value is chosen
  let text = f.label;
  if (isRange && f.value && (f.value.from || f.value.to)) {
    text = [f.value.from, f.value.to].filter(Boolean).join(' → ');
  } else if (!multi && active) {
    const o = (f.options || []).find(o => o.value === sel);
    text = o ? o.label : f.label;
  }

  useEffect(() => {
    if (!open) return;
    const onKey = e => { if (e.key === 'Escape') setOpen(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  const toggleMulti = (v) => {
    const next = sel.includes(v) ? sel.filter(x => x !== v) : [...sel, v];
    f.onChange(next);
  };

  return (
    <div style={{ position: 'relative' }}>
      <button type="button" onClick={() => setOpen(o => !o)} aria-expanded={open} title={f.label}
        style={{ ...FB_PILL,
          borderColor: active ? 'var(--color-brand)' : 'var(--border)',
          color: active ? 'var(--text-1)' : 'var(--text-3)',
          fontWeight: active ? 600 : 500,
        }}
        onMouseEnter={e => { if (!active) e.currentTarget.style.borderColor = 'var(--border-2)'; }}
        onMouseLeave={e => { e.currentTarget.style.borderColor = active ? 'var(--color-brand)' : 'var(--border)'; }}
      >
        {f.icon && <FbIcon name={f.icon} color={active ? 'var(--color-brand)' : 'var(--text-3)'} />}
        <span style={{ maxWidth: 168, overflow: 'hidden', textOverflow: 'ellipsis' }}>{text}</span>
        {multi && sel.length > 0 && (
          <span style={{ background: 'var(--chip-bg)', border: '1px solid var(--chip-border)',
            borderRadius: 'var(--radius-full)', padding: '1px 7px',
            fontSize: 'var(--text-xs)', fontWeight: 700, color: 'var(--text-2)',
            fontVariantNumeric: 'tabular-nums' }}>
            {sel.length}/{(f.options || []).length}
          </span>
        )}
        <span aria-hidden="true" style={{ fontSize: 9, color: 'var(--text-3)', marginInlineStart: 2 }}>▾</span>
      </button>

      {open && (
        <>
          <div onClick={() => setOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 60 }} />
          <div style={{ position: 'absolute', insetInlineStart: 0, top: 'calc(100% + 6px)', zIndex: 61,
            minWidth: 230, maxHeight: 320, overflowY: 'auto',
            background: 'var(--bg-2)', border: '1px solid var(--border-2)',
            borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-lg)', padding: 6 }}>

            {isRange ? (
              <div style={{ padding: 8, display: 'grid', gap: 8 }}>
                {['from', 'to'].map(k => (
                  <label key={k} style={{ display: 'grid', gap: 4 }}>
                    <span style={{ fontSize: 'var(--text-label)', fontWeight: 800, letterSpacing: '.08em',
                      textTransform: 'uppercase', color: 'var(--text-3)' }}>{k}</span>
                    <input type="date" value={(f.value && f.value[k]) || ''}
                      onChange={e => f.onChange({ ...(f.value || {}), [k]: e.target.value })}
                      style={{ width: '100%', minHeight: 0, padding: '8px 10px',
                        background: 'var(--bg-3)', border: '1px solid var(--border)',
                        borderRadius: 'var(--radius-sm)', color: 'var(--text-1)',
                        fontFamily: 'inherit', fontSize: 'var(--text-small)' }} />
                  </label>
                ))}
                <button type="button" onClick={() => { f.onChange({ from: '', to: '' }); setOpen(false); }}
                  style={{ background: 'transparent', border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-sm)', padding: '7px', cursor: 'pointer',
                    color: 'var(--text-2)', fontFamily: 'inherit', fontSize: 'var(--text-xs)', fontWeight: 600 }}>
                  Clear dates
                </button>
              </div>
            ) : (
              <>
                {multi && (
                  <div style={{ display: 'flex', gap: 6, padding: '4px 6px 8px', borderBottom: '1px solid var(--border)' }}>
                    <button type="button" onClick={() => f.onChange((f.options || []).map(o => o.value))}
                      style={{ flex: 1, background: 'transparent', border: '1px solid var(--border)',
                        borderRadius: 'var(--radius-sm)', padding: '5px', cursor: 'pointer',
                        color: 'var(--text-2)', fontFamily: 'inherit', fontSize: 'var(--text-xs)', fontWeight: 600 }}>All</button>
                    <button type="button" onClick={() => f.onChange([])}
                      style={{ flex: 1, background: 'transparent', border: '1px solid var(--border)',
                        borderRadius: 'var(--radius-sm)', padding: '5px', cursor: 'pointer',
                        color: 'var(--text-2)', fontFamily: 'inherit', fontSize: 'var(--text-xs)', fontWeight: 600 }}>None</button>
                  </div>
                )}
                {!multi && (
                  <button type="button" onClick={() => { f.onChange('all'); setOpen(false); }}
                    style={{ display: 'flex', width: '100%', textAlign: 'start', gap: 9, alignItems: 'center',
                      background: 'transparent', border: 'none', borderRadius: 'var(--radius-sm)',
                      padding: '9px 10px', cursor: 'pointer', fontFamily: 'inherit',
                      fontSize: 'var(--text-small)', fontWeight: 600,
                      color: !active ? 'var(--color-brand-text)' : 'var(--text-2)' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-3)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                    {f.label}
                  </button>
                )}
                {(f.options || []).map(o => {
                  const on = multi ? sel.includes(o.value) : sel === o.value;
                  return (
                    <button key={String(o.value)} type="button"
                      onClick={() => { multi ? toggleMulti(o.value) : (f.onChange(o.value), setOpen(false)); }}
                      style={{ display: 'flex', width: '100%', textAlign: 'start', gap: 9, alignItems: 'center',
                        background: 'transparent', border: 'none', borderRadius: 'var(--radius-sm)',
                        padding: '9px 10px', cursor: 'pointer', fontFamily: 'inherit',
                        fontSize: 'var(--text-small)', fontWeight: on ? 700 : 500,
                        color: on ? 'var(--text-1)' : 'var(--text-2)' }}
                      onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-3)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                      {multi && (
                        <span aria-hidden="true" style={{ width: 15, height: 15, flexShrink: 0,
                          borderRadius: 4, border: '1px solid ' + (on ? 'var(--color-brand)' : 'var(--border-2)'),
                          background: on ? 'var(--color-brand)' : 'transparent',
                          color: '#fff', fontSize: 10, lineHeight: '14px', textAlign: 'center', fontWeight: 900 }}>
                          {on ? '✓' : ''}
                        </span>
                      )}
                      {o.color && <span aria-hidden="true" style={{ width: 7, height: 7, borderRadius: '50%',
                        background: o.color, flexShrink: 0 }} />}
                      <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis' }}>{o.label}</span>
                      {o.count != null && (
                        <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-3)',
                          fontVariantNumeric: 'tabular-nums' }}>{o.count}</span>
                      )}
                    </button>
                  );
                })}
                {(f.options || []).length === 0 && (
                  <div style={{ padding: '12px 10px', fontSize: 'var(--text-xs)', color: 'var(--text-3)' }}>
                    Nothing to filter by yet.
                  </div>
                )}
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}

export function FilterBar({ search, filters = [], right = null, overflow = [], onClearAll, collapsible = false }) {
  const [ovOpen, setOvOpen] = useState(false);
  const [filtOpen, setFiltOpen] = useState(false);
  const [searchFocus, setSearchFocus] = useState(false);
  const searchRef = React.useRef(null);
  useEffect(() => {
    if (!search) return;
    const onKey = (e) => { if ((e.metaKey || e.ctrlKey) && (e.key === 'k' || e.key === 'K')) { e.preventDefault(); searchRef.current && searchRef.current.focus(); } };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [search]);

  const anyActive = filters.some(f => {
    if (f.type === 'daterange') return !!(f.value && (f.value.from || f.value.to));
    if (f.multi) return Array.isArray(f.value) && f.value.length > 0 && f.value.length < (f.options || []).length;
    return !!f.value && f.value !== 'all';
  }) || !!(search && search.value);

  // ── Option B (collapsible): one Filters button + removable active-filter chips ──
  if (collapsible) {
    const isSort = f => f.key === 'sort' || f.icon === 'sort';
    const chips = [];
    if (search && search.value) chips.push({ key: '__search', label: '“' + search.value + '”', onRemove: () => search.onChange('') });
    filters.forEach(f => {
      if (isSort(f)) return; // ordering, not a filter — stays in the popover only
      if (f.type === 'daterange') {
        if (f.value && (f.value.from || f.value.to)) chips.push({ key: f.key, label: [f.value.from, f.value.to].filter(Boolean).join(' → '), color: 'var(--color-brand)', onRemove: () => f.onChange({ from: '', to: '' }) });
      } else if (f.multi) {
        const opts = f.options || []; const val = Array.isArray(f.value) ? f.value : [];
        if (val.length > 0 && val.length < opts.length) chips.push({ key: f.key, label: (f.label || f.key) + ': ' + val.length, onRemove: () => f.onChange([]) });
      } else if (f.value && f.value !== 'all') {
        const o = (f.options || []).find(o => o.value === f.value);
        chips.push({ key: f.key, label: o ? o.label : String(f.value), color: (o && o.color) || 'var(--color-brand)', onRemove: () => f.onChange('all') });
      }
    });
    const activeCount = chips.length;
    const sortF = filters.find(isSort);
    const sortText = sortF ? ((sortF.options || []).find(o => o.value === sortF.value) || {}).label || sortF.label : null;

    return (
      <div style={{ marginBottom: 'var(--space-4)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          {search && (
            <div style={{ position: 'relative', flex: '0 1 320px', minWidth: 200 }}>
              <span style={{ position: 'absolute', insetInlineStart: 11, top: '50%', transform: 'translateY(-50%)', display: 'flex', pointerEvents: 'none', color: searchFocus ? 'var(--color-brand-text, #322B9E)' : 'var(--text-3)', transition: 'color .15s' }}>
                <FbIcon name="search" color="currentColor" />
              </span>
              <input ref={searchRef} value={search.value || ''} onChange={e => search.onChange(e.target.value)} onFocus={() => setSearchFocus(true)} onBlur={() => setSearchFocus(false)}
                onKeyDown={e => { if (e.key === 'Escape' && search.value) { e.preventDefault(); search.onChange(''); } }}
                placeholder={search.placeholder || 'Search…'}
                style={{ width: '100%', height: 40, minHeight: 0, padding: search.value ? '0 40px 0 34px' : '0 52px 0 34px', background: 'var(--bg-2)', border: '1px solid ' + (searchFocus ? 'var(--color-brand)' : 'var(--border)'), borderRadius: 'var(--radius-md)', color: 'var(--text-1)', boxSizing: 'border-box', fontFamily: 'inherit', fontSize: 'var(--text-small)', outline: 'none', boxShadow: searchFocus ? '0 0 0 3px var(--color-brand-muted, rgba(99,91,255,.14))' : 'none', transition: 'border-color .15s, box-shadow .15s' }} />
              <span style={{ position: 'absolute', insetInlineEnd: 9, top: '50%', transform: 'translateY(-50%)', display: 'flex', alignItems: 'center' }}>
                {search.value
                  ? <button type="button" onClick={() => { search.onChange(''); searchRef.current && searchRef.current.focus(); }} title="Clear (Esc)" aria-label="Clear search" style={{ border: 'none', background: 'transparent', color: 'var(--text-3)', cursor: 'pointer', fontSize: 15, lineHeight: 1, padding: 2, display: 'flex' }}>✕</button>
                  : <span aria-hidden="true" title="Press ⌘K to search" style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--text-3)', background: 'var(--bg-3)', border: '1px solid var(--border)', borderRadius: 6, padding: '1px 6px', pointerEvents: 'none' }}>⌘K</span>}
              </span>
            </div>
          )}

          {/* Single Filters button → popover holding every control */}
          <div style={{ position: 'relative' }}>
            <button type="button" onClick={() => setFiltOpen(o => !o)} aria-expanded={filtOpen} title="Filters"
              style={{ ...FB_PILL, borderColor: (activeCount || filtOpen) ? 'var(--color-brand)' : 'var(--border)', color: activeCount ? 'var(--text-1)' : 'var(--text-3)', fontWeight: activeCount ? 700 : 500 }}>
              <FbIcon name="filter" color={activeCount ? 'var(--color-brand)' : 'var(--text-3)'} />
              Filters
              {activeCount > 0 && (
                <span style={{ background: 'var(--color-brand)', color: '#fff', borderRadius: 'var(--radius-full)', minWidth: 18, height: 18, padding: '0 5px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 'var(--text-xs)', fontWeight: 800, fontVariantNumeric: 'tabular-nums' }}>{activeCount}</span>
              )}
              <span aria-hidden="true" style={{ fontSize: 9, color: 'var(--text-3)', marginInlineStart: 2, transition: 'transform .18s', transform: filtOpen ? 'rotate(180deg)' : 'none' }}>▾</span>
            </button>
            {filtOpen && (
              <>
                <div onClick={() => setFiltOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 60 }} />
                <div style={{ position: 'absolute', insetInlineStart: 0, top: 'calc(100% + 8px)', zIndex: 61, width: 268, background: 'var(--bg-2)', border: '1px solid var(--border-2)', borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-lg)', padding: 12, animation: 'fbPop .16s cubic-bezier(.2,1.1,.35,1)', transformOrigin: 'top' }}>
                  <style>{'@keyframes fbPop{from{opacity:0;transform:translateY(-6px) scale(.97)}to{opacity:1;transform:none}}'}</style>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                    <span style={{ fontSize: 'var(--text-label)', fontWeight: 800, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--text-3)' }}>Filters &amp; sort</span>
                    {anyActive && onClearAll && (
                      <button type="button" onClick={() => { onClearAll(); }} style={{ border: 'none', background: 'transparent', color: 'var(--color-brand-text)', fontWeight: 700, fontFamily: 'inherit', fontSize: 'var(--text-xs)', cursor: 'pointer', padding: 0 }}>Clear all</button>
                    )}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {filters.map(f => <FbControl key={f.key} f={f} />)}
                  </div>
                </div>
              </>
            )}
          </div>

          {sortText && (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 'var(--text-xs)', color: 'var(--text-3)', fontWeight: 600 }}>
              <FbIcon name="sort" color="var(--text-3)" size={13} />{sortText}
            </span>
          )}

          <div style={{ marginInlineStart: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
            {right}
            {overflow.length > 0 && (
              <div style={{ position: 'relative' }}>
                <button type="button" onClick={() => setOvOpen(o => !o)} aria-label="More actions" title="More" style={{ ...FB_PILL, width: 38, padding: 0, justifyContent: 'center', color: 'var(--text-2)', fontWeight: 800, letterSpacing: 1 }}>…</button>
                {ovOpen && (
                  <>
                    <div onClick={() => setOvOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 60 }} />
                    <div style={{ position: 'absolute', insetInlineEnd: 0, top: 'calc(100% + 6px)', zIndex: 61, minWidth: 200, background: 'var(--bg-2)', border: '1px solid var(--border-2)', borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-lg)', padding: 6 }}>
                      {overflow.map(a => (
                        <button key={a.label} type="button" onClick={() => { setOvOpen(false); a.onClick && a.onClick(); }}
                          style={{ display: 'flex', alignItems: 'center', gap: 9, width: '100%', textAlign: 'start', background: 'transparent', border: 'none', borderRadius: 'var(--radius-sm)', padding: '9px 10px', cursor: 'pointer', fontFamily: 'inherit', fontSize: 'var(--text-small)', fontWeight: 600, color: 'var(--text-1)' }}
                          onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-3)'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                          {a.icon && <span aria-hidden="true">{a.icon}</span>}{a.label}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Active-filter chips — removable, animate in */}
        {chips.length > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginTop: 10 }}>
            <style>{'@keyframes fbChip{from{opacity:0;transform:translateY(3px) scale(.9)}to{opacity:1;transform:none}}'}</style>
            {chips.map(c => (
              <span key={c.key} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, height: 26, padding: '0 6px 0 10px', background: 'var(--color-brand-muted, rgba(99,91,255,.12))', border: '1px solid var(--color-brand)', borderRadius: 'var(--radius-full)', color: 'var(--color-brand-text)', fontSize: 'var(--text-xs)', fontWeight: 700, animation: 'fbChip .18s ease-out' }}>
                {c.color && <span aria-hidden="true" style={{ width: 7, height: 7, borderRadius: '50%', background: c.color, flexShrink: 0 }} />}
                <span style={{ maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.label}</span>
                <button type="button" onClick={c.onRemove} aria-label={'Remove ' + c.label} title="Remove" style={{ border: 'none', background: 'transparent', color: 'var(--color-brand-text)', cursor: 'pointer', fontSize: 13, lineHeight: 1, padding: '2px 3px', display: 'flex', borderRadius: '50%' }}>✕</button>
              </span>
            ))}
            {onClearAll && (
              <button type="button" onClick={onClearAll} style={{ border: 'none', background: 'transparent', color: 'var(--text-3)', fontWeight: 700, fontFamily: 'inherit', fontSize: 'var(--text-xs)', cursor: 'pointer', padding: '0 6px' }}>Clear all</button>
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap',
      marginBottom: 'var(--space-4)' }}>

      {/* Search — same pill height, icon inside */}
      {search && (
        <div style={{ position: 'relative', flex: '0 1 300px', minWidth: 200 }}>
          <span style={{ position: 'absolute', insetInlineStart: 11, top: '50%',
            transform: 'translateY(-50%)', display: 'flex', pointerEvents: 'none',
            color: searchFocus ? 'var(--color-brand-text, #322B9E)' : 'var(--text-3)', transition: 'color .15s' }}>
            <FbIcon name="search" color="currentColor" />
          </span>
          <input
            ref={searchRef}
            value={search.value || ''}
            onChange={e => search.onChange(e.target.value)}
            onFocus={() => setSearchFocus(true)}
            onBlur={() => setSearchFocus(false)}
            onKeyDown={e => { if (e.key === 'Escape' && search.value) { e.preventDefault(); search.onChange(''); } }}
            placeholder={search.placeholder || 'Search…'}
            style={{ width: '100%', height: 40, minHeight: 0,
              padding: search.value ? '0 40px 0 34px' : '0 52px 0 34px',
              background: 'var(--bg-2)', border: '1px solid ' + (searchFocus ? 'var(--color-brand)' : 'var(--border)'),
              borderRadius: 'var(--radius-md)', color: 'var(--text-1)', boxSizing: 'border-box',
              fontFamily: 'inherit', fontSize: 'var(--text-small)', outline: 'none',
              boxShadow: searchFocus ? '0 0 0 3px var(--color-brand-muted, rgba(99,91,255,.14))' : 'none',
              transition: 'border-color .15s, box-shadow .15s' }}
          />
          <span style={{ position: 'absolute', insetInlineEnd: 9, top: '50%', transform: 'translateY(-50%)', display: 'flex', alignItems: 'center' }}>
            {search.value ? (
              <button type="button" onClick={() => { search.onChange(''); searchRef.current && searchRef.current.focus(); }} title="Clear (Esc)" aria-label="Clear search"
                style={{ border: 'none', background: 'transparent', color: 'var(--text-3)', cursor: 'pointer', fontSize: 15, lineHeight: 1, padding: 2, display: 'flex' }}>✕</button>
            ) : (
              <span aria-hidden="true" title="Press ⌘K to search" style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--text-3)', background: 'var(--bg-3)', border: '1px solid var(--border)', borderRadius: 6, padding: '1px 6px', pointerEvents: 'none' }}>⌘K</span>
            )}
          </span>
        </div>
      )}

      {filters.map(f => <FbControl key={f.key} f={f} />)}

      {/* Clear all — only when something is actually filtering */}
      {anyActive && onClearAll && (
        <button type="button" onClick={onClearAll}
          style={{ ...FB_PILL, border: 'none', background: 'transparent',
            color: 'var(--color-brand-text)', fontWeight: 700, padding: '0 8px' }}>
          Clear all
        </button>
      )}

      <div style={{ marginInlineStart: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
        {right}

        {/* Overflow "…" — low-frequency actions never get to wrap the row */}
        {overflow.length > 0 && (
          <div style={{ position: 'relative' }}>
            <button type="button" onClick={() => setOvOpen(o => !o)} aria-label="More actions" title="More"
              style={{ ...FB_PILL, width: 38, padding: 0, justifyContent: 'center',
                color: 'var(--text-2)', fontWeight: 800, letterSpacing: 1 }}>…</button>
            {ovOpen && (
              <>
                <div onClick={() => setOvOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 60 }} />
                <div style={{ position: 'absolute', insetInlineEnd: 0, top: 'calc(100% + 6px)', zIndex: 61,
                  minWidth: 200, background: 'var(--bg-2)', border: '1px solid var(--border-2)',
                  borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-lg)', padding: 6 }}>
                  {overflow.map(a => (
                    <button key={a.label} type="button"
                      onClick={() => { setOvOpen(false); a.onClick && a.onClick(); }}
                      style={{ display: 'flex', alignItems: 'center', gap: 9, width: '100%', textAlign: 'start',
                        background: 'transparent', border: 'none', borderRadius: 'var(--radius-sm)',
                        padding: '9px 10px', cursor: 'pointer', fontFamily: 'inherit',
                        fontSize: 'var(--text-small)', fontWeight: 600, color: 'var(--text-1)' }}
                      onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-3)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                      {a.icon && <span aria-hidden="true">{a.icon}</span>}
                      {a.label}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/* ═══ LOADING & EMPTY STATES — craft polish (Option 3) ═══════════════════════
   Branded shimmer skeletons + a consistent empty state, so screens never show a
   raw "Loading…" string or a blank area. Token-only; respects reduced-motion. */
let _uiSkelInjected = false;
function _ensureSkelCss() {
  if (_uiSkelInjected || typeof document === 'undefined') return; _uiSkelInjected = true;
  const s = document.createElement('style');
  s.textContent =
    '@keyframes uiShimmer{0%{background-position:-450px 0}100%{background-position:450px 0}}' +
    '.ui-skel{background:linear-gradient(90deg,var(--bg-3) 25%,var(--bg-2) 37%,var(--bg-3) 63%);' +
    'background-size:900px 100%;animation:uiShimmer 1.3s ease-in-out infinite;border-radius:8px}' +
    '@media (prefers-reduced-motion:reduce){.ui-skel{animation:none}}';
  document.head.appendChild(s);
}
export function Skeleton({ w = '100%', h = 14, r = 8, style }) {
  _ensureSkelCss();
  return <div className="ui-skel" style={{ width: w, height: h, borderRadius: r, ...style }} />;
}
export function SkeletonCard({ lines = 3 }) {
  _ensureSkelCss();
  return (
    <div style={{ ...CARD, padding: 18 }}>
      <Skeleton w="42%" h={11} style={{ marginBottom: 12 }} />
      <Skeleton w="62%" h={28} style={{ marginBottom: 14 }} />
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton key={i} w={(88 - i * 12) + '%'} h={10} style={{ marginBottom: 8 }} />
      ))}
    </div>
  );
}
export function SkeletonKPIs({ count = 6 }) {
  _ensureSkelCss();
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(178px,1fr))', gap: 12 }}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} style={{ ...CARD, padding: '16px 18px' }}>
          <Skeleton w="55%" h={10} style={{ marginBottom: 12 }} />
          <Skeleton w="45%" h={26} />
        </div>
      ))}
    </div>
  );
}
export function EmptyState({ icon = '📭', title = 'Nothing here yet', hint, action }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '44px 24px', color: 'var(--text-3)' }}>
      <div style={{ fontSize: 34, marginBottom: 10, opacity: .9 }}>{icon}</div>
      <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-1)', marginBottom: 4 }}>{title}</div>
      {hint && <div style={{ fontSize: 13, maxWidth: 340, lineHeight: 1.5 }}>{hint}</div>}
      {action && <div style={{ marginTop: 14 }}>{action}</div>}
    </div>
  );
}

/* ═══ DATE PICKER — civil-date (yyyy-mm-dd) Popover + Calendar, single & range ══════
   Dependency-free (no react-day-picker), token-styled, accessible. Dates are ALWAYS
   handled as civil yyyy-mm-dd strings; Date objects are only ever built with the LOCAL
   constructor new Date(y, m-1, d) for weekday/arithmetic — never new Date(str) (which
   parses as UTC and drifts a day). Range mode marks range_start / range_middle /
   range_end. Week starts per locale. Keyboard: ←/→ day, ↑/↓ week, PageUp/Down month,
   Home/End week edges, Enter/Space select, Esc close. */
let _uidpInjected = false;
function _ensureDpCss() {
  if (_uidpInjected || typeof document === 'undefined') return; _uidpInjected = true;
  const s = document.createElement('style');
  s.textContent = [
    '.uidp-wrap{position:relative;display:inline-block}',
    '.uidp-trigger{display:inline-flex;align-items:center;gap:8px;background:var(--bg-2);border:1px solid var(--border-2,var(--border));border-radius:var(--radius-md,8px);padding:9px 13px;font-family:inherit;font-size:14px;color:var(--text-1);cursor:pointer;min-height:40px;min-width:190px;text-align:start}',
    '.uidp-trigger:hover{border-color:var(--color-brand)}',
    '.uidp-trigger:focus-visible{outline:none;border-color:var(--color-brand);box-shadow:0 0 0 3px var(--color-brand-muted,rgba(99,91,255,.2))}',
    '.uidp-ph{color:var(--text-3)}.uidp-ic{opacity:.7;flex-shrink:0}',
    '.uidp-pop{position:absolute;z-index:9999;top:calc(100% + 6px);inset-inline-start:0;background:var(--bg-2);border:1px solid var(--border);border-radius:var(--radius-lg,12px);box-shadow:var(--shadow-lg);padding:12px}',
    '.uidp-hd{display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;gap:8px}',
    '.uidp-title{font-weight:700;font-size:14px;color:var(--text-1)}',
    '.uidp-nav{background:var(--bg-3);border:1px solid var(--border);border-radius:8px;width:30px;height:30px;cursor:pointer;color:var(--text-2);font-size:16px;line-height:1;font-family:inherit}',
    '.uidp-nav:hover{border-color:var(--color-brand);color:var(--color-brand)}',
    '.uidp-dow{display:grid;grid-template-columns:repeat(7,34px);gap:2px;margin-bottom:2px}',
    '.uidp-dow span{text-align:center;font-size:11px;font-weight:700;color:var(--text-3);text-transform:uppercase}',
    '.uidp-grid{display:grid;grid-template-columns:repeat(7,34px);gap:2px}',
    '.uidp-day{width:34px;height:34px;border:none;background:none;border-radius:8px;font-family:inherit;font-size:13px;color:var(--text-1);cursor:pointer;padding:0}',
    '.uidp-day:hover:not(.dis):not(.sel){background:var(--bg-3)}',
    '.uidp-day:focus-visible{outline:2px solid var(--color-brand);outline-offset:1px}',
    '.uidp-day.out{color:var(--text-3);opacity:.45}',
    '.uidp-day.today{font-weight:800;box-shadow:inset 0 0 0 1px var(--color-brand)}',
    '.uidp-day.mid{background:var(--color-brand-muted,#E9E7FF);border-radius:0}',
    '.uidp-day.sel{background:var(--color-brand);color:#fff;font-weight:700}',
    '.uidp-day.rs{border-radius:8px 0 0 8px}.uidp-day.re{border-radius:0 8px 8px 0}.uidp-day.rs.re{border-radius:8px}',
    '.uidp-day.dis{color:var(--text-3);opacity:.35;cursor:not-allowed}',
    '@media (prefers-reduced-motion:reduce){.uidp-day{transition:none}}',
  ].join('');
  document.head.appendChild(s);
}
const _dpPad = (n) => String(n).padStart(2, '0');
const _dpIso = (y, m, d) => y + '-' + _dpPad(m) + '-' + _dpPad(d);
function _dpParse(s) { if (!s || typeof s !== 'string') return null; const m = s.slice(0, 10).match(/^(\d{4})-(\d{2})-(\d{2})$/); return m ? { y: +m[1], mo: +m[2], d: +m[3] } : null; }
function _dpAddDays(iso, n) { const p = _dpParse(iso); if (!p) return iso; const dt = new Date(p.y, p.mo - 1, p.d); dt.setDate(dt.getDate() + n); return _dpIso(dt.getFullYear(), dt.getMonth() + 1, dt.getDate()); }
function _dpAddMonths(iso, n) { const p = _dpParse(iso); if (!p) return iso; const dt = new Date(p.y, p.mo - 1 + n, 1); return _dpIso(dt.getFullYear(), dt.getMonth() + 1, 1); }
function _dpToday() { const d = new Date(); return _dpIso(d.getFullYear(), d.getMonth() + 1, d.getDate()); }
function _dpDow(iso) { const p = _dpParse(iso); return p ? new Date(p.y, p.mo - 1, p.d).getDay() : 0; }
function _dpLocaleWeekStart() { try { const li = new Intl.Locale(navigator.language); const wi = li.weekInfo || (li.getWeekInfo && li.getWeekInfo()); if (wi && wi.firstDay) return wi.firstDay % 7; } catch (e) {} return 0; }
function _dpFmt(iso, opts) { const p = _dpParse(iso); if (!p) return ''; try { return new Intl.DateTimeFormat(navigator.language, opts || { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(p.y, p.mo - 1, p.d)); } catch (e) { return iso; } }

function _DpCalendar({ mode = 'single', value, onSelect, weekStartsOn, min, max }) {
  _ensureDpCss();
  const ws = weekStartsOn == null ? _dpLocaleWeekStart() : weekStartsOn;
  const today = _dpToday();
  const anchor = mode === 'range' ? (value && value.from) : value;
  const initP = _dpParse(anchor || today) || _dpParse(today);
  const [view, setView] = React.useState({ y: initP.y, m: initP.mo });
  const [focus, setFocus] = React.useState(anchor || today);
  const gridRef = React.useRef(null);
  const cells = React.useMemo(() => { const first = _dpIso(view.y, view.m, 1); const lead = (_dpDow(first) - ws + 7) % 7; const start = _dpAddDays(first, -lead); const arr = []; for (let i = 0; i < 42; i++) arr.push(_dpAddDays(start, i)); return arr; }, [view, ws]);
  const dis = (iso) => (min && iso < min) || (max && iso > max);
  const mid = (iso) => mode === 'range' && value && value.from && value.to && iso > value.from && iso < value.to;
  React.useEffect(() => { const p = _dpParse(focus); if (p && (p.y !== view.y || p.mo !== view.m)) setView({ y: p.y, m: p.mo }); /* eslint-disable-next-line */ }, [focus]);
  React.useEffect(() => { const el = gridRef.current && gridRef.current.querySelector('[data-date="' + focus + '"]'); if (el && gridRef.current.contains(document.activeElement)) el.focus(); }, [focus, view]);
  const pick = (iso) => { if (dis(iso)) return;
    if (mode === 'range') { if (!value || !value.from || (value.from && value.to)) onSelect({ from: iso, to: null }); else { let from = value.from, to = iso; if (to < from) { to = from; from = iso; } onSelect({ from, to }); } }
    else onSelect(iso);
  };
  const onKey = (e) => { const k = e.key;
    if (k === 'Enter' || k === ' ') { e.preventDefault(); pick(focus); return; }
    if (k === 'Home') { e.preventDefault(); setFocus(_dpAddDays(focus, -((_dpDow(focus) - ws + 7) % 7))); return; }
    if (k === 'End') { e.preventDefault(); setFocus(_dpAddDays(focus, 6 - ((_dpDow(focus) - ws + 7) % 7))); return; }
    let nd = 0, nm = 0;
    if (k === 'ArrowLeft') nd = -1; else if (k === 'ArrowRight') nd = 1; else if (k === 'ArrowUp') nd = -7; else if (k === 'ArrowDown') nd = 7;
    else if (k === 'PageUp') nm = -1; else if (k === 'PageDown') nm = 1; else return;
    e.preventDefault(); setFocus(nm ? _dpAddDays(_dpAddMonths(focus, nm), (_dpParse(focus).d - 1)) : _dpAddDays(focus, nd));
  };
  const dows = React.useMemo(() => { const a = []; for (let i = 0; i < 7; i++) a.push(_dpFmt(_dpAddDays('2023-01-01', i + ws), { weekday: 'short' })); return a; }, [ws]); // 2023-01-01 is a Sunday
  const setMonth = (delta) => setView((v) => { const p = _dpParse(_dpAddMonths(_dpIso(v.y, v.m, 1), delta)); return { y: p.y, m: p.mo }; });
  return (
    <div className="uidp-cal">
      <div className="uidp-hd">
        <button type="button" className="uidp-nav" aria-label="Previous month" onClick={() => setMonth(-1)}>‹</button>
        <span className="uidp-title" aria-live="polite">{_dpFmt(_dpIso(view.y, view.m, 1), { month: 'long', year: 'numeric' })}</span>
        <button type="button" className="uidp-nav" aria-label="Next month" onClick={() => setMonth(1)}>›</button>
      </div>
      <div className="uidp-dow" aria-hidden="true">{dows.map((d, i) => <span key={i}>{d}</span>)}</div>
      <div className="uidp-grid" role="grid" ref={gridRef} onKeyDown={onKey}>
        {cells.map((iso) => { const p = _dpParse(iso); const outside = p.mo !== view.m; const isFocus = iso === focus;
          const rs = mode === 'range' ? (value && iso === value.from) : (value === iso);
          const re = mode === 'range' && value && iso === value.to;
          const sel = rs || re || (mode !== 'range' && value === iso);
          const cls = ['uidp-day']; if (outside) cls.push('out'); if (iso === today) cls.push('today'); if (mid(iso)) cls.push('mid'); if (rs) cls.push('rs'); if (re) cls.push('re'); if (sel) cls.push('sel'); if (dis(iso)) cls.push('dis');
          return <button key={iso} type="button" role="gridcell" data-date={iso} className={cls.join(' ')} tabIndex={isFocus ? 0 : -1} aria-selected={sel ? 'true' : 'false'} aria-current={iso === today ? 'date' : undefined} disabled={dis(iso)} aria-label={_dpFmt(iso, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })} onClick={() => pick(iso)} onFocus={() => setFocus(iso)}>{p.d}</button>;
        })}
      </div>
    </div>
  );
}
function _DpPopover({ label, placeholder, disabled, className, style, id, name, required, title, ariaLabel, wrapStyle, onClick, onFocus, onBlur, children }) {
  const [open, setOpen] = React.useState(false);
  const [pos, setPos] = React.useState(null); // { top, left } fixed coords
  const triggerRef = React.useRef(null);
  const popRef = React.useRef(null);
  // Compute a fixed position anchored to the trigger, flipping above if there isn't room below.
  const place = React.useCallback(() => {
    const el = triggerRef.current; if (!el) return;
    const r = el.getBoundingClientRect();
    const POP_W = 300, POP_H = 340, GAP = 6, M = 8;
    let left = r.left;
    if (left + POP_W > window.innerWidth - M) left = Math.max(M, window.innerWidth - POP_W - M);
    left = Math.max(M, left);
    let top = r.bottom + GAP;
    if (top + POP_H > window.innerHeight - M && r.top - GAP - POP_H > M) top = r.top - GAP - POP_H;
    setPos({ top, left });
  }, []);
  React.useLayoutEffect(() => { if (open) place(); }, [open, place]);
  React.useEffect(() => {
    if (!open) return;
    const onDoc = (e) => { const t = e.target; if (triggerRef.current && triggerRef.current.contains(t)) return; if (popRef.current && popRef.current.contains(t)) return; setOpen(false); };
    const onEsc = (e) => { if (e.key === 'Escape') setOpen(false); };
    const onReflow = () => place();
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onEsc);
    window.addEventListener('resize', onReflow);
    window.addEventListener('scroll', onReflow, true);
    return () => { document.removeEventListener('mousedown', onDoc); document.removeEventListener('keydown', onEsc); window.removeEventListener('resize', onReflow); window.removeEventListener('scroll', onReflow, true); };
  }, [open, place]);
  return (
    <span className="uidp-wrap" ref={triggerRef} style={wrapStyle} data-popover-open={open ? "true" : undefined}>{/* [UI-STD3] lets an enclosing Modal leave Esc to this popover */}
      <button type="button" className={'uidp-trigger' + (className ? ' ' + className : '')} style={style} id={id} data-name={name} aria-required={required ? 'true' : undefined} title={title} aria-label={ariaLabel} aria-haspopup="dialog" aria-expanded={open} disabled={disabled} onFocus={onFocus} onBlur={onBlur} onClick={(e) => { if (onClick) onClick(e); setOpen((o) => !o); }}>
        <span className="uidp-ic" aria-hidden="true">📅</span>{label || <span className="uidp-ph">{placeholder}</span>}
      </button>
      {open && pos && typeof document !== 'undefined' && createPortal(
        <div ref={popRef} className="uidp-pop" role="dialog" aria-label="Choose date" style={{ position: 'fixed', top: pos.top, insetInlineStart: pos.left, zIndex: 2147483000 }}>{children(setOpen)}</div>,
        document.body
      )}
    </span>
  );
}
/* Single date. value: 'yyyy-mm-dd' | ''. onChange('yyyy-mm-dd'). */
export function DatePicker({ value, onChange, placeholder = 'Select date', weekStartsOn, min, max, disabled }) {
  _ensureDpCss();
  return (
    <_DpPopover label={value ? _dpFmt(value) : null} placeholder={placeholder} disabled={disabled}>
      {(setOpen) => <_DpCalendar mode="single" value={value || null} weekStartsOn={weekStartsOn} min={min} max={max} onSelect={(v) => { onChange && onChange(v); setOpen(false); }} />}
    </_DpPopover>
  );
}
/* Date range. value: {from:'yyyy-mm-dd'|null, to:'yyyy-mm-dd'|null}. onChange({from,to}). */
export function DateRangePicker({ value, onChange, placeholder = 'Select range', weekStartsOn, min, max, disabled }) {
  _ensureDpCss();
  const v = value || { from: null, to: null };
  const label = v.from ? (_dpFmt(v.from) + ' → ' + (v.to ? _dpFmt(v.to) : '…')) : null;
  return (
    <_DpPopover label={label} placeholder={placeholder} disabled={disabled}>
      {(setOpen) => <_DpCalendar mode="range" value={v} weekStartsOn={weekStartsOn} min={min} max={max} onSelect={(r) => { onChange && onChange(r); if (r.from && r.to) setOpen(false); }} />}
    </_DpPopover>
  );
}
/* Drop-in replacement for <input type="date">. Same API surface: `value`/`defaultValue`
   are 'yyyy-mm-dd' strings, `onChange` receives an event-like { target: { value } } so
   existing `e.target.value` handlers keep working. min/max are 'yyyy-mm-dd'. className,
   style, id, name, required, title, aria-label, placeholder all pass through to the
   trigger. Renders the calendar popover instead of the native OS control. */
export function DateField(props) {
  _ensureDpCss();
  const { value, defaultValue, onChange, onBlur, onClick, onFocus, placeholder = 'Select date', weekStartsOn, min, max, disabled, className, style, id, name, required, title } = props;
  const ariaLabel = props['aria-label'];
  const controlled = value !== undefined;
  const [inner, setInner] = React.useState(defaultValue != null ? String(defaultValue) : '');
  const cur = controlled ? (value != null ? String(value) : '') : inner;
  const emit = (v) => { if (!controlled) setInner(v); const ev = { target: { value: v, name: name || '' }, currentTarget: { value: v, name: name || '' } }; if (onChange) onChange(ev); if (onBlur) onBlur(ev); };
  return (
    <_DpPopover label={cur ? _dpFmt(cur) : null} placeholder={placeholder} disabled={disabled} className={className} style={style} id={id} name={name} required={required} title={title} ariaLabel={ariaLabel} onClick={onClick} onFocus={onFocus}>
      {(setOpen) => <_DpCalendar mode="single" value={cur || null} weekStartsOn={weekStartsOn} min={min || undefined} max={max || undefined} onSelect={(v) => { emit(v); setOpen(false); }} />}
    </_DpPopover>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   PLATFORM PRIMITIVES  (added 2026-09 — enterprise UI/UX transformation)
   ───────────────────────────────────────────────────────────────────────────
   WHY THESE EXIST
   A system audit found the kit was missing the primitives modules need most,
   so every module hand-rolled its own:

     · 97 files hand-rolled a fixed-overlay dialog — 0 had a focus trap
     · 246 of 248 files with a loading flag rendered the text "Loading…"
     · 168 of 177 files containing a <table> had no empty state
     · 94 table files had no horizontal-scroll wrapper (broken at 375px)
     · 4,445 form controls shared just 24 `htmlFor` attributes
     · 1,044 `<div onClick>` were keyboard-inaccessible

   That is not carelessness — it is the predictable result of a kit with no
   Modal, Toast, Select, Field, Table or ErrorState. These close that gap.

   RULES (same as the rest of this file):
     · token-only — no hardcoded hex
     · additive — nothing above this line changed
     · accessible by construction — you should not be able to build an
       inaccessible dialog with <Modal>, or an unlabelled input with <Field>
   ═══════════════════════════════════════════════════════════════════════════ */

/* ── focus management ──────────────────────────────────────────────────────
   A dialog that does not trap focus lets the keyboard wander behind the
   overlay — the single most common a11y failure in this codebase. */
const _FOCUSABLE = 'a[href],area[href],input:not([disabled]):not([type="hidden"]),select:not([disabled]),textarea:not([disabled]),button:not([disabled]),iframe,object,embed,[tabindex]:not([tabindex="-1"]),[contenteditable="true"]';

function _useFocusTrap(open, onClose, closeOnEsc = true) {
  const ref = React.useRef(null);
  const restoreTo = React.useRef(null);
  // [UI-STD3 2026-10-30] onClose lives in a ref. Callers pass inline arrows
  // (onClose={() => setX(null)}), a new function every render; with onClose in the
  // effect deps, every keystroke in the dialog tore the trap down (focus back to
  // the opener) and rebuilt it (focus jumped to the first button), and re-saved
  // restoreTo so closing returned focus to the wrong element.
  const onCloseRef = React.useRef(onClose);
  onCloseRef.current = onClose;
  React.useEffect(() => {
    if (!open) return undefined;
    restoreTo.current = document.activeElement;
    // Lock background scroll — without this the page behind a modal scrolls.
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    // Move focus in: first focusable element, else the container itself.
    const t = setTimeout(() => {
      const box = ref.current; if (!box) return;
      const first = box.querySelector(_FOCUSABLE);
      (first || box).focus({ preventScroll: true });
    }, 0);
    const onKey = (e) => {
      if (e.key === 'Escape' && closeOnEsc) {
        // [UI-STD3] Esc belongs to the TOPMOST dialog only. This listener runs in the capture phase, so it used to
        // close a kit Modal/Drawer even while a confirmDialog/promptDialog (or a nested dialog) sat on top of it.
        if (e.defaultPrevented) return;
        // Topmost = highest effective z-index (DOM order only breaks ties): confirm prompts are mounted early in the
        // page at z 2147483640, while kit portals are appended last — so DOM order alone picks the wrong one.
        const box = ref.current;
        const zOf = (el) => { let z = 0; for (let n = el; n && n !== document.body; n = n.parentElement) { const v = parseInt(getComputedStyle(n).zIndex, 10); if (!Number.isNaN(v)) z = Math.max(z, v); } return z; };
        const all = Array.from(document.querySelectorAll('[role="dialog"][aria-modal="true"], [role="alertdialog"]'));
        let top = null, topZ = -Infinity;
        all.forEach((el) => { const z = zOf(el); if (z >= topZ) { topZ = z; top = el; } });
        if (box && top && top !== box && !box.contains(top)) return;
        // a popover inside the dialog (date picker, menu) closes first; the dialog stays
        if (box && box.querySelector('[data-popover-open="true"]')) return;
        e.stopPropagation(); onCloseRef.current && onCloseRef.current(); return;
      }
      if (e.key !== 'Tab') return;
      const box = ref.current; if (!box) return;
      const items = Array.from(box.querySelectorAll(_FOCUSABLE)).filter((el) => el.offsetParent !== null || el === document.activeElement);
      if (!items.length) { e.preventDefault(); box.focus({ preventScroll: true }); return; }
      const first = items[0], last = items[items.length - 1];
      if (e.shiftKey && (document.activeElement === first || document.activeElement === box)) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    };
    document.addEventListener('keydown', onKey, true);
    return () => {
      clearTimeout(t);
      document.removeEventListener('keydown', onKey, true);
      document.body.style.overflow = prevOverflow;
      // Return focus to whatever opened the dialog.
      try { restoreTo.current && restoreTo.current.focus && restoreTo.current.focus({ preventScroll: true }); } catch (_) {}
    };
  }, [open, closeOnEsc]);
  return ref;
}

/* Spread onto any non-button element you must make clickable, so it also
   responds to Enter/Space and is reachable by Tab.
   Codemod target for the 1,044 `<div onClick>` in this codebase:
     <div onClick={go}>        →  <div {...a11yClick(go)}>                */
// [UI-STD3 2026-10-30] KPI stripe rule — one restrained colour per dashboard. A tile's stripe is the department colour;
// it turns red / amber only when an ALERT metric (danger / warning tone) is actually non-zero. Static category colours
// (info, purple, success, brand) collapse to the department colour, so a row of tiles no longer reads as a rainbow.
export function kpiAccent(tone, value, dept = 'var(--color-brand)') {
  const t = String(tone || '');
  if (/--dept-/.test(t)) return tone; // already a department colour
  if (/danger|warning|critical/.test(t)) {
    const n = typeof value === 'number' ? value : parseFloat(String(value == null ? '' : value).replace(/[^0-9.\-]/g, ''));
    return n > 0 ? tone : dept;
  }
  return dept;
}

export function a11yClick(onClick, { role = 'button', disabled = false } = {}) {
  if (disabled) return { role, 'aria-disabled': true };
  return {
    role,
    tabIndex: 0,
    onClick,
    onKeyDown: (e) => {
      // [UI-STD 2026-10-30] Only when the key was pressed ON this element. Without
      // this guard, Enter on a button INSIDE a clickable card bubbled up, was
      // preventDefault()-ed here, and fired the card instead of the button.
      if (e.target !== e.currentTarget) return;
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'Spacebar') {
        e.preventDefault();
        onClick && onClick(e);
      }
    },
  };
}

/* [UI-STD 2026-10-30] Handler-agnostic keyboard activation for an element that
   already has an onClick: Enter/Space on the element itself re-dispatches a real
   click, so the existing handler runs unchanged. Used by the a11y codemod:
     <div onClick={go}>  →  <div onClick={go}> */
export function onKeyActivate(e) {
  if (e.target !== e.currentTarget) return;
  if (e.key === 'Enter' || e.key === ' ' || e.key === 'Spacebar') {
    e.preventDefault();
    e.currentTarget.click();
  }
}

/* ── Modal ────────────────────────────────────────────────────────────────
   Replaces the ~170 hand-rolled `position:fixed; inset:0` overlays.
   Gives every dialog, for free: focus trap · Esc · focus restore ·
   scroll lock · role="dialog" · aria-modal · labelled title · backdrop click. */
export function Modal({
  open = true, onClose, title, subtitle, icon, children, footer,
  width = 520, closeOnBackdrop = true, closeOnEsc = true, zIndex = 100000, labelledBy,
}) {
  const ref = _useFocusTrap(open, onClose, closeOnEsc);
  const titleId = React.useMemo(() => labelledBy || 'mdl-' + Math.random().toString(36).slice(2, 9), [labelledBy]);
  _ensureAppleCss();
  if (!open) return null;
  return createPortal(
    <div
      className="u-scrim"
      onMouseDown={(e) => { if (closeOnBackdrop && e.target === e.currentTarget) onClose && onClose(); }}
      style={{
        position: 'fixed', inset: 0, zIndex, background: 'var(--scrim, rgba(9,12,24,.55))',
        display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
        padding: 'var(--space-4, 16px)', overflowY: 'auto',
      }}
    >
      {/* u-material-thick + u-modal: the surface MATERIALIZES (blur and scale
          move together) rather than merely fading in, so it reads as a real
          pane arriving above the content rather than a rectangle appearing. */}
      <div
        ref={ref} role="dialog" aria-modal="true" aria-labelledby={title ? titleId : undefined} tabIndex={-1}
        className="u-modal u-material-thick u-material-edge"
        /* [UI-STD3] no mousedown stopPropagation: the scrim already checks target === currentTarget, and the stop
           hid every click inside the dialog from document listeners (a DateField popover could never close). */
        style={{
          border: '1px solid var(--border)', borderRadius: 'var(--radius-xl, 16px)',
          boxShadow: 'var(--shadow-lg)', width, maxWidth: '96vw', margin: 'auto',
          padding: 'var(--space-5, 20px)', outline: 'none',
        }}
      >
        {(title || onClose) && (
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--space-3, 12px)', marginBottom: 'var(--space-4, 16px)' }}>
            {icon != null && <span aria-hidden="true" style={{ fontSize: 'var(--text-title)' }}>{icon}</span>}
            <div style={{ flex: 1, minWidth: 0 }}>
              {title && <h2 id={titleId} className="u-t-title" style={{ margin: 0, color: 'var(--text-1)' }}>{title}</h2>}
              {subtitle && <div className="u-t-small" style={{ color: 'var(--text-3)', marginTop: 2 }}>{subtitle}</div>}
            </div>
            {onClose && (
              <button type="button" onClick={onClose} aria-label="Close dialog"
                className="u-press" style={{ ...BTN.icon, flexShrink: 0 }}>✕</button>
            )}
          </div>
        )}
        {children}
        {footer && (
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-2, 8px)', marginTop: 'var(--space-5, 20px)' }}>
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}

/* ── Drawer ───────────────────────────────────────────────────────────────
   Side sheet for record detail / filters. Same a11y guarantees as Modal.
   `side` — 'end' (default, respects RTL) | 'start' | 'bottom'. */
export function Drawer({
  open = true, onClose, title, subtitle, children, footer,
  width = 480, side = 'end', zIndex = 100000, draggable = true,
}) {
  const ref = _useFocusTrap(open, onClose, true);
  const titleId = React.useMemo(() => 'drw-' + Math.random().toString(36).slice(2, 9), []);
  const panelRef = React.useRef(null);
  const scrimRef = React.useRef(null);
  const dragRef = React.useRef(null);
  _ensureAppleCss();

  const bottom = side === 'bottom';
  const rtl = typeof document !== 'undefined' && document.dir === 'rtl';
  // Which screen direction dismisses: bottom sheets go down, side panels go
  // toward the edge they came from. Enter and exit share the same path —
  // "if something disappears one way, we expect it to emerge from where it came."
  const axis = bottom ? 'y' : 'x';
  const sign = bottom ? 1 : ((side === 'start') === rtl ? 1 : -1);

  /* ── Drag-to-dismiss ──────────────────────────────────────────────────
     Three things make this feel native rather than scripted:
       1. 1:1 tracking — the panel stays glued to the pointer, honouring where
          it was grabbed. Anything less breaks the illusion immediately.
       2. Rubber-banding — dragging the WRONG way resists progressively
          instead of stopping dead.
       3. Momentum projection on release — we animate to where the gesture was
          GOING (Apple's exponential-decay projection), not to whatever it was
          nearest when the finger lifted. A flick throws the panel away even if
          it had barely moved.                                               */
  const onPointerDown = (e) => {
    if (!draggable || e.button === 1 || e.button === 2) return;
    // Never hijack a drag that starts on an interactive control or in a
    // scrolled region — the user is reaching for content, not the panel.
    if (e.target.closest && e.target.closest('input,textarea,select,button,a,[role="button"],[data-no-drag]')) return;
    const panel = panelRef.current; if (!panel) return;
    const start = axis === 'y' ? e.clientY : e.clientX;
    dragRef.current = {
      start, offset: 0, id: e.pointerId,
      size: axis === 'y' ? panel.offsetHeight : panel.offsetWidth,
      tracker: createVelocityTracker(),
    };
    dragRef.current.tracker.add(start);
    try { e.currentTarget.setPointerCapture(e.pointerId); } catch (_) {}
    panel.style.willChange = 'transform';
  };

  const onPointerMove = (e) => {
    const d = dragRef.current; if (!d || e.pointerId !== d.id) return;
    const now = axis === 'y' ? e.clientY : e.clientX;
    d.tracker.add(now);
    let delta = (now - d.start) * sign;          // positive = toward dismissal
    if (delta < 0) delta = -rubberband(-delta, d.size); // resist the wrong way
    d.offset = delta;
    const t = axis === 'y' ? 'translateY(' + (delta * sign) + 'px)' : 'translateX(' + (delta * sign) + 'px)';
    panelRef.current.style.transform = t;
    // Dim the scrim in proportion — the background recedes as you pull away.
    if (scrimRef.current) scrimRef.current.style.opacity = String(Math.max(0, 1 - (delta / d.size) * 0.9));
  };

  const endDrag = (e) => {
    const d = dragRef.current; if (!d || (e && e.pointerId !== d.id)) return;
    dragRef.current = null;
    const panel = panelRef.current; if (!panel) return;
    const vRaw = d.tracker.get() * sign;               // px/s toward dismissal
    const projected = d.offset + project(vRaw);        // where the flick lands
    const shouldClose = projected > d.size * 0.5 || vRaw > 550;

    const from = d.offset;
    const to = shouldClose ? d.size : 0;
    const s = spring({
      from, to, velocity: vRaw,
      // A dismissal carries the gesture's momentum, so it gets bounce; a
      // snap-back is critically damped because nothing "threw" it.
      spring: shouldClose ? SPRING.momentum : SPRING.ui,
      onFrame: (v) => {
        panel.style.transform = axis === 'y' ? 'translateY(' + (v * sign) + 'px)' : 'translateX(' + (v * sign) + 'px)';
        if (scrimRef.current) scrimRef.current.style.opacity = String(Math.max(0, 1 - (v / d.size) * 0.9));
      },
      onDone: () => {
        panel.style.willChange = '';
        if (shouldClose && onClose) onClose();
      },
    });
    // If the user grabs it again mid-flight, the pointerdown handler starts a
    // fresh drag from the live transform — motion is never locked out.
    panel._uiSpring = s;
  };

  if (!open) return null;
  const sheetAnim = bottom ? 'u-sheet-bottom' : (side === 'start' ? 'u-sheet-start' : 'u-sheet-end');
  return createPortal(
    <div
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose && onClose(); }}
      style={{
        position: 'fixed', inset: 0, zIndex,
        display: 'flex', justifyContent: bottom ? 'center' : (side === 'start' ? 'flex-start' : 'flex-end'),
        alignItems: bottom ? 'flex-end' : 'stretch',
      }}
    >
      <div ref={scrimRef} className="u-scrim" aria-hidden="true"
        style={{ position: 'absolute', inset: 0, background: 'var(--scrim, rgba(9,12,24,.55))' }} />
      <div
        ref={(n) => { panelRef.current = n; if (ref) ref.current = n; }}
        role="dialog" aria-modal="true" aria-labelledby={title ? titleId : undefined} tabIndex={-1}
        className={sheetAnim + ' u-material-thick u-material-edge'}
        /* [UI-STD3] no mousedown stopPropagation: the scrim already checks target === currentTarget, and the stop
           hid every click inside the dialog from document listeners (a DateField popover could never close). */
        style={{
          position: 'relative', boxShadow: 'var(--shadow-lg)', outline: 'none',
          width: bottom ? '100%' : width, maxWidth: bottom ? '100%' : '94vw',
          maxHeight: bottom ? '88vh' : '100%', height: bottom ? 'auto' : '100%',
          borderRadius: bottom ? 'var(--radius-xl,16px) var(--radius-xl,16px) 0 0' : 0,
          display: 'flex', flexDirection: 'column', touchAction: draggable ? (bottom ? 'pan-x' : 'pan-y') : 'auto',
        }}
      >
        {/* The header is the drag handle — grabbing the body would fight the
            panel's own scrolling. A bottom sheet also shows a grabber, because
            it is the only affordance saying "this can be pulled". */}
        <div
          onPointerDown={onPointerDown} onPointerMove={onPointerMove}
          onPointerUp={endDrag} onPointerCancel={endDrag}
          style={{ cursor: draggable ? 'grab' : 'default', flexShrink: 0 }}
        >
          {bottom && draggable && <div className="u-grabber" aria-hidden="true" />}
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--space-3,12px)', padding: 'var(--space-4,16px) var(--space-5,20px)', borderBottom: '1px solid var(--border)' }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              {title && <h2 id={titleId} className="u-t-title" style={{ margin: 0, color: 'var(--text-1)' }}>{title}</h2>}
              {subtitle && <div className="u-t-small" style={{ color: 'var(--text-3)', marginTop: 2 }}>{subtitle}</div>}
            </div>
            {onClose && <button type="button" onClick={onClose} aria-label="Close panel" className="u-press" style={{ ...BTN.icon, width: 44, height: 44, minWidth: 44 }}>✕</button>}{/* [UI-STD3] 44px touch target */}
          </div>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: 'var(--space-5,20px)' }}>{children}</div>
        {footer && <div style={{ borderTop: '1px solid var(--border)', padding: 'var(--space-4,16px) var(--space-5,20px)', paddingBottom: 'calc(var(--space-4,16px) + env(safe-area-inset-bottom, 0px))', display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-2,8px)' }}>{/* [UI-STD3] clears the phone home bar */}{footer}</div>}
      </div>
    </div>,
    document.body
  );
}

/* ── Toast ────────────────────────────────────────────────────────────────
   Provider-free by design: a module-level store means `toast()` works from
   anywhere (including non-React code) without wrapping the app tree.
   Mount <ToastHost/> once in the shell. Announced via aria-live. */
const _toastStore = { items: [], subs: new Set(), seq: 0 };
function _toastEmit() { _toastStore.subs.forEach((fn) => fn([..._toastStore.items])); }
export function toast(message, tone = 'success', ttl = 3200) {
  const id = ++_toastStore.seq;
  _toastStore.items.push({ id, message, tone });
  _toastEmit();
  if (ttl > 0) setTimeout(() => dismissToast(id), ttl);
  return id;
}
export function dismissToast(id) {
  _toastStore.items = _toastStore.items.filter((t) => t.id !== id);
  _toastEmit();
}
export function ToastHost({ zIndex = 100001 }) {
  const [items, setItems] = React.useState([]);
  React.useEffect(() => { _toastStore.subs.add(setItems); setItems([..._toastStore.items]); return () => { _toastStore.subs.delete(setItems); }; }, []);
  _ensureAppleCss();
  if (!items.length) return null;
  const toneColor = (t) => (t === 'error' || t === 'danger' ? 'var(--color-danger)' : t === 'warning' ? 'var(--color-warning)' : t === 'info' ? 'var(--color-info)' : 'var(--color-success)');
  return createPortal(
    <div aria-live="polite" aria-atomic="false"
      style={{ position: 'fixed', insetInlineEnd: 'var(--space-5,20px)', bottom: 'var(--space-5,20px)', zIndex, display: 'flex', flexDirection: 'column', gap: 'var(--space-2,8px)', pointerEvents: 'none' }}>
      {items.map((t) => (
        <div key={t.id} role="status" className="u-toast u-material u-material-edge"
          style={{
            pointerEvents: 'auto', color: 'var(--text-1)',
            border: '1px solid var(--border)', borderInlineStartWidth: 3, borderInlineStartColor: toneColor(t.tone),
            borderRadius: 'var(--radius-md,8px)', boxShadow: 'var(--shadow-lg)',
            padding: 'var(--space-3,12px) var(--space-4,16px)', fontSize: 'var(--text-small)',
            maxWidth: 380, display: 'flex', alignItems: 'center', gap: 'var(--space-3,12px)',
          }}>
          <span style={{ flex: 1 }}>{t.message}</span>
          <button type="button" onClick={() => dismissToast(t.id)} aria-label="Dismiss"
            style={{ background: 'none', border: 'none', color: 'var(--text-3)', cursor: 'pointer', fontFamily: 'inherit', padding: 0, fontSize: 14 }}>✕</button>
        </div>
      ))}
    </div>,
    document.body
  );
}

/* ── Field ────────────────────────────────────────────────────────────────
   Wraps any control with a REAL <label htmlFor>. This codebase has 4,445 form
   controls and 24 htmlFor attributes — placeholders are being used as labels,
   which screen readers do not announce and which vanish once typing starts.

     <Field label="Customer" required hint="Legal entity name" error={err}>
       {(id) => <input id={id} style={INPUT} … />}
     </Field>

   `children` may be a function receiving the generated id, or a plain node
   (in which case the label still wraps it, which is also valid HTML). */
export function Field({ label, required, hint, error, children, style, htmlFor }) {
  const auto = React.useMemo(() => htmlFor || 'fld-' + Math.random().toString(36).slice(2, 9), [htmlFor]);
  const hintId = hint ? auto + '-hint' : undefined;
  const errId = error ? auto + '-err' : undefined;
  const described = [hintId, errId].filter(Boolean).join(' ') || undefined;
  return (
    <div style={{ marginBottom: 'var(--space-3, 12px)', ...style }}>
      <label htmlFor={auto} style={{ ...LABEL, display: 'block' }}>
        {label}{required && <span aria-hidden="true" style={{ color: 'var(--color-danger)', marginInlineStart: 3 }}>*</span>}
        {required && <span className="sr-only" style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0 0 0 0)' }}> (required)</span>}
      </label>
      {typeof children === 'function'
        ? children(auto, { 'aria-describedby': described, 'aria-invalid': error ? true : undefined, required: !!required })
        : children}
      {hint && !error && <div id={hintId} style={{ fontSize: 'var(--text-xs, 12px)', color: 'var(--text-3)', marginTop: 4 }}>{hint}</div>}
      {error && <div id={errId} role="alert" style={{ fontSize: 'var(--text-xs, 12px)', color: 'var(--color-danger)', marginTop: 4, fontWeight: 600 }}>{error}</div>}
    </div>
  );
}

/* ── Select ───────────────────────────────────────────────────────────────
   Native <select> (keyboard + screen-reader correct, and the OS picker on
   mobile) carrying the kit's INPUT styling. `options` accepts
   ['a','b'] or [{value,label}] or [[value,label]]. */
export function Select({ value, onChange, options = [], placeholder, disabled, id, name, style, required, ariaLabel }) {
  const norm = options.map((o) => (Array.isArray(o) ? { value: o[0], label: o[1] } : (o && typeof o === 'object' ? o : { value: o, label: o })));
  return (
    <select
      id={id} name={name} value={value == null ? '' : value} disabled={disabled} required={required}
      aria-label={ariaLabel}
      onChange={(e) => onChange && onChange(e.target.value, e)}
      style={{ ...INPUT, cursor: disabled ? 'not-allowed' : 'pointer', ...style }}
    >
      {placeholder != null && <option value="">{placeholder}</option>}
      {norm.map((o) => <option key={String(o.value)} value={o.value}>{o.label}</option>)}
    </select>
  );
}

/* ── Switch ──────────────────────────────────────────────────────────────── */
export function Switch({ checked, onChange, label, disabled, id }) {
  const auto = React.useMemo(() => id || 'sw-' + Math.random().toString(36).slice(2, 9), [id]);
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--space-2,8px)' }}>
      <button
        type="button" role="switch" aria-checked={!!checked} aria-labelledby={label ? auto + '-l' : undefined}
        disabled={disabled} onClick={() => !disabled && onChange && onChange(!checked)}
        style={{
          width: 40, height: 24, flexShrink: 0, borderRadius: 999, position: 'relative', cursor: disabled ? 'not-allowed' : 'pointer',
          border: '1px solid ' + (checked ? 'var(--color-brand)' : 'var(--border-2)'),
          background: checked ? 'var(--color-brand)' : 'var(--bg-3)', opacity: disabled ? 0.5 : 1,
          transition: 'background var(--dur-fast) var(--ease-move)', padding: 0,
        }}>
        <span aria-hidden="true" style={{
          position: 'absolute', top: 2, insetInlineStart: checked ? 18 : 2, width: 18, height: 18, borderRadius: 999,
          background: 'var(--bg-2)', boxShadow: 'var(--shadow-sm)', transition: 'inset-inline-start var(--dur-fast) var(--ease-move)',
        }} />
      </button>
      {label && <label id={auto + '-l'} style={{ fontSize: 'var(--text-small)', color: 'var(--text-2)', cursor: disabled ? 'not-allowed' : 'pointer' }}
        onClick={() => !disabled && onChange && onChange(!checked)}>{label}</label>}
    </span>
  );
}

/* ── TableScroll ──────────────────────────────────────────────────────────
   94 files render a wide <table> with no horizontal-scroll wrapper, so they
   break the layout below ~768px. Wrap once, works everywhere. */
export function TableScroll({ children, minWidth = 640, style }) {
  return (
    <div style={{ width: '100%', overflowX: 'auto', WebkitOverflowScrolling: 'touch', ...style }}>
      <div style={{ minWidth }}>{children}</div>
    </div>
  );
}

/* ── ErrorState ───────────────────────────────────────────────────────────
   The partner to EmptyState. "No data" and "the request failed" must never
   look the same — today 657 swallowed catches make them identical. */
export function ErrorState({ title = "We couldn't load this", detail, onRetry, retryLabel = 'Try again', icon = '⚠️' }) {
  return (
    <div role="alert" style={{
      textAlign: 'center', padding: 'var(--space-8, 32px) var(--space-5, 20px)',
      background: 'var(--bg-2)', border: '1px dashed var(--color-danger)', borderRadius: 'var(--radius-lg, 12px)',
    }}>
      <div aria-hidden="true" style={{ fontSize: 30, marginBottom: 'var(--space-2,8px)' }}>{icon}</div>
      <div style={{ fontWeight: 700, color: 'var(--text-1)', fontSize: 'var(--text-base)' }}>{title}</div>
      {detail && <div style={{ fontSize: 'var(--text-small)', color: 'var(--text-3)', marginTop: 4, maxWidth: 420, marginInline: 'auto' }}>{detail}</div>}
      <div style={{ fontSize: 'var(--text-xs,12px)', color: 'var(--text-3)', marginTop: 6 }}>Your information is safe — nothing was changed.</div>
      {onRetry && <button type="button" onClick={onRetry} style={{ ...BTN.secondary, marginTop: 'var(--space-4,16px)' }}>{retryLabel}</button>}
    </div>
  );
}

/* ── Loadable ─────────────────────────────────────────────────────────────
   One component for the four states every data view needs. Replaces the
   `{loading ? 'Loading…' : rows.length === 0 ? 'No data' : <Table/>}` pattern
   repeated across ~250 files — and makes the error case impossible to forget.

     <Loadable loading={busy} error={err} empty={!rows.length} skeleton="table"
               emptyTitle="No invoices yet" onRetry={load}>
       {() => <Table/>}
     </Loadable>                                                            */
export function Loadable({
  loading, error, empty, children, skeleton = 'card', rows = 5,
  emptyIcon, emptyTitle, emptyHint, emptyAction, onRetry, errorTitle, errorDetail,
}) {
  if (loading) {
    if (skeleton === 'kpi') return <SkeletonKPIs />;
    if (skeleton === 'table') {
      return (
        <div aria-busy="true" aria-live="polite" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2,8px)' }}>
          <span className="sr-only" style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0 0 0 0)' }}>Loading…</span>
          {Array.from({ length: rows }).map((_, i) => <Skeleton key={i} h={38} r={8} />)}
        </div>
      );
    }
    return <div aria-busy="true"><SkeletonCard lines={rows} /></div>;
  }
  if (error) {
    return <ErrorState title={errorTitle} detail={errorDetail || (typeof error === 'string' ? error : (error && error.message))} onRetry={onRetry} />;
  }
  if (empty) {
    return <EmptyState icon={emptyIcon} title={emptyTitle} hint={emptyHint} action={emptyAction} />;
  }
  return typeof children === 'function' ? children() : (children || null);
}

/* ── Badge ────────────────────────────────────────────────────────────────
   Chip communicates a *status*; Badge communicates a *count*. */
export function Badge({ count, tone = 'brand', max = 99, ariaLabel }) {
  if (count == null || count === 0 || count === false) return null;
  const n = typeof count === 'number' ? (count > max ? max + '+' : String(count)) : String(count);
  const bg = tone === 'danger' ? 'var(--color-danger)' : tone === 'warning' ? 'var(--color-warning)' : tone === 'success' ? 'var(--color-success)' : 'var(--color-brand)';
  return (
    <span aria-label={ariaLabel} style={{
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center', minWidth: 18, height: 18,
      padding: '0 6px', borderRadius: 999, background: bg, color: '#fff',
      fontSize: 'var(--text-micro, 10px)', fontWeight: 800, lineHeight: 1,
    }}>{n}</span>
  );
}

/* ── Breadcrumb ───────────────────────────────────────────────────────────
   items: [{label, onClick}] — the last entry renders as the current page. */
export function Breadcrumb({ items = [], style }) {
  if (!items.length) return null;
  return (
    <nav aria-label="Breadcrumb" style={{ marginBottom: 'var(--space-2,8px)', ...style }}>
      <ol style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2,8px)', listStyle: 'none', margin: 0, padding: 0, flexWrap: 'wrap' }}>
        {items.map((it, i) => {
          const last = i === items.length - 1;
          return (
            <li key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--space-2,8px)' }}>
              {last || !it.onClick
                ? <span aria-current={last ? 'page' : undefined} style={{ fontSize: 'var(--text-small)', color: last ? 'var(--text-1)' : 'var(--text-3)', fontWeight: last ? 700 : 500 }}>{it.label}</span>
                : <button type="button" onClick={it.onClick} style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontFamily: 'inherit', fontSize: 'var(--text-small)', color: 'var(--text-3)' }}>{it.label}</button>}
              {!last && <span aria-hidden="true" style={{ color: 'var(--text-3)', fontSize: 'var(--text-small)' }}>›</span>}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

/* ── ModuleBoundary ───────────────────────────────────────────────────────
   Today a single root ErrorBoundary wraps all 433 modules, so one module's
   render crash blanks the entire application. Wrap each module instead: the
   shell, navigation and every other module survive.                        */
export class ModuleBoundary extends React.Component {
  constructor(props) { super(props); this.state = { err: null }; }
  static getDerivedStateFromError(err) { return { err }; }
  componentDidCatch(err, info) {
    try { console.error('[ModuleBoundary] ' + (this.props.name || 'module') + ' crashed:', err, info); } catch (_) {}
  }
  render() {
    if (!this.state.err) return this.props.children;
    return (
      <div style={{ padding: 'var(--space-5, 20px)' }}>
        <ErrorState
          title={'“' + (this.props.name || 'This screen') + '” could not be displayed'}
          detail="The rest of the app is unaffected — you can keep working elsewhere. If this keeps happening, send this screen name to IT."
          retryLabel="Reload this screen"
          onRetry={() => this.setState({ err: null })}
        />
      </div>
    );
  }
}

/* ═══════════════════════════════════════════════════════════════════════════
   APPLE-GRADE CRAFT LAYER  (2026-09)
   ───────────────────────────────────────────────────────────────────────────
   This is NOT decoration, and it deliberately does not make the product look
   like a consumer app. Dense enterprise software is exactly where Apple's
   actual principles pay off:

     · RESPONSE      — feedback on pointer-DOWN, never on release. The moment
                       lag appears, the feeling of directness "falls off a
                       cliff" (Designing Fluid Interfaces, WWDC18).
     · MATERIAL      — translucency encodes hierarchy: chrome floats above
                       content instead of consuming a fixed opaque strip.
     · TYPOGRAPHY    — tracking is SIZE-SPECIFIC. One letter-spacing value for
                       every size is wrong somewhere. Large text tightens,
                       small text opens up (The Details of UI Typography, WWDC20).
     · INTERRUPTIBLE — springs, not fixed-duration transitions. See motion.js.

   Everything degrades correctly under prefers-reduced-motion,
   prefers-reduced-transparency and prefers-contrast.
   ═══════════════════════════════════════════════════════════════════════════ */
let _appleCssInjected = false;
function _ensureAppleCss() {
  if (_appleCssInjected || typeof document === 'undefined') return;
  _appleCssInjected = true;
  const s = document.createElement('style');
  s.setAttribute('data-ui-kit', 'apple-craft');
  s.textContent = [
    /* ── Optical typography ──────────────────────────────────────────────
       Tracking tightens as type grows and opens as it shrinks. These pair
       with the existing --text-* size tokens; leading moves inversely. */
    ':root{',
    '--track-page:-0.022em;--track-heading:-0.018em;--track-title:-0.012em;',
    '--track-large:-0.006em;--track-base:0em;--track-small:0.004em;',
    '--track-xs:0.006em;--track-micro:0.01em;',
    '--lead-page:1.08;--lead-heading:1.15;--lead-title:1.25;--lead-base:1.5;--lead-small:1.45;',
    /* Springs, expressed as CSS easing for the non-gestural cases. */
    '--ease-spring:linear(0,0.0067 1.2%,0.0265 2.5%,0.1013 5.1%,0.5087 15.4%,0.7156 21.1%,0.8552 26.9%,0.9411 32.9%,0.9884 39.3%,1.0086 46.2%,1.0117 53.7%,1.0034 68.5%,1);',
    '--ease-out-soft:cubic-bezier(0.32,0.72,0,1);',
    '}',

    /* Apply tracking wherever the kit sets a size token. Opt-in class so we
       never fight a module's own type until it migrates. */
    '.u-t-page{font-size:var(--text-page);letter-spacing:var(--track-page);line-height:var(--lead-page);font-weight:700}',
    '.u-t-heading{font-size:var(--text-heading);letter-spacing:var(--track-heading);line-height:var(--lead-heading);font-weight:700}',
    '.u-t-title{font-size:var(--text-title);letter-spacing:var(--track-title);line-height:var(--lead-title);font-weight:650}',
    '.u-t-base{font-size:var(--text-base);letter-spacing:var(--track-base);line-height:var(--lead-base)}',
    '.u-t-small{font-size:var(--text-small);letter-spacing:var(--track-small);line-height:var(--lead-small)}',
    '.u-t-micro{font-size:var(--text-micro,10px);letter-spacing:var(--track-micro);text-transform:uppercase;font-weight:700}',
    /* Numbers in tables/money must align in columns. Tabular figures do this
       without resorting to a monospace face (476 monospace declarations today). */
    '.u-num{font-variant-numeric:tabular-nums;font-feature-settings:"tnum" 1}',

    /* ── Materials ───────────────────────────────────────────────────────
       Bigger surfaces read as thicker: more blur, deeper shadow. Never stack
       a light translucent surface on another — legibility collapses. */
    '.u-material{background:color-mix(in srgb, var(--bg-2) 78%, transparent);',
    '-webkit-backdrop-filter:blur(20px) saturate(180%);backdrop-filter:blur(20px) saturate(180%);}',
    '.u-material-thick{background:color-mix(in srgb, var(--bg-2) 86%, transparent);',
    '-webkit-backdrop-filter:blur(34px) saturate(180%);backdrop-filter:blur(34px) saturate(180%);}',
    /* A bright top edge reads as light catching a real material. */
    '.u-material-edge{box-shadow:inset 0 1px 0 color-mix(in srgb, var(--text-1) 8%, transparent);}',
    /* Scroll edge effect: a soft fade where content meets floating chrome,
       instead of a hard 1px divider. */
    '.u-scroll-edge{-webkit-mask-image:linear-gradient(to bottom,transparent,#000 12px);mask-image:linear-gradient(to bottom,transparent,#000 12px)}',

    /* ── Response: feedback on press, not release ────────────────────────
       100ms ease-out on the way down is perceived as instant; the release
       settles a touch slower so the control does not feel brittle. */
    '.u-press{transition:transform 140ms var(--ease-out-soft),background 140ms var(--ease-out-soft)}',
    '.u-press:active{transform:scale(0.97)}',
    '.u-press:active{transition-duration:100ms}',
    /* Rows and cards depress less than buttons — mass should feel proportional. */
    '.u-press-subtle{transition:transform 160ms var(--ease-out-soft),background 160ms var(--ease-out-soft)}',
    '.u-press-subtle:active{transform:scale(0.995)}',

    /* ── Dialog / sheet choreography ─────────────────────────────────────
       Materialize, do not merely fade: blur and scale move together so the
       surface reads as an arriving material. Enter and exit share a path. */
    '@keyframes u-scrim-in{from{opacity:0}to{opacity:1}}',
    '@keyframes u-modal-in{from{opacity:0;transform:scale(0.96) translateY(8px)}to{opacity:1;transform:scale(1) translateY(0)}}',
    '@keyframes u-sheet-in-end{from{transform:translateX(24px);opacity:0}to{transform:translateX(0);opacity:1}}',
    '@keyframes u-sheet-in-start{from{transform:translateX(-24px);opacity:0}to{transform:translateX(0);opacity:1}}',
    '@keyframes u-sheet-in-bottom{from{transform:translateY(28px);opacity:0}to{transform:translateY(0);opacity:1}}',
    '@keyframes u-toast-in{from{opacity:0;transform:translateY(12px) scale(0.98)}to{opacity:1;transform:translateY(0) scale(1)}}',
    '.u-scrim{animation:u-scrim-in 220ms var(--ease-out-soft)}',
    '.u-modal{animation:u-modal-in 340ms var(--ease-spring);transform-origin:center top}',
    '.u-sheet-end{animation:u-sheet-in-end 340ms var(--ease-spring)}',
    '.u-sheet-start{animation:u-sheet-in-start 340ms var(--ease-spring)}',
    '.u-sheet-bottom{animation:u-sheet-in-bottom 340ms var(--ease-spring)}',
    '.u-toast{animation:u-toast-in 300ms var(--ease-spring)}',
    /* The grabber on a bottom sheet is an affordance, not an ornament: it is
       the only thing telling you the sheet can be dragged. */
    '.u-grabber{width:36px;height:5px;border-radius:999px;background:var(--text-3);opacity:.32;margin:8px auto 0}',

    /* ── Accessibility: three INDEPENDENT signals ────────────────────────
       Reduced motion does not mean no feedback — it means a gentler,
       non-vestibular equivalent. Keep opacity changes that aid comprehension. */
    '@media (prefers-reduced-motion:reduce){',
    '.u-modal,.u-sheet-end,.u-sheet-start,.u-sheet-bottom,.u-toast{animation:u-scrim-in 160ms ease}',
    '.u-press:active,.u-press-subtle:active{transform:none}',
    '*{scroll-behavior:auto!important}',
    '}',
    '@media (prefers-reduced-transparency:reduce){',
    '.u-material,.u-material-thick{background:var(--bg-2);-webkit-backdrop-filter:none;backdrop-filter:none}',
    '}',
    '@media (prefers-contrast:more){',
    '.u-material,.u-material-thick{background:var(--bg-2);border:1px solid var(--text-1)}',
    '}',
    /* Fallback for browsers without color-mix: solid surfaces, never transparent. */
    '@supports not (background:color-mix(in srgb,red 50%,transparent)){',
    '.u-material,.u-material-thick{background:var(--bg-2)}',
    '}',
  ].join('');
  document.head.appendChild(s);
}

/* Public hook so a module can opt into the craft layer without importing a
   component (e.g. to use .u-num on its money columns). */
export function ensureAppleCraft() { _ensureAppleCss(); }

/* Typography helpers — these exist so a migrating module gets Apple's
   size-specific tracking for free instead of hand-setting letter-spacing.
     <Text as="h1" size="page">Revenue</Text>
     <Num>{money(total)}</Num>                                              */
export function Text({ as: Tag = 'div', size = 'base', children, className = '', style, ...rest }) {
  _ensureAppleCss();
  return <Tag className={('u-t-' + size + ' ' + className).trim()} style={style} {...rest}>{children}</Tag>;
}
/** Tabular figures so numbers line up in columns without a monospace face. */
export function Num({ children, className = '', style, ...rest }) {
  _ensureAppleCss();
  return <span className={('u-num ' + className).trim()} style={style} {...rest}>{children}</span>;
}
