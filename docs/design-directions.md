# Design directions

> **Now (Nov 23):** one design, Newspaper, in one stylesheet. Prototype A and the `data-direction` switch were removed, and the branch was squashed, so they aren't in its history; the original mock is `.handoff/site-prototype`. Everything below is the record of how it got here.

## Independent review and rebuild (Nov 23)

Two fresh reviewers scored the five-round design **6.5** (visual craft) and **6.8** (phone use and accessibility), well below the scores of 8.5 to 9 recorded further down. What they found that five rounds of judging screenshots had missed:
- Fraunces was loaded without its optical-size axis, so every large headline was the wrong cut; headings used 15 sizes; sections didn't share a grid; appended "round" overrides had caused several bugs.
- Searching "vegan" or "no sugar" found nothing, the Trees link had no accessible name, a green dot showed after closing, and an unattended closure would have read "Closed until the new year" in July.

The rebuild replaced the stylesheet (2,635 lines to about 1,480) and fixed the function. Fresh reviewers (not the two above) then scored the rebuild:

| Reviewer | Rebuild | After fixes | Final |
| --- | --- | --- | --- |
| Visual craft | 8.2 | 8.7 | 9.0, "nothing blocks 9" |
| Phone use and accessibility | 8.2 | 8.8 | 9.1, "no blockers left" |

Codex (gpt-6.1-sol) and Copilot (claude-opus-5.5) then scored it cold, and again after fixes with only their own earlier review to check against:

| Judge | Cold | After fixes |
| --- | --- | --- |
| Codex | 8.8 | 9.1 |
| Copilot | 8.0 | 9.0 |

The Claude reviewers' 9.0 and 9.1 are from just before those fixes: one phone utility bar, an even category grid, unrepeated closed-day calls to action, a wreath photo in the Trees list, captions and drop cap. Not taken: sideways-scrolling category tabs (they hid "No sugar added") and tree-lot photos in winter.

Open nits: the 820 status line takes two lines, the second home photo is narrow on phones, Thanksgiving's phone headline repeats its banner, "Thanksgiving closure" wraps in the 820 schedule, and the Trees photo ends above its list at 1024. Not tested on a real iPhone or with VoiceOver/TalkBack.

Checks: 13 tests, typecheck, production build, no axe violations on 5 pages x 4 periods, no overflow at nine widths from 320 to 1440.

## Names

- **Newspaper**: the site's design and the public default. It's round 1 of the newspaper design, plus the parts of prototype A that were kept (solid notice strip at the top, real italics, italic hero dateline).
- **Newspaper v1 / round 1**: the design `emdash-redesign` started with (Fraunces + DM Sans, cream paper). It's now folded into Newspaper and is no longer a separate option.
- **v2 prototype**: the clickable mock from an earlier chat (`.handoff/site-prototype`). It had two looks:
  - **A "Front page"**: kept as a preview-only comparison (`?direction=a`, `/design-preview`).
  - **C "Window notice"**: dropped on Nov 22.

Branch `dev/redesign-explore-2111a6` (cut from `emdash-redesign`), Nov 22, 2026.
Compare them live at `/design-preview` (dev server or signed-in staff), or on any page with `?direction=a`. Direction C (Window notice) was dropped on Nov 22.

## Where the branch stood against the v2 prototype

| | Branch (v1) | Prototype A · Front page | Prototype C · Window notice |
| --- | --- | --- | --- |
| Type | Fraunces (soft, wonky) + DM Sans | Newsreader 800 + Public Sans | Archivo Black + Archivo, Caveat hand line |
| Paper | Cream `#fffdf8` | Warm `#fbf8f1` | Grey `#eeefec` |
| Notice | Shaded box with accent edge | Solid accent strip | Solid accent strip |
| Home hero | Centred headline | Dateline over a heavy accent rule, huge left-set headline | Headline on a white card taped in the window |
| Status line | Text only | Green/grey dot + text | Same as A |
| Phone nav | All items inline under the logo | "Menu" button with a drawer | Same as A |
| Menu page | Category list in the sidebar; 2-up list on phones | Sticky tabs: Ice cream, Sizes & cones, Sundaes & drinks, Food | Same as A |

## What changed on this branch

- **Directions as token sets.** `src/styles/directions.css` holds A and C. The markup and content are the same for every direction. `DEFAULT_DIRECTION` in `src/lib/direction.ts` decides what the public sees (still `v1`).
- **Status dot.** The new optional period field *Open or closed* adds a dot. Empty shows no dot. A Visit notice also hides it.
- **Period copy.** New optional period fields cover the colour band headline, its button text and link, and the Visit intro. They're filled in for Thanksgiving, the tree lot and winter; empty falls back to today's copy.
- **Captions.** Each caption now sits under its own photo, kicker first, and no longer runs into the next one.
- **Our story gutter.** The article spans the photo's width and the margin note sticks while you read.
- **Long phone menu.** Category links become a sticky, scrolling tab strip, and the current section is highlighted.

Schema changes are additive only: five optional fields on `periods`. On a deployed database, add them in the admin to match `seed/seed.json`.

## Decisions needed

1. **Direction: v1, A or C.** Recommendation: **A**. It keeps the newspaper identity v1 already has, and the serif reads warmer for a family stand. C is the loudest on a closure day, but Archivo Black is heavy for body headings, and its `&` looks like an `8` in the nav ("Trees & wreaths"). A middle option: A everywhere, with C's taped card used only for the closed-period hero.
2. **Phone navigation.** Keep the inline links (they fit at 390 px with 5 items, including Trees & wreaths) or switch to the prototype's Menu button and drawer. The drawer is needed once Gift cards becomes a sixth item.
3. **Period copy wording.** Approve the new band and Visit lines (seed): Thanksgiving "Trees and wreaths arrive Friday.", tree lot "Bring home a tree from Elm Street.", winter "See you in the spring." with a link to Facebook.
4. **Copy that is still the same in every period:** the Visit hours note "Please call for closing time and seasonal hours." (it shows in winter too), "A seat. A scoop. A little time." on Visit, and the home eyebrow "Homemade ice cream · Family owned" (A uses it as the dateline; the prototype uses "Milford, New Hampshire · date" instead).
5. **"Sizes & prices" on the menu.** The menu still renders a `servings` price column whenever staff add a serving. That conflicts with the no-prices rule. Options: drop the price column, or wait for Square.
6. **Prototype menu sections** (Sizes & cones, Sundaes & drinks, Food). These need a `menu_items` collection and confirmed items, from Square or the owner, before they're built. No prices.
7. **Owner facts** (unchanged): tree-lot closing time, winter reopening date, ice cream season start.

## Review: newspaper v1 vs A (Nov 22, after dropping C)

| Element | v1 | A | Merge |
| --- | --- | --- | --- |
| Masthead tagline | Meant to be italic, renders upright: the Fraunces italic file was never loaded and `font-synthesis: none` blocks a fake italic | True Newsreader italic | Take the italic. Load Fraunces italic (one serif) or use Newsreader for italics only |
| Seasonal banner | Shaded box with an accent edge, under the nav | Solid accent strip, same place | Take A's solid strip and move it full width above the masthead, as in the prototype. Today it sits under the nav because v1 copied the live site, where the grey banner sits under the blue header. On phones the news then shows up a third of the way down the screen |
| Status line | Dot + text | Same | Already shared |
| Home hero | Centred, red sans eyebrow, Fraunces 66px | Italic dateline over a 6px accent rule, Newsreader 800 at 88px, left-set | Keep v1's centred hero and size. A's tracking (-0.04em) jams letters ("Fridaywith"); on a phone the headline runs 4 lines and pushes the photo off screen. Optionally take the italic dateline in place of the red eyebrow. Under a solid strip, A's thick rule doubles up the colour bar |
| Headings | Fraunces 650 | Newsreader 750 | Keep Fraunces: warmer, more Hayward's |
| Flavor list | Fraunces, reads as a menu board | Newsreader, thinner and harder to scan | Keep v1 |
| Body text | DM Sans | Public Sans: sturdier and more legible in long story text, but wider, so lines wrap sooner | Your call; low impact |
| Paper | `#fffdf8` | `#fbf8f1`, slightly warmer | Barely visible; either |
| Columns, band, footer, Visit, Trees | Same layout | Font swap only | No difference beyond type |

Also seen in both:
- On a closed day the hero button still says "Browse the menu"; the prototype says "See what's coming to the lot".
- The status line and the banner repeat each other on closure days.

## Merged design review (Nov 22, Newspaper as the default)

Screens checked at 390, 820 and 1440 px in all four schedule periods, plus Menu, Our story, Visit and Trees.

Works:
- The solid strip at the top puts the news first. On a phone it's the first thing you read, above the logo, and it turns green for the tree lot.
- The italic tagline and the italic hero dateline give the masthead a newspaper voice without changing the headings.
- On closed days the hero button now leads somewhere useful (the tree lot at Thanksgiving, the menu in winter), and the Thanksgiving band points to Visit instead of repeating it.

Fixed (Nov 22): items 1–3 below. On phones, the status line under the menu is hidden while a closure strip is showing (it stays during the tree lot, where it carries the hours). /trees drops the strip while the lot is open, and its label and intro no longer repeat each other. The Trees sections get sticky tabs shared with the Menu (`src/scripts/section-tabs.ts`).

Still to decide or fix (1–3 now done):
1. **The closure message repeats.** On Thanksgiving it shows in the strip, the nav status line, the third home column and the footer, so on a phone it appears three times before the photo. Options: hide the nav status line on phones while a strip is showing, or keep the strip short ("Closed through Thanksgiving") and let the hero carry the detail.
2. **The Trees page repeats itself.** The strip, the page label and the intro all say "on the lot at the stand, Thanksgiving to Christmas". Shorten the tree-lot strip, or drop the page label.
3. **Trees page section links** (Christmas trees, Wreaths, Kissing balls, Extras) should get the same sticky tabs as the Menu, for consistency.
4. **Inner page labels** are still small red caps ("COME ON OVER"), while the home page now uses the italic dateline. That's fine as a front-page/inside-page distinction; switch them too if you'd rather have one style.
5. **Fraunces italic** has a playful, slightly wonky shape. If you liked prototype A's calmer italic, Newsreader can be used for italics only.

## Design critique and accessibility review (Nov 22, design-critique + accessibility-review skills)

Every page (home in all four schedule periods, Menu, Our story, Visit, Trees, 404) was checked at 390, 820 and 1440 px. An automated pass checked contrast, text size, tap targets, alt text and sideways scroll, plus keyboard tab order, focus visibility, landmarks, form labels and 200% zoom.

**Already fine:** colour contrast on all text (body 7:1+), alt text on every image, one h1 per page, skip link, visible focus everywhere, labelled search, landmarks, no reflow problems at 200% zoom.

**Found and fixed**

| # | Finding | Fix |
| --- | --- | --- |
| 1 | Template-style all-caps red labels everywhere (9–11px) | Italic Newsreader kickers in sentence case, 17px (matches the tagline). The masthead place line is plain 13px text |
| 2 | Text below 12px: phone nav 10px, captions 10–11px, counts 10px, phone hero intro 13px | Floor of 12px everywhere. Captions 13px, phone nav 12px (wraps to two rows instead of shrinking), hero intro 18px desktop / 16px phone |
| 3 | Text-link tap targets 16–18px tall (WCAG 2.5.8 asks for 24px) | Text links are 32px tall on desktop and 44px on phones; footer, masthead, email and sources links enlarged too. A link inside a sentence ("Call the stand") is exempt |
| 4 | Arrow icons inside text links were underlined separately | Arrows removed from text links (buttons keep theirs). The underline is a quiet rule colour and darkens on hover |
| 5 | Colour band: label stranded on the left, headline in the middle, button on the right | Label removed; headline on the left, button on the right |
| 6 | Trees page scrolled sideways on phones (402px in 390) | Phone grid column can shrink (`minmax(0,1fr)`) |
| 7 | Headlines left single-word last lines ("A little / time.") | `text-wrap: balance` on all headings |
| 8 | "Looking for something?" label repeated the search placeholder | Kept for screen readers only ("Search flavors") |
| 9 | "Schedule periods at the stand" filler label on Visit | Removed |
| 10 | All-caps schedule dates ("[DATE TO CONFIRM]") | Sentence case, 14px |
| 11 | Period strip not announced as a notice | `<aside aria-label="Notice">` |
| 12 | Tab strip scrolled smoothly even with reduced motion on | Respects `prefers-reduced-motion` |

Not fixed (content or owner): `[closing time]` and `[date to confirm]` placeholders, and the soft 720px building photo on Our story.

## Three-judge review (Nov 22–23): Claude, Codex (gpt-6.1-sol), Copilot (claude-opus-5.5)

All three judges got the same brief and screenshots of every page at 390, 820 and 1440 px in each schedule period, and scored independently and read-only. After each round, fixes covered every issue that two judges raised, plus clear single-judge bugs.

| Judge | R1 | R2 | R3 | R4 | R5 |
| --- | --- | --- | --- | --- | --- |
| Claude | 7 | 8 | 8.5 | 9 | 9 |
| Codex | 7.5 | 8 | 8.5 | 8.8 | 9.0 |
| Copilot | 7 | 8 | 8.5 | 8.5 | 8.5 |

After round 5 these were fixed but not re-judged:
- Copilot's top items: the phone footer status wrapping (two phone rules conflicted), uneven Visit spacing on phones, the footer link gap, the dangling "·" before `[date to confirm]`, the Story sources width, and the allergy note size.

Open, and needing owner content rather than code:
- the soft 720px building photo, which is also reused on Home and Story;
- more photos for the Trees gallery and the Visit page;
- next year's reopening date.

Where the judges disagreed:
- On phones, Codex wanted practical information first and Copilot wanted the stand photo first. Visit now shows address and directions, then the photo, then hours. Trees shows a compact photo under the heading, then the list.
