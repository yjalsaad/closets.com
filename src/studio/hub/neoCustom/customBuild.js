/* Neo Custom Designer [NEO-CUSTOM-UX28] - the one build: design -> solved parts -> scene -> cut list / hardware / warnings / price.
 * Every screen (drawing, 3D, cut list, exports, price) reads the object this returns, so they cannot disagree. Pure. */
import './customProduct';
import { solve } from './customSolve';
import { buildScene } from './customScene';
import { buildBOM, buildHardware, buildWarnings } from './customCutlist';
import { estimateCustom } from './customPrice';

export function buildCustom(design) {
  const solved = solve(design);
  const scene = buildScene(design, solved);
  const bom = buildBOM(design, scene);
  const hardware = buildHardware(design, scene);
  const warnings = buildWarnings(design, scene, solved);
  const est = estimateCustom(bom, hardware, design.x.rates);
  return { design, solved, scene, model: scene.model, bom, hardware, warnings, est };
}
