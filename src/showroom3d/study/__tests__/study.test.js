import { sanitizeStudy, imageIds, setAt, moveAt } from '../model';
import { SAMPLE_STUDY } from '../sample';
import { simulate } from '../simulator';
import { checkFile, sniffImage, fitSize } from '../upload';
import { makeStudyStore, parseBundle, makeBundle } from '../store';

const png = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0];
test('sample sanitises and is flagged as a sample', () => { const r = sanitizeStudy(SAMPLE_STUDY); expect(r.ok).toBe(true); expect(r.study.sample).toBe(true); });
test('markup in text is stripped', () => { const s = { ...SAMPLE_STUDY, title: 'a<script>x</script><b>b</b>' }; expect(sanitizeStudy(s).study.title).toBe('a b'); });
test('edit helpers are immutable', () => { const a = { x: [1, 2] }; expect(moveAt(a, ['x'], 0, 1).x).toEqual([2, 1]); expect(a.x).toEqual([1, 2]); expect(setAt(a, ['x', 0], 9).x[0]).toBe(9); });
test('simulator status', () => { const b = SAMPLE_STUDY.sections[3].blocks[1].base; expect(simulate(b).status).toBe('strong'); expect(simulate(b, { revChange: -90 }).status).not.toBe('strong'); });
test('upload checks the real bytes, not the label', () => {
  expect(sniffImage(png)).toBe('png'); expect(checkFile({ type: 'image/png', size: 10 }, png)).toBeNull();
  expect(checkFile({ type: 'image/jpeg', size: 10 }, png)).toBe('sniff'); expect(checkFile({ type: 'image/svg+xml', size: 10 }, png)).toBe('type');
  expect(checkFile({ type: 'image/png', size: 9e6 }, png)).toBe('size'); expect(fitSize(3200, 1600)).toEqual({ w: 1600, h: 800 });
});
test('store round trip and bundle with a fake image is rejected', () => {
  const m = {}; const st = makeStudyStore(() => ({ getItem: (k) => m[k] || null, setItem: (k, v) => { m[k] = v; }, removeItem: (k) => { delete m[k]; } }));
  const s = sanitizeStudy(SAMPLE_STUDY).study; expect(st.saveBoth(s)).toBeNull(); expect(st.load().study.id).toBe(s.id);
  const withImg = setAt(s, ['sections', 1, 'blocks', 0, 'items', 0, 'imageId'], 'p1'); expect(imageIds(withImg)).toEqual(['p1']);
  const b = parseBundle(JSON.stringify(makeBundle(withImg, { p1: 'data:image/png;base64,AAAA' }))); expect(b.ok).toBe(true); expect(b.images.p1).toBeUndefined();
});
