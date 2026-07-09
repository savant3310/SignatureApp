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

export const ACCENTS = ['#5b7cfa','#ff5a3c','#38d39f','#f5a623','#a066ff','#00b5d8','#111827'];

export const COMPANY_NAME = 'OPRAAH';

/* Layout of every element on the canvas. Edit freely. */
export const LAY = {
  cardR: 12,
  barX: 4, barY: 4, barW: 40, barH: CFG.H - 8,        // orange bar (left, flush to card edge)
  contentX: 78,                                       // where text starts
  logoBox: { x: 78, y: 16, w: 150, h: 38 },           // logo box (top-left)
  nameY: 82, titleY: 104, companyY: 124, linkedinY: 144, websiteY: 160, phoneY: 176,
  px: 410, py: 24, pw: 640 - 16 - 410, ph: 200 - 48,  // sliced photo region (right)
  slices: 5, skew: 26                                 // diagonal cut
};
