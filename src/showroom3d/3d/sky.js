/* Golden-hour Gulf sky: a gradient dome with a sun disc/halo and (on better tiers) cheap fbm clouds.
 * The same dome is rendered once into a PMREM cube to light every PBR material (image-based lighting). */
import * as THREE from 'three';
import { PALETTE } from './palette';

export const SUN_DIR = new THREE.Vector3(0.55, 0.4, 0.74).normalize();

const vert = /* glsl */`
varying vec3 vDir;
void main(){ vDir = normalize(position); vec4 p = modelViewMatrix * vec4(position,1.0); gl_Position = projectionMatrix * p; gl_Position.z = gl_Position.w; }`;
const frag = /* glsl */`
uniform vec3 uZenith; uniform vec3 uMid; uniform vec3 uHorizon; uniform vec3 uSun; uniform vec3 uSunDir; uniform float uClouds;
varying vec3 vDir;
float h21(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7))) * 43758.5453); }
float vn(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.0-2.0*f); return mix(mix(h21(i),h21(i+vec2(1,0)),f.x), mix(h21(i+vec2(0,1)),h21(i+vec2(1,1)),f.x), f.y); }
float fbm(vec2 p){ float a=0.5, s=0.0; for(int i=0;i<4;i++){ s+=a*vn(p); p*=2.03; a*=0.5; } return s; }
void main(){
  vec3 d = normalize(vDir);
  float h = clamp(d.y, 0.0, 1.0);
  vec3 col = mix(uHorizon, uMid, smoothstep(0.0, 0.22, h));
  col = mix(col, uZenith, smoothstep(0.18, 0.85, h));
  float sd = max(dot(d, uSunDir), 0.0);
  col += uSun * (pow(sd, 900.0) * 9.0 + pow(sd, 18.0) * 0.55 + pow(sd, 4.0) * 0.18);
  if (uClouds > 0.5 && d.y > 0.01) {
    vec2 uv = d.xz / (d.y + 0.22) * 1.25 + vec2(3.7, 1.3);
    float c = smoothstep(0.52, 0.86, fbm(uv));
    float lit = 0.55 + 0.45 * pow(sd, 2.0);
    vec3 cloud = mix(uHorizon * 0.95, vec3(1.0, 0.97, 0.92), lit);
    col = mix(col, cloud, c * 0.62 * smoothstep(0.01, 0.22, d.y));
  }
  if (d.y < 0.0) col = mix(uHorizon, uHorizon * 0.72, clamp(-d.y * 5.0, 0.0, 1.0));
  gl_FragColor = vec4(col, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`;

export function createSkyMaterial(clouds) {
  return new THREE.ShaderMaterial({
    vertexShader: vert, fragmentShader: frag, side: THREE.BackSide, depthWrite: false, depthTest: false, fog: false,
    uniforms: {
      uZenith: { value: new THREE.Color(PALETTE.skyZenith) }, uMid: { value: new THREE.Color(PALETTE.skyMid) },
      uHorizon: { value: new THREE.Color(PALETTE.skyHorizon) }, uSun: { value: new THREE.Color(PALETTE.sun) },
      uSunDir: { value: SUN_DIR.clone() }, uClouds: { value: clouds ? 1 : 0 },
    },
  });
}

export function createSkyDome(clouds) {
  const dome = new THREE.Mesh(new THREE.SphereGeometry(900, 48, 24), createSkyMaterial(clouds));
  dome.renderOrder = -10; dome.frustumCulled = false; dome.name = 'sky';
  return dome;
}

/** image-based lighting: render the sky into a PMREM texture (disposes its helper scene) */
export function buildEnvironment(renderer, clouds) {
  const s = new THREE.Scene();
  const mat = createSkyMaterial(clouds); mat.depthTest = true;
  s.add(new THREE.Mesh(new THREE.SphereGeometry(50, 32, 16), mat));
  const pm = new THREE.PMREMGenerator(renderer);
  const rt = pm.fromScene(s, 0.02, 0.1, 200);
  pm.dispose(); s.traverse((o) => { if (o.geometry) o.geometry.dispose(); }); mat.dispose();
  return rt.texture;
}
