/* re-exports + the topic index of the fact sheet (kept separate so the engine imports one small module) */
export { FACT_SHEET, TOPICS, TOPIC_TITLE, CONFIRMED, PENDING, UNCONFIRMED, NOT_UNDERSTOOD, INFO_LINE, factById, FACTSHEET_VERSION } from './factsheet';
import { FACT_SHEET, TOPICS } from './factsheet';
export const FACTS_BY_TOPIC = Object.fromEntries(TOPICS.map((t) => [t, FACT_SHEET.filter((f) => f.topic === t)]));
