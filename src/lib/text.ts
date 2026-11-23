const escape = (value: string) => value.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

/**
 * Escapes editor text and highlights bracketed placeholders such as
 * "[closing time]" so unconfirmed facts are visibly marked, never passed off
 * as real. Use with `set:html`.
 */
export const withPlaceholders = (value: string | undefined | null) =>
  escape(value ?? '').replace(/\[([^\]\n]{1,60})\]/g, '<mark class="placeholder" title="To be confirmed">[$1]</mark>');

/** Status lines: each sentence stays together when the line wraps, and "at 11am" never splits. */
export const withSentences = (value: string | undefined | null) =>
  withPlaceholders(value).replace(/ at (\d)/g, ' at\u00a0$1').split(/(?<=[.!?]) /).map((part) => `<span class="sentence">${part}</span>`).join(' ');
