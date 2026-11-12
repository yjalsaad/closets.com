/* eslint-disable */
/**
 * SINGLE SOURCE OF TRUTH for the public site origin and the SEO switches.
 * Plain CommonJS on purpose: it is imported by the React app (webpack) AND by the
 * Node build scripts (scripts/seo-build.js, scripts/prerender.js, scripts/seo-check.js).
 *
 * Changing the production domain is ONE env var (REACT_APP_SITE_URL) or the default below.
 * Nothing else in the repo may hard-code the origin.
 */
const DEFAULT_SITE_URL = 'https://closets-website.vercel.app'; // OWNER DECISION PENDING (real brand domain looks like the-closets.com)

const SITE_URL = String(process.env.REACT_APP_SITE_URL || DEFAULT_SITE_URL).trim().replace(/\/+$/, '');

/**
 * Arabic URLs (/ar/...). true = the language lives in the URL, is prerendered, has hreflang
 * alternates and is listed in the sitemap. false = the old behaviour (one URL, localStorage toggle).
 * Override at build time with REACT_APP_ENABLE_AR_URLS=0.
 */
const ENABLE_AR_URLS = String(process.env.REACT_APP_ENABLE_AR_URLS === undefined ? '1' : process.env.REACT_APP_ENABLE_AR_URLS) !== '0';

/** Social share image (1200x630) in /public. One image for every route until category images exist. */
const OG_IMAGE_PATH = '/og-image.jpg';
const LOGO_PATH = '/logo512.png';

/**
 * Business facts. ONLY values that already exist in the site source (src/App.js) are listed here.
 * Anything missing is null and is rendered as a TODO in docs/SEO-DECISIONS.md, never invented.
 */
const BUSINESS = {
  name: 'The Closets Co.',
  nameAr: 'ذا كلوزتس',
  legalName: 'The Closets International W.L.L.', // App.js invoice template
  telephone: '+973 17555095',                    // App.js footer / contact page
  email: 'info@the-closets.com',                 // App.js contact page
  // App.js invoice header ("Building 2249, Road 90, Block 1014, P.O. Box 31613 - Hamala"). Registered address; the
  // public showrooms (Manama, Riffa, Saar, Isa Town) have NO street addresses in the source.
  address: { streetAddress: 'Building 2249, Road 90, Block 1014', postOfficeBoxNumber: '31613', addressLocality: 'Hamala', addressCountry: 'BH' },
  // App.js contact page: "Sat-Thu 9am-8pm"
  hours: { days: ['Saturday', 'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday'], opens: '09:00', closes: '20:00' },
  geo: null,                                      // TODO owner: not present in source
  sameAs: ['https://www.instagram.com/theclosets/'], // App.js footer (the only verified profile)
};

module.exports = { SITE_URL, ENABLE_AR_URLS, OG_IMAGE_PATH, LOGO_PATH, BUSINESS, DEFAULT_SITE_URL };
