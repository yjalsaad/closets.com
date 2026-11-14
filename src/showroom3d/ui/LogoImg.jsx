import React, { useEffect, useState } from 'react';
import { LOGO_URL, keyedLogoUrl } from '../logo';

/** The official logo for DOM use: shown raw (multiplied) at first, swapped for the paper-keyed version once it is ready. */
export default function LogoImg({ alt, className = '', ...rest }) {
  const [src, setSrc] = useState(null);
  useEffect(() => { let on = true; keyedLogoUrl().then((u) => { if (on && u) setSrc(u); }); return () => { on = false; }; }, []);
  return <img src={src || LOGO_URL} alt={alt} className={className + (src ? '' : ' is-raw')} decoding="async" {...rest} />;
}
