/* config.js — tweakable constants. Change numbers here to adjust the whole app. */

export const CFG = {
  W: 640,            // canvas / GIF width
  H: 200,            // canvas / GIF height
  INTRO_FRAMES: 50,  // number of animation frames
  FRAME_DELAY: 42,   // ms per frame (~24fps)
  HOLD_DELAY: 2200,  // ms the final frame is held
  BG: '#ffffff'      // background color of the signature
};

export const ACCENTS = ['#5b7cfa','#ff5a3c','#38d39f','#f5a623','#a066ff','#00b5d8','#111827'];

export const ALL_SOCIALS = ['linkedin','instagram','youtube','x'];

/* Layout of every element on the canvas. Edit freely. */
export const LAY = {
  cardR: 12,
  barX: 20, barY: 34, barW: 40, barH: CFG.H - 68,   // dark social bar (left)
  contentX: 78,                                       // where text starts
  logoBox: { x: 78, y: 16, w: 150, h: 38 },           // logo box (top-left)
  nameY: 92, titleY: 116, companyY: 138, emailY: 160, websiteY: 179, phoneY: 196,
  px: 410, py: 24, pw: 640 - 16 - 410, ph: 200 - 48,  // sliced photo region (right)
  slices: 5, skew: 26                                 // diagonal cut
};
