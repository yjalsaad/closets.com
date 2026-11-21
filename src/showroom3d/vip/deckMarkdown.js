/* Simple markdown -> deck. Syntax (one item per line; blank lines are ignored):
 *   # Deck title                 the deck title (once)
 *   ## Slide title               starts a slide
 *   > One-line introduction      optional slide lead
 *   - A bullet                   up to 8 per slide
 *   ![alt text](https://...)     an image (https only)
 * Add Arabic to any line with " || ":  "- English text || النص العربي".  Output is a RAW deck: it must still go through sanitizeDeck(). */
import { LIMITS, cleanImageUrl } from './deckSchema';

const bi = (s) => { const i = s.indexOf('||'); if (i < 0) return s.trim(); const en = s.slice(0, i).trim(), ar = s.slice(i + 2).trim(); return { en: en || ar, ar: ar || en }; };
const IMG = /^!\[([^\]]*)\]\(\s*([^\s)]+)\s*\)\s*$/;

/** -> { deck, errors, warnings }  (errors carry line numbers; the deck is null when there are errors) */
export function markdownToDeck(md) {
  const errors = [], warnings = [];
  if (typeof md !== 'string') return { deck: null, errors: ['Paste some text first.'], warnings };
  if (md.length > LIMITS.maxInput) return { deck: null, errors: [`The text is too long (${md.length} characters; the limit is ${LIMITS.maxInput}).`], warnings };
  const lines = md.replace(/\r\n?/g, '\n').split('\n'); let title = null, cur = null; const slides = [];
  lines.forEach((raw, i) => {
    const n = i + 1, line = raw.trim(); if (!line) return;
    if (/^##\s+/.test(line)) { cur = { title: bi(line.replace(/^##\s+/, '')), bullets: [], blocks: [] }; slides.push(cur); return; }
    if (/^#\s+/.test(line)) { if (title) errors.push(`Line ${n}: a second deck title ("# "). Use "## " for slides.`); else title = bi(line.replace(/^#\s+/, '')); return; }
    if (/^#/.test(line) && !/^#\s/.test(line)) { errors.push(`Line ${n}: write a space after the # signs ("# Title" or "## Slide").`); return; }
    if (!cur) { errors.push(`Line ${n}: this line comes before the first slide. Start a slide with "## Slide title".`); return; }
    if (/^>\s*/.test(line)) { cur.lead = bi(line.replace(/^>\s*/, '')); return; }
    if (/^[-*]\s+/.test(line)) { cur.bullets.push(bi(line.replace(/^[-*]\s+/, ''))); return; }
    const m = IMG.exec(line);
    if (m) { if (!cleanImageUrl(m[2])) { errors.push(`Line ${n}: the image address must start with https:// (got "${m[2].slice(0, 40)}").`); return; } cur.blocks.push({ type: 'image', url: m[2], alt: bi(m[1]) || 'Image' }); return; }
    if (/^!\[/.test(line)) { errors.push(`Line ${n}: images are written ![alt text](https://address).`); return; }
    warnings.push(`Line ${n} was ignored: start lines with "# ", "## ", "> ", "- " or "![alt](https://...)".`);
  });
  if (!title) errors.push('Add a deck title on the first line: "# My deck".');
  if (!slides.length) errors.push('Add at least one slide: "## Slide title".');
  if (errors.length) return { deck: null, errors, warnings };
  return { deck: { title, slides }, errors, warnings };
}

/** markdown text -> sanitised deck (the one call the dialog uses) */
export function parseMarkdownDeck(md, sanitize) {
  const r = markdownToDeck(md); if (!r.deck) return { ok: false, deck: null, errors: r.errors, warnings: r.warnings };
  const s = sanitize(r.deck); return { ok: s.ok, deck: s.deck, errors: s.errors, warnings: [...r.warnings, ...s.warnings] };
}
