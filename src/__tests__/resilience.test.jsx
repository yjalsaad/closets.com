import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SectionBoundary from '../safety/SectionBoundary';
import WebGLGate from '../safety/WebGLGate';
import { _resetWebglCache } from '../safety/webgl';
import { sanitizeProducts, sanitizeBanners, cmsValue, str, url } from '../safety/sanitize';
import { scrubText } from '../safety/scrub';

const Boom = () => { throw new Error('bad row'); };

describe('ErrorBoundary isolation', () => {
  let spy;
  beforeEach(() => { spy = jest.spyOn(console, 'error').mockImplementation(() => {}); global.fetch = jest.fn(async () => ({ ok: true })); });
  afterEach(() => spy.mockRestore());

  test('a section that throws does not take its siblings down', () => {
    render(<div><h1>Shell</h1><SectionBoundary name="a"><Boom /></SectionBoundary><p>sibling still here</p></div>);
    expect(screen.getByText('Shell')).toBeInTheDocument();
    expect(screen.getByText('sibling still here')).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent(/could not be shown/i);
  });
  test('retry re-renders the section once the problem is gone', () => {
    let fail = true;
    const Flaky = () => { if (fail) throw new Error('x'); return <p>recovered</p>; };
    render(<SectionBoundary name="b"><Flaky /></SectionBoundary>);
    fail = false;
    userEvent.click(screen.getByRole('button', { name: /try again/i }));
    expect(screen.getByText('recovered')).toBeInTheDocument();
  });
  test('resetKey (route change) clears a previous error', () => {
    const { rerender } = render(<SectionBoundary name="r" resetKey="/a"><Boom /></SectionBoundary>);
    expect(screen.getByRole('alert')).toBeInTheDocument();
    rerender(<SectionBoundary name="r" resetKey="/b"><p>fine</p></SectionBoundary>);
    expect(screen.getByText('fine')).toBeInTheDocument();
  });
  test('silent boundary renders nothing for a failed optional section', () => {
    const { container } = render(<div><SectionBoundary name="s" silent><Boom /></SectionBoundary><span>ok</span></div>);
    expect(container.textContent).toBe('ok');
  });
  test('the crash report carries no e-mail, phone, token or query string', () => {
    render(<SectionBoundary name="pii"><Throws /></SectionBoundary>);
    const body = JSON.parse(global.fetch.mock.calls.find((c) => String(c[0]).includes('log_client_error'))[1].body);
    expect(JSON.stringify(body)).not.toMatch(/amina@example\.com|36123456|eyJ/);
    expect(body.p_user_id).toBeNull();
  });
  function Throws() { throw new Error('failed for amina@example.com phone 36123456 token eyJhbGciOiJIUzI1NiJ9.abcdefghij.klmnopqrst'); }
});

describe('WebGL unavailable', () => {
  afterEach(() => { _resetWebglCache(); });
  test('shows a clear message and non-3D alternatives instead of children', () => {
    _resetWebglCache();
    render(<WebGLGate name="t"><div>3d canvas</div></WebGLGate>);   // jsdom has no WebGL
    expect(screen.queryByText('3d canvas')).toBeNull();
    expect(screen.getByRole('alert')).toHaveTextContent(/3D view is not available/i);
    expect(screen.getByRole('link', { name: /book a free design visit/i })).toHaveAttribute('href', '/booking');
  });
  test('uses the caller fallback when given', () => {
    render(<WebGLGate name="t" fallback={<p>2D picture</p>}><div>3d canvas</div></WebGLGate>);
    expect(screen.getByText('2D picture')).toBeInTheDocument();
  });
});

describe('data sanitising', () => {
  test('a row with an object name / non-string fields cannot reach a renderer as an object', () => {
    const rows = sanitizeProducts([{ id: 1, name: { evil: true }, price: 'x', category: ['a'], image_url: 'javascript:alert(1)' }, null, 'str', { id: 2, name: 'Ok', price: '12.5', image_url: 'https://x/y.jpg' }]);
    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({ name: '', price: 0, category: '', image_url: '' });
    expect(rows[1]).toMatchObject({ name: 'Ok', price: 12.5, image_url: 'https://x/y.jpg' });
    rows.forEach((r) => expect(typeof r.name.split).toBe('function'));
  });
  test('banners, cms values, urls', () => {
    expect(sanitizeBanners([{ title: { a: 1 }, image_url: 'data:text/html,x' }])[0]).toMatchObject({ title: '', image_url: '' });
    expect(cmsValue({ a: 1 })).toBe(''); expect(cmsValue(5)).toBe('5'); expect(cmsValue(null)).toBe('');
    expect(str(NaN, 'fb')).toBe('fb'); expect(url('/layouts/a.jpg')).toBe('/layouts/a.jpg'); expect(url('//evil.com')).toBe('');
    expect(sanitizeProducts('nope')).toEqual([]);
  });
  test('scrubText masks e-mails, numbers (incl. Arabic digits), tokens and sensitive query values', () => {
    const s = scrubText('x a@b.com 36123456 ٣٦١٢٣٤٥٦ https://s/?email=a@b.com&token=zzz eyJabcdefghij.klmnopqrst.uvwxyz1234');
    expect(s).not.toMatch(/a@b\.com|36123456|٣٦|zzz|eyJ/);
  });
});
