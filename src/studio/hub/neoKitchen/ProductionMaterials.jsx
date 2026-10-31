/* Neo Kitchen Designer - UX-16 "Production materials" block of the M&S tab.
 *   - one name per part slot (Structure, Shelves, Back, Base / Wall / Top / Tall doors, Drawer fronts, Drawer boxes, Plinth, Countertop,
 *     Handles); "same name = same material" (case / spacing ignored); names live in model.mats and travel with the project (autosave,
 *     JSON, undo). The cut list, CSV, JSON and print already read model.mats - the generic board label stays the fallback.
 *   - each name can be linked to a Hub INVENTORY item (typeahead over inventory_items, read-only, cached). The link lives in
 *     model.matMap, so it survives save / load. Cut-list area per linked material becomes a required quantity (sheets when the item
 *     has a sheet size, else m2) with the shortfall against stock.
 *   - a name that is not in inventory is listed under "Missing items" (copy / CSV). "Create in inventory" appears only for roles the
 *     inventory write policy allows, and only after an explicit confirmation - it is never silent.
 * Everything degrades: no inventory table, no network or no permission only hides the live columns. */
import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import './materialsPro.css';
import MaterialMap, { useGroupColours, ColourProbe } from './MaterialMap';
import { MAT_SLOTS, SLOT_GROUP } from './constants';
import {
  normName, canonMats, linkMaterial, linkOf, searchItems, exactMatch, requirements, missingItems, missingCSV, namedMaterials,
} from './materials';
import { loadInventory, canCreateInventory, createInventoryItem } from './matInventory';

const f2 = (n) => (Math.round(n * 100) / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const f1 = (n) => (Math.round(n * 10) / 10).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 1 });

/** drop links whose name no slot uses any more */
const prune = (m) => {
  const used = new Set(namedMaterials(m).map((n) => n.key)); const mm = {};
  Object.keys(m.matMap || {}).forEach((k) => { if (used.has(k)) mm[k] = m.matMap[k]; });
  return { ...m, matMap: mm };
};
const setSlotName = (model, slot, value) => {
  const mats = { ...(model.mats || {}) };
  if (String(value).trim()) mats[slot] = value; else delete mats[slot];
  return prune({ ...model, mats });
};

/** the inventory as the block sees it: { status, items } with a reload */
function useInventory(enabled) {
  const [inv, setInv] = useState({ status: enabled ? 'loading' : 'idle', items: [] });
  const alive = useRef(true);
  useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);
  const load = useCallback((force) => {
    setInv((s) => ({ ...s, status: 'loading' }));
    return loadInventory({ force }).then((r) => { if (alive.current) setInv({ status: r.status, items: r.items }); return r; });
  }, []);
  useEffect(() => { if (enabled) load(false); }, [enabled, load]);
  const addItem = useCallback((it) => setInv((s) => ({ ...s, items: [...s.items.filter((x) => String(x.id) !== String(it.id)), it] })), []);
  return [inv, load, addItem];
}

function Suggest({ id, value, inv, onType, onPick, label, placeholder, disabledList }) {
  const [open, setOpen] = useState(false); const [act, setAct] = useState(0);
  const list = useMemo(() => (open && inv.status === 'ok' ? searchItems(value, inv.items, 6) : []), [open, value, inv]);
  const lb = `${id}-lb`;
  const pick = (it) => { setOpen(false); onPick(it); };
  const onKey = (e) => {
    if (e.key === 'ArrowDown' && list.length) { e.preventDefault(); setAct((a) => Math.min(list.length - 1, a + 1)); }
    else if (e.key === 'ArrowUp' && list.length) { e.preventDefault(); setAct((a) => Math.max(0, a - 1)); }
    else if (e.key === 'Enter' && open && list.length && !disabledList) { e.preventDefault(); pick(list[act].item); }
    else if (e.key === 'Escape') setOpen(false);
  };
  return (
    <span className="nk-pm-sug">
      <input id={id} type="text" className="nk-inp nk-inp-wide nk-pm-inp" dir="auto" maxLength={60} autoComplete="off" spellCheck={false}
        role="combobox" aria-expanded={list.length > 0} aria-controls={lb} aria-autocomplete="list" aria-label={label} placeholder={placeholder}
        value={value} onChange={(e) => { onType(e.target.value); setOpen(true); setAct(0); }} onFocus={() => setOpen(true)} onBlur={() => setOpen(false)} onKeyDown={onKey} />
      {list.length > 0 && (
        <ul className="nk-pm-list" id={lb} role="listbox" aria-label={label}>
          {list.map((r, i) => (
            <li key={r.item.id} role="option" aria-selected={i === act} className={i === act ? 'is-act' : ''} onMouseDown={(e) => { e.preventDefault(); pick(r.item); }}>
              <b dir="auto">{r.item.name}</b>
              <small dir="ltr">{r.item.sku || r.item.id} · {r.item.unit || '—'} · {r.item.current_stock != null ? f1(+r.item.current_stock) : '—'}</small>
            </li>
          ))}
        </ul>
      )}
    </span>
  );
}

export default function ProductionMaterials({ P }) {
  const { model, lang, commit, scene } = P;
  const L = (en, ar) => (lang === 'ar' ? ar : en);
  const probe = useRef(null);
  const { effective } = useGroupColours(model, probe);
  const [hover, setHover] = useState(null);
  const names = canonMats(model.mats || {});
  const have = namedMaterials(model);
  const [inv, reload, addItem] = useInventory(true);
  const reqs = useMemo(() => requirements(model, P.bom, inv), [model, P.bom, inv]);
  const missing = useMemo(() => (inv.status === 'ok' ? missingItems(reqs) : []), [reqs, inv.status]);
  const allowCreate = canCreateInventory(P.currentUser) && inv.status === 'ok';
  const [confirm, setConfirm] = useState(null); // { name } waiting for the explicit OK
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');

  /* exact name / SKU matches link themselves once inventory is loaded (one history step, shown with an "auto" chip; unlink any time) */
  useEffect(() => {
    if (inv.status !== 'ok') return;
    let next = model;
    have.forEach((n) => { if (!linkOf(next, n.name)) { const it = exactMatch(n.name, inv.items); if (it) next = linkMaterial(next, n.name, it, 'auto'); } });
    if (next !== model) commit(next, 'matmap:auto');
  }, [inv, model.mats]); // eslint-disable-line react-hooks/exhaustive-deps

  const saveState = P.saveState || 'saved';
  const pill = saveState === 'saving' ? L('Saving…', 'جارٍ الحفظ…') : saveState === 'failed' ? L('Not saved', 'لم يُحفظ') : L('Saved', 'محفوظ');
  const statusLine = {
    idle: '', loading: L('Checking inventory…', 'جارٍ فحص المخزون…'), ok: L(`Inventory: ${inv.items.length} items`, `المخزون: ${inv.items.length} صنف`),
    absent: L('Inventory is not available here. Names are saved with the project and can be linked later.', 'المخزون غير متاح هنا. تُحفظ الأسماء مع المشروع ويمكن ربطها لاحقًا.'),
    denied: L('You do not have access to inventory. Names are still saved with the project.', 'ليس لديك صلاحية المخزون. تُحفظ الأسماء مع المشروع.'),
    error: L('Could not reach inventory. Names are still saved with the project.', 'تعذّر الوصول إلى المخزون. تُحفظ الأسماء مع المشروع.'),
  }[inv.status];

  const create = async (name) => {
    setBusy(true); setMsg('');
    const r = await createInventoryItem(name, P.currentUser);
    setBusy(false); setConfirm(null);
    if (!r.ok) { setMsg(L(`Could not create the item (${r.error}).`, `تعذّر إنشاء الصنف (${r.error}).`)); return; }
    addItem(r.item); // visible at once; the next load reads it back from the table
    commit(linkMaterial(model, name, r.item, 'created'), 'matmap:create');
    if (P.notify) P.notify(L(`Created "${name}" in inventory (stock 0).`, `تم إنشاء «${name}» في المخزون (الكمية 0).`));
  };
  const copyMissing = () => {
    const t = missing.map((m) => `${m.name}\t${m.m2.toFixed(3)} m2`).join('\n');
    try { if (navigator.clipboard) navigator.clipboard.writeText(t); setMsg(L('Missing items copied.', 'تم نسخ الأصناف الناقصة.')); } catch (e) { setMsg(L('Copy is not available in this browser.', 'النسخ غير متاح في هذا المتصفح.')); }
  };
  const csvMissing = () => { if (P.downloadFile) P.downloadFile('missing-inventory-items.csv', missingCSV(missing), 'text/csv'); };

  const chip = (slotName) => {
    const m = reqs.materials.find((x) => x.key === normName(slotName)); if (!m) return null;
    if (m.status === 'linked') {
      const how = m.map.how === 'auto' ? L('auto', 'تلقائي') : m.map.how === 'created' ? L('created', 'جديد') : '';
      return <span className="nk-pm-chip is-ok" data-status="linked"><span aria-hidden="true">✓</span> <b dir="ltr">{m.map.sku || m.map.id}</b>{how && <em>{how}</em>}{m.stock != null && <span dir="ltr"> · {L('in stock', 'بالمخزون')} {f1(m.stock)} {m.item.unit || ''}</span>}
        <button type="button" className="nk-pm-x" aria-label={L('Unlink from inventory', 'فك الربط بالمخزون')} title={L('Unlink', 'فك الربط')} onClick={() => commit(linkMaterial(model, slotName, null), 'matmap:unlink')}>×</button></span>;
    }
    if (m.status === 'stale') return <span className="nk-pm-chip is-warn" data-status="stale"><span aria-hidden="true">⚠</span> {L('linked item not found in inventory', 'الصنف المربوط غير موجود')}</span>;
    if (m.status === 'unlinked') return <span className="nk-pm-chip is-warn" data-status="unlinked"><span aria-hidden="true">⚠</span> {L('not in inventory', 'غير موجود في المخزون')}</span>;
    return null;
  };

  return (
    <section className="nk-card nk-mp nk-pm" data-testid="prod-materials" aria-labelledby="nk-pm-h">
      <ColourProbe ref={probe} />
      <div className="nk-card-head nk-mp-head">
        <h3 className="nk-h3" id="nk-pm-h">{L('Production materials', 'مواد الإنتاج')}</h3>
        <span className="nk-pm-pill" role="status" data-state={saveState} data-testid="mat-saved">{pill}</span>
      </div>
      <div className="nk-mp-map"><MaterialMap scene={scene} target={hover ? { slot: hover } : null} colours={null} label={P.partMapLabel ? L(P.partMapLabel[0], P.partMapLabel[1]) : L('Kitchen part map', 'خريطة أجزاء المطبخ')} testid="mat-map" /></div>
      {!have.length && <p className="nk-pm-empty" data-testid="mat-empty">{L('No materials yet — type a name next to a part.', 'لا توجد مواد بعد — اكتب اسمًا بجانب القطعة.')}</p>}
      <p className="nk-mp-cap">{L('Type a material next to each part. Same name = same material. Saved names go to the cut list, Excel and PDF.', 'اكتب المادة بجانب كل قطعة. نفس الاسم = نفس المادة. الأسماء المحفوظة تظهر في قائمة القص و Excel و PDF.')}</p>
      <div className="nk-pm-rows">
        {(P.slotRows || MAT_SLOTS.filter((s0) => !s0.wd)).map((s) => { // P.slotRows (wardrobe studio): the slots this product uses, with its own names; the kitchen list is unchanged
          const raw = (model.mats || {})[s.k] || ''; const nm = names[s.k] || '';
          const title = L(s.en, s.ar); const id = `nk-pm-${s.k}`;
          return (
            <div key={s.k} className={`nk-pm-row${hover === s.k ? ' is-on' : ''}`} data-slot={s.k} onMouseEnter={() => setHover(s.k)} onMouseLeave={() => setHover(null)} onFocus={() => setHover(s.k)} onBlur={() => setHover(null)}>
              <label className="nk-pm-name" htmlFor={id}>{title}</label>
              <span className="nk-pm-dot" data-set={nm ? '1' : '0'} style={nm ? { background: effective[SLOT_GROUP[s.k]] } : undefined} aria-hidden="true" />
              <Suggest id={id} value={raw} inv={inv} label={title} placeholder="e.g. Oak HPL 18" disabledList={false}
                onType={(v) => commit(setSlotName(model, s.k, v), `mat:${s.k}`)}
                onPick={(it) => commit(linkMaterial(setSlotName(model, s.k, it.name), it.name, it, 'manual'), `mat:${s.k}:pick`)} />
              {nm && <div className="nk-pm-chiprow">{chip(nm)}</div>}
            </div>
          );
        })}
      </div>
      {statusLine && (
        <p className="nk-pm-inv" role="status" data-inv={inv.status}>{statusLine}{(inv.status === 'error' || inv.status === 'absent') && <> <button type="button" className="nk-pm-link" onClick={() => reload(true)}>{L('Retry', 'إعادة المحاولة')}</button></>}</p>
      )}

      {reqs.materials.length > 0 && (
        <div className="nk-pm-req" data-testid="mat-req">
          <h4 className="nk-pm-h4">{L('Needed vs in stock', 'المطلوب مقابل المخزون')}</h4>
          <div className="nk-pm-table" role="table" aria-label={L('Needed vs in stock', 'المطلوب مقابل المخزون')}>
            <div className="nk-pm-tr nk-pm-th" role="row"><span role="columnheader">{L('Material', 'المادة')}</span><span role="columnheader">m²</span><span role="columnheader">{L('Needed', 'المطلوب')}</span><span role="columnheader">{L('In stock', 'المخزون')}</span><span role="columnheader">{L('Short', 'النقص')}</span></div>
            {reqs.materials.map((m) => (
              <div key={m.key} className="nk-pm-tr" role="row" data-status={m.status} data-short={m.shortfall > 0 ? '1' : '0'}>
                <span role="cell" className="nk-pm-c-name" dir="auto">{m.name}</span>
                <span role="cell" dir="ltr">{m.hardware ? '—' : f2(m.m2)}</span>
                <span role="cell" dir="ltr">{m.hardware || m.required == null ? '—' : m.requiredUnit === 'sheet' ? `${f1(m.required)} ${L('sheets', 'ألواح')}` : `${f2(m.required)} m²`}</span>
                <span role="cell" dir="ltr">{m.stock != null ? `${f1(m.stock)} ${m.item.unit || ''}` : '—'}</span>
                <span role="cell" dir="ltr" className={m.shortfall > 0 ? 'is-short' : ''}>{m.shortfall == null ? '—' : m.shortfall > 0 ? `${f1(m.shortfall)} ${m.requiredUnit === 'sheet' ? L('sheets', 'ألواح') : 'm²'}` : '✓'}</span>
              </div>
            ))}
          </div>
          {reqs.generic.pcs > 0 && <p className="nk-pm-note">{L(`${reqs.generic.pcs} pieces (${f2(reqs.generic.m2)} m²) still use the generic board labels - name the part above to include them.`, `${reqs.generic.pcs} قطعة (${f2(reqs.generic.m2)} م²) ما زالت بأسماء الألواح العامة - سمِّ القطعة أعلاه لإدراجها.`)}</p>}
          <p className="nk-pm-note">{L('Area = the cut list m² (qty × largest face of each part). Sheets = m² ÷ the item’s sheet size when it has one; no nesting yield or waste is added.', 'المساحة = م² قائمة القص (العدد × أكبر وجه لكل قطعة). الألواح = م² ÷ مقاس لوح الصنف إن وُجد؛ بلا هدر أو توزيع.')}</p>
        </div>
      )}

      {missing.length > 0 && (
        <div className="nk-pm-missing" data-testid="mat-missing">
          <h4 className="nk-pm-h4">{L('Missing items', 'أصناف ناقصة')} <span className="nk-pm-count">{missing.length}</span></h4>
          <p className="nk-pm-note">{L('These names are not in inventory. Review the list, then add them in Inventory or send it to the owner.', 'هذه الأسماء غير موجودة في المخزون. راجع القائمة ثم أضفها من المخزون أو أرسلها للمالك.')}</p>
          <ul className="nk-pm-mlist">
            {missing.map((m) => (
              <li key={m.name} data-name={m.name}>
                <span dir="auto"><b>{m.name}</b> <small dir="ltr">{f2(m.m2)} m²</small></span>
                {allowCreate && confirm !== m.name && <button type="button" className="nk-btn nk-btn-ghost" disabled={busy} onClick={() => setConfirm(m.name)}>{L('Create in inventory', 'إنشاء في المخزون')}</button>}
                {allowCreate && confirm === m.name && (
                  <span className="nk-pm-confirm" role="alertdialog" aria-label={L('Confirm creating an inventory item', 'تأكيد إنشاء صنف مخزون')} data-testid="create-confirm">
                    <span>{L(`Create “${m.name}” in the Hub inventory as a board (unit: sheet, stock 0)? This writes to the live inventory.`, `إنشاء «${m.name}» في مخزون النظام كلوح (الوحدة: لوح، الكمية 0)؟ هذا يكتب في المخزون الفعلي.`)}</span>
                    <button type="button" className="nk-btn nk-btn-primary" disabled={busy} onClick={() => create(m.name)}>{busy ? L('Creating…', 'جارٍ الإنشاء…') : L('Create item', 'إنشاء الصنف')}</button>
                    <button type="button" className="nk-btn" disabled={busy} onClick={() => setConfirm(null)}>{L('Cancel', 'إلغاء')}</button>
                  </span>
                )}
              </li>
            ))}
          </ul>
          <div className="nk-row-wrap">
            <button type="button" className="nk-btn" onClick={copyMissing}>{L('Copy list', 'نسخ القائمة')}</button>
            <button type="button" className="nk-btn" onClick={csvMissing}>{L('Download CSV', 'تنزيل CSV')}</button>
          </div>
          {!allowCreate && <p className="nk-pm-note">{L('Creating inventory items needs an inventory role (operations / factory manager). Ask the owner to add them from this list.', 'إنشاء أصناف المخزون يحتاج صلاحية مخزون (العمليات / مدير المصنع). اطلب من المالك إضافتها من هذه القائمة.')}</p>}
        </div>
      )}
      {msg && <p className="nk-pm-note" role="status" data-testid="mat-msg">{msg}</p>}
    </section>
  );
}
