// Harness entry: the REAL LeadRoadmap with an in-memory server. ?lang=en|ar &theme=light|dark &role=manager|rep &state=board|empty|error|readonly &undo=ms
import React from 'react';
import { createRoot } from 'react-dom/client';
import { Host, MGR, REP } from '../src/leadroadmap/testkit/host';
import { makeFakeServer } from '../src/leadroadmap/testkit/fakeServer';
import { THEME_CSS } from '../src/HubTheme';

const P = new URLSearchParams(location.search);
const lang = P.get('lang') === 'ar' ? 'ar' : 'en'; const theme = P.get('theme') === 'dark' ? 'dark' : 'light'; const ar = lang === 'ar';
const role = P.get('role') === 'rep' ? 'rep' : 'manager'; const state = P.get('state') || 'board'; const undoMs = Number(P.get('undo') || 600);
document.documentElement.setAttribute('dir', ar ? 'rtl' : 'ltr'); document.documentElement.setAttribute('lang', lang);
document.documentElement.classList.add('hub-v2-theme'); document.documentElement.setAttribute('data-theme', theme);
const themeStyle = document.createElement('style'); themeStyle.textContent = THEME_CSS; document.head.appendChild(themeStyle);   // the live theme tokens (light + dark) document.documentElement.setAttribute('data-ui-style', 'calm');
const NOW = new Date('2026-11-14T10:00:00Z');

const OWN = ['Nora Lane', 'Omar Vale', 'Lina Brook', 'Zayn Hart'];
const NAMES_EN = ['Palm Residence', 'Cedar Villa', 'Olive Apartment', 'Harbour Penthouse', 'Coral Duplex', 'Dune Farmhouse', 'Amber Office', 'Willow Townhouse', 'Jasmine Villa', 'Saffron Residence', 'Pearl Showroom', 'Lotus Apartment', 'Marble Court Flat', 'Ivory Tower Suite', 'Juniper Home', 'Sandstone Villa', 'Orchid Duplex', 'Teak Penthouse', 'Cypress Residence', 'Mulberry Office', 'Falcon Villa', 'Honey Apartment', 'Rosewood Home', 'Laurel Residence', 'Almond Townhouse', 'Garnet Studio', 'Breeze Chalet', 'Opal Showroom', 'Fig Tree Villa', 'Moonstone Flat', 'Tulip Duplex', 'Basil Home', 'Sage Residence', 'Coral Bay Villa', 'Linen Apartment', 'Walnut Court', 'Maple Penthouse', 'Pebble Home', 'Aster Villa', 'Clover Flat'];
const NAMES_AR = ['فيلا النخيل', 'فيلا الأرز', 'شقة الزيتون', 'بنتهاوس الميناء', 'دوبلكس المرجان', 'مزرعة الكثبان', 'مكتب العنبر', 'تاون هاوس الصفصاف', 'فيلا الياسمين', 'سكن الزعفران', 'معرض اللؤلؤ', 'شقة اللوتس', 'شقة قصر الرخام', 'جناح البرج العاجي', 'بيت العرعر', 'فيلا الحجر الرملي', 'دوبلكس الأوركيد', 'بنتهاوس الساج', 'سكن السرو', 'مكتب التوت', 'فيلا الصقر', 'شقة العسل', 'بيت الورد', 'سكن الغار', 'تاون هاوس اللوز', 'استوديو العقيق', 'شاليه النسيم', 'معرض الأوبال', 'فيلا شجرة التين', 'شقة حجر القمر', 'دوبلكس التوليب', 'بيت الريحان', 'سكن المريمية', 'فيلا خليج المرجان', 'شقة الكتان', 'قصر الجوز', 'بنتهاوس القيقب', 'بيت الحصى', 'فيلا النجمة', 'شقة البرسيم'];
const STAT = ['New', 'New', 'New', 'New', 'Contacted', 'Contacted', 'Contacted', 'Quoted', 'Quoted', 'Won', 'Lost', 'Lost'];
const day = (d) => new Date(NOW.getTime() - d * 864e5).toISOString();
const leads = (ar ? NAMES_AR : NAMES_EN).map((name, i) => {
  const status = STAT[i % STAT.length]; const owner = i % 13 === 5 ? null : OWN[i % OWN.length]; const idle = [1, 2, 3, 5, 9, 4, 16, 2, 6, 22][i % 10];
  const L = { id: 'L' + (100 + i), name, company: i % 4 === 0 ? (ar ? 'شركة أطلس للتطوير' : 'Atlas Developments') : '', status, stage: status, assigned_to: owner, owner_user_id: owner === 'Nora Lane' ? 'u2' : owner ? 'u' + (i % 7) : null,
    created_at: day(40 + i), updated_at: day(idle), stage_since: day(idle + 2), mgr_version: i % 3, phone: '9733311' + String(1000 + i), source: ['Instagram', 'Walk-in', 'Website', 'Referral'][i % 4],
    budget: i % 6 === 2 ? null : (800 + i * 137.125), quote_total: status === 'Quoted' || status === 'Won' ? 1500 + i * 41.5 : null, quote_no: status === 'Quoted' ? 'Q-' + i : null,
    follow_up_date: i % 5 === 0 ? new Date(NOW.getTime() - (i % 3 + 1) * 864e5).toISOString().slice(0, 10) : i % 5 === 1 ? new Date(NOW.getTime() + 2 * 864e5).toISOString().slice(0, 10) : null, is_outdoor: false };
  if (status === 'Won') { L.won_at = day(idle + 1); }
  if (status === 'Lost') { L.lost_at = day(idle + 1); L.lost_reason = ['Price too high', 'No response', 'Chose a competitor'][i % 3]; }
  return L;
});
const user = role === 'rep' ? REP : MGR;
const initial = state === 'empty' || state === 'error' ? [] : state === 'readonly' ? leads.map((l) => Object.assign({}, l, { assigned_to: 'Omar Vale', owner_user_id: 'x' })) : leads;
const server = makeFakeServer(initial, { role: role === 'rep' ? 'sales' : 'sales_manager', user });
window.__server = server; window.__calls = server.calls; window.__leads = () => Array.from(server.rows.values());
const onRefresh = state === 'error' || state === 'stale' ? async () => ({ ok: false }) : async () => ({ ok: true });
const hostUser = state === 'readonly' ? REP : user;
createRoot(document.getElementById('root')).render(<Host server={server} user={hostUser} initial={initial} lang={lang} undoMs={undoMs} now={NOW} onRefresh={onRefresh} seeAll={state === 'readonly' ? true : undefined} />);
setTimeout(() => { window.__ready = true; }, 400);
