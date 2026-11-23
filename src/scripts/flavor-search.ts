/** Menu search: matches every word against flavor, description and category. */
export {};
const input = document.querySelector<HTMLInputElement>('#flavor-search');
const rows = [...document.querySelectorAll<HTMLElement>('[data-flavor]')];
const groups = [...document.querySelectorAll<HTMLElement>('[data-category]')];
const status = document.querySelector<HTMLElement>('#search-status');
const none = document.querySelector<HTMLElement>('.no-results');
const layout = document.querySelector<HTMLElement>('.menu-layout');

// Curly quotes, hyphens and accents shouldn't matter: "s’mores", "milky way".
const plain = (text: string) => text.toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/['’]/g, '').replace(/[^a-z0-9&]+/g, ' ').trim();
// Plurals meet in the middle: cookie/cookies, strawberry/strawberries, chip/chips.
const fold = (word: string) => (word.length < 4 ? word : word.replace(/(ies|ie|y)$/, 'i').replace(/([^s])s$/, '$1'));
const wordsOf = (text: string) => plain(text).split(/[ &]+/).filter((word) => word && word !== 'and').map(fold);
const squash = (text: string) => plain(text).replace(/\band\b/g, '').replace(/[ &]+/g, '').replace(/s$/, '');
const index = rows.map((row) => wordsOf(row.dataset.flavor ?? ''));
const names = rows.map((row) => squash(row.dataset.name ?? ''));
// One typo in a longer word: "vanila", "rasberry", "sherbert".
const near = (a: string, b: string) => {
  if (a.length < 5 || Math.abs(a.length - b.length) > 1) return false;
  let i = 0;
  while (i < a.length && a[i] === b[i]) i++;
  let j = 0;
  while (j < Math.min(a.length, b.length) - i && a[a.length - 1 - j] === b[b.length - 1 - j]) j++;
  return Math.max(a.length, b.length) - i - j <= 1;
};
/** Rows for a query: the exact name first ("mms"), else every word, else every word with a typo. */
const find = (query: string) => {
  const words = wordsOf(query);
  const exact = names.map((name) => !!name && name === squash(query));
  if (exact.includes(true) && words.every((word) => word.length < 3)) return exact;
  const start = index.map((row) => words.every((word) => row.some((w) => w.startsWith(word))));
  if (start.includes(true)) return start;
  if (exact.includes(true)) return exact;
  const inside = index.map((row) => words.every((word) => word.length > 2 && row.some((w) => w.includes(word))));
  if (inside.includes(true)) return inside;
  const typo = index.map((row) => words.every((word) => row.some((w) => w.startsWith(word) || near(word, w))));
  return typo.includes(true) ? typo : names.map((name) => near(squash(query), name)); // "milkyway"
};
const total = new Map(groups.map((group) => [group, group.querySelector('.flavor-count')?.textContent ?? '']));

const search = () => {
  const words = plain(input!.value);
  const hits = words ? find(input!.value) : [];
  let count = 0;
  rows.forEach((row, i) => {
    row.hidden = !!words && !hits[i];
    if (!row.hidden && !('uncounted' in row.dataset)) count++;
  });
  let shown = 0;
  for (const group of groups) {
    const visible = [...group.querySelectorAll<HTMLElement>('[data-flavor]')].filter((row) => !row.hidden);
    group.hidden = !!words && visible.length === 0;
    if (!group.hidden) shown++;
    const label = group.querySelector('.flavor-count');
    if (label && !group.querySelector('[data-uncounted]')) label.textContent = words ? `${visible.length} ${visible.length === 1 ? 'flavor' : 'flavors'}` : total.get(group)!;
  }
  layout?.toggleAttribute('data-searching', !!words);
  // A list of matches is not an allergen list: keep the note above the results.
  layout?.toggleAttribute('data-allergy', /\b(nuts?|peanuts?|tree nut|almonds?|walnuts?|pecans?|pistachios?|coconut|dairy|milk|lactose|gluten|wheat|eggs?|soy|allerg\w*)\b/.test(words));
  none!.hidden = shown > 0;
  status!.textContent = !words ? '' : count ? `${count} ${count === 1 ? 'match' : 'matches'}` : shown ? 'Ask at the window' : 'No matches';
};
input?.addEventListener('input', search);
document.querySelectorAll('.category-nav a, .no-results a[href^="#"]').forEach((link) => link.addEventListener('click', () => {
  if (input?.value) { input.value = ''; search(); }
}));
