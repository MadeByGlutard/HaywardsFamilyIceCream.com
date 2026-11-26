# Image provenance

No generated photography is used in the implemented website.

| File | Source | Use |
| --- | --- | --- |
| `public/brand/logo.svg`, `logo.png`, `icon.png` | Existing website repository | Authentic Milford branding |
| `public/images/sundae.jpg` | Existing repository, gallery image 02 | Home product photo |
| `public/images/scoops-caramel.jpg` | Existing repository, gallery image 06 | Home photo |
| `public/images/two-cups.jpg` | Existing repository, gallery image 07 | Flavors photo |
| `public/images/two-scoops.jpg` | Existing repository, gallery image 03 | Sundaes & frappes photo |
| `public/images/milford-stand.jpg` | BringFido's Milford listing, credited there to `@Haywardsofmilford` | Hours and History only |

Building reference: https://photos.bringfido.com/restaurants/2/7/7/93772/93772_350010.jpg?density=2x&size=tile

The building source is 720 × 480. It works as a concept reference but is visibly softer when enlarged. Obtain the owner's original, confirm usage, and replace this file before production. The source credits the business; that attribution alone does not establish a reproduction license. The archival postcard is linked as evidence only, not reproduced.

## Favicons and manifest

`public/favicon.ico`, `public/apple-touch-icon.png`, `public/brand/icons/*` and `public/site.webmanifest` are generated from `public/brand/icon.png` (64 × 92), padded to square on the paper colour. The 512 px sizes are upscaled and slightly soft; replace them if the owner supplies a vector or high-resolution cone mark. The old Gatsby build output (`*.LICENSE.txt`, webpack stats, `_redirects`, `icons/`) was removed; `tests/public-assets.test.mjs` fails if `public/index.html` or `public/*.js` reappears.

## Tree-lot photos (owner, November 2026)

| File | Use |
| --- | --- |
| `public/images/trees-storefront.jpg` (1800 × 1052) | Tree-lot home hero, Visit photo and `/trees` lead. Crops in `theme.css` keep the curved roof sign in frame (`.photo-set-trees`). |
| `public/images/trees-wreath-wall.jpg` | `/trees` photo row |
| `public/images/trees-kissing-balls.jpg` | `/trees` photo row; tree-lot home secondary photo |
| `public/images/trees-wreath-closeup.jpg` | Original only, not linked: it shows a readable price sticker. |
| `public/images/trees-wreath-closeup-crop.jpg` (1160 × 1350) | Derived crop of the above without the price sticker; `/trees` photo row. |

Photo sets, alt text and captions are defined in `src/lib/photos.ts`.

Flavors in the scoop photos are not identified anywhere, so captions and alt text describe what is visible. Each photo has an 800px copy (`-800.jpg`) for phones.
