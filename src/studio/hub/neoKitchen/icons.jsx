/* Neo Kitchen Designer - one icon set for the whole workspace: lucide-react (already a dependency, also used by
 * YasHoldingDeckBuilder). Every icon is drawn 18px / 1.75 stroke and takes its colour from the text (currentColor),
 * so active / hover / disabled states and dark mode need no extra rules. */
import React from 'react';
import {
  PencilRuler, Box, ListChecks, ScanLine, Boxes, DoorOpen, Palette, Undo2, Redo2, Download, FolderOpen, X, SlidersHorizontal, Sparkles,
  Maximize2, RotateCcw, Grid3x3, Ruler, Layers, Eye, EyeOff, Cuboid, Settings2, Paintbrush, Package, LayoutPanelTop, ArrowUpToLine,
  RectangleHorizontal, PanelBottom, DoorClosed, Wrench, CornerUpLeft, CornerUpRight, LibraryBig, FolderCog, ChevronRight, ChevronLeft,
  ChevronDown, Ellipsis, Send, Mic, TriangleAlert, RefreshCw, Languages, Info, Plus, History,
  Sun, Rows3, AlignVerticalSpaceBetween, GripHorizontal, Shirt, Check, PanelRightClose, PictureInPicture2, PanelRight, Move, MoveDiagonal2, Minus, CornerDownRight, Pin,
} from 'lucide-react';

export const ICONS = {
  design: PencilRuler, view3d: Box, cut: ListChecks, xray: ScanLine, explode: Boxes, open: DoorOpen, look: Palette,
  undo: Undo2, redo: Redo2, export: Download, file: FolderOpen, close: X, params: SlidersHorizontal, assistant: Sparkles,
  fit: Maximize2, reset: RotateCcw, grid: Grid3x3, guides: Ruler, layers: Layers, eye: Eye, eyeOff: EyeOff, views: Cuboid,
  global: Settings2, ms: Paintbrush, base: Package, wall: LayoutPanelTop, top: ArrowUpToLine, counter: RectangleHorizontal,
  plinth: PanelBottom, doors: DoorClosed, hardware: Wrench, left: CornerUpLeft, right: CornerUpRight, library: LibraryBig, project: FolderCog,
  next: ChevronRight, prev: ChevronLeft, down: ChevronDown, more: Ellipsis, send: Send, mic: Mic, warn: TriangleAlert, retry: RefreshCw,
  lang: Languages, info: Info, plus: Plus, history: History, download: Download,
  move: Move, resize: MoveDiagonal2, minimize: Minus, check: Check, collapseR: PanelRightClose, float: PictureInPicture2, dockR: PanelRight,
  sun: Sun, drawers: Rows3, shelves: AlignVerticalSpaceBetween, rails: GripHorizontal, clothes: Shirt, lshape: CornerDownRight, pin: Pin, /* NEO-CLOSETS-UX22 / UX24 wardrobe studio */
};

export function Ic({ n, size = 18, ...rest }) {
  const C = ICONS[n];
  return C ? <C size={size} strokeWidth={1.75} aria-hidden="true" focusable="false" {...rest} /> : null;
}

/** toolbar / viewport tool button with a CSS tooltip (data-tip), pressed state and an accessible name */
export function Tool({ icon, label, text, tip, nativeTip, pressed, expanded, onClick, className = '', iconOnly = false, children, ...rest }) {
  return (
    <button
      type="button" className={`nk-tool${className ? ` ${className}` : ''}`} data-tip={tip || label} title={nativeTip ? (tip || label) : undefined}
      aria-label={label} aria-pressed={pressed} aria-expanded={expanded} aria-haspopup={expanded !== undefined ? 'true' : undefined}
      onClick={onClick} {...rest}
    >
      <Ic n={icon} />
      {!iconOnly && <span className="nk-tool-t">{text || label}</span>}
      {children}
    </button>
  );
}
