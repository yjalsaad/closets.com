import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { CollectionsPanel } from '../CollectionsPanel';
import { DeptMenu } from '../../ui/Menus';
import { COLLECTIONS } from '../data';
import { DEPARTMENTS } from '../../scenes/main-hall/departments';

const col = COLLECTIONS[0];
/* jsdom has no PointerEvent: a MouseEvent of the pointer type carries clientX / clientY to React's pointer handlers */
const ptr = (el, type, x, y) => fireEvent(el, new MouseEvent(type, { bubbles: true, clientX: x, clientY: y }));

describe('CollectionsPanel', () => {
  test('EN: name, eyebrow, the site description, materials, all finishes, and the two links', () => {
    const onClose = jest.fn(); render(<CollectionsPanel lang="en" onClose={onClose} />);
    const panel = screen.getByTestId('sr-collections-panel'); expect(panel).toHaveAttribute('data-collection', col.id);
    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('Collection 2023–2025'); expect(panel).toHaveTextContent('YAS Wood · Finishes');
    expect(screen.getByTestId('sr-col-desc')).toHaveTextContent(col.description.en); expect(screen.getByTestId('sr-col-materials').children).toHaveLength(3);
    expect(screen.getByTestId('sr-col-strip').querySelectorAll('button')).toHaveLength(36);
    const site = screen.getByTestId('sr-col-site'); expect(site).toHaveAttribute('href', 'https://yas-holding-website.vercel.app/collection'); expect(site).toHaveAttribute('target', '_blank'); expect(site.getAttribute('rel')).toMatch(/noopener/);
    expect(site).toHaveTextContent('See on yas-holding website');
    const quote = screen.getByTestId('sr-col-quote'); expect(quote).toHaveTextContent('Request a quote'); expect(quote.getAttribute('href')).toMatch(/^\/booking\?interest=Other&source=showroom-3d-collections/); expect(quote).toHaveAttribute('data-interest', 'Abisko Ash 30181 TX04');
    fireEvent.click(screen.getByTestId('sr-collections-close')); expect(onClose).toHaveBeenCalledTimes(1);
  });
  test('gallery: next / previous buttons, arrow keys, Home / End and the list all change the finish, and the quote follows it', () => {
    render(<CollectionsPanel lang="en" onClose={() => {}} />);
    const name = () => screen.getByTestId('sr-col-name').textContent, g = screen.getByTestId('sr-col-gallery');
    expect(name()).toBe('Abisko Ash'); fireEvent.click(screen.getByTestId('sr-col-next')); expect(name()).toBe('Agostino Oak'); expect(screen.getByTestId('sr-col-code')).toHaveTextContent('13833 TX04');
    fireEvent.click(screen.getByTestId('sr-col-prev')); fireEvent.click(screen.getByTestId('sr-col-prev')); expect(name()).toBe('Xaloc');
    fireEvent.keyDown(g, { key: 'ArrowRight' }); expect(name()).toBe('Abisko Ash'); fireEvent.keyDown(g, { key: 'End' }); expect(name()).toBe('Xaloc'); fireEvent.keyDown(g, { key: 'Home' }); fireEvent.keyDown(g, { key: 'ArrowLeft' }); expect(name()).toBe('Xaloc');
    fireEvent.click(screen.getByTestId('sr-col-strip').querySelector('[data-item="kaiser-walnut-102019-tx04"]')); expect(name()).toBe('Kaiser Walnut');
    expect(screen.getByTestId('sr-col-strip').querySelector('[aria-current="true"]')).toHaveAttribute('data-item', 'kaiser-walnut-102019-tx04');
    expect(decodeURIComponent(screen.getByTestId('sr-col-quote').getAttribute('href').replace(/\+/g, ' '))).toContain('Finish: Kaiser Walnut 102019 TX04');
  });
  test('swipe on the stage steps the gallery; a mostly vertical drag does not', () => {
    render(<CollectionsPanel lang="en" onClose={() => {}} />); const stage = screen.getByTestId('sr-col-gallery').querySelector('.sr-col-stage'), name = () => screen.getByTestId('sr-col-name').textContent;
    ptr(stage, 'pointerdown', 200, 100); ptr(stage, 'pointerup', 100, 104); expect(name()).toBe('Agostino Oak');
    ptr(stage, 'pointerdown', 200, 100); ptr(stage, 'pointerup', 150, 260); expect(name()).toBe('Agostino Oak');
  });
  test('a finish without a downloaded image shows the name + code card and says so; one with an image shows it with alt text, lazily', () => {
    render(<CollectionsPanel lang="en" onClose={() => {}} />);
    const it = col.items[0];
    if (it.image) { const img = screen.getByTestId('sr-col-hero'); expect(img).toHaveAttribute('alt', it.alt.en); expect(img).toHaveAttribute('loading', 'lazy'); }
    else { expect(screen.getByTestId('sr-col-card')).toHaveTextContent('Abisko Ash'); expect(screen.getByTestId('sr-col-noimage')).toBeInTheDocument(); expect(screen.queryByTestId('sr-col-hero')).toBeNull(); }
  });
  test('AR: Arabic name, description and labels; finish names and codes stay Latin (as on the site); arrows mirror; booking link is the /ar one', () => {
    render(<CollectionsPanel lang="ar" onClose={() => {}} />);
    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('مجموعة 2023–2025'); expect(screen.getByTestId('sr-col-desc')).toHaveTextContent(col.description.ar);
    expect(screen.getByTestId('sr-col-quote')).toHaveTextContent('اطلب عرض سعر'); expect(screen.getByTestId('sr-col-quote').getAttribute('href')).toMatch(/^\/ar\/booking\?/); expect(screen.getByTestId('sr-col-site')).toHaveTextContent('شاهدها على موقع يس القابضة');
    expect(screen.getByTestId('sr-col-name')).toHaveAttribute('dir', 'ltr'); const g = screen.getByTestId('sr-col-gallery');
    fireEvent.keyDown(g, { key: 'ArrowLeft' }); expect(screen.getByTestId('sr-col-name').textContent).toBe('Agostino Oak');
  });
  test('Escape closes it; focus starts on the heading', () => {
    const onClose = jest.fn(); render(<CollectionsPanel lang="en" onClose={onClose} />);
    expect(document.activeElement).toBe(screen.getByRole('heading', { level: 2 })); fireEvent.keyDown(screen.getByTestId('sr-collections-panel'), { key: 'Escape' }); expect(onClose).toHaveBeenCalled();
  });
});

describe('departments menu entry', () => {
  test('"Collections" is the last entry, in both languages, and picking it asks for the collections glide', () => {
    const onPick = jest.fn(); const { unmount } = render(<DeptMenu lang="en" touch={false} onPick={onPick} onClose={() => {}} />);
    const items = screen.getByTestId('sr-dept-menu').querySelectorAll('.sr-dept'); expect(items).toHaveLength(DEPARTMENTS.length + 2);
    const last = items[items.length - 1]; expect(last).toHaveAttribute('data-dept', 'collections'); expect(last).toHaveTextContent('Collections'); expect(last.querySelector('kbd')).toBeNull();
    fireEvent.click(last); expect(onPick).toHaveBeenCalledWith('collections'); unmount();
    render(<DeptMenu lang="ar" touch onPick={onPick} onClose={() => {}} />); expect(screen.getByTestId('sr-dept-menu').querySelector('[data-dept="collections"]')).toHaveTextContent('المجموعات');
  });
});
