/* [NEO-CUSTOM-UX28] Registers the custom furniture studio as one more product in the shared Neo product registry (neoKitchen/productInfo),
 * exactly like the category studios do: program name, noun and file stem for OBJ / STL / 3DM / xlsx / PDF, no worktop line on the report,
 * no display props. Imported by customBuild, so every path that builds a custom scene has registered it first. */
import { registerProduct } from '../neoKitchen/productInfo';

registerProduct('custom', {
  app: ['Neo Custom Designer', 'مصمم أثاث نيو'],
  noun: ['Custom furniture', 'أثاث مخصص'],
  file: 'custom',
  worktop: false,
  props: false, // no rails / clothes style display props in custom furniture files
});
