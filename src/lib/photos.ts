/**
 * Bundled site photos (versioned theme assets, not CMS media). The schedule
 * picks the set (the tree lot's while it is open or next); crops and alt text live here.
 */
export interface Photo {
  src: string;
  width: number;
  height: number;
  alt: string;
  /** Smaller copy for phones and thumbnails. */
  srcset?: string;
  /** CSS object-position for cover crops. */
  position?: string;
  caption?: string;
}

export const photos = {
  stand: { src: '/images/milford-stand.jpg', width: 720, height: 480, alt: 'The white Hayward’s stand on Elm Street in Milford, with its curved roof and red sign', position: 'center 43%' },
  sundae: { src: '/images/sundae.jpg', srcset: '/images/sundae-800.jpg 800w, /images/sundae.jpg 1080w', width: 1080, height: 1350, alt: 'A Hayward’s sundae with sprinkles and a cherry in front of the Milford stand', position: 'center 82%' },
  caramel: { src: '/images/scoops-caramel.jpg', srcset: '/images/scoops-caramel-800.jpg 800w, /images/scoops-caramel.jpg 1400w', width: 1400, height: 1243, alt: 'Pale scoops with caramel-colored ribbons in a blue Hayward’s cup', position: '74% 50%' },
  twoCups: { src: '/images/two-cups.jpg', srcset: '/images/two-cups-800.jpg 800w, /images/two-cups.jpg 1050w', width: 1050, height: 1400, alt: 'Two blue Hayward’s cups, one with red-streaked white ice cream and one with bright blue', position: '60% 40%' },
  toppedCups: { src: '/images/two-scoops.jpg', width: 1080, height: 1080, alt: 'Two cups of ice cream on an outdoor table at Hayward’s, one piled with caramel pieces and one green', position: '18% 50%' },
  treesStorefront: { src: '/images/trees-storefront.jpg', srcset: '/images/trees-storefront-800.jpg 800w, /images/trees-storefront.jpg 1800w', width: 1800, height: 1052, alt: 'The Hayward’s stand at Christmas: wreaths with red bows hang across the serving windows under the curved roof sign, with greens on red-draped tables out front', position: '50% 62%' },
  wreathWall: { src: '/images/trees-wreath-wall.jpg', srcset: '/images/trees-wreath-wall-800.jpg 800w, /images/trees-wreath-wall.jpg 1800w', width: 1800, height: 1350, alt: 'A long row of fresh balsam wreaths trimmed with red, plaid, purple and silver ribbons and ornaments', position: '60% 50%' },
  kissingBalls: { src: '/images/trees-kissing-balls.jpg', srcset: '/images/trees-kissing-balls-800.jpg 800w, /images/trees-kissing-balls.jpg 1800w', width: 1800, height: 1350, alt: 'Kissing balls with long red velvet ribbons and gold pinecones hanging above wreaths on green lattice', position: '22% 40%' },
  // Tree-lot photos from the family's "Haywards Tree Season" album (2015–2022), cropped to drop parking lot, a truck edge and tree tags.
  standDusk: { src: '/images/trees-stand-dusk.jpg', srcset: '/images/trees-stand-dusk-800.jpg 800w, /images/trees-stand-dusk.jpg 1800w', width: 1800, height: 1037, alt: 'The Hayward’s stand at dusk, its curved roof edged in white lights, with wreaths and red bows across the front and red-draped tables outside', position: '50% 22%' },
  standDay: { src: '/images/trees-stand-day.jpg', srcset: '/images/trees-stand-day-800.jpg 800w, /images/trees-stand-day.jpg 1800w', width: 1800, height: 900, alt: 'The Hayward’s stand on a sunny December day, wreaths with red bows hung across the front under the curved roof sign', position: '50% 45%' },
  treesOnRacks: { src: '/images/trees-on-racks.jpg', srcset: '/images/trees-on-racks-800.jpg 800w, /images/trees-on-racks.jpg 1760w', width: 1760, height: 1420, alt: 'Fresh-cut Christmas trees leaning on wooden racks in front of the stand’s grey roof', position: '55% 50%' },
  treesRows: { src: '/images/trees-rows.jpg', srcset: '/images/trees-rows-800.jpg 800w, /images/trees-rows.jpg 1800w', width: 1800, height: 1350, alt: 'Rows of Christmas trees standing on wooden A-frame racks, their fresh-cut trunks resting on the pavement', position: '50% 55%' },
  treesNetted: { src: '/images/trees-netted.jpg', srcset: '/images/trees-netted-800.jpg 800w, /images/trees-netted.jpg 1350w', width: 1350, height: 1800, alt: 'Netted Christmas trees stacked high beside the stand, cut trunks facing out', position: '50% 55%' },
  treeSingle: { src: '/images/trees-single.jpg', srcset: '/images/trees-single-800.jpg 800w, /images/trees-single.jpg 1350w', width: 1350, height: 1800, alt: 'A full Christmas tree standing on its own by a white picket fence under a clear blue sky', position: '50% 30%' },
  // Cropped from trees-wreath-closeup.jpg to remove a visible price sticker (no prices on the site).
  wreathCloseup: { src: '/images/trees-wreath-closeup-crop.jpg', srcset: '/images/trees-wreath-closeup-crop-800.jpg 800w, /images/trees-wreath-closeup-crop.jpg 1160w', width: 1160, height: 1350, alt: 'Close-up of a wreath with a red bow, red ornaments and gold-dusted pinecones', position: '78% 45%' },
} satisfies Record<string, Photo>;

/** The home page’s three photos, and the Visit page’s share image, per set. */
export const photoSets = {
  stand: { home: [photos.sundae, photos.caramel], visit: { ...photos.stand, alt: 'The entrance and serving windows at Hayward’s Milford', position: '49% center' } },
  trees: { home: [photos.standDusk, photos.treeSingle], visit: photos.standDay },
} satisfies Record<string, { home: Photo[]; visit: Photo }>;
export type PhotoSetName = keyof typeof photoSets;
