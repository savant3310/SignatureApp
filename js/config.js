/* config.js — tweakable constants. Change numbers here to adjust the whole app. */

export const CFG = {
  W: 640,            // canvas / GIF width
  H: 200,            // canvas / GIF height
  INTRO_FRAMES: 50,  // number of animation frames
  FRAME_DELAY: 42,   // ms per frame (~24fps)
  HOLD_DELAY: 2200,  // ms the final frame is held
  BG: '#ffffff',     // background color of the signature
  LOOP_REPEATS: 2    // GIF replays this many extra times after the first play (2 = 3 total plays, 3 = 4 total)
};

/* Official Opraah brand palette — the only colors any template/design in
   this app should draw from (bars, text, backgrounds, decorative shapes). */
export const BRAND = {
  orange: '#FF5E00',
  cream: '#FFEEE7',
  blue: '#000AD5',
  lavender: '#EDB5FF',
  black: '#0A0A0A'
};

/* Accent swatches offered in the UI. Cream is excluded here — as foreground
   text/caret color against the white card it has no contrast — but it's
   still available via BRAND.cream for background/decorative use. */
export const ACCENTS = [BRAND.orange, BRAND.blue, BRAND.black, BRAND.lavender];

export const COMPANY_NAME = 'OPRAAH';

/* Fixed company social links — not user-configurable, same for every generated
   signature (like the logo). Used for the in-bar icons and the published
   HTML's per-icon <a> overlays (see publish.js). */
export const SOCIAL_LINKS = {
  linkedin: 'https://www.linkedin.com/company/opraah/posts/?feedView=all',
  instagram: 'https://www.instagram.com/opraah.in/',
  website: 'https://opraah.in/'
};

/* Layout of every element on the canvas. Edit freely. */
export const LAY = {
  cardR: 12,
  barX: 4, barY: 4, barW: 40, barH: CFG.H - 8,        // orange bar (left, flush to card edge)
  contentX: 78,                                       // where text starts
  logoBox: { x: 78, y: 16, w: 150, h: 38 },           // logo box (top-left)
  nameY: 82, titleY: 104, companyY: 124, linkedinY: 144, websiteY: 160, phoneY: 176,
  px: 410, py: 24, pw: 640 - 16 - 410, ph: 200 - 48,  // sliced photo region (right)
  slices: 5, skew: 26,                                // diagonal cut
  // social icons stacked in the orange bar, centered horizontally on it (barX + barW/2)
  iconBar: { cx: 4 + 40/2, ys: [66, 100, 134], size: 20 }
};

/* Table-slice geometry for the published HTML signature (see publish.js).
   Gmail/Outlook strip position:absolute on paste, so per-icon links can't be
   CSS overlays — instead the rendered frame is cut into rectangles and
   reassembled as an HTML <table>, exactly like the classic "sliced image"
   email technique: the 3 icon strips (left column) become their own <a><img>
   cells, the rest of the signature (right column) is one plain image.
   Row boundaries sit at the midpoints between the 3 icon centers in
   LAY.iconBar.ys, so each strip is centered on its icon. Must sum to CFG.H. */
export const LINK_TABLE = {
  colW: 44,             // left (icon) column width — matches barX + barW
  rowH: [83, 34, 83]     // LinkedIn / website / Instagram strip heights, top to bottom
};
