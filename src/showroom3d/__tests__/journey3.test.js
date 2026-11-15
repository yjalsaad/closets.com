/* Film v3 (journey3-*): the manifest parses with the player's own parser, the label is the honest "mixed" one, English captions are the default for an English page (Arabic for an Arabic page),
 * and the English caption track is readable (at most two lines of 42 characters, ordered, non-overlapping, covering the narration). The files are the committed ones in public/yas-bloom/film. */
import fs from 'fs';
import path from 'path';
import { parseFilmManifest, captionCycle, defaultCaption } from '../vip/film';

const PUB = path.resolve(__dirname, '../../../public/yas-bloom/film');
const MAN = JSON.parse(fs.readFileSync(path.join(PUB, 'film3.json'), 'utf8'));
const cues = (file) => {
  const txt = fs.readFileSync(path.join(PUB, file), 'utf8'); const out = [];
  for (const block of txt.split(/\n\n+/)) { const m = block.match(/^(?:\d+\n)?(\d\d):(\d\d):(\d\d\.\d+) --> (\d\d):(\d\d):(\d\d\.\d+)\n([\s\S]+)$/); if (m) out.push({ s: +m[1] * 3600 + +m[2] * 60 + +m[3], e: +m[4] * 3600 + +m[5] * 60 + +m[6], text: m[7].trim() }); }
  return out;
};

describe('film v3 manifest and captions', () => {
  test('film3.json parses with the player parser: two sources, poster, both caption tracks, not "real", flagged mixed with its own honest label', () => {
    const r = parseFilmManifest(MAN); expect(r.ok).toBe(true);
    expect(r.film.sources.map((s) => s.height)).toEqual([1080, 720]); expect(r.film.poster).toBe('/yas-bloom/film/journey3-poster.jpg'); expect(r.film.real).toBe(false);
    expect(r.film.captions.map((c) => c.lang).sort()).toEqual(['ar', 'en']); expect(MAN.mixed).toBe(true);
    expect(MAN.label.en).toMatch(/real photographs/i); expect(MAN.label.en).toMatch(/AI-generated illustration/); expect(/[؀-ۿ]/.test(MAN.label.ar)).toBe(true);
    for (const s of MAN.sources) expect(fs.statSync(path.join(PUB, path.basename(s.src))).size).toBe(s.bytes);
  });
  test('English captions are the default on an English page, Arabic on an Arabic page', () => {
    const c = parseFilmManifest(MAN).film.captions; expect(defaultCaption(c, 'en')).toBe('en'); expect(defaultCaption(c, 'ar')).toBe('ar'); expect(captionCycle(c, 'en')).toEqual(['en', 'ar', 'off']);
  });
  test('journey3.en.vtt: WEBVTT, translation note, at most 2 lines of 42 characters, ordered and non-overlapping, readable speed, spans the narration', () => {
    const txt = fs.readFileSync(path.join(PUB, 'journey3.en.vtt'), 'utf8'); expect(txt.startsWith('WEBVTT')).toBe(true); expect(txt).toMatch(/translation/i);
    const c = cues('journey3.en.vtt'); expect(c.length).toBeGreaterThan(45);
    c.forEach((q, i) => { const lines = q.text.split('\n'); expect(lines.length).toBeLessThanOrEqual(2); lines.forEach((l) => expect(l.length).toBeLessThanOrEqual(42)); expect(q.e).toBeGreaterThan(q.s);
      expect(q.text.replace(/\n/g, ' ').length / (q.e - q.s)).toBeLessThanOrEqual(23); if (i) expect(q.s).toBeGreaterThanOrEqual(c[i - 1].e - 0.001); });
    expect(c[0].s).toBeLessThan(2.5); expect(c[c.length - 1].e).toBeGreaterThan(205); expect(c[c.length - 1].e).toBeLessThan(209);
  });
  test('journey3.ar.vtt is the owner script: same cue count as v2, Arabic only', () => {
    const a = cues('journey3.ar.vtt'), v2 = cues('journey2.ar.vtt'); expect(a.length).toBe(v2.length); expect(a.map((q) => q.text)).toEqual(v2.map((q) => q.text));
  });
});
