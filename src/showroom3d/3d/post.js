/* Restrained bloom, HIGH TIER ONLY. Loaded lazily (dynamic import) so lower tiers never download it. Render path: scene -> half-float MSAA target ->
 * UnrealBloomPass (threshold above white, so only HDR emitters such as LED strips, the screen halo and the pendant bulbs glow) -> OutputPass
 * (ACES tone mapping + sRGB, exactly what the renderer would have done itself). Any failure falls back to the plain renderer. */
import * as THREE from 'three';

export async function createBloom(renderer, scene, camera, { width, height, pixelRatio = 1, ao = false }) {
  const [{ EffectComposer }, { RenderPass }, { UnrealBloomPass }, { OutputPass }, { ShaderPass }] = await Promise.all([
    import('three/examples/jsm/postprocessing/EffectComposer.js'), import('three/examples/jsm/postprocessing/RenderPass.js'),
    import('three/examples/jsm/postprocessing/UnrealBloomPass.js'), import('three/examples/jsm/postprocessing/OutputPass.js'), import('three/examples/jsm/postprocessing/ShaderPass.js'),
  ]);
  const target = new THREE.WebGLRenderTarget(width * pixelRatio, height * pixelRatio, { type: THREE.HalfFloatType, samples: 4 });
  const composer = new EffectComposer(renderer, target); composer.setPixelRatio(pixelRatio); composer.setSize(width, height);
  composer.addPass(new RenderPass(scene, camera));
  // optional ground-truth AO (high tier, opt-in with ?ao=1 until it has been checked on real GPUs): contact shading under furniture / in corners. It re-renders the scene normals, so it roughly doubles draw calls.
  let gtao = null;
  if (ao) { try { const { GTAOPass } = await import('three/examples/jsm/postprocessing/GTAOPass.js'); gtao = new GTAOPass(scene, camera, Math.round(width * pixelRatio), Math.round(height * pixelRatio)); gtao.updateGtaoMaterial({ radius: 0.7, distanceExponent: 1.4, thickness: 1.2, scale: 1.0, samples: 8 }); gtao.blendIntensity = 0.85; composer.addPass(gtao); } catch (e) { gtao = null; } }
  // HDR safety: a near-mirror specular peak (a polished floor / clearcoat catching the key spot exactly) can exceed the half-float range, become Inf / NaN and bloom into a black frame
  // (seen in the Living bay at some canvas sizes). Clamp to a sane HDR ceiling and drop NaNs before the bloom chain.
  composer.addPass(new ShaderPass({ uniforms: { tDiffuse: { value: null } }, vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: 'uniform sampler2D tDiffuse; varying vec2 vUv; void main(){ vec4 c = texture2D(tDiffuse, vUv); vec3 x = min(c.rgb, vec3(48.0)); if (!(x.r == x.r)) x.r = 0.0; if (!(x.g == x.g)) x.g = 0.0; if (!(x.b == x.b)) x.b = 0.0; gl_FragColor = vec4(max(x, vec3(0.0)), c.a); }' }));
  const bloom = new UnrealBloomPass(new THREE.Vector2(width, height), 0.12, 0.5, 2.0);   // strength, radius, threshold
  composer.addPass(bloom); composer.addPass(new OutputPass());
  // colour grade + vignette AFTER tone mapping (display-referred): a per-room tint, a touch of contrast around mid grey and a soft vignette
  const grade = new ShaderPass({ uniforms: { tDiffuse: { value: null }, uTint: { value: new THREE.Vector3(1, 1, 1) }, uContrast: { value: 1 }, uVig: { value: 0.12 } },
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: 'uniform sampler2D tDiffuse; uniform vec3 uTint; uniform float uContrast, uVig; varying vec2 vUv; void main(){ vec4 c = texture2D(tDiffuse, vUv); vec3 x = c.rgb * uTint; x = (x - 0.5) * uContrast + 0.5; vec2 d = vUv - 0.5; float v = smoothstep(0.35, 0.85, length(d * vec2(1.0, 0.85))); x *= 1.0 - uVig * v; gl_FragColor = vec4(max(x, 0.0), c.a); }' });
  composer.addPass(grade);
  return { composer, bloom, grade, setGrade(g) { grade.uniforms.uTint.value.set(...g.tint); grade.uniforms.uContrast.value = g.contrast; grade.uniforms.uVig.value = g.vignette; }, setSize(w, h, pr) { composer.setPixelRatio(pr); composer.setSize(w, h); if (gtao && gtao.setSize) gtao.setSize(Math.round(w * pr), Math.round(h * pr)); }, hasAo: !!gtao, render() { composer.render(); }, dispose() { composer.dispose(); target.dispose(); } };
}
