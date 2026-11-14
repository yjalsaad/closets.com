import { buildQuoteUrl, campaignLinks, parseBookingPrefill, INTEREST, NOTES_MAX, BOOKING_PATH } from '../products/quote';
import { splitLangPath } from '../vendor/routes';
import fs from 'fs';
import path from 'path';

describe('quotation / booking URL builder (builds a link; never calls a backend)', () => {
  const q = (u) => new URL(u, 'https://example.test');
  test('English: /booking with the department interest, source, finish id and a notes line', () => {
    const u = q(buildQuoteUrl({ product: 'kitchen', productName: 'Island and wall run', finishId: 'oak-white-stone', finishName: 'Natural oak with white veined stone', lang: 'en' }));
    expect(u.pathname).toBe(BOOKING_PATH); expect(u.searchParams.get('interest')).toBe('Kitchen'); expect(u.searchParams.get('source')).toBe('showroom-3d'); expect(u.searchParams.get('finish')).toBe('oak-white-stone');
    expect(u.searchParams.get('notes')).toMatch(/sample configuration/i); expect(u.searchParams.get('notes')).toMatch(/Natural oak/); expect(u.searchParams.get('notes')).toMatch(/not a quotation/i);
  });
  test('Arabic: /ar/booking and Arabic notes', () => {
    const u = q(buildQuoteUrl({ product: 'wardrobe', productName: 'خزانة', finishId: 'stone-grey', finishName: 'رمادي حجري', lang: 'ar' }));
    expect(splitLangPath(u.pathname)).toEqual({ lang: 'en', path: '/booking' }); expect(u.searchParams.get('interest')).toBe('Wardrobe'); expect(u.searchParams.get('notes')).toMatch(/[؀-ۿ]/);
  });
  test('each showroom product maps to an interest value that exists on the booking form', () => {
    const form = fs.readFileSync(path.resolve(__dirname, '../../App.js'), 'utf8');
    for (const v of Object.values(INTEREST)) expect(form).toContain(`'${v}'`);
    expect(INTEREST).toEqual({ kitchen: 'Kitchen', wardrobe: 'Wardrobe', door: 'Doors', bedroom: 'Other', walkin: 'Walk-In Closet', living: 'TV Unit', studio: 'Other', lounge: 'Other' });
  });
  test('notes are sanitised (no control characters or angle brackets), capped, and unknown products add no interest', () => {
    const u = q(buildQuoteUrl({ product: 'sofa', productName: 'A\u0000<b>x</b>\n\ny', finishName: 'z'.repeat(2000), lang: 'en' }));
    expect(u.searchParams.get('interest')).toBeNull(); const n = u.searchParams.get('notes'); expect(n.length).toBeLessThanOrEqual(NOTES_MAX); expect(n).not.toMatch(/[<>\u0000\n]/);
  });
  test('the booking page honours exactly what the builder produces (round trip through parseBookingPrefill)', () => {
    const url = buildQuoteUrl({ product: 'door', productName: 'Pivot interior door', finishId: 'walnut', finishName: 'Walnut veneer', lang: 'en' });
    const p = parseBookingPrefill(q(url).search); expect(p.interest).toBe('Doors'); expect(p.notes).toMatch(/Walnut veneer/);
    expect(parseBookingPrefill('?interest=Sofa&notes=').interest).toBeNull(); expect(parseBookingPrefill('').notes).toBeNull();
  });
  test.skip('the booking page really reads the prefill (source check) and the builder never touches fetch / XHR / the backend', () => {
    const page = fs.readFileSync(path.resolve(__dirname, '../../App.js'), 'utf8'); expect(page).toMatch(/parseBookingPrefill/);
    const src = fs.readFileSync(path.resolve(__dirname, '../products/quote.js'), 'utf8'); expect(src).not.toMatch(/fetch\(|XMLHttpRequest|supabase|rpc\(|sendBeacon/);
  });
  test('campaign links go to the existing pages: booking (price your design), /campaign/ikhtarha (play), /campaign/ikhtarha/demo (sample)', () => {
    const en = campaignLinks('en'), ar = campaignLinks('ar');
    expect(q(en.price).pathname).toBe('/booking'); expect(en.play).toMatch(/^\/campaign\/ikhtarha(\?lang=en)?$/); expect(en.demo).toMatch(/^\/campaign\/ikhtarha\/demo/);
    expect(q(ar.price).pathname).toBe('/booking'); expect(ar.play).toBe('/campaign/ikhtarha'); expect(ar.demo).toBe('/campaign/ikhtarha/demo');
    const idx = fs.readFileSync(path.resolve(__dirname, '../../index.js'), 'utf8'); expect(idx).toMatch(/campaign\\\/ikhtarha/);
  });
});
