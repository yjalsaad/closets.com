/* [IKHTARHA GAMES 2026-11-09] The six games. Every game follows the same contract:
 *   <Game ar onPlay={(pick) => Promise<api response>} onDone={(response) => void} prizes={[...]} />
 * The game asks the server (onPlay) at its decisive moment — box opened, wheel spun, card scratched, key turned, last pair matched,
 * claw grabbed — waits for the server's prize, finishes its animation on that prize and hands the response to onDone.
 * Nothing here chooses a prize. CSS 3D only (no WebGL) so it runs on any phone. */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import ScratchCard from '../campaign/ScratchCard';
import { sfx, reduced, valueText } from './fx';

const wait = (ms) => new Promise((r) => setTimeout(r, reduced() ? Math.min(ms, 200) : ms));
const T = (ar, en, a) => (ar ? a : en);

/* ─────────── 1. Mystery Boxes ─────────── */
export function MysteryBoxes({ ar, onPlay, onDone }) {
  const [pick, setPick] = useState(null); const [phase, setPhase] = useState('choose'); const [res, setRes] = useState(null);
  const go = async (i) => {
    if (phase !== 'choose') return; sfx('tap'); setPick(i); setPhase('shake');
    const [r] = await Promise.all([onPlay(i).catch(() => null), wait(1300)]);
    if (!r || !r.ok) { onDone(r); return; }
    setRes(r.result); setPhase('open'); sfx(r.result.won ? 'win' : 'soft'); await wait(2200); onDone(r);
  };
  return (
    <div className={'g-boxes is-' + phase}>
      {Array.from({ length: 6 }, (_, i) => (
        <button key={i} type="button" className={'g-box' + (pick === i ? ' is-pick' : pick != null ? ' is-other' : '')} onClick={() => go(i)} disabled={phase !== 'choose'}
          aria-label={T(ar, `Box ${i + 1}`, `الصندوق ${i + 1}`)} data-testid="g-box" style={{ '--i': i }}>
          <span className="g-box-3d"><i className="g-f g-front" /><i className="g-f g-side" /><i className="g-f g-topface" /><i className="g-lid"><b /></i><i className="g-ribbon" /></span>
          {pick === i && phase === 'open' && <span className="g-rays" aria-hidden="true" />}
        </button>
      ))}
      {res && phase === 'open' && <span className="g-box-prize" dir="auto">{valueText(res, ar)}</span>}
    </div>
  );
}

/* ─────────── 2. Spin & Win ─────────── */
const wheelLabel = (s, ar) => {
  if (s.type === 'percent' || s.type === 'fixed') return valueText(s, ar);
  const w = String((ar ? s.name_ar : s.name_en) || '').split(/\s+/); let o = '';
  for (const x of w) { if ((o + ' ' + x).trim().length > 15) break; o = (o + ' ' + x).trim(); }
  return o || w[0];
};
const SEG = ['#4A2C82', '#3FB6B0', '#7B5BB5', '#9FDDD8', '#3A1F6B', '#23807C'];
export function SpinWin({ ar, onPlay, onDone, prizes = [] }) {
  const segs = prizes.length ? prizes : [{ id: 'x', name_en: '?', name_ar: '؟' }];
  const n = segs.length; const a = 360 / n;
  const [rot, setRot] = useState(0); const [busy, setBusy] = useState(false); const tickT = useRef(null);
  useEffect(() => () => clearInterval(tickT.current), []);
  const spin = async () => {
    if (busy) return; setBusy(true); sfx('whoosh');
    const r = await onPlay(null).catch(() => null);
    if (!r || !r.ok) { setBusy(false); onDone(r); return; }
    let idx = segs.findIndex((s) => s.id === r.result.prize_id);
    if (idx < 0) idx = segs.findIndex((s) => s.name_en === r.result.name_en); if (idx < 0) idx = 0;
    const jitter = (Math.random() - 0.5) * a * 0.6;
    const target = 360 * (reduced() ? 1 : 7) + (360 - (idx * a + a / 2)) + jitter;   // pointer at the top
    setRot(target);
    const dur = reduced() ? 600 : 5600; let last = 0; const t0 = Date.now();
    tickT.current = setInterval(() => { const p = (Date.now() - t0) / dur; const eased = 1 - Math.pow(1 - Math.min(p, 1), 4); const cur = Math.floor((eased * target) / a);
      if (cur !== last) { sfx('tick'); last = cur; } if (p >= 1) clearInterval(tickT.current); }, 30);
    await wait(dur + 300); sfx(r.result.won ? 'win' : 'soft'); await wait(700); onDone(r);
  };
  const R = 150, C = 160;
  const path = (i) => { const s = ((i * a - 90) * Math.PI) / 180, e = (((i + 1) * a - 90) * Math.PI) / 180;
    return `M${C},${C} L${C + R * Math.cos(s)},${C + R * Math.sin(s)} A${R},${R} 0 ${a > 180 ? 1 : 0} 1 ${C + R * Math.cos(e)},${C + R * Math.sin(e)} Z`; };
  return (
    <div className="g-spin">
      <div className="g-wheel-wrap">
        <span className="g-pointer" aria-hidden="true" />
        <svg viewBox="0 0 320 320" className="g-wheel" style={{ transform: `rotate(${rot}deg)`, transitionDuration: reduced() ? '0.6s' : '5.6s' }} aria-hidden="true">
          <circle cx={C} cy={C} r={R + 8} fill="#2A1650" />
          {segs.map((s, i) => (
            <g key={s.id + i}>
              <path d={path(i)} fill={SEG[i % SEG.length]} stroke="#FFFFFF" strokeOpacity=".35" />
              <text x={C} y={C - R + 34} fill="#fff" fontSize={n > 8 ? 10 : 12} fontWeight="700" textAnchor="middle" transform={`rotate(${i * a + a / 2} ${C} ${C})`}>
                {wheelLabel(s, ar)}
              </text>
            </g>
          ))}
          {Array.from({ length: 24 }, (_, i) => <circle key={i} cx={C + (R + 4) * Math.cos((i * 15 * Math.PI) / 180)} cy={C + (R + 4) * Math.sin((i * 15 * Math.PI) / 180)} r="2.6" fill={i % 2 ? '#9FDDD8' : '#fff'} className="g-bulb" style={{ '--i': i }} />)}
        </svg>
        <button type="button" className="g-hubbtn" onClick={spin} disabled={busy} data-testid="g-spin">{busy ? '…' : T(ar, 'SPIN', 'لُف')}</button>
      </div>
    </div>
  );
}

/* ─────────── 3. Scratch & Win (reuses the campaign scratch card) ─────────── */
export function ScratchWin({ ar, onPlay, onDone, brand }) {
  const last = useRef(null);
  const start = () => onPlay(null).then((r) => { last.current = r; return r && r.ok ? { ok: true, reward: r.result } : (r || { ok: false, state: 'failed' }); }).catch(() => ({ ok: false, state: 'failed' }));
  const done = () => { sfx(last.current && last.current.ok && last.current.result.won ? 'win' : 'soft'); onDone(last.current); };
  return <div className="g-scratch"><ScratchCard ar={ar} brand={brand || {}} gameName={T(ar, 'Scratch & Win', 'امسح واربح')} reduced={reduced()} onStart={start} onDone={done} /></div>;
}

/* ─────────── 4. Lucky Key ─────────── */
export function LuckyKey({ ar, onPlay, onDone }) {
  const [pick, setPick] = useState(null); const [phase, setPhase] = useState('choose');
  const go = async (i) => {
    if (phase !== 'choose') return; sfx('tap'); setPick(i); setPhase('fly');
    const [r] = await Promise.all([onPlay(i).catch(() => null), wait(900)]);
    if (!r || !r.ok) { onDone(r); return; }
    setPhase('turn'); sfx('clunk'); await wait(900);
    setPhase('open'); sfx(r.result.won ? 'win' : 'soft'); await wait(1800); onDone(r);
  };
  return (
    <div className={'g-keys is-' + phase}>
      <div className="g-chest" aria-hidden="true"><i className="g-chest-lid" /><i className="g-chest-body" /><i className="g-lock"><b /></i><i className="g-chest-glow" /></div>
      <div className="g-keyrow">
        {Array.from({ length: 5 }, (_, i) => (
          <button key={i} type="button" className={'g-key' + (pick === i ? ' is-pick' : pick != null ? ' is-other' : '')} onClick={() => go(i)} disabled={phase !== 'choose'}
            aria-label={T(ar, `Key ${i + 1}`, `المفتاح ${i + 1}`)} data-testid="g-key" style={{ '--i': i }}>
            <svg viewBox="0 0 40 110" aria-hidden="true"><defs><linearGradient id={'kg' + i} x1="0" x2="1"><stop offset="0" stopColor="#23807C" /><stop offset=".5" stopColor="#9FDDD8" /><stop offset="1" stopColor="#23807C" /></linearGradient></defs>
              <circle cx="20" cy="18" r="14" fill="none" stroke={`url(#kg${i})`} strokeWidth="7" /><rect x="17" y="30" width="6" height="66" rx="3" fill={`url(#kg${i})`} />
              <rect x="23" y="74" width="10" height="5" rx="2" fill={`url(#kg${i})`} /><rect x="23" y="86" width="7" height="5" rx="2" fill={`url(#kg${i})`} /></svg>
          </button>
        ))}
      </div>
    </div>
  );
}

/* ─────────── 5. Memory Match ─────────── */
const ICONS = [
  <path key="w" d="M6 4h12v16H6zM12 4v16M10 11h0M14 11h0" />, <path key="k" d="M4 10h16v10H4zM4 14h16M8 6h8M12 6v4" />,
  <path key="d" d="M7 3h10v18H7zM14 12h.01" />, <path key="l" d="M9 3h6l3 7H6zM12 10v9M8 21h8" />,
  <path key="s" d="M4 12h16v6H4zM6 12V9h12v3M6 18v2M18 18v2" />, <path key="g" d="M4 9h16v11H4zM2 9h20M12 9v11M12 9c-2-4-6-4-6-1s6 1 6 1 6-4 6-1-4 3-6 1" />,
];
export function MemoryMatch({ ar, onPlay, onDone }) {
  const deck = useMemo(() => { const d = [...ICONS.keys(), ...ICONS.keys()].map((k, i) => ({ k, id: i })); for (let i = d.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [d[i], d[j]] = [d[j], d[i]]; } return d; }, []);
  const [open, setOpen] = useState([]); const [done, setDone] = useState([]); const [moves, setMoves] = useState(0); const [phase, setPhase] = useState('play'); const lock = useRef(false);
  const flip = (c) => {
    if (lock.current || phase !== 'play' || open.includes(c.id) || done.includes(c.k)) return;
    sfx('flip'); const o = [...open, c.id]; setOpen(o);
    if (o.length === 2) {
      setMoves((m) => m + 1); lock.current = true;
      const [x, y] = o.map((id) => deck.find((d) => d.id === id));
      setTimeout(async () => {
        if (x.k === y.k) {
          sfx('match'); const nd = [...done, x.k]; setDone(nd); setOpen([]); lock.current = false;
          if (nd.length === ICONS.length) {
            setPhase('reveal');
            const [r] = await Promise.all([onPlay(null).catch(() => null), wait(900)]);
            if (r && r.ok) sfx(r.result.won ? 'win' : 'soft');
            await wait(600); onDone(r);
          }
        } else { setOpen([]); lock.current = false; }
      }, x.k === y.k ? 380 : 820);
    }
  };
  return (
    <div className={'g-memory is-' + phase}>
      <p className="g-meta"><span>{T(ar, 'Pairs', 'الأزواج')} <b>{done.length}/{ICONS.length}</b></span><span>{T(ar, 'Moves', 'المحاولات')} <b>{moves}</b></span></p>
      <div className="g-cards">
        {deck.map((c) => { const up = open.includes(c.id) || done.includes(c.k);
          return (
            <button key={c.id} type="button" className={'g-card' + (up ? ' is-up' : '') + (done.includes(c.k) ? ' is-done' : '')} onClick={() => flip(c)} aria-pressed={up} data-testid="g-card" data-k={c.k}
              aria-label={up ? T(ar, 'Card open', 'بطاقة مفتوحة') : T(ar, 'Hidden card', 'بطاقة مخفية')}>
              <span className="g-card-in"><i className="g-card-back" /><i className="g-card-face"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">{ICONS[c.k]}</svg></i></span>
            </button>
          ); })}
      </div>
    </div>
  );
}

/* ─────────── 6. Lucky Claw ─────────── */
const CAPS = ['#3FB6B0', '#4A2C82', '#FFFFFF', '#3FB6B0', '#9FDDD8', '#7B5BB5', '#23807C'];
export function LuckyClaw({ ar, onPlay, onDone }) {
  const [x, setX] = useState(50); const [phase, setPhase] = useState('aim'); const [held, setHeld] = useState(null); const [res, setRes] = useState(null);
  const caps = useMemo(() => Array.from({ length: 7 }, (_, i) => ({ i, left: 10 + i * 13 + (i % 2 ? 2 : -2), row: i % 2 })), []);
  const hold = useRef(null);
  const move = (d) => { if (phase !== 'aim') return; setX((v) => Math.max(8, Math.min(92, v + d))); sfx('tick'); };
  const startHold = (d) => { move(d); clearInterval(hold.current); hold.current = setInterval(() => move(d), 90); };
  const endHold = () => clearInterval(hold.current);
  useEffect(() => () => clearInterval(hold.current), []);
  useEffect(() => {
    const k = (e) => { if (phase !== 'aim') return; if (e.key === 'ArrowLeft') move(ar ? 6 : -6); if (e.key === 'ArrowRight') move(ar ? -6 : 6); };
    window.addEventListener('keydown', k); return () => window.removeEventListener('keydown', k);
  });
  const grab = async () => {
    if (phase !== 'aim') return; endHold();
    const near = caps.reduce((b, c) => (Math.abs(c.left - x) < Math.abs(b.left - x) ? c : b), caps[0]);
    setX(near.left); setPhase('down'); sfx('whoosh');
    const req = onPlay(near.i).catch(() => null);
    await wait(1100); setPhase('close'); sfx('clunk'); setHeld(near.i); await wait(500);
    setPhase('up'); await wait(1000);
    const r = await req;
    if (!r || !r.ok) { setPhase('aim'); setHeld(null); onDone(r); return; }
    setPhase('carry'); setX(90); await wait(1100); setPhase('drop'); sfx('tap'); await wait(800);
    setRes(r.result); setPhase('open'); sfx(r.result.won ? 'win' : 'soft'); await wait(2000); onDone(r);
  };
  return (
    <div className={'g-claw is-' + phase}>
      <div className="g-machine">
        <div className="g-rail" aria-hidden="true" />
        <div className="g-claw-arm" style={{ '--x': x + '%' }} aria-hidden="true">
          <i className="g-cable" /><span className="g-claw-head"><i className="g-prong l" /><i className="g-prong r" />
            {held != null && <i className="g-cap g-cap-held" style={{ '--c': CAPS[held] }} />}</span>
        </div>
        <div className="g-pile" aria-hidden="true">{caps.map((c) => (held === c.i ? null : <i key={c.i} className="g-cap" style={{ left: c.left + '%', bottom: c.row ? 30 : 6, '--c': CAPS[c.i] }} />))}</div>
        <div className="g-chute" aria-hidden="true" />
        {phase === 'open' && res && <div className="g-capsule-open"><span className="g-rays" aria-hidden="true" /><b dir="auto">{valueText(res, ar)}</b></div>}
      </div>
      <div className="g-claw-ctl" dir="ltr">
        <button type="button" className="g-ctl" onPointerDown={() => startHold(-6)} onPointerUp={endHold} onPointerLeave={endHold} disabled={phase !== 'aim'} aria-label={T(ar, 'Move left', 'تحريك لليسار')}>◀</button>
        <button type="button" className="g-ctl g-grab" onClick={grab} disabled={phase !== 'aim'} data-testid="g-grab">{T(ar, 'Grab', 'التقط')}</button>
        <button type="button" className="g-ctl" onPointerDown={() => startHold(6)} onPointerUp={endHold} onPointerLeave={endHold} disabled={phase !== 'aim'} aria-label={T(ar, 'Move right', 'تحريك لليمين')}>▶</button>
      </div>
    </div>
  );
}

export const GAMES = [
  { id: 'mystery-boxes', C: MysteryBoxes, en: ['Mystery Boxes', 'Choose a mystery box and discover your prize.', 'Tap one of the six boxes. The box you choose opens with your prize.'],
    ar: ['الصناديق الغامضة', 'اختر صندوقًا غامضًا واكتشف جائزتك.', 'اضغط على أحد الصناديق الستة، وسيُفتح الصندوق الذي تختاره عن جائزتك.'] },
  { id: 'spin-win', C: SpinWin, needsPrizes: true, en: ['Spin & Win', 'Spin a 3D prize wheel.', 'Press SPIN. Where the wheel stops is your prize.'],
    ar: ['لُف واربح', 'لُف عجلة الجوائز.', 'اضغط «لُف»، وحيث تتوقف العجلة تكون جائزتك.'] },
  { id: 'scratch-win', C: ScratchWin, en: ['Scratch & Win', 'Scratch a digital card to reveal your prize.', 'Scratch the gold foil with your finger or mouse, or press “Reveal all”.'],
    ar: ['امسح واربح', 'امسح البطاقة الرقمية لتكشف جائزتك.', 'امسح الطبقة الذهبية بإصبعك أو بالماوس، أو اضغط «اكشف الكل».'] },
  { id: 'lucky-key', C: LuckyKey, en: ['Lucky Key', 'Choose a key to unlock a mystery reward.', 'Pick one of the five golden keys and watch it open the chest.'],
    ar: ['مفتاح الحظ', 'اختر مفتاحًا ليفتح لك جائزة غامضة.', 'اختر أحد المفاتيح الذهبية الخمسة وشاهده يفتح الصندوق.'] },
  { id: 'memory-match', C: MemoryMatch, en: ['Memory Match', 'Match cards to unlock a reward.', 'Flip two cards at a time and find all six pairs to unlock your reward.'],
    ar: ['طابق البطاقات', 'طابق البطاقات لتفتح جائزتك.', 'اقلب بطاقتين في كل مرة واعثر على الأزواج الستة لتفتح جائزتك.'] },
  { id: 'lucky-claw', C: LuckyClaw, en: ['Lucky Claw', 'Control a 3D claw machine to grab a prize.', 'Move the claw with ◀ ▶, then press Grab to catch a capsule.'],
    ar: ['المخلب المحظوظ', 'تحكّم في آلة المخلب والتقط جائزتك.', 'حرّك المخلب بـ ◀ ▶ ثم اضغط «التقط» لتمسك كبسولة.'] },
];
