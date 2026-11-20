/* /yas-bloom/study and /ar/yas-bloom/study: the YAS WOOD feasibility study inside the VIP room. View (dashboard + full study), edit, import, export, image upload.
 * The real study is never in the repository: it is imported on the owner's device and kept there (localStorage text, IndexedDB images). With nothing imported
 * only the labelled SAMPLE (invented numbers) is shown. Every string a person types is stored raw while editing and sanitised on load / export / import. */
import React, { useCallback, useEffect, useMemo, useRef, useState, createContext, useContext } from 'react';
import { studyVars } from './palette';
import { tt } from './strings';
import { SAMPLE_STUDY } from './sample';
import { sanitizeStudy, imageIds, getAt, setAt, insertAt, removeAt, moveAt, newBlock, newSection, uid, BLOCK_TYPES, LIMITS, cleanNumber } from './model';
import { studyStore, makeBundle, ERR as SERR } from './store';
import { imageStore } from './imageStore';
import { processImage, ERR_TEXT, dataUrlBytes } from './upload';
import { importStudyFile } from './importer';
import { Donut, HBar, Combo, SERIES_COLORS, fmtNum } from './charts';
import { simulate, fmtM, fmtX, fmtMoney } from './simulator';
import { useDialog } from '../ui/useDialog';
import './study.css';

const Ctx = createContext(null);
const useS = () => useContext(Ctx);
const SAMPLE = sanitizeStudy(SAMPLE_STUDY).study;

function F({ path, kind = 'text', multi = false, tag: Tag = 'span', ph }) {
  const { study, edit, set, lang } = useS(); const v = getAt(study, path);
  if (!edit) return v ? <Tag>{v}</Tag> : null;
  const cap = kind === 'para' ? LIMITS.para : kind === 'title' ? LIMITS.title : kind === 'cell' ? LIMITS.cell : kind === 'short' ? LIMITS.short : LIMITS.text;
  const common = { className: 'yws-in', value: v || '', maxLength: cap, onChange: (e) => set(path, e.target.value), dir: 'auto', 'aria-label': ph || tt('edit', lang), placeholder: ph || '' };
  return multi ? <textarea {...common} rows={Math.min(8, Math.max(2, Math.ceil((v || '').length / 70)))} /> : <input type="text" {...common} />;
}
function Num({ path }) {
  const { study, edit, set } = useS(); const v = getAt(study, path);
  if (!edit) return <span>{fmtNum(v)}</span>;
  return <input className="yws-in yws-num" type="number" inputMode="decimal" step="any" defaultValue={v} key={String(v)} aria-label="number" onChange={(e) => { const n = cleanNumber(e.target.value); if (n !== null) set(path, n); }} />;
}
const Btn = ({ children, ...p }) => <button type="button" className="yws-btn" {...p}>{children}</button>;
function Ctl({ path, i, n, label }) {
  const { edit, mv, rm, lang } = useS(); if (!edit) return null;
  return <span className="yws-ctl" role="group" aria-label={label || ''}>
    <Btn onClick={() => mv(path, i, -1)} disabled={i === 0} aria-label={tt('up', lang)} title={tt('up', lang)}>↑</Btn>
    <Btn onClick={() => mv(path, i, 1)} disabled={i >= n - 1} aria-label={tt('down', lang)} title={tt('down', lang)}>↓</Btn>
    <Btn onClick={() => rm(path, i)} aria-label={tt('del', lang)} title={tt('del', lang)}>×</Btn></span>;
}
function Img({ id, alt }) { const { imgs } = useS(); const u = id && imgs[id]; return u ? <img className="yws-img" src={u} alt={alt || ''} loading="lazy" /> : <div className="yws-noimg" aria-hidden="true" />; }
function Upload({ path }) {
  const { study, edit, lang, upload, set } = useS(); const ref = useRef(null); const id = getAt(study, [...path, 'imageId']); if (!edit) return null;
  return <div className="yws-up"><input ref={ref} type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={(e) => { const f = e.target.files && e.target.files[0]; e.target.value = ''; if (f) upload(path, f); }} />
    <Btn onClick={() => ref.current && ref.current.click()} data-testid="yws-upload">{tt('upload', lang)}</Btn>
    {id && <Btn onClick={() => set([...path, 'imageId'], undefined)} data-testid="yws-img-remove">{tt('uploadRemove', lang)}</Btn>}
    <small>{tt('localImages', lang)}</small></div>;
}
function Detail({ d, onClose }) {
  const { lang } = useS(); const ref = useDialog(true, onClose);
  return <div className="yws-modal" onPointerDown={(e) => { if (e.target === e.currentTarget) onClose(); }}><div className="yws-dialog" role="dialog" aria-modal="true" aria-label={d.title} ref={ref}>
    <header><h3>{d.title}</h3><Btn onClick={onClose} data-autofocus>{tt('close', lang)}</Btn></header>
    {d.desc && <p>{d.desc}</p>}{d.metrics.length > 0 && <dl className="yws-kv">{d.metrics.map((m, i) => <div key={i}><dt>{m.label}</dt><dd>{m.val}</dd></div>)}</dl>}
    {d.bullets.length > 0 && <ul>{d.bullets.map((b, i) => <li key={i}>{b}</li>)}</ul>}</div></div>;
}
function Sim({ b }) {
  const { lang } = useS(); const base = b.base; const [rev, setRev] = useState(0), [cogs, setCogs] = useState(base.cogsPct), [int, setInt] = useState(base.intRate);
  useEffect(() => { setCogs(base.cogsPct); setInt(base.intRate); }, [base.cogsPct, base.intRate]);
  const r = simulate(base, { revChange: rev, cogsPct: cogs, intRate: int });
  const sl = (label, v, set, min, max, step, show) => <label className="yws-sl"><span>{label}</span><b>{show}</b><input type="range" min={min} max={max} step={step} value={v} onChange={(e) => set(Number(e.target.value))} /></label>;
  return <div className="yws-sim" data-testid="yws-sim">
    <div className="yws-sims">{sl(tt('simRev', lang), rev, setRev, -25, 15, 5, (rev > 0 ? '+' : '') + rev + '%')}{sl(tt('simCogs', lang), cogs, setCogs, base.cogsPct - 5, base.cogsPct + 10, 1, cogs.toFixed(1) + '%')}{sl(tt('simInt', lang), int, setInt, Math.max(0, base.intRate - 2), base.intRate + 4, 0.5, int.toFixed(1) + '%')}
      <Btn onClick={() => { setRev(0); setCogs(base.cogsPct); setInt(base.intRate); }}>{tt('simReset', lang)}</Btn></div>
    <div className="yws-simo"><p className={'yws-badge yws-' + r.status} role="status">{tt(r.status === 'strong' ? 'simStrong' : r.status === 'pressure' ? 'simPressure' : 'simLoss', lang)}</p>
      <dl className="yws-kv"><div><dt>{tt('simRevOut', lang)}</dt><dd>{fmtM(r.rev)}</dd></div><div><dt>{tt('simEbitda', lang)}</dt><dd>{fmtM(r.ebitda)}</dd></div><div><dt>{tt('simNet', lang)}</dt><dd>{fmtM(r.net)}</dd></div><div><dt>{tt('simDscr', lang)}</dt><dd>{fmtX(r.dscr)}</dd></div></dl></div>
    <p className="yws-note">{tt('simNote', lang)}</p></div>;
}
function ChartB({ b, p }) {
  const { edit, lang } = useS(); const ser = b.series; const vals = ser[0].values;
  return <div className="yws-chart">
    <div className={'yws-plot yws-' + b.kind}>{b.kind === 'donut' ? <><Donut labels={b.labels} values={vals} title={b.title} /><ul className="yws-legend">{b.labels.map((l, i) => <li key={i}><i style={{ background: SERIES_COLORS[i % SERIES_COLORS.length] }} />{l}<b>{fmtNum(vals[i])}{b.unit ? ' ' + b.unit : ''}</b></li>)}</ul></>
      : b.kind === 'hbar' ? <HBar labels={b.labels} values={vals} unit={b.unit} title={b.title} /> : <><Combo labels={b.labels} series={ser} unit={b.unit} title={b.title} />
        <ul className="yws-legend yws-legend-row">{ser.map((s, i) => <li key={i}><i style={{ background: SERIES_COLORS[i % SERIES_COLORS.length] }} />{s.name}</li>)}</ul></>}</div>
    <details open={edit}><summary>{tt('details', lang)}</summary><div className="yws-scroll"><table className="yws-table"><thead><tr><th>{edit ? <F path={[...p, 'unit']} kind="short" ph="unit" /> : b.unit || ''}</th>{ser.map((s, i) => <th key={i}><F path={[...p, 'series', i, 'name']} kind="short" /></th>)}</tr></thead>
      <tbody>{b.labels.map((l, k) => <tr key={k}><th scope="row"><F path={[...p, 'labels', k]} kind="short" /></th>{ser.map((s, i) => <td key={i}><Num path={[...p, 'series', i, 'values', k]} /></td>)}</tr>)}</tbody></table></div></details></div>;
}
function Block({ b, p, i, n }) {
  const { edit, lang, cur, rate, setDetail, ins, rm, set, study } = useS(); const T = (extra) => (edit || b.title) ? <h3 className="yws-h3"><F path={[...p, 'title']} kind="title" tag="span" ph={tt('b_' + b.type, lang)} />{extra}</h3> : null; let body = null;
  switch (b.type) {
    case 'paragraph': body = <p className="yws-p"><F path={[...p, 'text']} kind="para" multi /></p>; break;
    case 'callout': body = <div className="yws-callout">{T()}<p><F path={[...p, 'text']} kind="para" multi /></p></div>; break;
    case 'bullets': body = <>{T()}{b.ordered ? <ol className="yws-list">{b.items.map((_, k) => <li key={k}><F path={[...p, 'items', k]} multi />{edit && <Ctl path={[...p, 'items']} i={k} n={b.items.length} />}</li>)}</ol> : <ul className="yws-list">{b.items.map((_, k) => <li key={k}><F path={[...p, 'items', k]} multi />{edit && <Ctl path={[...p, 'items']} i={k} n={b.items.length} />}</li>)}</ul>}{edit && <Btn onClick={() => ins([...p, 'items'], b.items.length, '')}>{tt('addItem', lang)}</Btn>}</>; break;
    case 'stats': body = <><div className="yws-stats">{b.items.map((it, k) => { const q = [...p, 'items', k]; const shown = it.usd !== undefined ? fmtMoney(it.usd, cur, rate) : null; const inner = <><small><F path={[...q, 'label']} kind="short" /></small><strong>{edit || shown === null ? <F path={[...q, 'value']} kind="short" /> : shown}</strong>{(it.note || edit) && <em><F path={[...q, 'note']} kind="short" ph="note" /></em>}</>;
      return <div key={k} className="yws-stat">{!edit && it.detail ? <button type="button" className="yws-stat-b" onClick={() => setDetail({ title: it.label, ...it.detail })}>{inner}</button> : inner}{edit && <Ctl path={[...p, 'items']} i={k} n={b.items.length} />}</div>; })}</div>{edit && <Btn onClick={() => ins([...p, 'items'], b.items.length, { label: '…', value: '0' })}>{tt('addItem', lang)}</Btn>}</>; break;
    case 'cards': body = <>{T()}<div className="yws-cards">{b.items.map((it, k) => { const q = [...p, 'items', k]; return <article key={k} className="yws-card"><Img id={it.imageId} alt={it.alt || it.title} />{edit && <Upload path={q} />}<div className="yws-card-t">{(it.tag || edit) && <small><F path={[...q, 'tag']} kind="short" ph="tag" /></small>}<h4><F path={[...q, 'title']} kind="title" /></h4>{(it.text || edit) && <p><F path={[...q, 'text']} multi /></p>}{!edit && it.detail && <Btn onClick={() => setDetail({ title: it.title, ...it.detail })}>{tt('details', lang)}</Btn>}{edit && <Ctl path={[...p, 'items']} i={k} n={b.items.length} />}</div></article>; })}</div>{edit && <Btn onClick={() => ins([...p, 'items'], b.items.length, { title: '…' })}>{tt('addItem', lang)}</Btn>}</>; break;
    case 'table': body = <>{T()}<div className="yws-scroll"><table className="yws-table">{b.head.length > 0 && <thead><tr>{b.head.map((_, c) => <th key={c}><F path={[...p, 'head', c]} kind="cell" /></th>)}{edit && <th />}</tr></thead>}<tbody>{b.rows.map((r, k) => <tr key={k}>{r.map((_, c) => <td key={c}><F path={[...p, 'rows', k, c]} kind="cell" /></td>)}{edit && <td><Ctl path={[...p, 'rows']} i={k} n={b.rows.length} /></td>}</tr>)}</tbody></table></div>{edit && <Btn onClick={() => ins([...p, 'rows'], b.rows.length, (b.head.length ? b.head : b.rows[0] || ['']).map(() => ''))}>{tt('addRow', lang)}</Btn>}{(b.note || edit) && <p className="yws-note"><F path={[...p, 'note']} multi ph="note" /></p>}</>; break;
    case 'chart': body = <>{T()}<ChartB b={b} p={p} />{(b.note || edit) && <p className="yws-note"><F path={[...p, 'note']} multi ph="note" /></p>}</>; break;
    case 'lists': body = <>{T()}<div className="yws-cols">{b.groups.map((g, k) => <div key={k} className="yws-group"><h4><F path={[...p, 'groups', k, 'title']} kind="short" /></h4><ul className="yws-list">{g.items.map((_, j) => <li key={j}><F path={[...p, 'groups', k, 'items', j]} multi />{edit && <Ctl path={[...p, 'groups', k, 'items']} i={j} n={g.items.length} />}</li>)}</ul>{edit && <Btn onClick={() => ins([...p, 'groups', k, 'items'], g.items.length, '')}>{tt('addItem', lang)}</Btn>}</div>)}</div></>; break;
    case 'kv': body = <>{T()}<dl className="yws-kv yws-kv-wide">{b.items.map((it, k) => <div key={k}><dt><F path={[...p, 'items', k, 'k']} kind="short" /></dt><dd><F path={[...p, 'items', k, 'v']} multi />{edit && <Ctl path={[...p, 'items']} i={k} n={b.items.length} />}</dd></div>)}</dl>{edit && <Btn onClick={() => ins([...p, 'items'], b.items.length, { k: '…', v: '…' })}>{tt('addItem', lang)}</Btn>}</>; break;
    case 'image': body = <figure className="yws-fig"><Img id={b.imageId} alt={b.alt} /><Upload path={p} />{(b.caption || edit) && <figcaption><F path={[...p, 'caption']} multi ph="caption" /></figcaption>}{edit && <F path={[...p, 'alt']} kind="short" ph="alt text" />}</figure>; break;
    case 'simulator': body = <>{T()}<Sim b={b} /></>; break;
    default: break;
  }
  return <div className={'yws-block yws-b-' + b.type} data-testid={'yws-block-' + b.type}>{edit && <div className="yws-bar"><span>{tt('b_' + b.type, lang)}</span><Ctl path={[...p.slice(0, -1)]} i={i} n={n} /></div>}{body}</div>;
}
function Section({ s, si }) {
  const { study, edit, lang, ins, mv, rm, set } = useS(); const p = ['sections', si]; const n = study.sections.length; const [add, setAdd] = useState('paragraph');
  return <section id={'s-' + s.id} className="yws-sec" data-testid="yws-section">
    <header className="yws-sec-h">{(s.kicker || edit) && <p className="yws-kicker"><F path={[...p, 'kicker']} kind="short" ph="kicker" /></p>}<h2><F path={[...p, 'title']} kind="title" /></h2>{(s.lead || edit) && <p className="yws-lead"><F path={[...p, 'lead']} multi ph="lead" /></p>}
      {edit && <div className="yws-bar"><label>{tt(s.part === 'full' ? 'partFull' : 'partDash', lang)}<select value={s.part} onChange={(e) => set([...p, 'part'], e.target.value)}><option value="dashboard">{tt('dashboard', lang)}</option><option value="full">{tt('full', lang)}</option></select></label><Ctl path={['sections']} i={si} n={n} /></div>}</header>
    {s.blocks.map((b, k) => <Block key={b.id} b={b} p={[...p, 'blocks', k]} i={k} n={s.blocks.length} />)}
    {edit && <div className="yws-add"><select value={add} onChange={(e) => setAdd(e.target.value)} aria-label={tt('addBlock', lang)}>{BLOCK_TYPES.map((t) => <option key={t} value={t}>{tt('b_' + t, lang)}</option>)}</select><Btn onClick={() => ins([...p, 'blocks'], s.blocks.length, newBlock(add))}>{tt('addBlock', lang)}</Btn></div>}
  </section>;
}

function ImportView({ lang, onUse, onClose }) {
  const [res, setRes] = useState(null), [err, setErr] = useState(''); const ref = useDialog(true, onClose);
  const onFile = (e) => { const f = e.target.files && e.target.files[0]; setErr(''); setRes(null); if (!f) return; if (f.size > 6 * 1024 * 1024) { setErr('> 6 MB'); return; } const r = new FileReader(); r.onload = () => setRes(importStudyFile(String(r.result || ''))); r.onerror = () => setErr('read'); r.readAsText(f); };
  const rp = res && res.report;
  return <div className="yws-modal" onPointerDown={(e) => { if (e.target === e.currentTarget) onClose(); }}><div className="yws-dialog yws-wide" role="dialog" aria-modal="true" aria-label={tt('imTitle', lang)} ref={ref} data-testid="yws-import">
    <header><h3>{tt('imTitle', lang)}</h3><Btn onClick={onClose}>{tt('close', lang)}</Btn></header>
    <p className="yws-note">{tt('imNote', lang)}</p><p className="yws-note"><b>{tt('local', lang)}</b></p>
    <label className="yws-btn yws-file">{tt('imPick', lang)}<input type="file" accept=".html,.htm,.json,text/html,application/json" onChange={onFile} data-testid="yws-import-file" data-autofocus /></label>
    {err && <p className="yws-err" role="alert">{err}</p>}
    {res && !res.ok && <div className="yws-err" role="alert"><b>{tt('imErr', lang)}</b><ul>{res.errors.map((m, i) => <li key={i}>{m}</li>)}</ul></div>}
    {res && res.ok && <div data-testid="yws-preview"><h4>{tt('imPreview', lang)}: {res.study.title}</h4>
      <p className="yws-note"><b>{tt('imMapped', lang)}:</b> {res.study.sections.length} {tt('sections', lang)}{rp.source === 'html' ? `, ${rp.tables} ${tt('tables', lang)}, ${rp.charts} ${tt('charts', lang)}, ${rp.paragraphs} ${tt('paras', lang)}, ${rp.lists} ${tt('lists', lang)}` : ''}</p>
      <ol className="yws-list">{res.study.sections.map((s) => <li key={s.id}>{s.title} <small>({s.blocks.length})</small></li>)}</ol>
      {(rp.notMapped.length > 0) && <div className="yws-warn"><b>{tt('imNot', lang)}</b><ul>{rp.notMapped.map((m, i) => <li key={i}>{m}</li>)}</ul></div>}
      {res.warnings.length > 0 && <div className="yws-warn"><b>{tt('imWarn', lang)}</b><ul>{res.warnings.slice(0, 12).map((m, i) => <li key={i}>{m}</li>)}</ul></div>}
      <Btn onClick={() => onUse(res)} data-testid="yws-import-use">{tt('imUse', lang)}</Btn></div>}
  </div></div>;
}
const blobToDataUrl = (b) => new Promise((ok, no) => { const r = new FileReader(); r.onload = () => ok(String(r.result)); r.onerror = no; r.readAsDataURL(b); });

export default function StudyPage({ lang, onLang, initial }) {
  const ar = lang === 'ar'; const init = useMemo(() => { const r = initial ? { study: initial } : studyStore.load(); return r.study || null; }, [initial]);
  const [study, setStudy] = useState(init || SAMPLE), [edit, setEdit] = useState(false), [tab, setTab] = useState('dashboard'), [cur, setCur] = useState('USD');
  const [imgs, setImgs] = useState({}), [msg, setMsg] = useState(''), [detail, setDetail] = useState(null), [importing, setImporting] = useState(false), [ask, setAsk] = useState(''), [busy, setBusy] = useState(false);
  const urls = useRef({}); const isSample = !!study.sample, empty = isSample;
  const showImg = useCallback(async (id) => { if (!id || urls.current[id]) return; try { const r = await imageStore.get(id); if (r && r.blob) { urls.current[id] = URL.createObjectURL(r.blob); setImgs((m) => ({ ...m, [id]: urls.current[id] })); } } catch (e) { /* ignore */ } }, []);
  useEffect(() => { imageIds(study).forEach(showImg); }, [study, showImg]);
  useEffect(() => () => Object.values(urls.current).forEach((u) => { try { URL.revokeObjectURL(u); } catch (e) { /* ignore */ } }), []);
  useEffect(() => { document.title = study.title + ' | YAS Bloom'; }, [study.title]);
  const persist = useCallback((next) => { if (next.sample) return; const e = studyStore.save(next); setMsg(e === SERR.full ? tt('saveFull', lang) : e === SERR.blocked ? tt('noPersist', lang) : ''); }, [lang]);
  const apply = useCallback((fn) => setStudy((cur0) => { const next = fn(cur0); if (next !== cur0) persist(next); return next; }), [persist]);
  const api = {
    study, edit, lang, cur, rate: study.rate || 1320, imgs, setDetail,
    set: (path, v) => apply((s) => setAt(s, path, v)), ins: (path, i, v) => apply((s) => insertAt(s, path, i, v)), rm: (path, i) => apply((s) => removeAt(s, path, i)), mv: (path, i, d) => apply((s) => moveAt(s, path, i, d)),
    upload: async (path, file) => { setBusy(true); setMsg(''); try { const out = await processImage(file); const id = uid('i'); const r = await imageStore.put(id, out); if (!r.ok) { setMsg(tt(r.error === 'max' ? 'imgMax' : 'noPersist', lang)); } else { await showImg(id); apply((s) => setAt(s, [...path, 'imageId'], id)); if (!imageStore.persistent) setMsg(tt('noPersist', lang)); } } catch (e) { const t = ERR_TEXT[e && e.code]; setMsg(t ? t[lang] : ERR_TEXT.decode[lang]); } setBusy(false); },
  };
  const useImport = async (res) => {
    const st = res.study; setStudy(st); const e = studyStore.saveBoth(st); setMsg(e ? tt(e === SERR.full ? 'saveFull' : 'noPersist', lang) : '');
    for (const [id, url] of Object.entries(res.images || {})) { const bytes = dataUrlBytes(url); if (!bytes) continue; const type = /^data:(image\/\w+);/.exec(url)[1]; await imageStore.put(id, { blob: new Blob([bytes], { type }), w: 0, h: 0 }); await showImg(id); }
    setImporting(false); setEdit(false); setTab('dashboard');
  };
  const doExport = async () => {
    const s = sanitizeStudy(study).study || study, images = {}; for (const id of imageIds(s)) { const r = await imageStore.get(id); if (r && r.blob) images[id] = await blobToDataUrl(r.blob); }
    const url = URL.createObjectURL(new Blob([JSON.stringify(makeBundle(s, images))], { type: 'application/json' })); const a = document.createElement('a'); a.href = url; a.download = 'yas-wood-study.json'; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 2000);
  };
  const doReset = () => { const b = studyStore.loadBase().study; if (b) { setStudy(b); persist(b); } setAsk(''); };
  const doClear = async () => { studyStore.clear(); await imageStore.clear(); urls.current = {}; setImgs({}); setStudy(SAMPLE); setEdit(false); setAsk(''); };
  const vis = study.sections.map((s, si) => ({ s, si })).filter(({ s }) => s.part === tab);
  const hasFull = study.sections.some((s) => s.part === 'full'), shown = vis.length ? vis : study.sections.map((s, si) => ({ s, si }));
  const back = (ar ? '/ar' : '') + '/yas-bloom';
  return (
    <Ctx.Provider value={api}>
      <div className="yws" style={studyVars()} dir={ar ? 'rtl' : 'ltr'} lang={lang} data-testid="yws-root" data-sample={isSample ? '1' : '0'}>
        <header className="yws-top">
          <a className="yws-btn" href={back} data-testid="yws-back">{tt('back', lang)}</a>
          <h1>{study.title}{isSample && <span className="yws-tag" data-testid="yws-sample-tag">{tt('sample', lang)}</span>}</h1>
          <div className="yws-tools" role="toolbar">
            <Btn onClick={() => setEdit(!edit)} aria-pressed={edit} data-testid="yws-edit">{tt(edit ? 'view' : 'edit', lang)}</Btn>
            <Btn onClick={() => setImporting(true)} data-testid="yws-import-btn">{tt('import', lang)}</Btn>
            <Btn onClick={doExport} disabled={isSample} data-testid="yws-export">{tt('export', lang)}</Btn>
            <Btn onClick={() => setAsk('reset')} disabled={isSample} data-testid="yws-reset">{tt('reset', lang)}</Btn>
            <Btn onClick={() => setAsk('clear')} disabled={isSample} data-testid="yws-clear">{tt('clear', lang)}</Btn>
            <Btn onClick={onLang} data-testid="yws-lang">{tt('lang', lang)}</Btn>
          </div>
          {ask && <div className="yws-confirm" role="alertdialog" aria-label={tt(ask + 'Ask', lang)}><span>{tt(ask + 'Ask', lang)}</span><Btn onClick={ask === 'reset' ? doReset : doClear} data-autofocus>{tt('yes', lang)}</Btn><Btn onClick={() => setAsk('')}>{tt('no', lang)}</Btn></div>}
        </header>
        <main className="yws-main">
          {isSample && <p className="yws-banner" data-testid="yws-sample-banner">{tt('sampleBanner', lang)}</p>}
          {empty && <div className="yws-empty" data-testid="yws-empty"><h2>{tt('emptyTitle', lang)}</h2><p>{tt('emptyBody', lang)}</p><Btn onClick={() => setImporting(true)}>{tt('imPick', lang)}</Btn></div>}
          <p className="yws-note yws-local" data-testid="yws-local">{tt('local', lang)}</p>
          {msg && <p className="yws-err" role="alert" data-testid="yws-msg">{msg}</p>}{busy && <p className="yws-note" role="status">{tt('uploading', lang)}</p>}
          {study.subtitle && <p className="yws-sub">{study.subtitle}</p>}
          <div className="yws-nav"><div className="yws-tabs" role="tablist">{['dashboard', 'full'].map((t) => (t === 'full' && !hasFull ? null : <button key={t} type="button" role="tab" aria-selected={tab === t} className={'yws-btn' + (tab === t ? ' on' : '')} onClick={() => setTab(t)} data-testid={'yws-tab-' + t}>{tt(t, lang)}</button>))}</div>
            <div className="yws-cur" role="group"><Btn className="yws-btn" aria-pressed={cur === 'USD'} onClick={() => setCur('USD')}>{tt('usd', lang)}</Btn><Btn aria-pressed={cur === 'IQD'} onClick={() => setCur('IQD')}>{tt('iqd', lang)}</Btn></div></div>
          <nav className="yws-chips" aria-label="sections">{shown.map(({ s }) => <a key={s.id} href={'#s-' + s.id} className="yws-chip">{s.title}</a>)}</nav>
          {shown.map(({ s, si }) => <Section key={s.id} s={s} si={si} />)}
          {edit && <Btn onClick={() => apply((st) => insertAt(st, ['sections'], st.sections.length, newSection(tab)))} data-testid="yws-add-section">{tt('addSection', lang)}</Btn>}
          <footer className="yws-foot">{tt('disclaimer', lang)}</footer>
        </main>
        {detail && <Detail d={detail} onClose={() => setDetail(null)} />}
        {importing && <ImportView lang={lang} onUse={useImport} onClose={() => setImporting(false)} />}
      </div>
    </Ctx.Provider>
  );
}
