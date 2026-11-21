import React from 'react';
import { render, screen, fireEvent, act, renderHook } from '@testing-library/react';
import { useDesigner, HIST_KEY } from '../useDesigner';
import DesignerOverlay from '../DesignerOverlay';
import { reduce, initialState, designerRendered, DIRTY_AFTER, LANG_KEY, USER_KEY } from '../logic';
import { DS } from '../strings';

const store = (init = {}) => { const m = { ...init }; return { getItem: (k) => (k in m ? m[k] : null), setItem: (k, v) => { m[k] = String(v); }, m }; };
/** a tiny fake window.history: a stack of states, back() pops and fires popstate like the browser */
function fakeHistory() {
  const h = { stack: [{ base: 1 }], get state() { return this.stack[this.stack.length - 1]; }, pushState: jest.fn((s) => { h.stack.push(s); }), back: jest.fn(() => { h.stack.pop(); window.dispatchEvent(new PopStateEvent('popstate')); }) };
  return h;
}
const make = (over = {}) => { const hist = fakeHistory(), st = store({ [LANG_KEY]: 'en' }), setPaused = jest.fn(), onClosed = jest.fn(); const hook = renderHook((p) => useDesigner({ lang: p.lang, setPaused, onClosed, storage: st, history: hist }), { initialProps: { lang: 'en', ...over } }); return { hook, hist, st, setPaused, onClosed }; };

describe('useDesigner: pause / resume, history, language', () => {
  test('opening pauses the render loop once, writes the language the website reads, pushes ONE history entry and goes loading -> open', () => {
    const { hook, hist, st, setPaused } = make({ lang: 'ar' });
    let ok; act(() => { ok = hook.result.current.open('kitchen-studio'); });
    expect(ok).toBe(true); expect(hook.result.current.ds.status).toBe('loading'); expect(st.m[LANG_KEY]).toBe('ar');
    expect(setPaused).toHaveBeenCalledTimes(1); expect(setPaused).toHaveBeenLastCalledWith(true);
    expect(hist.pushState).toHaveBeenCalledTimes(1); expect(hist.state[HIST_KEY]).toBe('kitchen-studio');
    act(() => { hook.result.current.dispatch({ type: 'loaded' }); }); expect(hook.result.current.ds.status).toBe('open'); expect(setPaused).toHaveBeenCalledTimes(1);   // still paused, no extra call
  });
  test('a second open, an unknown section or a disabled one is ignored', () => {
    const { hook, hist, setPaused } = make();
    let r; act(() => { r = hook.result.current.open('nope'); }); expect(r).toBe(false); expect(setPaused).not.toHaveBeenCalled();
    act(() => { hook.result.current.open('kitchen-studio'); }); act(() => { r = hook.result.current.open('kitchen-studio'); }); expect(r).toBe(false); expect(hist.pushState).toHaveBeenCalledTimes(1);
  });
  test('closing (no design in progress) resumes the render loop, pops our history entry and tells the parent why', () => {
    const { hook, hist, setPaused, onClosed } = make();
    act(() => { hook.result.current.open('kitchen-studio'); }); act(() => { hook.result.current.dispatch({ type: 'loaded' }); });
    act(() => { hook.result.current.requestClose(); });
    expect(hook.result.current.ds.status).toBe('closed'); expect(setPaused).toHaveBeenLastCalledWith(false); expect(setPaused).toHaveBeenCalledTimes(2);
    expect(hist.back).toHaveBeenCalledTimes(1); expect(hist.stack).toHaveLength(1); expect(onClosed).toHaveBeenCalledWith('user');
  });
  test('with a design in progress, closing asks first; staying keeps the render loop paused; leaving resumes it', () => {
    const { hook, setPaused } = make();
    act(() => { hook.result.current.open('kitchen-studio'); }); act(() => { hook.result.current.dispatch({ type: 'loaded' }); });
    act(() => { hook.result.current.dispatch({ type: 'interact', n: DIRTY_AFTER }); }); act(() => { hook.result.current.requestClose(); });
    expect(hook.result.current.ds.status).toBe('confirm'); expect(setPaused).toHaveBeenCalledTimes(1);
    act(() => { hook.result.current.dispatch({ type: 'stay' }); }); expect(hook.result.current.ds.status).toBe('open'); expect(setPaused).toHaveBeenCalledTimes(1);
    act(() => { hook.result.current.requestClose(); }); act(() => { hook.result.current.dispatch({ type: 'leave' }); }); expect(hook.result.current.ds.status).toBe('closed'); expect(setPaused).toHaveBeenLastCalledWith(false);
  });
  test('the browser Back button closes the designer (no design) instead of leaving the showroom', () => {
    const { hook, hist, setPaused, onClosed } = make();
    act(() => { hook.result.current.open('kitchen-studio'); }); act(() => { hook.result.current.dispatch({ type: 'loaded' }); });
    act(() => { hist.stack.pop(); window.dispatchEvent(new PopStateEvent('popstate')); });          // the visitor pressed Back
    expect(hook.result.current.ds.status).toBe('closed'); expect(setPaused).toHaveBeenLastCalledWith(false); expect(onClosed).toHaveBeenCalledWith('back'); expect(hist.back).not.toHaveBeenCalled();   // already popped by the browser
  });
  test('Back with a design in progress puts the history entry back and asks for confirmation', () => {
    const { hook, hist } = make();
    act(() => { hook.result.current.open('kitchen-studio'); }); act(() => { hook.result.current.dispatch({ type: 'loaded' }); }); act(() => { hook.result.current.dispatch({ type: 'interact', n: 5 }); });
    act(() => { hist.stack.pop(); window.dispatchEvent(new PopStateEvent('popstate')); });
    expect(hook.result.current.ds.status).toBe('confirm'); expect(hist.state[HIST_KEY]).toBe('kitchen-studio'); expect(hist.pushState).toHaveBeenCalledTimes(2);
    act(() => { hook.result.current.dispatch({ type: 'leave' }); }); expect(hook.result.current.ds.status).toBe('closed'); expect(hist.back).toHaveBeenCalledTimes(1);
  });
  test('the designer navigating away (its Exit / a sent quote) closes it and resumes the showroom', () => {
    const { hook, setPaused, onClosed } = make();
    act(() => { hook.result.current.open('kitchen-studio'); }); act(() => { hook.result.current.dispatch({ type: 'loaded' }); }); act(() => { hook.result.current.dispatch({ type: 'left' }); });
    expect(hook.result.current.ds.status).toBe('closed'); expect(setPaused).toHaveBeenLastCalledWith(false); expect(onClosed).toHaveBeenCalledWith('exit');
  });
  test('retry after a failure writes the current language again and a re-open counts a new attempt', () => {
    const { hook, st, hist, setPaused } = make({ lang: 'en' });
    act(() => { hook.result.current.open('kitchen-studio'); }); act(() => { hook.result.current.dispatch({ type: 'fail', reason: 'timeout' }); }); expect(hook.result.current.ds.status).toBe('failed'); expect(setPaused).toHaveBeenCalledTimes(1);   // failure keeps the showroom paused under the failure screen
    st.setItem(LANG_KEY, 'ar'); hook.rerender({ lang: 'ar' }); act(() => { hook.result.current.dispatch({ type: 'retry' }); });
    expect(hook.result.current.ds).toMatchObject({ status: 'loading', attempt: 2 }); expect(st.m[LANG_KEY]).toBe('ar');
    act(() => { hook.result.current.dispatch({ type: 'close' }); }); expect(hist.stack).toHaveLength(1);
  });
  test('works without any history / storage (private mode, tests)', () => {
    const setPaused = jest.fn(); const { result } = renderHook(() => useDesigner({ lang: 'en', setPaused, storage: { getItem() { throw new Error('x'); }, setItem() { throw new Error('x'); } }, history: { state: null, pushState() { throw new Error('x'); }, back() { throw new Error('x'); } } }));
    act(() => { result.current.open('kitchen-studio'); }); expect(result.current.ds.status).toBe('loading'); act(() => { result.current.requestClose(); }); expect(result.current.ds.status).toBe('closed'); expect(setPaused).toHaveBeenLastCalledWith(false);
  });
});

describe('designerRendered', () => {
  const doc = (n, rs = 'complete') => ({ readyState: rs, querySelectorAll: () => ({ length: n }) });
  test('true only once the designer’s own buttons exist; false for the empty shell, loading documents and broken frames', () => {
    expect(designerRendered(doc(0))).toBe(false); expect(designerRendered(doc(2))).toBe(false); expect(designerRendered(doc(12))).toBe(true); expect(designerRendered(doc(12, 'loading'))).toBe(false); expect(designerRendered(null)).toBe(false); expect(designerRendered({ querySelectorAll() { throw new Error('x'); } })).toBe(false);
  });
});

describe('DesignerOverlay', () => {
  const st = (over) => ({ ...reduce(reduce(initialState, { type: 'open', sectionId: 'kitchen-studio' }), { type: 'loaded' }), ...over });
  const mount = (state, extra = {}) => { const dispatch = jest.fn(), onBack = jest.fn(), onLang = jest.fn(); const utils = render(<div className="host"><canvas data-testid="behind" /><button data-testid="behind-btn">x</button><DesignerOverlay state={state} dispatch={dispatch} lang="en" onBack={onBack} onLang={onLang} storage={store(extra.user ? { [USER_KEY]: '{"id":1}' } : {})} {...extra} /></div>); return { ...utils, dispatch, onBack, onLang }; };
  test('a labelled modal dialog with Back, Open on the website (new tab, noopener) and a language button; the showroom behind it becomes inert and is restored', () => {
    const { unmount } = mount(st({}));
    const dlg = screen.getByRole('dialog', { name: DS.frameAria.en }); expect(dlg).toHaveAttribute('aria-modal', 'true'); expect(dlg).toHaveAttribute('data-status', 'open');
    expect(screen.getByTestId('sr-ds-back')).toHaveTextContent(DS.back.en); expect(screen.getByTestId('sr-ds-back').querySelector('kbd')).toHaveTextContent('Esc');
    const site = screen.getByTestId('sr-ds-site'); expect(site).toHaveAttribute('href', '/design-studio/kitchen-planner?src=yas-bloom'); expect(site).toHaveAttribute('target', '_blank'); expect(site.getAttribute('rel')).toMatch(/noopener/);
    expect(screen.getByTestId('sr-ds-lang')).toHaveTextContent('العربية'); expect(screen.getByTestId('sr-ds-frame')).toHaveAttribute('src', '/design-studio/kitchen-planner?src=yas-bloom'); expect(screen.getByTestId('sr-ds-frame')).toHaveAttribute('title', DS.frameTitle.en);
    expect(screen.getByTestId('behind').inert).toBe(true); expect(screen.getByTestId('behind-btn').inert).toBe(true); expect(dlg.inert).toBeFalsy();
    unmount(); expect(screen.queryByTestId('behind')).toBeNull();
  });
  test('Back button and Esc ask the parent to leave', () => {
    const { onBack } = mount(st({})); fireEvent.click(screen.getByTestId('sr-ds-back')); expect(onBack).toHaveBeenCalledTimes(1);
    fireEvent.keyDown(screen.getByTestId('sr-ds-back'), { key: 'Escape' }); expect(onBack).toHaveBeenCalledTimes(2);
  });
  test('loading shows the status veil with the sign-in note only for signed-out visitors', () => {
    const a = mount(st({ status: 'loading' })); expect(screen.getByTestId('sr-ds-loading')).toHaveTextContent(DS.loading.en); expect(screen.getByTestId('sr-ds-loading')).toHaveTextContent(DS.signInNote.en); a.unmount();
    mount(st({ status: 'loading' }), { user: true }); expect(screen.getByTestId('sr-ds-loading')).not.toHaveTextContent(DS.signInNote.en);
  });
  test('a load failure shows a clear message, Try again, a link to the website designer in a new tab, and Back; the frame is gone', () => {
    const { dispatch, onBack } = mount(st({ status: 'failed', reason: 'timeout' }));
    const box = screen.getByTestId('sr-ds-failed'); expect(box).toHaveAttribute('role', 'alert'); expect(box).toHaveTextContent(DS.failTitle.en); expect(screen.queryByTestId('sr-ds-frame')).toBeNull();
    const link = screen.getByTestId('sr-ds-failed-site'); expect(link).toHaveAttribute('href', '/design-studio/kitchen-planner?src=yas-bloom'); expect(link).toHaveAttribute('target', '_blank');
    fireEvent.click(screen.getByTestId('sr-ds-retry')); expect(dispatch).toHaveBeenCalledWith({ type: 'retry' });
    fireEvent.click(screen.getByText(DS.back.en, { selector: '.sr-ds-veil button' })); expect(onBack).toHaveBeenCalled();
  });
  test('the leave confirmation offers Keep designing / Back to the showroom', () => {
    const { dispatch } = mount(st({ status: 'confirm', interactions: 9 }));
    expect(screen.getByTestId('sr-ds-confirm')).toHaveAttribute('role', 'alertdialog'); fireEvent.click(screen.getByTestId('sr-ds-stay')); expect(dispatch).toHaveBeenCalledWith({ type: 'stay' }); fireEvent.click(screen.getByTestId('sr-ds-leave')); expect(dispatch).toHaveBeenCalledWith({ type: 'leave' });
    fireEvent.keyDown(screen.getByTestId('sr-ds-back'), { key: 'Escape' }); expect(dispatch).toHaveBeenLastCalledWith({ type: 'stay' });   // Esc while confirming = keep designing
  });
  test('Arabic: right-to-left, translated frame, language button offers English', () => {
    const dispatch = jest.fn(); render(<DesignerOverlay state={st({})} dispatch={dispatch} lang="ar" onBack={() => {}} onLang={() => {}} storage={store()} />);
    const dlg = screen.getByRole('dialog'); expect(dlg).toHaveAttribute('dir', 'rtl'); expect(dlg).toHaveAttribute('aria-label', DS.frameAria.ar); expect(screen.getByTestId('sr-ds-back')).toHaveTextContent(DS.back.ar); expect(screen.getByTestId('sr-ds-lang')).toHaveTextContent('English'); expect(dlg.querySelector('.sr-ds-title b')).toHaveTextContent('استوديو تصميم المطابخ');
  });
  test('language button calls the parent', () => { const { onLang } = mount(st({})); fireEvent.click(screen.getByTestId('sr-ds-lang')); expect(onLang).toHaveBeenCalledTimes(1); });
});
