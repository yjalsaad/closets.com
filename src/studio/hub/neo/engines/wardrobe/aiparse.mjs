// Standard Wardrobe · AI intent parser (pure, deterministic) — spec §34, §35.
// Turns a natural-language brief into a STRUCTURED parametric command, and a command into a validated
// WardrobeConfiguration. The assistant NEVER creates geometry — it only emits a command that the
// engineering engines validate and build. No LLM/network here: a transparent, testable rule parser.

import { newWardrobeConfig, optimizeModules, doorCountFor, normRules, validateConfig } from './config.mjs';

const r = (n) => Math.round(Number(n) || 0);
const WORDS = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, a: 1, an: 1, single: 1, double: 2, triple: 3 };
const numOf = (tok) => { if (tok == null) return null; const t = String(tok).trim().toLowerCase(); if (/^\d+$/.test(t)) return parseInt(t, 10); return WORDS[t] != null ? WORDS[t] : null; };

function toMm(vStr, unit) {
  let v = parseFloat(vStr); const u = (unit || '').toLowerCase();
  if (u === 'mm') return r(v);
  if (u === 'cm') return r(v * 10);
  if (u === 'm' || /metre|meter/.test(u)) return r(v * 1000);
  return r(v < 50 ? v * 1000 : v);   // bare number: small = metres, large = mm
}
function findLen(s, re) { const m = s.match(re); return m ? toMm(m[1], m[2]) : null; }

/** text → { command:'CREATE_WARDROBE', parameters:{ width,height,depth,type, sections:[…] } } | UNKNOWN */
export function parseWardrobeBrief(text) {
  const s = String(text || '').toLowerCase().trim();
  if (!s) return { command: 'UNKNOWN', reason: 'empty' };

  const UN = '(mm|cm|m|metre|meter|metres|meters)';
  const height = findLen(s, new RegExp('(\\d+(?:\\.\\d+)?)\\s*' + UN + '?\\s*(?:tall|high|height)')) || findLen(s, new RegExp('height[:\\s]+(\\d+(?:\\.\\d+)?)\\s*' + UN + '?'));
  const depth = findLen(s, new RegExp('(\\d+(?:\\.\\d+)?)\\s*' + UN + '?\\s*(?:deep|depth)')) || findLen(s, new RegExp('depth[:\\s]+(\\d+(?:\\.\\d+)?)\\s*' + UN + '?'));
  // blank the height/depth phrases so they aren't mistaken for the width
  let ws = s.replace(new RegExp('(\\d+(?:\\.\\d+)?)\\s*' + UN + '?\\s*(?:tall|high|height|deep|depth)', 'g'), ' ');
  const wbare = ws.match(/\b(\d{3,4})\b/);                    // bare 3–4 digit number → mm (e.g. "2400 wardrobe")
  const width = findLen(ws, new RegExp('(\\d+(?:\\.\\d+)?)\\s*' + UN + '?\\s*(?:wide|width|wardrobe|closet|run)')) || findLen(ws, new RegExp('(\\d+(?:\\.\\d+)?)\\s*' + UN + '\\b')) || (wbare ? toMm(wbare[1], '') : null);

  const type = /slid/.test(s) ? 'sliding' : /hing/.test(s) ? 'hinged' : /\bopen\b/.test(s) ? 'open' : 'sliding';

  // ordered sections (by first appearance)
  const found = []; let m;
  const scan = (re, make) => { re.lastIndex = 0; while ((m = re.exec(s))) { const secs = make(m); (Array.isArray(secs) ? secs : [secs]).forEach((sec, i) => found.push({ idx: m.index + i * 0.01, sec })); } };
  scan(/(?:\b(one|two|three|four|five|six|\d+)\b\s+)?hanging/g, (mm) => { const n = numOf(mm[1]) || 1; return Array.from({ length: n }, () => ({ type: 'HANGING' })); });
  scan(/(?:\b(one|two|three|four|five|six|\d+)\b\s+)?drawers?/g, (mm) => ({ type: 'DRAWERS', drawerCount: numOf(mm[1]) || 3 }));
  scan(/shoe(?:\s*rack|\s*storage)?/g, () => ({ type: 'SHOE' }));
  scan(/(?:\b(one|two|three|four|five|six|\d+)\b\s+)?(?:open\s+)?shel(?:f|ves)|open\s+storage/g, () => ({ type: 'SHELVED' }));
  const sections = found.sort((a, b) => a.idx - b.idx).map((x) => x.sec);

  return { command: 'CREATE_WARDROBE', parameters: { width: width || 3600, height: height || null, depth: depth || null, type, sections } };
}

const SECTION_PREF = { HANGING: 900, DRAWERS: 600, SHOE: 600, SHELVED: 800 };

/** command → validated WardrobeConfiguration (engineering engine builds + validates; AI never does). */
export function commandToConfig(command, rulesRow = {}) {
  const R = normRules(rulesRow || {});
  const p = (command && command.parameters) || {};
  const width = r(p.width || 3600), height = r(p.height || R.standard_height), depth = r(p.depth || R.standard_depth);
  const type = p.type || 'sliding';
  const secs = Array.isArray(p.sections) ? p.sections : [];
  let modules;
  if (secs.length) {
    const raw = secs.map((sc) => SECTION_PREF[sc.type] || 600);
    const sum = raw.reduce((a, b) => a + b, 0) || 1;
    modules = secs.map((sc, i) => {
      const base = { id: 'M' + String(i + 1).padStart(2, '0'), width: Math.max(R.min_module_width, r(width * raw[i] / sum)), hanging: 'none', shelves: 0, drawers: 0 };
      if (sc.type === 'HANGING') { base.hanging = 'double'; base.shelves = 1; }
      else if (sc.type === 'DRAWERS') { base.drawers = Math.min(R.drawer_limit || 4, sc.drawerCount || 3); base.shelves = 1; }
      else if (sc.type === 'SHOE') { base.shelves = 4; }
      else { base.shelves = 5; }
      return base;
    });
    const diff = width - modules.reduce((a, mo) => a + mo.width, 0);
    if (modules.length) modules[0].width += diff;            // absorb rounding so widths sum to the wardrobe
  } else {
    const best = optimizeModules(width, R, 1)[0];
    const widths = best ? best.modules : [width];
    modules = widths.map((w, i) => ({ id: 'M' + String(i + 1).padStart(2, '0'), width: w, hanging: i % 2 ? 'none' : 'double', shelves: 2, drawers: i === 1 ? 3 : 0 }));
  }
  const config = newWardrobeConfig({ width, height, depth, type, doors: type === 'open' ? 0 : doorCountFor(width, type, R), modules });
  return { config, validation: validateConfig(config, R) };
}
