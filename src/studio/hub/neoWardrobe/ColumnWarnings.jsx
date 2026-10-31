/* Neo Wardrobe Studio [NEO-CLOSETS-UX25] - the amber warning cards above the columns card: a dot, a title ("Column 1: 3364 mm"), the reason ("Outside the usual range 400-1000 mm - ...")
 * and the action button ("Use 1000") that applies the clamp. The list comes from wardrobeModel.columnWarnings (the rules engine's ranges). */
import React from 'react';

export default function ColumnWarnings({ items, lang, onFix, testid = 'col-warnings' }) {
  if (!items || !items.length) return null;
  const ar = lang === 'ar'; const L = (en, a) => (ar ? a : en);
  return (
    <ul className="nkw-warns" aria-live="polite" aria-label={L('Column warnings', 'تنبيهات الأعمدة')} data-testid={testid}>
      {items.map((w) => (
        <li key={w.id} className="nkw-warn" data-kind={w.kind} data-col={w.col}>
          <span className="nkw-warn-dot" aria-hidden="true" />
          <div className="nkw-warn-t"><b>{w.title[ar ? 'ar' : 'en']}</b><span>{w.why[ar ? 'ar' : 'en']}</span></div>
          <button type="button" className="nk-btn nkw-warn-b" onClick={() => onFix(w)} data-testid={`fix-${w.id}`}>
            {w.kind === 'width' ? `${L('Use', 'استخدم')} ${w.to}` : `${L('Use', 'استخدم')} ${w.to} ${L(w.to === 1 ? 'leaf' : 'leaves', w.to === 1 ? 'ضلفة' : 'ضلف')}`}
          </button>
        </li>
      ))}
    </ul>
  );
}
