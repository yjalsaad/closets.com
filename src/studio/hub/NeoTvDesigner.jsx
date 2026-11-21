/* Neo TV Unit Designer (nav id 'neo-tv') [NEO-CATEGORIES-UX26] - TV units in the generic Neo category studio (src/neoCategories). */
import './neoKitchen/cssOrder'; // [CI-CSS-ORDER] must stay the first import: fixes the shared stylesheet order
import React from 'react';
import NeoCategoryApp from './neoCategories/NeoCategoryApp';
import TV from './neoCategories/configs/tv';

export default function NeoTvDesigner(props) { return <NeoCategoryApp cfg={TV} {...props} />; }
