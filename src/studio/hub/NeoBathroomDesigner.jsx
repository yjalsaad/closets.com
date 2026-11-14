/* Neo Bathroom Designer (nav id 'neo-bathroom') [NEO-CATEGORIES-UX26] - bathroom cabinets in the generic Neo category studio (src/neoCategories). */
import './neoKitchen/cssOrder'; // [CI-CSS-ORDER] must stay the first import: fixes the shared stylesheet order
import React from 'react';
import NeoCategoryApp from './neoCategories/NeoCategoryApp';
import BATHROOM from './neoCategories/configs/bathroom';

export default function NeoBathroomDesigner(props) { return <NeoCategoryApp cfg={BATHROOM} {...props} />; }
