// errors.js — shared error layer for the Hub (App.js + modules).
//
//   errKind(err)     -> canonical bucket string (same taxonomy as public/mobile)
//   errMsg(err)      -> clean bilingual { en, ar, text } for the current lang
//   reportError(...) -> logs to Supabase client_errors (best-effort, never throws)
//   handleError(err, { toast, ctx }) -> map + toast + report; returns the message
//
// The Hub has no global i18n, so errMsg().text defaults to EN; AR is available
// via .ar for RTL surfaces. Keep the taxonomy identical across every asset.
import { SUPA_URL, SUPA_KEY } from "./supaConfig";

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
  conflict:   { en: "That already exists or was already saved.",
                ar: "موجود بالفعل أو تم حفظه مسبقاً." },
  rate:       { en: "Too many attempts. Please wait a moment and try again.",
                ar: "محاولات كثيرة. الرجاء الانتظار قليلاً والمحاولة مرة أخرى." },
  server:     { en: "Something went wrong on our side. Please try again shortly.",
                ar: "حدث خطأ لدينا. الرجاء المحاولة بعد قليل." },
  unknown:    { en: "Something went wrong. Please try again.",
                ar: "حدث خطأ ما. الرجاء المحاولة مرة أخرى." },
};

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
  return { kind, en: m.en, ar: m.ar, text: m.en };
}

let _reporting = false;
export function reportError(kind, message, detail, ctx) {
  if (_reporting) return; // guard against logging-loop recursion
  try {
    _reporting = true;
    let user_id = null, user_role = null;
    try {
      const u = JSON.parse(localStorage.getItem("closets_session") || "null");
      if (u) { user_id = String(u.id || ""); user_role = u.role || null; }
    } catch (e) {}
    fetch(SUPA_URL + "/rest/v1/rpc/log_client_error", {
      method: "POST", keepalive: true,
      headers: { apikey: SUPA_KEY, Authorization: "Bearer " + SUPA_KEY, "Content-Type": "application/json" },
      body: JSON.stringify({
        p_app: "hub", p_kind: kind || "unknown", p_message: String(message || "").slice(0, 500),
        p_detail: detail == null ? null : String(detail).slice(0, 3500),
        p_context: Object.assign({ url: typeof location !== "undefined" ? location.pathname : "" }, ctx || {}),
        p_user_id: user_id, p_user_role: user_role,
      }),
    }).catch(() => {});
  } catch (e) {} finally { _reporting = false; }
}

// One-call helper for catch blocks: classify, toast, log. Returns the message.
export function handleError(err, opts = {}) {
  const m = errMsg(err);
  try { if (typeof opts.toast === "function") opts.toast(m.text, "error"); } catch (e) {}
  reportError(m.kind, err && (err.message || String(err)), err && (err.stack || err.detail), opts.ctx);
  return m.text;
}

// [UI-STD 2026-10-30] For read paths that keep a fallback value — `.catch(swallow([], 'Leads'))`.
// Behaviour is UNCHANGED (the fallback is still returned), but a real failure is no longer
// silent: network / expired-session / server errors raise ONE bilingual toast (throttled), so a
// 500 no longer renders as "no data". permission / notfound / validation (optional tables, RLS
// on role-gated reads) are logged only — toasting those would be noise. Everything loud is
// logged to client_errors, throttled per kind+label.
const _TOAST_KINDS = new Set(["network", "auth", "server"]);
const _LOG_KINDS = new Set(["network", "auth", "server", "permission", "unknown"]);
let _lastToast = 0; const _lastLog = new Map();
export function swallow(fallback, label) {
  return (err) => {
    try {
      const kind = errKind(err); const now = Date.now();
      if (_LOG_KINDS.has(kind)) {
        const key = kind + "|" + (label || "");
        if (now - (_lastLog.get(key) || 0) > 60000) { _lastLog.set(key, now); reportError(kind, "read failed: " + (label || "?"), err && (err.message || String(err)), { swallowed: true, label }); }
      }
      if (_TOAST_KINDS.has(kind) && now - _lastToast > 15000 && typeof window !== "undefined" && typeof window.__hubToast === "function") {
        _lastToast = now;
        const m = MSG[kind];
        const ar = typeof document !== "undefined" && document.documentElement.getAttribute("dir") === "rtl";
        window.__hubToast(ar ? m.ar : m.en, "error");
      }
    } catch (e) { /* the fallback must always be returned */ }
    return fallback;
  };
}

export default { errKind, errMsg, reportError, handleError, swallow };
