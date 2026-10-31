/* Neo Kitchen Designer UX-20 - the assistant's persona: one place for the name, the company and the avatar, so a rename or a real
 * photo later is a one-line change. No stock photo and no generated face: the avatar is a drawn mark (initial + a small bonsai). */
import React from 'react';

export const PERSONA = {
  company: { en: 'Bonsai', ar: 'بونساي' },
  name: { en: 'Haneen', ar: 'حنين' },
  initial: { en: 'H', ar: 'ح' },
  role: { en: 'Your personal assistant', ar: 'مساعدك الشخصي' },
  /** AVATAR SLOT: set to an image URL / imported asset (or pass `src` to <PersonaAvatar>) and the drawn mark is replaced by that picture. */
  avatarSrc: null,
};

export const ASST_LANG_KEY = 'nk.assistant.lang';
/** guarded storage: private windows / blocked site data must never break the panel */
export function loadAsstLang() {
  try { const v = window.localStorage.getItem(ASST_LANG_KEY); return v === 'ar' || v === 'en' ? v : null; } catch (e) { return null; }
}
export function saveAsstLang(v) {
  try { if (v === 'ar' || v === 'en') window.localStorage.setItem(ASST_LANG_KEY, v); else window.localStorage.removeItem(ASST_LANG_KEY); } catch (e) { /* ignore */ }
}

export const personaName = (lang) => PERSONA.name[lang === 'ar' ? 'ar' : 'en'];
export const assistantTitle = (lang) => (lang === 'ar' ? `مساعد ${PERSONA.company.ar}` : `${PERSONA.company.en} Assistant`);

/** 'morning' (before 12:00), 'afternoon' (12:00-17:59), 'evening' (18:00 on) */
export function dayPart(date = new Date()) {
  const h = date.getHours();
  return h < 12 ? 'morning' : h < 18 ? 'afternoon' : 'evening';
}

/** the assistant's first message. Only describes what the interpreter really does: the kitchen type (straight / L / U), the main run's size,
 * a left or right leg; every change goes through "review before applying", and Ctrl+Z is the designer's real undo. */
export function greeting(lang, date = new Date()) {
  const part = dayPart(date);
  if (lang === 'ar') {
    const hi = part === 'morning' ? 'صباح الخير' : 'مساء الخير';
    return `${hi}! أهلًا بيك في ${PERSONA.company.ar}، أنا ${PERSONA.name.ar} وهساعدك تبني مطبخك خطوة بخطوة. اوصفلي نوع المطبخ ومقاساته — الأساسي، ولو فيه يمين وشمال. (Ctrl+Z يرجّع التصميم اللي كان مفتوح.)`;
  }
  const hi = part === 'morning' ? 'Good morning' : part === 'afternoon' ? 'Good afternoon' : 'Good evening';
  return `${hi}! Welcome to ${PERSONA.company.en} — I'm ${PERSONA.name.en} and I'll help you build your kitchen step by step. Tell me the kitchen type and its sizes — the main run, and whether there is a left or right leg. (Ctrl+Z brings back the design you had open.)`;
}

/** circle avatar with a pale ring and the green status dot; `size` in px. Replace the picture through PERSONA.avatarSrc or `src`. */
export function PersonaAvatar({ lang = 'en', size = 30, src, online = true, ring = true }) {
  const img = src || PERSONA.avatarSrc;
  const ar = lang === 'ar';
  return (
    <span className={`nk-pav${size >= 64 ? ' nk-pav-lg' : ''}${ring ? ' nk-pav-ring' : ''}`} style={{ '--nk-pav-size': `${size}px` }} data-testid="persona-avatar" data-kind={img ? 'image' : 'mark'} aria-hidden="true">
      {img ? <img className="nk-pav-img" src={img} alt="" /> : (
        <svg className="nk-pav-mark" viewBox="0 0 48 48" focusable="false">
          <text className="nk-pav-letter" x="24" y="28" textAnchor="middle" style={{ fontSize: 22 }} fontWeight="800">{PERSONA.initial[ar ? 'ar' : 'en']}</text>
          {/* small bonsai under the letter; shown from the large (onboarding) size up */}
          <g className="nk-pav-tree">
            <path className="nk-pav-trunk" d="M24 42v-5" fill="none" strokeWidth="1.6" strokeLinecap="round" />
            <circle className="nk-pav-leaf" cx="24" cy="35" r="3.4" />
            <path className="nk-pav-pot" d="M20.5 42h7l-.8 2.4h-5.4z" />
          </g>
        </svg>
      )}
      {online && <i className="nk-pav-dot" />}
    </span>
  );
}
