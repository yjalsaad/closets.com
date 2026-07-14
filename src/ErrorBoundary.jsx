// ErrorBoundary.jsx — top-level crash catcher for the customer website.
// Prevents a single render error from white-screening the whole site; shows a
// friendly bilingual message and reports the crash to client_errors.
import { Component } from "react";
import { reportError, errMsg } from "./errors";

let _globals = false;
function installGlobals() {
  if (_globals || typeof window === "undefined") return;
  _globals = true;
  window.addEventListener("unhandledrejection", (ev) => {
    const r = ev && ev.reason;
    const m = errMsg(r);
    reportError(m.kind === "unknown" ? "crash" : m.kind, (r && (r.message || String(r))) || "unhandledrejection", r && r.stack);
  });
  window.addEventListener("error", (ev) => {
    if (!ev || !ev.message) return;
    reportError("crash", String(ev.message).slice(0, 500), (ev.error && ev.error.stack) || (ev.filename + ":" + ev.lineno));
  });
}

function isAr() {
  try { return (localStorage.getItem("closets_lang") || document.documentElement.lang) === "ar"; } catch (e) { return false; }
}

export default class ErrorBoundary extends Component {
  constructor(props) { super(props); this.state = { hasError: false }; installGlobals(); }
  static getDerivedStateFromError() { return { hasError: true }; }
  componentDidCatch(error, info) {
    reportError("crash", error && error.message, (error && error.stack) + "\n--\n" + (info && info.componentStack), { source: "render" });
  }
  render() {
    if (!this.state.hasError) return this.props.children;
    const ar = isAr();
    return (
      <div dir={ar ? "rtl" : "ltr"} style={{ minHeight: "70vh", display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center", textAlign: "center", padding: "40px 24px",
        fontFamily: "Inter, system-ui, sans-serif", color: "var(--shop-ink, #1d1d1f)" }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>🛠️</div>
        <h1 style={{ fontSize: 22, fontWeight: 700, margin: "0 0 10px" }}>
          {ar ? "حدث خطأ غير متوقع" : "Something went wrong"}
        </h1>
        <p style={{ fontSize: 15, color: "var(--shop-ink-2, #6e6e73)", maxWidth: 420, lineHeight: 1.6, margin: "0 0 24px" }}>
          {ar ? "نعتذر عن ذلك. حاول إعادة تحميل الصفحة." : "Sorry about that. Please try reloading the page."}
        </p>
        <button onClick={() => { try { window.location.reload(); } catch (e) {} }}
          style={{ background: "var(--clay, #F2731C)", color: "#fff", border: "none", borderRadius: 10, padding: "12px 24px",
            fontSize: 15, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
          {ar ? "إعادة التحميل" : "Reload"}
        </button>
      </div>
    );
  }
}
