/* UX-21: the extra lucide icons the 3D workspace needs, added to the shared icon map without touching icons.jsx. */
import { Lock, LockOpen, Maximize, Minimize, PanelLeftClose, PanelLeftOpen, Sparkles, Wrench, ChevronUp } from 'lucide-react';
import { ICONS } from './icons';

Object.assign(ICONS, { lock: Lock, unlock: LockOpen, focus: Maximize, unfocus: Minimize, panelOn: PanelLeftClose, panelOff: PanelLeftOpen, asstOn: Sparkles, tools: Wrench, up: ChevronUp });
export const WS_ICONS_READY = true;
