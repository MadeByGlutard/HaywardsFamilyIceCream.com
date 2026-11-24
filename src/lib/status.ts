type EditAttrs = Record<string, string> | undefined;

/** What the header, footer and Hours & directions page say about today. */
export interface SiteStatus {
  /** The current period's hours line. */
  line: string;
  /** Text for the banner at the top, if any. */
  strip?: string;
  /** Visual-editing attributes for the line and the banner. */
  edit?: EditAttrs;
  stripEdit?: EditAttrs;
}

/** Ends a status line with a full stop unless it already has punctuation. */
export const sentence = (text: string) => (/[.!?…\]]$/.test(text.trim()) ? text.trim() : `${text.trim()}.`);
