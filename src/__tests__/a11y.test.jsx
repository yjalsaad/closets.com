import { useRef, useState } from 'react';
import { render, screen, act, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SkipLink, RouteAnnouncer } from '../a11y/RouteA11y';
import { ModalPanel, getFocusable } from '../a11y/dialog';

describe('skip link + main landmark', () => {
  test('skip link is the first tab stop and moves focus to <main id="main">', () => {
    render(<><SkipLink lang="en" /><button>first nav item</button><main id="main"><h1>Page</h1></main></>);
    userEvent.tab();
    const link = screen.getByRole('link', { name: /skip to main content/i });
    expect(link).toHaveFocus();
    userEvent.click(link);
    expect(document.getElementById('main')).toHaveFocus();
  });
  test('skip link is localised', () => {
    render(<SkipLink lang="ar" />);
    expect(screen.getByRole('link')).toHaveTextContent('تخطَّ');
  });
  test('route change: focus moves to the page heading and the title is announced politely', () => {
    jest.useFakeTimers();
    document.title = 'Home';
    const { rerender } = render(<><RouteAnnouncer pathname="/" lang="en" /><main id="main"><h1>Heading</h1></main></>);
    document.title = 'Booking — The Closets Co.';
    rerender(<><RouteAnnouncer pathname="/booking" lang="en" /><main id="main"><h1>Heading</h1></main></>);
    act(() => { jest.advanceTimersByTime(300); });
    expect(screen.getByRole('heading', { name: 'Heading' })).toHaveFocus();
    expect(screen.getByTestId('route-announcer')).toHaveTextContent('Booking — The Closets Co.');
    expect(screen.getByTestId('route-announcer')).toHaveAttribute('aria-live', 'polite');
    jest.useRealTimers();
  });
  test('language change is announced', () => {
    const { rerender } = render(<RouteAnnouncer pathname="/" lang="en" />);
    rerender(<RouteAnnouncer pathname="/" lang="ar" />);
    expect(screen.getByTestId('route-announcer')).toHaveTextContent('العربية');
  });
});

function Harness({ onClose = () => {} }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  return (
    <div>
      <button onClick={() => setOpen(true)}>open dialog</button>
      <a href="#x">outside link</a>
      {open && (
        <ModalPanel label="Test dialog" onClose={() => { onClose(); setOpen(false); }}>
          <button>first</button>
          <input aria-label="field" ref={ref} />
          <button>last</button>
        </ModalPanel>
      )}
    </div>
  );
}

describe('modal: focus trap, Esc, focus return, scroll lock', () => {
  test('role=dialog aria-modal, focus moves inside, Tab/Shift+Tab are trapped', async () => {
    render(<Harness />);
    const trigger = screen.getByText('open dialog');
    trigger.focus();
    userEvent.click(trigger);
    const dlg = await screen.findByRole('dialog', { name: 'Test dialog' });
    expect(dlg).toHaveAttribute('aria-modal', 'true');
    await act(async () => { await new Promise((r) => setTimeout(r, 10)); });
    expect(dlg.contains(document.activeElement)).toBe(true);
    const focusables = getFocusable(dlg);
    expect(focusables.map((e) => e.textContent || e.getAttribute('aria-label'))).toEqual(['first', 'field', 'last']);
    screen.getByText('last').focus();
    userEvent.tab();                          // wraps to first
    expect(screen.getByText('first')).toHaveFocus();
    userEvent.tab({ shift: true });           // wraps back to last
    expect(screen.getByText('last')).toHaveFocus();
    expect(screen.getByText('outside link')).not.toHaveFocus();
  });
  test('focus that escapes is pulled back; body scroll is locked then restored', async () => {
    render(<Harness />);
    document.body.style.overflow = '';
    screen.getByText('open dialog').focus();
    userEvent.click(screen.getByText('open dialog'));
    const dlg = await screen.findByRole('dialog');
    expect(document.body.style.overflow).toBe('hidden');
    await act(async () => { screen.getByText('outside link').focus(); await new Promise((r) => setTimeout(r, 10)); });
    expect(dlg.contains(document.activeElement)).toBe(true);
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(document.body.style.overflow).toBe('');
  });
  test('Escape closes and focus returns to the trigger', async () => {
    const onClose = jest.fn();
    render(<Harness onClose={onClose} />);
    const trigger = screen.getByText('open dialog');
    trigger.focus();
    userEvent.click(trigger);
    await screen.findByRole('dialog');
    await act(async () => { await new Promise((r) => setTimeout(r, 10)); });
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(trigger).toHaveFocus();
  });
  test('only the topmost of two dialogs reacts to Escape', async () => {
    const a = jest.fn(); const b = jest.fn();
    render(<><ModalPanel label="A" onClose={a}><button>a1</button></ModalPanel><ModalPanel label="B" onClose={b}><button>b1</button></ModalPanel></>);
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(b).toHaveBeenCalledTimes(1); expect(a).not.toHaveBeenCalled();
  });
  test('a dialog without an explicit name is named after its first heading', () => {
    render(<ModalPanel onClose={() => {}}><h2>Request a quote</h2><button>x</button></ModalPanel>);
    expect(screen.getByRole('dialog', { name: 'Request a quote' })).toBeInTheDocument();
  });
});
