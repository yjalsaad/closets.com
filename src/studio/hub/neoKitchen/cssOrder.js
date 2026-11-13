/* [CI-CSS-ORDER] One shared stylesheet order for every Neo designer.
 *
 * The designers (kitchen, closets, custom, doors and the four category studios) all pull in the same neoKitchen
 * stylesheets, but each reached them through a different chain of component imports, so the CSS arrived in a different
 * order per designer. mini-css-extract-plugin cannot satisfy opposite orders inside the shared chunk and reports
 * "Conflicting order", which fails the CI=true build (Vercel).
 *
 * This module is imported FIRST by each designer entry so they all agree. The order below is the order the production
 * bundle already rendered (read back from the emitted shared CSS chunk before this change), so the cascade is unchanged:
 * workspace3d.css before workspace.css (workspace.css is "imported LAST" by design - see its header).
 * Only list sheets that EVERY designer already loads; adding one here would ship extra CSS to studios that lack it.
 * Do not reorder without a before/after computed-style comparison of the selectors shared by the sheets.
 */
import './neoKitchen.css';
import './outputSettings.css';
import './controls.css';
import '../neoHandles/handles.css';
import './hingeHw.css';
import './view3dPro.css';
import './cutListPro2.css';
import './fileMenu.css';
import './cutListPro.css';
import './exportMenu.css';
import './assistantPersona.css';
import './workspace3d.css';
import './workspace.css';
