// Route chunk "shared_TVUnitPlannerWizard_OfficePlannerWizard_plus5" — split out of App.js for route-level code splitting (perf).
// Loaded on demand by: TVUnitPlannerWizard, OfficePlannerWizard, WardrobePlannerWizard, DoorPlannerWizard, KitchenPlannerWizard, KitchenPage, DesignBuilderPage.
// Shared app helpers (api, useI18n, AppCtx, …) are imported from ../App (live bindings; this chunk only loads after App has evaluated).
import { I18N } from '../App';

// ── Wave 3: option CARD names/subs (constant arrays stay byte-identical / English ──
// remains the id & saved value; we translate only at render time in the card JSX).
// OPT_KEY maps an English option label (name OR sub) → an I18N key.
const OPT_KEY = {
  // Kitchen shapes / layouts
  'Single Wall':'optSingleWall', 'Galley':'optGalley', 'Galley Kitchen':'optGalleyKitchen',
  'L-Shape':'optLShape', 'L-shaped':'optLShaped', 'L-Shaped Kitchen':'optLShapedKitchen',
  'U-Shape':'optUShape', 'U-shaped':'optUShaped', 'U-Shaped Kitchen':'optUShapedKitchen',
  'U-Shape walk-in':'optUShapeWalkin', 'Peninsula':'optPeninsula', 'Island':'optIsland',
  'Straight':'optStraight', 'Straight / single-wall':'optStraightWall',
  'One run along a single wall':'optStraightSub', 'One clean run along a single wall':'optStraightCleanSub',
  'Two runs facing each other':'optGalleySub', 'Two runs that meet in a corner':'optLShapeSub',
  'Two runs meeting in a corner':'optLShapeMeetSub', 'Three runs around three walls':'optUShapeSub',
  'A run plus a central island':'optIslandSub', 'A connected return / breakfast bar':'optPeninsulaSub',
  // Wardrobe layouts
  'Walk-in room':'optWalkinRoom', 'Open dressing room with island':'optWalkinRoomSub',
  'Sliding':'optSliding', 'Sliding-door fitted wardrobe':'optSlidingSub',
  'Hinged':'optHinged', 'Hinged-door fitted wardrobe':'optHingedSub',
  // Wardrobe planner product cards
  'Walk-in closet':'optWalkinCloset', 'A private dressing room of your own':'optWalkinClosetSub',
  'Sliding-door wardrobe':'optSlidingWardrobe', 'Space-saving, seamless fronts':'optSlidingWardrobeSub',
  'Hinged / fitted wardrobe':'optHingedWardrobe', 'Classic doors, fully fitted':'optHingedWardrobeSub',
  'Fitted / reach-in':'optReachin', 'Built-in storage that disappears':'optReachinSub',
  // TV layouts
  'Floating':'optFloating', 'Floating base + wall panel':'optFloatingSub',
  'Full Wall':'optFullWall', 'Tall cabinets + display':'optFullWallSub',
  'Display Shelves':'optDisplayShelves', 'Open shelves + niches':'optDisplayShelvesSub',
  'Fireplace':'optFireplace', 'Electric fire + cladding':'optFireplaceSub',
  'Minimal':'optMinimal', 'Panel + floating shelf':'optMinimalSub',
  'Storage Wall':'optStorageWall', 'Bookcases + cabinets':'optStorageWallSub',
  // TV room types
  'Living room':'optLivingRoom', 'Main lounge media wall':'optLivingRoomSub',
  'Majlis':'optMajlis', 'Formal seating room':'optMajlisSub',
  'TV facing the bed':'optBedroomTvSub',
  'Family room':'optFamilyRoom', 'Casual everyday space':'optFamilyRoomSub',
  'Office':'optOfficeTv', 'Kitchen':'optKitchenDoor', 'Display + work storage':'optOfficeTvSub',
  // Door types + subs
  'Single Swing':'optSingleSwing', 'One hinged leaf':'optSingleSwingSub',
  'Double Swing':'optDoubleSwing', 'Two hinged leaves':'optDoubleSwingSub',
  'Slides on a track':'optSlidingDoorSub',
  'Pivot':'optPivot', 'Centre / offset pivot':'optPivotSub',
  'Hidden':'optHidden', 'Flush concealed frame':'optHiddenSub',
  'Folding':'optFolding', 'Bi-fold panels':'optFoldingSub',
  // Door styles + subs
  'Flush':'optFlush', 'Smooth flat leaf':'optFlushSub',
  'Groove lines':'optGrooveLines', 'Routed grooves':'optGrooveLinesSub',
  'Slatted':'optSlatted', 'Vertical slats':'optSlattedSub',
  'Raised panels':'optRaisedPanels', 'Framed panels':'optRaisedPanelsSub',
  'Decorative mouldings':'optMouldings', 'Ornate trims':'optMouldingsSub',
  'Metal inlays':'optMetalInlays', 'Brass / steel lines':'optMetalInlaysSub',
  'Stone inserts':'optStoneInserts', 'Marble accents':'optStoneInsertsSub',
  'Leather panels':'optLeatherPanels', 'Upholstered panels':'optLeatherPanelsSub',
  'Glass inserts':'optGlassInserts', 'Decorative glazing':'optGlassInsertsSub',
  // Door catalog cards
  'Flush Interior Door':'optFlushInterior', 'Simplest modern leaf':'optFlushInteriorSub',
  'Groove Modern Door':'optGrooveModern', 'Routed groove lines':'optGrooveModernSub',
  'Sliding Door':'optSlidingCatalog', 'Track-mounted leaf':'optSlidingCatalogSub',
  'Double Majlis Door':'optDoubleMajlis', 'Twin grand leaves':'optDoubleMajlisSub',
  'Pivot Entrance Door':'optPivotEntrance', 'Architectural pivot':'optPivotEntranceSub',
  'Hidden Door System':'optHiddenDoorSystem', 'Flush, frameless look':'optHiddenDoorSystemSub',
  // Door locations
  'Main entrance':'optMainEntrance', 'Front of the home':'optMainEntranceSub',
  'Private rooms':'optBedroomDoorSub', 'Bathroom':'optBathroom', 'Wet areas':'optBathroomSub',
  'Cooking spaces':'optKitchenDoorSub', 'Study / work room':'optOfficeDoorSub',
  'Formal reception':'optMajlisDoorSub', 'Utility room':'optUtilityRoom', 'Laundry / store':'optUtilityRoomSub',
  // Door core / frame
  'Hollow':'optHollow', 'Light interior core':'optHollowSub',
  'Semi-solid':'optSemiSolid', 'Tubular / honeycomb':'optSemiSolidSub',
  'Solid':'optSolidCore', 'Solid timber / MDF core':'optSolidCoreSub',
  'Fire-rated':'optFireRated', '60-min certified core':'optFireRatedSub',
  'Timber lining + architrave':'optFrameStandardSub', 'Concealed aluminium jamb':'optFrameHiddenSub',
  'Aluminum':'optFrameAluminum', 'Powder-coated alloy':'optFrameAluminumSub',
  'Steel-reinforced':'optFrameSteel', 'For heavy / security leaves':'optFrameSteelSub',
  // Door finish / surface
  'Real wood veneer':'optVeneerFinishSub', 'Durable HPL':'optLaminateFinishSub',
  'Budget faced':'optMelamineFinishSub', 'Lacquer paint':'optLacquerPaint', 'Smooth sprayed':'optLacquerPaintSub',
  'PU paint':'optPuPaint', 'Premium PU finish':'optPuPaintSub',
  // Office layouts
  'Wall Storage Office':'optWallStorage', 'Full storage wall + desk':'optWallStorageSub',
  'Corner Home Office':'optCornerOffice', 'Two-wall corner desk':'optCornerOfficeSub',
  'Built-in Office with Shelves':'optBuiltIn', 'Joinery + display shelving':'optBuiltInSub',
  'Storage Wall with Desk':'optStorageDesk', 'Floor-to-ceiling + worktop':'optStorageDeskSub',
  'Minimal Home Office':'optMinimalOffice', 'Floating desk + shelf':'optMinimalOfficeSub',
  'L-Shaped Home Office':'optLShapedOffice', 'L-return desk + storage':'optLShapedOfficeSub',
  // Office room types
  'Home office':'optHomeOffice', 'Dedicated work room':'optHomeOfficeSub',
  'Study':'optStudy', 'Reading & focus space':'optStudySub',
  'Bedroom corner':'optBedroomCorner', 'Desk in the bedroom':'optBedroomCornerSub',
  'Living room nook':'optLivingNook', 'Work in the lounge':'optLivingNookSub',
  'Dual-use spare room':'optGuestRoomOfficeSub',
  // Wardrobe room types
  'Master bedroom':'optMasterBedroom', 'Primary suite wardrobe wall':'optMasterBedroomSub',
  'Bedroom':'optBedroom', 'Standard fitted wardrobe':'optBedroomSub',
  'Guest room':'optGuestRoom', 'Occasional-use storage':'optGuestRoomSub',
  'Dedicated walk-in closet':'optWalkinRoomTypeSub',
  'Dressing room':'optDressingRoom', 'Island, vanity & seating':'optDressingRoomSub',
  // Room shapes (kitchen)
  'Rectangle':'optRectangle', 'Standard four-wall room':'optRectangleSub',
  'Square':'optSquare', 'Equal length & width':'optSquareSub',
  'L-shaped room':'optLRoom', 'Room with a return wall':'optLRoomSub',
  'Custom':'optCustom', 'Irregular — set dimensions':'optCustomSub',
  // Materials / finishes
  'Melamine':'optMelamine', 'Durable, exceptional value':'optMelamineSub',
  'Melamine-faced chipboard':'optMfcSub',
  'High-gloss acrylic':'optAcrylicGloss', 'Reflective, premium':'optAcrylicGlossSub',
  'Real-wood veneer':'optVeneer', 'Natural grain, luxe':'optVeneerSub',
  'Matt lacquer':'optMattLacquer', 'Smooth painted, any RAL':'optMattLacquerSub',
  'Glass / mirror front':'optGlassFront', 'Display & dressing':'optGlassFrontSub',
  'Laminate':'optLaminate', 'Budget-friendly, huge choice':'optLaminateSub',
  'Solid wood / butcher block':'optSolidWood', 'Warm & natural':'optSolidWoodSub',
  'Granite':'optGranite', 'Natural stone, unique':'optGraniteSub',
  'Quartz (engineered stone)':'optQuartzStone', 'Durable premium':'optQuartzStoneSub',
  'Solid surface (acrylic)':'optSolidSurface', 'Seamless, repairable':'optSolidSurfaceSub',
  // Kitchen door styles
  'Shaker':'optShaker', 'Framed door, timeless':'optShakerSub',
  'Flat / slab':'optFlatSlab', 'Clean, handleless-ready':'optFlatSlabSub',
  'Compact kitchens & open-plan walls':'optBestStraight', 'Narrow rooms, serious cooks':'optBestGalley',
  'The all-rounder — most popular':'optBestLShape', 'Maximum storage & worktop':'optBestUShape', 'Sociable, open-plan entertaining':'optBestIsland',
  '5–6 weeks':'optLead56', '6–7 weeks':'optLead67', '7–8 weeks':'optLead78', '7–9 weeks':'optLead79',
  'Handleless J-pull':'optHandleless', 'Seamless, contemporary':'optHandlelessSub',
  'In-frame':'optInframe', 'Heritage craftsmanship':'optInframeSub',
  'High-gloss':'optHighGloss',
  // Construction (carcass)
  'MDF':'optMdf', 'Moisture-resistant board':'optMdfSub',
  'Plywood':'optPlywood', 'Premium, screw-holding':'optPlywoodSub', 'MFC':'optMfc',
  // Wardrobe internals
  'Short hanging':'optShortHanging', '1000–1100mm drop':'optShortHangingSub',
  'Long hanging':'optLongHanging', '1600–1800mm drop':'optLongHangingSub',
  'Double hanging':'optDoubleHanging', 'Two rails stacked':'optDoubleHangingSub',
  'Adjustable shelves':'optAdjShelves', '350–450mm deep':'optAdjShelvesSub',
  'Fixed shelves':'optFixedShelves', 'Structural, 400mm':'optFixedShelvesSub',
  'Small drawers':'optSmallDrawers', '450–500mm runners':'optSmallDrawersSub',
  'Deep drawers':'optDeepDrawers', 'Knitwear / folded':'optDeepDrawersSub',
  'Jewelry drawer':'optJewelryDrawer', 'Felt-lined tray':'optJewelryDrawerSub',
  'Shoe rack':'optShoeRack', '300–350mm angled':'optShoeRackSub',
  // Sliding / hinged door fronts
  'Glass':'optGlassFrontW', 'Mirror':'optMirror', 'Wood':'optWood',
  'Aluminium frame':'optAluFrame', 'Flat panel':'optFlatPanel',
  'Groove / fluted':'optGrooveFluted', 'Glass insert':'optGlassInsertW',
};

// trOpt(label, lang): translate an option CARD label (name/sub) at render time.
// Falls back to the English literal so unmapped labels render unchanged.
function trOpt(label, lang) {
  if (!label) return label;
  const k = OPT_KEY[label];
  return (k && I18N[k]) ? (I18N[k][lang] || I18N[k].en) : label;
}

export { trOpt };
