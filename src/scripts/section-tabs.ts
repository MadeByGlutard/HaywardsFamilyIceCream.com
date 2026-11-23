/**
 * Section tabs (Menu categories, Trees sections): highlights the tab for the
 * section being read and, when the tabs are a scrolling strip (phones), keeps
 * that tab in view. Any <nav data-section-tabs> whose links point at #ids on
 * the page works. Hidden sections (e.g. filtered out by the flavor search)
 * are skipped; an `input` anywhere re-checks.
 */
for (const nav of document.querySelectorAll<HTMLElement>('[data-section-tabs]')) {
  const tabs = [...nav.querySelectorAll<HTMLAnchorElement>('a[href^="#"]')];
  const sections = tabs
    .map((tab) => document.getElementById(decodeURIComponent(tab.hash.slice(1))))
    .filter((el): el is HTMLElement => !!el);

  // A tapped tab stays current (even if its section can't reach the top at the
  // end of the page) until the reader scrolls by hand.
  let pinned: string | undefined;
  for (const tab of tabs) tab.addEventListener('click', () => { pinned = tab.hash.slice(1); });
  for (const type of ['wheel', 'touchstart', 'keydown'] as const) addEventListener(type, () => { pinned = undefined; }, { passive: true });

  const update = () => {
    const sticky = getComputedStyle(nav).position === 'sticky';
    // A section is current once its heading is in the top third of the screen,
    // so short sections at the end of the page can still become current.
    const offset = Math.max((sticky ? nav.offsetHeight : 0) + 80, innerHeight * 0.35);
    const visible = sections.filter((s) => !s.hidden);
    let current = visible[0]?.id;
    for (const s of visible) if (s.getBoundingClientRect().top - offset <= 0) current = s.id;
    const pin = pinned ? visible.find((s) => s.id === pinned) : undefined;
    if (pin) {
      const box = pin.getBoundingClientRect();
      if (box.top < innerHeight && box.bottom > 0) current = pin.id;
    }
    for (const tab of tabs) {
      const on = tab.hash === `#${current}`;
      if (on && tab.getAttribute('aria-current') !== 'true') {
        tab.setAttribute('aria-current', 'true');
        if (nav.scrollWidth > nav.clientWidth) nav.scrollTo({ left: tab.offsetLeft - 18, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
      } else if (!on) tab.removeAttribute('aria-current');
    }
  };

  let queued = false;
  addEventListener('scroll', () => {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => { queued = false; update(); });
  }, { passive: true });
  document.addEventListener('input', update);
  update();
}
