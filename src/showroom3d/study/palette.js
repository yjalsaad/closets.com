/* The ONLY place in src/showroom3d/study that contains colour literals (same rule as src/showroom3d/3d/palette.js).
 * The YAS WOOD study keeps its own brand (red + charcoal, from the owner's file); it is a sub-brand of the showroom, so its tokens live on the
 * study root as custom properties (--yws-*), never globally. CSS and SVG only ever read var(--yws-*). */
import { hex, rgba } from '../3d/palette';

export const STUDY_PALETTE = {
  red: 0xea2c46, redDark: 0xc41d34, redLight: 0xff4d66,
  dark: 0x17171a, charcoal: 0x232328, slate: 0x3a3a42, gray: 0xf5f5f7, white: 0xffffff, mute: 0xa1a1aa, mute2: 0x52525b,
  green: 0x10b981, amber: 0xf59e0b, greenInk: 0x047857,   // greenInk: AA text green on white (the source's bright green is only used for bars / dark backgrounds)
};

export function studyVars() {
  const P = STUDY_PALETTE;
  return {
    '--yws-red': hex(P.red), '--yws-red-dark': hex(P.redDark), '--yws-red-light': hex(P.redLight),
    '--yws-dark': hex(P.dark), '--yws-charcoal': hex(P.charcoal), '--yws-slate': hex(P.slate), '--yws-gray': hex(P.gray), '--yws-white': hex(P.white),
    '--yws-mute': hex(P.mute), '--yws-mute-2': hex(P.mute2), '--yws-green': hex(P.green), '--yws-amber': hex(P.amber), '--yws-green-ink': hex(P.greenInk),
    '--yws-line': rgba(P.dark, 0.12), '--yws-line-dark': rgba(P.white, 0.14), '--yws-red-wash': rgba(P.red, 0.1), '--yws-scrim': rgba(P.dark, 0.6),
  };
}
