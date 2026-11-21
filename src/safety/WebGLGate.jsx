// WebGLGate.jsx — render 3D children only when WebGL works; otherwise a clear message plus a non-3D alternative.
// Also catches a context-creation failure thrown by three.js after mount (blocked GPU, context lost on load).
import SectionBoundary from './SectionBoundary';
import { webglAvailable } from './webgl';

const COPY = {
  title: { en: '3D view is not available on this device', ar: 'العرض ثلاثي الأبعاد غير متاح على هذا الجهاز' },
  body: { en: 'Your browser or device blocked 3D graphics (WebGL). You can still see our work and book a free design visit, and a designer will prepare the 3D plan for you.', ar: 'منع المتصفح أو الجهاز الرسومات ثلاثية الأبعاد (WebGL). يمكنك مع ذلك تصفّح أعمالنا وحجز زيارة تصميم مجانية وسيجهّز لك المصمم المخطط ثلاثي الأبعاد.' },
  gallery: { en: 'Browse our work', ar: 'تصفّح أعمالنا' },
  book: { en: 'Book a free design visit', ar: 'احجز زيارة تصميم مجانية' },
  retry: { en: 'Try again', ar: 'حاول مرة أخرى' },
};
const lang = () => { try { return (localStorage.getItem('closets_lang') || document.documentElement.lang) === 'ar' ? 'ar' : 'en'; } catch (e) { return 'en'; } };

export function WebGLFallback({ onRetry, links = true }) {
  const l = lang();
  return (
    <div role="alert" dir={l === 'ar' ? 'rtl' : 'ltr'} data-webgl-fallback
      style={{ margin: '32px auto', maxWidth: 560, padding: '28px 24px', textAlign: 'center', border: '1px solid rgba(0,0,0,.12)', borderRadius: 16, background: '#fff', color: '#1d1d1f' }}>
      <h2 style={{ fontSize: 20, margin: '0 0 8px' }}>{COPY.title[l]}</h2>
      <p style={{ fontSize: 14.5, lineHeight: 1.6, margin: '0 0 16px' }}>{COPY.body[l]}</p>
      <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
        {links && <a href="/projects" style={{ padding: '10px 18px', border: '1px solid #1d1d1f', borderRadius: 980, color: '#1d1d1f', textDecoration: 'none', fontWeight: 600 }}>{COPY.gallery[l]}</a>}
        {links && <a href="/booking" style={{ padding: '10px 18px', background: '#1d1d1f', borderRadius: 980, color: '#fff', textDecoration: 'none', fontWeight: 600 }}>{COPY.book[l]}</a>}
        {onRetry && <button type="button" onClick={onRetry} style={{ padding: '10px 18px', border: '1px solid #1d1d1f', background: '#fff', borderRadius: 980, cursor: 'pointer', font: 'inherit', fontWeight: 600 }}>{COPY.retry[l]}</button>}
      </div>
    </div>
  );
}

export default function WebGLGate({ children, fallback, name = '3d', inline = false }) {
  const fb = (r) => fallback || <WebGLFallback onRetry={r && r.reset} links={!inline} />;
  if (!webglAvailable()) return fb();
  return <SectionBoundary name={name} fallback={fb}>{children}</SectionBoundary>;
}
