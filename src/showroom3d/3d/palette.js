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
  // Phase 4: product finishes (sample configuration swatches, all procedural) + props + campaign
  oakLight: 0xb09a7c, oakPale: 0xcbbca0, walnutDeep: 0x4a3426, smokedOak: 0x6e5440,
  lacquerSage: 0x8f9a86, lacquerStone: 0xa7a199, lacquerIvory: 0xe9e3d6, lacquerCharcoal: 0x34332f, lacquerClay: 0xb08a72,
  marbleWhite: 0xe8e4dc, marbleVeinGrey: 0x8d8a86, marbleVeinGold: 0xb89b63, marbleDark: 0x2c2a29, marbleDarkVein: 0xb9b2a6, marbleSand: 0xd7c6a8,
  brassBrushed: 0xb8935a, bronzeDark: 0x3a2f27, steel: 0xa8aaab, glassSmoke: 0x2b2622,
  hobGlass: 0x0d0d0e, interiorWarm: 0xefe3d0, interiorShade: 0x9c8b78,
  fabricLinen: 0xd9cfbe, fabricSage: 0x7f8c76, fabricClay: 0x9a6a55, fabricNavy: 0x2e3a4d, fabricCream: 0xece4d4, fabricCharcoal: 0x3a3a3a, fabricBlush: 0xc9a79c,
  ceramicWhite: 0xf1ede6, ceramicSand: 0xcbbba3, ceramicTerra: 0xb26a48, ceramicDark: 0x3b3430, bookA: 0x6b3a2e, bookB: 0x2f4a47, bookC: 0xd2c3a6, bookD: 0x4b4f6b, rugSand: 0xd6c7ac, rugBorder: 0x8c7658, potTerra: 0xb5805a, leafDeep: 0x3f5a2c,
  fruitLemon: 0xd9c34c, fruitApple: 0x7d9a3a, fruitOrange: 0xd9822b, steelPot: 0xb8babb, woodSpoon: 0xb98d5c, brassLamp: 0xc9a25b, shadeLinen: 0xefe3cc,
  artA: 0x8a5a44, artB: 0xd8c3a0, artC: 0x2f4a47, artD: 0xe9e2d6, artE: 0xb9873c,
  lightHall: 0xffe8d0,
  ceilingLight: 0xf2ebdf, wallGreige: 0x6f685e,
  focusRing: 0xffb067, hoverRing: 0xfff0d6,
  // Ikhtarha campaign brand: mirrored from src/campaign/IkhtarhaRoot.jsx BRAND (primary / accent / sand / taupe / charcoal). The campaign
  // page can override these per campaign from the Hub; the showroom mirrors the shipped defaults and does not read the live config.
  ikPurple: 0x4a2c82, ikPurpleDeep: 0x3a1f6b, ikTeal: 0x23807c, ikTealBright: 0x40b5ad, ikMint: 0x9fddd8, ikWhite: 0xffffff,
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
    '--sr-brass': hex(P.brass), '--sr-focus': hex(P.focusRing), '--sr-ik-purple': hex(P.ikPurple), '--sr-ik-teal': hex(P.ikTeal), '--sr-ik-mint': hex(P.ikMint),
    '--sr-panel': rgba(P.ink, 0.82), '--sr-line': rgba(P.sand, 0.14),
    '--sr-glass': rgba(P.ink, 0.62), '--sr-glass-line': rgba(P.sand, 0.22), '--sr-scrim': rgba(P.ink, 0.55),
    '--sr-on-dark': hex(P.sand), '--sr-on-dark-2': hex(P.taupe),
  };
}
