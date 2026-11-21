// Route chunk "CampaignPage" — the [CAMPAIGN-MENU] page from main, kept as its own route chunk like the other pages (perf).
// Shared app helpers (api, useI18n, AppCtx, …) are imported from ../App (live bindings; this chunk only loads after App has evaluated).
import { cms, useI18n, useMobile, useReveal } from '../App';
import { useIkhLanding, IkhtarhaSpotlight, IkhtarhaGames, IkhtarhaDesigns } from '../campaign/HomeCampaign';

// [CAMPAIGN-MENU 2026-11-14] Campaign: the live reward campaign («اختارها») on its own page, reached from the menu.
export function CampaignPage({ setPage }) {
  const { lang } = useI18n();
  const mobile = useMobile();
  const ikh = useIkhLanding();   // null = loading, false = no live campaign, object = live
  useReveal();
  const ar = lang === 'ar';
  return (
    <div style={{ minHeight:'100dvh', background:'var(--cream)', paddingTop: mobile?56:64, paddingBottom:90 }} data-testid="campaign-page">
      <IkhtarhaSpotlight cfg={ikh} lang={lang} mobile={mobile} cms={cms} setPage={setPage} />
      <IkhtarhaGames cfg={ikh} lang={lang} cms={cms} />
      <IkhtarhaDesigns cfg={ikh} lang={lang} cms={cms} setPage={setPage} />
      {ikh === false && (
        <div style={{ maxWidth:640, margin:'0 auto', padding: mobile?'72px 24px':'120px 32px', textAlign:'center' }}>
          <div className="eyebrow" style={{ marginBottom:14 }}>{ar ? 'الحملة' : 'Campaign'}</div>
          <h1 className="display" style={{ fontSize: mobile?30:44, color:'var(--ink)' }}>{ar ? 'لا توجد حملة حالياً' : 'No campaign is running right now'}</h1>
          <p style={{ fontSize:16, color:'var(--ink-soft)', marginTop:14, lineHeight:1.7 }}>{ar ? 'تابع عروضنا الحالية، والحملة القادمة ستظهر هنا.' : 'See our current offers. The next campaign will appear here.'}</p>
          <button type="button" className="btn-clay" style={{ marginTop:24 }} onClick={()=>setPage('offers')}>{ar ? 'شاهد العروض' : 'See the offers'}</button>
        </div>
      )}
    </div>
  );
}
