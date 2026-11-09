/* [HOME 2026-11-09] One line-icon set (1.6 stroke, 24 grid, currentColor) — replaces emoji icons for a calmer, premium look. */
import React from 'react';
const P = {
  measure: <><path d="M3 17 17 3l4 4L7 21z" /><path d="m7 13 2 2M10 10l2 2M13 7l2 2" /></>,
  showroom: <><path d="M3 21V9l9-6 9 6v12" /><path d="M9 21v-7h6v7" /><path d="M3 21h18" /></>,
  home: <><path d="M4 11 12 4l8 7" /><path d="M6 10v10h12V10" /><path d="M10 20v-5h4v5" /></>,
  online: <><rect x="3" y="4" width="18" height="12" rx="2" /><path d="M8 20h8M12 16v4" /><path d="m10 8 4 2-4 2z" /></>,
  workshop: <><path d="M3 21V10l5 3V10l5 3V7l8 4v10z" /><path d="M7 17h2M12 17h2M17 17h1" /></>,
  craft: <><path d="m14 4 6 6-9 9H5v-6z" /><path d="m11 7 6 6" /></>,
  warranty: <><path d="M12 3 4 6v6c0 4.5 3.4 8.2 8 9 4.6-.8 8-4.5 8-9V6z" /><path d="m9 12 2 2 4-4" /></>,
  browse: <><path d="M4 13h16v5H4z" /><path d="M6 13V9a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v4" /><path d="M6 18v2M18 18v2" /></>,
  offers: <><path d="M3 12V4h8l10 10-8 8z" /><circle cx="7.5" cy="8.5" r="1.5" /></>,
  design: <><path d="M4 20 15 9" /><path d="m14 4 6 6-3 3-6-6z" /><path d="M4 20h4" /></>,
};
export default function Icon({ name, size = 24, ...rest }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false" {...rest}>{P[name]}</svg>
  );
}
