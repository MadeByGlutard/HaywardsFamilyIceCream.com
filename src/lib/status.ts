import type { Visit } from '../../emdash-env';

type EditAttrs = Record<string, string> | undefined;

/** What the header, footer and Visit page say about today. */
export interface SiteStatus {
  /** Short status line, e.g. "Open daily, 11am to 8pm", a notice or the period's status. */
  line: string;
  /** Text for the banner strip under the navigation, if any. */
  strip?: string;
  /** Where the line came from. */
  source: 'hours' | 'notice' | 'period';
  /** Visual-editing attributes for the line and strip. */
  edit?: EditAttrs;
  stripEdit?: EditAttrs;
}

/** Status from the location entry alone: a seasonal notice wins over the opening statement. */
export function locationStatus(place: Pick<Visit, 'hours' | 'notice'>): SiteStatus {
  const notice = place.notice?.trim();
  if (notice) return { line: notice, source: 'notice' };
  return { line: place.hours, source: 'hours' };
}

/** Ends a status line with a full stop unless it already has punctuation. */
export const sentence = (text: string) => (/[.!?…\]]$/.test(text.trim()) ? text.trim() : `${text.trim()}.`);
