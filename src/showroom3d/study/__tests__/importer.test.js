import { importStudyFile, literalItems, chartsFromScripts } from '../importer';
import { makeBundle } from '../store';
import { SAMPLE_STUDY } from '../sample';

/* SYNTHETIC fixtures only: invented words and numbers. */
const HTML = `<!doctype html><html><head><title>Synthetic study</title><style>body{x:y}</style><script>window.evil=1;</script></head><body>
<header><nav>menu</nav></header>
<section id="intro"><h1>Synthetic study</h1><p>A short synthetic lead paragraph for the test.</p><h3>Split</h3><canvas id="c1"></canvas>
<table><tr><th>Item</th><th>Y1</th></tr><tr><td>Row A</td><td>11</td></tr></table></section>
<section id="more" class="hidden"><h2>More</h2><ul><li>One</li><li>Two</li></ul><div><span>Loose text here</span></div></section>
<script>const demoList = [1,2]; new Chart(document.getElementById('c1'), { type: 'doughnut', data: { labels: ['A','B'], datasets: [{ data: [60, 40] }] } });</script></body></html>`;
test('maps sections, table, list, chart; reads chart numbers without evaluating', () => {
  const r = importStudyFile(HTML); expect(r.ok).toBe(true); expect(r.study.sections.map((s) => s.id)).toEqual(['intro', 'more']);
  expect(r.study.sections[1].part).toBe('full'); const b = r.study.sections[0].blocks;
  expect(b.find((x) => x.type === 'table').rows[0]).toEqual(['Row A', '11']); const ch = b.find((x) => x.type === 'chart'); expect(ch.kind).toBe('donut'); expect(ch.series[0].values).toEqual([60, 40]);
  expect(r.report.notMapped.join(' ')).toMatch(/demoList/); expect(typeof window.evil).toBe('undefined');
});
test('hostile HTML: scripts, handlers, iframes, javascript: links never reach the study', () => {
  const evil = `<body><section><h2>Hostile</h2><p onclick="alert(1)">Click <a href="javascript:alert(2)">me</a> &lt;script&gt;x&lt;/script&gt;</p><img src=x onerror="alert(3)"><iframe src="https://evil.example"></iframe><script>alert(4)</script><style>*{display:none}</style><svg onload="alert(5)"><text>svgtext</text></svg><p>Second paragraph, safe text.</p></section></body>`;
  const r = importStudyFile(evil), j = JSON.stringify(r.study);
  expect(r.ok).toBe(true); expect(j).not.toMatch(/alert|onerror|onclick|onload|iframe|evil\.example|svgtext|display:none|<|javascript:/i);
});
test('literal tokenizer never evaluates', () => { expect(literalItems("['a', 'b\\'c', 3, -4.5, foo(), \"d\"]")).toEqual(['a', "b'c", 3, -4.5, 'd']); expect(chartsFromScripts('new Chart(document.getElementById("x"), {})')).toEqual({}); });
test('bundle round trip, empty, oversize and garbage', () => {
  const r = importStudyFile(JSON.stringify(makeBundle(SAMPLE_STUDY, {}))); expect(r.ok).toBe(true); expect(r.report.source).toBe('bundle');
  expect(importStudyFile('  ').ok).toBe(false); expect(importStudyFile('x'.repeat(3.2 * 1024 * 1024)).ok).toBe(false); expect(importStudyFile('<p>hi</p>').ok).toBe(false); expect(importStudyFile('{bad').ok).toBe(false);
});
