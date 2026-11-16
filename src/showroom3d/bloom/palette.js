/* Bloom Meeting palette. The finish colours are the AVERAGE colour of the real swatches of the YAS Wood Collection 2023-2025 (collections/data.js, the files in
 * public/yas-bloom/collections/...; sampled once with an offline script, so no swatch image is loaded at runtime), plus the brand orange and brass of 3d/palette.js.
 * Colour literals live in the 3D palettes only (3d/palette.js, this file): DOM UI uses the design tokens. */
import { PALETTE as P } from '../3d/palette';

/** collection finish -> { name, code (as printed in the collection), color } */
export const FINISHES = Object.freeze({
  kaiserWalnut: { name: 'Kaiser Walnut', code: '102019 TX04', color: 0x684535, use: 'veneer: table top, feature wall, ops wall frame' },
  saltOak: { name: 'Salt Oak', code: '140005 TX04', color: 0x8d6f64, use: 'veneer: lounge joinery' },
  graphiteGrey: { name: 'Graphite Grey', code: '12146 TX04', color: 0x474445, use: 'lacquer: floor, credenza, partitions frames' },
  charcoal: { name: 'Charcoal', code: 'solid melamine', color: 0x3e3630, use: 'lacquer: ceiling bulkheads, desks' },
  black: { name: 'Black', code: 'SS6565', color: 0x0d0d0d, use: 'screen bezels' },
  cream: { name: 'Cream', code: 'SS6017 TX01', color: 0xe1d6ce, use: 'fabric: sofas' },
  tobacco: { name: 'Tobacco', code: 'SS6007 TX01', color: 0x987a62, use: 'leather: leadership chairs' },
  volukus: { name: 'Volukus Marble', code: '44201 TX03', color: 0xc5c3c2, use: 'stone: table inlay, desk tops' },
});
/** the Bloom light colours: brand orange, brass and a warm cream (ribbons, coves, glow) */
export const BLOOM_LIGHT = Object.freeze({ orange: P.brandOrange, brass: P.brass, cream: P.ledCool, warm: P.ledWarm });
export const NIGHT = Object.freeze({ sky0: 0x050a14, sky1: 0x0d1830, glow: 0x2a3a66, water: 0x070d1a, tower: 0x0a1222, moon: 0xdfe8ff });
