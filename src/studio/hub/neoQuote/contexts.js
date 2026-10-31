/* =============================================================================
 * Neo Quote Builder [NEO-QUOTE-UX33] - the per-studio CONTEXT: what each studio hands to the shared Quote panel. Each builder is a plain function
 * of the objects the studio already has (its design, its built scene / bill of materials / hardware list, its price result), so a studio only adds
 *   <QuoteLauncher getContext={() => wardrobeCtx({ ... })} />
 * to its toolbar. Nothing is recomputed: `auto` is the studio's own price result turned into lines (quoteLines.js).
 * ctx = { product, studioLabel:[en,ar], auto:{lines,net,source}, facts, design, finishName, rules, vatPct, placeholder, onAdvanced,
 *         describe?: { examples:{en,ar}, run(text, lang) -> {cards, rest}, apply(cards) -> {design, n} }, apply?(design), onTemplate?(tpl) }
 * `describe` is the studio's OWN assistant interpreter (the same interpret / plan / execute its Haneen assistant runs), used by the panel's
 * "Describe it" box; `apply(design)` commits the result into the studio (one undo step). The kitchen's assistant needs a selection / run context the panel
 * does not have, so the kitchen has no `describe` (quote-level commands still work).
 * ===========================================================================*/
import { linesFromWardrobe, linesFromKitchen, linesFromDoors, linesFromCustom, linesFromCategory } from './quoteLines';
import { wardrobeFacts, kitchenFacts, doorFacts, furnitureFacts } from './facts';
import { activeRunKeys, runLen, layoutName } from '../neoKitchen/model';
import { interpretWardrobe, planWardrobe, executeWardrobe, EXAMPLES as WD_EX } from '../neoWardrobe/wardrobeCommands';
import { interpretDoor, planDoor, executeDoor, EXAMPLES as DR_EX } from '../neoDoors/doorCommands';
import { interpretCustom, planCustom, executeCustom, EXAMPLES as CU_EX } from '../neoCustom/customCommands';
import { interpretCategory, planCategory, executeCategory } from '../neoCategories/categoryCommands';

export const LABEL = {
  wardrobe: ['Neo Wardrobe Designer', 'مصمم خزائن نيو'], kitchen: ['Neo Kitchen Designer', 'مصمم مطابخ نيو'], door: ['Neo Doors Designer', 'مصمم أبواب نيو'], custom: ['Neo Custom Designer', 'مصمم القطع الخاصة نيو'],
};

/** the one shape of an assistant binding: interpret -> design commands -> review cards -> execute the ok ones */
function binding({ examples, interpret, plan, execute }) {
  return {
    examples,
    run(text, lang) {
      const { items, rest } = interpret(text);
      const cards = plan(items.filter((c) => c.type === 'design'), lang);
      return { cards, rest: rest || [] };
    },
    apply(cards, design) {
      let d = design; let n = 0;
      cards.forEach((c) => { if (!c.ok) return; d = execute(d, c.cmd).design; n += 1; });
      return { design: d, n };
    },
  };
}

export function wardrobeCtx({ design, W, finish, priced, rules, onAdvanced, apply }) {
  const describe = binding({ examples: WD_EX, interpret: (t) => interpretWardrobe(t, design), plan: (c, lang) => planWardrobe(c, design, lang, rules), execute: (d, cmd) => executeWardrobe(d, cmd, rules) });
  /* a saved product of the closet family loads its size into the studio design through the assistant's own (clamped) dimension commands */
  const onTemplate = (tpl) => {
    if (!apply) return null;
    let d = design;
    [['w', tpl.width_mm], ['h', tpl.height_mm], ['d', tpl.depth_mm]].forEach(([key, v]) => { if (+v > 0) d = executeWardrobe(d, { type: 'design', kind: 'dim', key, value: +v }, rules).design; });
    return d;
  };
  return { product: 'wardrobe', studioLabel: LABEL.wardrobe, auto: linesFromWardrobe(priced), facts: wardrobeFacts({ design, W, finish }), design, finishName: finish ? finish.name : null, rules, vatPct: priced.vatPct, placeholder: false, onAdvanced,
    describe, apply, onTemplate, templateCats: ['closet', 'wardrobe'] };
}

export function kitchenCtx({ model, scene, hardware, est, onAdvanced }) {
  const runs = activeRunKeys(model).map((rk) => ({ key: rk, len: Math.round(runLen(model, rk)), base: (model.runs[rk] && model.runs[rk].base ? model.runs[rk].base.length : 0), wall: (model.runs[rk] && model.runs[rk].wall ? model.runs[rk].wall.length : 0) }));
  return { product: 'kitchen', studioLabel: LABEL.kitchen, auto: linesFromKitchen(est), facts: kitchenFacts({ model, scene, hardware, layoutKey: layoutName(model), runLengths: runs }), design: model, finishName: null, rules: null, vatPct: undefined, placeholder: false, onAdvanced };
}

export function doorsCtx({ d, W, price, onAdvanced, apply }) {
  const describe = binding({ examples: DR_EX, interpret: (t) => interpretDoor(t, d), plan: (c, lang) => planDoor(c, d, lang), execute: (dd, cmd) => executeDoor(dd, cmd) });
  return { product: 'door', studioLabel: LABEL.door, auto: linesFromDoors(price), facts: doorFacts({ d, W }), design: d, finishName: null, rules: null, vatPct: price.vatPct, placeholder: !!price.placeholder, onAdvanced, describe, apply };
}

export function customCtx({ built, onAdvanced, apply }) {
  const d = built.design; const dim = d.dims || {};
  const facts = furnitureFacts({ product: 'custom', title: d.title, nameEn: 'Custom furniture piece', nameAr: 'قطعة أثاث خاصة', w: dim.w, h: dim.h, d: dim.d, parts: built.scene && built.scene.parts, hardware: built.hardware, boardM2: built.bom && built.bom.boardArea, pieces: built.bom && built.bom.pieces });
  const describe = binding({ examples: CU_EX, interpret: (t) => interpretCustom(t, d, {}), plan: (c, lang) => planCustom(c, d, lang, {}), execute: (dd, cmd) => executeCustom(dd, cmd, {}) });
  return { product: 'custom', studioLabel: LABEL.custom, auto: linesFromCustom(built.est), facts, design: d, finishName: null, rules: null, vatPct: built.est && built.est.rates ? built.est.rates.vatPct : undefined, placeholder: true, onAdvanced, describe, apply };
}

export function categoryCtx({ cfg, out, onAdvanced, apply }) {
  const b = out.scene.bounds;
  const name = cfg.app || ['Neo design', 'تصميم نيو'];
  const facts = furnitureFacts({ product: 'category', categoryId: cfg.id, title: out.d.title, nameEn: String(name[0]).replace(/\s*Designer$/, '').replace(/^Neo\s+/, ''), nameAr: String(name[1]).replace(/^مصمم\s+/, '').replace(/\s*نيو$/, ''),
    w: Math.round(b.x1 - b.x0), d: Math.round(b.z1 - b.z0), h: Math.round(b.h), parts: out.scene.parts, hardware: out.hardware, boardM2: out.bom && out.bom.cards ? out.bom.cards.reduce((s, c) => s + (c.m2 || 0), 0) : 0, pieces: out.bom && out.bom.rows ? out.bom.rows.length : 0 });
  const describe = binding({ examples: { en: [], ar: [] }, interpret: (t) => interpretCategory(cfg, t, out.d), plan: (c, lang) => planCategory(cfg, c, out.d, lang), execute: (dd, cmd) => executeCategory(cfg, dd, cmd) });
  return { product: `category:${cfg.id}`, studioLabel: name, auto: linesFromCategory(out.price), facts, design: out.d, finishName: null, rules: null, vatPct: undefined, placeholder: true, onAdvanced, describe, apply };
}
