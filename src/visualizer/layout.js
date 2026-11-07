/* =============================================================================
 * Room Visualizer — tile layouts [ROOM-VIZ 2026-11-07]
 * drawLayout(product, { w, h, maxPx, layout, grout:{mm,color}, rotation, product2, seed })
 *   -> { canvas, bump, pxPerM }   a texture of a w × h metre surface with the product laid out in the chosen pattern.
 * The layout is computed analytically over the whole surface (no repeat seams), so herringbone, chevron, diagonal,
 * hexagon and any rotation are exact. `bump` is a grey-scale height map (tiles white, joints black) for real grout depth.
 * ===========================================================================*/
import { tileImages, isContinuous, isPlank, rng, repeatSizeM, defaultGrout } from './materials';

export const LAYOUTS = [
  { id: 'straight', en: 'Straight', ar: 'مستقيم' },
  { id: 'brick', en: 'Brick ½', ar: 'طوبي ½' },
  { id: 'thirds', en: 'Offset ⅓', ar: 'إزاحة ⅓' },
  { id: 'random', en: 'Random', ar: 'عشوائي', plank: true },
  { id: 'vertical', en: 'Vertical stack', ar: 'عمودي' },
  { id: 'diagonal', en: 'Diagonal', ar: 'قطري' },
  { id: 'herringbone', en: 'Herringbone', ar: 'متعرّج' },
  { id: 'chevron', en: 'Chevron', ar: 'شيفرون' },
  { id: 'basketweave', en: 'Basket weave', ar: 'نسيج السلة' },
  { id: 'checker', en: 'Checkerboard', ar: 'شطرنجي' },
  { id: 'hexagon', en: 'Hexagon', ar: 'سداسي' },
];
export const layoutName = (id, ar) => { const l = LAYOUTS.find((x) => x.id === id); return l ? (ar ? l.ar : l.en) : id; };

const mk = (w, h) => { const c = document.createElement('canvas'); c.width = Math.max(2, Math.round(w)); c.height = Math.max(2, Math.round(h)); return c; };

export async function drawLayout(p, opt = {}) {
  const w = Math.max(0.05, opt.w || 1), h = Math.max(0.05, opt.h || 1);
  const maxPx = opt.maxPx || 2048;
  const pxPerM = Math.min(maxPx / Math.max(w, h), 1400);
  const W = Math.round(w * pxPerM), H = Math.round(h * pxPerM);
  const c = mk(W, H), b = mk(W, H); const g = c.getContext('2d'), gb = b.getContext('2d');
  const layout = opt.layout || p.default_layout || 'straight';
  const grout = opt.grout || defaultGrout(p);
  const R = rng((opt.seed || 1) * 97 + (p.id || '').length * 13);

  if (isContinuous(p)) {
    const [im] = await tileImages(p, 1024, 1);
    const [rw, rh] = repeatSizeM(p);
    if (im) {
      const pw = rw * pxPerM, ph = rh * pxPerM;
      g.save(); g.translate(W / 2, H / 2); g.rotate(((opt.rotation || 0) * Math.PI) / 180);
      const span = Math.hypot(W, H) / 2 + Math.max(pw, ph);
      for (let y = -span; y < span; y += ph) for (let x = -span; x < span; x += pw) g.drawImage(im, x, y, pw + 0.5, ph + 0.5);
      g.restore();
    } else { g.fillStyle = p.hex || '#cccccc'; g.fillRect(0, 0, W, H); }
    gb.fillStyle = '#ffffff'; gb.fillRect(0, 0, W, H);
    return { canvas: c, bump: b, pxPerM };
  }

  // tile size in px (long side along x for planks / subway)
  let tw = (p.tile_w_mm / 1000) * pxPerM, th = (p.tile_h_mm / 1000) * pxPerM;
  const gpx = Math.max(isPlank(p) ? 1.4 : 1.1, (grout.mm / 1000) * pxPerM);
  const tilePx = Math.min(1024, Math.max(32, Math.max(tw, th) * 1.25));
  const vars = await tileImages(p, tilePx, 4);
  const vars2 = opt.product2 ? await tileImages(opt.product2, tilePx, 4) : null;

  g.fillStyle = grout.color || '#cccccc'; g.fillRect(0, 0, W, H);
  gb.fillStyle = '#000000'; gb.fillRect(0, 0, W, H);

  const pick = (alt) => { const set = alt && vars2 && vars2.length ? vars2 : vars; return set[Math.floor(R() * set.length)] || set[0]; };
  const jitter = () => (isPlank(p) ? (R() - 0.5) * 0.16 : p.kind === 'tile' ? (R() - 0.5) * 0.06 : (R() - 0.5) * 0.03);

  /** draw one rectangular piece centred at (cx,cy) in the rotated frame, long side along `ang` */
  const piece = (cx, cy, pw, ph, ang, alt, rot90) => {
    const im = pick(alt); const sw = pw - gpx, sh = ph - gpx; if (sw <= 0 || sh <= 0) return;
    g.save(); g.translate(cx, cy); g.rotate(ang);
    if (R() < 0.5 && !rot90) g.rotate(Math.PI);
    if (rot90) { g.rotate(Math.PI / 2); g.drawImage(im, -sh / 2, -sw / 2, sh, sw); } else g.drawImage(im, -sw / 2, -sh / 2, sw, sh);
    const j = jitter(); if (j) { g.fillStyle = j > 0 ? `rgba(255,255,255,${j})` : `rgba(0,0,0,${-j})`; g.fillRect(-sw / 2, -sh / 2, sw, sh); }
    g.restore();
    gb.save(); gb.translate(cx, cy); gb.rotate(ang); gb.fillStyle = '#ffffff'; gb.fillRect(-sw / 2, -sh / 2, sw, sh); gb.restore();
  };
  /** draw a polygon piece (chevron / hexagon): image laid along `ang`, clipped to pts */
  const poly = (pts, cx, cy, iw, ih, ang, alt) => {
    const im = pick(alt);
    const path = (ctx) => { ctx.beginPath(); pts.forEach(([x, y], i) => ctx[i ? 'lineTo' : 'moveTo'](x, y)); ctx.closePath(); };
    g.save(); path(g); g.clip(); g.translate(cx, cy); g.rotate(ang); g.drawImage(im, -iw / 2, -ih / 2, iw, ih);
    const j = jitter(); if (j) { g.fillStyle = j > 0 ? `rgba(255,255,255,${j})` : `rgba(0,0,0,${-j})`; g.fillRect(-iw / 2, -ih / 2, iw, ih); }
    g.restore();
    gb.save(); path(gb); gb.fillStyle = '#ffffff'; gb.fill(); gb.restore();
  };
  const inset = (pts, cx, cy, d) => pts.map(([x, y]) => { const dx = x - cx, dy = y - cy, L = Math.hypot(dx, dy) || 1; return [x - (dx / L) * d, y - (dy / L) * d]; });

  let base = 0;
  if (layout === 'diagonal' || layout === 'herringbone') base = 45;
  if (layout === 'vertical') base = 90;
  const rot = ((base + (opt.rotation || 0)) * Math.PI) / 180;
  const span = Math.hypot(W, H) / 2 + Math.max(tw, th) * 2;
  const both = (ctx) => { ctx.save(); ctx.translate(W / 2, H / 2); ctx.rotate(rot); if (base === 0 && !(opt.rotation || 0)) ctx.translate(-W / 2, -H / 2); };
  both(g); both(gb);
  const aligned = base === 0 && !(opt.rotation || 0);
  const x0 = aligned ? 0 : -span, y0 = aligned ? 0 : -span, x1 = aligned ? W + tw : span, y1 = aligned ? H + th : span;
  // start rows from the bottom edge (floors are laid from the visible edge)
  const startY = aligned ? H - Math.ceil(H / th) * th : y0;

  if (layout === 'herringbone') {
    const L = Math.max(tw, th), Wd = Math.min(tw, th);
    const range = Math.ceil((span * 2) / Wd) + 4, bands = Math.ceil((span * 2) / L) + 3;
    for (let bnd = -bands; bnd <= bands; bnd++) for (let k = -range; k <= range; k++) {
      const ox = k * Wd + bnd * L, oy = k * Wd - bnd * L;
      if (Math.abs(ox) > span + L || Math.abs(oy) > span + L) continue;
      piece(ox + L / 2, oy + Wd / 2, L, Wd, 0, false);
      piece(ox + L + Wd / 2, oy + Wd - L / 2, L, Wd, Math.PI / 2, false);
    }
  } else if (layout === 'chevron') {
    const L = Math.max(tw, th), Wd = Math.min(tw, th);
    const cw = L * Math.SQRT1_2, hh = Wd * Math.SQRT2; const gh = gpx * Math.SQRT2 / 2;
    for (let col = Math.floor(-span / (2 * cw)) - 1; col <= Math.ceil(span / (2 * cw)) + 1; col++) {
      const xL = col * 2 * cw;
      for (let y = -span - hh * 2; y < span + cw + hh; y += hh) {
        const A = [[xL, y], [xL + cw, y - cw], [xL + cw, y - cw + hh], [xL, y + hh]];
        const B = [[xL + cw, y - cw], [xL + 2 * cw, y], [xL + 2 * cw, y + hh], [xL + cw, y - cw + hh]];
        poly(inset(A, xL + cw / 2, y - cw / 2 + hh / 2, gh), xL + cw / 2, y - cw / 2 + hh / 2, L * 1.05, Wd, -Math.PI / 4, false);
        poly(inset(B, xL + 1.5 * cw, y - cw / 2 + hh / 2, gh), xL + 1.5 * cw, y - cw / 2 + hh / 2, L * 1.05, Wd, Math.PI / 4, false);
      }
    }
  } else if (layout === 'basketweave') {
    const L = Math.max(tw, th), n = Math.max(1, Math.round(L / Math.min(tw, th))), sw = L / n;
    for (let j = Math.floor(y0 / L) - 1; j * L < y1; j++) for (let i = Math.floor(x0 / L) - 1; i * L < x1; i++) {
      const horiz = (i + j) % 2 === 0;
      for (let k = 0; k < n; k++) {
        if (horiz) piece(i * L + L / 2, j * L + k * sw + sw / 2, L, sw, 0, false);
        else piece(i * L + k * sw + sw / 2, j * L + L / 2, L, sw, Math.PI / 2, false);
      }
    }
  } else if (layout === 'hexagon') {
    const hw = Math.min(tw, th), r = hw / Math.sqrt(3), vy = 1.5 * r, gh = gpx / 2;
    for (let j = Math.floor(y0 / vy) - 1; j * vy < y1 + r; j++) for (let i = Math.floor(x0 / hw) - 1; i * hw < x1 + hw; i++) {
      const cx = i * hw + ((j & 1) ? hw / 2 : 0), cy = j * vy;
      const pts = [...Array(6)].map((_, k) => { const a = Math.PI / 6 + (k * Math.PI) / 3; return [cx + Math.cos(a) * r, cy + Math.sin(a) * r]; });
      poly(inset(pts, cx, cy, gh), cx, cy, 2 * r, 2 * r, (Math.floor(R() * 6) * Math.PI) / 3, false);
    }
  } else {
    // straight / brick / thirds / random / vertical / diagonal / checker
    const rowOffset = (j) => (layout === 'brick' ? (j & 1) * tw / 2 : layout === 'thirds' ? (((j % 3) + 3) % 3) * tw / 3 : layout === 'random' ? R() * tw : 0);
    for (let j = 0, y = startY; y < y1; j++, y += th) {
      const off = rowOffset(j); const xs = (aligned ? 0 : x0) - off - (off ? 0 : 0);
      let i = 0;
      for (let x = xs - (aligned && off ? tw : 0); x < x1; x += tw, i++) {
        if (layout === 'checker') {
          const alt = ((i + j) & 1) === 1;
          piece(x + tw / 2, y + th / 2, tw, th, 0, alt && !!vars2, alt && !vars2 && Math.abs(tw - th) < 2);
        } else piece(x + tw / 2, y + th / 2, tw, th, 0, false);
      }
    }
  }
  g.restore(); gb.restore();
  return { canvas: c, bump: b, pxPerM };
}

/** which layouts make sense for a product */
export function layoutsFor(p) {
  if (!p || isContinuous(p)) return [];
  const plank = isPlank(p);
  return LAYOUTS.filter((l) => {
    if (l.plank && !plank) return false;
    if (['herringbone', 'chevron', 'basketweave'].includes(l.id)) return plank || Math.max(p.tile_w_mm, p.tile_h_mm) / Math.min(p.tile_w_mm, p.tile_h_mm) >= 2;
    if (l.id === 'hexagon') return !plank && Math.abs(p.tile_w_mm - p.tile_h_mm) < 5;
    return true;
  });
}
