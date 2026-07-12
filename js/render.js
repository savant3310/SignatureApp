/* render.js — drawFrame(p, caretOn) is a pure function of the current state
   + intro progress p (0..1, 1 = settled). Both the live preview and the GIF
   export call this. Draws the shared white card background, then delegates
   all content drawing to the active template (see js/templates/index.js). */
import { ctx } from './canvas.js';
import { state } from './state.js';
import { CFG } from './config.js';
import { roundRectPath } from './util.js';
import { TEMPLATES, DEFAULT_TEMPLATE_ID } from './templates/index.js';

export function activeTemplate(){
  return TEMPLATES[state.template] || TEMPLATES[DEFAULT_TEMPLATE_ID];
}

export function drawFrame(p, caretOn){
  const { W, H } = CFG;
  ctx.clearRect(0, 0, W, H); ctx.fillStyle = CFG.BG; ctx.fillRect(0, 0, W, H);
  ctx.save(); roundRectPath(ctx, 4, 4, W-8, H-8, 12); ctx.strokeStyle = '#e6e9f2'; ctx.lineWidth = 1.5; ctx.stroke(); ctx.restore();

  activeTemplate().drawFrame(p, caretOn);
}
