/**
 * Bundled site photos (versioned theme assets, not CMS media). A period picks a
 * set by name in its "Site photos to use" field; crops and alt text live here.
 */
export interface Photo {
  src: string;
  width: number;
  height: number;
  alt: string;
  /** CSS object-position for cover crops. */
  position?: string;
  caption?: string;
}

export const photos = {
  stand: { src: '/images/milford-stand.jpg', width: 720, height: 480, alt: 'The white Hayward’s stand on Elm Street in Milford, with its curved roof and red sign', position: 'center 43%' },
  sundae: { src: '/images/sundae.jpg', width: 1080, height: 1350, alt: 'A Hayward’s sundae with sprinkles and a cherry in front of the Milford stand', position: 'center 59%' },
  treesStorefront: { src: '/images/trees-storefront.jpg', width: 1800, height: 1052, alt: 'The Hayward’s stand at Christmas: wreaths with red bows hang across the serving windows under the curved roof sign, with greens on red-draped tables out front', position: '50% 62%' },
  wreathWall: { src: '/images/trees-wreath-wall.jpg', width: 1800, height: 1350, alt: 'A long row of fresh balsam wreaths trimmed with red, plaid, purple and silver ribbons and ornaments', position: '60% 50%' },
  kissingBalls: { src: '/images/trees-kissing-balls.jpg', width: 1800, height: 1350, alt: 'Kissing balls with long red velvet ribbons and gold pinecones hanging above wreaths on green lattice', position: '55% 40%' },
  // Cropped from trees-wreath-closeup.jpg to remove a visible price sticker (no prices on the site).
  wreathCloseup: { src: '/images/trees-wreath-closeup-crop.jpg', width: 1160, height: 1350, alt: 'Close-up of a wreath with a red bow, red ornaments and gold-dusted pinecones', position: '78% 45%' },
} satisfies Record<string, Photo>;

/** Lead and secondary photo for the home spread, and the Visit page photo, per set. */
export const photoSets = {
  stand: { lead: photos.stand, second: photos.sundae, visit: { ...photos.stand, alt: 'The entrance and serving windows at Hayward’s Milford', position: '49% center' }, leadCaption: ['383 Elm Street', 'Your spot in Milford.'], secondCaption: 'The good part of your day.', visitCaption: 'Look for the curved roof and the red sign.' },
  trees: { lead: photos.treesStorefront, second: photos.kissingBalls, visit: photos.treesStorefront, leadCaption: ['383 Elm Street', 'Trees and wreaths at the stand.'], secondCaption: 'Kissing balls, hung by the windows.', visitCaption: 'Look for the curved roof and the wall of wreaths.' },
} as const;
export type PhotoSetName = keyof typeof photoSets;
