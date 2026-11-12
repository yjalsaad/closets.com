import { resolveDirection, applyDirection, currentDirection } from '../design/direction';

const setUrl = (q) => window.history.pushState({}, '', '/' + q);

describe('art-direction preview switch', () => {
  beforeEach(() => { window.sessionStorage.clear(); setUrl(''); document.documentElement.removeAttribute('data-direction'); });
  test('is off by default (the live site never shows a direction)', () => {
    expect(resolveDirection()).toBeNull();
    expect(applyDirection()).toBeNull();
    expect(currentDirection()).toBeNull();
  });
  test('?direction=a|b|c sets data-direction and is remembered for the tab', () => {
    setUrl('?direction=b');
    expect(applyDirection()).toBe('b');
    expect(document.documentElement.getAttribute('data-direction')).toBe('b');
    setUrl('');
    expect(resolveDirection()).toBe('b');
  });
  test('unknown values are ignored and ?direction=off clears it', () => {
    setUrl('?direction=zzz');
    expect(resolveDirection()).toBeNull();
    setUrl('?direction=c'); applyDirection();
    setUrl('?direction=off');
    expect(applyDirection()).toBeNull();
    expect(currentDirection()).toBeNull();
  });
});
