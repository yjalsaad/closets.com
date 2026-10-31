/* =============================================================================
 * Neo Kitchen components shared by other products [NEO-CATEGORIES-UX26] - ONE small registry of the NAMES a product gives to the shared
 * exports, cut list and report (program name, noun, file stem, legend wording). The wardrobe studio is registered here with exactly the
 * strings that used to be hard-coded in each file; the Neo category studios (bathroom, laundry, TV, office) register themselves from
 * src/neoCategories. A product that is not registered (the kitchen) keeps every kitchen string.
 *
 * Behaviour switches that are specific to the wardrobe scene (frames, physical glass, "no kitchen row heights") still test
 * `product === 'wardrobe'` in their own files and are NOT affected by registering another product.
 * ===========================================================================*/

const REG = {
  wardrobe: {
    app: ['Neo Wardrobe Designer', 'مصمم خزائن نيو'], noun: ['Wardrobe', 'خزانة'], file: 'wardrobe', mtl: 'wardrobe.mtl',
    props: true, propsNote: ['Rails, hangers and clothes in OBJ / STL / 3DM. Display only: never in the cut list or the price.', 'المعالق والشماعات والملابس في OBJ / STL / 3DM. للعرض فقط: ليست في قائمة القص أو السعر.'],
    propsOn: 'rails and clothes INCLUDED (props)', propsOff: 'rails and clothes not included',
  },
};

/** register (or replace) a product; returns the entry */
export function registerProduct(id, info) { REG[id] = { props: true, ...info }; return REG[id]; }
export const productInfo = (p) => (p && REG[p]) || null;
export const isRegistered = (p) => !!(p && REG[p]);
/** the program name written into OBJ / STL / 3DM / xlsx headers and the report cover */
export const appName = (p, ar = false) => { const r = productInfo(p); return r ? r.app[ar ? 1 : 0] : (ar ? 'مصمم مطابخ نيو' : 'Neo Kitchen Designer'); };
/** the thing designed, for fallback titles ("Wardrobe", "Bathroom", ...) */
export const productNoun = (p, ar = false, fallback = ['Kitchen', 'مطبخ']) => { const r = productInfo(p); return (r ? r.noun : fallback)[ar ? 1 : 0]; };
export const productFile = (p, fallback = 'kitchen') => { const r = productInfo(p); return r && r.file ? r.file : fallback; };
