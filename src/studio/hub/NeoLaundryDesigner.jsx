/* Neo Laundry Designer (nav id 'neo-laundry') [NEO-CATEGORIES-UX26] - laundry cabinets in the generic Neo category studio (src/neoCategories). */
import React from 'react';
import NeoCategoryApp from './neoCategories/NeoCategoryApp';
import LAUNDRY from './neoCategories/configs/laundry';

export default function NeoLaundryDesigner(props) { return <NeoCategoryApp cfg={LAUNDRY} {...props} />; }
