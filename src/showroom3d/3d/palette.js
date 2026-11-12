/* The ONLY place in src/showroom3d that contains colour literals.
 * Everything else (three.js materials, canvas textures, DOM overlay CSS custom properties) reads from here.
 * Brand anchors are sampled from the official logo (src/showroom3d/assets/the-closets-logo-official.jpg: orange Arabic wordmark,
 * dark-burgundy English type, grey secondary text). Architectural colours are chosen for a warm, neutral luxury interior. */
export const PALETTE = {
  // brand: sampled from the owner-supplied official logo (assets/the-closets-logo-official.jpg), never altered
  brandOrange: 0xe68e40,   // Arabic wordmark + outline rectangle
  brandBrown: 0x3e2020,    // dark burgundy: THE CLOSETS + second rectangle
  brandGrey: 0x404040,     // INTERNATIONAL + the small Arabic line
  logoPaper: 0xfbfbfb,     // the JPG's own off-white background
  // neutrals / warm tones (UI + architecture)
  sand: 0xefe8e0,
  taupe: 0xb9ada1,
  charcoal: 0x2d2d2d,
  ink: 0x1d1510,
  burgundy: 0x5b1520,
  // architecture
  stoneLight: 0xd9cdb8,   // limestone / travertine
  stoneMid: 0xc4b59b,
  stoneDark: 0x8c7d68,
  plaster: 0xe9e2d6,
  concrete: 0xa9a49b,
  oak: 0xa88a66,
  walnut: 0x5a4232,
  bronze: 0x2a2420,       // glazing frames
  brass: 0xc9a25b,
  glass: 0xbfd6d8,
  ledWarm: 0xffd6a2,
  ledCool: 0xfff0dd,
  // landscape
  grass: 0x6f8a3c,
  grassDark: 0x4d6a2b,
  leaf: 0x56782e,
  leafDry: 0x8d9a45,
  trunk: 0x7a6248,
  paver: 0xcbbfa9,
  sandGround: 0xd8c39b,
  soil: 0x6b5238,
  // sky (golden hour, Gulf)
  skyZenith: 0x5f8fc4,
  skyMid: 0xa9c4dc,
  skyHorizon: 0xf5d8b0,
  sun: 0xffe2b0,
  fog: 0xe6d3b8,
  // overlay
  veil: 0xf6efe4,
  // material tints
  floorTint: 0xd0cabf, ceilingTint: 0xd8cdbd, water: 0x1d3b3f, hemiSky: 0xfff3e2, signTint: 0xe8e8e8,
};

export const hex = (n) => '#' + (n >>> 0).toString(16).padStart(6, '0').slice(-6);
export const rgba = (n, a) => `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})`;

/** custom properties for the DOM overlay root (so CSS files never contain hex values) */
export function cssVars() {
  const P = PALETTE;
  return {
    '--sr-orange': hex(P.brandOrange), '--sr-grey': hex(P.brandGrey), '--sr-paper': hex(P.logoPaper), '--sr-brown': hex(P.brandBrown), '--sr-sand': hex(P.sand), '--sr-taupe': hex(P.taupe),
    '--sr-charcoal': hex(P.charcoal), '--sr-ink': hex(P.ink), '--sr-burgundy': hex(P.burgundy), '--sr-veil': hex(P.veil),
    '--sr-brass': hex(P.brass),
    '--sr-glass': rgba(P.ink, 0.62), '--sr-glass-line': rgba(P.sand, 0.22), '--sr-scrim': rgba(P.ink, 0.55),
    '--sr-on-dark': hex(P.sand), '--sr-on-dark-2': hex(P.taupe),
  };
}
