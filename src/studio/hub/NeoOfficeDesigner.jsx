/* Neo Office Designer (nav id 'neo-office') [NEO-CATEGORIES-UX26] - office furniture in the generic Neo category studio (src/neoCategories). */
import React from 'react';
import NeoCategoryApp from './neoCategories/NeoCategoryApp';
import OFFICE from './neoCategories/configs/office';

export default function NeoOfficeDesigner(props) { return <NeoCategoryApp cfg={OFFICE} {...props} />; }
