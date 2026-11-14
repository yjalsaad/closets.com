/* The visitor's avatar: a procedural Arabic character (female / male / guest) that follows the walker in third-person mode, with idle / walk animation driven by the real
 * ground speed. Hidden in first person (the default). */
import * as THREE from 'three';
import { buildCharacter } from './rig';
import { createAnim, updateAnim, pose, playGesture, speechEnvelope } from './anim';
import { PALETTE as P } from '../3d/palette';

export const AVATARS = {
  female: { gender: 'f', outfit: 'abaya', scarf: true, color: P.abayaSage, scarfColor: P.scarfCream, skin: 'skinB', label: { en: 'Female, abaya and light headscarf', ar: 'أنثى، عباءة وغطاء رأس خفيف' } },
  male: { gender: 'm', outfit: 'thobe', color: P.thobeWhite, scarfColor: P.ghutraWhite, skin: 'skinC', label: { en: 'Male, white thobe and ghutra', ar: 'ذكر، ثوب أبيض وغترة' } },
  guest: { gender: 'guest', outfit: 'suit', color: P.suitGrey, hair: 'short', hairColor: P.hairBrown, skin: 'skinA', label: { en: 'Guest, modern suit', ar: 'ضيف، بدلة عصرية' } },
};
export const AVATAR_IDS = Object.keys(AVATARS);
export const nextAvatar = (id) => AVATAR_IDS[(AVATAR_IDS.indexOf(id) + 1) % AVATAR_IDS.length];

export class VisitorAvatar {
  constructor({ tier = 'high', kind = 'female' } = {}) { this.q = tier === 'low' ? 0 : 1; this.group = new THREE.Group(); this.group.name = 'visitor-avatar'; this.group.visible = false; this.anim = createAnim({ seed: 3 }); this.kind = null; this.char = null; this.setKind(kind); }
  setKind(kind) {
    if (!AVATARS[kind] || kind === this.kind) return false;
    if (this.char) { this.group.remove(this.char.group); this.char.dispose(); }
    this.kind = kind; this.char = buildCharacter({ ...AVATARS[kind], q: this.q }); this.group.add(this.char.group); this.group.userData.label = this.char.label; return true;
  }
  /** w = the walker (pos, yaw, speed); visible only in third-person mode */
  update(dt, w, { visible = false, reduced = false } = {}) {
    this.group.visible = !!visible; if (!visible) return;
    this.group.position.set(w.pos[0], 0, w.pos[1]); this.group.rotation.y = w.yaw + Math.PI + (this.faceOffset || 0);
    updateAnim(this.anim, dt, { speed: w.speed, reduced, talking: !!this.text, level: speechEnvelope(this.text, this.anim.t) }); this.char.setPose(pose(this.anim, { reduced }), dt);
  }
  /** debug / demo hooks: say(text) starts the talk animation, say('') stops; gesture('wave'|'open'|'point'|'chest') */
  say(text) { this.text = text || ''; }
  gesture(name) { return playGesture(this.anim, name); }
  dispose() { if (this.char) this.char.dispose(); }
}
