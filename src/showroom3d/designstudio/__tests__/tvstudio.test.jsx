/* The TV Unit Studio: the second section on the shared design wall (registry entry, one station for two sections, the Neo studio embed, guest access, language switch,
 * adviser intents, the chooser, the overlay). The kitchen section's own behaviour stays covered by designstudio.test.js. */
import fs from 'fs';
import path from 'path';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { SECTIONS, SECTION_DEPTS, STATION_NAME, sectionById, sectionByKind, enabledSections, stationSections, stationName, zoneStationName, sectionShort, posterUrls } from '../sections';
import { studioZones, studioColliders, withDesignStudio, placement, firstOfEachSlot, tierOf } from '../layout';
import { sdt, dt, DS } from '../strings';
import { buildEmbedUrl, stillOnDesigner, frameShift, scrollOffset, embedCss, EMBED_CSS, isSignedIn, needsSignIn, designerRendered, switchDesignerLanguage, designerLanguageIs, designStudioIntent, designStudioReply, designStudioServices, adviserChips, GO_TOKEN, OPEN_TOKEN, reduce, initialState } from '../logic';
import DesignerOverlay from '../DesignerOverlay';
import StudioChooser from '../StudioChooser';
import { buildGraph, routeTo } from '../../navigation/navgraph';
import { buildColliders } from '../../navigation/colliders';
import { violation, opening } from '../../staff/guide';
import { staffRoster } from '../../staff/roster';

const K = sectionById('kitchen-studio'), TV = sectionById('tv-studio');
const SRC = (f) => fs.readFileSync(path.resolve(__dirname, '../../../' + f), 'utf8');   // src/<f>
const store = (init = {}) => { const m = { ...init }; return { getItem: (k) => (k in m ? m[k] : null), setItem: (k, v) => { m[k] = String(v); } }; };

describe('the TV section in the registry', () => {
  test('it is the Neo TV Unit Designer of the website (/studio/tv), enabled, on the left wing with the kitchen, answered by the living adviser', () => {
    expect(TV).toMatchObject({ id: 'tv-studio', kind: 'tv', enabled: true, slot: 'left-wing', adviser: 'living' });
    expect(TV.name).toEqual({ en: 'TV Unit Studio', ar: 'استوديو وحدات التلفزيون' }); expect(TV.designer.path).toBe('/studio/tv'); expect(TV.designer.siteName.en).toBe('Neo TV Unit Designer');
    expect(sectionByKind('tv')).toBe(TV); expect(enabledSections()).toEqual([K, TV]); expect(stationSections(K)).toEqual([K, TV]); expect(stationSections(TV)).toEqual([K, TV]);
    expect(SECTION_DEPTS.map((d) => d.id)).toEqual(['kitchen-studio', 'tv-studio']);
  });
  test('the website really has this designer on this route: the Neo studio list, the studio shell and the category app carry what the embed relies on (drift guard)', () => {
    const designers = SRC('studio/designers.js'), root = SRC('studio/StudioRoot.jsx'), app = SRC('studio/hub/neoCategories/NeoCategoryApp.jsx'), css = SRC('studio/studio.css'), studio = SRC('studio/hub/neoCategories/CategoryStudio.jsx');
    expect(designers).toMatch(/kind: 'tv', en: 'Neo TV Unit Designer'/); expect(designers).toContain("keys: ['neo_cat_tv_v1']"); expect(designers).toContain("import('./hub/NeoTvDesigner')");
    expect(root).toContain("window.location.pathname || '/studio'"); expect(root).toContain('className="ws-bar"'); expect(root).toContain('className="ws-lang"');
    expect(app).toContain('data-testid={`cat-page-${cfg.id}`}'); expect(SRC('studio/hub/neoCategories/configs/tv.js')).toMatch(/id: 'tv'/);
    expect(css).toContain('--ws-bar-h: 56px'); expect(css).toContain('--studio-h: calc(100dvh - var(--ws-bar-h))'); expect(studio).toContain('className="nk-lang"');
  });
  test('GUEST ACCESS: the studio shell mounts the designer without any sign-in check (only a saved design id needs a session); Save / Request a quote need a real session', () => {
    const root = SRC('studio/StudioRoot.jsx'), i = root.indexOf('function DesignerPage'), body = root.slice(i, root.indexOf('function DesignBar'));
    expect(body.indexOf('if (!designId)')).toBeGreaterThan(-1); expect(body.indexOf('if (!designId)')).toBeLessThan(body.indexOf('if (!getSession())'));
    expect(body).toContain('<Comp toast={toast} currentUser={null}'); expect(root).not.toMatch(/plannerLocked|PlannerLoginGate/);
    const quote = SRC('studio/QuoteDialog.jsx'); expect(quote).toContain('if (!(await ensureSignedIn())) return;'); expect((quote.match(/rpc\('cp_studio_/g) || []).length).toBeGreaterThanOrEqual(2);   // every write goes through rpc(), which throws without a session
    const auth = SRC('studio/customerAuth.js'); expect(auth).toContain("if (!t) { const e = new Error('not_signed_in')");
    expect(SRC('App.js')).toContain("'tv-planner'"); expect(SRC('App.js')).toMatch(/PLANNER_PAGES = \[[^\]]*'tv-planner'/);   // the CLASSIC planner is the one that is gated: that is why the Neo designer is the right one
    expect(TV.designer.auth).toMatchObject({ required: false, key: 'closets_studio_auth_v1' }); expect(auth).toContain("SESSION_KEY = 'closets_studio_auth_v1'");
  });
  test('poster frames: three per language, WebP 1600 x 900, <= 200 KB each, for every section', () => {
    for (const s of SECTIONS) for (const lang of ['en', 'ar']) { const urls = posterUrls(s, lang, ''); expect(urls).toHaveLength(3); for (const u of urls) {
      const b = fs.readFileSync(path.resolve(__dirname, '../../../../public' + u)); expect(b.slice(0, 4).toString()).toBe('RIFF'); expect(b.slice(8, 12).toString()).toBe('WEBP'); expect(b.length).toBeLessThanOrEqual(200 * 1024);
      expect(b.slice(12, 16).toString()).toBe('VP8 '); const w = b.readUInt16LE(26) & 0x3fff, h = b.readUInt16LE(28) & 0x3fff; expect([w, h]).toEqual([1600, 900]);
    } }
    expect(posterUrls(TV, 'en', '')[0]).toBe('/yas-bloom/design-studio/tv-1-en.webp'); expect(posterUrls(TV, 'ar', '')[2]).toBe('/yas-bloom/design-studio/tv-3-ar.webp');
  });
  test('every string a section overrides has English and Arabic; the TV overrides pass the advisers\' guardrails (no digits, currency, promises); sdt falls back to the kitchen defaults', () => {
    for (const [k, v] of Object.entries(TV.text)) { expect(v.en.trim()).not.toBe(''); expect(v.ar).toMatch(/[؀-ۿ]/); expect(DS[k]).toBeTruthy(); }
    for (const k of ['guideGo', 'guideOpen', 'guideGoReply', 'guideOpenReply', 'guideBlurb', 'tagline']) for (const l of ['en', 'ar']) expect([k, l, violation(sdt(TV, k, l))]).toEqual([k, l, null]);
    expect(sdt(TV, 'back', 'en')).toBe(DS.back.en); expect(sdt(K, 'loading', 'en')).toBe(DS.loading.en); expect(sdt(TV, 'loading', 'ar')).toBe('جارٍ فتح استوديو وحدات التلفزيون'); expect(sdt(null, 'back', 'ar')).toBe(DS.back.ar);
    expect(sdt(TV, 'signInNote', 'en')).toMatch(/No account needed to design/); expect(sdt(K, 'signInNote', 'en')).toMatch(/may be asked to sign in/);
  });
});

describe('two sections, ONE station (one screen, one podium, one zone, one collider set)', () => {
  test('one zone carries both section ids and is named "Design Studios"; the kitchen\'s zone id and index are unchanged', () => {
    const z = studioZones(); expect(z).toHaveLength(1); expect(z[0]).toMatchObject({ id: 'kitchen-studio', sectionId: 'kitchen-studio', sectionIds: ['kitchen-studio', 'tv-studio'], index: 11, designStudio: true, en: STATION_NAME.en, ar: STATION_NAME.ar });
    expect(STATION_NAME).toEqual({ en: 'Design Studios', ar: 'استوديوهات التصميم' }); expect(STATION_NAME.ar).not.toBe('استوديو التصميم');   // that Arabic name already belongs to the Custom Studio bay
    expect(zoneStationName('kitchen-studio', 'en')).toBe('Design Studios'); expect(zoneStationName('tv-studio', 'ar')).toBe('استوديوهات التصميم'); expect(zoneStationName('kitchens', 'en')).toBeNull();
  });
  test('the colliders are the same two boxes as with one section (a shared wall is not blocked twice)', () => {
    expect(studioColliders().map((c) => c.id)).toEqual(['kitchen-studio-wall', 'kitchen-studio-podium']); expect(studioColliders([K])).toEqual(studioColliders([K, TV])); expect(firstOfEachSlot([K, TV])).toEqual([K]);
    expect(placement(TV)).toEqual({ ...placement(K), id: 'tv-studio' });
  });
  test('with the TV section off everything is exactly the original Kitchen Design Studio: its own name on the zone and sign, one section', () => {
    const only = [K]; expect(studioZones(only)[0]).toMatchObject({ en: 'Kitchen Design Studio', ar: 'استوديو تصميم المطابخ', sectionIds: ['kitchen-studio'] }); expect(stationName(only, 'en')).toBe('Kitchen Design Studio'); expect(stationName([K, TV], 'ar')).toBe('استوديوهات التصميم');
    expect(zoneStationName('kitchen-studio', 'en', [K])).toBeNull(); expect(withDesignStudio(buildGraph(), only).stops.filter((s) => s.designStudio).map((s) => s.id)).toEqual(['kitchen-studio']);
    expect(designStudioReply('open the designer', { sections: only, room: 'living' }).auto).toMatchObject({ id: 'kitchen-studio' });
  });
  test('both sections have a quick-nav stop at the same stand point and a clear route from the street and from each other', () => {
    const g = withDesignStudio(buildGraph()), open = buildColliders({ doorOpen: 1 }); const a = g.stops.find((s) => s.id === 'kitchen-studio'), b = g.stops.find((s) => s.id === 'tv-studio');
    expect(b.stand).toEqual(a.stand); expect(b.index).toBe(a.index + 1); expect(b.pitch).toBe(a.pitch);
    for (const id of ['kitchen-studio', 'tv-studio']) for (const from of [[0, -3.5], [-20, -20], [0, 8], [20, -3]]) { const r = routeTo(g, from, id, open); expect(r && r.points[r.points.length - 1]).toEqual(a.stand); }
  });
  test('tiers: the still low tier keeps one frame per section (they alternate), medium / high keep three each', () => { expect(tierOf('low').frames).toBe(1); expect(tierOf('high').frames).toBe(3); expect(sectionShort(TV, 'en')).toBe('TV unit'); expect(sectionShort(K, 'ar')).toBe('مطبخ'); });
});

describe('the Neo studio embed: no header, guest friendly, same origin', () => {
  test('the frame URL is the studio route (site-relative) with the attribution parameter; leaving it ends the session', () => {
    expect(buildEmbedUrl(TV)).toBe('/studio/tv?src=yas-bloom'); expect(buildEmbedUrl(K)).toBe('/design-studio/kitchen-planner?src=yas-bloom');
    expect(stillOnDesigner('/studio/tv', TV)).toBe(true); expect(stillOnDesigner('/studio/tv/', TV)).toBe(true); for (const p of ['/studio', '/studio/account', '/studio/kitchen', '/', '/design-studio/tv-planner']) expect(stillOnDesigner(p, TV)).toBe(false);
  });
  test('the studio shell\'s 56 px bar is hidden and the designer takes its height (no frame shift, no phone scroll); the kitchen keeps the 104 / 72 px classic values', () => {
    expect([frameShift(1440, TV), frameShift(390, TV), scrollOffset(1440, TV), scrollOffset(390, TV)]).toEqual([0, 0, 0, 0]);
    expect([frameShift(1440, K), frameShift(390, K), scrollOffset(390, K), scrollOffset(1440, K)]).toEqual([104, 0, 72, 0]); expect([frameShift(1440), scrollOffset(390)]).toEqual([104, 72]);
    expect(embedCss(K)).toBe(EMBED_CSS); expect(embedCss(null)).toBe(EMBED_CSS); expect(embedCss(TV)).toContain('.ws-bar{display:none!important}'); expect(embedCss(TV)).toContain('--ws-bar-h:0px'); expect(embedCss(TV)).not.toMatch(/button|\.nk|#root|cat-/);
  });
  test('readiness: the TV designer is ready when its own page element exists (the shell has buttons long before); the kitchen still uses its button count', () => {
    const doc = (hit, n = 0, rs = 'complete') => ({ readyState: rs, querySelector: (sel) => (sel === '[data-testid="cat-page-tv"]' ? hit : null), querySelectorAll: () => ({ length: n }) });
    expect(designerRendered(doc({}, 0), TV)).toBe(true); expect(designerRendered(doc(null, 9), TV)).toBe(false); expect(designerRendered(doc({}, 0, 'loading'), TV)).toBe(false); expect(designerRendered(doc(null, 9), K)).toBe(true); expect(designerRendered(doc(null, 2), K)).toBe(false);
  });
  test('signed-in detection per section: the kitchen reads closets_user, the studio reads its own session; a guest is signed out for both; nothing needs an account to design the TV unit', () => {
    const guest = store(), kit = store({ closets_user: '{"id":"u"}' }), stu = store({ closets_studio_auth_v1: '{"access_token":"t","user":{}}' }), junk = store({ closets_studio_auth_v1: '{"user":{}}' });
    expect([isSignedIn(guest, K), isSignedIn(guest, TV), isSignedIn(kit, K), isSignedIn(kit, TV), isSignedIn(stu, TV), isSignedIn(stu, K), isSignedIn(junk, TV)]).toEqual([false, false, true, false, true, false, false]);
    expect(isSignedIn(guest)).toBe(false); expect(isSignedIn(kit)).toBe(true); expect(needsSignIn(K)).toBe(true); expect(needsSignIn(TV)).toBe(false); expect(needsSignIn(null)).toBe(false);
  });
  const fakeStudioDoc = (startLang = 'en') => {   // the studio's EN / ع group, the shell's toggle and <html lang>
    document.documentElement.lang = startLang; document.body.innerHTML = '<div class="nk-lang"><button class="nk-seg-b" aria-pressed="true">EN</button><button class="nk-seg-b" aria-pressed="false">ع</button></div><button class="ws-lang">ع</button>';
    const [en, ar] = document.querySelectorAll('.nk-seg-b'), shell = document.querySelector('.ws-lang'), calls = { en: 0, ar: 0, shell: 0 };
    const set = (l) => { en.setAttribute('aria-pressed', String(l === 'en')); ar.setAttribute('aria-pressed', String(l === 'ar')); };
    en.onclick = () => { calls.en++; set('en'); }; ar.onclick = () => { calls.ar++; set('ar'); }; shell.onclick = () => { calls.shell++; document.documentElement.lang = document.documentElement.lang === 'ar' ? 'en' : 'ar'; };
    return { doc: document, calls };
  };
  test('language switch while open: clicks the studio\'s own EN / ع button and the shell toggle only when they differ; nothing is clicked when already right; reports whether it took', () => {
    const f = fakeStudioDoc('en'); expect(switchDesignerLanguage(f.doc, 'ar', TV)).toBe(true); expect(f.calls).toEqual({ en: 0, ar: 1, shell: 1 }); expect(designerLanguageIs(f.doc, 'ar', TV)).toBe(true);
    expect(switchDesignerLanguage(f.doc, 'ar', TV)).toBe(true); expect(f.calls).toEqual({ en: 0, ar: 1, shell: 1 });   // idempotent
    expect(switchDesignerLanguage(f.doc, 'en', TV)).toBe(true); expect(f.calls).toEqual({ en: 1, ar: 1, shell: 2 }); expect(designerLanguageIs(f.doc, 'en', TV)).toBe(true);
    const g = fakeStudioDoc('en'); g.doc.querySelector('.ws-lang').onclick = () => {}; switchDesignerLanguage(g.doc, 'ar', TV); expect(designerLanguageIs(g.doc, 'ar', TV)).toBe(false);   // a shell that did not switch: the overlay reloads instead
    expect(switchDesignerLanguage({ documentElement: {}, querySelectorAll() { throw new Error('x'); } }, 'ar', TV)).toBe(false);
  });
  test('the classic kitchen planner still switches through its nav button [title="Language"]', () => {
    document.documentElement.lang = 'en'; document.body.innerHTML = '<nav><button title="Language">AR</button></nav>'; let n = 0; document.querySelector('button').onclick = () => { n++; document.documentElement.lang = 'ar'; };
    expect(switchDesignerLanguage(document, 'ar', K)).toBe(true); expect(n).toBe(1); expect(designerLanguageIs(document, 'ar', K)).toBe(true); expect(switchDesignerLanguage(document, 'ar', K)).toBe(true); expect(n).toBe(1);
  });
});

describe('advisers and the two sections', () => {
  const rep = (t, o = {}) => designStudioReply(t, { lang: /[؀-ۿ]/.test(t) ? 'ar' : 'en', ...o });
  test('words that name the TV unit open / walk to the TV section, whoever is asked', () => {
    for (const t of ['design my tv unit', 'I want to design a TV wall', 'open the tv designer', 'launch the tv unit planner', 'plan my tv', 'media wall designer', 'صمم وحدة التلفزيون', 'افتح مصمم وحدات التلفزيون', OPEN_TOKEN('tv-studio')]) for (const room of [undefined, 'kitchens', 'reception']) { const r = rep(t, { room }); expect([t, room, r && r.auto && r.auto.id]).toEqual([t, room, 'tv-studio']); expect(r.intent).toBe('designer-open'); }
    for (const t of ['take me to the tv unit studio', 'where is the TV studio', 'استوديو وحدات التلفزيون', GO_TOKEN('tv-studio')]) { const r = rep(t); expect([t, r && r.intent, r.auto.id]).toEqual([t, 'designer-go', 'tv-studio']); expect(r.actions.map((a) => a.type)).toEqual(['glide', 'designer']); }
    expect(rep('design my tv unit').text).toBe(sdt(TV, 'guideOpenReply', 'en')); expect(rep('صمم وحدة التلفزيون').text).toBe(sdt(TV, 'guideOpenReply', 'ar'));
  });
  test('words that name the kitchen still open the kitchen; the generic "open the designer" is the adviser\'s own section; Reception (no section of her own) asks which', () => {
    expect(rep('design my kitchen', { room: 'living' }).auto.id).toBe('kitchen-studio'); expect(rep('open the designer', { room: 'kitchens' }).auto.id).toBe('kitchen-studio'); expect(rep('start designing', { room: 'living' }).auto.id).toBe('tv-studio');
    expect(rep('open the designer').auto.id).toBe('kitchen-studio');                                    // no adviser given: the first section, as before the TV studio existed
    const ask = rep('open the designer', { room: 'reception' }); expect(ask.intent).toBe('designer-choose'); expect(ask.auto).toBeNull(); expect(ask.chips.map((c) => c.token)).toEqual([OPEN_TOKEN('kitchen-studio'), OPEN_TOKEN('tv-studio')]);
    expect(rep('افتح المصمم', { room: 'living' }).auto.id).toBe('tv-studio'); expect(rep('افتح المصمم', { room: 'reception' }).intent).toBe('designer-choose');
  });
  test('nothing else is hijacked: the existing TV / living bay questions and the Custom Studio stay with the old brain', () => {
    for (const t of ['take me to the tv units', 'show me the living room', 'do you make tv units', 'take me to the custom studio', 'a tv unit with a fireplace', 'I need an interior designer', 'مرحبا', 'وحدات التلفزيون']) expect([t, rep(t, { room: 'living' })]).toEqual([t, null]);
  });
  test('chips: the living adviser offers the TV pair, the kitchens adviser the kitchen pair (in the opening line); Reception lists both stations', () => {
    const tokens = (id) => { const st = staffRoster().find((s) => s.id === id); return opening({ id: st.id, room: st.room, name: st.name, first: st.first }, 'en').chips.map((c) => c.token); };
    expect(tokens('living')).toEqual(expect.arrayContaining([GO_TOKEN('tv-studio'), OPEN_TOKEN('tv-studio')])); expect(tokens('living')).not.toContain(OPEN_TOKEN('kitchen-studio')); expect(tokens('kitchens')).not.toContain(OPEN_TOKEN('tv-studio'));
    expect(adviserChips('living').map((c) => c.label.en)).toEqual([sdt(TV, 'guideGo', 'en'), sdt(TV, 'guideOpen', 'en')]);
    expect(designStudioServices('en').map((x) => x.label)).toEqual(['Kitchen Design Studio', 'TV Unit Studio']); expect(designStudioServices('ar')[1]).toMatchObject({ label: 'استوديو وحدات التلفزيون', blurb: sdt(TV, 'guideBlurb', 'ar') });
    expect(designStudioIntent('open the designer', TV)).toBe('open'); expect(designStudioIntent('open the designer', TV, { generic: false })).toBeNull();
  });
  test('every reply and chip passes the guardrails in both languages', () => {
    for (const l of ['en', 'ar']) for (const t of ['design my tv unit', 'take me to the tv unit studio', 'open the designer']) { const r = rep(t === 'open the designer' ? t : t, { lang: l, room: t === 'open the designer' ? 'reception' : undefined }); expect(violation(r.text)).toBeNull(); for (const c of [...r.chips, ...r.actions]) for (const k of ['en', 'ar']) expect(violation(c.label[k])).toBeNull(); }
    for (const k of ['stationTagline', 'chooseTitle', 'chooseHint', 'tabletPick', 'guideChoose']) for (const l of ['en', 'ar']) expect([k, l, violation(DS[k][l])]).toEqual([k, l, null]);
  });
});

describe('the chooser ("Which studio?")', () => {
  test('one card per section with its own poster, named in the language; choosing calls back with the section id; Close and Esc leave', () => {
    const onPick = jest.fn(), onClose = jest.fn(); const { unmount } = render(<StudioChooser lang="en" sections={enabledSections()} onPick={onPick} onClose={onClose} />);
    const dlg = screen.getByRole('dialog'); expect(dlg).toHaveAttribute('aria-modal', 'true'); expect(dlg).toHaveTextContent('Design Studios'); expect(dlg).toHaveAttribute('dir', 'ltr');
    expect(screen.getByTestId('sr-ds-pick-kitchen-studio')).toHaveTextContent('Kitchen Design Studio'); expect(screen.getByTestId('sr-ds-pick-tv-studio')).toHaveTextContent('TV Unit Studio'); expect(screen.getByTestId('sr-ds-pick-tv-studio').querySelector('img')).toHaveAttribute('src', '/yas-bloom/design-studio/tv-1-en.webp');
    expect(document.activeElement).toBe(screen.getByTestId('sr-ds-pick-kitchen-studio'));              // the first card has focus
    fireEvent.click(screen.getByTestId('sr-ds-pick-tv-studio')); expect(onPick).toHaveBeenCalledWith('tv-studio'); fireEvent.click(screen.getByTestId('sr-ds-choose-close')); expect(onClose).toHaveBeenCalledTimes(1);
    fireEvent.keyDown(dlg, { key: 'Escape' }); expect(onClose).toHaveBeenCalledTimes(2); unmount();
  });
  test('Arabic: right-to-left, Arabic names and Arabic posters', () => {
    render(<StudioChooser lang="ar" sections={enabledSections()} onPick={() => {}} onClose={() => {}} />);
    const dlg = screen.getByRole('dialog'); expect(dlg).toHaveAttribute('dir', 'rtl'); expect(dlg).toHaveTextContent('استوديوهات التصميم'); expect(screen.getByTestId('sr-ds-pick-tv-studio')).toHaveTextContent('استوديو وحدات التلفزيون'); expect(screen.getByTestId('sr-ds-pick-kitchen-studio').querySelector('img')).toHaveAttribute('src', '/yas-bloom/design-studio/kitchen-1-ar.webp');
  });
});

describe('DesignerOverlay for the TV section', () => {
  const st = (over, id = 'tv-studio') => ({ ...reduce(reduce(initialState, { type: 'open', sectionId: id }), { type: 'loaded' }), ...over });
  const mount = (state, user) => render(<div><DesignerOverlay state={state} dispatch={jest.fn()} lang="en" onBack={() => {}} onLang={() => {}} storage={store(user ? { closets_studio_auth_v1: '{"access_token":"t"}' } : {})} /></div>);
  test('frames /studio/tv, un-shifted, named for the TV designer; "Open on the website" opens the same route in a new tab', () => {
    mount(st({})); const frame = screen.getByTestId('sr-ds-frame'); expect(frame).toHaveAttribute('src', '/studio/tv?src=yas-bloom'); expect(frame).toHaveAttribute('title', sdt(TV, 'frameTitle', 'en')); expect(frame.style.marginTop).toBe('0px');
    expect(screen.getByRole('dialog')).toHaveAttribute('aria-label', 'TV unit designer'); expect(screen.getByRole('dialog')).toHaveAttribute('data-section', 'tv-studio'); expect(screen.getByRole('dialog').querySelector('.sr-ds-title b')).toHaveTextContent('TV Unit Studio');
    const site = screen.getByTestId('sr-ds-site'); expect(site).toHaveAttribute('href', '/studio/tv?src=yas-bloom'); expect(site).toHaveAttribute('target', '_blank');
  });
  test('the loading screen tells a guest "no account needed to design" (not "you may be asked to sign in"), and says nothing to a signed-in visitor', () => {
    const a = mount(st({ status: 'loading' })); expect(screen.getByTestId('sr-ds-loading')).toHaveTextContent('Opening the TV Unit Studio'); expect(screen.getByTestId('sr-ds-note')).toHaveTextContent('No account needed to design'); expect(screen.getByTestId('sr-ds-loading')).not.toHaveTextContent('may be asked to sign in'); a.unmount();
    mount(st({ status: 'loading' }), true); expect(screen.queryByTestId('sr-ds-note')).toBeNull();
  });
  test('the leave confirmation says the design stays in this browser (the studio autosaves) and how to send it to the team', () => {
    mount(st({ status: 'confirm', interactions: 9 })); expect(screen.getByTestId('sr-ds-confirm')).toHaveTextContent('stays in this browser'); expect(screen.getByTestId('sr-ds-confirm')).toHaveTextContent('Get quote');
  });
  test('the kitchen overlay is unchanged: classic frame shift, the "may be asked to sign in" note', () => {
    mount(st({ status: 'loading' }, 'kitchen-studio')); expect(screen.getByTestId('sr-ds-frame').style.marginTop).toBe('-104px'); expect(screen.getByTestId('sr-ds-note')).toHaveTextContent('may be asked to sign in'); expect(screen.getByRole('dialog')).toHaveAttribute('aria-label', DS.frameAria.en);
  });
});
