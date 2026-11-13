/* Cheap planar floor reflection, HIGH TIER ONLY. A half-resolution render of just the furnished bays + the stage (hall shell, facade and sky are hidden for
 * this pass, shadow maps are reused) from the camera mirrored about y = 0, then composited over the floor of each bay as a blurred, Fresnel-weighted
 * transparent overlay. It gives the polished stone real reflections of the furniture; it is NOT screen-space and it does not reflect the walls / ceiling. */
import * as THREE from 'three';

const vert = /* glsl */`
uniform mat4 uTex; varying vec4 vProj; varying vec3 vW;
void main(){ vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; vProj = uTex * w; gl_Position = projectionMatrix * viewMatrix * w; }`;
const frag = /* glsl */`
uniform sampler2D tMap; uniform float uStr; varying vec4 vProj; varying vec3 vW;
void main(){
  vec2 uv = vProj.xy / vProj.w; vec3 V = normalize(cameraPosition - vW);
  float fres = 0.16 + 0.84 * pow(1.0 - clamp(V.y, 0.0, 1.0), 2.5);
  float r = 0.0045 + 0.004 * clamp(length(cameraPosition - vW) / 14.0, 0.0, 1.0);
  vec4 a = texture2D(tMap, uv) * 0.36 + texture2D(tMap, uv + vec2(r, 0.0)) * 0.16 + texture2D(tMap, uv - vec2(r, 0.0)) * 0.16 + texture2D(tMap, uv + vec2(0.0, r * 1.6)) * 0.16 + texture2D(tMap, uv - vec2(0.0, r * 1.6)) * 0.16;
  float edge = smoothstep(0.0, 0.04, uv.x) * smoothstep(1.0, 0.96, uv.x) * smoothstep(0.0, 0.04, uv.y) * smoothstep(1.0, 0.96, uv.y);
  gl_FragColor = vec4(a.rgb / max(a.a, 0.001), a.a * uStr * fres * edge);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`;

export class FloorMirror {
  /** rects: [{x0, x1, z0, z1}] world-space floor rectangles that receive the overlay */
  constructor(renderer, scene, rects, { scale = 0.5, strength = 0.5, y = 0.0125 } = {}) {
    this.renderer = renderer; this.scene = scene; this.scale = scale; this.rt = new THREE.WebGLRenderTarget(8, 8, { type: THREE.HalfFloatType, depthBuffer: true }); this.cam = new THREE.PerspectiveCamera();
    this.texM = new THREE.Matrix4(); this.hidden = []; this.size = [0, 0];
    const pos = [], idx = []; rects.forEach((r, i) => { const o = i * 4; pos.push(r.x0, y, r.z0, r.x1, y, r.z0, r.x1, y, r.z1, r.x0, y, r.z1); idx.push(o, o + 2, o + 1, o, o + 3, o + 2); });
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx);
    this.material = new THREE.ShaderMaterial({ vertexShader: vert, fragmentShader: frag, uniforms: { tMap: { value: this.rt.texture }, uTex: { value: this.texM }, uStr: { value: strength } }, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3 });
    this.mesh = new THREE.Mesh(g, this.material); this.mesh.renderOrder = 5; this.mesh.frustumCulled = false; this.mesh.name = 'floor-mirror'; scene.add(this.mesh);
  }
  setSize(w, h) { const W = Math.max(64, Math.round(w * this.scale)), H = Math.max(64, Math.round(h * this.scale)); if (W !== this.size[0] || H !== this.size[1]) { this.rt.setSize(W, H); this.size = [W, H]; } }
  /** @param {THREE.Object3D[]} hide objects to hide during the mirror pass */
  render(camera, hide) {
    const r = this.renderer, c = this.cam, P = new THREE.Vector3(), q = camera.quaternion;
    camera.getWorldPosition(P); const dir = new THREE.Vector3(0, 0, -1).applyQuaternion(q), up = new THREE.Vector3(0, 1, 0).applyQuaternion(q);
    c.position.set(P.x, -P.y, P.z); c.up.set(up.x, -up.y, up.z); c.lookAt(P.x + dir.x, -(P.y + dir.y), P.z + dir.z);
    c.near = camera.near; c.far = Math.min(camera.far, 120); c.fov = camera.fov; c.aspect = camera.aspect; c.projectionMatrix.copy(camera.projectionMatrix); c.projectionMatrixInverse.copy(camera.projectionMatrixInverse); c.updateMatrixWorld(true);
    this.texM.set(0.5, 0, 0, 0.5, 0, 0.5, 0, 0.5, 0, 0, 0.5, 0.5, 0, 0, 0, 1).multiply(c.projectionMatrix).multiply(c.matrixWorldInverse);
    const was = this.hidden; was.length = 0; for (const o of hide) if (o && o.visible) { o.visible = false; was.push(o); }
    this.mesh.visible = false;
    const prevT = r.getRenderTarget(), prevAuto = r.shadowMap.autoUpdate, col = new THREE.Color(), al = r.getClearAlpha(); r.getClearColor(col);
    r.shadowMap.autoUpdate = false; r.setRenderTarget(this.rt); r.setClearColor(0x000000, 0); r.clear(); r.render(this.scene, c);
    r.setRenderTarget(prevT); r.setClearColor(col, al); r.shadowMap.autoUpdate = prevAuto;
    for (const o of was) o.visible = true; this.mesh.visible = true;
  }
  dispose() { this.rt.dispose(); this.material.dispose(); this.mesh.geometry.dispose(); this.scene.remove(this.mesh); }
}
