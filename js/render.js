/* render.js — drawFrame(p, caretOn) is a pure function of the current state
   + intro progress p (0..1, 1 = settled). Both the live preview and the GIF
   export call this. Clears to a plain white base coat (so a template with
   transparent PNG regions never shows a black canvas through), then hands
   off entirely to the active template (see js/templates/index.js) — each
   template is responsible for its own card edge/border treatment, since a
   template built around full-bleed background art needs a different one
   than the plain white card the classic design uses. */
import { ctx } from './canvas.js';
import { state } from './state.js';
import { CFG } from './config.js';
import { TEMPLATES, DEFAULT_TEMPLATE_ID } from './templates/index.js';

export function activeTemplate(){
  return TEMPLATES[state.template] || TEMPLATES[DEFAULT_TEMPLATE_ID];
}

export function drawFrame(p, caretOn){
  const { W, H } = CFG;
  ctx.clearRect(0, 0, W, H); ctx.fillStyle = CFG.BG; ctx.fillRect(0, 0, W, H);
  activeTemplate().drawFrame(p, caretOn);
}
