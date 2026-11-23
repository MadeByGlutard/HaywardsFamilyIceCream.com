/** The Menu button opens the page list as a modal dialog (phones and tablets). */
export {};
const sheet = document.querySelector<HTMLDialogElement>('#site-menu');
const button = document.querySelector<HTMLAnchorElement>('.masthead .menu-button');
if (sheet && button && typeof sheet.showModal === 'function') {
  button.setAttribute('role', 'button');
  // Close sits where Menu was, below any notice bar.
  const place = () => {
    const top = Math.max(0, button.closest('.site-header')!.getBoundingClientRect().top);
    sheet.style.setProperty('--top', `${top}px`);
    sheet.style.setProperty('--inset', `${Math.max(0, button.getBoundingClientRect().top - top)}px`);
  };
  const open = (event: Event) => {
    event.preventDefault();
    place();
    sheet.showModal();
  };
  button.addEventListener('click', open);
  button.addEventListener('keydown', (event) => { if (event.key === ' ') open(event); });
  // Close button, a link, or a tap outside the panel.
  sheet.addEventListener('click', (event) => {
    const target = event.target as Element;
    if (target === sheet || target.closest('[data-close], a')) sheet.close();
  });
  addEventListener('resize', () => { if (sheet.open) place(); });
  // A tablet turned sideways gets the full row instead.
  matchMedia('(min-width: 1001px)').addEventListener('change', () => sheet.close());
}
