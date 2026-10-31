/* Neo Kitchen Designer UX-18 - the File menu of the header: layout label, Reset camera, Load / Save, New (empty) / Default kitchen.
 * Moved out of NeoKitchenDesigner.jsx; the designer passes the handlers, this component owns the menu keyboard model
 * (roving focus, arrows, Home / End, Escape, Tab), the hidden file input and the "Discard the current kitchen?" confirmation. */
import React, { useState, useRef, useLayoutEffect } from 'react';
import { RotateCcw, Upload, Download, Plus, House } from 'lucide-react';
import './fileMenu.css';
import { Ic } from './icons';
import { layoutLabel } from './fileMenuLogic';
import OutputSettings from './OutputSettingsControl'; // [NEO-OUTPUT-UX34] the persistent Output card under the menu

const ICON = { size: 16, strokeWidth: 1.75, 'aria-hidden': true, focusable: false };

/** `nouns` (optional): bilingual wording for another product that reuses this menu (the wardrobe studio): { layout, empty, def, discard } as [en, ar] pairs.
 * Omitted = the kitchen wording, unchanged. */
export default function FileMenu({ lang, layout, dirty, open, onToggle, onClose, wrapRef, onResetCamera, onSave, onLoadFile, onNewEmpty, onDefault, nouns }) {
  const ar = lang === 'ar';
  const L = (en, a) => (ar ? a : en);
  const [ask, setAsk] = useState(null); // { kind: 'new' | 'default' | 'load' } while the confirmation is shown
  const trigRef = useRef(null);
  const menuEl = useRef(null);
  const outEl = useRef(null);
  const fileRef = useRef(null);
  const cancelRef = useRef(null);
  const dlgRef = useRef(null);

  const items = () => (menuEl.current ? [...menuEl.current.querySelectorAll('[role="menuitem"]:not(:disabled)')] : []);
  useLayoutEffect(() => { if (open) { const f = items()[0]; if (f) f.focus(); } }, [open]);
  useLayoutEffect(() => { if (ask && cancelRef.current) cancelRef.current.focus(); }, [ask]);

  const closeToTrigger = () => { onClose(); if (trigRef.current) trigRef.current.focus(); };
  const onMenuKey = (e) => {
    const list = items(); const i = list.indexOf(document.activeElement);
    const go = (n) => { e.preventDefault(); if (list.length) list[(n + list.length) % list.length].focus(); };
    if (e.key === 'ArrowDown') go(i + 1);
    else if (e.key === 'ArrowUp') go(i < 0 ? list.length - 1 : i - 1);
    else if (e.key === 'Home') go(0);
    else if (e.key === 'End') go(list.length - 1);
    else if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); closeToTrigger(); }
    else if (e.key === 'Tab') { // Tab leaves the menu; from the last item it goes into the Output card under it (Shift+Tab on the first item and everywhere else it just closes)
      const first = outEl.current && outEl.current.querySelector('[role="radio"][tabindex="0"]');
      if (!e.shiftKey && first && i === list.length - 1) { e.preventDefault(); first.focus(); } else onClose();
    }
  };
  const onOutKey = (e) => {
    if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); closeToTrigger(); return; }
    if (e.key === 'Tab') {
      const radios = [...outEl.current.querySelectorAll('[role="radio"][tabindex="0"], input')]; const at = radios.indexOf(document.activeElement);
      if (e.shiftKey && at === 0) { e.preventDefault(); const l = items(); if (l.length) l[l.length - 1].focus(); } else if (!e.shiftKey && at === radios.length - 1) onClose();
    }
  };
  const onTrigKey = (e) => { if ((e.key === 'ArrowDown' || e.key === 'ArrowUp') && !open) { e.preventDefault(); onToggle(); } };

  /* the destructive actions: nothing to lose -> run now; unsaved work -> ask first */
  const perform = (kind) => {
    if (kind === 'new') onNewEmpty();
    else if (kind === 'default') onDefault();
    else if (kind === 'load' && fileRef.current) fileRef.current.click();
  };
  const run = (kind) => {
    onClose();
    if (dirty) { setAsk({ kind }); return; }
    perform(kind);
  };
  const answer = (yes) => {
    const k = ask && ask.kind; setAsk(null);
    if (yes && k) perform(k);
    else if (trigRef.current) trigRef.current.focus();
  };
  const onDlgKey = (e) => {
    if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); answer(false); return; }
    if (e.key === 'Tab' && dlgRef.current) {
      const b = [...dlgRef.current.querySelectorAll('button')]; if (!b.length) return;
      const first = b[0]; const last = b[b.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  };

  const msg = ask && ask.kind === 'load'
    ? L('Loading a file replaces it. You can still use Undo afterwards.', 'تحميل ملف سيستبدله. يمكنك التراجع بعد ذلك.')
    : L('You have unsaved changes. You can still use Undo afterwards.', 'لديك تغييرات غير محفوظة. يمكنك التراجع بعد ذلك.');

  return (
    <>
      <div className="nk-menuwrap nk-fm" ref={open ? wrapRef : null}>
        <button type="button" ref={trigRef} className="nk-hb" aria-haspopup="menu" aria-expanded={open} aria-label={L('File', 'ملف')} data-testid="file-menu" onClick={onToggle} onKeyDown={onTrigKey}>
          <Ic n="file" /><span className="nk-hb-t">{L('File', 'ملف')}</span>
        </button>
        {open && (
          <div className="nk-fm-pop">
          <div className="nk-menu nk-menu-r nk-fm-menu" role="menu" aria-label={L('File', 'ملف')} ref={menuEl} onKeyDown={onMenuKey} data-testid="file-menu-panel">
            <div className="nk-fm-layout" role="group" aria-label={L('Current layout', 'التخطيط الحالي')} data-testid="fm-layout" data-layout={layout}>
              <i className="nk-fm-dot" aria-hidden="true" /><span className="nk-fm-lt">{nouns && nouns.layout ? nouns.layout[ar ? 1 : 0] : layoutLabel(layout, ar)}</span>
            </div>
            <div className="nk-fm-sep" role="separator" />
            <button type="button" role="menuitem" tabIndex={-1} className="nk-mi nk-fm-mi" data-testid="fm-reset-camera" onClick={() => { onClose(); onResetCamera(); }}>
              <span className="nk-fm-ic nk-fm-ic-blue"><RotateCcw {...ICON} /></span>{L('Reset camera', 'إعادة الكاميرا')}
            </button>
            <div className="nk-fm-sep" role="separator" />
            <button type="button" role="menuitem" tabIndex={-1} className="nk-mi nk-fm-mi" data-testid="fm-load" onClick={() => run('load')}>
              <span className="nk-fm-ic"><Upload {...ICON} /></span>{L('Load…', 'تحميل…')}
            </button>
            <button type="button" role="menuitem" tabIndex={-1} className="nk-mi nk-fm-mi" data-testid="fm-save" onClick={() => { onClose(); onSave(); }}>
              <span className="nk-fm-ic"><Download {...ICON} /></span>{L('Save', 'حفظ')}
            </button>
            <div className="nk-fm-sep" role="separator" />
            <button type="button" role="menuitem" tabIndex={-1} className="nk-mi nk-fm-mi" data-testid="fm-new" onClick={() => run('new')}>
              <span className="nk-fm-ic"><Plus {...ICON} /></span>{nouns && nouns.empty ? nouns.empty[ar ? 1 : 0] : L('New — empty kitchen', 'جديد — مطبخ فارغ')}
            </button>
            <button type="button" role="menuitem" tabIndex={-1} className="nk-mi nk-fm-mi" data-testid="fm-default" onClick={() => run('default')}>
              <span className="nk-fm-ic"><House {...ICON} /></span>{nouns && nouns.def ? nouns.def[ar ? 1 : 0] : L('Default kitchen', 'المطبخ الافتراضي')}
            </button>
          </div>
          <div className="nk-fm-out" ref={outEl} onKeyDown={onOutKey} data-testid="fm-output-card"><OutputSettings lang={lang} variant="panel" testid="fm-output" /></div>
          </div>
        )}
      </div>
      <input ref={fileRef} type="file" accept="application/json,.json" className="nk-sr" tabIndex={-1} aria-label={L('Import project JSON', 'استيراد مشروع JSON')} data-testid="import-file"
        onChange={(e) => { const f = e.target.files && e.target.files[0]; if (f) onLoadFile(f); e.target.value = ''; }} />
      {ask && (
        <div className="nk-fm-scrim" onMouseDown={(e) => { if (e.target === e.currentTarget) answer(false); }}>
          <div className="nk-fm-dlg" role="alertdialog" aria-modal="true" aria-labelledby="nk-fm-dt" aria-describedby="nk-fm-dd" ref={dlgRef} onKeyDown={onDlgKey} data-testid="fm-confirm">
            <h3 className="nk-fm-dt" id="nk-fm-dt">{nouns && nouns.discard ? nouns.discard[ar ? 1 : 0] : L('Discard the current kitchen?', 'تجاهل المطبخ الحالي؟')}</h3>
            <p className="nk-fm-dd" id="nk-fm-dd">{msg}</p>
            <div className="nk-fm-da">
              <button type="button" className="nk-btn" ref={cancelRef} data-testid="fm-confirm-no" onClick={() => answer(false)}>{L('Cancel', 'إلغاء')}</button>
              <button type="button" className="nk-btn nk-btn-danger" data-testid="fm-confirm-yes" onClick={() => answer(true)}>{L('Discard', 'تجاهل')}</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
