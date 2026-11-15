/* The Welcome slide: the date is explicit and the word "tomorrow" is DERIVED (never typed); CMS rows are validated; the slide shows in the room's decks, in EN + AR, and no 2023 remains visible in the VIP room. */
import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import * as W from '../vip/welcome';
import { PERMANENT_DECKS } from '../vip/decks';
import { MEETING_DECK, AGENDA } from '../vip/meeting';
import { drawWelcome } from '../scenes/vip/panels';
import { WelcomeBody } from '../ui/VipWelcome';
import { FLAGS } from '../vip/flags';

const at = (iso) => new Date(iso);   // an instant (UTC); Bahrain is UTC+3

describe('meeting date: explicit, derived relative wording (Bahrain time)', () => {
  test('there is no committed meeting date (owner asked to drop the "meeting tomorrow" line); the date helpers still format dates', () => {
    expect(W.DEFAULT_MEETING_DATE).toBe(''); expect(W.resolveWelcome({}, 'en', at('2026-11-15T09:00:00Z')).meeting).toBeNull(); expect(W.longDate('2026-11-16', 'en')).toBe('Monday 16 November 2026'); expect(W.longDate('2026-11-16', 'ar')).toBe('الاثنين 16 نوفمبر 2026');
  });
  test('"tomorrow" only while the date really is tomorrow; "today" on the day; plain date before; nothing after', () => {
    const d = '2026-11-16';
    expect(W.meetingLine(d, 'en', at('2026-11-15T09:00:00Z'))).toMatchObject({ rel: 'tomorrow', kicker: 'Our meeting is tomorrow', date: 'Monday 16 November 2026' });
    expect(W.meetingLine(d, 'ar', at('2026-11-15T09:00:00Z'))).toMatchObject({ rel: 'tomorrow', kicker: 'اجتماعنا غدًا', date: 'الاثنين 16 نوفمبر 2026' });
    expect(W.meetingLine(d, 'en', at('2026-11-16T05:00:00Z'))).toMatchObject({ rel: 'today', kicker: 'Our meeting is today' });
    expect(W.meetingLine(d, 'en', at('2026-11-13T09:00:00Z'))).toMatchObject({ rel: 'upcoming', kicker: 'Meeting', date: 'Monday 16 November 2026' });
    expect(W.meetingLine(d, 'en', at('2026-11-17T05:00:00Z'))).toBeNull();   // the meeting has passed: no stale "upcoming" line
    expect(W.meetingLine('not a date', 'en', at('2026-11-15T09:00:00Z'))).toBeNull();
  });
  test('the day rolls over at midnight in Bahrain (UTC+3), not in UTC', () => {
    expect(W.daysUntil('2026-11-16', at('2026-11-15T20:59:00Z'))).toBe(1);   // 23:59 on the 15th in Manama
    expect(W.daysUntil('2026-11-16', at('2026-11-15T21:00:00Z'))).toBe(0);   // 00:00 on the 16th in Manama
    expect(W.daysUntil('2026-11-16', at('2026-11-13T21:00:00Z'))).toBe(2);
  });
  test('only real calendar dates are accepted', () => {
    for (const bad of ['2026-02-30', '2026-13-01', '2026-1-5', '16/11/2026', '', null, undefined, 20261116, '1999-01-01']) expect(W.parseISODate(bad)).toBeNull();
    expect(W.parseISODate('2028-02-29')).toEqual({ y: 2028, m: 2, d: 29 });
  });
  test('the word "tomorrow" is never typed into the slide content: it only comes out of the date logic', () => {
    expect(JSON.stringify([W.WELCOME_TITLE, W.WELCOME_LINE, W.WELCOME_DECK_SLIDE])).not.toMatch(/tomorrow|غدًا|غدا/i);
  });
});

describe('CMS config (website_content rows): validated, falls back to the defaults, never throws', () => {
  test('valid rows are used; empty / invalid values are ignored', () => {
    expect(W.parseWelcomeRows([{ key: 'vip.meeting.date', value: '2026-12-01' }, { key: 'vip.welcome.line', value: 'Hello <b>guests</b>' }, { key: 'vip.welcome.line::ar', value: 'أهلاً' }])).toEqual({ date: '2026-12-01', line: { en: 'Hello guests', ar: 'أهلاً' } });
    expect(W.parseWelcomeRows([{ key: 'vip.meeting.date', value: '2026-02-31' }, { key: 'vip.welcome.line', value: '   ' }])).toEqual({});
    expect(W.parseWelcomeRows(null)).toEqual({}); expect(W.parseWelcomeRows([null, 5, {}])).toEqual({});
  });
  test('loadWelcomeConfig: one read-only GET of the vip.* keys; any failure -> {}', async () => {
    const calls = []; const ok = await W.loadWelcomeConfig({ api: async (q) => { calls.push(q); return [{ key: 'vip.meeting.date', value: '2026-12-01' }]; } });
    expect(ok).toEqual({ date: '2026-12-01' }); expect(calls).toEqual([W.CMS_QUERY]); expect(W.CMS_QUERY).toMatch(/^website_content\?.*key=like\.vip\.\*/);
    expect(await W.loadWelcomeConfig({ api: async () => { throw new Error('down'); } })).toEqual({}); expect(await W.loadWelcomeConfig({ api: async () => 'nope' })).toEqual({});
  });
  test('a CMS date / line overrides the committed ones in the slide', () => {
    const r = W.resolveWelcome({ date: '2026-12-01', line: { en: 'Custom welcome', ar: '' } }, 'en', at('2026-11-15T09:00:00Z')); expect(r.line).toBe('Custom welcome'); expect(r.meeting.rel).toBe('upcoming'); expect(r.meeting.date).toBe('Tuesday 1 December 2026');
    expect(W.resolveWelcome({ line: { en: 'Custom welcome', ar: '' } }, 'ar', at('2026-11-15T09:00:00Z')).line).toBe(W.WELCOME_LINE.ar);   // an empty Arabic row falls back to the committed Arabic
  });
});

describe('the Welcome slide is first in the meeting and the company presentation, with both flags', () => {
  test('placement', () => {
    expect(MEETING_DECK.slides[0].builtin).toBe('welcome'); const company = PERMANENT_DECKS.find((d) => d.id === 'default'); expect(company.slides[0].builtin).toBe('welcome'); expect(company.slides).toHaveLength(5); expect(company.preface).toBe(1);
    for (const id of ['closets-profile', 'yas-profile', 'film']) expect(PERMANENT_DECKS.find((d) => d.id === id).slides.some((s) => s.builtin === 'welcome')).toBe(false);   // the profile decks open on their own covers
  });
  const rec = () => { const ops = []; const g = new Proxy({ canvas: {} }, { get: (t, k) => (k in t ? t[k] : (...a) => { ops.push([String(k), ...a]); return k === 'measureText' ? { width: 10 } : k === 'createLinearGradient' ? { addColorStop() {} } : undefined; }), set: (t, k, v) => { t[k] = v; if (k === 'fillStyle') ops.push(['fillStyle', v]); return true; } }); return { g, ops }; };
  test.each(['en', 'ar'])('the wall draws the greeting, the meeting date and the two flags (%s)', (lang) => {
    const paths = []; const P2 = global.Path2D; global.Path2D = function Path2D(d) { paths.push(d); }; const { g, ops } = rec();
    try { drawWelcome(g, 1536, 864, { lang, welcome: { date: '2026-11-16' }, now: at('2026-11-15T09:00:00Z') }); } finally { global.Path2D = P2; }
    const texts = ops.filter((o) => o[0] === 'fillText').map((o) => o[1]).join(' | ');
    expect(texts).toContain(W.WELCOME_TITLE[lang]); expect(texts).toContain(W.longDate('2026-11-16', lang)); expect(texts).toContain(W.MEETING_KICKER.tomorrow[lang]);
    expect(paths).toEqual([FLAGS.sa.path]);   // the Saudi emblem = the vector outline, once
    expect(ops.filter((o) => o[0] === 'fillStyle').map((o) => o[1])).toEqual(expect.arrayContaining([FLAGS.bh.red, FLAGS.bh.white, FLAGS.sa.green]));
  });
  test.each(['en', 'ar'])('the panel body (%s) shows the lead, the meeting line and two named flags', (lang) => {
    jest.useFakeTimers().setSystemTime(at('2026-11-15T09:00:00Z')); try {
      render(<div dir={lang === 'ar' ? 'rtl' : 'ltr'}><WelcomeBody lang={lang} cfg={{ date: '2026-11-16' }} /></div>);
      expect(screen.getByTestId('sr-vip-welcome')).toHaveAttribute('data-rel', 'tomorrow'); expect(screen.getByTestId('sr-vip-meetline')).toHaveTextContent(W.longDate('2026-11-16', lang));
      expect(screen.getByTestId('sr-flag-bh')).toHaveAttribute('aria-label', FLAGS.bh.name[lang]); expect(screen.getByTestId('sr-flag-sa')).toHaveAttribute('aria-label', FLAGS.sa.name[lang]);
      expect(screen.getByTestId('sr-flag-bh')).toHaveAttribute('data-ratio', '5:3'); expect(screen.getByTestId('sr-flag-sa')).toHaveAttribute('data-ratio', '3:2');
    } finally { jest.useRealTimers(); }
  });
});

describe('2023 -> 2026 in the VIP room', () => {
  const texts = (o, out = []) => { if (typeof o === 'string') out.push(o); else if (Array.isArray(o)) o.forEach((x) => texts(x, out)); else if (o && typeof o === 'object') Object.values(o).forEach((x) => texts(x, out)); return out; };
  test('no deck, agenda or welcome text shows 2023 (Latin or Arabic-Indic digits); the YAS deck is titled 2026', () => {
    const all = texts([PERMANENT_DECKS, AGENDA, W.WELCOME_TITLE, W.WELCOME_LINE]).join('\n'); expect(all).not.toMatch(/2023|٢٠٢٣/);
    const yas = PERMANENT_DECKS.find((d) => d.id === 'yas-profile'); expect(yas.title).toEqual({ en: 'YAS Profile (2026)', ar: 'ملف YAS (2026)' }); expect(yas.slides[0].title.en).toBe('YAS Wood: Profile 2026'); expect(AGENDA.find((a) => a.id === 'yas-profile').title.en).toBe('YAS Profile (2026)');
  });
});

describe('owner clean-up (15 Nov 2026): no committed "meeting tomorrow" line and no "to be confirmed" cards', () => {
  test('by default the wall and the panel show the greeting and flags but no meeting line', () => {
    const ops = []; const g = new Proxy({ canvas: {} }, { get: (t, k) => (k in t ? t[k] : (...a) => { ops.push([String(k), ...a]); return k === 'measureText' ? { width: 10 } : k === 'createLinearGradient' ? { addColorStop() {} } : undefined; }), set: () => true });
    const P2 = global.Path2D; global.Path2D = function Path2D() {};
    try { drawWelcome(g, 1536, 864, { lang: 'en', welcome: {}, now: at('2026-11-15T09:00:00Z') }); } finally { global.Path2D = P2; }
    const texts = ops.filter((o) => o[0] === 'fillText').map((o) => o[1]).join(' | ');
    expect(texts).toContain('Welcome'); expect(texts).not.toMatch(/meeting is tomorrow|16 November/i);
  });
});
