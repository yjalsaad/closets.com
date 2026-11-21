import React, { createContext, useContext, forwardRef } from 'react';
import { Link } from 'react-router-dom';
import { withLang } from './routes';

/** Current UI language, provided by AppInner (derived from the URL when ENABLE_AR_URLS). */
export const LangContext = createContext('en');
export const useUrlLang = () => useContext(LangContext);

/** react-router <Link> that keeps the visitor inside the current language (/ar prefix). Renders a real <a href>. */
export const LangLink = forwardRef(function LangLink({ to, ...rest }, ref) {
  const lang = useContext(LangContext);
  let target = to;
  if (typeof to === 'string' && to.startsWith('/')) {
    const m = to.match(/^([^?#]*)(.*)$/);
    target = withLang(m[1], lang) + m[2];
  } else if (to && typeof to === 'object' && typeof to.pathname === 'string' && to.pathname.startsWith('/')) {
    target = { ...to, pathname: withLang(to.pathname, lang) };
  }
  return <Link ref={ref} to={target} {...rest} />;
});
