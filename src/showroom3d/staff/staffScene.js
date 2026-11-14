/* The advisers in the 3D scene: ten characters (characters/rig.js) placed by staff/roster.js, plus the Reception desk and sign. Per frame each adviser turns to the visitor when they come close,
 * waves once, may step a little towards them (never closer than 2.1 m, never more than 0.9 m from their post; not at all with reduced motion), and talks (jaw / head / hand beats)
 * while the chat panel is answering. Far advisers collapse to one baked draw call and are not animated. Everything here is cosmetic: no state outside this module depends on it. */
import * as THREE from 'three';
import { buildCharacter } from '../characters/rig';
import { createAnim, updateAnim, pose, playGesture, speechEnvelope } from '../characters/anim';
import { staffRoster, RECEPTION, NOTICE_RADIUS, APPROACH, TALK_RADIUS } from './roster';
import { bevelBox, placed, prep, mergeColored } from '../3d/builders';
import { mergeGeometries } from '../3d/geom';
import { PALETTE as P } from '../3d/palette';
import { makePanel, FONT, roundedRect } from '../scenes/products/screens';

const wrapPi = (a) => { while (a > Math.PI) a -= 2 * Math.PI; while (a < -Math.PI) a += 2 * Math.PI; return a; };
const FAR_AT = 11, ANIM_AT = 20;

function drawSign(g, w, h, lang, L) {
  g.fillStyle = '#25201c'; g.fillRect(0, 0, w, h); g.strokeStyle = '#c9a25b'; g.lineWidth = 3; roundedRect(g, 10, 10, w - 20, h - 20, 14); g.stroke();
  g.fillStyle = '#f2ebdf'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = `600 ${Math.round(h * 0.38)}px ${FONT}`; g.fillText(L('Reception', 'الاستقبال'), w / 2, h * 0.42);
  g.fillStyle = '#c9a25b'; g.font = `500 ${Math.round(h * 0.16)}px ${FONT}`; g.fillText(L('Ask me anything. I am an AI assistant.', 'اسألني أي شيء. أنا مساعد ذكاء اصطناعي.'), w / 2, h * 0.76);
}

export class StaffManager {
  constructor({ tier = 'high', lang = 'en', roster = staffRoster() } = {}) {
    this.q = tier === 'low' ? 0 : 1; this.lang = lang; this.roster = roster; this.group = new THREE.Group(); this.group.name = 'staff'; this.t = 0; this.greeted = {}; this.talk = null; this.nearId = null;
    this.items = roster.map((def) => {
      const char = buildCharacter({ ...def.look, q: this.q }); char.group.position.set(def.at[0], 0, def.at[1]); char.group.rotation.y = def.yaw; this.group.add(char.group);
      return { def, char, anim: createAnim({ seed: def.seed }), pos: [def.at[0], def.at[1]], yaw: def.yaw, cool: 0, moving: 0, far: false, text: '' };
    });
    this.positions = this.items.map((i) => i.pos);
    this.reception = this.buildReception(); this.group.add(this.reception.group);
  }
  buildReception() {
    const d = RECEPTION.desk, bk = RECEPTION.backdrop, g = new THREE.Group(); g.name = 'reception';
    const items = [
      { geo: placed(bevelBox(d.hx * 2, d.h - 0.06, d.hz * 2 - 0.1, { b: 0.01 }), { x: d.x, y: (d.h - 0.06) / 2, z: d.z }), color: P.walnutDeep },
      { geo: placed(bevelBox(d.hx * 2 + 0.12, 0.06, d.hz * 2 + 0.1, { b: 0.012 }), { x: d.x, y: d.h - 0.03, z: d.z }), color: P.marbleWhite },
      { geo: placed(bevelBox(d.hx * 2 - 0.2, 0.025, 0.02), { x: d.x, y: 0.62, z: d.z + d.hz - 0.04 }), color: P.brass },
      { geo: placed(bevelBox(d.hx * 2 - 0.2, 0.025, 0.02), { x: d.x, y: 0.2, z: d.z + d.hz - 0.04 }), color: P.brass },
      { geo: placed(bevelBox(bk.w + 0.2, bk.h + 0.2, 0.08, { b: 0.01 }), { x: d.x, y: bk.y, z: bk.z - 0.05 }), color: P.bronzeDark },
      { geo: placed(bevelBox(0.07, bk.y - bk.h / 2 - 0.05, 0.07), { x: d.x - bk.w / 2 + 0.2, y: (bk.y - bk.h / 2) / 2, z: bk.z - 0.05 }), color: P.bronzeDark },
      { geo: placed(bevelBox(0.07, bk.y - bk.h / 2 - 0.05, 0.07), { x: d.x + bk.w / 2 - 0.2, y: (bk.y - bk.h / 2) / 2, z: bk.z - 0.05 }), color: P.bronzeDark },
    ];
    const mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.55, metalness: 0.08, envMapIntensity: 0.5 });
    const furn = new THREE.Mesh(mergeColored(items), mat); furn.castShadow = true; furn.receiveShadow = true; furn.name = 'reception-furniture'; g.add(furn);
    const panel = makePanel(1024, 308, drawSign, this.lang, { design: { w: 1024, h: 308 }, anisotropy: 4 });
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(bk.w, bk.h), new THREE.MeshBasicMaterial({ map: panel.tex, toneMapped: false })); sign.position.set(d.x, bk.y, bk.z - 0.005); sign.name = 'reception-sign'; g.add(sign);
    return { group: g, panel, mat, furn, sign };
  }
  setLanguage(lang) { this.lang = lang; this.reception.panel.redraw(lang); this.reception.panel.tex.needsUpdate = true; }
  item(id) { return this.items.find((i) => i.def.id === id) || null; }
  /** advisers' current standing spots, aligned with the roster */
  nearest(x, z, r = TALK_RADIUS) { let best = null, bd = r; for (const it of this.items) { const d = Math.hypot(it.pos[0] - x, it.pos[1] - z); if (d < bd) { bd = d; best = it.def; } } return best; }
  wave(id) { const it = this.item(id); if (it) playGesture(it.anim, 'wave'); }
  gesture(id, name) { const it = this.item(id); if (it) playGesture(it.anim, name); }
  /** the adviser talks (jaw, head and hand beats) for as long as the text takes to read aloud; '' stops */
  say(id, text) { const it = this.item(id); if (!it) return; it.text = text || ''; it.until = text ? this.t + Math.min(9, 1.2 + text.length * 0.045) : 0; if (text) playGesture(it.anim, 'open'); }
  setChatting(id) { this.chatting = id || null; }
  /** w = the walker (pos, speed); opts.reduced */
  update(dt, w, { reduced = false, visible = true } = {}) {
    this.group.visible = visible; if (!visible || !(dt > 0)) return; this.t += dt; const vx = w.pos[0], vz = w.pos[1];
    for (const it of this.items) {
      const { def, char, anim } = it, hx = def.at[0], hz = def.at[1], dHome = Math.hypot(vx - hx, vz - hz), dNow = Math.hypot(vx - it.pos[0], vz - it.pos[1]);
      const far = dHome > FAR_AT; if (far !== it.far) { it.far = far; char.setFar(far); }
      if (far) { if (it.pos[0] !== hx || it.pos[1] !== hz) { it.pos[0] = hx; it.pos[1] = hz; it.yaw = def.yaw; char.group.position.set(hx, 0, hz); char.group.rotation.y = def.yaw; } continue; }   // out of sight: back at the post
      it.cool = Math.max(0, it.cool - dt);
      const near = dHome < NOTICE_RADIUS, chatting = this.chatting === def.id;
      if (near && !this.greeted[def.id] && !anim.gesture) { this.greeted[def.id] = true; it.cool = 30; playGesture(anim, 'wave'); this.onGreet && this.onGreet(def); }
      else if (near && it.cool <= 0 && dHome < 6 && !anim.gesture && dHome > 2.5) { it.cool = 40; playGesture(anim, 'wave'); }
      // approach: a few steps toward the visitor, then back to the post when they leave
      let tx = hx, tz = hz;
      if (!reduced && !chatting && dHome < APPROACH.from && dHome > APPROACH.stopAt) { const k = Math.min(APPROACH.maxStep, dHome - APPROACH.stopAt - 0.1); if (k > 0.05) { tx = hx + ((vx - hx) / dHome) * k; tz = hz + ((vz - hz) / dHome) * k; } }
      const dx = tx - it.pos[0], dz = tz - it.pos[1], dd = Math.hypot(dx, dz); let speed = 0;
      if (dd > 0.03) { const step = Math.min(dd, APPROACH.speed * dt); it.pos[0] += (dx / dd) * step; it.pos[1] += (dz / dd) * step; speed = APPROACH.speed; }
      it.moving = speed;
      // facing: toward the visitor when noticed (and while walking, toward where they go), else the post's own direction
      const want = speed > 0 ? Math.atan2(dx, dz) : near ? Math.atan2(vx - it.pos[0], vz - it.pos[1]) : def.yaw;
      it.yaw += wrapPi(want - it.yaw) * (reduced ? 1 : 1 - Math.exp(-5 * dt));
      char.group.position.set(it.pos[0], 0, it.pos[1]); char.group.rotation.y = it.yaw;
      const talking = it.until > this.t;
      updateAnim(anim, dt, { speed, talking, level: talking ? speechEnvelope(it.text, this.t) : 0, reduced });
      char.setPose(pose(anim, { reduced }), dt);
    }
  }
  drawCalls() { return this.items.reduce((n, i) => n + (i.char.group.visible ? i.char.drawCalls() : 0), 0) + 2; }
  dispose() { for (const it of this.items) it.char.dispose(); const r = this.reception; r.furn.geometry.dispose(); r.mat.dispose(); r.panel.tex.dispose(); r.sign.geometry.dispose(); r.sign.material.dispose(); }
}
void mergeGeometries; void prep;
