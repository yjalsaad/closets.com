// =============================================================================
// THE ONE SOURCE OF BUSINESS FACTS FOR THE PUBLIC SITE.
// Rule: nothing here is invented. A value is either (a) already present, and consistent, in the pre-redesign source,
// or (b) null with a TODO: the site contradicted itself and the OWNER must decide once. Components must treat null as
// "do not show" (use hasFact()/fact()), so a contested claim never appears until it is confirmed.
// Every conflict, with every place it occurred, is listed in docs/design/FACTS-TO-CONFIRM.md.
// =============================================================================
import { BUSINESS } from '../seo/siteConfig';

export const FACTS = {
  // ---- confirmed (single value in the source) ----
  brand: 'The Closets Co.',
  legalName: BUSINESS.legalName,
  phone: BUSINESS.telephone,                       // +973 17555095
  phoneHref: 'tel:+97317555095',
  whatsappHref: 'https://wa.me/97317555095',
  email: BUSINESS.email,
  instagram: 'https://www.instagram.com/theclosets/',
  hours: { en: 'Sat–Thu · 9am–8pm', ar: 'السبت – الخميس · ٩ ص – ٨ م' },   // contact page: "Sat-Thu 9am-8pm"
  registeredAddress: BUSINESS.address,             // invoice header (Hamala); NOT a showroom address
  warrantyYears: 10,                               // "10 years on cabinetry and soft-close hardware" (consistent everywhere)

  // ---- TODO(owner): the site contradicts itself; null = hidden until decided ----
  yearsOfCraft: null,        // seen as 15 (badge/marquee/footer chip), 19 (home stat), 20 (about stat, projects), "two decades" (about copy)
  homesDelivered: null,      // seen as "10K+" (home stat), "500+ Homes fitted" (about), "0+" (projects, computed from an empty table)
  productionModel: null,     // seen as "two factories in Bahrain" (campaign business band) vs "our own workshop" / "one workshop" (home, about, projects)
  showroomCount: null,       // seen as 4 (home stat, about copy, contact) while the Showrooms page lists none
  // Area names exist in the source (contact page). No street addresses, no hours per showroom, no maps exist anywhere. TODO(owner): confirm + supply.
  showroomAreas: [
    { en: 'Manama', ar: 'المنامة' }, { en: 'Riffa', ar: 'الرفاع' }, { en: 'Saar', ar: 'سار' }, { en: 'Isa Town', ar: 'مدينة عيسى' },
  ],
  showroomAreasConfirmed: false,                   // TODO(owner): set true once the four areas are confirmed open
};

export const fact = (k) => FACTS[k];
export const hasFact = (k) => FACTS[k] !== null && FACTS[k] !== undefined;
export const L = (v, lang) => (v && typeof v === 'object' ? v[lang === 'ar' ? 'ar' : 'en'] : v);
