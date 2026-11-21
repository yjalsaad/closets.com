import React from 'react';

// One icon system: 24px grid, 1.5px stroke, round caps, currentColor. Inline SVG, decorative (aria-hidden) unless a `label` is given.
// Add a glyph by adding its path data here; never use emoji as UI icons.
const P = {
  arrow: 'M4 12h16M14 6l6 6-6 6',
  chevron: 'M9 5l7 7-7 7',
  'chevron-down': 'M5 9l7 7 7-7',
  close: 'M6 6l12 12M18 6L6 18',
  menu: 'M4 7h16M4 12h16M4 17h16',
  cart: 'M3 4h2.2l2 11h10.6l2-8H6.4M9.5 20a.9.9 0 100-1.8.9.9 0 000 1.8zM17 20a.9.9 0 100-1.8.9.9 0 000 1.8z',
  user: 'M12 12a4 4 0 100-8 4 4 0 000 8zM4.5 20a7.5 7.5 0 0115 0',
  globe: 'M12 21a9 9 0 100-18 9 9 0 000 18zM3 12h18M12 3c2.6 2.4 3.9 5.4 3.9 9s-1.3 6.6-3.9 9c-2.6-2.4-3.9-5.4-3.9-9S9.4 5.4 12 3z',
  phone: 'M5 4h3.5l1.6 4-2 1.3a11 11 0 005.6 5.6l1.3-2 4 1.6V18a2 2 0 01-2.2 2A15 15 0 013 6.2 2 2 0 015 4z',
  chat: 'M20 12a8 8 0 01-11.6 7.1L4 20l1-4A8 8 0 1120 12z',
  mail: 'M4 6h16v12H4zM4 7l8 6 8-6',
  pin: 'M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 1113 0c0 5.4-6.5 11-6.5 11zM12 12.2a2.2 2.2 0 100-4.4 2.2 2.2 0 000 4.4z',
  clock: 'M12 21a9 9 0 100-18 9 9 0 000 18zM12 7v5l3 2',
  calendar: 'M4 6h16v14H4zM4 10h16M8 3v4M16 3v4',
  ruler: 'M3.5 16.5l13-13 4 4-13 13zM7 13l2 2M10 10l2 2M13 7l2 2',
  tools: 'M14.5 6.5a4 4 0 00-5.2 5.2L3.5 17.5 6.5 20.5l5.8-5.8a4 4 0 005.2-5.2l-2.4 2.4-2.1-.6-.6-2.1z',
  layers: 'M12 4l9 5-9 5-9-5zM3 14l9 5 9-5',
  home: 'M4 11l8-7 8 7M6 10v10h12V10M10 20v-5h4v5',
  sparkle: 'M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8zM18.5 16l.7 1.8 1.8.7-1.8.7-.7 1.8-.7-1.8-1.8-.7 1.8-.7z',
  check: 'M5 12.5l4.5 4.5L19 7.5',
  plus: 'M12 5v14M5 12h14',
  minus: 'M5 12h14',
  search: 'M11 18a7 7 0 100-14 7 7 0 000 14zM20 20l-4-4',
  instagram: 'M7 3.5h10A3.5 3.5 0 0120.5 7v10a3.5 3.5 0 01-3.5 3.5H7A3.5 3.5 0 013.5 17V7A3.5 3.5 0 017 3.5zM12 16a4 4 0 100-8 4 4 0 000 8zM17.2 6.8h.01',
  truck: 'M3 6h11v10H3zM14 9h4l3 3v4h-7M7 19a1.5 1.5 0 100-3 1.5 1.5 0 000 3zM17 19a1.5 1.5 0 100-3 1.5 1.5 0 000 3z',
  shield: 'M12 3l8 3v6c0 4.5-3.2 7.8-8 9-4.8-1.2-8-4.5-8-9V6zM8.5 12l2.5 2.5 4.5-5',
  kitchen: 'M4 4h16v16H4zM4 11h16M8 7h.01M12 7h.01M16 7h.01M8 15v2M16 15v2',
  wardrobe: 'M5 3h14v18H5zM12 3v18M9 11v2M15 11v2',
  tv: 'M3 5h18v11H3zM8 20h8M12 16v4',
  door: 'M6 3h12v18H6zM15 12v.01M9 7h6M9 17h6',
  desk: 'M3 9h18M5 9v10M19 9v10M9 9v5h6V9M7 5h10v4',
  star: 'M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8L3.5 9.7l5.9-.9z',
  download: 'M12 4v11M7 11l5 5 5-5M5 20h14',
  external: 'M14 4h6v6M20 4l-9 9M18 14v6H4V6h6',
  image: 'M4 5h16v14H4zM4 16l5-5 4 4 3-3 4 4M9 9.5a.5.5 0 100-1 .5.5 0 000 1z',
  info: 'M12 21a9 9 0 100-18 9 9 0 000 18zM12 11v5M12 8h.01',
  alert: 'M12 3l10 18H2zM12 10v5M12 18h.01',
  puzzle: 'M10 4a2 2 0 114 0v2h4v4h-2a2 2 0 100 4h2v4h-4v-2a2 2 0 10-4 0v2H6v-4h2a2 2 0 100-4H6V6h4z',
};

export function Icon({ name, size, label, className = '', style, flip }) {
  const d = P[name];
  if (!d) return null;
  const s = size ? { width: size, height: size, ...style } : style;
  return (
    <svg className={'icon' + (flip ? ' icon-flip' : '') + (className ? ' ' + className : '')} style={s} viewBox="0 0 24 24" aria-hidden={label ? undefined : 'true'} role={label ? 'img' : undefined} aria-label={label} focusable="false">
      <path d={d} />
    </svg>
  );
}
export const ICON_NAMES = Object.keys(P);
export default Icon;
