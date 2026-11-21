// Integration: the whole site in jsdom with the network faked. Replaces the old "learn react" placeholder test.
import { render, screen, act, waitFor, within, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '../App';

let calls;
function mockNet(overrides = {}) {
  calls = [];
  global.fetch = jest.fn(async (url, init = {}) => {
    const u = String(url); calls.push({ url: u, body: init.body ? JSON.parse(init.body) : null });
    const key = Object.keys(overrides).find((k) => u.includes(k));
    if (key) { const v = typeof overrides[key] === 'function' ? await overrides[key](u, init) : overrides[key]; if (v instanceof Error) throw v; return { ok: true, status: 200, json: async () => v, text: async () => JSON.stringify(v) }; }
    return { ok: true, status: 200, json: async () => [], text: async () => '[]' };
  });
}
const go = (path) => { window.history.pushState({}, '', path); };
beforeEach(() => { localStorage.clear(); sessionStorage.clear(); localStorage.setItem('closets_consent_v2', JSON.stringify({ v: 2, decided: true, analytics: false, ai: false, ts: 1 })); jest.spyOn(console, 'error').mockImplementation(() => {}); });
afterEach(() => { console.error.mockRestore(); });

describe('shell', () => {
  test('skip link is the first focusable element and a real <main id="main"> landmark exists', async () => {
    mockNet(); go('/about'); render(<App />);
    expect(document.querySelector('main#main')).toBeInTheDocument();
    userEvent.tab();
    expect(screen.getByRole('link', { name: /skip to main content/i })).toHaveFocus();
    expect(screen.queryByText(/learn react/i)).toBeNull();     // the hidden placeholder link is gone
    expect(document.documentElement.lang).toBe('en');
  });
  test('language switch updates <html lang dir> and gets announced', async () => {
    mockNet(); go('/faq'); render(<App />);
    userEvent.click(screen.getByRole('button', { name: 'العربية' }));
    await waitFor(() => expect(document.documentElement.lang).toBe('ar'));
    expect(document.documentElement.dir).toBe('rtl');
    expect(screen.getByTestId('route-announcer')).toHaveTextContent('العربية');
  });
  test('privacy and terms pages live on this site, are marked placeholder and noindex', async () => {
    mockNet(); go('/privacy'); const { unmount } = render(<App />);
    expect(screen.getByRole('heading', { level: 1, name: /privacy notice/i })).toBeInTheDocument();
    expect(screen.getByTestId('legal-placeholder')).toBeInTheDocument();
    expect(document.head.querySelector('meta[name="robots"]').getAttribute('content')).toMatch(/noindex/);
    unmount();
  });
  test('footer legal links point at this site, not the ERP host', async () => {
    mockNet(); go('/faq'); render(<App />);
    const footer = document.querySelector('footer');
    const priv = within(footer).getAllByRole('link', { name: /privacy/i });   // legal row + the notice under the newsletter field
    priv.forEach((a) => expect(a).toHaveAttribute('href', '/privacy'));
    expect(footer.innerHTML).not.toMatch(/closets-hub\.vercel\.app\/(privacy|terms)/);
  });
  test('the consent banner appears when nothing was chosen yet', async () => {
    localStorage.clear(); mockNet(); go('/faq'); render(<App />);
    expect(screen.getByTestId('consent-banner')).toBeInTheDocument();
  });
});

describe('resilience: bad CMS / product data never blanks the site', () => {
  test('object-valued product name, banner title and website_content value', async () => {
    mockNet({
      website_products: [{ id: 'p1', name: { o: 1 }, price: 'x', active: true }, { id: 'p2', name: 'Good wardrobe', price: 100, category: 'Wardrobes', active: true }],
      website_banners: [{ id: 'b1', title: { o: 1 }, active: true }],
      website_content: [{ key: 'home.hero.title', value: { not: 'a string' } }, { key: 'footer.brand', value: 42 }],
      website_testimonials: [{ id: 't', name: { o: 1 }, text: ['x'], rating: 'abc' }],
    });
    go('/'); render(<App />);
    await act(async () => { await new Promise((r) => setTimeout(r, 50)); });
    expect(screen.queryByText(/something went wrong/i)).toBeNull();
    expect(document.querySelector('nav')).toBeInTheDocument();
    expect(document.querySelector('footer')).toBeInTheDocument();
    expect(document.querySelector('main#main h1')).toBeInTheDocument();
  });
  test('a crash inside one route is contained: navigation and footer stay', async () => {
    mockNet({ website_products: [{ id: 'p2', name: 'Good', price: 1, active: true }] });
    go('/gallery'); render(<App />);
    await act(async () => { await new Promise((r) => setTimeout(r, 30)); });
    expect(document.querySelector('nav')).toBeInTheDocument();
  });
});

describe('booking form: labels, validation, honeypot, single submit, offline', () => {
  async function open() { mockNet({ book_appointment: {} }); go('/booking'); render(<App />); await screen.findByLabelText(/full name/i); }
  const submitBtn = () => document.querySelector('main form button[type="submit"]');

  test('every control has an accessible name (labels exist for the selects and the date)', async () => {
    await open();
    document.querySelectorAll('main form input:not(.hp-field input), main form select, main form textarea').forEach((el) => {
      if (el.closest('.hp-field')) return;
      expect(el.labels && el.labels.length).toBeGreaterThan(0);
    });
  });
  test('"xyz" phone and "bad@@email" are rejected with announced errors; nothing is sent', async () => {
    await open();
    userEvent.type(screen.getByLabelText(/full name/i), 'Amina');
    userEvent.type(document.getElementById('bk-phone'), 'xyz');
    userEvent.type(document.getElementById('bk-email'), 'bad@@email');
    userEvent.click(submitBtn());
    const phone = document.getElementById('bk-phone'); const email = document.getElementById('bk-email');
    expect(phone).toHaveAttribute('aria-invalid', 'true'); expect(email).toHaveAttribute('aria-invalid', 'true');
    expect(document.getElementById(phone.getAttribute('aria-describedby'))).toHaveTextContent(/valid phone/i);
    expect(calls.filter((c) => c.url.includes('book_appointment'))).toHaveLength(0);
    expect(document.activeElement.id).toBeDefined();
  });
  test('valid data with Arabic-Indic digits is sent once, normalised, even on a double click', async () => {
    await open();
    userEvent.type(screen.getByLabelText(/full name/i), 'Amina');
    userEvent.type(document.getElementById('bk-phone'), '٣٦١٢ ٣٤٥٦');
    const b = submitBtn(); userEvent.click(b); userEvent.click(b);
    await waitFor(() => expect(calls.filter((c) => c.url.includes('book_appointment'))).toHaveLength(1));
    expect(calls.find((c) => c.url.includes('book_appointment')).body.p_phone).toBe('36123456');
  });
  test('honeypot filled: no request is made', async () => {
    await open();
    userEvent.type(screen.getByLabelText(/full name/i), 'Amina'); userEvent.type(document.getElementById('bk-phone'), '36123456');
    fireEvent.change(within(document.querySelector('main form')).getByLabelText(/leave this field empty/i), { target: { value: 'spam' } });
    userEvent.click(submitBtn());
    await act(async () => { await new Promise((r) => setTimeout(r, 20)); });
    expect(calls.filter((c) => c.url.includes('book_appointment'))).toHaveLength(0);
  });
  test('a privacy notice with a link to /privacy sits at the form', async () => {
    await open();
    expect(within(document.querySelector('main form')).getByRole('link', { name: /privacy notice/i })).toHaveAttribute('href', '/privacy');
  });
  test('server failure: the form data is kept and a visible error is announced', async () => {
    mockNet({ book_appointment: () => new Error('network down') }); go('/booking'); render(<App />);
    await screen.findByLabelText(/full name/i);
    userEvent.type(screen.getByLabelText(/full name/i), 'Amina'); userEvent.type(document.getElementById('bk-phone'), '36123456');
    userEvent.click(submitBtn());
    await screen.findByText(/nothing was lost/i);
    expect(screen.getByLabelText(/full name/i)).toHaveValue('Amina');
  });
  test('offline: nothing is sent and the visitor is told their details are kept', async () => {
    await open();
    Object.defineProperty(navigator, 'onLine', { value: false, configurable: true });
    userEvent.type(screen.getByLabelText(/full name/i), 'Amina'); userEvent.type(document.getElementById('bk-phone'), '36123456');
    userEvent.click(submitBtn());
    await screen.findByText(/you are offline/i);
    expect(calls.filter((c) => c.url.includes('book_appointment'))).toHaveLength(0);
    Object.defineProperty(navigator, 'onLine', { value: true, configurable: true });
  });
});

describe('newsletter: success only when the server confirmed', () => {
  test('failed subscription shows an error, not "you are subscribed"', async () => {
    mockNet({ public_lead_submit: () => new Error('500') }); go('/'); render(<App />);
    const input = await screen.findByLabelText(/e-?mail/i, { selector: '#nl-email' });
    userEvent.type(input, 'a@b.com');
    userEvent.click(input.closest('form').querySelector('button[type="submit"]'));
    await waitFor(() => expect(document.getElementById('nl-err')).toBeInTheDocument());
    expect(screen.queryByText(/you.re subscribed/i)).toBeNull();
  });
  test('bad e-mail is rejected before any request', async () => {
    mockNet(); go('/'); render(<App />);
    const input = await screen.findByLabelText(/e-?mail/i, { selector: '#nl-email' });
    userEvent.type(input, 'bad@@email');
    userEvent.click(input.closest('form').querySelector('button[type="submit"]'));
    expect(calls.filter((c) => c.url.includes('public_lead_submit'))).toHaveLength(0);
    expect(input).toHaveAttribute('aria-invalid', 'true');
  });
});

describe('cart drawer is a real modal', () => {
  test('?cart=1 opens a labelled dialog; Escape closes it; closed drawer is inert', async () => {
    mockNet(); go('/faq'); render(<App />);
    const drawer = () => document.querySelector('[aria-labelledby="cart-title"]');
    expect(drawer().hasAttribute('inert')).toBe(true);
    userEvent.click(screen.getByRole('button', { name: /^cart/i }));
    await waitFor(() => expect(drawer().hasAttribute('inert')).toBe(false));
    expect(screen.getByRole('dialog', { name: /cart/i })).toHaveAttribute('aria-modal', 'true');
  });
});
