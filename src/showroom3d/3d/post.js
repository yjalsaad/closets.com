/* Restrained bloom, HIGH TIER ONLY. Loaded lazily (dynamic import) so lower tiers never download it. Render path: scene -> half-float MSAA target ->
 * UnrealBloomPass (threshold above white, so only HDR emitters such as LED strips, the screen halo and the pendant bulbs glow) -> OutputPass
 * (ACES tone mapping + sRGB, exactly what the renderer would have done itself). Any failure falls back to the plain renderer. */
import * as THREE from 'three';

export async function createBloom(renderer, scene, camera, { width, height, pixelRatio = 1 }) {
  const [{ EffectComposer }, { RenderPass }, { UnrealBloomPass }, { OutputPass }] = await Promise.all([
    import('three/examples/jsm/postprocessing/EffectComposer.js'), import('three/examples/jsm/postprocessing/RenderPass.js'),
    import('three/examples/jsm/postprocessing/UnrealBloomPass.js'), import('three/examples/jsm/postprocessing/OutputPass.js'),
  ]);
  const target = new THREE.WebGLRenderTarget(width * pixelRatio, height * pixelRatio, { type: THREE.HalfFloatType, samples: 4 });
  const composer = new EffectComposer(renderer, target); composer.setPixelRatio(pixelRatio); composer.setSize(width, height);
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(new THREE.Vector2(width, height), 0.22, 0.55, 1.35);   // strength, radius, threshold
  composer.addPass(bloom); composer.addPass(new OutputPass());
  return { composer, bloom, setSize(w, h, pr) { composer.setPixelRatio(pr); composer.setSize(w, h); }, render() { composer.render(); }, dispose() { composer.dispose(); target.dispose(); } };
}
