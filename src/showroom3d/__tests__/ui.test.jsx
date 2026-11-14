import React from 'react';
import { render, screen } from '@testing-library/react';
import LoadingScreen from '../ui/LoadingScreen';
import Fallback2D from '../ui/Fallback2D';
import ShowroomRoot from '../ShowroomRoot';

describe('showroom UI', () => {
  test('loading screen shows the real percentage with an accessible progressbar (EN)', () => {
    render(<LoadingScreen pct={42.4} lang="en" />);
    expect(screen.getByTestId('sr-pct').textContent).toBe('42');
    const bar = screen.getByRole('progressbar'); expect(bar.getAttribute('aria-valuenow')).toBe('42');
    expect(screen.getByText('Preparing the showroom')).toBeTruthy();
  });
  test('loading screen in Arabic keeps Latin digits and Arabic copy', () => {
    render(<LoadingScreen pct={100} lang="ar" />);
    expect(screen.getByTestId('sr-pct').textContent).toBe('100'); expect(screen.getByText('نجهّز المعرض')).toBeTruthy();
  });
  test('the 2D fallback lists all eight departments with real links', () => {
    const { container } = render(<Fallback2D lang="en" />);
    expect(container.querySelectorAll('.sr-fb-grid li')).toHaveLength(8);
    const hrefs = [...container.querySelectorAll('a')].map((a) => a.getAttribute('href'));
    expect(hrefs).toEqual(expect.arrayContaining(['/projects', '/visualizer', '/booking']));
  });
  test('the Arabic fallback links stay inside /ar', () => {
    const { container } = render(<Fallback2D lang="ar" />);
    const hrefs = [...container.querySelectorAll('a')].map((a) => a.getAttribute('href'));
    expect(hrefs).toEqual(expect.arrayContaining(['/ar/projects', '/ar/booking']));
    expect(screen.getByText('المطابخ')).toBeTruthy();
  });
  test('without WebGL (jsdom) the route renders the 2D fallback instead of crashing', () => {
    window.history.pushState(null, '', '/yas-bloom');
    render(<ShowroomRoot />);
    expect(screen.getByTestId('sr-fallback')).toBeTruthy();
    expect(document.documentElement.getAttribute('lang')).toBe('en');
  });
});
