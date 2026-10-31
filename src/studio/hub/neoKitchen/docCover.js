/* [NEO-CUTLIST-UX32] The `doc` an Excel export needs for its Cover sheet: company + project details + the logo and QR as PNG bytes (rasterised in the
 * browser, so this is async). Returns undefined when nothing was entered (the workbook then keeps its four classic sheets). Never throws. */
import { docFor } from './docStore';
import { projectFilled, projectRows } from './docInfo';

export async function coverDoc(state, title, ar = false) {
  const d = docFor(state, title);
  const wanted = projectFilled(state.project) || !!state.company.name || state.company.logoMode === 'upload';
  if (!wanted) return undefined;
  let images = {};
  try { const { docImages } = await import('./clRaster'); images = await docImages(d); } catch (e) { images = {}; }
  return { ...d, cover: true, fields: projectRows(d.project, ar), images };
}
