/* The showroom is TWO floors: Floor 1 (the main hall) and Floor 2 (Bloom Meeting). HUD buttons, the Departments sheet and the lift names all say so (EN + AR). */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { DeptMenu } from '../ui/Menus';
import Hud from '../ui/Hud';
import { FLOORS } from '../scenes/bloom/layout';

test('FLOORS: Floor 1 / Floor 2 (AR الطابق 1 / الطابق 2), no "Ground" anywhere visible', () => {
  expect(FLOORS.map((f) => [f.id, f.en, f.ar, f.short.en])).toEqual([['ground', 'Floor 1', 'الطابق 1', '1'], ['l2', 'Floor 2', 'الطابق 2', '2']]);
});
describe('Departments sheet', () => {
  test('two tappable floor headers (tap = go to that floor); Meeting mode is its own top item; Floor 2 stops sit under the Floor 2 header; the current floor comes first', () => {
    for (const lang of ['en', 'ar']) {
      const onPick = jest.fn(); const { container, unmount } = render(<DeptMenu lang={lang} touch onPick={onPick} onClose={() => {}} level="l2" />);
      const heads = [...container.querySelectorAll('.sr-fl-head')]; expect(heads.map((h) => h.getAttribute('data-floorpick'))).toEqual(['l2', 'ground']); expect(heads[0].getAttribute('aria-current')).toBe('true');
      expect(heads.map((h) => h.textContent)).toEqual(lang === 'ar' ? ['2الطابق 2', '1الطابق 1'] : ['2Floor 2', '1Floor 1']);
      expect(container.querySelector('[data-testid="sr-floor-sec-l2"] [data-floorpick="bloom-board"], [data-testid="sr-floor-sec-l2"] .sr-fl-list li')).toBeTruthy();
      expect(container.querySelector('[data-testid="sr-floor-sec-ground"] [data-dept]')).toBeTruthy();
      expect(container.querySelector('[data-testid="sr-meeting-mode"]').textContent).toBe('M' + (lang === 'ar' ? 'وضع الاجتماع' : 'Meeting mode'));
      fireEvent.click(heads[1]); expect(onPick).toHaveBeenCalledWith('floor:ground'); fireEvent.click(heads[0]); expect(onPick).toHaveBeenCalledWith('floor:l2'); unmount();
    }
  });
  test('on Floor 1 the Floor 2 section has only its header; the text never says "Ground"', () => {
    const { container } = render(<DeptMenu lang="en" touch={false} onPick={() => {}} onClose={() => {}} level="ground" />);
    expect(container.querySelector('[data-testid="sr-floor-sec-l2"] .sr-fl-list')).toBeNull(); expect(container.textContent).not.toMatch(/ground/i);
  });
});

describe('HUD floor buttons', () => {
  test('"Floor 1" / "Floor 2" buttons: labelled, aria-pressed on the current one, a tap rides there, the pressed one is harmless, 44px targets are in the CSS', () => {
    for (const lang of ['en', 'ar']) {
      const rideTo = jest.fn(); const { container, unmount } = render(<Hud lang={lang} tier="high" touch st={{ level: 'ground' }} explorerRef={{ current: { rideTo } }} homeHref="/" onDepts={() => {}} onMenu={() => {}} onInteract={() => {}} onTalk={() => {}} />);
      const b = [...container.querySelectorAll('.sr-floor')]; expect(b.map((x) => x.textContent)).toEqual(lang === 'ar' ? ['الطابق 1', 'الطابق 2'] : ['Floor 1', 'Floor 2']);
      expect(b.map((x) => x.getAttribute('aria-pressed'))).toEqual(['true', 'false']); expect(b[1].getAttribute('aria-label')).toBe(lang === 'ar' ? 'الانتقال إلى الطابق 2' : 'Go to Floor 2');
      fireEvent.click(b[1]); expect(rideTo).toHaveBeenCalledWith('l2'); unmount();
    }
    expect(require('fs').readFileSync(require('path').join(__dirname, '../ui/bloom.css'), 'utf8')).toMatch(/\.sr-floor \{[^}]*min-height: 44px/);
  });
});
