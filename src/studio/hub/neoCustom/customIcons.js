/* Neo Custom Designer [NEO-CUSTOM-UX28] - the few extra icons the studio needs, added to the shared Neo icon set (same lucide-react, same 18px / 1.75 stroke,
 * colour from the text). Importing this file once is enough (like neoKitchen/wsIcons.js). Every key is prefixed `cu` so no shared icon is overwritten. */
import {
  Copy, Trash2, FlipHorizontal2, ChevronUp, Magnet, Armchair, Table2, Hash, SquareStack, Scissors, Component, Square, Ruler, Boxes, Wrench, ListTree,
} from 'lucide-react';
import { ICONS } from '../neoKitchen/icons';

Object.assign(ICONS, {
  cuCopy: Copy, cuTrash: Trash2, cuMirror: FlipHorizontal2, cuUp: ChevronUp, cuSnap: Magnet, cuFurniture: Armchair, cuTable: Table2, cuCallout: Hash, cuStack: SquareStack,
  cuScissors: Scissors, cuPart: Component, cuPanel: Square, cuDims: Ruler, cuAssembly: Boxes, cuHw: Wrench, cuTree: ListTree,
});
