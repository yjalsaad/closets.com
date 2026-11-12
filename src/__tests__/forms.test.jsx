import { useState } from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { validateEmail, validatePhone, validateName, validateDate, normalizeDigits, normalizePhone, validateForm, isBot } from '../forms/validate';
import Field, { Honeypot } from '../forms/Field';
import { useSubmit } from '../forms/useSubmit';

describe('validation rules', () => {
  test('e-mail: rejects the values the audit submitted', () => {
    ['xyz', 'bad@@email', 'a@b', '@x.com', 'a b@c.com', 'a@b..com', '.a@b.com', 'a@-b.com', 'x@y.c'].forEach((v) => expect(validateEmail(v)).toBe(false));
    ['name@example.com', 'first.last+tag@sub.example.co.uk', 'a@b.bh'].forEach((v) => expect(validateEmail(v)).toBe(true));
  });
  test('Arabic-Indic and Persian digits are normalised', () => {
    expect(normalizeDigits('٣٦١٢٣٤٥٦')).toBe('36123456');
    expect(normalizeDigits('۳۶۱۲۳۴۵۶')).toBe('36123456');
    expect(normalizePhone('+٩٧٣ ٣٦١٢-٣٤٥٦')).toBe('+97336123456');
    expect(normalizePhone('00973 3612 3456')).toBe('+97336123456');
  });
  test('phone: Bahrain 8-digit, +973 / 973 / 00973 forms, Arabic digits; junk rejected', () => {
    ['36123456', '+973 3612 3456', '97336123456', '00973 36123456', '٣٦١٢٣٤٥٦', '+٩٧٣٣٦١٢٣٤٥٦', '1755 5095', '+44 7700 900123'].forEach((v) => expect(validatePhone(v)).toBe(true));
    ['xyz', 'abc', '123', '3612345', '036123456', '+973 123', '9736123', '+0 12345678', '1'.repeat(25)].forEach((v) => expect(validatePhone(v)).toBe(false));
  });
  test('name: required, length-limited, no angle brackets (stored-XSS probes)', () => {
    expect(validateName('Amina Al Khalifa')).toBe(true);
    expect(validateName('عائشة')).toBe(true);
    expect(validateName('<img src=x onerror=alert(1)>')).toBe(false);
    expect(validateName('a')).toBe(false);
    expect(validateName('x'.repeat(121))).toBe(false);
  });
  test('date: not in the past, not beyond 12 months', () => {
    const now = new Date('2026-11-12T10:00:00');
    expect(validateDate('2026-11-12', now)).toBeNull();
    expect(validateDate('2001-01-01', now)).toBe('datePast');
    expect(validateDate('2028-01-01', now)).toBe('dateFar');
    expect(validateDate('nope', now)).toBe('dateBad');
  });
  test('validateForm: required, types, limits, bilingual messages, cleaned values', () => {
    const schema = { name: { type: 'name', required: true }, phone: { type: 'phone', required: true }, email: { type: 'email' }, notes: { type: 'text', max: 10 } };
    const bad = validateForm({ name: '', phone: 'xyz', email: 'bad@@email', notes: 'x'.repeat(11) }, schema, 'en');
    expect(bad.ok).toBe(false);
    expect(Object.keys(bad.errors).sort()).toEqual(['email', 'name', 'notes', 'phone']);
    expect(bad.first).toBe('name');
    const ar = validateForm({ name: 'س', phone: '1', email: '' }, schema, 'ar');
    expect(ar.errors.phone).toMatch(/رقم هاتف/);
    const good = validateForm({ name: '  Amina  ', phone: '٣٦١٢ ٣٤٥٦', email: ' a@b.com ', notes: '' }, schema, 'en');
    expect(good.ok).toBe(true);
    expect(good.clean).toEqual({ name: 'Amina', phone: '36123456', email: 'a@b.com', notes: '' });
  });
  test('honeypot', () => { expect(isBot('')).toBe(false); expect(isBot('http://spam')).toBe(true); });
});

function Demo({ onSend }) {
  const [v, setV] = useState({ name: '', email: '' });
  const [errs, setErrs] = useState({});
  const [hp, setHp] = useState('');
  const submit = (e) => {
    e.preventDefault();
    if (isBot(hp)) return;
    const r = validateForm(v, { name: { type: 'name', required: true }, email: { type: 'email', required: true } }, 'en');
    setErrs(r.errors);
    if (r.ok) onSend(r.clean);
  };
  return (
    <form noValidate onSubmit={submit}>
      <Field label="Full name" required error={errs.name} value={v.name} onChange={(e) => setV({ ...v, name: e.target.value })} />
      <Field label="E-mail" required error={errs.email} type="email" value={v.email} onChange={(e) => setV({ ...v, email: e.target.value })} />
      <Honeypot value={hp} onChange={setHp} />
      <button type="submit">Send</button>
    </form>
  );
}

describe('Field: labels, errors announced, not sent when invalid', () => {
  test('every control has a real label; errors are linked with aria-describedby and aria-invalid', () => {
    const onSend = jest.fn();
    render(<Demo onSend={onSend} />);
    const email = screen.getByLabelText(/E-mail/);
    userEvent.type(email, 'bad@@email');
    userEvent.click(screen.getByText('Send'));
    expect(onSend).not.toHaveBeenCalled();
    expect(email).toHaveAttribute('aria-invalid', 'true');
    const err = document.getElementById(email.getAttribute('aria-describedby'));
    expect(err).toHaveTextContent(/valid e-mail/i);
    expect(err).toHaveAttribute('role', 'alert');
    expect(screen.getByLabelText(/Full name/)).toHaveAttribute('aria-required', 'true');
  });
  test('valid data is sent once, honeypot blocks bots', () => {
    const onSend = jest.fn();
    render(<Demo onSend={onSend} />);
    userEvent.type(screen.getByLabelText(/Full name/), 'Amina');
    userEvent.type(screen.getByLabelText(/E-mail/), 'amina@example.com');
    userEvent.click(screen.getByText('Send'));
    expect(onSend).toHaveBeenCalledWith({ name: 'Amina', email: 'amina@example.com' });
    onSend.mockClear();
    fireEvent.change(screen.getByLabelText(/Leave this field empty/), { target: { value: 'x' } });
    userEvent.click(screen.getByText('Send'));
    expect(onSend).not.toHaveBeenCalled();
  });
});

describe('useSubmit: one request in flight, offline, failure keeps state', () => {
  function Btn({ fn, results }) {
    const s = useSubmit({ slowMs: 20, timeoutMs: 1000 });
    return <button onClick={async () => { results.push(await s.run(fn)); }} disabled={false}>go {s.busy ? 'busy' : 'idle'} {s.offline ? 'offline' : ''}</button>;
  }
  test('double click runs the request once', async () => {
    const results = []; let n = 0;
    const fn = () => new Promise((r) => { n++; setTimeout(() => r('ok'), 30); });
    render(<Btn fn={fn} results={results} />);
    const b = screen.getByRole('button');
    userEvent.click(b); userEvent.click(b); userEvent.click(b);
    await screen.findByText(/idle/);
    expect(n).toBe(1);
    expect(results.filter((r) => r.ok)).toHaveLength(1);
    expect(results.filter((r) => r.skipped)).toHaveLength(2);
  });
  test('offline: nothing is sent, state says offline', async () => {
    const results = []; const fn = jest.fn();
    Object.defineProperty(navigator, 'onLine', { value: false, configurable: true });
    render(<Btn fn={fn} results={results} />);
    userEvent.click(screen.getByRole('button'));
    await screen.findByText(/offline/);
    expect(fn).not.toHaveBeenCalled();
    Object.defineProperty(navigator, 'onLine', { value: true, configurable: true });
  });
  test('a failed request returns the error (the caller keeps the form)', async () => {
    const results = [];
    render(<Btn fn={() => Promise.reject(new Error('boom'))} results={results} />);
    userEvent.click(screen.getByRole('button'));
    await screen.findByText(/idle/);
    expect(results[0].ok).toBe(false);
    expect(results[0].error.message).toBe('boom');
  });
});
