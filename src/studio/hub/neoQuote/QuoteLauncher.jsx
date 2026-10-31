/* =============================================================================
 * [WEB-STUDIO 2026-10-31] Website shim of Bonsai's neoQuote/QuoteLauncher.jsx.
 * Same props and the same place in every studio toolbar, but for CUSTOMERS: "Get quote" asks the studio for its quote context
 * (contexts.js: design, facts, priced lines), takes the 3D picture, and opens the customer quote dialog (save to My designs /
 * request a quote -> Bonsai lead). The staff Quote Max panel is not shipped to the website.
 * ===========================================================================*/
import React, { Suspense, useCallback, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { capture } from './snapshot';

const QuoteDialog = React.lazy(() => import('../../QuoteDialog'));

export default function QuoteLauncher({ getContext, lang = 'en', toast, disabled = false, disabledReason, className = '', testid = 'nq-open' }) {
  const ar = lang === 'ar';
  const btn = useRef(null);
  const [open, setOpen] = useState(null);
  const [busy, setBusy] = useState(false);
  const openIt = useCallback(async () => {
    if (busy) return;
    setBusy(true);
    try {
      const ctx = getContext();
      if (!ctx) return;
      const root = (btn.current && btn.current.closest('.nk')) || document.body;
      let shot = null; try { shot = await capture(root); } catch (e) { shot = null; }
      setOpen({ ctx, shot });
    } catch (e) {
      if (typeof toast === 'function') { try { toast(ar ? 'تعذّر تجهيز طلب عرض السعر' : 'Could not prepare your quote request', 'error'); } catch (e2) { /* ignore */ } }
    } finally { setBusy(false); }
  }, [busy, getContext, toast, ar]);
  return (
    <>
      <button ref={btn} type="button" className={`nk-btn nk-btn-primary nq-launch ws-getquote ${className}`} onClick={openIt} disabled={disabled || busy} data-testid={testid}
        title={disabled ? disabledReason : (ar ? 'احفظ تصميمك واطلب عرض سعر من فريقنا' : 'Save your design and ask our team for a quote')} aria-haspopup="dialog">
        {ar ? 'اطلب عرض سعر' : 'Get quote'}
      </button>
      {open ? createPortal(
        <Suspense fallback={null}>
          <QuoteDialog ctx={open.ctx} shot={open.shot} lang={lang} toast={toast} onClose={() => { setOpen(null); try { btn.current && btn.current.focus(); } catch (e) { /* gone */ } }} />
        </Suspense>, document.body) : null}
    </>
  );
}
