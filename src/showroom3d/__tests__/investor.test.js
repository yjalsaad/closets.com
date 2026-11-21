/* Haneen AI: the fact sheet is the only source of answers (grounding), figures the owner has not confirmed never appear, EN/AR parity, unknown questions fall back safely,
 * the AI opt-in is rate limited, the session resets, the meeting request sends nothing by itself. Pure logic + the chat component with a mocked AI fetcher. */
import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { FACT_SHEET, TOPICS, TOPIC_TITLE, CONFIRMED, PENDING, UNCONFIRMED, NOT_UNDERSTOOD, INFO_LINE, FACTSHEET_VERSION, confirmedFacts, pendingFacts, factById } from '../investor/factsheet';
import { reply, opening, newSession, resetSession, meetingRequest, topicChips, norm } from '../investor/haneen';
import { createRateLimiter, guardAiReply } from '../staff/guide';
import { FORBIDDEN_FINANCIAL } from '../vip/deckSchema';
import HaneenChat from '../ui/HaneenChat';

const AR = /[؀-ۿ]/, ids = new Set(FACT_SHEET.map((f) => f.id));
const PENDING_DIGITS = /70,?000|\b50,?000|\b27\b|5000 sqm|\b4 showrooms\b/;   // the figures the repo shows but the owner has not confirmed
const PROBES = ['how many projects have you done', 'what is your revenue', 'valuation?', 'how much funding are you raising', 'كم عدد المصانع', 'what is the capacity of the factory', 'patents', 'do you export to iraq and jordan', 'who is the ceo', 'was the factory born after the pandemic', 'are your designs exclusive worldwide', 'expected returns and roi', 'كم تبلغ الأرباح', 'عدد المشاريع المنجزة', 'which projects have you built', 'how many showrooms'];

describe('fact sheet: grounding and parity', () => {
  test('every fact has a unique id, a known topic, a status, a source; confirmed facts have text in both languages; pending facts keep only a draft for the owner', () => {
    expect(ids.size).toBe(FACT_SHEET.length);
    for (const f of FACT_SHEET) {
      expect(TOPICS).toContain(f.topic); expect([CONFIRMED, PENDING]).toContain(f.status); expect(f.source.length).toBeGreaterThan(8);
      if (f.status === CONFIRMED) { expect(f.text.en.length).toBeGreaterThan(20); expect(AR.test(f.text.ar)).toBe(true); expect(f.draft).toBeUndefined(); }
      else { expect(f.text).toBeUndefined(); expect(f.draft.en.length).toBeGreaterThan(3); expect(AR.test(f.draft.ar)).toBe(true); expect(f.ask.en.length).toBeGreaterThan(10); expect(AR.test(f.ask.ar)).toBe(true); }
    }
  });
  test('EN / AR parity: every topic title and standing line exists in both languages', () => {
    for (const t of TOPICS) { expect(TOPIC_TITLE[t].en.length).toBeGreaterThan(3); expect(AR.test(TOPIC_TITLE[t].ar)).toBe(true); }
    for (const l of [UNCONFIRMED, NOT_UNDERSTOOD, INFO_LINE]) { expect(l.en.length).toBeGreaterThan(10); expect(AR.test(l.ar)).toBe(true); }
    expect(INFO_LINE.en).toMatch(/not investment advice/); expect(UNCONFIRMED.en).toBe("I don't have a confirmed figure for that; I'll connect you with the team.");
  });
  test('the figures the owner has not confirmed are pending: projects, patents, factories, capacity, Iraq / Jordan, origin story, exclusivity, team, investment', () => {
    for (const id of ['track.projects', 'tech.patents', 'factories.count', 'factories.capacity', 'markets.distribution', 'markets.showrooms', 'who.origin', 'products.exclusive', 'team.management', 'invest.terms']) expect(factById(id).status).toBe(PENDING);
    expect(confirmedFacts().length + pendingFacts().length).toBe(FACT_SHEET.length); expect(FACTSHEET_VERSION).toMatch(/^\d{4}-\d{2}-\d{2}\.\d+$/);
  });
  test('no confirmed fact states a money / return / valuation word, a percentage or a pending figure', () => {
    for (const f of confirmedFacts()) { for (const l of ['en', 'ar']) { expect(FORBIDDEN_FINANCIAL.test(f.text[l])).toBe(false); expect(PENDING_DIGITS.test(f.text[l])).toBe(false); } }
  });
});

describe('answers', () => {
  const langs = ['en', 'ar'];
  test.each(langs)('every topic chip (%s) answers from confirmed facts only and names the facts it used', (lang) => {
    for (const c of topicChips()) {
      const r = reply(c.token, { lang }), topic = c.token.slice(1);
      expect(r.factIds.length).toBeGreaterThan(0); for (const id of r.factIds) { expect(ids.has(id)).toBe(true); expect(factById(id).topic).toBe(topic); }
      for (const f of FACT_SHEET.filter((x) => x.topic === topic)) { if (f.status === CONFIRMED) expect(r.text).toContain(f.text[lang]); else { expect(r.text).not.toContain(f.draft[lang]); expect(r.pending).toContain(f.id); } }
      expect(r.text).not.toMatch(PENDING_DIGITS); expect(FORBIDDEN_FINANCIAL.test(r.text)).toBe(false);
      if (FACT_SHEET.some((x) => x.topic === topic && x.status === PENDING)) expect(r.text).toContain(UNCONFIRMED[lang]);
    }
  });
  test.each(langs)('questions about unconfirmed figures or money (%s) are never answered with a number: the standing "no confirmed figure" reply, the team action, traceable ids', (lang) => {
    for (const q of PROBES) { const r = reply(q, { lang }); expect(['money', 'pending-figure']).toContain(r.intent); expect(r.text).toBe(UNCONFIRMED[lang]); expect(r.actions.some((a) => a.type === 'meeting')).toBe(true); expect(r.askAi).toBe(false); for (const id of r.factIds) expect(ids.has(id)).toBe(true); }
  });
  test('no answer to anything in a broad corpus contains a pending figure, a promise or a financial word', () => {
    const corpus = [...PROBES, ...topicChips().map((c) => c.token), 'who are you', 'tell me about the company', 'hello', 'thanks', 'what do you make', 'visit the factory', 'talk to a human', 'ما هي منتجاتكم', 'من أنتم', 'زيارة المصنع', 'تقنية', ...FACT_SHEET.filter((f) => f.kw).flatMap((f) => f.kw)];
    for (const lang of langs) for (const q of corpus) { const r = reply(q, { lang }); expect(r.text).not.toMatch(PENDING_DIGITS); expect(FORBIDDEN_FINANCIAL.test(r.text)).toBe(false); for (const id of r.factIds) expect(ids.has(id)).toBe(true); for (const f of pendingFacts()) { expect(r.text).not.toContain(f.draft.en); expect(r.text).not.toContain(f.draft.ar); } }
  });
  test('an unknown question falls back to the topic chips, offers the existing opt-in AI chat and the team; empty input re-opens; off-topic is declined', () => {
    for (const lang of langs) {
      const r = reply('qwertyzz blorp', { lang }); expect(r.intent).toBe('unknown'); expect(r.text).toBe(NOT_UNDERSTOOD[lang]); expect(r.askAi).toBe(true); expect(r.chips).toHaveLength(TOPICS.length); expect(r.factIds).toEqual([]);
      expect(reply('', { lang }).intent).toBe('empty'); expect(reply('what is the weather', { lang }).intent).toBe('offtopic'); expect(reply(null, { lang })).toBeTruthy(); expect(reply('x'.repeat(5000), { lang }).text.length).toBeGreaterThan(5);
    }
  });
  test('the opening names the assistant honestly (AI, confirmed information only, no figures) and lists all ten topics', () => {
    const o = opening('en'); expect(o.text).toMatch(/AI assistant/); expect(o.text).toMatch(/never quote a figure/); expect(o.chips.map((c) => c.token)).toEqual(TOPICS.map((t) => '#' + t)); expect(AR.test(opening('ar').text)).toBe(true);
  });
  test('Arabic normalisation understands common spellings', () => { expect(norm('مُنتَجَات')).toBe(norm('منتجات')); expect(reply('ما هي منتجاتكم', { lang: 'ar' }).intent).toBe('topic:products'); expect(reply('اين المصنع', { lang: 'ar' }).intent).toBe('topic:factories'); });
});

describe('session, rate limit, meeting request', () => {
  test('reset gives a fresh memory and the memory never holds what the visitor typed', () => {
    const m0 = newSession(), r = reply('my secret investor question about products', { lang: 'en', memory: m0 }); expect(JSON.stringify(r.memory)).not.toMatch(/secret|investor question/); expect(r.memory.turns).toBe(1); expect(m0.turns).toBe(0);
    expect(resetSession()).toEqual(newSession()); expect(resetSession()).not.toBe(resetSession());
  });
  test('the AI opt-in is rate limited: 6 per 30 s, then a wait, then free again', () => {
    let now = 0; const l = createRateLimiter({ max: 6, windowMs: 30000, now: () => now }); for (let i = 0; i < 6; i++) expect(l.take()).toBe(true); expect(l.take()).toBe(false); expect(l.retryIn()).toBeGreaterThan(0); now = 31000; expect(l.take()).toBe(true);
  });
  test('an AI reply with a number, a currency or a promise is dropped by the guard', () => {
    expect(guardAiReply('We make closets and kitchens in Bahrain.')).toBeTruthy(); expect(guardAiReply('We have 27 patents')).toBeNull(); expect(guardAiReply('Expect strong returns of growth')).toBeNull(); expect(guardAiReply('Valuation is high BHD')).toBeNull();
  });
  test('the meeting request needs a name and an email or phone, caps every field, strips newlines, and only builds mailto / WhatsApp links (nothing is sent)', () => {
    const bad = meetingRequest({ name: '', email: 'x' }, { lang: 'en', factsEmail: 'a@b.co' }); expect(bad.ok).toBe(false); expect(bad.errors).toEqual(expect.arrayContaining(['name', 'contact']));
    const ok = meetingRequest({ name: 'Sam\nInvestor', email: 'sam@fund.example', phone: '', company: 'C'.repeat(500), message: 'Hello\r\nthere' }, { lang: 'en', factsEmail: 'info@the-closets.com', factsWhatsapp: 'https://wa.me/97317555095' });
    expect(ok.ok).toBe(true); expect(ok.fields.company.length).toBe(100); expect(ok.fields.name).toBe('Sam Investor'); expect(ok.mailto).toMatch(/^mailto:info@the-closets\.com\?subject=/); expect(ok.mailto).not.toMatch(/%0D%0A%0D%0A%0D/); expect(ok.whatsapp).toMatch(/^https:\/\/wa\.me\/97317555095\?text=/);
    expect(meetingRequest({ name: 'A', email: 'a@b.co' }, { lang: 'ar', factsEmail: 'x@y.z' }).mailto).toContain(encodeURIComponent('طلب اجتماع'));
  });
});

describe('the chat component', () => {
  const setup = (props = {}) => render(<HaneenChat lang="en" reduced onClose={() => {}} {...props} />);
  test('shows the AI / informational line, answers a chip from the fact sheet, never calls the AI service by itself, and Reset session clears the chat', () => {
    const ai = jest.fn(); setup({ aiFetcher: ai });
    expect(screen.getByTestId('sr-haneen-info').textContent).toBe(INFO_LINE.en); expect(screen.getByTestId('sr-haneen-badge')).toBeInTheDocument();
    fireEvent.click(screen.getByText('Factories & capacity')); const log = screen.getByTestId('sr-haneen-log'); expect(log.textContent).toMatch(/Askar/); expect(log.textContent).toMatch(/don't have a confirmed figure/); expect(log.textContent).not.toMatch(PENDING_DIGITS);
    fireEvent.change(screen.getByTestId('sr-haneen-input'), { target: { value: 'what is your revenue' } }); fireEvent.click(screen.getByTestId('sr-haneen-send')); expect(log.textContent).toMatch(/confirmed figure/); expect(ai).not.toHaveBeenCalled();
    fireEvent.click(screen.getByTestId('sr-haneen-reset')); expect(log.textContent).not.toMatch(/Askar/); expect(log.textContent).not.toMatch(/revenue/); expect(log.textContent).toMatch(/Nothing was stored/);
  });
  test('a question it does not understand offers the opt-in AI chat; the reply goes through the guard; a declined consent keeps the guide', async () => {
    const ai = jest.fn().mockResolvedValueOnce({ ok: true, reply: 'We have 27 patents' }).mockResolvedValueOnce({ ok: false, declined: true }); setup({ aiFetcher: ai });
    fireEvent.change(screen.getByTestId('sr-haneen-input'), { target: { value: 'qwertyzz blorp' } }); fireEvent.click(screen.getByTestId('sr-haneen-send'));
    await act(async () => { fireEvent.click(screen.getByTestId('sr-haneen-askai')); }); expect(ai).toHaveBeenCalledTimes(1); expect(screen.getByTestId('sr-haneen-log').textContent).not.toMatch(/27 patents/);
  });
  test('Arabic is right-to-left friendly: the language toggle calls back, the meeting form composes links without sending, presenter mode toggles, read-aloud is off', () => {
    const onLang = jest.fn(); setup({ lang: 'ar', onLang }); expect(screen.getByTestId('sr-haneen-info').textContent).toBe(INFO_LINE.ar); fireEvent.click(screen.getByTestId('sr-haneen-lang')); expect(onLang).toHaveBeenCalledWith('en');
    fireEvent.click(screen.getByTestId('sr-haneen-big')); expect(screen.getByTestId('sr-haneen').className).toMatch(/is-big/); expect(screen.getByTestId('sr-haneen-voice').checked).toBe(false);
    fireEvent.click(screen.getByTestId('sr-haneen-meeting-btn')); expect(screen.getByTestId('sr-haneen-meeting')).toBeInTheDocument(); fireEvent.change(screen.getByTestId('sr-haneen-name'), { target: { value: 'سالم' } }); fireEvent.change(screen.getByTestId('sr-haneen-email'), { target: { value: 'a@b.co' } });
    expect(screen.getByTestId('sr-haneen-mailto').getAttribute('href')).toMatch(/^mailto:/); expect(screen.getByTestId('sr-haneen-profile')).toBeInTheDocument();
  });
});
