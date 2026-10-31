// ClosetPreview2D.jsx — dependency-free 2D technical preview for the Quote Builder.
// Turns the configurator sections (width/height/depth, doors, drawers, shelves,
// rails, partitions, led, mirror, sliding, worktop) into:
//   1) a FRONT ELEVATION per section (scaled SVG, with doors/drawers/shelves)
//   2) a TOP PLAN of the whole run with a FIT CHECK against an available wall
//   3) an AUTO-DESCRIPTION + thumbnail per section
// Exposes both React components (in-app) and SVG/HTML string builders (for print).
// No external libraries — pure SVG, so it renders offline and in the print iframe.
import React from 'react';
import { defaultBays, finishesOf, unitCat, catConfig, optsOf, UPPER_KINDS, upperLeaves } from './BayDesigner';

const DEFAULT_PALETTE = {
  carcass: '#7a2230',      // wine — carcass outline
  body:    '#fdf9f4',      // warm paper body
  door:    'var(--color-brand-strong)',      // brand orange — door outline
  doorFill:'rgba(234,88,12,0.06)',
  shelf:   '#c9a15e',      // brass — shelves
  handle:  '#7a2230',
  mirror:  '#60a5fa',      // mirror glass tint
  mirrorFill:'#eff6ff',
  led:     '#f4c430',
  dim:     '#6b7280',
  wall:    '#111827',
  good:    '#1D9E75',
  bad:     'var(--color-danger)',
};

const EDGE = '#7a5a37'; // wood-tone edge/detail stroke shared by the 2D + iso drawings
// Darken/lighten a #rrggbb by a percentage (for the worktop slab's 3 faces).
function shade(hex, pct) {
  const h = String(hex || '').replace('#', ''); if (h.length !== 6) return hex;
  const f = (i) => { const v = Math.round(parseInt(h.substr(i, 2), 16) * (1 + pct / 100)); return Math.max(0, Math.min(255, v)).toString(16).padStart(2, '0'); };
  return '#' + f(0) + f(2) + f(4);
}
const escHtml = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[m]));
const nn = (v) => { const x = Number(v); return Number.isFinite(x) ? x : 0; };
const ri = (v) => Math.max(0, Math.round(nn(v)));

// 🚪 Is this an OPEN standard closet (no doors)? Read the type + name so the 2D drawings
// match the 3D: open shelves, hanging rail(s), a bottom drawer bank — never a solid door.
function closetInfo(u) {
  const nm = ((u && (u.unit_type || u.product_type) || '') + ' ' + ((u && u.name) || '')).toLowerCase();
  const open = /closet|wardrobe/.test(nm) && ri(u && u.doors) === 0;
  return { open, hang: /hang/.test(nm), double: /double/.test(nm), nm };
}
// Draws the interior of an open closet into a pixel box: hanging tier(s) with a rail under a
// shelf at the top, open shelves below, and a realistic (never full-height) drawer bank at base.
function closetInteriorSVG(x0, y0, w, h, o, P) {
  const drawers = ri(o.drawers), shelves = ri(o.shelves), hang = !!o.hang, dbl = !!o.double;
  const shelfCol = P.carcass || '#6b4f2a', railCol = P.handle || '#8a5a2b', frontFill = o.frontFill || '#ffffff', doorCol = P.door || shelfCol;
  let out = '';
  const eachDr = Math.max(8, Math.min(h * 0.16, 22));            // one drawer face ≈ realistic height
  const drawerH = drawers > 0 ? Math.min(h * 0.5, drawers * eachDr) : 0;
  let top = y0 + 3; const bottom = y0 + h - drawerH - 3;
  if (hang) {
    const tiers = dbl ? 2 : 1;
    const tierH = Math.max(16, Math.min((bottom - top) / tiers, h * 0.5));
    for (let i = 0; i < tiers && top + 9 < bottom; i++) {
      out += `<line x1="${x0 + 2}" y1="${top.toFixed(1)}" x2="${x0 + w - 2}" y2="${top.toFixed(1)}" stroke="${shelfCol}" stroke-width="1.6"/>`;
      const ry = top + 5;
      out += `<line x1="${x0 + 6}" y1="${ry.toFixed(1)}" x2="${x0 + w - 6}" y2="${ry.toFixed(1)}" stroke="${railCol}" stroke-width="1.8" stroke-linecap="round"/>`;
      out += `<circle cx="${x0 + 6}" cy="${ry.toFixed(1)}" r="1.3" fill="${railCol}"/><circle cx="${x0 + w - 6}" cy="${ry.toFixed(1)}" r="1.3" fill="${railCol}"/>`;
      top += tierH;
    }
  }
  if (shelves > 0 && bottom - top > 8) {
    for (let i = 1; i <= shelves; i++) { const yy = top + (bottom - top) * i / (shelves + 1); out += `<line x1="${x0 + 2}" y1="${yy.toFixed(1)}" x2="${x0 + w - 2}" y2="${yy.toFixed(1)}" stroke="${shelfCol}" stroke-width="1.5"/>`; }
  } else if (!hang && shelves === 0 && drawers === 0) {
    out += `<line x1="${x0 + 2}" y1="${(y0 + 12).toFixed(1)}" x2="${x0 + w - 2}" y2="${(y0 + 12).toFixed(1)}" stroke="${shelfCol}" stroke-width="1.5"/>`;
  }
  if (drawers > 0) {
    const y0d = y0 + h - drawerH, each = drawerH / drawers;
    for (let i = 0; i < drawers; i++) { const dy = y0d + i * each;
      out += `<rect x="${x0 + 2}" y="${(dy + 1).toFixed(1)}" width="${(w - 4).toFixed(1)}" height="${(each - 2).toFixed(1)}" rx="1.5" fill="${frontFill}" stroke="${doorCol}" stroke-width="1"/>`;
      out += `<line x1="${(x0 + w / 2 - Math.min(14, w * 0.2)).toFixed(1)}" y1="${(dy + each / 2).toFixed(1)}" x2="${(x0 + w / 2 + Math.min(14, w * 0.2)).toFixed(1)}" y2="${(dy + each / 2).toFixed(1)}" stroke="${railCol}" stroke-width="1.3" stroke-linecap="round"/>`;
    }
  }
  return out;
}

// ── Auto description ────────────────────────────────────────────────────────
export function describeSection(s, pts) {
  if (!s) return '';
  const pt = (pts || []).find(p => p.id === s.product_type);
  const type = (pt && pt.name) || (s.product_type ? String(s.product_type).replace(/\b\w/g, c => c.toUpperCase()) : 'Unit');
  const W = ri(s.width_mm), H = ri(s.height_mm), D = ri(s.depth_mm);
  const parts = [];
  if (W || H || D) parts.push(`${W || '—'}×${H || '—'}×${D || '—'} mm`);
  const doors = ri(s.doors);
  if (doors) parts.push(`${doors} ${s.sliding ? 'sliding ' : ''}door${doors === 1 ? '' : 's'}${s.mirror ? ' (mirror)' : ''}`);
  const dr = ri(s.drawers); if (dr) parts.push(`${dr} drawer front${dr === 1 ? '' : 's'}`);
  const dri = ri(s.drawers_int); if (dri) parts.push(`${dri} internal drawer${dri === 1 ? '' : 's'}`);
  const sh = ri(s.shelves); if (sh) parts.push(`${sh} shelf${sh === 1 ? '' : 'ves'}`);
  const ra = ri(s.rails); if (ra) parts.push(`${ra} hanging rail${ra === 1 ? '' : 's'}`);
  const pa = ri(s.partitions); if (pa) parts.push(`${pa} partition${pa === 1 ? '' : 's'}`);
  if (s.led) parts.push('LED lighting');
  if (s.worktop) parts.push('worktop');
  const head = s.name ? (s.name + ' — ') : '';
  return `${head}${type}${parts.length ? ': ' + parts.join(', ') : ''}`;
}

// ── Front elevation (returns SVG string) ────────────────────────────────────
export function elevationSVG(s, opt = {}) {
  const P = Object.assign({}, DEFAULT_PALETTE, opt.palette || {});
  if (opt.interiorHex) P.body = opt.interiorHex;   // carcass interior colour (doors/fronts keep their own fill)
  const W = Math.max(50, nn(s.width_mm) || 1000);
  const H = Math.max(50, nn(s.height_mm) || 2000);
  const maxW = opt.maxW || 240, maxH = opt.maxH || 320;
  const pad = opt.pad != null ? opt.pad : (opt.showDims ? 26 : 8);
  const scale = Math.min((maxW - pad * 2) / W, (maxH - pad * 2) / H);
  const w = W * scale, h = H * scale;
  const x0 = pad, y0 = pad;
  const doors = ri(s.doors), drawers = ri(s.drawers), shelves = ri(s.shelves);
  const drawersInt = ri(s.drawers_int); // internal drawers — hidden behind doors
  const rails = ri(s.rails), parts = ri(s.partitions);
  const sliding = !!s.sliding || s.door === "sliding", mirror = !!s.mirror, led = !!s.led;
  const cinfo = closetInfo(s);
  let out = '';
  // carcass body
  out += `<rect x="${x0}" y="${y0}" width="${w}" height="${h}" rx="3" fill="${P.body}" stroke="${P.carcass}" stroke-width="2"/>`;
  // 🚪 open closet → dedicated interior (shelves / hanging / capped drawers), no doors
  if (cinfo.open) {
    out += closetInteriorSVG(x0, y0, w, h, { drawers, shelves, hang: cinfo.hang, double: cinfo.double, frontFill: P.doorFill }, P);
    let vbW0 = w + pad * 2, vbH0 = h + pad * 2;
    if (opt.showDims) {
      const by = y0 + h + 12;
      out += `<line x1="${x0}" y1="${by}" x2="${x0 + w}" y2="${by}" stroke="${P.dim}" stroke-width="0.8"/>`;
      out += `<text x="${x0 + w / 2}" y="${by + 10}" font-size="9" fill="${P.dim}" text-anchor="middle" font-family="sans-serif">${ri(W)} mm</text>`;
      const lx = x0 - 10;
      out += `<line x1="${lx}" y1="${y0}" x2="${lx}" y2="${y0 + h}" stroke="${P.dim}" stroke-width="0.8"/>`;
      out += `<text x="${lx - 3}" y="${y0 + h / 2}" font-size="9" fill="${P.dim}" text-anchor="middle" font-family="sans-serif" transform="rotate(-90 ${lx - 3} ${y0 + h / 2})">${ri(H)} mm</text>`;
    }
    const svg0 = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${vbW0} ${vbH0}" width="${vbW0}" height="${vbH0}" shape-rendering="geometricPrecision">${out}</svg>`;
    return { svg: svg0, vbW: vbW0, vbH: vbH0 };
  }
  // drawer stack reserved at bottom
  let drawerH = drawers > 0 ? Math.min(h * 0.55, Math.max(drawers * 80 * scale, drawers * 16)) : 0;
  const doorAreaY = y0, doorAreaH = h - drawerH;
  // shelves — faint dashed behind (semi-transparent) doors
  for (let i = 1; i <= shelves; i++) {
    const yy = doorAreaY + doorAreaH * i / (shelves + 1);
    out += `<line x1="${x0 + 3}" y1="${yy}" x2="${x0 + w - 3}" y2="${yy}" stroke="${P.shelf}" stroke-width="1" stroke-dasharray="4 3" opacity="0.75"/>`;
  }
  // internal drawers — boxes hidden BEHIND the doors.
  //  · default: faint dashed outlines in the lower door area (door front stays solid).
  //  · opt.openBay: one section drawn "open" (recessed cavity) revealing solid drawer
  //    boxes, so you can show the client what's inside.
  if (drawersInt > 0) {
    const bandH = Math.min(doorAreaH * 0.5, drawersInt * (opt.openBay ? 22 : 16)), bandTop = doorAreaY + doorAreaH - bandH, each = bandH / drawersInt;
    if (opt.openBay) {
      const bx = x0 + w * 0.5, bw = w * 0.5 - 4; // right-hand section opened
      out += `<rect x="${bx}" y="${bandTop - 4}" width="${bw}" height="${bandH + 6}" rx="2" fill="${P.body}" stroke="${P.carcass}" stroke-width="1.2" opacity="0.9"/>`;
      for (let i = 0; i < drawersInt; i++) {
        const dy = bandTop + i * each;
        out += `<rect x="${(bx + 4).toFixed(1)}" y="${(dy + 1).toFixed(1)}" width="${(bw - 8).toFixed(1)}" height="${(each - 2).toFixed(1)}" rx="1.5" fill="${P.doorFill || '#fff'}" stroke="${P.door || P.handle}" stroke-width="1"/>`;
        out += `<line x1="${(bx + bw / 2 - 8).toFixed(1)}" y1="${(dy + each / 2).toFixed(1)}" x2="${(bx + bw / 2 + 8).toFixed(1)}" y2="${(dy + each / 2).toFixed(1)}" stroke="${P.handle}" stroke-width="1.4" stroke-linecap="round"/>`;
      }
    } else {
      for (let i = 0; i < drawersInt; i++) {
        const dy = bandTop + i * each;
        out += `<rect x="${x0 + 6}" y="${(dy + 1).toFixed(1)}" width="${(w - 12).toFixed(1)}" height="${(each - 2).toFixed(1)}" rx="1.5" fill="none" stroke="${P.handle}" stroke-width="0.9" stroke-dasharray="3 3" opacity="0.6"/>`;
      }
    }
  }
  // hanging rails
  for (let i = 1; i <= rails; i++) {
    const yy = doorAreaY + 12 + (i - 1) * 9;
    out += `<line x1="${x0 + 8}" y1="${yy}" x2="${x0 + w - 8}" y2="${yy}" stroke="${P.handle}" stroke-width="2" stroke-linecap="round"/>`;
  }
  // doors
  if (doors > 0) {
    if (sliding) {
      const pw = w / Math.max(2, Math.min(doors, 4)) * 1.06;
      const span = (doors > 1) ? (w - pw) / (doors - 1) : 0;
      for (let i = 0; i < doors; i++) {
        const dx = x0 + i * span;
        out += `<rect x="${dx}" y="${doorAreaY}" width="${pw}" height="${doorAreaH}" fill="${mirror ? P.mirrorFill : P.doorFill}" stroke="${mirror ? P.mirror : P.door}" stroke-width="1.4" opacity="0.92"/>`;
        if (mirror) for (let g = 1; g < 4; g++) { const gx = dx + pw * g / 4; out += `<line x1="${gx}" y1="${doorAreaY + 4}" x2="${dx + 2}" y2="${doorAreaY + doorAreaH - 4}" stroke="${P.mirror}" stroke-width="0.6" opacity="0.5"/>`; }
        out += `<rect x="${dx + pw - 6}" y="${doorAreaY + doorAreaH / 2 - 14}" width="2.4" height="28" rx="1.2" fill="${P.handle}"/>`;
      }
      out += `<line x1="${x0}" y1="${doorAreaY + 2}" x2="${x0 + w}" y2="${doorAreaY + 2}" stroke="${P.carcass}" stroke-width="1.5"/>`;
    } else {
      const gap = 2;
      const dw = (w - gap * (doors + 1)) / doors;
      for (let i = 0; i < doors; i++) {
        const dx = x0 + gap + i * (dw + gap);
        out += `<rect x="${dx}" y="${doorAreaY + gap}" width="${dw}" height="${doorAreaH - gap * 2}" rx="2" fill="${mirror ? P.mirrorFill : P.doorFill}" stroke="${mirror ? P.mirror : P.door}" stroke-width="1.3"/>`;
        if (mirror) for (let g = 1; g < 5; g++) { const gx = dx + dw * g / 5; out += `<line x1="${gx}" y1="${doorAreaY + gap + 3}" x2="${dx + 3}" y2="${doorAreaY + doorAreaH - gap - 3}" stroke="${P.mirror}" stroke-width="0.6" opacity="0.45"/>`; }
        const hcx = (doors === 2 && i === 1) ? dx + 6 : dx + dw - 6; // handles meet in the middle for a pair
        out += `<circle cx="${hcx}" cy="${doorAreaY + doorAreaH / 2}" r="2.4" fill="${P.handle}"/>`;
      }
    }
  }
  // partitions
  for (let i = 1; i <= parts; i++) {
    const px = x0 + w * i / (parts + 1);
    out += `<line x1="${px}" y1="${y0 + 2}" x2="${px}" y2="${y0 + h - 2}" stroke="${P.carcass}" stroke-width="1" opacity="0.55" stroke-dasharray="3 3"/>`;
  }
  // drawers
  if (drawers > 0) {
    const each = drawerH / drawers;
    for (let i = 0; i < drawers; i++) {
      const dy = y0 + doorAreaH + i * each;
      out += `<rect x="${x0 + 2}" y="${dy + 1.5}" width="${w - 4}" height="${each - 3}" rx="2" fill="${P.doorFill}" stroke="${P.door}" stroke-width="1.2"/>`;
      out += `<rect x="${x0 + w / 2 - 12}" y="${dy + each / 2 - 1.5}" width="24" height="3" rx="1.5" fill="${P.handle}"/>`;
    }
  }
  // led strip
  if (led) out += `<rect x="${x0 + 3}" y="${y0 - 3}" width="${w - 6}" height="3" rx="1.5" fill="${P.led}"/>`;
  // dimensions
  let vbW = w + pad * 2, vbH = h + pad * 2;
  if (opt.showDims) {
    const by = y0 + h + 12;
    out += `<line x1="${x0}" y1="${by}" x2="${x0 + w}" y2="${by}" stroke="${P.dim}" stroke-width="0.8"/>`;
    out += `<text x="${x0 + w / 2}" y="${by + 10}" font-size="9" fill="${P.dim}" text-anchor="middle" font-family="sans-serif">${ri(W)} mm</text>`;
    const lx = x0 - 10;
    out += `<line x1="${lx}" y1="${y0}" x2="${lx}" y2="${y0 + h}" stroke="${P.dim}" stroke-width="0.8"/>`;
    out += `<text x="${lx - 3}" y="${y0 + h / 2}" font-size="9" fill="${P.dim}" text-anchor="middle" font-family="sans-serif" transform="rotate(-90 ${lx - 3} ${y0 + h / 2})">${ri(H)} mm</text>`;
  }
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${vbW} ${vbH}" width="${vbW}" height="${vbH}" shape-rendering="geometricPrecision">${out}</svg>`;
  return { svg, vbW, vbH };
}

// ── Fit maths + top plan ────────────────────────────────────────────────────
export function planFit(closets, wallWidthMm) {
  const runW = (closets || []).reduce((a, s) => a + nn(s.width_mm), 0);
  const maxD = (closets || []).reduce((a, s) => Math.max(a, nn(s.depth_mm)), 0);
  const wall = nn(wallWidthMm);
  const fits = wall > 0 ? runW <= wall : null;
  return { runW, maxD, wall, fits, gap: wall - runW };
}

export function planSVG(closets, opt = {}) {
  const P = Object.assign({}, DEFAULT_PALETTE, opt.palette || {});
  const { runW, maxD, wall, fits } = planFit(closets, opt.wallWidthMm);
  const totalMm = Math.max(runW, wall || 0, 100);
  const maxW = opt.maxW || 520, pad = 30;
  const scale = (maxW - pad * 2) / totalMm;
  const depthPx = Math.max(22, (maxD || 600) * scale);
  const x0 = pad, y0 = 22;
  let out = '';
  if (wall > 0) {
    const ww = wall * scale;
    out += `<line x1="${x0}" y1="${y0 - 7}" x2="${x0 + ww}" y2="${y0 - 7}" stroke="${P.wall}" stroke-width="3"/>`;
    for (let hx = x0; hx < x0 + ww; hx += 7) out += `<line x1="${hx}" y1="${y0 - 7}" x2="${hx - 4}" y2="${y0 - 11}" stroke="${P.wall}" stroke-width="0.6" opacity="0.5"/>`;
  }
  let cx = x0;
  (closets || []).forEach((s, i) => {
    const w = nn(s.width_mm) * scale;
    const d = (nn(s.depth_mm) || maxD || 600) * scale;
    out += `<rect x="${cx}" y="${y0}" width="${w}" height="${d}" fill="${P.body}" stroke="${P.carcass}" stroke-width="1.5"/>`;
    out += `<line x1="${cx}" y1="${y0 + d}" x2="${cx + w / 2}" y2="${y0 + d - Math.min(d, w) * 0.5}" stroke="${P.door}" stroke-width="0.7" opacity="0.6"/>`;
    out += `<line x1="${cx + w}" y1="${y0 + d}" x2="${cx + w / 2}" y2="${y0 + d - Math.min(d, w) * 0.5}" stroke="${P.door}" stroke-width="0.7" opacity="0.6"/>`;
    if (w > 14) out += `<text x="${cx + w / 2}" y="${y0 + Math.min(d / 2 + 3, 16)}" font-size="9" fill="${P.carcass}" text-anchor="middle" font-family="sans-serif" font-weight="700">${i + 1}</text>`;
    cx += w;
  });
  const ry = y0 + depthPx + 14;
  out += `<line x1="${x0}" y1="${ry}" x2="${x0 + runW * scale}" y2="${ry}" stroke="${P.dim}" stroke-width="0.8"/>`;
  out += `<text x="${x0 + runW * scale / 2}" y="${ry + 11}" font-size="9.5" fill="${P.dim}" text-anchor="middle" font-family="sans-serif">Run ${ri(runW)} mm</text>`;
  let vbH = ry + 20;
  if (wall > 0) {
    const c = fits ? P.good : P.bad;
    const msg = fits ? `✓ Fits wall ${ri(wall)} mm · ${ri(wall - runW)} mm spare` : `✗ ${ri(runW - wall)} mm too wide for ${ri(wall)} mm wall`;
    out += `<text x="${x0}" y="${ry + 27}" font-size="10.5" fill="${c}" font-family="sans-serif" font-weight="700">${msg}</text>`;
    vbH = ry + 36;
  }
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${maxW} ${vbH}" width="${maxW}" height="${vbH}" shape-rendering="geometricPrecision">${out}</svg>`;
  return { svg, fits, runW, wall };
}

// ── Composed WALL ELEVATION — assembles all units into one drawing ──────────
// Floor units (base/sink/drawers/tall) sit on the floor line left→right; wall
// units hang in the upper band above the base zone; tall units run full height.
// This is the "design based on the quote", not a row of separate cards.
export function unitFamily(u) {
  const t = String((u && (u.unit_type || u.product_type)) || '').toLowerCase();
  if (t.includes('wall')) return 'wall';
  if (t.includes('tall') || t.includes('larder') || t.includes('pantry')) return 'tall';
  // full-height appliance towers (fridge / oven / pantry housings) carry a base-ish
  // unit_type ("Appliance unit") but stand floor-to-ceiling — render them tall.
  const h = Number(u && u.height_mm) || 0;
  if (h >= 1500) return 'tall';
  return 'base';
}
// Minimalist unit box for the scene (carcass + door-handle lines + drawer fronts + led).
function drawUnitBox(u, x0, y0, w, h, P) {
  const doors = ri(u.doors), drawers = ri(u.drawers), sliding = !!u.sliding || u.door === "sliding", mirror = !!u.mirror, led = !!u.led;
  const cinfo = closetInfo(u);
  // per-unit front colour (finish) wins over the palette body; selected unit gets a brand ring
  const fill = mirror ? P.mirrorFill : (u._front || P.body);
  let o = `<rect x="${x0}" y="${y0}" width="${w}" height="${h}" rx="2.5" fill="${fill}" stroke="${u._sel ? 'var(--color-brand)' : P.carcass}" stroke-width="${u._sel ? 2.6 : 1.6}"/>`;
  // 🚪 open closet → interior shelves / hanging / capped drawers (matches the 3D + the drawing)
  if (cinfo.open) {
    o += closetInteriorSVG(x0, y0, w, h, { drawers, shelves: ri(u.shelves), hang: cinfo.hang, double: cinfo.double, frontFill: u._front || '#ffffff' }, P);
    if (led) o += `<rect x="${x0 + 3}" y="${y0 - 2.5}" width="${w - 6}" height="2.5" rx="1.2" fill="${P.led}"/>`;
    return o;
  }
  const drawersOnly = doors === 0 && drawers > 0;
  const drawerBand = drawers > 0 ? (drawersOnly ? h : Math.min(h * 0.5, drawers * Math.max(h * 0.13, 10))) : 0;
  const doorH = h - drawerBand;
  // door handle lines (symmetric per pair) — the clean elevation look
  if (doors > 0 && doorH > 8) {
    const dw = w / doors;
    for (let i = 0; i < doors; i++) {
      const left = i < doors / 2;
      const hx = x0 + dw * i + (left ? dw - Math.min(9, dw * 0.28) : Math.min(9, dw * 0.28));
      const y1 = y0 + doorH * 0.16, y2 = y0 + doorH * 0.62;
      o += `<line x1="${hx}" y1="${y1}" x2="${hx}" y2="${y2}" stroke="${EDGE}" stroke-width="1.1" stroke-linecap="round" opacity="0.6"/>`;
      if (i > 0) o += `<line x1="${x0 + dw * i}" y1="${y0 + 2}" x2="${x0 + dw * i}" y2="${y0 + doorH - 2}" stroke="${P.carcass}" stroke-width="0.6" opacity="0.4"/>`;
    }
    if (mirror) for (let g = 1; g < 4; g++) o += `<line x1="${x0 + w * g / 4}" y1="${y0 + 4}" x2="${x0 + Math.max(4, w * g / 4 - w * 0.18)}" y2="${y0 + doorH - 4}" stroke="${P.mirror}" stroke-width="0.5" opacity="0.4"/>`;
    if (sliding) o += `<line x1="${x0}" y1="${y0 + 2}" x2="${x0 + w}" y2="${y0 + 2}" stroke="${P.carcass}" stroke-width="1"/>`;
  }
  // drawer fronts
  if (drawers > 0) {
    const y0d = y0 + doorH, each = drawerBand / drawers;
    for (let i = 0; i < drawers; i++) {
      const dy = y0d + i * each;
      if (i > 0) o += `<line x1="${x0 + 1.5}" y1="${dy}" x2="${x0 + w - 1.5}" y2="${dy}" stroke="${P.carcass}" stroke-width="0.9" opacity="0.55"/>`;
      o += `<line x1="${x0 + w / 2 - Math.min(16, w * 0.22)}" y1="${dy + each / 2}" x2="${x0 + w / 2 + Math.min(16, w * 0.22)}" y2="${dy + each / 2}" stroke="${EDGE}" stroke-width="1.2" stroke-linecap="round" opacity="0.6"/>`;
    }
  }
  if (led) o += `<rect x="${x0 + 3}" y="${y0 - 2.5}" width="${w - 6}" height="2.5" rx="1.2" fill="${P.led}"/>`;
  return o;
}
export function elevationSceneSVG(units, opt = {}) {
  const P = Object.assign({}, DEFAULT_PALETTE, opt.palette || {});
  if (opt.interiorHex) P.body = opt.interiorHex;   // carcass interior colour (doors/fronts keep their own fill)
  const list = [];
  (units || []).forEach(u => { if (!u) return; const q = Math.max(1, Math.round(nn(u._qty || u.qty || 1))); for (let i = 0; i < Math.min(q, 12); i++) list.push(u); });
  if (!list.length) return { svg: '', runMm: 0 };
  const WALL_BOTTOM = 1400; // mm — height wall units hang at
  const baseH = (u) => { const h = nn(u.height_mm); return (h > 200 && h < 1300) ? h : 850; };
  const tallH = (u) => { const h = nn(u.height_mm); return (h > 1300) ? h : 2100; };
  const wallH = (u) => { const h = nn(u.height_mm); return (h > 200 && h < 1200) ? h : 720; };
  const wUnit = (u) => Math.max(150, nn(u.width_mm) || 600);
  const floorAll = list.filter(u => unitFamily(u) !== 'wall');
  const wallAll = list.filter(u => unitFamily(u) === 'wall');
  const sceneHmm = Math.max(300, ...list.map(u => { const f = unitFamily(u); return f === 'tall' ? tallH(u) : f === 'wall' ? WALL_BOTTOM + wallH(u) : baseH(u); }));
  const lab = (u, w) => w > 58 ? escHtml(shortName(u)) : w > 32 ? String(ri(wUnit(u))) : '';
  const keyed = (u, body) => (u && u._key) ? `<g data-key="${escHtml(String(u._key))}" style="cursor:pointer">${body}</g>` : body;

  // Layout-aware: an L / U / island kitchen is drawn as SEPARATE walls (stacked rows),
  // not one unrolled straight run. `opt.legs` = [{ mm, top, label }] per wall; when there
  // are 2+ legs and the layout isn't straight, units are bucketed onto their wall by
  // cumulative width and each wall is drawn as its own elevation.
  const layout = opt.layout || 'straight';
  const legDefs = (Array.isArray(opt.legs) ? opt.legs : []).filter(l => l && nn(l.mm) > 0);
  const multi = legDefs.length > 1 && layout !== 'straight';

  const pad = opt.pad != null ? opt.pad : 16, labelH = 15, dimH = 20;
  const maxW = opt.maxW || 640, maxH = opt.maxH || 300;

  let runs;
  if (multi) {
    // A unit with an explicit `wall` tag (A/B/C) goes on that wall; untagged units
    // auto-distribute by cumulative width against each wall's length.
    const legIdx = (u) => { const t = String((u && u.wall) || '').trim().toUpperCase(); if (!t) return -1; const i = t.charCodeAt(0) - 65; return (i >= 0 && i < legDefs.length) ? i : -1; };
    const bucket = (arr, key) => {
      const b = legDefs.map(() => []);
      let li = 0, acc = 0;
      arr.forEach(u => { const explicit = legIdx(u);
        if (explicit >= 0) { b[explicit].push(u); return; }
        const w = wUnit(u); const cap = nn(legDefs[li][key]) || nn(legDefs[li].mm);
        if (li < legDefs.length - 1 && acc > 0 && acc + w / 2 > cap) { li++; acc = 0; }
        b[li].push(u); acc += w; });
      return b;
    };
    const fB = bucket(floorAll, 'mm'), wB = bucket(wallAll, 'top');
    runs = legDefs.map((l, i) => ({ floor: fB[i], wall: wB[i], label: l.label || ('Wall ' + String.fromCharCode(65 + i)), legMm: nn(l.mm) }));
  } else {
    runs = [{ floor: floorAll, wall: wallAll, label: (opt.legs && opt.legs[0] && opt.legs[0].label) || '', legMm: 0 }];
  }

  const runMmOf = (r) => (r.floor.length ? r.floor : r.wall).reduce((a, u) => a + wUnit(u), 0);
  const maxRunMm = Math.max(1, ...runs.map(r => Math.max(runMmOf(r), r.legMm)));
  const legendH = multi ? 16 : 0, rowGap = multi ? 14 : 0;
  const sW = (maxW - pad * 2) / maxRunMm;
  const sH = (maxH - pad * 2 - runs.length * (labelH + dimH + legendH) - Math.max(0, runs.length - 1) * rowGap) / (runs.length * sceneHmm);
  const s = Math.max(0.02, Math.min(sW, sH));

  let out = '', labels = '', y = pad;
  runs.forEach((r) => {
    if (multi && r.label) { labels += `<text x="${pad}" y="${(y + 11).toFixed(1)}" font-size="11" font-weight="800" fill="${P.carcass}" font-family="sans-serif">${escHtml(r.label)}${r.legMm ? ' · ' + ri(r.legMm) + ' mm' : ''}</text>`; y += legendH; }
    const topPad = y + (r.wall.length ? labelH : 4);
    const floorY = topPad + sceneHmm * s;
    let x = pad; const placed = []; const baseSegs = [];
    r.floor.forEach(u => { const w = wUnit(u) * s; const f = unitFamily(u); const hmm = f === 'tall' ? tallH(u) : baseH(u); const h = hmm * s; const yy = floorY - h;
      out += keyed(u, drawUnitBox(u, x, yy, w, h, P));
      const t = lab(u, w); if (t) labels += `<text x="${(x + w / 2).toFixed(1)}" y="${(floorY + 13).toFixed(1)}" font-size="9.5" fill="${P.dim}" text-anchor="middle" font-family="sans-serif">${t}</text>`;
      if (f !== 'tall') { const last = baseSegs[baseSegs.length - 1]; if (last && Math.abs(last.x1 - x) < 1) { last.x1 = x + w; last.h = Math.max(last.h, hmm); } else baseSegs.push({ x0: x, x1: x + w, h: hmm }); }
      placed.push({ x, w, f }); x += w;
    });
    // 🪵 worktop band — a slab over each contiguous base segment, in the chosen worktop colour
    if (opt.worktopHex && baseSegs.length) { const wtPx = Math.max(3, 40 * s); baseSegs.forEach(sg => { const yTop = floorY - sg.h * s - wtPx; out += `<rect x="${(sg.x0 - 2).toFixed(1)}" y="${yTop.toFixed(1)}" width="${(sg.x1 - sg.x0 + 4).toFixed(1)}" height="${wtPx.toFixed(1)}" rx="1.5" fill="${opt.worktopHex}" stroke="${P.carcass}" stroke-width="0.9"/>`; }); }
    // Wall units hang ABOVE the base cabinets: start above the first base unit, flow
    // left→right, jump OVER any tall/fridge column (full height), never overhang the run.
    const runPx = runMmOf(r) * s, runEndX = pad + runPx;
    const tallSpans = placed.filter(o => o.f === 'tall').map(o => ({ x0: o.x, x1: o.x + o.w }));
    let wx = pad; const firstBase = placed.find(o => o.f !== 'tall'); if (firstBase) wx = firstBase.x;
    r.wall.forEach(u => { const w = wUnit(u) * s;
      let moved = true; while (moved) { moved = false; for (const ts of tallSpans) { if (wx < ts.x1 - 0.5 && wx + w > ts.x0 + 0.5) { wx = ts.x1; moved = true; } } }
      if (wx + w > runEndX + 0.5) return;
      const h = wallH(u) * s; const yy = floorY - (WALL_BOTTOM + wallH(u)) * s;
      out += keyed(u, drawUnitBox(u, wx, yy, w, h, P));
      const t = lab(u, w); if (t) labels += `<text x="${(wx + w / 2).toFixed(1)}" y="${(yy - 5).toFixed(1)}" font-size="9.5" fill="${P.dim}" text-anchor="middle" font-family="sans-serif">${t}</text>`;
      wx += w;
    });
    out += `<line x1="${(pad - 4).toFixed(1)}" y1="${floorY.toFixed(1)}" x2="${(pad + Math.max(runPx, wx - pad) + 4).toFixed(1)}" y2="${floorY.toFixed(1)}" stroke="${P.carcass}" stroke-width="1.4"/>`;
    const dy = floorY + 8;
    out += `<line x1="${pad}" y1="${dy.toFixed(1)}" x2="${(pad + runPx).toFixed(1)}" y2="${dy.toFixed(1)}" stroke="${P.dim}" stroke-width="0.8"/>`;
    out += `<line x1="${pad}" y1="${(dy - 3).toFixed(1)}" x2="${pad}" y2="${(dy + 3).toFixed(1)}" stroke="${P.dim}" stroke-width="0.8"/><line x1="${(pad + runPx).toFixed(1)}" y1="${(dy - 3).toFixed(1)}" x2="${(pad + runPx).toFixed(1)}" y2="${(dy + 3).toFixed(1)}" stroke="${P.dim}" stroke-width="0.8"/>`;
    out += `<text x="${(pad + runPx / 2).toFixed(1)}" y="${(dy + 12).toFixed(1)}" font-size="10.5" fill="${P.carcass}" text-anchor="middle" font-family="sans-serif" font-weight="700">${multi ? '' : 'total run '}${ri(runMmOf(r))} mm</text>`;
    y = dy + 18 + rowGap;
  });
  const totalRunMm = runs.reduce((a, r) => a + runMmOf(r), 0);
  const vbW = pad * 2 + maxRunMm * s, vbH = y;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${vbW.toFixed(1)} ${vbH.toFixed(1)}" width="${vbW.toFixed(1)}" height="${vbH.toFixed(1)}" shape-rendering="geometricPrecision">${out}${labels}</svg>`;
  return { svg, runMm: totalRunMm };
}
function shortName(u) {
  const t = String((u && (u.unit_type || u.product_type)) || '').toLowerCase();
  const w = ri(u && u.width_mm);
  const isCloset = /closet|wardrobe/.test((t + ' ' + ((u && u.name) || '')).toLowerCase());
  const kind = isCloset ? 'Closet' : t.includes('wall') ? 'Wall' : (t.includes('tall') || t.includes('larder')) ? 'Tall' : (u.drawers && !u.doors) ? 'Drawers' : t.includes('sink') ? 'Sink' : t.includes('corner') ? 'Corner' : 'Base';
  return w ? `${kind} ${w}` : (u.name ? String(u.name).slice(0, 12) : kind);
}

// ── Isometric 3D view — axonometric projection of the whole run ─────────────
export function isoSceneSVG(units, opt = {}) {
  const P = Object.assign({}, DEFAULT_PALETTE, opt.palette || {});
  // strong face contrast so the boxes read as solid cabinets, not flat fins
  const FRONT = '#f5ecdd', TOP = '#e3d2b6', SIDE = '#c4a87f';
  // "Finished" mode: turn a single wide/low RUN (a whole kitchen/vanity/TV run) into
  // a realistic row of standard cabinet modules — otherwise one box reads as a flat
  // slab. Kitchens also get an upper wall-unit run; worktop/plinth/cornice auto-on.
  if (opt.finished) {
    const catOf = (u) => String((u && (u.qbp_cat || u.product_type)) || '').toLowerCase();
    const hasKitchen = (units || []).some(u => /kitchen/.test(catOf(u)));
    const hasVanity = (units || []).some(u => /vanity|bath/.test(catOf(u)));
    const hasWall = (units || []).some(u => unitFamily(u) === 'wall');
    const out2 = [];
    (units || []).forEach(u => {
      if (!u) return;
      const w = ri(u.width_mm), h = ri(u.height_mm);
      if (w >= 1200 && w > h * 1.15 && unitFamily(u) !== 'wall') {
        const n = Math.max(2, Math.min(8, Math.round(w / 600) || 2)), each = Math.round(w / n);
        const dist = (t) => { const b = Math.floor(ri(t) / n); let r = ri(t) - b * n; return Array.from({ length: n }, () => { const v = b + (r > 0 ? 1 : 0); if (r > 0) r--; return v; }); };
        const dd = dist(u.doors), dr = dist(u.drawers);
        for (let i = 0; i < n; i++) out2.push({ ...u, width_mm: each, doors: dd[i], drawers: dr[i], _qty: 1 });
        if (/kitchen/.test(catOf(u)) && !hasWall) { const wn = Math.max(1, Math.round(n * 0.6)); for (let i = 0; i < wn; i++) out2.push({ ...u, unit_type: 'wall', product_type: 'wall', width_mm: each, height_mm: 720, depth_mm: Math.min(ri(u.depth_mm) || 600, 350), doors: 1, drawers: 0, shelves: 0, rails: 0, _qty: 1 }); }
      } else out2.push({ ...u, _qty: 1 });
    });
    if (out2.length) units = out2;
    opt = { ...opt };
    if ((hasKitchen || hasVanity) && !opt.worktopHex) opt.worktopHex = '#e8e4dc';
    if ((hasKitchen || hasVanity) && opt.plinth === undefined) opt.plinth = true;
    if (hasKitchen && opt.cornice === undefined) opt.cornice = true;
  }
  const list = [];
  (units || []).forEach(u => { if (!u) return; const q = Math.max(1, Math.round(nn(u._qty || u.qty || 1))); for (let i = 0; i < Math.min(q, 12); i++) list.push(u); });
  if (!list.length) return { svg: '' };
  const WALL_BOTTOM = 1400;
  const baseH = (u) => { const h = nn(u.height_mm); return (h > 200 && h < 1300) ? h : 850; };
  const tallH = (u) => { const h = nn(u.height_mm); return (h > 1300) ? h : 2100; };
  const wallH = (u) => { const h = nn(u.height_mm); return (h > 200 && h < 1200) ? h : 720; };
  const wUnit = (u) => Math.max(150, nn(u.width_mm) || 600);
  const depth = (u) => { const d = nn(u.depth_mm); return d > 80 ? d : (unitFamily(u) === 'wall' ? 350 : 600); };
  const floor = list.filter(u => unitFamily(u) !== 'wall');
  const wall = list.filter(u => unitFamily(u) === 'wall');
  const boxes = []; let x = 0; const placed = [];
  floor.forEach(u => { const w = wUnit(u), f = unitFamily(u), h = f === 'tall' ? tallH(u) : baseH(u); boxes.push({ x0: x, x1: x + w, y0: 0, y1: depth(u), z0: 0, z1: h, u }); placed.push({ x, f }); x += w; });
  let wx = 0; const fb = placed.find(o => o.f !== 'tall'); if (fb) wx = fb.x;
  wall.forEach(u => { const w = wUnit(u); boxes.push({ x0: wx, x1: wx + w, y0: 0, y1: depth(u), z0: WALL_BOTTOM, z1: WALL_BOTTOM + wallH(u), u }); wx += w; });
  const COS = 0.866, SIN = 0.5;
  const p2 = (X, Y, Z) => [(X - Y) * COS, (X + Y) * SIN - Z];
  let minx = 1e9, maxx = -1e9, miny = 1e9, maxy = -1e9;
  boxes.forEach(b => { [[b.x0, b.y0, b.z0], [b.x1, b.y0, b.z0], [b.x1, b.y1, b.z0], [b.x0, b.y1, b.z0], [b.x0, b.y0, b.z1], [b.x1, b.y0, b.z1], [b.x1, b.y1, b.z1], [b.x0, b.y1, b.z1]].forEach(c => { const p = p2(c[0], c[1], c[2]); if (p[0] < minx) minx = p[0]; if (p[0] > maxx) maxx = p[0]; if (p[1] < miny) miny = p[1]; if (p[1] > maxy) maxy = p[1]; }); });
  const maxW = opt.maxW || 640, maxH = opt.maxH || 320, pad = 16;
  const s = Math.min((maxW - pad * 2) / Math.max(maxx - minx, 1), (maxH - pad * 2) / Math.max(maxy - miny, 1));
  const ox = pad - minx * s, oy = pad - miny * s;
  const pr = (X, Y, Z) => { const p = p2(X, Y, Z); return [(ox + p[0] * s).toFixed(1), (oy + p[1] * s).toFixed(1)]; };
  const poly = (pts, fill) => `<polygon points="${pts.map(p => p.join(',')).join(' ')}" fill="${fill}" stroke="${EDGE}" stroke-width="1" stroke-linejoin="round"/>`;
  boxes.sort((a, b) => a.z0 - b.z0 || (a.x0 + a.y0) - (b.x0 + b.y0));
  let out = '';
  // soft ground shadows under floor-standing units (grounds them so they don't float)
  boxes.filter(b => b.z0 < 1).forEach(b => {
    const s0 = pr(b.x0, b.y0, 0), s1 = pr(b.x1, b.y0, 0), s2 = pr(b.x1, b.y1 + 90, 0), s3 = pr(b.x0, b.y1 + 90, 0);
    out += `<polygon points="${[s0, s1, s2, s3].map(p => p.join(',')).join(' ')}" fill="rgba(60,40,20,0.10)"/>`;
  });
  // Faint back wall — only when wall units are present, so they read as mounted
  // to the wall (with the backsplash gap) instead of floating in space.
  if (boxes.some(b => b.z0 > 1000)) {
    const rx0 = Math.min(...boxes.map(b => b.x0)), rx1 = Math.max(...boxes.map(b => b.x1));
    const yb = Math.max(...boxes.map(b => b.y1)), zTop = Math.max(...boxes.map(b => b.z1)) + 120;
    const w0 = pr(rx0, yb, 0), w1 = pr(rx1, yb, 0), w2 = pr(rx1, yb, zTop), w3 = pr(rx0, yb, zTop);
    out += `<polygon points="${[w0, w1, w2, w3].map(p => p.join(',')).join(' ')}" fill="#eff2f6" stroke="#dde2e8" stroke-width="1"/>`;
  }
  boxes.forEach(b => {
    const A = pr(b.x0, b.y0, b.z0), B = pr(b.x1, b.y0, b.z0), F = pr(b.x1, b.y0, b.z1), E = pr(b.x0, b.y0, b.z1);
    const C = pr(b.x1, b.y1, b.z0), G = pr(b.x1, b.y1, b.z1), H = pr(b.x0, b.y1, b.z1);
    // only the OPEN right end of a row shows a side face (interior sides are shared/hidden)
    const hasRightNeighbor = boxes.some(o => o !== b && o.z0 === b.z0 && Math.abs(o.x0 - b.x1) < 1);
    out += poly([E, F, G, H], TOP);          // top
    if (!hasRightNeighbor) out += poly([B, C, G, F], SIDE); // right side (end cap only)
    out += poly([A, B, F, E], FRONT);        // front
    // front-face detail (doors as dividers/handles, drawers as horizontal lines)
    const doors = ri(b.u.doors), drawers = ri(b.u.drawers), led = !!b.u.led;
    const drawersOnly = doors === 0 && drawers > 0;
    const bandH = drawers > 0 ? (drawersOnly ? (b.z1 - b.z0) : Math.min((b.z1 - b.z0) * 0.5, drawers * 160)) : 0;
    const zDoorTop = b.z1, zDoorBot = b.z0 + bandH;
    // Inset door/drawer faces on the front plane (y=0) — so cabinets read as
    // CLOSED paneled fronts, not open boxes. Handle = a short bar on the face.
    const panel = (xa, xb, za, zb) => { const ix = Math.min(26, (xb - xa) * 0.10), iz = Math.min(26, (zb - za) * 0.12); const p1 = pr(xa + ix, 0, za + iz), p2b = pr(xb - ix, 0, za + iz), p3 = pr(xb - ix, 0, zb - iz), p4 = pr(xa + ix, 0, zb - iz); out += `<polygon points="${[p1, p2b, p3, p4].map(p => p.join(',')).join(' ')}" fill="#fbf5ea" stroke="${EDGE}" stroke-width="0.9" stroke-linejoin="round"/>`; };
    const hbar = (xa, xb, z) => { out += `<line x1="${pr(xa, 0, z)[0]}" y1="${pr(xa, 0, z)[1]}" x2="${pr(xb, 0, z)[0]}" y2="${pr(xb, 0, z)[1]}" stroke="${EDGE}" stroke-width="1.5" stroke-linecap="round"/>`; };
    const dw = doors > 0 ? (b.x1 - b.x0) / doors : 0;
    if (doors > 0) for (let i = 0; i < doors; i++) {
      const xa = b.x0 + i * dw, xb = xa + dw; panel(xa, xb, zDoorBot, zDoorTop);
      const left = i < doors / 2; const hx = left ? xb - Math.min(50, dw * 0.2) : xa + Math.min(50, dw * 0.2);
      out += `<line x1="${pr(hx, 0, zDoorBot + (zDoorTop - zDoorBot) * 0.34)[0]}" y1="${pr(hx, 0, zDoorBot + (zDoorTop - zDoorBot) * 0.34)[1]}" x2="${pr(hx, 0, zDoorBot + (zDoorTop - zDoorBot) * 0.66)[0]}" y2="${pr(hx, 0, zDoorBot + (zDoorTop - zDoorBot) * 0.66)[1]}" stroke="${EDGE}" stroke-width="1.6" stroke-linecap="round"/>`;
    }
    if (drawers > 0) { const each = bandH / drawers; for (let i = 0; i < drawers; i++) { const za = b.z0 + i * each, zb = za + each; panel(b.x0, b.x1, za, zb); const cx0 = (b.x0 + b.x1) / 2 - Math.min(90, (b.x1 - b.x0) * 0.18), cx1 = (b.x0 + b.x1) / 2 + Math.min(90, (b.x1 - b.x0) * 0.18); hbar(cx0, cx1, za + each * 0.5); } }
    if (led) out += `<line x1="${pr(b.x0 + 20, 0, b.z0)[0]}" y1="${pr(b.x0 + 20, 0, b.z0)[1]}" x2="${pr(b.x1 - 20, 0, b.z0)[0]}" y2="${pr(b.x1 - 20, 0, b.z0)[1]}" stroke="${P.led}" stroke-width="2.5"/>`;
  });
  // Worktop slab — a countertop over the contiguous BASE run (kitchens / vanities).
  if (opt.worktopHex) {
    const baseB = boxes.filter(b => b.z0 < 1 && (b.z1 - b.z0) < 1300);
    if (baseB.length) {
      const bx0 = Math.min(...baseB.map(b => b.x0)), bx1 = Math.max(...baseB.map(b => b.x1));
      const by1 = Math.max(...baseB.map(b => b.y1)) + 24, zt = Math.max(...baseB.map(b => b.z1)), wt = 44;
      const WT_TOP = opt.worktopHex, WT_FRONT = shade(opt.worktopHex, -12), WT_SIDE = shade(opt.worktopHex, -24);
      const A = pr(bx0, 0, zt), B = pr(bx1, 0, zt), F = pr(bx1, 0, zt + wt), E = pr(bx0, 0, zt + wt);
      const C = pr(bx1, by1, zt), G = pr(bx1, by1, zt + wt), Ht = pr(bx0, by1, zt + wt);
      out += poly([E, F, G, Ht], WT_TOP) + poly([B, C, G, F], WT_SIDE) + poly([A, B, F, E], WT_FRONT);
    }
  }
  // Plinth / toe-kick — a recessed shadow band at the foot of the base units.
  if (opt.plinth) {
    boxes.filter(b => b.z0 < 1 && (b.z1 - b.z0) < 1300).forEach(b => {
      const ph = 95; // mm
      const A = pr(b.x0, 0, 0), B = pr(b.x1, 0, 0), F = pr(b.x1, 0, ph), E = pr(b.x0, 0, ph);
      out += `<polygon points="${[A, B, F, E].map(p => p.join(',')).join(' ')}" fill="rgba(28,18,8,0.30)"/>`;
    });
  }
  // Cornice — a thin overhanging lip capping the wall-unit run.
  if (opt.cornice) {
    const wallB = boxes.filter(b => b.z0 > 1000);
    if (wallB.length) {
      const wx0 = Math.min(...wallB.map(b => b.x0)), wx1 = Math.max(...wallB.map(b => b.x1));
      const wy1 = Math.max(...wallB.map(b => b.y1)) + 18, zt = Math.max(...wallB.map(b => b.z1)), ch = 34;
      const TOPc = '#efe9dd', FRc = shade(TOPc, -10), SDc = shade(TOPc, -22);
      const A = pr(wx0, 0, zt), B = pr(wx1, 0, zt), F = pr(wx1, 0, zt + ch), E = pr(wx0, 0, zt + ch);
      const C = pr(wx1, wy1, zt), G = pr(wx1, wy1, zt + ch), Ht = pr(wx0, wy1, zt + ch);
      out += poly([E, F, G, Ht], TOPc) + poly([B, C, G, F], SDc) + poly([A, B, F, E], FRc);
    }
  }
  const vbW = pad * 2 + (maxx - minx) * s, vbH = pad * 2 + (maxy - miny) * s;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${vbW.toFixed(1)} ${vbH.toFixed(1)}" width="${vbW.toFixed(1)}" height="${vbH.toFixed(1)}" shape-rendering="geometricPrecision">${out}</svg>`;
  return { svg };
}
export function IsoScene({ units, maxW = 640, maxH = 320, palette, finished = false }) {
  const { svg } = React.useMemo(() => isoSceneSVG(units, { maxW, maxH, palette, finished }), [units, maxW, maxH, palette, finished]);
  if (!svg) return null;
  return <div style={{ lineHeight: 0, overflowX: 'auto' }} dangerouslySetInnerHTML={{ __html: svg }} />;
}

// ── React: composed elevation scene ─────────────────────────────────────────
export function ElevationScene({ units, maxW = 640, maxH = 300, palette, legs = null, layout = 'straight' }) {
  const { svg } = React.useMemo(() => elevationSceneSVG(units, { maxW, maxH, palette, legs, layout }), [units, maxW, maxH, palette, legs, layout]);
  if (!svg) return null;
  return <div style={{ lineHeight: 0, overflowX: 'auto' }} dangerouslySetInnerHTML={{ __html: svg }} />;
}

// ── Print block (HTML string) ───────────────────────────────────────────────
export function drawingBlockHTML(closets, pts, wallWidthMm, sceneOpt = {}) {
  if (!closets || !closets.length) return '';
  const { svg: scene } = elevationSceneSVG(closets, { maxW: 720, maxH: sceneOpt.legs && sceneOpt.legs.length > 1 ? 460 : 320, legs: sceneOpt.legs || null, layout: sceneOpt.layout || 'straight' });
  const elevs = closets.map(s => {
    const { svg } = elevationSVG(s, { maxW: 150, maxH: 190, showDims: true });
    return `<div style="text-align:center;padding:4px 6px">${svg}<div style="font-size:9.5px;color:#4b5563;margin-top:3px;max-width:150px;line-height:1.4">${escHtml(describeSection(s, pts))}</div></div>`;
  }).join('');
  return `<div class="avoid" style="margin-top:18px;border:1px solid #eef0f4;border-radius:12px;padding:14px 16px">
    <div style="font-size:12px;font-weight:800;letter-spacing:.05em;text-transform:uppercase;color:#7a2230;margin-bottom:10px">📐 2D Wall Elevation</div>
    <div style="text-align:center">${scene}</div>
    <div style="margin-top:12px;border-top:1px dashed #e5e7eb;padding-top:10px">
      <div style="font-size:10.5px;font-weight:700;color:#9ca3af;text-transform:uppercase;letter-spacing:.05em;margin-bottom:6px">Per-unit detail</div>
      <div style="display:flex;flex-wrap:wrap;gap:10px;justify-content:flex-start;align-items:flex-end">${elevs}</div>
    </div>
    <div style="font-size:9px;color:#9ca3af;margin-top:8px">Indicative drawing — colours &amp; hardware for illustration only, not to manufacturing scale. Dimensions in mm.</div>
  </div>`;
}

// ── React: small thumbnail (for the editor row header) ──────────────────────
export function SectionThumb({ s, height = 54 }) {
  const { svg, vbW, vbH } = React.useMemo(() => {
    if (Array.isArray(s.bays) && s.bays.length) { try { const r = baysFrontSVG(s, { maxW: 90, maxH: height, noDims: true, cat: unitCat(s) }); if (r && r.svg) return r; } catch (e) { /* fall back to the single-box thumb */ } }
    return elevationSVG(s, { maxW: 90, maxH: height, pad: 4 });
  }, [s, height]);
  return <span style={{ display: 'inline-block', lineHeight: 0, width: vbW, height: vbH, flexShrink: 0 }} dangerouslySetInnerHTML={{ __html: svg }} />;
}

// ── React: full preview panel ───────────────────────────────────────────────
export function ClosetPreview2D({ closets, pts, wallWidthMm, setWallWidthMm, onOpen3D, palette, legs = null, layout = 'straight', renders = [], onRender, rendering = false, catLabel = '', render3D = null, T1 = '#111', T2 = '#4b5563', T3 = '#9ca3af', BG2 = '#fff', BG3 = '#faf7f2', BR = '#e7e2da' }) {
  const [open, setOpen] = React.useState(true);
  // Default to the real interactive 3D view (Cabinets3D, via `render3D`) rather
  // than the flat 2D elevation — the engine is genuine Three.js (orbit/drag, true
  // dimensions, real materials) but used to be tucked one click away. 2D/Real
  // (photoreal) stay one click away via the same tab strip.
  const [view, setView] = React.useState('iso'); // elevation | iso | real
  const [ui, setUi] = React.useState('hero');           // hero | split | immersive — panel layout
  const [openBay, setOpenBay] = React.useState(false);  // show internal drawers in an open bay
  const anyInternal = (closets || []).some(s => s && Number(s.drawers_int) > 0);
  const OR = 'var(--color-brand, var(--color-brand-strong))';
  const list = (closets || []).filter(s => s && (nn(s.width_mm) || nn(s.height_mm)));
  const plan = React.useMemo(() => planSVG(list, { wallWidthMm, maxW: 520, palette }), [list, wallWidthMm, palette]);
  if (!list.length) return null;
  const card = { background: BG2, border: '1px solid ' + BR, borderRadius: 12, padding: 14, marginTop: 12 };
  return (
    <div style={card}>
      <style>{`
        .cp2d-seg { display:inline-flex; border:1px solid var(--border, ${BR}); border-radius:var(--radius-md, 10px); overflow:hidden; background:transparent; }
        .cp2d-seg button { display:inline-flex; align-items:center; gap:6px; background:transparent; border:none; color:var(--text-2, ${T2}); font-size:11.5px; font-weight:600; padding:6px 12px; cursor:pointer; font-family:inherit; line-height:1.4; transition:background 150ms ease, color 150ms ease; }
        .cp2d-seg button + button { border-left:1px solid var(--border, ${BR}); }
        .cp2d-seg button[aria-selected="true"] { background:${OR}; color:white; font-weight:800; }
        .cp2d-seg button:hover:not([aria-selected="true"]) { color:var(--text-1, ${T1}); }
        .cp2d-seg button:focus-visible { outline:2px solid ${OR}; outline-offset:-2px; }
        @keyframes cp2d-spin { to { transform:rotate(360deg); } }
        @keyframes cp2d-pulse { 0%,100%{opacity:.5} 50%{opacity:1} }
        .cp2d-spinner { width:26px; height:26px; border-radius:9999px; border:3px solid var(--border, ${BR}); border-top-color:${OR}; animation:cp2d-spin 800ms linear infinite; margin:0 auto 10px; }
      `}</style>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: open ? 12 : 0 }}>
        <div style={{ fontSize: 13, fontWeight: 800, color: T1 }}>📐 Live Design</div>
        <span style={{ fontSize: 11, color: T3 }}>{list.length} unit{list.length === 1 ? '' : 's'}</span>
        <div style={{ flex: 1 }} />
        {open && (
          <div className="cp2d-seg" role="tablist" aria-label="View mode">
            {[['elevation', '▤', '2D'], ['iso', '◱', '3D'], ['real', '✨', 'Real']].map(([v, icon, label]) => {
              const active = view === v;
              return (
                <button key={v} role="tab" aria-selected={active} tabIndex={active ? 0 : -1}
                  onClick={() => setView(v)}
                  onKeyDown={(e) => {
                    const order = ['elevation', 'iso', 'real'];
                    const idx = order.indexOf(view);
                    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') { e.preventDefault(); setView(order[(idx + 1) % order.length]); }
                    else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') { e.preventDefault(); setView(order[(idx + order.length - 1) % order.length]); }
                  }}>
                  <span aria-hidden="true">{icon}</span><span>{label}</span>
                </button>
              );
            })}
          </div>
        )}
        {open && (
          <div style={{ display: 'flex', background: BG3, borderRadius: 8, padding: 2, gap: 2 }} title="Panel layout">
            {[['hero', '▭'], ['split', '◨'], ['immersive', '⛶']].map(([v, l]) => (
              <button key={v} onClick={() => setUi(v)} title={v} style={{ background: ui === v ? BG2 : 'transparent', border: 'none', borderRadius: 6, color: ui === v ? OR : T3, fontSize: 12, fontWeight: ui === v ? 800 : 600, padding: '5px 9px', cursor: 'pointer', fontFamily: 'inherit' }}>{l}</button>
            ))}
          </div>
        )}
        {open && anyInternal && (
          <button onClick={() => setOpenBay(b => !b)} title="Show internal drawers in an open bay (per-unit detail)"
            style={{ background: openBay ? OR : 'transparent', border: '1px solid ' + (openBay ? OR : BR), borderRadius: 8, color: openBay ? '#fff' : T2, fontSize: 11, fontWeight: 700, padding: '5px 10px', cursor: 'pointer', fontFamily: 'inherit' }}>🗄 Open bay</button>
        )}
        <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11.5, color: T2 }}>
          Wall (mm)
          <input type="number" min="0" step="10" value={wallWidthMm || ''} placeholder="optional"
            onChange={e => setWallWidthMm && setWallWidthMm(e.target.value === '' ? '' : Math.max(0, Number(e.target.value)))}
            style={{ width: 96, padding: '6px 8px', borderRadius: 8, border: '1px solid ' + BR, background: BG3, color: T1, fontFamily: 'inherit', fontSize: 12 }} />
        </label>
        {onOpen3D && (
          <button onClick={() => {
            const floorW = list.filter(s => unitFamily(s) !== 'wall').reduce((a, s) => a + (nn(s.width_mm) || 600), 0);
            const wallW = list.filter(s => unitFamily(s) === 'wall').reduce((a, s) => a + (nn(s.width_mm) || 600), 0);
            const runW = Math.max(floorW, wallW);
            onOpen3D({ shape: 'straight', room: { w: Math.max(2400, runW + 400), d: 3000 },
              units: list.map(s => ({ name: s.name || '', unit_type: s.unit_type || s.product_type || '', width_mm: nn(s.width_mm) || 600, height_mm: nn(s.height_mm) || (unitFamily(s) === 'wall' ? 720 : unitFamily(s) === 'tall' ? 2080 : 720), depth_mm: nn(s.depth_mm) || (unitFamily(s) === 'wall' ? 350 : 600), doors: nn(s.doors), drawers: nn(s.drawers), shelves: nn(s.shelves), wall: 'A' })) });
          }} style={{ background: 'var(--color-brand, var(--color-brand-strong))', border: 'none', borderRadius: 8, color: '#fff', fontSize: 11.5, fontWeight: 800, padding: '5px 10px', cursor: 'pointer', fontFamily: 'inherit' }} title="Open these units in the rotatable 3D Studio">🧊 3D Studio</button>
        )}
        <button onClick={() => setOpen(o => !o)} style={{ background: 'none', border: '1px solid ' + BR, borderRadius: 8, color: T2, fontSize: 11.5, fontWeight: 700, padding: '5px 10px', cursor: 'pointer', fontFamily: 'inherit' }}>{open ? 'Hide' : 'Show'}</button>
      </div>
      {open && (() => {
        const heroMaxH = ui === 'immersive' ? 460 : ui === 'split' ? 300 : 340;
        const catRenders = (renders || []).filter(r => !catLabel || !r.caption || String(r.caption).toLowerCase() === String(catLabel).toLowerCase());
        const heroRender = (catRenders[0] || (renders || [])[0] || null);
        const RealView = () => {
          // (a) actively generating a render
          if (rendering) {
            return (
              <div style={{ padding: '40px 16px', textAlign: 'center', color: 'var(--text-2, ' + T2 + ')' }}>
                <div className="cp2d-spinner" />
                <div style={{ fontSize: 12.5, fontWeight: 700, animation: 'cp2d-pulse 1400ms ease-in-out infinite' }}>Generating render…</div>
                <div style={{ fontSize: 11, color: 'var(--text-3, ' + T3 + ')', marginTop: 4 }}>Creating a photoreal image of {catLabel || 'this design'}</div>
              </div>
            );
          }
          // (c) renders exist — show them cleanly
          if (heroRender) {
            return (
              <div style={{ textAlign: 'center' }}>
                <img src={heroRender.url} alt="AI photoreal render" style={{ maxWidth: '100%', maxHeight: heroMaxH, borderRadius: 'var(--radius-md, 10px)', border: '1px solid var(--border, ' + BR + ')' }} />
                {catRenders.length > 1 && (
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center', marginTop: 8 }}>
                    {catRenders.map((r, i) => (
                      <img key={i} src={r.url} alt={'Render ' + (i + 1)} style={{ width: 64, height: 64, objectFit: 'cover', borderRadius: 'var(--radius-sm, 6px)', border: '1px solid var(--border, ' + BR + ')' }} />
                    ))}
                  </div>
                )}
                {onRender && (
                  <div style={{ marginTop: 10 }}>
                    <button onClick={() => onRender()} disabled={rendering}
                      style={{ background: 'transparent', border: '1px solid var(--border, ' + BR + ')', borderRadius: 'var(--radius-md, 10px)', color: 'var(--text-2, ' + T2 + ')', fontSize: 12, fontWeight: 700, padding: '8px 16px', cursor: 'pointer', fontFamily: 'inherit' }}>
                      ✨ Regenerate render
                    </button>
                  </div>
                )}
              </div>
            );
          }
          // (b) no renders yet — dashed placeholder + call to action
          return (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '34px 20px', border: '1.5px dashed var(--border, ' + BR + ')', borderRadius: 'var(--radius-lg, 14px)', background: 'var(--bg-2, ' + BG2 + ')', color: 'var(--text-3, ' + T3 + ')' }}>
              <div style={{ fontSize: 28, marginBottom: 8 }} aria-hidden="true">✨</div>
              <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--text-2, ' + T2 + ')', marginBottom: 4 }}>No photoreal render yet</div>
              <div style={{ fontSize: 11, maxWidth: 280, lineHeight: 1.5 }}>Generate an AI photoreal image of {catLabel || 'this design'} to show the client a lifelike preview.</div>
              {onRender && (
                <button onClick={() => onRender()} disabled={rendering}
                  style={{ marginTop: 14, background: OR, border: 'none', borderRadius: 'var(--radius-md, 10px)', color: 'white', fontSize: 12, fontWeight: 800, padding: '9px 18px', cursor: 'pointer', fontFamily: 'inherit' }}>
                  ✨ Generate AI render
                </button>
              )}
            </div>
          );
        };
        const viewCaption = view === 'real' ? 'Photoreal render' : view === 'iso' ? '3D view' : '2D elevation';
        const viewIcon = view === 'real' ? '✨' : view === 'iso' ? '◱' : '▤';
        const sceneEl = (
          <div style={{ background: 'var(--bg-3, ' + BG3 + ')', border: '1px solid var(--border, ' + BR + ')', borderRadius: 'var(--radius-lg, 14px)', padding: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 10.5, fontWeight: 800, color: 'var(--text-3, ' + T3 + ')', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 8, textAlign: 'left' }}>
              <span aria-hidden="true">{viewIcon}</span>{viewCaption}
            </div>
            <div style={{ textAlign: (view === 'iso' || view === 'real') ? 'center' : 'left' }}>
              {view === 'real' ? <RealView /> : view === 'iso'
                ? (render3D || <IsoScene units={list} maxW={ui === 'immersive' ? 900 : 680} maxH={heroMaxH} palette={palette} finished />)
                : <ElevationScene units={list} maxW={ui === 'immersive' ? 900 : 680} maxH={heroMaxH} palette={palette} legs={legs} layout={layout} />}
            </div>
          </div>
        );
        const perUnit = (
          <div>
            <div style={{ fontSize: 10.5, fontWeight: 800, color: T3, textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 6 }}>Per-unit detail</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'flex-end' }}>
              {list.map((s, i) => {
                const { svg } = elevationSVG(s, { maxW: 150, maxH: 190, showDims: true, palette, openBay });
                return (
                  <div key={i} style={{ width: 158, background: BG3, border: '1px solid ' + BR, borderRadius: 10, padding: 8, textAlign: 'center' }}>
                    <div style={{ lineHeight: 0 }} dangerouslySetInnerHTML={{ __html: svg }} />
                    <div style={{ fontSize: 10.5, color: T2, marginTop: 5, lineHeight: 1.4, minHeight: 28 }}>{describeSection(s, pts)}</div>
                  </div>
                );
              })}
            </div>
          </div>
        );
        const planEl = (
          <div style={{ marginTop: 12, borderTop: '1px dashed ' + BR, paddingTop: 10 }}>
            <div style={{ fontSize: 10.5, fontWeight: 800, color: T3, textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 4 }}>Top plan &amp; fit{plan.wall ? '' : ' — enter a wall width to check fit'}</div>
            <div style={{ lineHeight: 0, overflowX: 'auto' }} dangerouslySetInnerHTML={{ __html: plan.svg }} />
          </div>
        );
        if (ui === 'split') {
          return (
            <>
              <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', flexWrap: 'wrap' }}>
                <div style={{ flex: '1.6 1 320px', minWidth: 0 }}>{sceneEl}</div>
                <div style={{ flex: '1 1 220px', minWidth: 0, maxHeight: heroMaxH + 40, overflowY: 'auto' }}>{perUnit}</div>
              </div>
              {view !== 'real' && planEl}
              <div style={{ fontSize: 9.5, color: T3, marginTop: 8 }}>Indicative drawing — not to manufacturing scale. Prints on the quotation.</div>
            </>
          );
        }
        if (ui === 'immersive') {
          return (
            <>
              <div style={{ marginBottom: 12 }}>{sceneEl}</div>
              <details style={{ marginTop: 4 }}>
                <summary style={{ cursor: 'pointer', fontSize: 11, fontWeight: 800, color: T3, textTransform: 'uppercase', letterSpacing: '.05em' }}>Per-unit detail &amp; plan</summary>
                <div style={{ marginTop: 10 }}>{perUnit}{view !== 'real' && planEl}</div>
              </details>
              <div style={{ fontSize: 9.5, color: T3, marginTop: 8 }}>Indicative drawing — not to manufacturing scale. Prints on the quotation.</div>
            </>
          );
        }
        return (
          <>
            <div style={{ marginBottom: 12 }}>{sceneEl}</div>
            {perUnit}
            {view !== 'real' && planEl}
            <div style={{ fontSize: 9.5, color: T3, marginTop: 8 }}>Indicative drawing — not to manufacturing scale. Prints on the quotation.</div>
          </>
        );
      })()}
    </div>
  );
}

// ── TOP / PLAN view (single unit) — looking straight down (width × depth) ──
export function unitPlanSVG(s, opt = {}) {
  const P = Object.assign({}, DEFAULT_PALETTE, opt.palette || {});
  const W = Math.max(50, nn(s.width_mm) || 1000);
  const D = Math.max(50, nn(s.depth_mm) || 600);
  const doors = ri(s.doors), sliding = !!s.sliding || s.door === 'sliding';
  const maxW = opt.maxW || 240, maxH = opt.maxH || 200, pad = 28;
  const scale = Math.min((maxW - pad * 2) / W, (maxH - pad * 2) / D);
  const w = W * scale, d = D * scale, x0 = pad, y0 = pad;
  let out = `<rect x="${x0}" y="${y0}" width="${w}" height="${d}" rx="2" fill="${P.body}" stroke="${P.carcass}" stroke-width="2"/>`;
  // back wall (top edge) heavier; front edge (bottom) is where doors open
  out += `<line x1="${x0}" y1="${y0}" x2="${x0 + w}" y2="${y0}" stroke="${P.carcass}" stroke-width="3"/>`;
  const n = Math.max(1, doors || 1), seg = w / n;
  if (sliding) {
    out += `<line x1="${x0}" y1="${y0 + d - 3}" x2="${x0 + w}" y2="${y0 + d - 3}" stroke="${P.door}" stroke-width="2"/>`;
    out += `<line x1="${x0}" y1="${y0 + d - 6}" x2="${x0 + w * 0.55}" y2="${y0 + d - 6}" stroke="${P.door}" stroke-width="2" opacity="0.6"/>`;
  } else if (doors > 0) {
    for (let i = 0; i < n; i++) {
      const sx = x0 + i * seg, hinge = (i % 2 === 0) ? sx : sx + seg, dir = (i % 2 === 0) ? 1 : -1;
      const r = Math.min(seg, d) * 0.9;
      const ex = hinge + dir * r, ey = y0 + d - r;
      out += `<path d="M ${hinge.toFixed(1)} ${(y0 + d).toFixed(1)} L ${hinge.toFixed(1)} ${(y0 + d - r).toFixed(1)} A ${r.toFixed(1)} ${r.toFixed(1)} 0 0 ${dir > 0 ? 1 : 0} ${ex.toFixed(1)} ${(y0 + d).toFixed(1)} Z" fill="${P.doorFill}" stroke="${P.door}" stroke-width="1" opacity="0.85"/>`;
    }
  }
  // dims: width (bottom) · depth (right)
  const by = y0 + d + 12, rx = x0 + w + 12;
  out += `<line x1="${x0}" y1="${by}" x2="${x0 + w}" y2="${by}" stroke="${P.dim}" stroke-width="0.8"/><text x="${x0 + w / 2}" y="${by + 10}" font-size="9" fill="${P.dim}" text-anchor="middle" font-family="sans-serif">${ri(W)} mm</text>`;
  out += `<line x1="${rx}" y1="${y0}" x2="${rx}" y2="${y0 + d}" stroke="${P.dim}" stroke-width="0.8"/><text x="${rx + 3}" y="${y0 + d / 2}" font-size="9" fill="${P.dim}" text-anchor="middle" font-family="sans-serif" transform="rotate(-90 ${rx + 3} ${y0 + d / 2})">${ri(D)} mm</text>`;
  const vbW = x0 + w + 34, vbH = y0 + d + 24;
  return { svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${vbW.toFixed(1)} ${vbH.toFixed(1)}" width="${vbW.toFixed(1)}" height="${vbH.toFixed(1)}" shape-rendering="geometricPrecision">${out}</svg>` };
}

// ── SIDE view — looking from the end (depth × height), with shelves/drawers ──
export function sideSVG(s, opt = {}) {
  const P = Object.assign({}, DEFAULT_PALETTE, opt.palette || {});
  const D = Math.max(50, nn(s.depth_mm) || 600);
  const H = Math.max(50, nn(s.height_mm) || 2000);
  const shelves = ri(s.shelves), drawers = ri(s.drawers), rails = ri(s.rails);
  const maxW = opt.maxW || 200, maxH = opt.maxH || 320, pad = 28;
  const scale = Math.min((maxW - pad * 2) / D, (maxH - pad * 2) / H);
  const w = D * scale, h = H * scale, x0 = pad, y0 = pad;
  let out = `<rect x="${x0}" y="${y0}" width="${w}" height="${h}" rx="2" fill="${P.body}" stroke="${P.carcass}" stroke-width="2"/>`;
  // front edge (left) = door line
  out += `<line x1="${x0 + 2}" y1="${y0}" x2="${x0 + 2}" y2="${y0 + h}" stroke="${P.door}" stroke-width="1.6" opacity="0.7"/>`;
  const drawerH = drawers > 0 ? Math.min(h * 0.5, Math.max(drawers * 80 * scale, drawers * 14)) : 0;
  const shelfTop = y0, shelfArea = h - drawerH;
  for (let i = 1; i <= shelves; i++) { const yy = shelfTop + shelfArea * i / (shelves + 1); out += `<line x1="${x0 + 3}" y1="${yy.toFixed(1)}" x2="${x0 + w - 3}" y2="${yy.toFixed(1)}" stroke="${P.shelf}" stroke-width="1" stroke-dasharray="4 3" opacity="0.8"/>`; }
  if (rails > 0) out += `<circle cx="${x0 + w / 2}" cy="${y0 + 14}" r="3" fill="none" stroke="${P.handle}" stroke-width="1.6"/>`;
  if (drawers > 0) { const each = drawerH / drawers; for (let i = 0; i < drawers; i++) { const dy = y0 + shelfArea + i * each; out += `<rect x="${x0 + 2}" y="${dy.toFixed(1)}" width="${(w - 4).toFixed(1)}" height="${(each - 1.5).toFixed(1)}" fill="none" stroke="${P.carcass}" stroke-width="0.8" opacity="0.6"/>`; } }
  const by = y0 + h + 12, rx = x0 + w + 12;
  out += `<line x1="${x0}" y1="${by}" x2="${x0 + w}" y2="${by}" stroke="${P.dim}" stroke-width="0.8"/><text x="${x0 + w / 2}" y="${by + 10}" font-size="9" fill="${P.dim}" text-anchor="middle" font-family="sans-serif">${ri(D)} mm</text>`;
  out += `<line x1="${rx}" y1="${y0}" x2="${rx}" y2="${y0 + h}" stroke="${P.dim}" stroke-width="0.8"/><text x="${rx + 3}" y="${y0 + h / 2}" font-size="9" fill="${P.dim}" text-anchor="middle" font-family="sans-serif" transform="rotate(-90 ${rx + 3} ${y0 + h / 2})">${ri(H)} mm</text>`;
  const vbW = x0 + w + 34, vbH = y0 + h + 24;
  return { svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${vbW.toFixed(1)} ${vbH.toFixed(1)}" width="${vbW.toFixed(1)}" height="${vbH.toFixed(1)}" shape-rendering="geometricPrecision">${out}</svg>` };
}

// ═══════════════ BAY-DESIGNED UNITS (s.bays) — elevation / internal / plan / side + EN/AR sheet ═══════════════
// All output below uses literal hex only (print popups have no app CSS variables).
let _bayUid = 0;
const BAY_INK = '#4A3426', BAY_CARC = '#EDE5D6', BAY_BACK = '#F6F1E7', BAY_DIM = '#6b5b4b';
const CLOTHES = ['#8C7B6A', '#C9BBA6', '#5E5247', '#A89580', '#D8CDBB', '#4F5B66', '#9B8F80'];
const CLOTHES_PAL = CLOTHES;
const STORE_PAL = ['#9AA7B5', '#C8B79A', '#6E7F73', '#B0695B', '#D9D2C3', '#5F6B7A', '#A89580'];
const hasBays = (s) => !!(s && Array.isArray(s.bays) && s.bays.length);
const mFmt = (mm) => (nn(mm) / 1000).toFixed(2) + ' m';
const bayList = (s) => (s.bays || []).map((b) => ({ ...b, w: Math.max(50, nn(b.w_mm) || 500) }));
// front colour of a bay; the 3D Studio can paint the door part separately (b.pf.door = 'A'|'B'|'C' or { hex, name })
const bayFin = (b, fin) => {
  const pf = b && b.pf && b.pf.door;
  if (pf && typeof pf === 'object' && /^#[0-9a-fA-F]{6}$/.test(pf.hex || '')) return { name: pf.name || '', hex: pf.hex, desc: '' };
  if (typeof pf === 'string' && fin[pf]) return fin[pf];
  return fin[b.finish] || fin.A;
};
const svgWrap = (out, vbW, vbH, defs) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${vbW.toFixed(1)} ${vbH.toFixed(1)}" width="${vbW.toFixed(1)}" height="${vbH.toFixed(1)}" style="max-width:100%;height:auto" shape-rendering="geometricPrecision" font-family="Arial,Tahoma,sans-serif">${defs ? `<defs>${defs}</defs>` : ''}${out}</svg>`;
const txt = (x, y, t, o = {}) => `<text x="${x.toFixed(1)}" y="${y.toFixed(1)}" font-size="${o.size || 9}" fill="${o.fill || BAY_DIM}" text-anchor="${o.anchor || 'middle'}"${o.bold ? ' font-weight="700"' : ''}${o.rot ? ` transform="rotate(${o.rot} ${x.toFixed(1)} ${y.toFixed(1)})"` : ''}>${t}</text>`;

// Hanging clothes along a rail (simple alternating silhouettes).
function clothesRow(x, y, w, len, scale) {
  let out = ''; const step = Math.max(4, 48 * scale); const n = Math.min(44, Math.floor((w - 6) / step));
  for (let i = 0; i < n; i++) {
    const cx = x + 4 + step * (i + 0.5), cw = step * 0.82, ch = len * (0.72 + 0.28 * ((i * 7) % 5) / 4), col = CLOTHES[i % CLOTHES.length];
    out += `<path d="M${cx.toFixed(1)} ${y.toFixed(1)} l${(-cw / 2).toFixed(1)} ${(ch * 0.12).toFixed(1)} v${(ch * 0.88).toFixed(1)} h${cw.toFixed(1)} v${(-ch * 0.88).toFixed(1)} Z" fill="${col}" stroke="#00000022" stroke-width="0.4"/>`;
  }
  return out;
}
// Folded-items stack sitting on a shelf line.
function foldedStack(x, shelfY, w, maxH, i, pal) {
  const CLOTHES = pal || CLOTHES_PAL; let out = ''; const stacks = Math.max(1, Math.min(3, Math.floor(w / 26))); const sw = (w - 8) / stacks;
  for (let k = 0; k < stacks; k++) {
    const n = 2 + ((i + k) % 3), ih = Math.max(2.5, Math.min(maxH / 4.2, 9));
    for (let j = 0; j < n; j++) out += `<rect x="${(x + 4 + k * sw + 1).toFixed(1)}" y="${(shelfY - (j + 1) * ih).toFixed(1)}" width="${(sw - 3).toFixed(1)}" height="${(ih - 0.6).toFixed(1)}" rx="0.8" fill="${CLOTHES[(i + k + j) % CLOTHES.length]}"/>`;
  }
  return out;
}
// Interior of one bay (doors removed): hanging tiers, shelf stacks, drawer bank, LED glow.
function bayInteriorSVG(b, x, y, w, h, scale, fin, uid, cat) {
  const pal = cat && cat !== 'closet' ? STORE_PAL : null;
  const rails = ri(b.rails) || 0, shelves = ri(b.shelves) || 0, drawers = ri(b.drawers) || 0;
  let out = `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${w.toFixed(1)}" height="${h.toFixed(1)}" fill="${BAY_BACK}"/>`;
  const dMm = Math.min(h * 0.4, drawers * 180 * scale), dH = drawers > 0 ? dMm : 0;
  const area = h - dH - 6; let top = y + 3;
  const tiers = rails > 0 ? Math.max(1, Math.min(3, b.hang_double ? Math.max(2, rails) : rails)) : 0;
  const hangZone = tiers > 0 ? (shelves > 0 ? area * 0.58 : area) : 0;
  for (let t = 0; t < tiers; t++) {
    const th = hangZone / tiers, ty = top + t * th;
    out += `<rect x="${x.toFixed(1)}" y="${ty.toFixed(1)}" width="${w.toFixed(1)}" height="2.2" fill="#B8AA93"/>`;
    const ry = ty + Math.min(10, th * 0.08) + 3;
    out += clothesRow(x, ry + 1, w, Math.min(th * 0.8, (tiers > 1 ? 900 : 1300) * scale), scale);
    out += `<line x1="${(x + 2).toFixed(1)}" y1="${ry.toFixed(1)}" x2="${(x + w - 2).toFixed(1)}" y2="${ry.toFixed(1)}" stroke="#8A8A8E" stroke-width="1.8" stroke-linecap="round"/>`;
  }
  const sTop = top + hangZone, sH = area - hangZone;
  if (shelves > 0 && sH > 8) {
    for (let i = 0; i <= shelves; i++) {
      const yy = sTop + sH * (i + 1) / (shelves + 1) - (i === shelves ? 0 : 0);
      if (i < shelves) {
        out += `<rect x="${x.toFixed(1)}" y="${yy.toFixed(1)}" width="${w.toFixed(1)}" height="2.2" fill="#B8AA93"/>`;
        out += foldedStack(x, yy, w, sH / (shelves + 1), i, pal);
      }
    }
    // stack on the topmost shelf zone start (items resting on the first shelf)
  }
  if (drawers > 0) {
    const y0d = y + h - dH, each = dH / drawers, cc = fin.C.hex;
    out += `<rect x="${x.toFixed(1)}" y="${(y0d - 1).toFixed(1)}" width="${w.toFixed(1)}" height="2" fill="#B8AA93"/>`;
    for (let i = 0; i < drawers; i++) {
      const dy = y0d + i * each;
      out += `<rect x="${(x + 2).toFixed(1)}" y="${(dy + 1).toFixed(1)}" width="${(w - 4).toFixed(1)}" height="${(each - 2).toFixed(1)}" rx="1.5" fill="${cc}" stroke="#00000033" stroke-width="0.6"/>`;
      out += `<rect x="${(x + w / 2 - Math.min(14, w * 0.18)).toFixed(1)}" y="${(dy + each / 2 - 1).toFixed(1)}" width="${(Math.min(28, w * 0.36)).toFixed(1)}" height="2" rx="1" fill="#9A9A9E"/>`;
    }
  }
  if (b.led) {
    out += `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${Math.min(14, w * 0.2).toFixed(1)}" height="${h.toFixed(1)}" fill="url(#${uid}L)"/>`;
    out += `<rect x="${(x + w - Math.min(14, w * 0.2)).toFixed(1)}" y="${y.toFixed(1)}" width="${Math.min(14, w * 0.2).toFixed(1)}" height="${h.toFixed(1)}" fill="url(#${uid}R)"/>`;
    out += `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${w.toFixed(1)}" height="${Math.min(22, h * 0.08).toFixed(1)}" fill="url(#${uid}T)"/>`;
    out += `<rect x="${(x + 1).toFixed(1)}" y="${y.toFixed(1)}" width="${(w - 2).toFixed(1)}" height="1.6" fill="#FFE2A3"/>`;
  }
  return out;
}
const ledDefs = (uid) => `<linearGradient id="${uid}L" x1="0" x2="1" y1="0" y2="0"><stop offset="0" stop-color="#FFC857" stop-opacity="0.85"/><stop offset="1" stop-color="#FFC857" stop-opacity="0"/></linearGradient><linearGradient id="${uid}R" x1="1" x2="0" y1="0" y2="0"><stop offset="0" stop-color="#FFC857" stop-opacity="0.85"/><stop offset="1" stop-color="#FFC857" stop-opacity="0"/></linearGradient><linearGradient id="${uid}T" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#FFD27A" stop-opacity="0.9"/><stop offset="1" stop-color="#FFD27A" stop-opacity="0"/></linearGradient>`;

function bayHandles(b, x, y, w, h, hex) {
  const lv = ri(b.leaves), hd = b.handle || 'bar'; if (!lv || hd === 'none') return '';
  let out = ''; const lw = w / lv; const dark = shade(hex, -45);
  for (let i = 0; i < lv; i++) {
    const lx = x + i * lw; const atRight = lv === 1 ? true : (i % 2 === 0); // meeting edge for pairs
    const hx = atRight ? lx + lw - 6 : lx + 6;
    if (hd === 'bar') out += `<rect x="${(hx - 1.3).toFixed(1)}" y="${(y + h * 0.36).toFixed(1)}" width="2.6" height="${(h * 0.28).toFixed(1)}" rx="1.3" fill="${dark}"/>`;
    else if (hd === 'knob') out += `<circle cx="${hx.toFixed(1)}" cy="${(y + h * 0.5).toFixed(1)}" r="2.6" fill="${dark}"/>`;
    else out += `<rect x="${(atRight ? lx + lw - 3.2 : lx + 1).toFixed(1)}" y="${(y + 2).toFixed(1)}" width="2.2" height="${(h - 4).toFixed(1)}" fill="${dark}" opacity="0.8"/>`;
  }
  return out;
}

// Shared engine for the front and internal elevations.
function baysElevation(s, opt, internal, cat) {
  if (!hasBays(s)) return null;
  const fin = finishesOf(s, cat); const bays = bayList(s);
  const W = bays.reduce((a, b) => a + b.w, 0), H = Math.max(300, nn(s.height_mm) || 2400);
  const maxW = opt.maxW || 520, maxH = opt.maxH || 300;
  const nod = !!opt.noDims; const L = nod ? 6 : 34, T = nod ? 6 : 44, R = nod ? 6 : 10, B = 8;
  const scale = Math.min((maxW - L - R) / W, (maxH - T - B) / H);
  const uid = 'bu' + (++_bayUid);
  const hh = H * scale, ph = Math.min(hh * 0.06, Math.max(3, 70 * scale)), bodyH = hh - ph;
  let out = '', x = L; const y0 = T;
  out += `<rect x="${L - 1.5}" y="${y0 - 1.5}" width="${(W * scale + 3).toFixed(1)}" height="${(hh + 3).toFixed(1)}" fill="${BAY_CARC}" stroke="${BAY_INK}" stroke-width="1.6"/>`;
  bays.forEach((b, i) => {
    const bw = b.w * scale, f = bayFin(b, fin), open = ri(b.leaves) === 0;
    if (internal || open) {
      out += bayInteriorSVG(b, x, y0, bw, bodyH, scale, fin, uid, cat);
    } else if (b.kind === 'glass_doors') {
      // glass-front display doors: shelves + contents visible through a tinted pane in a solid frame
      out += bayInteriorSVG({ ...b, rails: 0, drawers: 0 }, x, y0, bw, bodyH, scale, fin, uid, cat);
      const lv = Math.max(1, ri(b.leaves)), lw = bw / lv;
      for (let k = 0; k < lv; k++) out += `<rect x="${(x + k * lw + 1.5).toFixed(1)}" y="${(y0 + 1.5).toFixed(1)}" width="${(lw - 3).toFixed(1)}" height="${(bodyH - 3).toFixed(1)}" fill="#BFD4DD" fill-opacity="0.38" stroke="${f.hex}" stroke-width="3"/>`;
      out += bayHandles(b, x, y0, bw, bodyH, f.hex);
    } else {
      out += `<rect x="${x.toFixed(1)}" y="${y0}" width="${bw.toFixed(1)}" height="${bodyH.toFixed(1)}" fill="${f.hex}"/>`;
      const lv = ri(b.leaves), lw = bw / lv;
      for (let k = 0; k < lv; k++) out += `<rect x="${(x + k * lw + 0.8).toFixed(1)}" y="${(y0 + 0.8).toFixed(1)}" width="${(lw - 1.6).toFixed(1)}" height="${(bodyH - 1.6).toFixed(1)}" fill="none" stroke="${shade(f.hex, -28)}" stroke-width="0.9"/>`;
      out += bayHandles(b, x, y0, bw, bodyH, f.hex);
    }
    if (!internal && open && (ri(b.leaves) === 0)) { /* open bay on the front view: interior shown, frame stroke below */ }
    out += `<line x1="${x.toFixed(1)}" y1="${y0}" x2="${x.toFixed(1)}" y2="${(y0 + bodyH).toFixed(1)}" stroke="${BAY_INK}" stroke-width="${i === 0 ? 0 : 1.2}"/>`;
    x += bw;
  });
  // plinth + LED
  out += `<rect x="${L}" y="${(y0 + bodyH).toFixed(1)}" width="${(W * scale).toFixed(1)}" height="${ph.toFixed(1)}" fill="${fin.C.hex}"/>`;
  if (bays.some((b) => b.led)) out += `<rect x="${L}" y="${(y0 + bodyH).toFixed(1)}" width="${(W * scale).toFixed(1)}" height="1.6" fill="#FFD27A"/>`;
  // dimensions
  let defs = bays.some((b) => b.led) ? ledDefs(uid) : '';
  if (!nod) {
    const ty = 14, ty2 = 32; let xx = L;
    out += `<line x1="${L}" y1="${ty}" x2="${(L + W * scale).toFixed(1)}" y2="${ty}" stroke="${BAY_DIM}" stroke-width="0.8"/><line x1="${L}" y1="${ty - 4}" x2="${L}" y2="${ty + 4}" stroke="${BAY_DIM}"/><line x1="${(L + W * scale).toFixed(1)}" y1="${ty - 4}" x2="${(L + W * scale).toFixed(1)}" y2="${ty + 4}" stroke="${BAY_DIM}"/>`;
    out += `<rect x="${(L + W * scale / 2 - 24).toFixed(1)}" y="${ty - 6}" width="48" height="12" fill="#ffffff"/>` + txt(L + W * scale / 2, ty + 3, mFmt(W), { size: 10, bold: true, fill: BAY_INK });
    bays.forEach((b, i) => {
      const bw = b.w * scale;
      out += `<line x1="${xx.toFixed(1)}" y1="${ty2 - 4}" x2="${xx.toFixed(1)}" y2="${ty2 + 4}" stroke="${BAY_DIM}"/>`;
      out += `<line x1="${xx.toFixed(1)}" y1="${ty2}" x2="${(xx + bw).toFixed(1)}" y2="${ty2}" stroke="${BAY_DIM}" stroke-width="0.7"/>`;
      out += txt(xx + bw / 2, ty2 - 3, mFmt(b.w).replace(' m', ''), { size: bw < 30 ? 7 : 9, fill: BAY_INK });
      xx += bw;
    });
    out += `<line x1="${xx.toFixed(1)}" y1="${ty2 - 4}" x2="${xx.toFixed(1)}" y2="${ty2 + 4}" stroke="${BAY_DIM}"/>`;
    const lx = L - 12;
    out += `<line x1="${lx}" y1="${y0}" x2="${lx}" y2="${(y0 + hh).toFixed(1)}" stroke="${BAY_DIM}" stroke-width="0.8"/><line x1="${lx - 4}" y1="${y0}" x2="${lx + 4}" y2="${y0}" stroke="${BAY_DIM}"/><line x1="${lx - 4}" y1="${(y0 + hh).toFixed(1)}" x2="${lx + 4}" y2="${(y0 + hh).toFixed(1)}" stroke="${BAY_DIM}"/>`;
    out += txt(lx - 3, y0 + hh / 2, mFmt(H), { size: 10, bold: true, fill: BAY_INK, rot: -90 });
  }
  const vbW = L + W * scale + R, vbH = T + hh + B;
  return { svg: svgWrap(out, vbW, vbH, defs), w: vbW, h: vbH, vbW, vbH };
}
// ═══════════ CATEGORY ENGINE — kitchen / tv / vanity / door (drawn in mm space, y up from the floor) ═══════════
// Closet, storage and custom keep using the generic bay engine above. Every routine below is wrapped by the
// exported functions in try/catch and falls back to the generic drawing if anything throws or data is missing.
const CAT_ENGINE = ['kitchen', 'tv', 'vanity', 'door'];
const STEEL = '#C9CDD1', STEEL_D = '#8E949B', GLASS_C = '#BFD4DD', MIRROR_C = '#DCE6EA', WALL_BG = '#F3EEE3', TOWEL = ['#E9E4DA', '#C9D6D8', '#B9A99A', '#F4F1EA'];
const f1 = (n) => nn(n).toFixed(1);
const lumOf = (hex) => { const h = String(hex || '').replace('#', ''); if (h.length !== 6) return 0.5; const v = (i) => parseInt(h.substr(i, 2), 16) / 255; return 0.2126 * v(0) + 0.7152 * v(2) + 0.0722 * v(4); };
const hdlCol = (hex) => (lumOf(hex) > 0.45 ? '#3a3a3c' : '#E4E0D8');
const mkC = (L, T, scale, Hd) => ({ s: scale, X: (mm) => L + mm * scale, Y: (mm) => T + (Hd - mm) * scale });
function bx(c, x0, y0, x1, y1, fill, o = {}) {
  const w = (x1 - x0) * c.s, h = (y1 - y0) * c.s; if (!(w > 0 && h > 0)) return '';
  return `<rect x="${f1(c.X(x0))}" y="${f1(c.Y(y1))}" width="${f1(w)}" height="${f1(h)}" fill="${fill}"${o.stroke ? ` stroke="${o.stroke}" stroke-width="${o.sw || 0.8}"` : ''}${o.rx ? ` rx="${o.rx}"` : ''}${o.op ? ` opacity="${o.op}"` : ''}/>`;
}
const pol = (c, pts, fill, o = {}) => `<polygon points="${pts.map((p) => f1(c.X(p[0])) + ',' + f1(c.Y(p[1]))).join(' ')}" fill="${fill}"${o.stroke ? ` stroke="${o.stroke}" stroke-width="${o.sw || 0.8}"` : ''}${o.op ? ` opacity="${o.op}"` : ''}/>`;
const lnm = (c, x0, y0, x1, y1, stroke, sw = 0.8, dash) => `<line x1="${f1(c.X(x0))}" y1="${f1(c.Y(y0))}" x2="${f1(c.X(x1))}" y2="${f1(c.Y(y1))}" stroke="${stroke}" stroke-width="${sw}"${dash ? ` stroke-dasharray="${dash}"` : ''}/>`;
const circ = (c, x, y, rmm, fill, minPx = 1.6) => `<circle cx="${f1(c.X(x))}" cy="${f1(c.Y(y))}" r="${f1(Math.max(minPx, rmm * c.s))}" fill="${fill}"/>`;

// handle on a front panel x0..x1 × y0..y1 (mm). orient: 'top' | 'bottom' | 'v' (vertical at the free edge) | 'lever' (door). side 'R'|'L' = which edge.
function hdl(c, hd, x0, y0, x1, y1, orient, hex, side, col0) {
  if (!hd || hd === 'none') return '';
  const col = col0 || hdlCol(hex), th = Math.max(16, 1.8 / c.s), w = x1 - x0, h = y1 - y0, atR = side === 'R';
  if (orient === 'lever') {
    const hy = Math.min(y1 - 200, 1000), hx = atR ? x1 - 70 : x0 + 70;
    if (hd === 'knob') return circ(c, hx, hy, 28, col);
    if (hd === 'lever') { const len = Math.min(w * 0.4, 150), dir = atR ? -1 : 1; return circ(c, hx, hy, 26, col) + bx(c, Math.min(hx, hx + dir * len), hy - th * 0.7, Math.max(hx, hx + dir * len), hy + th * 0.7, col, { rx: 1 }); }
    return bx(c, atR ? x1 - 60 - th : x0 + 60, hy - 200, atR ? x1 - 60 : x0 + 60 + th, hy + 200, col, { rx: 1 });
  }
  if (hd === 'lever') hd = 'bar';
  if (hd === 'knob') return circ(c, atR ? x1 - 55 : x0 + 55, orient === 'top' ? y1 - 70 : orient === 'bottom' ? y0 + 70 : (y0 + y1) / 2, 14, col, 1.8);
  if (hd === 'edge') {
    if (orient === 'top') return bx(c, x0 + w * 0.1, y1 - th - 8, x1 - w * 0.1, y1 - 8, col);
    if (orient === 'bottom') return bx(c, x0 + w * 0.1, y0 + 8, x1 - w * 0.1, y0 + 8 + th, col);
    return bx(c, atR ? x1 - 8 - th : x0 + 8, y0 + h * 0.1, atR ? x1 - 8 : x0 + 8 + th, y1 - h * 0.1, col);
  }
  if (orient === 'top') return bx(c, (x0 + x1) / 2 - Math.min(w * 0.2, 110), y1 - 70 - th, (x0 + x1) / 2 + Math.min(w * 0.2, 110), y1 - 70, col, { rx: 1 });
  if (orient === 'bottom') return bx(c, (x0 + x1) / 2 - Math.min(w * 0.2, 110), y0 + 70, (x0 + x1) / 2 + Math.min(w * 0.2, 110), y0 + 70 + th, col, { rx: 1 });
  const bl = Math.min(h * 0.28, 600), mid = (y0 + y1) / 2;
  return bx(c, atR ? x1 - 45 - th : x0 + 45, mid - bl / 2, atR ? x1 - 45 : x0 + 45 + th, mid + bl / 2, col, { rx: 1 });
}
function faceDoors(c, x0, y0, x1, y1, lv, f, hd, orient) {
  lv = Math.max(1, Math.min(6, lv)); const lw = (x1 - x0) / lv; let out = '';
  for (let k = 0; k < lv; k++) {
    const a = x0 + k * lw, b = a + lw;
    out += bx(c, a + 3, y0 + 3, b - 3, y1 - 3, f.hex, { stroke: shade(f.hex, -28), sw: 0.9 });
    out += hdl(c, hd, a, y0, b, y1, orient, f.hex, lv === 1 ? 'R' : (k % 2 === 0 ? 'R' : 'L'));
  }
  return out;
}
function faceDrawers(c, x0, y0, x1, y1, n, f, hd) {
  n = Math.max(1, Math.min(8, n)); const wts = Array.from({ length: n }, (_, i) => 1 + i * 0.5), tot = wts.reduce((a, b) => a + b, 0), H = y1 - y0; let top = y1, out = '';
  for (let i = 0; i < n; i++) {
    const hh = H * wts[i] / tot;
    out += bx(c, x0 + 3, top - hh + 3, x1 - 3, top - 3, f.hex, { stroke: shade(f.hex, -28), sw: 0.9 });
    out += hdl(c, hd, x0, top - hh, x1, top, 'top', f.hex, 'R');
    top -= hh;
  }
  return out;
}
function itemsRow(c, x0, x1, yb, maxH, seed, pal) {
  const P = pal || STORE_PAL, w = x1 - x0; if (w < 120 || maxH < 60) return '';
  const n = Math.max(1, Math.min(5, Math.floor(w / 170))), gap = (w - 40) / n; let out = '';
  for (let k = 0; k < n; k++) {
    const iw = gap * 0.74, ih = Math.min(maxH, 130 + ((seed + k) * 53) % 170);
    out += bx(c, x0 + 20 + k * gap + (gap - iw) / 2, yb, x0 + 20 + k * gap + (gap - iw) / 2 + iw, yb + ih, P[(seed + k) % P.length], { stroke: '#00000022', sw: 0.4, rx: 0.6 });
  }
  return out;
}
// carcass interior with n shelves and contents
function shelfBox(c, x0, y0, x1, y1, n, seed = 0, o = {}) {
  n = Math.max(0, Math.min(12, n)); const h = y1 - y0; let out = bx(c, x0, y0, x1, y1, o.back || BAY_BACK, { stroke: BAY_INK, sw: 0.9 });
  for (let i = 0; i <= n; i++) {
    const yb = i === 0 ? y0 : y0 + h * i / (n + 1), yt = i === n ? y1 : y0 + h * (i + 1) / (n + 1);
    if (i > 0) out += bx(c, x0, yb - 9, x1, yb + 9, o.board || '#B8AA93');
    if (!o.noItems) out += o.av && i === 0 ? avRow(c, x0, x1, yb, seed) : itemsRow(c, x0, x1, yb + (i > 0 ? 9 : 0), (yt - yb) * 0.7, seed + i, o.pal);
  }
  return out;
}
// AV equipment (console, receiver, box) resting on the base of a TV unit
function avRow(c, x0, x1, yb, seed) {
  const w = x1 - x0; if (w < 220) return ''; let out = '';
  out += bx(c, x0 + 40, yb, x0 + 40 + Math.min(w * 0.4, 420), yb + 70, '#2A2C30', { rx: 0.8 }) + bx(c, x1 - 40 - Math.min(w * 0.3, 300), yb, x1 - 40, yb + 55, '#3A3D42', { rx: 0.8 });
  return out;
}
function drawerBoxes(c, x0, y0, x1, y1, n, seed) {
  n = Math.max(1, Math.min(8, n)); const each = (y1 - y0) / n; let out = bx(c, x0, y0, x1, y1, BAY_BACK, { stroke: BAY_INK, sw: 0.9 });
  for (let i = 0; i < n; i++) {
    const ya = y0 + i * each;
    out += bx(c, x0 + 16, ya + 10, x1 - 16, ya + each - 10, '#DDD0B8', { stroke: '#8a7b66', sw: 0.5 });
    out += bx(c, x0 + 36, ya + 30, x1 - 36, ya + each - 40, BAY_BACK, { stroke: '#00000018', sw: 0.4 });
    if (x1 - x0 > 350) out += bx(c, (x0 + x1) / 2 - 6, ya + 30, (x0 + x1) / 2 + 6, ya + each - 40, '#B8AA93');
    out += itemsRow(c, x0 + 40, x1 - 40, ya + 30, each * 0.4, seed + i);
  }
  return out;
}
function sinkInterior(c, x0, y0, x1, y1) {
  const cx = (x0 + x1) / 2, w = x1 - x0; let out = bx(c, x0, y0, x1, y1, BAY_BACK, { stroke: BAY_INK, sw: 0.9 });
  out += bx(c, x0 + 50, y1 - 230, x1 - 50, y1, '#B9BEC4', { stroke: STEEL_D, sw: 0.7, rx: 2 });
  out += `<path d="M ${f1(c.X(cx))} ${f1(c.Y(y1 - 230))} V ${f1(c.Y(y0 + 260))} H ${f1(c.X(x1 - Math.min(40, w * 0.1)))}" fill="none" stroke="${STEEL_D}" stroke-width="${f1(Math.max(2, 38 * c.s))}" stroke-linecap="round"/>`;
  out += bx(c, x0, y0 + 60, x0 + Math.min(80, w * 0.15), y0 + 78, '#B8AA93');
  return out;
}
function tapFront(c, cx, yb, h) {
  const t = Math.max(2, 22 * c.s);
  return bx(c, cx - 30, yb, cx + 30, yb + 24, STEEL_D, { rx: 1 }) + bx(c, cx - 11, yb, cx + 11, yb + h, STEEL, { stroke: STEEL_D, sw: 0.5 }) + bx(c, cx - 130, yb + h - 22, cx + 11, yb + h + 4, STEEL, { stroke: STEEL_D, sw: 0.5, rx: t * 0.4 });
}
function basinFront(c, cx, w, yTop, o) {
  const bw = Math.min(w - 120, 520); if (bw < 120) return '';
  if (o.basin_type === 'undermount') return bx(c, cx - bw / 2, yTop, cx + bw / 2, yTop + 8, '#E3E1DA', { stroke: '#B8B5AD', sw: 0.5 }) + tapFront(c, cx, yTop, 200);
  const x0 = cx - bw / 2, rx = bw / 2 * c.s, ry = 130 * c.s;
  return tapFront(c, cx + bw * 0.12, yTop, 300) + `<path d="M ${f1(c.X(x0))} ${f1(c.Y(yTop))} A ${f1(rx)} ${f1(ry)} 0 0 1 ${f1(c.X(cx + bw / 2))} ${f1(c.Y(yTop))} Z" fill="#F7F7F5" stroke="#B8B5AD" stroke-width="0.9"/>`;
}

function applianceTall(c, b, x0, x1, f, g, internal) {
  const Hd = g.Hd, pb = g.plinth, w = x1 - x0, seed = Math.round(x0); let out = bx(c, x0, 0, x1, pb, f.hex);
  out += bx(c, x0, pb, x1, Hd, f.hex, { stroke: shade(f.hex, -30), sw: 0.9 });          // housing sides
  if (b.appliance === 'fridge') {
    const topCab = Hd > 2250 ? Hd - 350 : Hd, split = pb + (topCab - pb) * 0.36;
    if (topCab < Hd) out += internal ? shelfBox(c, x0 + 18, topCab, x1 - 18, Hd - 18, 1, seed) : faceDoors(c, x0, topCab, x1, Hd, 1, f, b.handle, 'bottom');
    out += bx(c, x0 + 18, pb, x1 - 18, topCab, '#E8E8E8');
    out += bx(c, x0 + 22, pb + 4, x1 - 22, split - 2, STEEL, { stroke: STEEL_D, sw: 0.8 }) + bx(c, x0 + 22, split + 2, x1 - 22, topCab - 4, STEEL, { stroke: STEEL_D, sw: 0.8 });
    out += bx(c, x1 - 90, split + 60, x1 - 70, split + 60 + Math.min(900, (topCab - split) * 0.5), STEEL_D, { rx: 1 }) + bx(c, x1 - 90, split - 330, x1 - 70, split - 80, STEEL_D, { rx: 1 });
    return out;
  }
  out += internal ? drawerBoxes(c, x0 + 18, pb, x1 - 18, 720, 2, seed) : faceDrawers(c, x0 + 6, pb, x1 - 6, 720, 2, f, b.handle);
  out += bx(c, x0 + 18, 720, x1 - 18, 1290, STEEL, { stroke: STEEL_D, sw: 0.8 }) + bx(c, x0 + 70, 770, x1 - 70, 1150, '#1A1D21', { stroke: '#000', sw: 0.6, rx: 1 });
  out += bx(c, x0 + 70, 1190, x1 - 70, 1205, STEEL_D) + circ(c, x0 + w * 0.3, 1245, 18, '#555B62') + circ(c, x0 + w * 0.5, 1245, 18, '#555B62') + circ(c, x0 + w * 0.7, 1245, 18, '#555B62');
  out += bx(c, x0 + 18, 1290, x1 - 18, 1470, '#2B2E33', { stroke: '#000', sw: 0.6 }) + bx(c, x0 + 60, 1330, x1 - 60, 1430, '#3E4349', { rx: 1 });
  out += internal ? shelfBox(c, x0 + 18, 1470, x1 - 18, Hd - 18, 2, seed + 2) : faceDoors(c, x0 + 6, 1470, x1 - 6, Hd, 1, f, b.handle, 'bottom');
  return out;
}
function kUpper(c, b, x0, x1, upper, f, g, internal, uid) {
  const wb = g.wallB, wt = g.wallT, w = x1 - x0; let out = '';
  if (upper === 'hood') {
    const cx = (x0 + x1) / 2, cw = w * 0.9;
    out += pol(c, [[cx - cw / 2, wb + 60], [cx + cw / 2, wb + 60], [cx + cw * 0.3, wb + 330], [cx - cw * 0.3, wb + 330]], STEEL, { stroke: STEEL_D });
    out += bx(c, cx - cw * 0.2, wb + 330, cx + cw * 0.2, g.Hd, STEEL, { stroke: STEEL_D, sw: 0.8 }) + bx(c, cx - cw * 0.35, wb + 60, cx + cw * 0.35, wb + 80, '#FFF4D6');
    return out;
  }
  const lv = b.kind === 'wall_doors' ? Math.max(1, ri(b.leaves)) : Math.max(1, upperLeaves(b));
  out += (upper === 'open' || internal) ? shelfBox(c, x0, wb, x1, wt, 2, Math.round(x0) + 3) : faceDoors(c, x0, wb, x1, wt, lv, f, b.handle, 'bottom');
  if (b.led) out += bx(c, x0 + 8, wb - 150, x1 - 8, wb, `url(#${uid}T)`) + bx(c, x0 + 8, wb - 8, x1 - 8, wb, '#FFE2A3');
  return out;
}
function kitchenModule(c, b, x0, x1, f, fin, o, g, internal, uid) {
  const k = b.kind, w = x1 - x0, cx = (x0 + x1) / 2, hd = b.handle, lv = ri(b.leaves), dr = ri(b.drawers), seed = Math.round(x0);
  const wtHex = (fin[o.worktop_finish] || fin.C).hex, bt = g.baseTop, tw = bt + g.wt, y0 = g.plinth;
  if (k === 'appliance_tall') return applianceTall(c, b, x0, x1, f, g, internal);
  let out = '';
  const upper = k === 'wall_doors' ? 'doors' : (UPPER_KINDS.includes(k) ? (b.upper || 'none') : 'none');
  if (k !== 'wall_doors') {
    out += bx(c, x0, tw, x1, g.wallB, '#EDE6D6');
    out += bx(c, x0, 0, x1, y0, fin.C.hex);
    if (k === 'base_drawers' || k === 'hob') out += internal ? drawerBoxes(c, x0, y0, x1, bt, dr || 3, seed) : faceDrawers(c, x0, y0, x1, bt, dr || 3, f, hd);
    else if (k === 'sink') out += internal ? sinkInterior(c, x0, y0, x1, bt) : faceDoors(c, x0, y0, x1, bt, lv || (w > 600 ? 2 : 1), f, hd, 'top');
    else if (k === 'open_niche') out += shelfBox(c, x0, y0, x1, bt, Math.max(1, ri(b.shelves) || 2), seed);
    else out += internal ? shelfBox(c, x0, y0, x1, bt, Math.max(0, ri(b.shelves)), seed) : faceDoors(c, x0, y0, x1, bt, lv || 1, f, hd, 'top');
    if (o.worktop) out += bx(c, x0, bt, x1, tw, wtHex, { stroke: shade(wtHex, -35), sw: 0.6 });
    if (k === 'sink') out += bx(c, cx - Math.min(w * 0.36, 420), tw, cx + Math.min(w * 0.36, 420), tw + 8, STEEL_D, { rx: 1 }) + tapFront(c, cx + Math.min(w * 0.36, 420) - 60, tw + 8, 230);
    if (k === 'hob') out += bx(c, cx - Math.min(300, w * 0.45), tw, cx + Math.min(300, w * 0.45), tw + 10, '#1D1D1F', { rx: 1 });
  }
  if (upper !== 'none') out += kUpper(c, b, x0, x1, upper, f, g, internal, uid);
  return out;
}

function tvBox(o, w, cx, bt, Hd) {
  const tw = Math.max(200, Math.min(ri(o.tvWidth_mm) || 1450, w - 80)), th = tw * 0.5625, cy = bt + (Hd - bt) * 0.52;
  const ty0 = Math.max(bt + 120, cy - th / 2), ty1 = Math.min(Hd - 100, ty0 + th);
  return { tx0: cx - tw / 2, tx1: cx + tw / 2, ty0, ty1 };
}
function tvModule(c, b, x0, x1, f, fin, o, g, internal, uid) {
  const k = b.kind, w = x1 - x0, gap = g.gap, bt = gap + g.baseH, Hd = g.Hd, hd = b.handle, lv = ri(b.leaves), dr = ri(b.drawers), seed = Math.round(x0), bf = fin.B, cx = (x0 + x1) / 2;
  let out = '';
  const side = Math.min(90, w * 0.2);
  const glowSides = (yA, yB) => (b.led ? bx(c, x0 + 18, yA, x0 + 18 + side, yB, `url(#${uid}L)`) + bx(c, x1 - 18 - side, yA, x1 - 18, yB, `url(#${uid}R)`) : '');
  if (k === 'tall_doors') {
    out += internal ? shelfBox(c, x0, gap, x1, Hd, Math.max(1, ri(b.shelves) || 3), seed) : faceDoors(c, x0, gap, x1, Hd, lv || 1, f, hd, 'v');
    if (b.led && gap > 0) out += bx(c, x0 + 8, gap - 70, x1 - 8, gap, '#FFC857', { op: 0.5 }) + bx(c, x0 + 8, gap - 5, x1 - 8, gap, '#FFE2A3');
    return out;
  }
  if (k === 'open_niche') {
    const n = Math.max(1, ri(b.shelves) || 4);
    out += shelfBox(c, x0, gap, x1, Hd, n, seed, { back: shade(bf.hex, -6), board: f.hex });
    out += bx(c, x0, gap, x0 + 18, Hd, f.hex) + bx(c, x1 - 18, gap, x1, Hd, f.hex) + bx(c, x0, Hd - 22, x1, Hd, f.hex) + bx(c, x0, gap, x1, gap + 22, f.hex);
    out += glowSides(gap + 22, Hd - 22);
    if (b.led && gap > 0) out += bx(c, x0 + 8, gap - 70, x1 - 8, gap, '#FFC857', { op: 0.5 }) + bx(c, x0 + 8, gap - 5, x1 - 8, gap, '#FFE2A3');
    return out;
  }
  // base kinds + TV niche
  if (k === 'tv_niche') {
    out += bx(c, x0, bt, x1, Hd, bf.hex, { stroke: BAY_INK, sw: 0.9 }) + bx(c, x0, Hd - 22, x1, Hd, f.hex);
    for (let gx = x0 + 120; gx < x1 - 60; gx += 120) out += lnm(c, gx, bt + 30, gx, Hd - 40, shade(bf.hex, -18), 0.5);
    if (b.led) out += glowSides(bt, Hd - 22) + bx(c, x0 + 18, Hd - 172, x1 - 18, Hd - 22, `url(#${uid}T)`);
    const t = tvBox(o, w, cx, bt, Hd);
    if (!internal) {
      out += bx(c, t.tx0, t.ty0, t.tx1, t.ty1, '#16171A', { rx: 1.5 }) + bx(c, t.tx0 + 10, t.ty0 + 10, t.tx1 - 10, t.ty1 - 10, `url(#${uid}S)`);
      out += pol(c, [[t.tx0 + 10, t.ty0 + 10], [t.tx0 + (t.tx1 - t.tx0) * 0.35, t.ty0 + 10], [t.tx0 + 10, t.ty0 + (t.ty1 - t.ty0) * 0.55]], '#FFFFFF', { op: 0.06 });
      if (w > 1000) out += bx(c, cx - 450, bt, cx + 450, bt + 70, '#222427', { rx: 1 });
    } else {
      out += `<rect x="${f1(c.X(t.tx0))}" y="${f1(c.Y(t.ty1))}" width="${f1((t.tx1 - t.tx0) * c.s)}" height="${f1((t.ty1 - t.ty0) * c.s)}" fill="none" stroke="#6b5b4b" stroke-width="1" stroke-dasharray="4 3"/>` + txt(c.X(cx), c.Y((t.ty0 + t.ty1) / 2) + 3, 'TV', { size: 11, bold: true, fill: '#6b5b4b' });
    }
  } else if (ri(b.shelves) > 0) {
    const n = ri(b.shelves), y0 = bt + 350, y1 = Hd - 250;
    for (let i = 0; i < n; i++) { const y = n === 1 ? (y0 + y1) / 2 : y0 + (y1 - y0) * i / (n - 1); out += bx(c, x0 + 20, y, x1 - 20, y + 22, f.hex, { stroke: shade(f.hex, -28), sw: 0.6 }) + itemsRow(c, x0 + 20, x1 - 20, y + 22, 200, seed + i); }
  }
  // the floating base itself
  if (internal) out += (dr > 0 && lv === 0) ? drawerBoxes(c, x0, gap, x1, bt, dr, seed) : shelfBox(c, x0, gap, x1, bt, lv > 0 ? 1 : 0, seed, { av: true });
  else out += lv > 0 ? faceDoors(c, x0, gap, x1, bt, lv, f, hd, 'top') : (dr > 0 ? faceDrawers(c, x0, gap, x1, bt, dr, f, hd) : shelfBox(c, x0, gap, x1, bt, 1, seed, { av: true }));
  if (b.led && gap > 0) out += bx(c, x0 + 8, gap - 70, x1 - 8, gap, '#FFC857', { op: 0.5 }) + bx(c, x0 + 8, gap - 5, x1 - 8, gap, '#FFE2A3');
  return out;
}

function mirrorBlock(c, b, x0, x1, up, f, g, internal, uid, seed) {
  const w = x1 - x0; let out = '';
  const refl = (a, z) => pol(c, [[a + w * 0.15, g.mb + 15], [a + w * 0.3, g.mb + 15], [a + w * 0.65, g.mt - 15], [a + w * 0.5, g.mt - 15]], '#FFFFFF', { op: 0.5 });
  if (up === 'mirror') out += bx(c, x0 + 12, g.mb, x1 - 12, g.mt, MIRROR_C, { stroke: '#9FB0B7', sw: 1 }) + refl(x0);
  else if (up === 'mirror_cab') {
    out += bx(c, x0, g.mb, x1, g.mt, f.hex, { stroke: shade(f.hex, -30), sw: 0.9 });
    out += internal ? shelfBox(c, x0 + 20, g.mb + 20, x1 - 20, g.mt - 20, 2, seed, { pal: TOWEL }) : bx(c, x0 + 30, g.mb + 30, x1 - 30, g.mt - 30, MIRROR_C, { stroke: '#9FB0B7', sw: 0.8 }) + refl(x0);
    if (!internal) out += hdl(c, b.handle || 'edge', x0, g.mb, x1, g.mt, 'v', f.hex, 'R');
  }
  if (b.led && up !== 'none') out += bx(c, x0 + 20, g.mt - 180, x1 - 20, g.mt, `url(#${uid}T)`) + bx(c, x0 + 20, g.mt - 10, x1 - 20, g.mt, '#FFF4D6');
  return out;
}
function vanityModule(c, b, x0, x1, f, fin, o, g, internal, uid) {
  const k = b.kind, w = x1 - x0, cx = (x0 + x1) / 2, hd = b.handle, lv = ri(b.leaves), dr = ri(b.drawers), seed = Math.round(x0);
  const cHex = (fin[o.counter_finish] || fin.A).hex; let out = '';
  const up = k === 'mirror' ? 'mirror_cab' : (UPPER_KINDS.includes(k) ? (b.upper || 'none') : 'none');
  if (k !== 'mirror') {
    if (g.floor) out += bx(c, x0, 0, x1, g.bodyB, fin.C.hex);
    else if (b.led) out += bx(c, x0 + 8, g.bodyB - 80, x1 - 8, g.bodyB, '#FFC857', { op: 0.5 }) + bx(c, x0 + 8, g.bodyB - 5, x1 - 8, g.bodyB, '#FFE2A3');
    const y0 = g.bodyB, y1 = g.ct;
    if (k === 'base_drawers') out += internal ? drawerBoxes(c, x0, y0, x1, y1, dr || 2, seed) : faceDrawers(c, x0, y0, x1, y1, dr || 2, f, hd);
    else if (k === 'open_niche') out += shelfBox(c, x0, y0, x1, y1, Math.max(1, ri(b.shelves) || 2), seed, { pal: TOWEL });
    else if (k === 'sink') out += internal ? sinkInterior(c, x0, y0, x1, y1) : faceDoors(c, x0, y0, x1, y1, lv || (w > 600 ? 2 : 1), f, hd, 'top');
    else out += internal ? shelfBox(c, x0, y0, x1, y1, 1, seed, { pal: TOWEL }) : faceDoors(c, x0, y0, x1, y1, lv || 1, f, hd, 'top');
    out += bx(c, x0, g.ct, x1, g.ct + g.cth, cHex, { stroke: shade(cHex, -30), sw: 0.6 });
    if (k === 'sink' && o.basin) out += basinFront(c, cx, w, g.ct + g.cth, o);
  }
  return out + mirrorBlock(c, b, x0, x1, up, f, g, internal, uid, seed);
}

function doorModule(c, b, x0, x1, f, fin, o, g, internal, uid) {
  const w = x1 - x0, H = g.H, k = b.kind, y0 = 10, y1 = H, sw = k === 'sliding_leaf' ? 'sliding' : (b.swing || 'left'), hw = fin.C.hex;
  let out = '';
  if (internal) {
    // leaf construction: stiles, rails, hatched core, hinge + lock positions
    const st = 90, rt = 110, br = 190, lockR = 150, wood = '#D9C7A6';
    out += bx(c, x0, y0, x1, y1, `url(#${uid}K)`, { stroke: BAY_INK, sw: 1 });
    out += bx(c, x0, y0, x0 + st, y1, wood, { stroke: '#8a7b66', sw: 0.6 }) + bx(c, x1 - st, y0, x1, y1, wood, { stroke: '#8a7b66', sw: 0.6 });
    out += bx(c, x0 + st, y1 - rt, x1 - st, y1, wood, { stroke: '#8a7b66', sw: 0.6 }) + bx(c, x0 + st, y0, x1 - st, y0 + br, wood, { stroke: '#8a7b66', sw: 0.6 });
    out += bx(c, x0 + st, 1000 - lockR / 2, x1 - st, 1000 + lockR / 2, wood, { stroke: '#8a7b66', sw: 0.6 });
    if (sw !== 'sliding') {
      const hx = sw === 'left' ? x0 : x1 - 14;
      [y1 - 250, H / 2, 300].forEach((yy) => { out += bx(c, hx, yy - 55, hx + 14, yy + 55, hw, { rx: 0.8 }); });
      out += txt(c.X(sw === 'left' ? x1 : x0) + (sw === 'left' ? -3 : 3), c.Y(1000) - 4, '1.00', { size: 7, anchor: sw === 'left' ? 'end' : 'start', fill: BAY_INK });
    } else out += bx(c, x0 + w * 0.1, H - 90, x1 - w * 0.1, H - 50, STEEL_D, { rx: 1 });
    return out;
  }
  const st = 110, rt = 110, mr = 150, br = 220;
  out += bx(c, x0, y0, x1, y1, f.hex, { stroke: shade(f.hex, -32), sw: 1 });
  if (k === 'panel_door') {
    const cols = w > 500 ? 2 : 1, ya = y1 - rt, yb = y0 + br, mid = (ya + yb) / 2, rows = [[mid + mr / 2, ya], [yb, mid - mr / 2]], pw = (w - 2 * st - (cols - 1) * st * 0.7) / cols;
    rows.forEach((r) => { for (let ci = 0; ci < cols; ci++) { const px0 = x0 + st + ci * (pw + st * 0.7); out += bx(c, px0, r[0], px0 + pw, r[1], shade(f.hex, -5), { stroke: shade(f.hex, -26), sw: 0.8 }) + bx(c, px0 + 24, r[0] + 24, px0 + pw - 24, r[1] - 24, shade(f.hex, 3), { stroke: shade(f.hex, -14), sw: 0.5 }); } });
  } else if (k === 'glass_door') {
    const gx0 = x0 + st, gx1 = x1 - st, gy0 = y0 + br, gy1 = y1 - rt;
    out += bx(c, gx0, gy0, gx1, gy1, GLASS_C, { stroke: shade(f.hex, -32), sw: 0.9, op: 0.8 });
    out += lnm(c, (gx0 + gx1) / 2, gy0, (gx0 + gx1) / 2, gy1, shade(f.hex, -20), 1.2);
    for (let i = 1; i < 4; i++) out += lnm(c, gx0, gy0 + (gy1 - gy0) * i / 4, gx1, gy0 + (gy1 - gy0) * i / 4, shade(f.hex, -20), 1.2);
    out += pol(c, [[gx0 + 20, gy0 + 20], [gx0 + (gx1 - gx0) * 0.3, gy0 + 20], [gx0 + 20, gy0 + (gy1 - gy0) * 0.3]], '#FFFFFF', { op: 0.25 });
  } else if (k === 'sliding_leaf') {
    out += bx(c, x0 + 12, y1 - 12 - 0, x1 - 12, y1 - 6, shade(f.hex, -12));
    out += bx(c, x0, H, x1, H + 34, STEEL_D, { rx: 0.6 }) + circ(c, x0 + 90, H + 6, 22, '#555B62') + circ(c, x1 - 90, H + 6, 22, '#555B62');
  } else {
    out += bx(c, x0 + 14, y0 + 14, x1 - 14, y1 - 14, 'none', { stroke: shade(f.hex, -14), sw: 0.5 });
  }
  if (sw !== 'sliding') {
    const hx = sw === 'left' ? x0 : x1 - 12;
    [y1 - 250, H / 2, 300].forEach((yy) => { out += bx(c, hx, yy - 55, hx + 12, yy + 55, hw, { rx: 0.8 }); });
  }
  const hside = sw === 'left' ? 'R' : sw === 'right' ? 'L' : (b.w >= 0 && x0 % 2 === 0 ? 'R' : 'L');
  out += hdl(c, b.handle === 'none' ? 'none' : (sw === 'sliding' && b.handle === 'lever' ? 'edge' : (b.handle || 'lever')), x0, y0, x1, y1, 'lever', f.hex, hside, lumOf(hw) < 0.55 ? hw : null);
  return out;
}
function doorFrame(c, W, fin, o, g) {
  if (!g.frame) return '';
  const fh = (fin[o.frame_finish] || fin.B).hex, st = { stroke: shade(fh, -35), sw: 0.7 }, p = g.padX, fr = g.fr, ar = g.arch, H = g.H;
  let out = bx(c, p - fr - ar, 0, p - fr, H + fr + ar, shade(fh, 8), st) + bx(c, p + W + fr, 0, p + W + fr + ar, H + fr + ar, shade(fh, 8), st) + bx(c, p - fr - ar, H + fr, p + W + fr + ar, H + fr + ar, shade(fh, 8), st);
  out += bx(c, p - fr, 0, p, H + fr, fh, st) + bx(c, p + W, 0, p + W + fr, H + fr, fh, st) + bx(c, p - fr, H, p + W + fr, H + fr, fh, st);
  return out;
}

function catGeom(cat, bays, o, H) {
  const any = (fn) => bays.some(fn);
  if (cat === 'kitchen') {
    const tall = any((b) => b.kind === 'appliance_tall'), wall = any((b) => b.kind === 'wall_doors' || (UPPER_KINDS.includes(b.kind) && b.upper && b.upper !== 'none'));
    const Hd = Math.max(H, tall || wall ? 2100 : 900), wt = o.worktop ? 40 : 0, baseTop = 820, wallB = 1450, wallT = Math.max(wallB + 500, Math.min(2200, Hd - 50));
    return { Hd, dimH: Hd, padX: 0, plinth: 100, baseTop, wt, wallB, wallT, wall, tall, dimsR: [{ y: baseTop + wt, label: mFmt(baseTop + wt) }].concat(wall ? [{ y: wallB, label: mFmt(wallB) }] : []) };
  }
  if (cat === 'tv') {
    const gap = o.mount === 'floor' ? 0 : 150, baseH = 450;
    return { Hd: Math.max(H, 900), dimH: Math.max(H, 900), padX: 0, gap, baseH, dimsR: [{ y: gap + baseH, label: mFmt(gap + baseH) }].concat(gap ? [{ y: gap, label: mFmt(gap) }] : []) };
  }
  if (cat === 'vanity') {
    const mir = any((b) => b.kind === 'mirror' || (UPPER_KINDS.includes(b.kind) && (b.upper === 'mirror' || b.upper === 'mirror_cab')));
    const Hd = Math.max(H, mir ? 2000 : 900), floor = o.mount === 'floor', bodyB = floor ? 100 : 300, ct = 820, cth = 30;
    let mb = o.basin && o.basin_type !== 'undermount' ? 1250 : 1100; const mt = Math.min(Hd - 50, mb + 800); mb = Math.min(mb, mt - 300);
    return { Hd, dimH: Hd, padX: 0, floor, bodyB, ct, cth, mb, mt, mir, dimsR: [{ y: ct + cth, label: mFmt(ct + cth) }].concat(mir ? [{ y: mb, label: mFmt(mb) }] : []) };
  }
  const fr = o.frame ? 45 : 0, arch = o.frame ? 70 : 0, e = fr + arch, Hh = Math.max(600, H);
  return { Hd: Hh + e, H: Hh, dimH: Hh, padX: e, fr, arch, e, frame: !!o.frame, dimsR: [] };
}

function catElevation(s, cat, opt, internal) {
  if (!hasBays(s)) return null;
  const bays = bayList(s), fin = finishesOf(s, cat), o = optsOf(s, cat);
  const W = bays.reduce((a, b) => a + b.w, 0), H = Math.max(300, nn(s.height_mm) || (cat === 'door' ? 2100 : 2400));
  const g = catGeom(cat, bays, o, H);
  const maxW = opt.maxW || 520, maxH = opt.maxH || 300, nod = !!opt.noDims;
  const L = nod ? 6 : 34, T = nod ? 6 : 44, R = nod ? 6 : 40, B = 8, totW = W + 2 * g.padX;
  const scale = Math.min((maxW - L - R) / totW, (maxH - T - B) / g.Hd);
  if (!(scale > 0)) return null;
  const c = mkC(L, T, scale, g.Hd), uid = 'bu' + (++_bayUid);
  let defs = ledDefs(uid) + `<linearGradient id="${uid}S" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#2D3442"/><stop offset="1" stop-color="#0D1015"/></linearGradient><pattern id="${uid}K" patternUnits="userSpaceOnUse" width="6" height="6" patternTransform="rotate(45)"><rect width="6" height="6" fill="#F6F1E7"/><line x1="0" y1="0" x2="0" y2="6" stroke="#C9B58F" stroke-width="1"/></pattern>`;
  let out = bx(c, 0, 0, totW, g.Hd, WALL_BG);
  const fn = cat === 'kitchen' ? kitchenModule : cat === 'tv' ? tvModule : cat === 'vanity' ? vanityModule : doorModule;
  let x = g.padX;
  bays.forEach((b) => { const x1 = x + b.w; out += fn(c, b, x, x1, bayFin(b, fin), fin, o, g, internal, uid); x = x1; });
  if (cat === 'door') out += doorFrame(c, W, fin, o, g);
  out += lnm(c, 0, 0, totW, 0, BAY_INK, 1.6);
  if (!nod) {
    const ty = 14, ty2 = 32, xa = c.X(g.padX), xb = c.X(g.padX + W);
    out += `<line x1="${f1(xa)}" y1="${ty}" x2="${f1(xb)}" y2="${ty}" stroke="${BAY_DIM}" stroke-width="0.8"/><line x1="${f1(xa)}" y1="${ty - 4}" x2="${f1(xa)}" y2="${ty + 4}" stroke="${BAY_DIM}"/><line x1="${f1(xb)}" y1="${ty - 4}" x2="${f1(xb)}" y2="${ty + 4}" stroke="${BAY_DIM}"/>`;
    out += `<rect x="${f1((xa + xb) / 2 - 24)}" y="${ty - 6}" width="48" height="12" fill="#ffffff"/>` + txt((xa + xb) / 2, ty + 3, mFmt(W), { size: 10, bold: true, fill: BAY_INK });
    let xx = xa;
    bays.forEach((b) => {
      const bw = b.w * scale;
      out += `<line x1="${f1(xx)}" y1="${ty2 - 4}" x2="${f1(xx)}" y2="${ty2 + 4}" stroke="${BAY_DIM}"/><line x1="${f1(xx)}" y1="${ty2}" x2="${f1(xx + bw)}" y2="${ty2}" stroke="${BAY_DIM}" stroke-width="0.7"/>`;
      out += txt(xx + bw / 2, ty2 - 3, mFmt(b.w).replace(' m', ''), { size: bw < 30 ? 7 : 9, fill: BAY_INK });
      xx += bw;
    });
    out += `<line x1="${f1(xx)}" y1="${ty2 - 4}" x2="${f1(xx)}" y2="${ty2 + 4}" stroke="${BAY_DIM}"/>`;
    const lx = L - 12, ya = c.Y(0), yb = c.Y(g.dimH);
    out += `<line x1="${lx}" y1="${f1(yb)}" x2="${lx}" y2="${f1(ya)}" stroke="${BAY_DIM}" stroke-width="0.8"/><line x1="${lx - 4}" y1="${f1(yb)}" x2="${lx + 4}" y2="${f1(yb)}" stroke="${BAY_DIM}"/><line x1="${lx - 4}" y1="${f1(ya)}" x2="${lx + 4}" y2="${f1(ya)}" stroke="${BAY_DIM}"/>`;
    out += txt(lx - 3, (ya + yb) / 2, mFmt(g.dimH), { size: 10, bold: true, fill: BAY_INK, rot: -90 });
    const rx = c.X(totW) + 4;
    g.dimsR.forEach((d) => { const yy = c.Y(d.y); out += `<line x1="${f1(c.X(0))}" y1="${f1(yy)}" x2="${f1(rx)}" y2="${f1(yy)}" stroke="#00000026" stroke-width="0.6" stroke-dasharray="3 3"/><line x1="${f1(rx)}" y1="${f1(yy)}" x2="${f1(rx + 6)}" y2="${f1(yy)}" stroke="${BAY_DIM}"/>` + txt(rx + 8, yy + 3, d.label.replace(' m', ''), { size: 8, anchor: 'start', fill: BAY_INK }); });
  }
  const vbW = L + totW * scale + R, vbH = T + g.Hd * scale + B;
  return { svg: svgWrap(out, vbW, vbH, defs), w: vbW, h: vbH, vbW, vbH };
}
export function baysFrontSVG(s, opt = {}) {
  const cat = unitCat(s, opt.cat);
  if (CAT_ENGINE.includes(cat)) { try { const r = catElevation(s, cat, opt, false); if (r && r.svg) return r; } catch (e) { /* fall back to the generic elevation */ } }
  let r = null; try { r = baysElevation(s, opt, false, cat); } catch (e) { r = null; }
  return r || elevationSVG(s, { showDims: !opt.noDims, ...opt });
}
export function baysInternalSVG(s, opt = {}) {
  const cat = unitCat(s, opt.cat);
  if (CAT_ENGINE.includes(cat)) { try { const r = catElevation(s, cat, opt, true); if (r && r.svg) return r; } catch (e) { /* fall back to the generic internal */ } }
  let r = null; try { r = baysElevation(s, opt, true, cat); } catch (e) { r = null; }
  return r || elevationSVG(s, { showDims: !opt.noDims, ...opt });
}

// TOP VIEW for kitchen / tv / vanity / door.
function catPlan(s, cat, opt) {
  if (!hasBays(s)) return null;
  const bays = bayList(s), fin = finishesOf(s, cat), o = optsOf(s, cat), W = bays.reduce((a, b) => a + b.w, 0);
  const uid = 'bu' + (++_bayUid), maxW = opt.maxW || 520, maxH = opt.maxH || 200;
  if (cat === 'door') {
    const t = Math.max(60, nn(s.depth_mm) || 150), thk = Math.max(20, ri(o.door_thk) || 40), ext = 260, fr = o.frame ? 45 : 0;
    const swing = Math.max(0, ...bays.filter((b) => b.swing !== 'sliding' && b.kind !== 'sliding_leaf').map((b) => b.w)), anySlide = bays.some((b) => b.swing === 'sliding' || b.kind === 'sliding_leaf');
    const L = 14, T = 26, R = 40, B = 14, totW = W + 2 * ext, totH = t + Math.max(swing, anySlide ? 2.4 * thk : 0, 120);
    const scale = Math.min((maxW - L - R) / totW, (maxH - T - B) / totH), X = (mm) => L + mm * scale, Y = (mm) => T + mm * scale;
    const defs = `<pattern id="${uid}H" patternUnits="userSpaceOnUse" width="6" height="6" patternTransform="rotate(45)"><rect width="6" height="6" fill="#F6F1E7"/><line x1="0" y1="0" x2="0" y2="6" stroke="#B9A98F" stroke-width="1"/></pattern>`;
    const rc = (x0, y0, x1, y1, fill, stroke, sw) => `<rect x="${f1(X(x0))}" y="${f1(Y(y0))}" width="${f1((x1 - x0) * scale)}" height="${f1((y1 - y0) * scale)}" fill="${fill}"${stroke ? ` stroke="${stroke}" stroke-width="${sw || 0.9}"` : ''}/>`;
    let out = rc(0, 0, ext, t, `url(#${uid}H)`, BAY_INK, 1.2) + rc(ext + W, 0, totW, t, `url(#${uid}H)`, BAY_INK, 1.2);
    if (o.frame) { const fh = (fin[o.frame_finish] || fin.B).hex; out += rc(ext - fr, 0, ext, t, fh, shade(fh, -35), 0.7) + rc(ext + W, 0, ext + W + fr, t, fh, shade(fh, -35), 0.7); }
    let x = ext;
    bays.forEach((b, i) => {
      const f = bayFin(b, fin), lw = b.w, sl = b.swing === 'sliding' || b.kind === 'sliding_leaf', left = b.swing !== 'right';
      out += rc(x, t / 2 - thk / 2, x + lw, t / 2 + thk / 2, 'none', '#8a7b66', 0.6).replace('/>', ' stroke-dasharray="3 2"/>');
      if (sl) {
        const yy = t / 2 - thk / 2 + (i % 2 ? thk * 1.3 : 0);
        out += rc(x, yy, x + lw, yy + thk, f.hex, shade(f.hex, -30), 0.8) + `<line x1="${f1(X(x + lw * 0.25))}" y1="${f1(Y(t + 70))}" x2="${f1(X(x + lw * 0.75))}" y2="${f1(Y(t + 70))}" stroke="${BAY_DIM}" stroke-width="0.9"/><path d="M ${f1(X(x + lw * 0.75))} ${f1(Y(t + 70))} l -3 -2 v 4 Z M ${f1(X(x + lw * 0.25))} ${f1(Y(t + 70))} l 3 -2 v 4 Z" fill="${BAY_DIM}"/>`;
      } else {
        const hx = left ? x : x + lw;
        out += rc(left ? x : x + lw - thk, t, left ? x + thk : x + lw, t + lw, f.hex, shade(f.hex, -30), 0.8);
        const r = lw * scale, ex = X(left ? x : x + lw), sx = X(left ? x + lw : x);
        out += `<path d="M ${f1(sx)} ${f1(Y(t))} A ${f1(r)} ${f1(r)} 0 0 ${left ? 1 : 0} ${f1(ex)} ${f1(Y(t + lw))}" fill="none" stroke="${BAY_DIM}" stroke-width="0.8" stroke-dasharray="3 2"/>`;
        out += `<circle cx="${f1(X(hx))}" cy="${f1(Y(t))}" r="1.8" fill="${BAY_INK}"/>`;
      }
      out += txt(X(x + lw / 2), Y(t / 2) + 3, String(i + 1), { size: 8, fill: '#b9a98f', bold: true });
      x += lw;
    });
    const rx = X(totW) + 12;
    out += `<line x1="${f1(rx)}" y1="${f1(Y(0))}" x2="${f1(rx)}" y2="${f1(Y(t))}" stroke="${BAY_DIM}" stroke-width="0.8"/><line x1="${f1(rx - 4)}" y1="${f1(Y(0))}" x2="${f1(rx + 4)}" y2="${f1(Y(0))}" stroke="${BAY_DIM}"/><line x1="${f1(rx - 4)}" y1="${f1(Y(t))}" x2="${f1(rx + 4)}" y2="${f1(Y(t))}" stroke="${BAY_DIM}"/>`;
    out += txt(rx + 5, Y(t / 2), mFmt(t), { size: 9, bold: true, fill: BAY_INK, rot: -90 });
    out += `<line x1="${f1(X(ext))}" y1="16" x2="${f1(X(ext + W))}" y2="16" stroke="${BAY_DIM}" stroke-width="0.8"/>` + txt(X(ext + W / 2), 12, mFmt(W), { size: 10, bold: true, fill: BAY_INK });
    out += txt(X(totW / 2), Y(t) + 11, 'ROOM SIDE', { size: 6.5, fill: '#b9a98f' });
    const vbW = L + totW * scale + R, vbH = T + totH * scale + B;
    return { svg: svgWrap(out, vbW, vbH, defs), w: vbW, h: vbH, vbW, vbH };
  }
  const D = Math.max(100, nn(s.depth_mm) || 600), wallD = cat === 'kitchen' ? Math.min(350, Math.round(D * 0.55)) : 0;
  const L = 14, T = 24, R = 34, B = 22, scale = Math.min((maxW - L - R) / W, (maxH - T - B) / (D + 20));
  const w = W * scale, d = D * scale, th = Math.max(1.2, 20 * scale); let out = '', x = L;
  const wtHex = (fin[o.worktop_finish] || fin.C).hex, cHex = (fin[o.counter_finish] || fin.A).hex;
  out += `<rect x="${L}" y="${T}" width="${f1(w)}" height="${f1(d)}" fill="${BAY_BACK}" stroke="${BAY_INK}" stroke-width="1.6"/>`;
  bays.forEach((b, i) => {
    const bw = b.w * scale, f = bayFin(b, fin), cx = x + bw / 2, k = b.kind;
    const tall = k === 'appliance_tall' || k === 'tall_doors';
    out += `<rect x="${f1(x)}" y="${T}" width="${f1(bw)}" height="${f1(d)}" fill="${k === 'open_niche' ? fin.B.hex : f.hex}" fill-opacity="${tall ? 0.6 : 0.3}"/>`;
    if (i > 0) out += `<line x1="${f1(x)}" y1="${T}" x2="${f1(x)}" y2="${f1(T + d)}" stroke="${BAY_INK}" stroke-width="1"/>`;
    out += `<rect x="${f1(x)}" y="${f1(T + d - 3)}" width="${f1(bw)}" height="3" fill="${f.hex}"/>`;
    if (cat === 'kitchen') {
      if (!tall && k !== 'wall_doors' && o.worktop) out += `<rect x="${f1(x)}" y="${T}" width="${f1(bw)}" height="${f1(d + th)}" fill="${wtHex}" fill-opacity="0.2" stroke="${wtHex}" stroke-width="1.4"/>`;
      if (k === 'sink') { const sw2 = Math.min(b.w - 140, 800) * scale, sh2 = 400 * scale; out += `<rect x="${f1(cx - sw2 / 2)}" y="${f1(T + d / 2 - sh2 / 2)}" width="${f1(sw2)}" height="${f1(sh2)}" rx="3" fill="#E6E9EC" stroke="${STEEL_D}" stroke-width="1"/><circle cx="${f1(cx)}" cy="${f1(T + d / 2)}" r="${f1(Math.max(1.4, 30 * scale))}" fill="${STEEL_D}"/><circle cx="${f1(cx)}" cy="${f1(T + 60 * scale)}" r="${f1(Math.max(1.6, 22 * scale))}" fill="${STEEL_D}"/>`; }
      if (k === 'hob') { const r = Math.max(2, 70 * scale), dx = 150 * scale, dy = 130 * scale; [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([a, bb]) => { out += `<circle cx="${f1(cx + a * dx)}" cy="${f1(T + d / 2 + bb * dy)}" r="${f1(r)}" fill="#1D1D1F" stroke="#555" stroke-width="0.6"/>`; }); }
      const up = k === 'wall_doors' ? 'doors' : (UPPER_KINDS.includes(k) ? (b.upper || 'none') : 'none');
      if (up !== 'none') out += `<rect x="${f1(x + 1)}" y="${T}" width="${f1(bw - 2)}" height="${f1(wallD * scale)}" fill="none" stroke="${BAY_INK}" stroke-width="0.9" stroke-dasharray="4 3"/>` + (up === 'hood' ? `<line x1="${f1(x + 1)}" y1="${T}" x2="${f1(x + bw - 1)}" y2="${f1(T + wallD * scale)}" stroke="${BAY_DIM}" stroke-width="0.6"/><line x1="${f1(x + bw - 1)}" y1="${T}" x2="${f1(x + 1)}" y2="${f1(T + wallD * scale)}" stroke="${BAY_DIM}" stroke-width="0.6"/>` : '');
    } else if (cat === 'tv') {
      if (k === 'tv_niche') {
        out += `<rect x="${f1(x)}" y="${T}" width="${f1(bw)}" height="${f1(Math.max(2, 22 * scale))}" fill="${fin.B.hex}"/>`;
        const t = tvBox(o, b.w, b.w / 2, 0, 3000), tw = (t.tx1 - t.tx0) * scale;
        out += `<rect x="${f1(cx - tw / 2)}" y="${f1(T + 6)}" width="${f1(tw)}" height="${f1(Math.max(2.5, 60 * scale))}" fill="#16171A"/>` + txt(cx, T + d / 2 + 4, 'TV', { size: 9, bold: true, fill: '#6b5b4b' });
      }
    } else if (cat === 'vanity') {
      if (k !== 'mirror') out += `<rect x="${f1(x)}" y="${T}" width="${f1(bw)}" height="${f1(d + th)}" fill="${cHex}" fill-opacity="0.35" stroke="${shade(cHex, -30)}" stroke-width="1.2"/>`;
      if (k === 'sink' && o.basin) { const rx2 = Math.max(3, Math.min(b.w * 0.32, 250) * scale), ry2 = Math.max(3, Math.min(D * 0.32, 190) * scale); out += `<ellipse cx="${f1(cx)}" cy="${f1(T + d * 0.5)}" rx="${f1(rx2)}" ry="${f1(ry2)}" fill="#F7F7F5" stroke="#B8B5AD" stroke-width="1"/><circle cx="${f1(cx)}" cy="${f1(T + d * 0.5)}" r="${f1(Math.max(1.4, 22 * scale))}" fill="#B8B5AD"/><circle cx="${f1(cx)}" cy="${f1(T + 60 * scale)}" r="${f1(Math.max(1.6, 22 * scale))}" fill="${STEEL_D}"/>`; }
      const up = k === 'mirror' ? 'mirror_cab' : (UPPER_KINDS.includes(k) ? (b.upper || 'none') : 'none');
      if (up === 'mirror_cab') out += `<rect x="${f1(x + 1)}" y="${T}" width="${f1(bw - 2)}" height="${f1(130 * scale)}" fill="none" stroke="${BAY_INK}" stroke-width="0.9" stroke-dasharray="4 3"/>`;
      else if (up === 'mirror') out += `<rect x="${f1(x + 1)}" y="${T}" width="${f1(bw - 2)}" height="${f1(Math.max(1.5, 18 * scale))}" fill="none" stroke="${BAY_DIM}" stroke-width="0.8" stroke-dasharray="4 3"/>`;
    }
    out += txt(cx, T + d - 6, String(i + 1), { size: 8, fill: '#8a7a66', bold: true });
    x += bw;
  });
  out += `<line x1="${L}" y1="${T}" x2="${f1(L + w)}" y2="${T}" stroke="${BAY_INK}" stroke-width="3"/>`;
  const rx = L + w + 12;
  out += `<line x1="${rx}" y1="${T}" x2="${rx}" y2="${f1(T + d)}" stroke="${BAY_DIM}" stroke-width="0.8"/><line x1="${rx - 4}" y1="${T}" x2="${rx + 4}" y2="${T}" stroke="${BAY_DIM}"/><line x1="${rx - 4}" y1="${f1(T + d)}" x2="${rx + 4}" y2="${f1(T + d)}" stroke="${BAY_DIM}"/>`;
  out += txt(rx + 4, T + d / 2, mFmt(D), { size: 10, bold: true, fill: BAY_INK, rot: -90 });
  out += `<line x1="${L}" y1="14" x2="${f1(L + w)}" y2="14" stroke="${BAY_DIM}" stroke-width="0.8"/>` + txt(L + w / 2, 11, mFmt(W), { size: 10, bold: true, fill: BAY_INK });
  if (wallD) out += txt(L + 2, T + d + th + 11, `wall units ${mFmt(wallD).replace(' m', '')} deep`, { size: 7, anchor: 'start', fill: BAY_DIM });
  const vbW = L + w + R, vbH = T + d + th + B;
  return { svg: svgWrap(out, vbW, vbH, ''), w: vbW, h: vbH, vbW, vbH };
}

// SIDE SECTION for kitchen / tv / vanity / door.
function catSide(s, cat, opt) {
  if (!hasBays(s)) return null;
  const bays = bayList(s), fin = finishesOf(s, cat), o = optsOf(s, cat), H = Math.max(300, nn(s.height_mm) || (cat === 'door' ? 2100 : 2400));
  const g = catGeom(cat, bays, o, H), uid = 'bu' + (++_bayUid);
  const maxW = opt.maxW || 220, maxH = opt.maxH || 320, L = 12, T = 22, R = 36, B = 16;
  let out = '', defs = '';
  const dimV = (c, x, y0, y1, label) => `<line x1="${f1(x)}" y1="${f1(c.Y(y1))}" x2="${f1(x)}" y2="${f1(c.Y(y0))}" stroke="${BAY_DIM}" stroke-width="0.8"/><line x1="${f1(x - 4)}" y1="${f1(c.Y(y1))}" x2="${f1(x + 4)}" y2="${f1(c.Y(y1))}" stroke="${BAY_DIM}"/><line x1="${f1(x - 4)}" y1="${f1(c.Y(y0))}" x2="${f1(x + 4)}" y2="${f1(c.Y(y0))}" stroke="${BAY_DIM}"/>` + txt(x + 4, (c.Y(y0) + c.Y(y1)) / 2, label, { size: 10, bold: true, fill: BAY_INK, rot: -90 });
  if (cat === 'door') {
    const t = Math.max(60, nn(s.depth_mm) || 150), thk = Math.max(20, ri(o.door_thk) || 40), Hd = g.H + g.fr + 300, fr = g.fr, ar = g.arch;
    const scale = Math.min((maxW - L - R) / (t + 40), (maxH - T - B) / Hd), c = mkC(L + 14 * scale, T, scale, Hd);
    defs = `<pattern id="${uid}H" patternUnits="userSpaceOnUse" width="6" height="6" patternTransform="rotate(45)"><rect width="6" height="6" fill="#F6F1E7"/><line x1="0" y1="0" x2="0" y2="6" stroke="#B9A98F" stroke-width="1"/></pattern>`;
    const f = bayFin(bays[0], fin), fh = (fin[o.frame_finish] || fin.B).hex;
    out += bx(c, -20, g.H + fr, t + 20, Hd, `url(#${uid}H)`, { stroke: BAY_INK, sw: 0.8 });
    out += bx(c, -20, -60, t + 20, 0, `url(#${uid}H)`, { stroke: BAY_INK, sw: 0.8 }) + lnm(c, -40, 0, t + 40, 0, BAY_INK, 1.4);
    if (o.frame) out += bx(c, 0, g.H, t, g.H + fr, fh, { stroke: shade(fh, -35), sw: 0.7 }) + bx(c, -12, g.H + fr, 0, g.H + fr + ar, shade(fh, 8), { stroke: shade(fh, -35), sw: 0.6 }) + bx(c, t, g.H + fr, t + 12, g.H + fr + ar, shade(fh, 8), { stroke: shade(fh, -35), sw: 0.6 });
    out += bx(c, (t - thk) / 2, 10, (t + thk) / 2, g.H, f.hex, { stroke: shade(f.hex, -32), sw: 0.9 });
    out += txt(c.X(t + 24), c.Y(g.H * 0.5), `${thk} mm leaf`, { size: 7.5, anchor: 'start', fill: BAY_INK });
    out += `<line x1="${f1(c.X((t - thk) / 2))}" y1="${f1(c.Y(g.H * 0.5))}" x2="${f1(c.X(t + 22))}" y2="${f1(c.Y(g.H * 0.5))}" stroke="${BAY_DIM}" stroke-width="0.5"/>`;
    out += dimV(c, c.X(t) + 30, 0, g.H, mFmt(g.H));
    out += `<line x1="${f1(c.X(0))}" y1="14" x2="${f1(c.X(t))}" y2="14" stroke="${BAY_DIM}" stroke-width="0.8"/>` + txt(c.X(t / 2), 11, mFmt(t), { size: 10, bold: true, fill: BAY_INK });
    const vbW = maxW, vbH = T + Hd * scale + B;
    return { svg: svgWrap(out, vbW, vbH, defs), w: vbW, h: vbH, vbW, vbH };
  }
  const D = Math.max(100, nn(s.depth_mm) || 600), Dt = D + 20;
  const scale = Math.min((maxW - L - R) / (Dt + 30), (maxH - T - B) / g.Hd), c = mkC(L, T, scale, g.Hd);
  const rep = (kinds) => bays.find((b) => kinds.includes(b.kind)) || bays[0], fOf = (b) => bayFin(b, fin);
  out += bx(c, 0, 0, Dt, g.Hd, WALL_BG) + bx(c, Dt, 0, Dt + 25, g.Hd, '#D7CCB6', { stroke: BAY_INK, sw: 0.8 }) + lnm(c, -10, 0, Dt + 25, 0, BAY_INK, 1.6);
  if (cat === 'kitchen') {
    const bb = rep(['sink', 'base_doors', 'base_drawers', 'hob', 'open_niche']), f = fOf(bb), wtHex = (fin[o.worktop_finish] || fin.C).hex, bt = g.baseTop, tw = bt + g.wt;
    if (bays.some((b) => b.kind === 'appliance_tall')) out += `<rect x="${f1(c.X(20))}" y="${f1(c.Y(g.Hd))}" width="${f1(D * scale)}" height="${f1(g.Hd * scale)}" fill="none" stroke="${BAY_DIM}" stroke-width="0.8" stroke-dasharray="4 3"/>` + txt(c.X(20 + D / 2), c.Y(g.Hd) + 10, 'tall housing', { size: 7, fill: BAY_DIM });
    out += bx(c, 80, 0, Dt, g.plinth, fin.C.hex) + bx(c, 20, g.plinth, Dt, bt, BAY_BACK, { stroke: BAY_INK, sw: 1.2 }) + bx(c, 20, g.plinth, 38, bt, f.hex);
    out += bx(c, 38, 470, Dt, 488, '#B8AA93') + bx(c, 38, bt - 22, Dt, bt, '#B8AA93');
    if (o.worktop) out += bx(c, 0, bt, Dt, tw, wtHex, { stroke: shade(wtHex, -35), sw: 0.7 });
    if (g.wall) {
      const wd = Math.min(350, Math.round(D * 0.55));
      out += bx(c, Dt - wd, g.wallB, Dt, g.wallT, BAY_BACK, { stroke: BAY_INK, sw: 1.2 }) + bx(c, Dt - wd, g.wallB, Dt - wd + 18, g.wallT, f.hex) + bx(c, Dt - wd + 18, (g.wallB + g.wallT) / 2, Dt, (g.wallB + g.wallT) / 2 + 18, '#B8AA93');
      out += `<line x1="${f1(c.X(Dt - wd))}" y1="${f1(c.Y(g.wallT) - 6)}" x2="${f1(c.X(Dt))}" y2="${f1(c.Y(g.wallT) - 6)}" stroke="${BAY_DIM}" stroke-width="0.7"/>` + txt(c.X(Dt - wd / 2), c.Y(g.wallT) - 8, mFmt(wd).replace(' m', ''), { size: 7.5, fill: BAY_INK });
    }
  } else if (cat === 'tv') {
    const gap = g.gap, bt = gap + g.baseH, bb = rep(['tv_niche', 'base_doors', 'base_drawers']), f = fOf(bb);
    if (bays.some((b) => b.kind === 'tall_doors')) out += `<rect x="${f1(c.X(0))}" y="${f1(c.Y(g.Hd))}" width="${f1(D * scale)}" height="${f1((g.Hd - gap) * scale)}" fill="none" stroke="${BAY_DIM}" stroke-width="0.8" stroke-dasharray="4 3"/>` + txt(c.X(D / 2), c.Y(g.Hd) + 10, 'tower', { size: 7, fill: BAY_DIM });
    out += bx(c, 0, gap, D, bt, BAY_BACK, { stroke: BAY_INK, sw: 1.2 }) + bx(c, 0, gap, 18, bt, f.hex) + bx(c, 18, gap + (bt - gap) / 2, D, gap + (bt - gap) / 2 + 18, '#B8AA93');
    if (bays.some((b) => b.led) && gap > 0) out += bx(c, 10, gap - 60, D - 10, gap, '#FFC857', { op: 0.5 });
    const tn = bays.find((b) => b.kind === 'tv_niche');
    if (tn) { const t = tvBox(o, tn.w, 0, bt, g.Hd); out += bx(c, D - 18, bt, D, g.Hd, fin.B.hex, { stroke: BAY_INK, sw: 0.7 }) + bx(c, D - 78, t.ty0, D - 18, t.ty1, '#16171A', { rx: 1 }) + bx(c, D - 18, (t.ty0 + t.ty1) / 2 - 20, D, (t.ty0 + t.ty1) / 2 + 20, STEEL_D); }
    if (bays.some((b) => ri(b.shelves) > 0 && (b.kind === 'base_doors' || b.kind === 'base_drawers'))) out += bx(c, D * 0.2, bt + 600, D, bt + 622, f.hex, { stroke: shade(f.hex, -28), sw: 0.6 });
  } else {
    const bb = rep(['sink', 'base_drawers', 'base_doors']), f = fOf(bb), cHex = (fin[o.counter_finish] || fin.A).hex, ct = g.ct, top = ct + g.cth;
    if (g.floor) out += bx(c, 80, 0, Dt, g.bodyB, fin.C.hex);
    out += bx(c, 20, g.bodyB, Dt, ct, BAY_BACK, { stroke: BAY_INK, sw: 1.2 }) + bx(c, 20, g.bodyB, 38, ct, f.hex) + bx(c, 38, (g.bodyB + ct) / 2, Dt, (g.bodyB + ct) / 2 + 16, '#B8AA93');
    out += bx(c, 0, ct, Dt, top, cHex, { stroke: shade(cHex, -30), sw: 0.7 });
    if (o.basin) {
      const cxm = 20 + D * 0.45;
      if (o.basin_type === 'undermount') out += bx(c, cxm - 190, top - 140, cxm + 190, top, '#F7F7F5', { stroke: '#B8B5AD', sw: 0.8 });
      else out += `<path d="M ${f1(c.X(cxm - 200))} ${f1(c.Y(top))} A ${f1(200 * scale)} ${f1(120 * scale)} 0 0 1 ${f1(c.X(cxm + 200))} ${f1(c.Y(top))} Z" fill="#F7F7F5" stroke="#B8B5AD" stroke-width="0.9"/>`;
      out += bx(c, Dt - 60, top, Dt - 38, top + (o.basin_type === 'undermount' ? 200 : 300), STEEL, { stroke: STEEL_D, sw: 0.5 }) + bx(c, cxm + 20, top + (o.basin_type === 'undermount' ? 190 : 290), Dt - 38, top + (o.basin_type === 'undermount' ? 206 : 306), STEEL, { stroke: STEEL_D, sw: 0.5 });
    }
    if (g.mir) {
      const cab = bays.some((b) => b.kind === 'mirror' || b.upper === 'mirror_cab');
      out += cab ? bx(c, Dt - 130, g.mb, Dt, g.mt, BAY_BACK, { stroke: BAY_INK, sw: 1.2 }) + bx(c, Dt - 130, g.mb, Dt - 112, g.mt, MIRROR_C, { stroke: '#9FB0B7', sw: 0.6 }) : bx(c, Dt - 18, g.mb, Dt, g.mt, MIRROR_C, { stroke: '#9FB0B7', sw: 0.7 });
    }
  }
  out += dimV(c, c.X(Dt + 25) + 12, 0, g.Hd, mFmt(g.Hd));
  out += `<line x1="${f1(c.X(0))}" y1="14" x2="${f1(c.X(Dt))}" y2="14" stroke="${BAY_DIM}" stroke-width="0.8"/>` + txt(c.X(Dt / 2), 11, mFmt(D), { size: 10, bold: true, fill: BAY_INK });
  const vbW = L + (Dt + 25) * scale + R, vbH = T + g.Hd * scale + B;
  return { svg: svgWrap(out, vbW, vbH, defs), w: vbW, h: vbH, vbW, vbH };
}

// TOP VIEW (plan): outline W×D, bay partitions, door swing arcs / sliding tracks, depth dim.
export function baysPlanSVG(s, opt = {}) {
  if (!hasBays(s)) return unitPlanSVG(s, opt);
  const cat0 = unitCat(s, opt.cat);
  if (CAT_ENGINE.includes(cat0)) { try { const r = catPlan(s, cat0, opt); if (r && r.svg) return r; } catch (e) { /* fall back to the generic plan */ } }
  const fin = finishesOf(s, cat0); const bays = bayList(s);
  const W = bays.reduce((a, b) => a + b.w, 0), D = Math.max(100, nn(s.depth_mm) || 600);
  const sliding = !!s.sliding || s.door === 'sliding';
  const swMm = sliding ? 0 : Math.min(600, Math.max(0, ...bays.map((b) => (ri(b.leaves) ? b.w / ri(b.leaves) : 0))));
  const maxW = opt.maxW || 520, maxH = opt.maxH || 200, L = 14, T = 24, R = 34, B = 22;
  const scale = Math.min((maxW - L - R) / W, (maxH - T - B) / (D + swMm * 0.9));
  const w = W * scale, d = D * scale; let out = '', x = L;
  out += `<rect x="${L}" y="${T}" width="${w.toFixed(1)}" height="${d.toFixed(1)}" fill="${BAY_BACK}" stroke="${BAY_INK}" stroke-width="1.6"/>`;
  out += `<line x1="${L}" y1="${T}" x2="${(L + w).toFixed(1)}" y2="${T}" stroke="${BAY_INK}" stroke-width="3"/>`;
  bays.forEach((b, i) => {
    const bw = b.w * scale, f = bayFin(b, fin), lv = ri(b.leaves);
    out += `<rect x="${x.toFixed(1)}" y="${(T + d - 3).toFixed(1)}" width="${bw.toFixed(1)}" height="3" fill="${lv ? f.hex : '#00000000'}"/>`;
    if (i > 0) out += `<line x1="${x.toFixed(1)}" y1="${T}" x2="${x.toFixed(1)}" y2="${(T + d).toFixed(1)}" stroke="${BAY_INK}" stroke-width="1"/>`;
    out += txt(x + bw / 2, T + d / 2 + 3, String(i + 1), { size: 9, fill: '#b9a98f', bold: true });
    if (lv > 0 && sliding) {
      out += `<line x1="${x.toFixed(1)}" y1="${(T + d - 2).toFixed(1)}" x2="${(x + bw).toFixed(1)}" y2="${(T + d - 2).toFixed(1)}" stroke="${f.hex}" stroke-width="2"/><line x1="${x.toFixed(1)}" y1="${(T + d - 6).toFixed(1)}" x2="${(x + bw * 0.6).toFixed(1)}" y2="${(T + d - 6).toFixed(1)}" stroke="${f.hex}" stroke-width="2" opacity="0.6"/>`;
    } else if (lv > 0) {
      const lw = bw / lv;
      for (let k = 0; k < lv; k++) {
        const sx = x + k * lw, left = (lv === 1) ? true : (k % 2 === 0), hinge = left ? sx : sx + lw, dir = left ? 1 : -1, r = Math.min(lw, 600 * scale);
        const ey = T + d + r, ex = hinge + dir * r;
        out += `<path d="M ${hinge.toFixed(1)} ${(T + d).toFixed(1)} L ${hinge.toFixed(1)} ${ey.toFixed(1)} A ${r.toFixed(1)} ${r.toFixed(1)} 0 0 ${dir > 0 ? 0 : 1} ${ex.toFixed(1)} ${(T + d).toFixed(1)} Z" fill="${f.hex}" fill-opacity="0.22" stroke="${shade(f.hex, -25)}" stroke-width="0.8"/>`;
      }
    }
    x += bw;
  });
  const rx = L + w + 12, vbH = T + d + swMm * 0.9 * scale + B;
  out += `<line x1="${rx}" y1="${T}" x2="${rx}" y2="${(T + d).toFixed(1)}" stroke="${BAY_DIM}" stroke-width="0.8"/><line x1="${rx - 4}" y1="${T}" x2="${rx + 4}" y2="${T}" stroke="${BAY_DIM}"/><line x1="${rx - 4}" y1="${(T + d).toFixed(1)}" x2="${rx + 4}" y2="${(T + d).toFixed(1)}" stroke="${BAY_DIM}"/>`;
  out += txt(rx + 4, T + d / 2, mFmt(D), { size: 10, bold: true, fill: BAY_INK, rot: -90 });
  out += `<line x1="${L}" y1="14" x2="${(L + w).toFixed(1)}" y2="14" stroke="${BAY_DIM}" stroke-width="0.8"/>` + txt(L + w / 2, 11, mFmt(W), { size: 10, bold: true, fill: BAY_INK });
  const vbW = L + w + R;
  return { svg: svgWrap(out, vbW, vbH, ''), w: vbW, h: vbH, vbW, vbH };
}

// SIDE SECTION: carcass outline, top shelf, rail + clothes, shelves, drawers, plinth.
export function baysSideSVG(s, opt = {}) {
  if (!hasBays(s)) return sideSVG(s, opt);
  const cat0 = unitCat(s, opt.cat);
  if (CAT_ENGINE.includes(cat0)) { try { const r = catSide(s, cat0, opt); if (r && r.svg) return r; } catch (e) { /* fall back to the generic section */ } }
  const fin = finishesOf(s, cat0); const bays = bayList(s);
  const rep = bays.reduce((a, b) => ((ri(b.rails) + ri(b.shelves) + ri(b.drawers)) > (ri(a.rails) + ri(a.shelves) + ri(a.drawers)) ? b : a), bays[0]);
  const D = Math.max(100, nn(s.depth_mm) || 600), H = Math.max(300, nn(s.height_mm) || 2400);
  const maxW = opt.maxW || 220, maxH = opt.maxH || 320, L = 12, T = 22, R = 34, B = 16;
  const scale = Math.min((maxW - L - R) / D, (maxH - T - B) / H);
  const w = D * scale, h = H * scale, ph = Math.max(3, 70 * scale), uid = 'bu' + (++_bayUid);
  let out = `<rect x="${L}" y="${T}" width="${w.toFixed(1)}" height="${h.toFixed(1)}" fill="${BAY_BACK}" stroke="${BAY_INK}" stroke-width="1.6"/>`;
  out += `<rect x="${L}" y="${T}" width="${w.toFixed(1)}" height="3.5" fill="${BAY_INK}"/>`;                     // top
  out += `<rect x="${L + w - 2.5}" y="${T}" width="2.5" height="${h.toFixed(1)}" fill="#C9BBA6"/>`;              // back panel
  out += `<rect x="${L}" y="${T + h - ph}" width="${w.toFixed(1)}" height="${ph.toFixed(1)}" fill="${fin.C.hex}"/>`; // plinth
  const inner = bayInteriorSVG({ ...rep, led: false }, L + 3, T + 3.5, w - 6, h - ph - 3.5, scale, fin, uid)
    .replace(/<rect x="[\d.]+" y="[\d.]+" width="[\d.]+" height="[\d.]+" fill="#F6F1E7"\/>/, '');
  // side section: clothes appear as one dense mass; re-draw rail as a circle end-on
  out += inner.replace(/<path [^>]*\/>/g, '').replace(/<line [^>]*stroke="#8A8A8E"[^>]*\/>/g, '');
  const tiers = ri(rep.rails) > 0 ? Math.max(1, Math.min(3, rep.hang_double ? Math.max(2, ri(rep.rails)) : ri(rep.rails))) : 0;
  if (tiers) {
    const dMm = ri(rep.drawers) > 0 ? Math.min((h - ph) * 0.4, ri(rep.drawers) * 180 * scale) : 0, area = h - ph - dMm - 6, zone = ri(rep.shelves) > 0 ? area * 0.58 : area;
    for (let t = 0; t < tiers; t++) {
      const th = zone / tiers, ry = T + 3 + t * th + Math.min(10, th * 0.08) + 3;
      out += `<rect x="${(L + w / 2 - 12 * scale * 3).toFixed(1)}" y="${(ry + 1).toFixed(1)}" width="${(24 * scale * 3).toFixed(1)}" height="${Math.min(th * 0.8, (tiers > 1 ? 900 : 1300) * scale).toFixed(1)}" rx="2" fill="#B7A793" opacity="0.8"/><circle cx="${(L + w / 2).toFixed(1)}" cy="${ry.toFixed(1)}" r="2.6" fill="#8A8A8E"/>`;
    }
  }
  out += `<line x1="${L + 1}" y1="${T}" x2="${L + 1}" y2="${(T + h).toFixed(1)}" stroke="${BAY_INK}" stroke-width="1" stroke-dasharray="3 2"/>`;
  const rx = L + w + 12, by = T + h + 12;
  out += `<line x1="${rx}" y1="${T}" x2="${rx}" y2="${(T + h).toFixed(1)}" stroke="${BAY_DIM}" stroke-width="0.8"/><line x1="${rx - 4}" y1="${T}" x2="${rx + 4}" y2="${T}" stroke="${BAY_DIM}"/><line x1="${rx - 4}" y1="${(T + h).toFixed(1)}" x2="${rx + 4}" y2="${(T + h).toFixed(1)}" stroke="${BAY_DIM}"/>`;
  out += txt(rx + 4, T + h / 2, mFmt(H), { size: 10, bold: true, fill: BAY_INK, rot: -90 });
  out += `<line x1="${L}" y1="14" x2="${(L + w).toFixed(1)}" y2="14" stroke="${BAY_DIM}" stroke-width="0.8"/>` + txt(L + w / 2, 11, mFmt(D), { size: 10, bold: true, fill: BAY_INK });
  const vbW = L + w + R, vbH = T + h + B;
  return { svg: svgWrap(out, vbW, vbH, ''), w: vbW, h: vbH, vbW, vbH };
}

// ── ONE-PAGE DESIGN SHEET (bilingual EN / AR) for a bay-designed unit ──
export function designSheetBaysHTML(s, pts, opt = {}) {
  if (!s) return '';
  const cat = unitCat(s, opt.cat), cfg = catConfig(cat), o = optsOf(s, cat);
  const fin = finishesOf(s, cat); const bays = bayList(s);
  const W = bays.reduce((a, b) => a + b.w, 0) || ri(s.width_mm), H = ri(s.height_mm), D = ri(s.depth_mm);
  const meta = opt.meta || {};
  const dopt = (extra) => ({ ...extra, cat });
  const T_ = {
    internal: cat === 'door' ? ['LEAF CONSTRUCTION', 'تفاصيل بناء الضلفة'] : ['INTERNAL LAYOUT', 'التوزيع الداخلي'],
    plan: cat === 'door' ? ['PLAN (SWING)', 'المسقط الأفقي'] : ['TOP VIEW (PLAN)', 'المنظر العلوي'],
    side: cat === 'door' ? ['JAMB SECTION', 'مقطع الإطار'] : ['SIDE VIEW (SECTION)', 'المقطع الجانبي'],
  };
  const AR = `font-family:Tahoma,'Segoe UI',Arial,sans-serif`;
  const bar = (en, ar) => `<div style="background:#4A3426;color:#ffffff;display:flex;justify-content:space-between;align-items:center;gap:8px;padding:5px 10px;font-size:10.5px;font-weight:700;letter-spacing:.05em"><span>${en}</span><span dir="rtl" style="${AR};font-size:11.5px;letter-spacing:0">${ar}</span></div>`;
  const panel = (en, ar, body, extra = '') => `<div style="break-inside:avoid;page-break-inside:avoid;border:1px solid #D9CDB8;background:#FBF8F1;margin:0 0 10px;${extra}">${bar(en, ar)}<div style="padding:8px;display:flex;justify-content:center;align-items:center">${body}</div></div>`;
  const hero = opt.aiRenderUrl
    ? `<img src="${escHtml(opt.aiRenderUrl)}" alt="Render" style="width:100%;max-height:340px;object-fit:contain;background:#EFE8DA;display:block" onerror="this.style.display='none'"/>`
    : opt.real3dUrl
      ? `<img src="${escHtml(opt.real3dUrl)}" alt="3D view" style="width:100%;max-height:340px;object-fit:contain;display:block;background:#F6F1E7" onerror="this.style.display='none'"/>`
      : `<div style="padding:10px;display:flex;justify-content:center;background:#F6F1E7">${baysFrontSVG(s, dopt({ maxW: 760, maxH: 300 })).svg}</div>`;
  const heroTag = opt.aiRenderUrl ? 'AI-enhanced render · matches this configuration / صورة محسّنة بالذكاء الاصطناعي'
    : opt.real3dUrl ? '3D model view / عرض ثلاثي الأبعاد' : '';
  const front = baysFrontSVG(s, dopt({ maxW: 560, maxH: 300 })).svg;
  const inter = baysInternalSVG(s, dopt({ maxW: 560, maxH: 300 })).svg;
  const plan = baysPlanSVG(s, dopt({ maxW: 560, maxH: 200 })).svg;
  const side = baysSideSVG(s, dopt({ maxW: 230, maxH: 320 })).svg;
  const sw = (hex) => `background:${hex};background-image:linear-gradient(135deg,${shade(hex, 10)},${shade(hex, -12)});-webkit-print-color-adjust:exact;print-color-adjust:exact`;
  const mats = ['A', 'B', 'C'].map((k) => `<div style="display:flex;gap:8px;align-items:flex-start;margin-bottom:7px"><div style="width:34px;height:34px;flex-shrink:0;border:1px solid #00000033;${sw(fin[k].hex)}"></div><div style="min-width:0"><div style="font-size:11px;font-weight:700;color:#3b2a1d">${escHtml(k)} · ${escHtml(fin[k].name)}</div>${fin[k].desc ? `<div style="font-size:9.5px;color:#6b5b4b;line-height:1.35">${escHtml(fin[k].desc)}</div>` : ''}</div></div>`).join('');
  const tot = (k) => bays.reduce((a, b) => a + ri(b[k]), 0);
  const HND = { bar: 'Long bar', edge: 'Edge pull', knob: 'Knob', lever: 'Lever', none: 'Push-open' };
  const handles = [...new Set(bays.filter((b) => b.kind !== 'sliding_leaf' || b.handle !== 'none').map((b) => HND[b.handle] || 'Long bar'))].join(', ');
  const cnt = (fn) => bays.filter(fn).length;
  const isBase = (b) => ['base_doors', 'base_drawers', 'sink', 'hob', 'open_niche'].includes(b.kind);
  const modLabel = cat === 'door' ? ['Leaves', 'الضلف'] : cat === 'closet' || cat === 'storage' ? ['Bays', 'الأقسام'] : ['Modules', 'الوحدات'];
  const common = [
    ['Width', 'العرض', `${mFmt(W)} (${W} mm)`], ['Height', 'الارتفاع', `${mFmt(H)} (${H} mm)`], ['Depth', 'العمق', `${mFmt(D)} (${D} mm)`],
    [modLabel[0], modLabel[1], String(bays.length)],
  ];
  const counts = [
    ...(tot('leaves') && cat !== 'door' ? [['Door leaves', 'ضلف الأبواب', String(tot('leaves') + bays.reduce((a, b) => a + upperLeaves(b), 0))]] : []),
    ...(tot('drawers') ? [['Drawers', 'الأدراج', String(tot('drawers'))]] : []),
    ...(tot('shelves') ? [['Shelves', 'الرفوف', String(tot('shelves'))]] : []),
  ];
  const hasFronts = bays.some((b) => ri(b.leaves) > 0 || ri(b.drawers) > 0);
  const hnd = (cat === 'closet' && !hasFronts) ? [] : [['Handles / hardware', 'المقابض والاكسسوارات', handles || 'Push-open']];
  const led = bays.some((b) => b.led) ? [['LED lighting', 'إضاءة LED', 'Yes']] : [];
  const hangN = bays.filter((b) => ri(b.rails) > 0).length;
  const hang = hangN ? [['Hanging compartments', 'أقسام التعليق', String(hangN)]] : [];
  const doorTypeRow = (cat === 'closet' || cat === 'storage' || cat === 'custom') && bays.some((b) => ri(b.leaves) > 0)
    ? [['Door type', 'نوع الأبواب', s.sliding ? 'Sliding' : 'Hinged']] : [];
  const mirrorRow = (s.mirror && (cat === 'closet' || cat === 'storage' || cat === 'custom')) ? [['Mirror', 'مرآة', 'Yes']] : [];
  const finRow = [['Finishes', 'التشطيبات', [...new Set(['A', 'B', 'C'].map((k) => fin[k].name))].join(', ')]];
  const sku = String(opt.sku != null ? opt.sku : (s.sku || '')).trim();
  const prodName = String(s.name || opt.catLabel || '').trim();
  const idRows = [...(prodName ? [['Product', 'المنتج', prodName]] : []), ...(sku ? [['SKU', 'رمز المنتج', sku]] : [])];
  let specRowsArr;
  if (cat === 'kitchen') {
    const walls = cnt((b) => b.kind === 'wall_doors' || (UPPER_KINDS.includes(b.kind) && (b.upper === 'doors' || b.upper === 'open')));
    const tall = bays.filter((b) => b.kind === 'appliance_tall');
    specRowsArr = [...common,
      ['Base units', 'الوحدات السفلية', String(cnt(isBase))], ['Wall units', 'الوحدات العلوية', String(walls)],
      ...(tall.length ? [['Tall housings', 'الأعمدة الطويلة', `${tall.length} (${tall.map((b) => (b.appliance === 'fridge' ? 'fridge' : 'oven')).join(', ')})`]] : []),
      ...(cnt((b) => b.kind === 'sink') ? [['Sink', 'الحوض', String(cnt((b) => b.kind === 'sink'))]] : []),
      ...(cnt((b) => b.kind === 'hob') || bays.some((b) => b.upper === 'hood') ? [['Hob / hood', 'الموقد / الشفاط', `${cnt((b) => b.kind === 'hob')} / ${cnt((b) => b.upper === 'hood')}`]] : []),
      ...counts,
      ['Worktop', 'سطح العمل', o.worktop ? `${o.worktop_mat || 'Worktop'} · ${(fin[o.worktop_finish] || fin.C).name}` : 'None'],
      ...(o.worktop && o.edge ? [['Edge', 'حافة السطح', o.edge]] : []), ...hnd, ...led];
  } else if (cat === 'tv') {
    const tv = ri(o.tvWidth_mm);
    specRowsArr = [...common,
      ...(cnt((b) => b.kind === 'tv_niche') ? [['TV niche', 'فتحة التلفاز', `${tv} mm (≈ ${Math.round(tv / 22.14)}″)`]] : []),
      ['Mounting', 'التركيب', o.mount === 'floor' ? 'On the floor' : 'Floating, 150 mm above floor'],
      ...(cnt((b) => b.kind === 'tall_doors') ? [['Tall towers', 'الأعمدة الطويلة', String(cnt((b) => b.kind === 'tall_doors'))]] : []),
      ...(cnt((b) => b.kind === 'open_niche') ? [['Open niches', 'فتحات مفتوحة', String(cnt((b) => b.kind === 'open_niche'))]] : []),
      ...counts, ...hnd, ...led];
  } else if (cat === 'vanity') {
    const mir = cnt((b) => b.upper === 'mirror') , cab = cnt((b) => b.upper === 'mirror_cab' || b.kind === 'mirror');
    specRowsArr = [...common,
      ['Basin', 'الحوض', o.basin ? (o.basin_type === 'undermount' ? 'Undermount' : 'Vessel (on counter)') : 'None'],
      ['Mirror', 'المرآة', mir || cab ? [mir ? `Mirror ×${mir}` : '', cab ? `Mirror cabinet ×${cab}` : ''].filter(Boolean).join(', ') : 'None'],
      ['Counter', 'سطح الحوض', o.counter_mat || 'Solid surface'],
      ['Mounting', 'التركيب', o.mount === 'floor' ? 'Floor-standing' : 'Wall-hung'],
      ...counts, ...hnd, ...led];
  } else if (cat === 'door') {
    const styles = [...new Set(bays.map((b) => ({ flush_door: 'Flush', panel_door: 'Panelled', glass_door: 'Glazed', sliding_leaf: 'Sliding' }[b.kind] || 'Flush')))].join(', ');
    const swings = [...new Set(bays.map((b) => (b.kind === 'sliding_leaf' || b.swing === 'sliding' ? 'Sliding' : b.swing === 'right' ? 'Hinged right' : 'Hinged left')))].join(', ');
    specRowsArr = [...common.slice(0, 3), [modLabel[0], modLabel[1], String(bays.length)],
      ['Panel style', 'شكل الباب', styles], ['Swing', 'اتجاه الفتح', swings],
      ['Frame', 'الحلق (الإطار)', o.frame ? `${(fin[o.frame_finish] || fin.B).name} + architrave` : 'None'],
      ['Thickness', 'سماكة الضلفة', `${ri(o.door_thk) || 40} mm`], ...hnd];
  } else if (cat === 'storage' || cat === 'custom') {
    specRowsArr = [...common, ...(cnt((b) => b.kind === 'glass_doors') ? [['Glass doors', 'أبواب زجاجية', String(cnt((b) => b.kind === 'glass_doors'))]] : []), ...counts, ...(tot('rails') ? [['Hanging rails', 'قضبان التعليق', String(tot('rails'))]] : []), ...hnd, ...led];
  } else {
    specRowsArr = [...common, ...counts, ...(tot('rails') ? [['Hanging rails', 'قضبان التعليق', String(tot('rails'))]] : []), ...hnd, ...led];
  }
  specRowsArr = [...idRows, ...specRowsArr, ...hang, ...doorTypeRow, ...mirrorRow, ...finRow];
  const specs = `<table style="width:100%;border-collapse:collapse;font-size:11px">${specRowsArr.map(([en, ar, v]) => `<tr><td style="padding:4px 2px;border-bottom:1px solid #E6DCC9;color:#6b5b4b">${en} <span dir="rtl" style="${AR};color:#9a8a76">/ ${ar}</span></td><td style="padding:4px 2px;border-bottom:1px solid #E6DCC9;font-weight:700;color:#3b2a1d;text-align:right;${String(v).length > 24 ? '' : 'white-space:nowrap'}">${escHtml(v)}</td></tr>`).join('')}</table>`;
  const pal = `<div style="display:flex;gap:10px;justify-content:space-around;width:100%">${['A', 'B', 'C'].map((k) => `<div style="text-align:center;flex:1"><div style="width:42px;height:42px;border-radius:50%;margin:0 auto 4px;border:1px solid #00000033;${sw(fin[k].hex)}"></div><div style="font-size:10px;font-weight:700;color:#3b2a1d">${escHtml(fin[k].name)}</div><div style="font-size:9px;color:#8a7a66">${escHtml(fin[k].hex.toUpperCase())}</div></div>`).join('')}</div>`;
  const metaBits = [meta.customer && `Client: ${meta.customer}`, meta.designer && `Designer: ${meta.designer}`, meta.quoteNo && `Ref: ${meta.quoteNo}`, meta.date].filter(Boolean).map(escHtml).join(' · ');
  const note = opt.desc || s.spec || '';
  return `<div class="avoid design-sheet" style="break-inside:avoid;page-break-inside:avoid;background:#F6F1E7;border:1px solid #D9CDB8;padding:14px 16px;margin:0 0 16px;font-family:Arial,'Segoe UI',Tahoma,sans-serif;color:#3b2a1d;-webkit-print-color-adjust:exact;print-color-adjust:exact">
    <div style="display:flex;justify-content:space-between;align-items:baseline;gap:10px;flex-wrap:wrap;border-bottom:3px solid #4A3426;padding-bottom:7px;margin-bottom:10px">
      <div style="font-size:17px;font-weight:800;color:#4A3426">${escHtml(s.name || opt.catLabel || cfg.label)}<span style="font-size:10.5px;font-weight:700;color:#6b5b4b;letter-spacing:.05em;margin-left:10px;text-transform:uppercase">${escHtml(opt.catLabel || cfg.label)} <span dir="rtl" style="${AR};text-transform:none;letter-spacing:0">/ ${cfg.ar}</span></span>${sku ? `<span style="font-size:10px;font-weight:700;color:#4A3426;border:1px solid #4A3426;padding:1px 7px;margin-left:10px;letter-spacing:.04em">SKU ${escHtml(sku)} <span dir="rtl" style="${AR}">/ رمز المنتج</span></span>` : ''}</div>
      <div style="font-size:10.5px;color:#6b5b4b;text-align:right"><b style="letter-spacing:.06em">DESIGN SHEET</b> <span dir="rtl" style="${AR}">/ ورقة التصميم</span>${metaBits ? `<div style="margin-top:2px">${metaBits}</div>` : ''}</div>
    </div>
    <div style="position:relative;border:1px solid #D9CDB8;margin:0 0 10px;background:#EFE8DA;overflow:hidden">${hero}
      <div style="position:absolute;left:8px;bottom:8px;background:rgba(74,52,38,.88);color:#fff;font-size:11px;font-weight:700;padding:3px 9px">${mFmt(W)} × ${mFmt(H)}</div>
      ${heroTag ? `<div dir="ltr" style="position:absolute;right:8px;bottom:8px;background:rgba(255,255,255,.82);color:#4A3426;font-size:9px;font-weight:700;padding:2px 7px;${AR}">${escHtml(heroTag)}</div>` : ''}
    </div>
    <div style="display:flex;gap:12px;align-items:flex-start;flex-wrap:wrap">
      <div style="flex:1.6 1 380px;min-width:300px">
        ${panel('FRONT VIEW (ELEVATION)', 'الواجهة الأمامية', front)}
        ${panel(T_.internal[0], T_.internal[1], inter)}
        ${panel(T_.plan[0], T_.plan[1], plan)}
      </div>
      <div style="flex:1 1 230px;min-width:210px">
        ${panel('MATERIALS &amp; FINISHES', 'المواد والتشطيبات', `<div style="width:100%">${mats}</div>`)}
        ${panel('SPECIFICATIONS', 'المواصفات', `<div style="width:100%">${specs}</div>`)}
        ${panel('COLOUR PALETTE', 'لوحة الألوان', pal)}
        ${panel(T_.side[0], T_.side[1], side)}
      </div>
    </div>
    ${note ? `<div style="font-size:10.5px;color:#4b3b2d;line-height:1.5;margin-top:4px">${escHtml(note)}</div>` : ''}
    <div style="font-size:9px;color:#8a7a66;margin-top:8px">Indicative technical drawing — dimensions in metres; colours and hardware for illustration. <span dir="rtl" style="${AR}">رسم فني إرشادي — الأبعاد بالمتر.</span></div>
  </div>`;
}

// ── DESIGN SHEET (HTML block) — one full technical page for a single unit:
//    3D (parametric iso) + optional AI photoreal render, then front elevation,
//    top/plan and side views, all dimensioned, plus a spec table. Self-contained
//    HTML so it renders identically in the in-app preview, print and portal. ──
export function designSheetHTML(s, pts, opt = {}) {
  if (!s) return '';
  if (Array.isArray(s.bays) && s.bays.length) return designSheetBaysHTML(s, pts, opt); // bay-designed unit → bilingual one-page sheet
  // No modules entered yet → auto-seed them from the unit's own sizes/counts so EVERY
  // unit prints the new full design sheet (not just units where the designer was opened).
  try {
    const seeded = defaultBays(s, opt.cat);
    if (Array.isArray(seeded) && seeded.length) return designSheetBaysHTML({ ...s, bays: seeded }, pts, opt);
  } catch (e) { /* fall through to the classic sheet */ }
  const catLabel = opt.catLabel || (s.name) || 'Unit';
  const W = ri(s.width_mm), H = ri(s.height_mm), D = ri(s.depth_mm);
  // Real 3D snapshot — an actual JPEG frame captured from the Cabinets3D WebGL
  // engine (see QuoteBuilderPlus.captureUnit3DSnapshots). This is the true "3D
  // view" now; when present it replaces the flat isoSceneSVG schematic below.
  const real3d = opt.real3dUrl ? `<img src="${escHtml(opt.real3dUrl)}" alt="3D render" style="width:100%;max-width:380px;border:1px solid #e8ebf0;border-radius:12px;object-fit:contain;background:#fafbfd" onerror="this.style.display='none'"/>` : '';
  // 3D iso — "finished" mode turns a single wide run into a realistic cabinet row
  // (kitchens also get a wall-unit run + worktop + plinth + cornice). Shared with the
  // live Design panel so both look identical. Only used as a fallback for units that
  // have no real3dUrl (capture not run yet, or it failed for this unit).
  const iso = real3d ? '' : isoSceneSVG([{ ...s, _qty: 1 }], { maxW: 380, maxH: 300, finished: true }).svg;
  const front = elevationSVG(s, { maxW: 220, maxH: 300, showDims: true }).svg;
  const plan = unitPlanSVG(s, { maxW: 220, maxH: 180 }).svg;
  const side = sideSVG(s, { maxW: 180, maxH: 300 }).svg;
  const ai = opt.aiRenderUrl ? `<img src="${escHtml(opt.aiRenderUrl)}" alt="Photoreal render" style="width:100%;max-width:340px;border:1px solid #e8ebf0;border-radius:12px;object-fit:cover;background:#fafbfd" onerror="this.style.display='none'"/>` : '';
  const rows = (Array.isArray(opt.specRows) ? opt.specRows : [
    ['Size (W×H×D)', [W, H, D].filter(Boolean).join(' × ') + ' mm'],
    ['Doors', ri(s.doors) || '—'], ['Drawer fronts', ri(s.drawers) || '—'],
    ['Internal drawers', ri(s.drawers_int) || '—'], ['Shelves', ri(s.shelves) || '—'],
    ['Hanging rails', ri(s.rails) || '—'],
  ]).filter(r => r[1] != null && String(r[1]).trim() !== '');
  const specTable = `<table style="width:100%;border-collapse:collapse;font-size:11px">${rows.map(([k, v], i) => `<tr style="background:${i % 2 ? '#fafbfd' : '#fff'}"><td style="padding:5px 8px;color:#6b7280;border-bottom:1px solid #eef2f7;white-space:nowrap">${escHtml(k)}</td><td style="padding:5px 8px;color:#111;font-weight:700;text-align:right;border-bottom:1px solid #eef2f7">${escHtml(String(v))}</td></tr>`).join('')}</table>`;
  const view = (title, svg) => `<div style="flex:1;min-width:150px;text-align:center"><div style="font-size:9.5px;font-weight:800;letter-spacing:.05em;text-transform:uppercase;color:#9ca3af;margin-bottom:4px">${title}</div><div style="display:flex;justify-content:center">${svg}</div></div>`;
  return `<div class="avoid design-sheet" style="break-inside:avoid;page-break-inside:avoid;border:1px solid #eef0f4;border-radius:14px;padding:16px 18px;margin:0 0 16px;background:#fff">
    <div style="display:flex;justify-content:space-between;align-items:baseline;border-bottom:2px solid var(--color-brand);padding-bottom:8px;margin-bottom:12px">
      <div style="font-size:15px;font-weight:800;color:#0B1020">${escHtml(s.name || catLabel)}</div>
      <div style="font-size:11px;font-weight:700;color:#9ca3af;text-transform:uppercase;letter-spacing:.05em">${escHtml(catLabel)} · ${[W, H, D].filter(Boolean).join('×')} mm</div>
    </div>
    <div style="display:flex;flex-wrap:wrap;gap:16px;align-items:flex-start;margin-bottom:12px">
      ${opt.no3d ? '' : `<div style="flex:2;min-width:260px">
        <div style="font-size:9.5px;font-weight:800;letter-spacing:.05em;text-transform:uppercase;color:#9ca3af;margin-bottom:4px">3D view</div>
        <div style="display:flex;flex-wrap:wrap;gap:12px;align-items:flex-start">${real3d || iso}${ai}</div>
      </div>`}
      <div style="flex:1;min-width:200px"><div style="font-size:9.5px;font-weight:800;letter-spacing:.05em;text-transform:uppercase;color:#9ca3af;margin-bottom:4px">Specification</div>${specTable}</div>
      ${(opt.no3d && ai) ? `<div style="flex:1;min-width:200px"><div style="font-size:9.5px;font-weight:800;letter-spacing:.05em;text-transform:uppercase;color:#9ca3af;margin-bottom:4px">Photoreal render</div><div style="display:flex;justify-content:center">${ai}</div></div>` : ''}
    </div>
    <div style="display:flex;flex-wrap:wrap;gap:14px;align-items:flex-end;border-top:1px dashed #e5e7eb;padding-top:12px">
      ${view('Front elevation', front)}${view('Top / plan view', plan)}${view('Side view', side)}
    </div>
    ${opt.desc ? `<div style="font-size:10.5px;color:#4b5563;line-height:1.5;margin-top:10px">${escHtml(opt.desc)}</div>` : ''}
    <div style="font-size:9px;color:#9ca3af;margin-top:8px">Indicative technical drawing — dimensions in mm; colours &amp; hardware for illustration. 3D generated from the entered sizes.</div>
  </div>`;
}

export default ClosetPreview2D;
