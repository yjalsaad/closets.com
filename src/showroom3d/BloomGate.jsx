/* [YAS-BLOOM 2026-11-21] Password gate in front of the virtual showroom (/yas-bloom, /ar/yas-bloom).
 * The showroom code is not downloaded until the password is accepted. Only a salted, slow hash of the password lives
 * here (PBKDF2-SHA256, 210,000 rounds), never the password. To change it: `node scripts/bloom-password.js "<new password>"`.
 * Limits: this is a gate in the page, not on the server. It keeps visitors out of the showroom, but a media file under
 * /yas-bloom/ can still be fetched by someone who knows its exact address. */
import React, { useEffect, useRef, useState } from 'react';
import '../design/tokens.css';
import './bloomGate.css';

export const GATE = { salt: 'aea419bfacee0789a06f0d62f4cee482', hash: 'e5c4ccadf9a9d963dbe67bda55441e2f021c35658ccf82e956622c63758a7e14', rounds: 210000 };
const KEY = 'yb_gate_v1'; const HOURS = 12;
const hex = (buf) => Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('');
const unhex = (s) => new Uint8Array(s.match(/../g).map((x) => parseInt(x, 16)));

export async function hashOf(password, gate = GATE) {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(String(password).trim()), 'PBKDF2', false, ['deriveBits']);
  return hex(await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: unhex(gate.salt), iterations: gate.rounds }, key, 256));
}
export function isOpen(now = Date.now()) {
  try { const v = JSON.parse(localStorage.getItem(KEY) || 'null'); return !!v && v.h === GATE.hash && now - v.at < HOURS * 3600e3; } catch (e) { return false; }
}

export default function BloomGate({ children }) {
  const ar = /^\/ar(\/|$)/i.test(window.location.pathname || '');
  const [open, setOpen] = useState(isOpen); const [pw, setPw] = useState(''); const [state, setState] = useState('idle'); // idle | busy | wrong | error
  const input = useRef(null);
  useEffect(() => { if (!open && input.current) input.current.focus(); }, [open]);
  if (open) return children;
  const L = (en, a) => (ar ? a : en);
  const submit = async (e) => {
    e.preventDefault(); if (!pw.trim() || state === 'busy') return;
    setState('busy');
    try {
      const h = await hashOf(pw);
      if (h === GATE.hash) { try { localStorage.setItem(KEY, JSON.stringify({ h, at: Date.now() })); } catch (err) { /* private mode: stays open for this visit */ } setOpen(true); }
      else { setState('wrong'); setPw(''); if (input.current) input.current.focus(); }
    } catch (err) { setState('error'); }
  };
  return (
    <main className="ybg" dir={ar ? 'rtl' : 'ltr'} lang={ar ? 'ar' : 'en'}>
      <form className="ybg-card" onSubmit={submit} aria-busy={state === 'busy'}>
        <p className="ybg-brand">YAS Bloom</p>
        <h1>{L('Private showroom', 'معرض خاص')}</h1>
        <p className="ybg-sub">{L('Enter the password you were given to continue', 'أدخل كلمة المرور التي استلمتها للمتابعة')}</p>
        <label htmlFor="ybg-pw">{L('Password', 'كلمة المرور')}</label>
        <input id="ybg-pw" ref={input} type="password" dir="ltr" autoComplete="current-password" value={pw} onChange={(e) => { setPw(e.target.value); if (state !== 'busy') setState('idle'); }} data-testid="ybg-input" />
        {state === 'wrong' && <p className="ybg-err" role="alert">{L('That password is not correct', 'كلمة المرور غير صحيحة')}</p>}
        {state === 'error' && <p className="ybg-err" role="alert">{L('This browser could not check the password. Open the page over https in a current browser', 'تعذّر على هذا المتصفح التحقق من كلمة المرور. افتح الصفحة عبر https في متصفح حديث')}</p>}
        <button type="submit" disabled={state === 'busy' || !pw.trim()} data-testid="ybg-go">{state === 'busy' ? L('Checking…', 'جارٍ التحقق…') : L('Enter', 'دخول')}</button>
        <a className="ybg-back" href={ar ? '/ar' : '/'}>{L('Back to the website', 'العودة إلى الموقع')}</a>
      </form>
    </main>
  );
}
