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
   still available via BRAND.cream for background/decorative use. Black and
   lavender were dropped from the picker too (still used decoratively
   elsewhere, e.g. orbit.js's dot cluster — just not offered as a
   user-selectable accent). */
export const ACCENTS = [BRAND.orange, BRAND.blue];

export const COMPANY_NAME = 'OPRAAH';

/* Fixed company social links — not user-configurable, same for every generated
   signature (like the logo). Used for the in-bar icons and the published
   HTML's per-icon <a> overlays (see publish.js). */
export const SOCIAL_LINKS = {
  linkedin: 'https://www.linkedin.com/company/opraah/posts/?feedView=all',
  instagram: 'https://www.instagram.com/opraah.in/',
  website: 'https://opraah.in/'
};

/* Per-template layout (positions) and linkTable (icon-strip/slice geometry)
   now live in js/templates/*.js — see js/templates/index.js for the
   registry. This file only holds config shared across every template. */
