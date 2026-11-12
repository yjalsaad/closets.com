import { PAGES, INDEXABLE, buildHead, splitLangPath, withLang, LEGACY_REDIRECTS, isKnownPage } from './routes';
import { SITE_URL, ENABLE_AR_URLS } from './siteConfig';
import { formatBHD, formatBHDRange, formatDate, formatNumber } from '../i18n/format';
import vercel from '../../vercel.json';

describe('route registry', () => {
  test('every page has authored EN + AR title and description', () => {
    PAGES.forEach((p) => {
      ['en', 'ar'].forEach((L) => {
        const [t, d] = p.meta[L];
        expect(t && t.length).toBeGreaterThan(5);
        expect(d && d.length).toBeGreaterThan(5);
      });
      expect(/[؀-ۿ]/.test(p.meta.ar[0])).toBe(true); // Arabic title really is Arabic
    });
  });
  test('required routes exist and are indexable', () => {
    ['/', '/kitchen', '/wardrobes', '/tv', '/doors', '/office', '/gallery', '/blog', '/careers', '/warranty', '/maintenance', '/booking', '/contact', '/faq', '/about']
      .forEach((path) => expect(INDEXABLE.some((p) => p.path === path)).toBe(true));
  });
  test('planners, cart, signin, checkout are noindex', () => {
    ['planner', 'kitchen-planner', 'cart', 'portal', 'checkout'].forEach((id) => expect(buildHead(id, 'en').robots).toMatch(/noindex/));
  });
  test('titles are unique per language', () => {
    ['en', 'ar'].forEach((L) => {
      const t = INDEXABLE.map((p) => p.meta[L][0]);
      expect(new Set(t).size).toBe(t.length);
    });
  });
});

describe('head + JSON-LD', () => {
  test('canonical/og:url use SITE_URL only and are language specific', () => {
    const en = buildHead('kitchen', 'en'); const ar = buildHead('kitchen', 'ar');
    expect(en.canonical).toBe(SITE_URL + '/kitchen');
    expect(ar.canonical).toBe(ENABLE_AR_URLS ? SITE_URL + '/ar/kitchen' : SITE_URL + '/kitchen');
    expect(en.og.image.startsWith(SITE_URL)).toBe(true);
    expect(ar.title).not.toBe(en.title);
  });
  test('hreflang en/ar/x-default', () => {
    const h = buildHead('home', 'ar');
    if (ENABLE_AR_URLS) expect(h.alternates.map((a) => a.hreflang)).toEqual(['en', 'ar', 'x-default']);
  });
  test('JSON-LD is valid JSON, has breadcrumb, no invented ratings', () => {
    INDEXABLE.forEach((p) => ['en', 'ar'].forEach((L) => {
      const ld = JSON.parse(JSON.stringify(buildHead(p.page, L).jsonld));
      const types = ld['@graph'].map((n) => n['@type']);
      expect(types).toContain('HomeGoodsStore');
      if (p.page !== 'home') expect(types).toContain('BreadcrumbList');
      expect(JSON.stringify(ld)).not.toMatch(/aggregateRating|"review"/);
      const biz = ld['@graph'].find((n) => n['@type'] === 'HomeGoodsStore');
      expect(biz.telephone).toBe('+973 17555095');
    }));
  });
  test('unknown page -> noindex, no canonical; dynamic CMS pages are known', () => {
    const nf = buildHead(null, 'en');
    expect(nf.robots).toMatch(/noindex/); expect(nf.canonical).toBeNull();
    expect(isKnownPage('does-not-exist')).toBe(false);
    expect(isKnownPage('product-123')).toBe(true);
  });
});

describe('language URLs', () => {
  test('split/with round trip', () => {
    if (!ENABLE_AR_URLS) return;
    expect(splitLangPath('/ar/kitchen')).toEqual({ lang: 'ar', path: '/kitchen' });
    expect(splitLangPath('/ar')).toEqual({ lang: 'ar', path: '/' });
    expect(splitLangPath('/kitchen')).toEqual({ lang: 'en', path: '/kitchen' });
    expect(withLang('/', 'ar')).toBe('/ar');
    expect(withLang('/kitchen', 'en')).toBe('/kitchen');
    expect(withLang('/studio/x', 'ar')).toBe('/studio/x');
  });
  test('vercel.json redirects cover every legacy path, EN and AR, as 301/308 permanent', () => {
    Object.entries(LEGACY_REDIRECTS).forEach(([from, to]) => {
      const r = vercel.redirects.find((x) => x.source === from);
      expect(r && r.destination).toBe(to); expect(r.permanent).toBe(true);
    });
  });
  test('no catch-all rewrite (unknown URLs must 404)', () => {
    expect(vercel.rewrites.some((r) => r.source === '/(.*)')).toBe(false);
  });
});

describe('formatting', () => {
  test('BHD', () => {
    expect(formatBHD(1234.5, 'en')).toBe('BD 1,234.500');
    expect(formatBHD(1234.5, 'ar')).toBe('1,234.500 د.ب');
    expect(formatBHD(60, 'en', { whole: true })).toBe('BD 60');
    expect(formatBHDRange(4500, 9000, 'en')).toBe('BD 4,500 – 9,000');
    expect(formatBHDRange(4500, 9000, 'ar')).toBe('4,500 – 9,000 د.ب');
    expect(formatNumber(NaN, 'en', 3)).toBe('0.000');
  });
  test('dates are locale aware, Gregorian, Latin digits', () => {
    expect(formatDate('2026-11-12T10:00:00Z', 'en')).toBe('12/11/2026');
    expect(formatDate('2026-11-12T10:00:00Z', 'ar')).toMatch(/2026/);
    expect(formatDate('2026-11-12T10:00:00Z', 'ar', 'medium')).toMatch(/[؀-ۿ]/);
    expect(formatDate('garbage', 'en')).toBe('');
  });
});
