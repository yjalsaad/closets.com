import { render, screen, act, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ConsentBanner from '../privacy/ConsentBanner';
import { getConsent, setConsent, hasConsent, clearConsent, whenConsent, openConsentSettings } from '../privacy/consent';
import { aiFetch } from '../privacy/ai';

beforeEach(() => { localStorage.clear(); clearConsent(); global.fetch = jest.fn(async () => ({ ok: true, status: 200, json: async () => ({}) })); });

describe('consent state', () => {
  test('nothing optional is allowed before a choice', () => {
    expect(getConsent()).toEqual({ decided: false, analytics: false, ai: false });
    expect(hasConsent('analytics')).toBe(false); expect(hasConsent('ai')).toBe(false);
  });
  test('legacy banner choices are honoured (accepted = analytics only, never AI)', () => {
    localStorage.setItem('closets_consent', 'accepted');
    expect(getConsent()).toEqual({ decided: true, analytics: true, ai: false });
    localStorage.setItem('closets_consent', 'declined');
    expect(getConsent()).toEqual({ decided: true, analytics: false, ai: false });
  });
  test('answering the AI prompt does not mark the analytics banner as decided', () => {
    setConsent({ ai: true }, { decide: false });
    expect(getConsent()).toEqual({ decided: false, analytics: false, ai: true });
  });
  test('whenConsent runs the callback only after the visitor allows it', () => {
    const fn = jest.fn();
    whenConsent('analytics', fn);
    expect(fn).not.toHaveBeenCalled();
    act(() => { setConsent({ analytics: false }); });
    expect(fn).not.toHaveBeenCalled();
    act(() => { setConsent({ analytics: true }); });
    expect(fn).toHaveBeenCalledTimes(1);
  });
});

describe('banner', () => {
  test('shown first, equal-weight choices, links to this site (not the ERP host)', () => {
    render(<ConsentBanner lang="en" />);
    expect(screen.getByRole('region', { name: /privacy choices/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /privacy notice/i })).toHaveAttribute('href', '/privacy');
    expect(screen.getByRole('link', { name: /terms/i })).toHaveAttribute('href', '/terms');
    expect(document.body.innerHTML).not.toMatch(/closets-hub\.vercel\.app/);
  });
  test('"Essential only" stores analytics:false and hides the banner; it can be reopened', () => {
    render(<ConsentBanner lang="en" />);
    userEvent.click(screen.getByRole('button', { name: /essential only/i }));
    expect(getConsent()).toEqual({ decided: true, analytics: false, ai: false });
    expect(screen.queryByTestId('consent-banner')).toBeNull();
    act(() => { openConsentSettings(); });
    expect(screen.getByTestId('consent-banner')).toBeInTheDocument();
  });
  test('"Allow measurement" stores analytics:true (AI stays off)', () => {
    render(<ConsentBanner lang="ar" />);
    userEvent.click(screen.getByRole('button', { name: /السماح بالقياس/ }));
    expect(getConsent()).toEqual({ decided: true, analytics: true, ai: false });
  });
});

describe('visualizer analytics are gated (viz_session_ping, viz_log)', () => {
  const load = () => { let api; jest.isolateModules(() => { api = require('../visualizer/api'); }); return api; };
  const rpcCalls = () => global.fetch.mock.calls.map((c) => String(c[0]).split('/rpc/')[1]).filter(Boolean);
  test('no ping and no event is sent before consent, nor after "essential only"', () => {
    const api = load();
    api.startSession('web'); api.track('room', { room: 'kitchen' }); api.flush();
    expect(rpcCalls()).toEqual([]);
    act(() => { setConsent({ analytics: false }); });
    api.track('room', {}); api.flush();
    expect(rpcCalls()).toEqual([]);
  });
  test('after the visitor allows measurement the session starts and events flow', () => {
    const api = load();
    api.startSession('web');
    expect(rpcCalls()).toEqual([]);
    act(() => { setConsent({ analytics: true }); });
    expect(rpcCalls()).toContain('viz_session_ping');
    api.track('room', { room: 'kitchen' }); api.flush();
    expect(rpcCalls()).toContain('viz_log');
  });
});

describe('third-party AI calls are gated', () => {
  test('declining sends nothing and returns a failed, Response-like object', async () => {
    const p = aiFetch('https://x.supabase.co/functions/v1/ai_room_redesign', { method: 'POST', body: '{}' });
    const noBtn = await screen.findByRole('button', { name: /not now/i });
    userEvent.click(noBtn);
    const r = await p;
    expect(global.fetch).not.toHaveBeenCalled();
    expect(r.ok).toBe(false);
    expect(await r.json()).toEqual({ ok: false, error: 'ai_consent_declined' });
    expect(hasConsent('ai')).toBe(false);
  });
  test('allowing is remembered; the dialog is a real modal; the next call goes straight through', async () => {
    const p = aiFetch('https://x.supabase.co/functions/v1/support_chat', { method: 'POST', body: '{}' });
    const dlg = await screen.findByRole('dialog');
    expect(dlg).toHaveAttribute('aria-modal', 'true');
    userEvent.click(screen.getByRole('button', { name: /allow and continue/i }));
    await p;
    expect(global.fetch).toHaveBeenCalledTimes(1);
    expect(hasConsent('ai')).toBe(true);
    await aiFetch('https://x.supabase.co/functions/v1/support_chat', {});
    expect(global.fetch).toHaveBeenCalledTimes(2);
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  });
});
