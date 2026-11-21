// FormNotice.jsx — short plain-language collection notice shown at every form that collects personal data.
import { useInRouterContext } from 'react-router-dom';
import { LangLink as Link } from '../seo/lang';   // keeps the /ar prefix on Arabic pages
import { tr, curLang } from './strings';

export default function FormNotice({ kind = 'request', lang: langProp, style }) {
  const lang = langProp || curLang();
  const inRouter = useInRouterContext();
  const key = kind === 'order' ? 'formNoteOrder' : kind === 'newsletter' ? 'formNoteNews' : 'formNote';
  const label = tr('formNoteLink', lang);
  return (
    <p className="form-note" data-testid="form-notice" dir={lang === 'ar' ? 'rtl' : 'ltr'} style={style}>
      {tr(key, lang)}{' '}
      {inRouter ? <Link to="/privacy">{label}</Link> : <a href={lang === 'ar' ? '/ar/privacy' : '/privacy'}>{label}</a>}.
    </p>
  );
}

// Disclosure placed next to photo-upload / AI-chat controls.
export function AiNotice({ lang: langProp, style }) {
  const lang = langProp || curLang();
  return <p className="form-note" data-testid="ai-notice" dir={lang === 'ar' ? 'rtl' : 'ltr'} style={style}>{tr('aiInline', lang)}</p>;
}
