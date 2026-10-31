/* Neo Kitchen Designer UX-23 - pure helpers for the assistant's proposal preview (no React, no DOM, no change to assistant.js).
 * plan() already describes every proposed change as { title, detail: "600 mm  →  800 mm", note, ok }. The preview only READS those cards:
 *   splitDelta(detail)   -> { saved, proposed } so the UI can show the saved value and the proposed one side by side
 *   previewRows(cards)   -> one display row per card (kind 'change' | 'set' | 'plain' | 'blocked')
 *   previewSummary(cards)-> how many changes will apply and how many are skipped (incompatible / not found) */

const ARROW = /\s*(?:→|->|⟶)\s*/;

/** "600 mm  →  800 mm" -> { saved: '600 mm', proposed: '800 mm' }; "→ 800 mm" -> { saved: '', proposed: '800 mm' }; no arrow -> { saved: '', proposed: '' } */
export function splitDelta(detail) {
  const t = String(detail || '').trim();
  if (!t || !ARROW.test(t)) return { saved: '', proposed: '' };
  const parts = t.split(ARROW);
  const proposed = parts.pop().trim();
  const saved = parts.join(' → ').trim();
  return { saved, proposed };
}

export function previewRows(cards) {
  return (cards || []).map((c) => {
    if (!c.ok) return { kind: 'blocked', title: c.title, text: c.detail || '', note: c.note || '' };
    const d = splitDelta(c.detail);
    if (d.saved && d.proposed) return { kind: 'change', title: c.title, saved: d.saved, proposed: d.proposed, note: c.note || '' };
    if (d.proposed) return { kind: 'set', title: c.title, proposed: d.proposed, note: c.note || '' };
    return { kind: 'plain', title: c.title, text: c.detail || '', note: c.note || '' };
  });
}

export function previewSummary(cards) {
  const list = cards || [];
  const ok = list.filter((c) => c.ok).length;
  return { ok, skipped: list.length - ok, total: list.length, canApply: ok > 0 };
}
