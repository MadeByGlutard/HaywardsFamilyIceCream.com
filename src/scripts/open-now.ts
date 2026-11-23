/**
 * Turns today's hours into "Open now until 8pm" / "Closed now. Open 11am to 8pm
 * tomorrow" on Milford's clock. Pages are cached, so this has to run in the
 * browser; without it the plain hours line stays, with no open/closed dot.
 */
const label = (time: string) => {
  const [h, m] = time.split(':').map(Number);
  return `${h % 12 || 12}${m ? `:${String(m).padStart(2, '0')}` : ''}${h < 12 ? 'am' : 'pm'}`;
};
const milford = (options: Intl.DateTimeFormatOptions, locale: string) => new Intl.DateTimeFormat(locale, { timeZone: 'America/New_York', ...options }).format(new Date());

const update = () => {
  const day = milford({ year: 'numeric', month: '2-digit', day: '2-digit' }, 'en-CA');
  const now = milford({ hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }, 'en-GB');
  for (const el of document.querySelectorAll<HTMLElement>('.opening[data-opens], .opening[data-day]')) {
    const d = el.dataset as Record<string, string | undefined> & { opens: string; closes: string };
    const range = (opens: string, closes: string) => `${label(opens)} to ${label(closes)}`;
    let state: string | undefined;
    let lines: string[];
    if (!d.opens && (!d.day || d.day === day)) continue; // a closure, still true today
    if (d.day && d.day !== day) lines = ['Call for today’s hours']; // an old tab or a stale copy
    else if (now >= d.opens && now < d.closes) [state, lines] = ['open', [`Open now until ${label(d.closes)}`]];
    else if (now < d.opens) [state, lines] = ['closed', ['Closed now.', `Open ${range(d.opens, d.closes)} today`]];
    else if (d.late && now < d.late) lines = [`Open to ${label(d.closes)}, later in summer.`, 'Call to check'];
    else if (d.nextOpens && d.nextCloses) [state, lines] = ['closed', ['Closed now.', `Open ${range(d.nextOpens, d.nextCloses)} tomorrow`]];
    else [state, lines] = ['closed', d.nextStarts ? ['Closed now.', `${d.nextStarts} from tomorrow`] : ['Closed for today']];
    if (state) el.dataset.state = state;
    else delete el.dataset.state;
    el.querySelector('.status-text')?.replaceChildren(...lines.flatMap((line, i) => {
      const span = document.createElement('span');
      span.className = 'sentence';
      span.textContent = line;
      return i ? [' ', span] : [span];
    }));
  }
};
update();
setInterval(update, 60_000);
addEventListener('pageshow', update);
document.addEventListener('visibilitychange', update);
