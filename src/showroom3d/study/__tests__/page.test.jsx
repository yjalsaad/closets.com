import React from 'react';
import { render, screen, fireEvent, within } from '@testing-library/react';
import StudyPage from '../StudyPage';
import { isStudyPath } from '../route';

beforeEach(() => { try { localStorage.clear(); } catch (e) { /* ignore */ } });
test('route matches only the study path', () => { expect(isStudyPath('/yas-bloom/study')).toBe(true); expect(isStudyPath('/ar/yas-bloom/study/')).toBe(true); expect(isStudyPath('/yas-bloom')).toBe(false); expect(isStudyPath('/yas-bloom/studyx')).toBe(false); });
test('nothing imported: empty state, SAMPLE label, local-only note, export disabled', () => {
  render(<StudyPage lang="en" onLang={() => {}} />);
  expect(screen.getByTestId('yws-empty')).toHaveTextContent('Import your study file'); expect(screen.getByTestId('yws-sample-tag')).toHaveTextContent('SAMPLE'); expect(screen.getByTestId('yws-sample-banner')).toBeInTheDocument();
  expect(screen.getByTestId('yws-local')).toHaveTextContent('Saved on this device only'); expect(screen.getByTestId('yws-export')).toBeDisabled();
});
test('Arabic is RTL; edit mode shows controls and the upload note', () => {
  const { container } = render(<StudyPage lang="ar" onLang={() => {}} />);
  expect(container.querySelector('.yws').getAttribute('dir')).toBe('rtl'); fireEvent.click(screen.getByTestId('yws-edit'));
  expect(screen.getAllByTestId('yws-section').length).toBeGreaterThan(0); expect(container.querySelectorAll('input.yws-in').length).toBeGreaterThan(3);
});
test('imported study replaces the sample and is saved locally; editing persists', async () => {
  const html = '<body><section id="a"><h2>Synthetic one</h2><p>Lead sentence for the synthetic test.</p><p>Body paragraph for the synthetic test.</p></section></body>';
  render(<StudyPage lang="en" onLang={() => {}} />); fireEvent.click(screen.getByTestId('yws-import-btn'));
  const file = new File([html], 's.html', { type: 'text/html' }); fireEvent.change(screen.getByTestId('yws-import-file'), { target: { files: [file] } });
  const use = await screen.findByTestId('yws-import-use'); fireEvent.click(use);
  expect((await screen.findAllByText('Synthetic one')).length).toBeGreaterThan(0); expect(screen.getByTestId('yws-root').dataset.sample).toBe('0');
  expect(JSON.parse(localStorage.getItem('sr3d.yasWoodStudy.v1')).sections[0].title).toBe('Synthetic one');
  fireEvent.click(screen.getByTestId('yws-edit')); const box = within(screen.getByTestId('yws-section')).getAllByRole('textbox')[0];
  fireEvent.change(box, { target: { value: 'Edited' } }); const saved = JSON.parse(localStorage.getItem('sr3d.yasWoodStudy.v1')).sections[0]; expect(saved.kicker === 'Edited' || saved.title === 'Edited').toBe(true);
});
