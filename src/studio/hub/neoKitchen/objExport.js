/* Neo Kitchen Designer - Wavefront OBJ + MTL writer (text). Mesh and axes: see meshExport.js
 * (Y-up, +X along the run, +Z towards the room, millimetres - or metres with unit:'m'). One `o` object per
 * panel, one `g` group per cabinet / worktop group, `usemtl` per material class; MTL has Kd colours per material. */
import { buildMesh } from './meshExport';
import { appName, productInfo, productFile } from './productInfo';
import { outOf, isDefaultOutput, UNIT_INFO, DXF_DP, PRECISION_INFO } from './outputSettings';

const numDp = (dp) => { const k = 10 ** dp; return (v) => { const r = Math.round(v * k) / k; return Object.is(r, -0) ? '0' : String(r); }; };

/** returns { obj, mtl, stats } (strings). `mtlName` is the file name the OBJ points at (no path). */
/** [NEO-OUTPUT-UX34] `output` = { unit: mm | cm | in, precision } scales the vertices and sets the curve segments; omitted = millimetres, standard (the legacy bytes). `unit: 'm'` (metres) is the older option. */
export function buildOBJ(scene, { mtlName, title = 'Kitchen', unit = 'mm', product, props = false, output } = {}) {
  const app = appName(product); // the program named in the file header (Neo Kitchen Designer unless the product is registered: wardrobe, bathroom, ...)
  const mesh = buildMesh(scene, { zUp: false, props, output });
  const O = outOf(output);
  const num = numDp(output ? DXF_DP[O.precision][O.unit] : 3);
  mtlName = mtlName || `${productFile(product)}.mtl`;
  const k = unit === 'm' ? 0.001 : output ? 1 / UNIT_INFO[O.unit].factor : 1;
  const uName = unit === 'm' ? 'metres' : UNIT_INFO[O.unit].obj; const uScale = unit === 'm' ? '1 m' : `1 ${UNIT_INFO[O.unit].en}`;
  const L = [];
  L.push(`# ${app} - ${String(title).replace(/[\r\n]+/g, ' ')}`);
  L.push(`# units: ${uName} (OBJ has no unit field - import with scale = ${uScale})`);
  if (output && !isDefaultOutput(output)) L.push(`# precision: ${O.precision} (about ${PRECISION_INFO[O.precision].points}${PRECISION_INFO[O.precision].plus ? '+' : ''} points per curve)`);
  L.push('# axes: Y up, +X along the main run (left to right), +Z from the back wall towards the room (right-handed)');
  L.push(`# closed (doors and drawers shut), hidden units excluded, hardware not modelled${props ? `, ${(productInfo(product) && productInfo(product).propsOn) || 'display props INCLUDED (props)'}` : productInfo(product) && productInfo(product).propsOff ? `, ${productInfo(product).propsOff}` : ''}`);
  L.push(`# objects ${mesh.stats.objects}  vertices ${mesh.stats.vertices}  faces ${mesh.stats.faces}`);
  L.push(`mtllib ${mtlName}`);
  let base = 1;
  let lastGroup = null;
  mesh.objects.forEach((o) => {
    L.push(`o ${o.name}`);
    if (o.group !== lastGroup) { L.push(`g ${o.group}`); lastGroup = o.group; }
    L.push(`usemtl ${mesh.materials[o.mat].name}`);
    o.verts.forEach((v) => L.push(`v ${num(v[0] * k)} ${num(v[1] * k)} ${num(v[2] * k)}`));
    o.faces.forEach((f) => L.push(`f ${f.map((i) => i + base).join(' ')}`));
    base += o.verts.length;
  });
  const used = [...new Set(mesh.objects.map((o) => o.mat))];
  const M = [`# ${app} - materials (Kd = diffuse colour, d = opacity)`];
  used.forEach((key) => {
    const m = mesh.materials[key];
    M.push('', `newmtl ${m.name}`, `Ka 0.000 0.000 0.000`, `Kd ${m.kd.map((c) => c.toFixed(3)).join(' ')}`, 'Ks 0.000 0.000 0.000', `d ${m.d}`, 'illum 2');
  });
  return { obj: `${L.join('\n')}\n`, mtl: `${M.join('\n')}\n`, stats: mesh.stats, materials: used.map((key) => mesh.materials[key].name) };
}
