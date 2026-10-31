/* Neo Kitchen Designer UX-21 - the Open / Close control bar: a docked, rounded bar under the toolbar with the animation Speed
 * slider, Doors / Drawers / Flip-ups checkboxes, Open All / Close All and an "All units | Selected unit" scope switch.
 * It owns no state: `openIds` (the part ids that are open), `speed` and `scope` live in the designer; every click calls back with a
 * new Set. The checkboxes are the live state of the kind inside the current scope (checked = all open, indeterminate = some),
 * so unchecking Drawers closes the drawers and checking it opens them. Pure selection logic is in workspace3d.js. */
import React, { useMemo } from 'react';
import { Ic } from './icons';
import './wsIcons';
import {
  OPEN_KINDS, KIND_LABEL, frontIds, kindState, setOpen, effectiveScope, speedFromPos, posFromSpeed, fmtSpeed, SPEED,
} from './workspace3d';
import './workspace3d.css';

function KindBox({ kind, st, ar, onToggle }) {
  const ref = React.useRef(null);
  React.useEffect(() => { if (ref.current) ref.current.indeterminate = st.state === 'some'; }, [st.state]);
  const na = st.state === 'na';
  return (
    <label className="nk-oc-chk" data-kind={kind} data-na={na ? '1' : '0'} title={na ? (ar ? 'لا يوجد في هذا النطاق' : 'None in this scope') : undefined}>
      <input ref={ref} type="checkbox" checked={st.state === 'all'} disabled={na} onChange={() => onToggle(kind, st)} data-testid={`oc-${kind}`} />
      <span>{KIND_LABEL[kind][ar ? 1 : 0]}</span>
      {!na && <small dir="ltr" className="nk-oc-n">{st.open}/{st.total}</small>}
    </label>
  );
}

export default function OpenControl({ lang, scene, openIds, onOpenIds, speed, onSpeed, scope, onScope, selUnitId, selLabel, onClose }) {
  const ar = lang === 'ar';
  const L = (en, a) => (ar ? a : en);
  const eff = effectiveScope(scope, selUnitId);
  const unitId = eff === 'selected' ? selUnitId : null;
  const kinds = useMemo(() => OPEN_KINDS.map((k) => [k, kindState(scene, openIds, k, unitId)]), [scene, openIds, unitId]);
  const idsAll = (ks) => frontIds(scene, { unitId, kinds: ks });
  const toggleKind = (kind, st) => onOpenIds(setOpen(openIds, idsAll([kind]), st.state !== 'all'));
  const openAll = () => onOpenIds(setOpen(openIds, idsAll(OPEN_KINDS), true));
  const closeAll = () => onOpenIds(setOpen(openIds, idsAll(OPEN_KINDS), false));
  const anyOpen = kinds.some(([, s]) => s.open > 0);
  const anyClosed = kinds.some(([, s]) => s.state === 'none' || s.state === 'some');
  const noSel = !selUnitId;
  return (
    <div className="nk-oc" role="group" aria-label={L('Open and close', 'الفتح والإغلاق')} data-testid="open-bar" data-scope={eff}>
      <div className="nk-oc-g">
        <label className="nk-oc-speed">
          <span className="nk-oc-lbl">{L('Speed', 'السرعة')}</span>
          <input
            type="range" className="nk-range" min={0} max={100} step={1} value={posFromSpeed(speed)} data-testid="oc-speed"
            aria-label={L('Animation speed', 'سرعة الحركة')} aria-valuemin={SPEED.min} aria-valuemax={SPEED.max} aria-valuenow={speed} aria-valuetext={fmtSpeed(speed)}
            onChange={(e) => onSpeed(speedFromPos(e.target.value))}
          />
          <output className="nk-oc-val" dir="ltr" data-testid="oc-speed-val">{fmtSpeed(speed)}</output>
        </label>
        <div className="nk-oc-kinds" role="group" aria-label={L('Which fronts', 'أي الواجهات')}>
          {kinds.map(([k, s]) => <KindBox key={k} kind={k} st={s} ar={ar} onToggle={toggleKind} />)}
        </div>
      </div>
      <div className="nk-oc-g">
        <div className="nk-oc-btns">
          <button type="button" className="nk-btn" onClick={openAll} disabled={!anyClosed} data-testid="oc-open-all">{L('Open All', 'فتح الكل')}</button>
          <button type="button" className="nk-btn nk-btn-primary" onClick={closeAll} disabled={!anyOpen} data-testid="oc-close-all">{L('Close All', 'إغلاق الكل')}</button>
        </div>
        <div className="nk-seg nk-oc-scope" role="group" aria-label={L('Apply to', 'تطبيق على')}>
          <button type="button" className="nk-seg-b" aria-pressed={eff === 'all'} onClick={() => onScope('all')} data-testid="oc-scope-all">{L('All units', 'كل الوحدات')}</button>
          <button
            type="button" className="nk-seg-b" aria-pressed={eff === 'selected'} disabled={noSel} onClick={() => onScope('selected')} data-testid="oc-scope-sel"
            title={noSel ? L('Select a cabinet first', 'حدد خزانة أولاً') : selLabel}
          >{L('Selected unit', 'الوحدة المحددة')}</button>
        </div>
      </div>
      <button type="button" className="nk-ib nk-oc-x" aria-label={L('Close the open controls', 'إغلاق عناصر الفتح')} data-tip={L('Close this bar (Esc). Doors stay as they are.', 'إغلاق الشريط (Esc). تبقى الأبواب كما هي.')} onClick={onClose} data-testid="oc-close"><Ic n="close" size={16} /></button>
    </div>
  );
}
