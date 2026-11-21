// errors.js — shared error layer for the customer website.
//   errKind(err) / errMsg(err) — canonical bilingual taxonomy (shared w/ Hub+public+mobile)
//   reportError(...)           — best-effort log to Supabase client_errors
//   handleError(err, {toast,ctx}) — classify + optional toast + log; returns message
// Reads the current site language from localStorage('closets_lang') so messages
// come out in the user's language (EN/AR).
import { scrubText, safePath } from "./safety/scrub";

const SUPA_URL = "https://jflmbfxbhpioyniibjsj.supabase.co";
const SUPA_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpmbG1iZnhiaHBpb3luaWlianNqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ4NjkyNjQsImV4cCI6MjA5MDQ0NTI2NH0.XnQHF1Ivzhv6Zj12qe1Gh2x6ZyLdFfmUBweE_5SZnu0";

const MSG = {
  network:    { en: "Can't reach the server. Check your connection and try again.",
                ar: "تعذّر الوصول إلى الخادم. تحقّق من اتصالك وحاول مرة أخرى." },
  auth:       { en: "Your session has expired. Please sign in again.",
                ar: "انتهت جلستك. الرجاء تسجيل الدخول مرة أخرى." },
  permission: { en: "You don't have permission to do that.",
                ar: "ليس لديك صلاحية للقيام بذلك." },
  notfound:   { en: "We couldn't find what you're looking for.",
                ar: "لم نتمكن من العثور على ما تبحث عنه." },
  validation: { en: "Some details look incorrect. Please review and try again.",
                ar: "بعض البيانات غير صحيحة. الرجاء المراجعة والمحاولة مرة أخرى." },
  conflict:   { en: "That already exists or was already submitted.",
                ar: "موجود بالفعل أو تم إرساله مسبقاً." },
  rate:       { en: "Too many attempts. Please wait a moment and try again.",
                ar: "محاولات كثيرة. الرجاء الانتظار قليلاً والمحاولة مرة أخرى." },
  server:     { en: "Something went wrong on our side. Please try again shortly.",
                ar: "حدث خطأ لدينا. الرجاء المحاولة بعد قليل." },
  unknown:    { en: "Something went wrong. Please try again.",
                ar: "حدث خطأ ما. الرجاء المحاولة مرة أخرى." },
};

function curLang() {
  try {
    return (localStorage.getItem("closets_lang") ||
      (document.documentElement.lang === "ar" ? "ar" : "en")) === "ar" ? "ar" : "en";
  } catch (e) { return "en"; }
}

export function errKind(err) {
  if (!err) return "unknown";
  if (err.__kind && MSG[err.__kind]) return err.__kind;
  const status = err.status || (err.response && err.response.status) || 0;
  const raw = `${err.message || err.detail || err.hint || err}`.toLowerCase();
  if (status === 401 || /jwt|token|expired|not authenticated/.test(raw)) return "auth";
  if (status === 403 || /permission denied|\brls\b|not allowed|forbidden/.test(raw)) return "permission";
  if (status === 404 || /not_found|not found|no rows|pgrst116/.test(raw)) return "notfound";
  if (status === 409 || /duplicate|already|unique|conflict/.test(raw)) return "conflict";
  if (status === 422 || status === 400 || /invalid|required|missing|validation|violates/.test(raw)) return "validation";
  if (status === 429 || /too many|rate limit/.test(raw)) return "rate";
  if (status >= 500) return "server";
  if ((err.name === "TypeError" && /fetch|network|failed/.test(raw)) || (status === 0 && raw)) return "network";
  return "unknown";
}

export function errMsg(err) {
  const kind = errKind(err);
  const m = MSG[kind] || MSG.unknown;
  return { kind, en: m.en, ar: m.ar, text: curLang() === "ar" ? m.ar : m.en };
}

let _reporting = false;
// PII policy: nothing identifying leaves the browser in an error report. No customer id / e-mail / phone,
// no query string or hash (they can carry tokens and referral codes), and e-mails / numbers / tokens
// inside the message or stack are masked. Only the role is kept (it is not personal data).
export function reportError(kind, message, detail, ctx) {
  if (_reporting) return;
  try {
    _reporting = true;
    let user_role = null;
    try {
      const u = JSON.parse(localStorage.getItem("closets_user") || "null");
      if (u && typeof u.role === "string") user_role = u.role.slice(0, 40);
    } catch (e) {}
    const safeCtx = {};
    Object.keys(ctx || {}).forEach((k) => { const v = ctx[k]; safeCtx[k] = typeof v === "string" ? scrubText(v, 200) : (typeof v === "number" || typeof v === "boolean") ? v : undefined; });
    fetch(SUPA_URL + "/rest/v1/rpc/log_client_error", {
      method: "POST", keepalive: true,
      headers: { apikey: SUPA_KEY, Authorization: "Bearer " + SUPA_KEY, "Content-Type": "application/json" },
      body: JSON.stringify({
        p_app: "website", p_kind: kind || "unknown", p_message: scrubText(message || "", 500) || "",
        p_detail: detail == null ? null : scrubText(detail, 3500),
        p_context: Object.assign({ url: typeof window !== "undefined" ? safePath() : "" }, safeCtx),
        p_user_id: null, p_user_role: user_role,
      }),
    }).catch(() => {});
  } catch (e) {} finally { _reporting = false; }
}

export function handleError(err, opts = {}) {
  const m = errMsg(err);
  try { if (typeof opts.toast === "function") opts.toast(m.text, "error"); } catch (e) {}
  reportError(m.kind, err && (err.message || String(err)), err && (err.stack || err.detail), opts.ctx);
  return m.text;
}

export default { errKind, errMsg, reportError, handleError };
