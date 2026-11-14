/* "Management meeting" / "اجتماع الإدارة": the PRIMARY section of the VIP room. PURE data + agenda logic (no DOM).
 * The agenda: the owner's two real company films first, then the meeting material (the two company-profile decks and the company presentation), and the AI-generated
 * documentary LAST, clearly labelled. Nothing advances by itself: a film with sound starts on a user action, and "Next agenda item" moves on.
 * Film titles describe what the films show (Arabic awaits native review). */
import { FILM_TITLE, FILM_AI_LABEL } from './film';

const T = (en, ar) => ({ en, ar });
export const MEETING_DECK_ID = 'meeting';
export const MEETING_TITLE = T('Management meeting', 'اجتماع الإدارة');
export const REAL_FILMS = [
  { id: 'yas-story', title: T('YAS: our story', 'YAS: حكايتنا'), lead: T('From Bahrain to the world of wood: the YAS film.', 'من البحرين إلى عالم الأخشاب: فيلم YAS.') },
  { id: 'closets-story', title: T('The Closets: our story', 'ذا كلوزتس: حكايتنا'), lead: T('Inside the factory, the offices and the showroom.', 'داخل المصنع والمكاتب وصالة العرض.') },
];
/** the meeting as a deck: the agenda title card, then one slide per real film (so Previous / Next, the keys and the picker work as for any deck) */
export const MEETING_DECK = {
  id: MEETING_DECK_ID, unit: 'slide', builtin: true, meeting: true, title: MEETING_TITLE,
  slides: [
    { id: 'agenda', builtin: 'meeting', disclaimer: true, title: MEETING_TITLE, lead: T('Agenda', 'جدول الأعمال') },
    ...REAL_FILMS.map((f) => ({ id: f.id, builtin: 'film', filmId: f.id, disclaimer: true, title: f.title, lead: f.lead })),
  ],
};
/** agenda items in order. kind 'film' (a slide of the meeting deck, or the AI film entry) or 'deck' */
export const AGENDA = [
  { id: 'yas-story', kind: 'film', deck: MEETING_DECK_ID, slide: 1, title: REAL_FILMS[0].title, real: true },
  { id: 'closets-story', kind: 'film', deck: MEETING_DECK_ID, slide: 2, title: REAL_FILMS[1].title, real: true },
  { id: 'closets-profile', kind: 'deck', deck: 'closets-profile', slide: 0, title: T('The Closets: Company Profile', 'ذا كلوزتس: ملف الشركة') },
  { id: 'yas-profile', kind: 'deck', deck: 'yas-profile', slide: 0, title: T('YAS Profile (2023)', 'ملف YAS (2023)') },
  { id: 'default', kind: 'deck', deck: 'default', slide: 0, title: T('Company presentation', 'عرض الشركة') },
  { id: 'journey', kind: 'film', deck: 'film', slide: 0, title: FILM_TITLE, real: false, label: FILM_AI_LABEL },
];
export const KIND_LABEL = { film: T('Film', 'فيلم'), deck: T('Presentation', 'عرض') };
/** which agenda item the room is on (-1: the agenda card itself or something outside the agenda, e.g. a saved deck) */
export function agendaIndex(deckId, slide = 0) {
  if (deckId === MEETING_DECK_ID) return slide >= 1 && slide <= REAL_FILMS.length ? slide - 1 : -1;
  return AGENDA.findIndex((a) => a.deck === deckId && a.deck !== MEETING_DECK_ID);
}
/** the item after `i` (from the agenda card: the first item), or null at the end */
export const nextAgendaItem = (i) => (Number.isInteger(i) && i + 1 >= 0 && i + 1 < AGENDA.length ? AGENDA[i + 1] : null);
export const firstAgendaItem = () => AGENDA[0];
