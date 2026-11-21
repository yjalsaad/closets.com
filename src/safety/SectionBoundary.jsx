// SectionBoundary.jsx — granular error boundary. Wrap one route or one CMS / 3D / planner section so a
// render error there shows a small, localised message instead of blanking the whole site.
import { Component } from 'react';
import { reportError } from '../errors';

const COPY = {
  title: { en: 'This section could not be shown', ar: 'تعذّر عرض هذا القسم' },
  body: { en: 'The rest of the page still works. You can try again.', ar: 'بقية الصفحة تعمل بشكل طبيعي. يمكنك المحاولة مرة أخرى.' },
  retry: { en: 'Try again', ar: 'حاول مرة أخرى' },
};
const lang = () => { try { return (localStorage.getItem('closets_lang') || document.documentElement.lang) === 'ar' ? 'ar' : 'en'; } catch (e) { return 'en'; } };

export default class SectionBoundary extends Component {
  constructor(props) { super(props); this.state = { err: null }; this.reset = this.reset.bind(this); }
  static getDerivedStateFromError(err) { return { err }; }
  componentDidCatch(err, info) {
    reportError('crash', err && err.message, (err && err.stack) + '\n--\n' + (info && info.componentStack), { source: 'section', section: this.props.name || 'unnamed' });
    if (this.props.onError) { try { this.props.onError(err); } catch (e) { /* ignore */ } }
  }
  componentDidUpdate(prev) {
    if (this.state.err && prev.resetKey !== this.props.resetKey) this.setState({ err: null });
  }
  reset() { this.setState({ err: null }); }
  render() {
    if (!this.state.err) return this.props.children;
    const { fallback, silent, minHeight } = this.props;
    if (silent) return null;
    if (typeof fallback === 'function') return fallback({ error: this.state.err, reset: this.reset });
    if (fallback !== undefined) return fallback;
    const l = lang();
    return (
      <div role="alert" dir={l === 'ar' ? 'rtl' : 'ltr'} data-section-error={this.props.name || ''}
        style={{ margin: '24px auto', maxWidth: 560, padding: '20px 22px', textAlign: 'center', border: '1px solid rgba(0,0,0,.12)', borderRadius: 14, background: 'rgba(255,255,255,.7)', minHeight: minHeight || undefined }}>
        <div style={{ fontWeight: 700, marginBottom: 6 }}>{COPY.title[l]}</div>
        <div style={{ fontSize: 14, opacity: .8, marginBottom: 12 }}>{COPY.body[l]}</div>
        <button type="button" onClick={this.reset} style={{ cursor: 'pointer', padding: '8px 18px', borderRadius: 980, border: '1px solid currentColor', background: 'transparent', color: 'inherit', font: 'inherit', fontWeight: 600 }}>{COPY.retry[l]}</button>
      </div>
    );
  }
}
