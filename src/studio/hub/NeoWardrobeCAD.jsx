import './neoKitchen/cssOrder'; // [CI-CSS-ORDER] must stay the first import: fixes the shared stylesheet order
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getOutput } from "./neoKitchen/outputSettings"; // [NEO-OUTPUT-UX34] the quote hand-off carries the Output setting
import { SUPA_URL, SUPA_HEADERS } from "./supaConfig";
import Cabinets3D from "./Cabinets3D";
import { elevationSceneSVG } from "./ClosetPreview2D";
import {
  DEFAULT_RULES, normRules, newWardrobeConfig, optimizeModules,
  doorCountFor, validateConfig,
} from "./neo/engines/wardrobe/config.mjs";
import { priceWardrobe } from "./neo/engines/wardrobe/price.mjs";
import { cuttingList, boq, manufacturingEstimate } from "./neo/engines/wardrobe/manufacture.mjs";
import { panels as buildPanels, machiningOps, constructionReview, edgeBandTotal, DEFAULT_PROFILE } from "./neo/engines/wardrobe/construction.mjs";
import { hardwareList, recommendHinges, recommendRunner } from "./neo/engines/wardrobe/hardware.mjs";
import { cuttingPlan, DEFAULT_STOCK } from "./neo/engines/wardrobe/nesting.mjs";
import { machiningPlan, toMIF } from "./neo/engines/wardrobe/machining.mjs";
import { postProcess, toCSV, listPosts } from "./neo/engines/wardrobe/cnc.mjs";
import { addRevision, restore, approve, lock, isLocked, compare } from "./neo/engines/wardrobe/revisions.mjs";
import { parseWardrobeBrief, commandToConfig } from "./neo/engines/wardrobe/aiparse.mjs";
import { doorPrice, groupIndexOf } from "./neo/engines/design/doorprice.mjs";
import { usePublishDesignMeta, useLeadContext } from "./neoLeads/leadContext";   // [NEO-LEADS-UX37]
import NeoWardrobeStudio from "./neoWardrobe/NeoWardrobeStudio";   // [NEO-CLOSETS-UX22] Neo Kitchen workspace for wardrobes
import {
  partConfigs, developedConfig, validateLShape, isL, mergeCutting, mergeBoq, mergeEstimate, mergePanels, mergeHardware, mergeMachining, mergeOps, mergeReview,
} from "./neo/engines/wardrobe/lshape.mjs";   // [NEO-CLOSETS-UX24] L-shaped wardrobe: main + return wing
import { normalizeX } from "./neoWardrobe/wardrobeModel";
import { swallow } from './errors'; // [UI-STD 2026-10-30] failed reads surface instead of rendering as "no data"

/*
  NeoWardrobeCAD — Phase 1 parametric wardrobe CAD (see docs/CAD_IMPLEMENTATION_PLAN.md).
  ONE source of truth: the WardrobeConfiguration built here drives 3D + engineering + cost + quote.
  Every number below comes from the shared .mjs engines — never from the mesh.
*/

const money = (n) => "BD " + (Math.round((Number(n) || 0) * 100) / 100).toFixed(2);
const T = {
  bg1: "var(--bg-1)", bg2: "var(--bg-2)", bg3: "var(--bg-3)", t1: "var(--text-1)", t2: "var(--text-2)",
  t3: "var(--text-3)", br: "var(--border)", brand: "var(--color-brand)", brandStrong: "var(--color-brand-strong)",
};
const inp = { padding: "7px 9px", border: "1px solid var(--border-control, var(--border-2))", borderRadius: 'var(--radius-md)', fontSize: 13, background: T.bg2, color: T.t1, boxSizing: "border-box", outline: "none", width: "100%" };
const lbl = { fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".05em", color: T.t3, marginBottom: 5 };
const btn = { padding: 'var(--space-2) var(--space-3)', border: `1px solid ${T.br}`, borderRadius: 'var(--radius-lg)', fontSize: 12.5, background: T.bg1, color: T.t1, cursor: "pointer", fontWeight: 700, fontFamily: "inherit" };
const card = (on) => ({ border: `1.5px solid ${on ? T.brand : T.br}`, borderRadius: 'var(--radius-lg)', padding: "9px 11px", background: on ? "var(--color-brand-muted)" : T.bg1, cursor: "pointer", fontFamily: "inherit", textAlign: "left" });

const DOOR_VIS = (code) => /slid/.test(code || "") ? "sliding" : /glass|mirror/.test(code || "") ? "glass" : "slab";
const RI = (v) => Math.max(0, Math.round(Number(v) || 0));

export const WARDROBE_LEAD_KEY = "neo_wardrobe_lead_design_v1";   // [NEO-LEADS-UX37] the design of a lead-linked session (the wardrobe has no other autosave)
export default function NeoWardrobeCAD({ toast, currentUser, onSendToQuote, leadMode: leadModeProp, startLang }) { // [WEB-STUDIO] startLang
  const leadModeCtx = useLeadContext("neo-closets"); const leadMode = leadModeProp !== undefined ? !!leadModeProp : !!leadModeCtx;   // [NEO-LEADS-UX37] lead-linked session (the lead bar owns the context)
  const notify = (m, k) => { if (typeof toast === "function") toast(m, k); };
  const [rules, setRules] = useState(DEFAULT_RULES);
  const [doorTypes, setDoorTypes] = useState([]);
  const [finishes, setFinishes] = useState([]);
  const [groups, setGroups] = useState([]);

  const [dims, setDims] = useState({ w: 2400, h: 2400, d: 600 });
  const [type, setType] = useState("sliding");          // sliding | hinged | open
  const [doorSystem, setDoorSystem] = useState("sliding_alu");
  const [finishId, setFinishId] = useState("");
  const [optIdx, setOptIdx] = useState(0);
  const [mods, setMods] = useState(null);               // editable modules (interior); null = derive from optimizer
  const [overrideMods, setOverrideMods] = useState(null); // exact modules from the AI assistant (consumed once)
  const [brief, setBrief] = useState("");               // ✨ natural-language design brief
  const [aiCmd, setAiCmd] = useState(null);             // last parsed structured command (transparency)
  const [selMod, setSelMod] = useState(null);
  const [accessories, setAccessories] = useState([]);
  const [mode, setMode] = useState("design");           // design | construction | manufacturing | presentation
  const [profile, setProfile] = useState(DEFAULT_PROFILE); // construction profile (top/back/plinth …)
  const [stock, setStock] = useState(DEFAULT_STOCK);       // sheet size / kerf for nesting
  const [post, setPost] = useState("generic");            // CNC export format
  const [nestMethod, setNestMethod] = useState("guillotine"); // shelf | guillotine (advanced)
  const [revs, setRevs] = useState([]);                   // 🗂 design revisions
  const [numStart, setNumStart] = useState(5);            // 🧩 component numbering start
  const [numStep, setNumStep] = useState(5);              // …and step (SmartWOP-style 5,10,15…)
  const [explode, setExplode] = useState(35);             // exploded-view amount (%)
  const [view, setView] = useState("studio");             // [NEO-CLOSETS-UX22] studio (Neo workspace) | classic (this engineering view)
  const keepStudioMods = useRef(false);
  const [studioX, setStudioX] = useState(() => normalizeX({}));  // what only the studio edits (boards, plinth, handles, clothes ...)

  // ── load rules / door types / finishes / groups (real data, no hard-coding) ──
  useEffect(() => {
    let alive = true;
    const get = (q) => fetch(SUPA_URL + "/rest/v1/" + q, { headers: SUPA_HEADERS }).then(r => r.ok ? r.json() : []).catch(swallow([], 'NeoWardrobeCAD'));
    Promise.all([
      get("wardrobe_rules?select=*&limit=1"),
      get("pp_door_types?select=*&order=code"),
      get("pp_finishes?select=*&deleted_at=is.null&active=eq.true&order=sort"),
      get("pp_price_groups?select=*&order=group_no"),
    ]).then(([wr, dt, fn, gr]) => {
      if (!alive) return;
      setRules(normRules((Array.isArray(wr) && wr[0]) || {}));
      setDoorTypes(Array.isArray(dt) ? dt : []);
      setFinishes(Array.isArray(fn) ? fn : []);
      setGroups(Array.isArray(gr) ? gr : []);
      if (Array.isArray(fn) && fn.length) setFinishId(f => f || fn[0].id);
    });
    return () => { alive = false; };
  }, []);

  const R = useMemo(() => normRules(rules), [rules]);
  const finish = useMemo(() => finishes.find(f => f.id === finishId) || finishes[0] || null, [finishes, finishId]);
  const groupNo = finish ? (finish.group_no || 0) : 0;
  const rankedOpts = useMemo(() => optimizeModules(dims.w, R, 3), [dims.w, R]);

  // [NEO-CLOSETS-UX22] the studio edits THIS state: one design object in, one design object out (so 3D, cut list, price and quote never disagree)
  const studioDesign = useMemo(() => ({ dims, type, doorSystem, finishId: finish ? finish.id : "", optIdx, mods: overrideMods || mods || [], x: studioX }), [dims, type, doorSystem, finish, optIdx, overrideMods, mods, studioX]);
  const applyStudioDesign = useCallback((d) => {
    setDims(d.dims); setType(d.type); setDoorSystem(d.doorSystem); setOptIdx(d.optIdx || 0); setStudioX(d.x);
    if (d.finishId) setFinishId(d.finishId);
    setOverrideMods(d.mods.map(m => ({ ...m })));   // [NEO-CLOSETS-UX25] keeps the studio's per-column extras (leaves, hinge side, hidden, pinned, own rail height, door / material)
  }, []);

  // [NEO-LEADS-UX37] lead-linked session: restore the design the lead host seeded, then keep the same key current (600 ms after the last edit) so the host can save it to the lead
  const [leadReady, setLeadReady] = useState(!leadMode);
  const leadAtMount = useRef(!!leadMode);   // only a session that STARTED lead-linked restores; linking a lead mid-session keeps what is on screen
  useEffect(() => {
    if (!leadMode || leadReady) return;
    if (leadAtMount.current) try { const j = JSON.parse(localStorage.getItem(WARDROBE_LEAD_KEY) || "null"); if (j && j.design && j.design.dims && Array.isArray(j.design.mods) && j.design.mods.length) { applyStudioDesign({ ...j.design, x: normalizeX(j.design.x) }); setAccessories(Array.isArray(j.accessories) ? j.accessories : []); } } catch (e) { /* a damaged copy starts from the default */ }
    setLeadReady(true);
  }, [leadMode, leadReady, applyStudioDesign]);
  useEffect(() => {
    if (!leadMode || !leadReady) return undefined;
    const tm = setTimeout(() => { try { localStorage.setItem(WARDROBE_LEAD_KEY, JSON.stringify({ v: 1, at: new Date().toISOString(), design: studioDesign, accessories })); } catch (e) { /* storage full / blocked */ } }, 600);
    return () => clearTimeout(tm);
  }, [leadMode, leadReady, studioDesign, accessories]);

  // ── derive modules from the chosen optimizer option; keep manual interior edits when present ──
  useEffect(() => {
    if (overrideMods) { setMods(overrideMods); setOverrideMods(null); keepStudioMods.current = true; return; }   // exact AI / studio modules, one-shot
    if (keepStudioMods.current) { keepStudioMods.current = false; return; }       // [NEO-CLOSETS-UX25] the re-run that follows must NOT re-split the columns: it used to reset every width / extra the studio had just set
    const chosen = rankedOpts[Math.min(optIdx, Math.max(0, rankedOpts.length - 1))];
    const widths = chosen ? chosen.modules : [dims.w];
    setMods(prev => widths.map((w, i) => {
      const p = prev && prev[i];
      return { id: "M" + String(i + 1).padStart(2, "0"), width: w,
        hanging: p ? p.hanging : (i % 2 === 0 ? "double" : "none"),
        shelves: p ? p.shelves : 2, drawers: p ? p.drawers : (i === 1 ? 3 : 0) };
    }));
    // eslint-disable-next-line
  }, [dims.w, optIdx, rankedOpts.length, overrideMods]);

  // ── the single source of truth ──
  const config = useMemo(() => {
    if (!mods) return null;
    // [NEO-CLOSETS-UX25] a column the studio HIDES is turned off (not in the 3D, the cut list or the price): the engine sees only the visible ones
    const visMods = mods.filter(m => !m.hidden);
    const priced = visMods.length ? visMods : mods;
    const pw = priced === mods ? dims.w : priced.reduce((t, m) => t + (m.width || 0), 0);
    return newWardrobeConfig({
      width: pw, height: dims.h, depth: dims.d, type,
      doors: type === "open" ? 0 : doorCountFor(pw, type, R),
      modules: priced.some(m => m.drawers > 0 && (m.dMode || studioX.drawerMode) === "inside") ? priced.map(m => ({ ...m, dMode: (m.dMode || studioX.drawerMode) === "inside" ? "inside" : "front" })) : priced,  // [NEO-CLOSETS-UX30] drawers INSIDE the carcass behind the door: the engines name the inner front and give the drawers no handle
      doorSystem: type === "open" ? "none" : doorSystem,
      carcassFinish: finish ? finish.name : null, doorFinish: finish ? finish.name : null,
      accessories,
      // [NEO-CLOSETS-UX24] the L-Shape tab's return wing rides on the same configuration (null = a straight wardrobe)
      glass: type !== "open" && studioX.doorStyle && studioX.doorStyle !== "solid" ? { style: studioX.doorStyle, divisions: studioX.divisions || 0 } : null, // [NEO-CLOSETS-UX24] glass / smoked doors + divisions price through the engine
      wing: studioX.wing && studioX.wing.on ? { side: studioX.wing.side, corner: studioX.wing.corner, depth: studioX.wing.depth, modules: (studioX.wing.mods.some(m => !m.hidden) ? studioX.wing.mods.filter(m => !m.hidden) : studioX.wing.mods) } : null,
    });
  }, [mods, dims, type, doorSystem, R, finish, accessories, studioX.wing, studioX.doorStyle, studioX.divisions, studioX.drawerMode]);

  // ── engineering + cost (all from engines) ──
  const eng = useMemo(() => {
    if (!config) return null;
    const dt = doorTypes.find(d => d.code === doorSystem) || null;
    const gi = groupIndexOf(groups, groupNo);
    // [NEO-CLOSETS-UX24] an L-shaped wardrobe: price + quote use ONE straight configuration of the developed length (main + wing); the cut list, BOQ, hardware,
    // panels and CNC are built per part (main, wing) and merged - a straight wardrobe is a single part and nothing changes
    const dev = developedConfig(config, R);
    const parts = partConfigs(config, R);
    const areaFront = dev.width * dev.height / 1e6;
    const carcaseBase = Math.round(areaFront * (R.carcase_rate_m2 || 90));
    const totShelves = dev.modules.reduce((s, m) => s + RI(m.shelves), 0);
    const totDrawers = dev.modules.reduce((s, m) => s + RI(m.drawers), 0);
    const hanging = dev.modules.filter(m => m.hanging && m.hanging !== "none").length;
    const interior = totShelves * (R.shelf_rate || 8) + totDrawers * (R.drawer_rate || 35) + hanging * (R.hanging_rate || 12);
    const priced = priceWardrobe(dev, { rules: R, groupIndex: gi, doorType: type === "open" ? null : dt, carcaseBase, finishMultiplier: gi / 100, interior, accessories, discountPct: 0, role: "sales" });
    const panelList = mergePanels(parts.map(c => buildPanels(c, profile)));
    const hw = mergeHardware(parts.map(c => hardwareList(c, profile)));
    const hinge = type === "hinged" && config.doors > 0 ? recommendHinges(Math.round(config.width / config.doors), config.height, profile.panel_thickness) : null;
    const runner = totDrawers > 0 ? recommendRunner(config.depth) : null;
    return { priced, dev, bom: mergeBoq(parts.map(c => boq(c))), cut: mergeCutting(parts.map(c => cuttingList(c))), est: mergeEstimate(parts.map(c => manufacturingEstimate(c))), val: validateLShape(config, R),
      panelList, ops: mergeOps(parts.map(c => machiningOps(c, profile))), review: mergeReview(parts.map(c => constructionReview(c, profile, R))), edgeM: edgeBandTotal(panelList),
      hw, hinge, runner, plan: cuttingPlan(panelList, stock, { method: nestMethod }), mplan: mergeMachining(parts.map(c => machiningPlan(c, profile))), totShelves, totDrawers, hanging };
  }, [config, doorTypes, doorSystem, groups, groupNo, R, type, accessories, profile, stock, nestMethod]);

  // ── config → 3D units (each section a unit so the run shares gables + shows interior) ──
  usePublishDesignMeta("neo-closets", { price: eng ? eng.priced.total : NaN, currency: "BD" });   // [NEO-LEADS-UX37]

  const units = useMemo(() => {
    if (!config) return [];
    const dv = type === "open" ? undefined : DOOR_VIS(doorSystem);
    const hex = finish ? (finish.hex || finish.color || null) : null;
    return config.modules.map((m, i) => {
      const nm = "Closet " + m.width + (m.hanging && m.hanging !== "none" ? " · " + (m.hanging === "double" ? "double hanging" : "hanging") : "")
        + (RI(m.shelves) ? " · " + m.shelves + " open" : "") + (RI(m.drawers) ? " · " + m.drawers + " drawer" + (m.drawers > 1 ? "s" : "") : "");
      return { code: "CAD-" + m.id, name: nm, unit_type: "Closet", width_mm: m.width, height_mm: config.height, depth_mm: config.depth,
        doors: type === "open" ? 0 : (m.width > 900 ? 2 : 1), drawers: RI(m.drawers), shelves: RI(m.shelves),
        door: dv, finishColor: hex, finishName: finish ? finish.name : null };
    });
  }, [config, type, doorSystem, finish]);

  const scene2D = useMemo(() => units.length ? elevationSceneSVG(units.map(u => ({ ...u, _qty: 1 })), { maxW: 620, maxH: 260 }).svg : "", [units]);
  // 🧩 numbered, aggregated component list (SmartWOP-style Explosion table) from the numbered panels
  const numbered = useMemo(() => {
    const g = new Map();
    for (const p of ((eng && eng.panelList) || [])) { const k = p.name + "|" + p.width + "|" + p.height + "|" + p.thickness; if (!g.has(k)) g.set(k, { name: p.name, role: p.role, w: p.width, h: p.height, t: p.thickness, count: 0 }); g.get(k).count += p.qty; }
    return [...g.values()].map((x, i) => ({ ...x, num: numStart + i * numStep }));
  }, [eng, numStart, numStep]);

  const setMod = (id, patch) => setMods(ms => (ms || []).map(m => m.id === id ? { ...m, ...patch } : m));
  const sel = (mods || []).find(m => m.id === selMod) || null;

  // ✨ AI assistant — text → structured command → validated config → apply (never raw geometry, spec §35)
  const applyBrief = () => {
    const cmd = parseWardrobeBrief(brief);
    if (cmd.command !== "CREATE_WARDROBE") { notify('Try e.g. "4m wardrobe, two hanging, three drawers, shoe rack"', "error"); return; }
    const { config: c, validation } = commandToConfig(cmd, R);
    setAiCmd(cmd);
    setDims({ w: c.width, h: c.height, d: c.depth });
    setType(c.type);
    if (c.type !== "open") setDoorSystem(ds => c.type === "hinged" && /slid/.test(ds) ? "hinged_lam" : ds);
    setOverrideMods(c.modules.map(m => ({ id: m.id, width: m.width, hanging: m.hanging, shelves: m.shelves, drawers: m.drawers })));
    notify(validation.ok ? ("AI design applied — " + c.modules.length + " sections") : "Applied with warnings — check validation", validation.ok ? "success" : "error");
  };
  const download = (name, text, mime) => { try { const b = new Blob([text], { type: mime || "text/plain" }); const a = document.createElement("a"); a.href = URL.createObjectURL(b); a.download = name; document.body.appendChild(a); a.click(); a.remove(); } catch (e) { notify("Download failed", "error"); } };
  const exportParts = () => {
    const head = "Number,Component,Width_mm,Height_mm,Thickness_mm,Count";
    const rows = numbered.map(p => [p.num, String(p.name).replace(/,/g, ";"), p.w, p.h, p.t, p.count].join(","));
    download("wardrobe-" + config.width + "x" + config.height + "-parts.csv", [head, ...rows].join("\n"), "text/csv");
    notify("Exported " + numbered.length + " numbered components", "success");
  };
  const exportCNC = () => {
    const mif = toMIF(eng.mplan, eng.dev);
    const base = "wardrobe-" + config.width + "x" + config.height;
    if (post === "mif") { download(base + ".mif.json", JSON.stringify(mif, null, 2), "application/json"); notify("Exported MIF (" + mif.operations.length + " ops)", "success"); return; }
    if (post === "csv") { download(base + ".drill.csv", toCSV(mif), "text/csv"); notify("Exported CSV drilling schedule", "success"); return; }
    const out = postProcess(mif, post);
    if (out.notImplemented) { notify(out.name + " — NOT IMPLEMENTED (spec §20). Use Generic NC or CSV.", "error"); return; }
    if (!out.ok) { notify("Export failed", "error"); return; }
    download(base + "." + (out.ext || "nc"), out.program || out.csv || "", "text/plain");
    notify("Exported " + out.post + " (" + (out.totalHoles || "?") + " holes)", "success");
  };

  const sendToQuote = () => {
    if (!config) return;
    // [NEO-CLOSETS-UX24] an L-shape goes as its developed length (main + wing columns and door leaves) with `lshape` kept for the quote notes; a straight wardrobe is unchanged
    const handConfig = eng ? eng.dev : config;
    try { localStorage.setItem("neo_wardrobe_handoff", JSON.stringify({ config: handConfig, finishId, doorSystem, output: getOutput(), ts: Date.now() })); } catch (e) { }
    notify(isL(config) ? "L-shaped design sent to Quote Max — main + return wing, priced by the same engine" : "Design sent to Quote Max — priced by the same engine", "success");
    if (typeof onSendToQuote === "function") onSendToQuote({ config: handConfig, finishId, doorSystem });
  };

  // 🗂 design revisions (spec §29)
  const saveRev = () => { setRevs(rs => addRevision(rs, config, { note: brief || ("Rev " + (rs.length + 1)), by: (currentUser && (currentUser.name || currentUser.username)) || null, ts: Date.now() })); notify("Revision saved", "success"); };
  const applyRev = (rev) => { const c = restore(revs, rev); if (!c) return; setDims({ w: c.width, h: c.height, d: c.depth }); setType(c.type); setOverrideMods((c.modules || []).map(m => ({ id: m.id, width: m.width, hanging: m.hanging, shelves: m.shelves, drawers: m.drawers }))); notify("Restored R" + rev, "success"); };
  const approveRev = (rev) => { setRevs(rs => approve(rs, rev, (currentUser && (currentUser.name || currentUser.username)) || "staff")); notify("R" + rev + " approved", "success"); };
  const lockRev = (rev) => { setRevs(rs => lock(rs, rev)); notify("R" + rev + " locked for manufacturing", "success"); };
  const cmp = revs.length >= 2 ? compare(revs, revs[revs.length - 2].rev, revs[revs.length - 1].rev) : null;

  if (!config || !eng) return <div style={{ padding: 'var(--space-6)', color: T.t3 }}>Loading wardrobe engine…</div>;
  const val = eng.val, statusColor = val.ok ? "var(--color-success)" : "var(--color-warning)";

  if (view === "studio") {
    return (
      <div style={{ height: "var(--studio-h, calc(100vh - 150px))", minHeight: 640 }}>
        <NeoWardrobeStudio design={studioDesign} rules={R} finishes={finishes} valOk={val.ok} price={money(eng.priced.total)} priced={eng.priced}
          onApply={applyStudioDesign} onClose={() => setView("classic")} onSendToQuote={sendToQuote} toast={toast} currentUser={currentUser} startLang={startLang} />
      </div>
    );
  }

  return (
    <div style={{ display: "grid", gridTemplateColumns: "320px 1fr 300px", gap: 'var(--space-3)', padding: 'var(--space-3)', alignItems: "start" }}>
      {/* ── LEFT · properties (basic) ── */}
      <div style={{ border: `1px solid ${T.br}`, borderRadius: 'var(--radius-lg)', background: T.bg2, padding: 14, display: "grid", gap: 'var(--space-3)' }}>
        <div style={{ fontWeight: 800, fontSize: 14 }}>🚪 Wardrobe · properties</div>
        {isL(config) && <div style={{ fontSize: 11, color: T.t2, background: "var(--brand-muted, rgba(99,91,255,.08))", borderRadius: 'var(--radius-md)', padding: "6px 8px" }} data-testid="classic-l-note">L-shape: main {config.width} mm + return wing {eng.dev.lshape.wingWidth} mm × {eng.dev.lshape.wingDepth} deep. Price, BOQ, panels, CNC and the Quote Max hand-off include the wing (edit it in Neo Studio); this view draws the main wardrobe.</div>}
        {/* ✨ AI assistant — brief → structured command → validated design (never raw geometry) */}
        <div style={{ border: `1px dashed ${T.brand}`, borderRadius: 'var(--radius-lg)', padding: 10, background: "var(--brand-muted, rgba(99,91,255,.06))" }}>
          <div style={{ fontSize: 11, fontWeight: 800, marginBottom: 5 }}>✨ Describe your wardrobe</div>
          <textarea value={brief} onChange={e => setBrief(e.target.value)} rows={2} aria-label="Describe the wardrobe" placeholder={'e.g. "4m sliding wardrobe, two hanging, three drawers, shoe rack"'} style={{ ...inp, resize: "vertical", fontFamily: "inherit" }} />
          <button type="button" onClick={applyBrief} style={{ ...btn, background: T.brand, color: "#fff", border: "none", width: "100%", marginTop: 6 }}>Generate design</button>
          {aiCmd && <div style={{ marginTop: 6, fontSize: 9.5, color: T.t3, whiteSpace: "pre-wrap", maxHeight: 92, overflow: "auto", background: T.bg1, borderRadius: 'var(--radius-sm)', padding: 6 }}>{JSON.stringify(aiCmd.parameters, null, 1)}</div>}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 'var(--space-2)' }}>
          {[["w", "Width"], ["h", "Height"], ["d", "Depth"]].map(([k, l]) => (
            <div key={k}><div style={lbl}>{l} mm</div>
              <input type="number" value={dims[k]} onChange={e => setDims(d => ({ ...d, [k]: Math.max(1, +e.target.value || 0) }))} style={inp} /></div>
          ))}
        </div>
        <div>
          <div style={lbl}>Door type</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6 }}>
            {[["sliding", "Sliding", "🚪"], ["hinged", "Hinged", "🔛"], ["open", "Open", "▦"]].map(([t, nm, ic]) => (
              <button key={t} type="button" onClick={() => setType(t)} style={{ ...card(type === t), padding: "7px 6px", textAlign: "center" }}>
                <div style={{ fontSize: 12, fontWeight: 800, color: type === t ? T.brand : T.t1 }}>{ic}</div>
                <div style={{ fontSize: 10.5, color: type === t ? T.brand : T.t2 }}>{nm}</div>
              </button>
            ))}
          </div>
        </div>
        {type !== "open" && (
          <div><div style={lbl}>Shutter system</div>
            <select value={doorSystem} onChange={e => setDoorSystem(e.target.value)} style={inp}>
              {doorTypes.filter(d => d.code !== "none").map(d => <option key={d.code} value={d.code}>{d.name} · {money(+d.rate || 0)}/m²</option>)}
            </select>
          </div>
        )}
        <div><div style={lbl}>Exterior finish</div>
          <select value={finishId} onChange={e => setFinishId(e.target.value)} style={inp}>
            {finishes.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
          </select>
        </div>
        <div>
          <div style={lbl}>Sections ({config.modules.length})</div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {rankedOpts.map((o, i) => (
              <button key={i} type="button" onClick={() => setOptIdx(i)} style={{ ...btn, padding: 'var(--space-1) var(--space-2)', fontSize: 10.5, ...(i === optIdx ? { borderColor: T.brand, color: T.brand } : {}) }}>{o.count}×{o.moduleWidth}</button>
            ))}
          </div>
        </div>
        {/* section chips */}
        <div style={{ display: "flex", gap: 'var(--space-1)', flexWrap: "wrap" }}>
          {config.modules.map(m => (
            <button key={m.id} type="button" onClick={() => setSelMod(m.id === selMod ? null : m.id)}
              style={{ flex: "1 1 60px", border: `1px solid ${m.id === selMod ? T.brand : T.br}`, borderRadius: 'var(--radius-md)', padding: "5px 3px", background: m.id === selMod ? "var(--brand-muted, rgba(99,91,255,.12))" : T.bg1, cursor: "pointer" }}>
              <div style={{ fontSize: 10, fontWeight: 800 }}>{m.id}</div>
              <div style={{ fontSize: 9.5, color: T.t3 }}>{m.width}</div>
              <div style={{ fontSize: 9.5, color: T.t3 }}>{m.hanging !== "none" ? "👕" : ""}{RI(m.shelves) ? " ▤" + m.shelves : ""}{RI(m.drawers) ? " ▦" + m.drawers : ""}</div>
            </button>
          ))}
        </div>
        {sel && (
          <div style={{ border: `1px solid ${T.br}`, borderRadius: 'var(--radius-lg)', padding: 9, background: T.bg1 }}>
            <div style={{ fontWeight: 700, fontSize: 12, marginBottom: 6 }}>Section {sel.id} · {sel.width} mm</div>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center", fontSize: 11.5 }}>
              <label>Hang&nbsp;
                <select value={sel.hanging} onChange={e => setMod(sel.id, { hanging: e.target.value })} style={{ ...inp, width: 96, display: "inline-block" }}>
                  {["none", "single", "double", "long"].map(h => <option key={h} value={h}>{h}</option>)}
                </select>
              </label>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>Shelves
                <button type="button" style={btn} onClick={() => setMod(sel.id, { shelves: Math.max(0, RI(sel.shelves) - 1) })}>−</button><b>{RI(sel.shelves)}</b>
                <button type="button" style={btn} onClick={() => setMod(sel.id, { shelves: Math.min(8, RI(sel.shelves) + 1) })}>＋</button>
              </span>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>Drawers
                <button type="button" style={btn} onClick={() => setMod(sel.id, { drawers: Math.max(0, RI(sel.drawers) - 1) })}>−</button><b>{RI(sel.drawers)}</b>
                <button type="button" style={btn} onClick={() => setMod(sel.id, { drawers: Math.min(R.drawer_limit || 4, RI(sel.drawers) + 1) })}>＋</button>
              </span>
            </div>
          </div>
        )}
      </div>

      {/* ── CENTER · viewport + mode tabs ── */}
      <div style={{ border: `1px solid ${T.br}`, borderRadius: 'var(--radius-lg)', background: T.bg2, padding: 10 }}>
        <div style={{ display: "flex", gap: 6, marginBottom: 'var(--space-2)', flexWrap: "wrap" }}>
          {[["design", "🎨 Design"], ["construction", "🔩 Construction"], ["hardware", "🔧 Hardware"], ["assembly", "🧩 Assembly"], ["manufacturing", "🏭 Manufacturing"], ["presentation", "🖼 Presentation"]].map(([m, l]) => (
            <button key={m} type="button" aria-pressed={mode === m} onClick={() => setMode(m)} style={{ ...btn, padding: "5px 10px", fontSize: 11.5, ...(mode === m ? { background: T.brand, color: "#fff", borderColor: T.brand } : {}) }}>{l}</button>
          ))}
          <button type="button" onClick={() => setView("studio")} style={{ ...btn, padding: "5px 10px", fontSize: 11.5, marginLeft: "auto" }} data-testid="open-neo-studio">Neo Studio</button>
          <span style={{ alignSelf: "center", fontSize: 11, fontWeight: 800, color: statusColor }}>
            {val.ok ? "✓ READY" : "⚠ " + val.errors.length + " to fix"}
          </span>
        </div>
        {mode === "construction" ? (
          <div style={{ minHeight: 360 }}>
            {/* construction profile — data-driven rules feed the panel sizes */}
            <div style={{ display: "flex", gap: 'var(--space-2)', flexWrap: "wrap", alignItems: "flex-end", marginBottom: 10 }}>
              {[["top", "Top", ["between", "over"]], ["bottom", "Bottom", ["between", "over"]], ["back", "Back", ["inset", "overlay", "groove"]]].map(([k, l, opts]) => (
                <div key={k}><div style={lbl}>{l}</div>
                  <select value={profile[k]} onChange={e => setProfile(p => ({ ...p, [k]: e.target.value }))} style={{ ...inp, width: 120 }}>
                    {opts.map(o => <option key={o} value={o}>{o}</option>)}
                  </select></div>
              ))}
              <div><div style={lbl}>Plinth mm</div><input type="number" value={profile.plinth_height} onChange={e => setProfile(p => ({ ...p, plinth_height: Math.max(0, +e.target.value || 0) }))} style={{ ...inp, width: 90 }} /></div>
              <span style={{ fontSize: 11, color: T.t3, alignSelf: "center" }}>Edge band ≈ <b>{eng.edgeM} m</b></span>
            </div>
            {!eng.review.ok || eng.review.items.length ? (
              <div style={{ fontSize: 11, color: 'var(--color-warning)', background: "rgba(180,83,9,.08)", borderRadius: 'var(--radius-md)', padding: 'var(--space-2)', marginBottom: 'var(--space-2)' }}>
                {eng.review.items.map((it, i) => <div key={i}>{it.level === "ERROR" ? "❌" : "⚠"} {it.msg} — {it.fix}</div>)}
              </div>
            ) : null}
            <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 'var(--space-3)' }}>
              <div>
                <div style={{ fontWeight: 800, fontSize: 12, marginBottom: 6 }}>Panels ({eng.panelList.length}) · numbered</div>
                <div style={{ fontSize: 10.8, maxHeight: 300, overflow: "auto" }}>
                  <div style={{ display: "grid", gridTemplateColumns: "46px 1fr 74px 30px 46px", gap: 'var(--space-1)', fontWeight: 800, color: T.t3, paddingBottom: 3, borderBottom: `1px solid ${T.br}` }}><span>#</span><span>Part</span><span>W×H×t</span><span>Qty</span><span>Edges</span></div>
                  {eng.panelList.map((p) => { const eb = ["top", "bottom", "left", "right"].filter(k => p.edges && p.edges[k]).length; return (
                    <div key={p.partNumber} style={{ display: "grid", gridTemplateColumns: "46px 1fr 74px 30px 46px", gap: 'var(--space-1)', color: T.t2, padding: "1px 0" }}>
                      <span style={{ color: T.t3 }}>{p.partNumber}</span><span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.name} <span style={{ color: T.t3 }}>{p.module}</span></span>
                      <span>{p.width}×{p.height}×{p.thickness}</span><span>{p.qty}</span><span>{eb}/4</span>
                    </div>); })}
                </div>
              </div>
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 6, marginBottom: 6, flexWrap: "wrap" }}>
                  <div style={{ fontWeight: 800, fontSize: 12 }}>Machining · {eng.mplan.totals.ops} ops · {eng.mplan.totals.holes} holes</div>
                  <span style={{ display: "inline-flex", gap: 'var(--space-1)' }}>
                    <select value={post} onChange={e => setPost(e.target.value)} style={{ ...inp, width: 156, padding: "3px 6px", fontSize: 10.5 }}>
                      <option value="mif">MIF (JSON)</option>
                      <option value="csv">CSV drilling schedule</option>
                      {listPosts().map(p => <option key={p.id} value={p.id}>{p.name}{p.implemented ? "" : " · stub"}</option>)}
                    </select>
                    <button type="button" onClick={exportCNC} style={{ ...btn, padding: "3px 8px", fontSize: 10.5 }}>⬇ Export</button>
                  </span>
                </div>
                <div style={{ fontSize: 10.3, maxHeight: 300, overflow: "auto" }}>
                  {eng.mplan.panels.map((p, i) => (
                    <div key={i} style={{ marginBottom: 'var(--space-1)' }}>
                      <div style={{ fontWeight: 700, color: T.t2 }}>{p.part}</div>
                      {p.ops.map((o, j) => <div key={j} style={{ color: T.t3, paddingLeft: 'var(--space-2)' }}>{o.type}{o.dia ? " ⌀" + o.dia : ""} @ x{o.x}{o.y != null ? " y" + o.y : o.y0 != null ? " y0=" + o.y0 : ""}{o.count > 1 ? " ×" + o.count : ""}{o.pitch ? " p" + o.pitch : ""}{o.note ? " · " + o.note : ""}</div>)}
                    </div>
                  ))}
                </div>
                <div style={{ marginTop: 'var(--space-2)', fontSize: 10, color: T.t3 }}>Coordinates are the machine-agnostic model (MIF export ↑). CNC post-processors (Homag/Biesse/…): <b>NOT IMPLEMENTED</b> (Phase 10).</div>
              </div>
            </div>
          </div>
        ) : mode === "hardware" ? (
          <div style={{ minHeight: 360 }}>
            {/* smart selection summary (spec §18) */}
            <div style={{ display: "flex", gap: 'var(--space-2)', flexWrap: "wrap", marginBottom: 10 }}>
              {eng.hinge && (
                <div style={{ background: T.bg3, borderRadius: 'var(--radius-lg)', padding: "8px 11px", fontSize: 11.5 }}>
                  <div style={{ fontWeight: 800 }}>Recommended hinges · {eng.hinge.count}/leaf</div>
                  <div style={{ color: T.t3 }}>leaf ≈ {eng.hinge.weightKg} kg · positions {eng.hinge.positions.join(" · ")} mm</div>
                </div>
              )}
              {eng.runner && (
                <div style={{ background: T.bg3, borderRadius: 'var(--radius-lg)', padding: "8px 11px", fontSize: 11.5 }}>
                  <div style={{ fontWeight: 800 }}>Drawer runner · {eng.runner.lengthMm} mm</div>
                  <div style={{ color: T.t3 }}>{eng.runner.type} · {eng.runner.loadKg} kg</div>
                </div>
              )}
              <div style={{ background: T.bg3, borderRadius: 'var(--radius-lg)', padding: "8px 11px", fontSize: 11.5 }}>
                <div style={{ fontWeight: 800 }}>Fittings · {eng.hw.totals.pieces} pcs</div>
                <div style={{ color: T.t3 }}>{eng.hw.items.length} lines · {eng.hw.totals.doors} doors · {eng.hw.totals.drawers} drawers · {eng.hw.totals.hangingSections} hanging</div>
              </div>
            </div>
            <div style={{ fontWeight: 800, fontSize: 12, marginBottom: 6 }}>Fittings list</div>
            <div style={{ fontSize: 11, maxHeight: 300, overflow: "auto" }}>
              <div style={{ display: "grid", gridTemplateColumns: "96px 1fr 60px 66px", gap: 'var(--space-1)', fontWeight: 800, color: T.t3, paddingBottom: 3, borderBottom: `1px solid ${T.br}` }}><span>SKU</span><span>Fitting</span><span>Qty</span><span>Category</span></div>
              {eng.hw.items.map((it, i) => (
                <div key={it.sku + i} style={{ display: "grid", gridTemplateColumns: "96px 1fr 60px 66px", gap: 'var(--space-1)', color: T.t2, padding: "1px 0" }}>
                  <span style={{ color: T.t3 }}>{it.sku}</span>
                  <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{it.name}{it.note ? " · " + it.note : ""}</span>
                  <span>{it.qty} {it.unit}</span><span style={{ color: T.t3 }}>{it.category}</span>
                </div>
              ))}
            </div>
            <div style={{ marginTop: 'var(--space-2)', fontSize: 10, color: T.t3 }}>Counts + smart selection are live from the engine. Per-SKU fitting <b>prices</b> come from the hardware catalogue (set them in setup) — until then hardware isn’t separately costed here.</div>
          </div>
        ) : mode === "assembly" ? (
          <div style={{ minHeight: 360 }}>
            <div style={{ display: "flex", gap: 10, alignItems: "flex-end", flexWrap: "wrap", marginBottom: 10 }}>
              <div><div style={lbl}>Start #</div><input type="number" value={numStart} onChange={(e) => setNumStart(Math.max(0, parseInt(e.target.value) || 0))} style={{ ...inp, width: 72 }} /></div>
              <div><div style={lbl}>Step</div><input type="number" value={numStep} onChange={(e) => setNumStep(Math.max(1, parseInt(e.target.value) || 1))} style={{ ...inp, width: 72 }} /></div>
              <div style={{ flex: 1, minWidth: 160 }}><div style={lbl}>Explode {explode}%</div><input type="range" min={0} max={100} value={explode} onChange={(e) => setExplode(parseInt(e.target.value))} style={{ width: "100%" }} /></div>
              <button onClick={exportParts} style={{ ...btn, padding: "7px 12px" }}>⬇ Parts CSV</button>
            </div>
            <div style={{ fontWeight: 800, fontSize: 12, marginBottom: 6 }}>Exploded components <span style={{ color: T.t3, fontWeight: 600 }}>· each part separated and numbered</span></div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 + explode * 0.14, background: T.bg1, borderRadius: 'var(--radius-lg)', padding: 'var(--space-3)', border: `1px solid ${T.br}`, marginBottom: 'var(--space-3)' }}>
              {numbered.length === 0 ? <div style={{ color: T.t3, fontSize: 12 }}>No panels yet — configure the wardrobe in Design.</div> : numbered.map((p) => {
                const m = Math.max(p.w, p.h) || 1, bw = Math.max(14, Math.round(60 * p.w / m)), bh = Math.max(10, Math.round(60 * p.h / m));
                return (
                  <div key={p.num} style={{ textAlign: "center", width: 86 }}>
                    <div style={{ position: "relative", height: 74, display: "grid", placeItems: "center" }}>
                      <div style={{ width: bw, height: bh, background: "color-mix(in srgb, var(--color-brand) 16%, transparent)", border: `1.5px solid ${T.brand}`, borderRadius: 2 }} />
                      <span style={{ position: "absolute", top: 3, left: 10, background: T.brand, color: "#fff", fontSize: 10, fontWeight: 800, borderRadius: 'var(--radius-lg)', padding: "0 5px" }}>{p.num}</span>
                    </div>
                    <div style={{ fontSize: 10, fontWeight: 700, color: T.t2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={p.name}>{p.name}</div>
                    <div style={{ fontSize: 9.5, color: T.t3 }}>{p.w}×{p.h}×{p.t} · ×{p.count}</div>
                  </div>
                );
              })}
            </div>
            <div style={{ fontWeight: 800, fontSize: 12, marginBottom: 6 }}>Explosion parts list</div>
            <div style={{ fontSize: 11.5 }}>
              <div style={{ display: "grid", gridTemplateColumns: "48px 1fr 130px 54px", gap: 6, fontWeight: 800, color: T.t3, borderBottom: `1px solid ${T.br}`, paddingBottom: 3 }}>
                <span>#</span><span>Component</span><span>Dimensions (mm)</span><span>Count</span>
              </div>
              {numbered.map((p) => (
                <div key={p.num} style={{ display: "grid", gridTemplateColumns: "48px 1fr 130px 54px", gap: 6, color: T.t2, padding: "1.5px 0" }}>
                  <span style={{ fontWeight: 800, color: T.brand }}>{p.num}</span>
                  <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.name}</span>
                  <span>{p.w}×{p.h}×{p.t}</span><span>{p.count}</span>
                </div>
              ))}
              <div style={{ marginTop: 'var(--space-2)', fontSize: 10, color: T.t3 }}>Numbers on the badges match this list · {numbered.length} unique components, {numbered.reduce((s, p) => s + p.count, 0)} panels total. Full 3D spatial explosion (X/Y/Z offset animation) is a later refinement — this sheet is exact and print-ready.</div>
            </div>
          </div>
        ) : mode === "manufacturing" ? (
          <div style={{ minHeight: 360 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 'var(--space-3)', marginBottom: 'var(--space-3)' }}>
              <div>
                <div style={{ fontWeight: 800, fontSize: 12, marginBottom: 6 }}>Bill of Quantities</div>
                <div style={{ fontSize: 11.5 }}>{eng.bom.map((b, i) => <div key={i} style={{ display: "flex", justifyContent: "space-between", color: T.t2, padding: "1px 0" }}><span>{b.item}</span><span>{b.qty} {b.unit}</span></div>)}</div>
                <div style={{ marginTop: 10, display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {[["Board", eng.est.boardM2 + " m²"], ["Back", eng.est.backM2 + " m²"], ["Edge band", eng.edgeM + " m"], ["Panels", eng.panelList.length], ["Ops", eng.ops.length], ["Hardware", eng.est.hardware]].map(([k, v]) => <span key={k} style={{ background: T.bg3, borderRadius: 'var(--radius-md)', padding: "3px 8px", fontSize: 11 }}><b>{v}</b> <span style={{ color: T.t3 }}>{k}</span></span>)}
                </div>
              </div>
              <div>
                <div style={{ fontWeight: 800, fontSize: 12, marginBottom: 6 }}>Cutting list ({eng.cut.length})</div>
                <div style={{ fontSize: 11, maxHeight: 200, overflow: "auto" }}>
                  {eng.cut.map((p, i) => <div key={i} style={{ color: T.t2 }}>{p.part} · {p.width}×{p.height} ×{p.qty} <span style={{ color: T.t3 }}>{p.module}</span></div>)}
                </div>
              </div>
            </div>
            {/* 🪚 cut-optimisation (guillotine nest) — sheets · utilisation · waste · offcuts */}
            <div style={{ borderTop: `1px solid ${T.br}`, paddingTop: 10 }}>
              <div style={{ display: "flex", gap: 10, alignItems: "flex-end", flexWrap: "wrap", marginBottom: 'var(--space-2)' }}>
                <div style={{ fontWeight: 800, fontSize: 12 }}>🪚 Cut plan</div>
                <span style={{ fontSize: 11, color: T.t3 }}>Sheet</span>
                <input type="number" value={stock.width} onChange={e => setStock(s => ({ ...s, width: Math.max(300, +e.target.value || 0) }))} style={{ ...inp, width: 76 }} />×
                <input type="number" value={stock.height} onChange={e => setStock(s => ({ ...s, height: Math.max(300, +e.target.value || 0) }))} style={{ ...inp, width: 76 }} />
                <span style={{ fontSize: 11, color: T.t3 }}>kerf</span>
                <input type="number" value={stock.kerf} onChange={e => setStock(s => ({ ...s, kerf: Math.max(0, +e.target.value || 0) }))} style={{ ...inp, width: 54 }} />
                <span style={{ display: "inline-flex", border: `1px solid ${T.br}`, borderRadius: 'var(--radius-md)', overflow: "hidden" }}>
                  {[["shelf", "Shelf"], ["guillotine", "Advanced"]].map(([m, l]) => <button key={m} type="button" aria-pressed={nestMethod === m} onClick={() => setNestMethod(m)} style={{ border: "none", padding: 'var(--space-1) var(--space-2)', fontSize: 10.5, fontWeight: 700, cursor: "pointer", background: nestMethod === m ? T.brand : "transparent", color: nestMethod === m ? "#fff" : T.t3, fontFamily: "inherit" }}>{l}</button>)}
                </span>
                <span style={{ fontSize: 12, fontWeight: 800, color: T.brand }}>{eng.plan.sheetCount} sheet{eng.plan.sheetCount === 1 ? "" : "s"} · {eng.plan.utilization}% used</span>
                {eng.plan.oversize > 0 && <span style={{ fontSize: 11, color: 'var(--color-warning)' }}>⚠ {eng.plan.oversize} oversize (needs jointing / bigger sheet)</span>}
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 300px", gap: 'var(--space-3)' }}>
                <div style={{ fontSize: 11 }}>
                  {eng.plan.materials.map((m, i) => (
                    <div key={i} style={{ display: "flex", justifyContent: "space-between", color: T.t2, padding: "2px 0", borderBottom: `1px solid ${T.br}` }}>
                      <span>{m.material}</span>
                      <span style={{ color: T.t3 }}>{m.sheetCount} sh · {m.utilization}% · waste {m.wastePct}% · offcut {m.offcutM2} m²</span>
                    </div>
                  ))}
                  <div style={{ marginTop: 6, fontSize: 10, color: T.t3 }}>Guillotine shelf nest (first-fit-decreasing). Advanced/rotational nesting: <b>NOT IMPLEMENTED</b> (later) — this v1 is production-usable.</div>
                </div>
                {(() => {
                  const m0 = eng.plan.materials[0]; const s0 = m0 && m0.sheets[0];
                  if (!s0) return null;
                  const vw = m0.sheetW, vh = m0.sheetH;
                  return (
                    <div>
                      <div style={{ fontSize: 10.5, color: T.t3, marginBottom: 3 }}>{m0.material} · sheet 1 ({vw}×{vh})</div>
                      <svg viewBox={`0 0 ${vw} ${vh}`} width="100%" style={{ border: `1px solid ${T.br}`, background: T.bg1, borderRadius: 'var(--radius-sm)', display: "block" }} preserveAspectRatio="xMidYMid meet">
                        {s0.placements.map((p, j) => (
                          <g key={j}>
                            <rect x={p.x} y={p.y} width={p.w} height={p.h} fill="var(--brand-muted, rgba(99,91,255,.16))" stroke="var(--color-brand)" strokeWidth={6} />
                            {p.w > 260 && p.h > 160 && <text x={p.x + p.w / 2} y={p.y + p.h / 2} fontSize={Math.min(120, p.h * 0.4)} fill="var(--text-2)" textAnchor="middle" dominantBaseline="middle">{p.part}</text>}
                          </g>
                        ))}
                      </svg>
                    </div>
                  );
                })()}
              </div>
            </div>
          </div>
        ) : mode === "presentation" && scene2D ? (
          <div style={{ background: T.bg1, borderRadius: 'var(--radius-lg)', padding: 10, textAlign: "center", lineHeight: 0, minHeight: 360, display: "grid", placeItems: "center" }} dangerouslySetInnerHTML={{ __html: scene2D }} />
        ) : (
          <div style={{ height: 460 }}>
            <Cabinets3D units={units} height={460} layout="straight" interiorHex={finish ? (finish.hex || "#f4f5f7") : "#f4f5f7"} />
          </div>
        )}
      </div>

      {/* ── RIGHT · cost + validation + send ── */}
      <div style={{ border: `1px solid ${T.br}`, borderRadius: 'var(--radius-lg)', background: T.bg2, padding: 14, display: "grid", gap: 10 }}>
        <div style={{ fontWeight: 800, fontSize: 14 }}>💰 Cost <span style={{ fontWeight: 500, color: T.t3, fontSize: 11 }}>· engine</span></div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 3, fontSize: 12.5 }}>
          {eng.priced.lines.map(l => (<React.Fragment key={l.key}><div style={{ color: T.t2 }}>{l.label}</div><div style={{ textAlign: "right", fontWeight: 600 }}>{money(l.sell)}</div></React.Fragment>))}
          <div style={{ borderTop: `1px solid ${T.br}`, gridColumn: "1 / -1", margin: "3px 0" }} />
          <div style={{ color: T.t3 }}>Subtotal</div><div style={{ textAlign: "right" }}>{money(eng.priced.subtotal)}</div>
          <div style={{ color: T.t3 }}>VAT {eng.priced.vatPct}%</div><div style={{ textAlign: "right" }}>{money(eng.priced.vat)}</div>
          <div style={{ fontWeight: 800 }}>Total</div><div style={{ textAlign: "right", fontWeight: 800, color: T.brand }}>{money(eng.priced.total)}</div>
          <div style={{ color: T.t3 }}>Deposit {eng.priced.depositPct}%</div><div style={{ textAlign: "right" }}>{money(eng.priced.deposit)}</div>
        </div>
        {!val.ok && (
          <div style={{ fontSize: 11, color: 'var(--color-warning)', background: "rgba(180,83,9,.08)", borderRadius: 'var(--radius-md)', padding: 'var(--space-2)' }}>
            {val.errors.map((e, i) => <div key={i}>⚠ {e.msg} — {e.fix}</div>)}
          </div>
        )}
        <button type="button" onClick={sendToQuote} disabled={!val.ok} style={{ ...btn, background: val.ok ? T.brandStrong : T.bg3, color: val.ok ? "#fff" : T.t3, border: "none", padding: "10px 0", fontWeight: 800, cursor: val.ok ? "pointer" : "not-allowed" }}>➕ Send to Quote Max</button>
        <div style={{ fontSize: 10, color: T.t3 }}>The design (a WardrobeConfiguration) is handed to Quote Max and priced by the <b>same engine</b> — Studio, engine and quote always agree.</div>

        {/* 🗂 revisions — snapshot · compare · restore · approve · lock (spec §29) */}
        <div style={{ borderTop: `1px solid ${T.br}`, paddingTop: 10, display: "grid", gap: 'var(--space-2)' }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ fontWeight: 800, fontSize: 13 }}>🗂 Revisions {isLocked(revs) && <span style={{ color: 'var(--color-warning)', fontSize: 10 }}>· 🔒 locked</span>}</div>
            <button type="button" onClick={saveRev} style={{ ...btn, padding: "4px 9px", fontSize: 11 }}>💾 Save</button>
          </div>
          {revs.length === 0 ? <div style={{ fontSize: 10.5, color: T.t3 }}>Save a revision to snapshot this design; compare, restore, approve and lock for manufacturing.</div> : (
            <div style={{ display: "grid", gap: 'var(--space-1)', maxHeight: 150, overflow: "auto" }}>
              {revs.slice().reverse().map(rv => (
                <div key={rv.rev} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11 }}>
                  <span style={{ fontWeight: 800 }}>R{rv.rev}</span>
                  <span style={{ flex: 1, color: T.t3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{rv.note || "—"}</span>
                  {rv.locked ? <span title="locked">🔒</span> : rv.approved ? <span title="approved" style={{ color: "var(--color-success)" }}>✓</span> : null}
                  <button type="button" onClick={() => applyRev(rv.rev)} style={{ ...btn, padding: "2px 6px", fontSize: 10 }}>Restore</button>
                  {!rv.locked && <button type="button" onClick={() => approveRev(rv.rev)} style={{ ...btn, padding: "2px 6px", fontSize: 10 }}>Approve</button>}
                  {!rv.locked && <button type="button" onClick={() => lockRev(rv.rev)} style={{ ...btn, padding: "2px 6px", fontSize: 10 }}>Lock</button>}
                </div>
              ))}
            </div>
          )}
          {cmp && cmp.count > 0 && <div style={{ fontSize: 10, color: T.t3, background: T.bg1, borderRadius: 'var(--radius-sm)', padding: 6, maxHeight: 80, overflow: "auto" }}><b>R{cmp.a}→R{cmp.b}:</b> {cmp.summary.slice(0, 6).join(" · ")}{cmp.count > 6 ? " …" : ""}</div>}
          {isLocked(revs) && <div style={{ fontSize: 10, color: 'var(--color-warning)' }}>🔒 Latest revision is locked for manufacturing — save a new revision to make changes.</div>}
        </div>
      </div>
    </div>
  );
}
