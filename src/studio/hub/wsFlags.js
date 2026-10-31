/* [WEB-STUDIO 2026-10-31] Website-only switches read by the ported studios (set by Bonsai > Website Studio):
 * factory outputs (Cut List view, Export menu: cut lists, DXF / CNC, BOM) are shown to customers only when the admin turns them on. */
import { getStudio } from '../studioStore';
export const wsShowFactory = () => { try { return !!(getStudio().settings || {}).show_exports; } catch (e) { return false; } };
