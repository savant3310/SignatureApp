/* util.js — pure helpers (no app state). Reusable everywhere. */

export const clamp01 = x => Math.max(0, Math.min(1, x));
export const clamp   = (x,a,b) => Math.max(a, Math.min(b, x));
export const easeOut = t => 1 - Math.pow(1 - t, 3);
export const easeOutBack = t => { const c1=1.70158, c3=c1+1; return 1 + c3*Math.pow(t-1,3) + c1*Math.pow(t-1,2); };
/* local progress of window [a,b] given global progress p (0..1) */
export const seg = (p,a,b) => clamp01((p-a)/(b-a));

export function roundRectPath(ctx, x, y, w, h, r){
  ctx.beginPath();
  ctx.moveTo(x+r, y);
  ctx.arcTo(x+w, y,   x+w, y+h, r);
  ctx.arcTo(x+w, y+h, x,   y+h, r);
  ctx.arcTo(x,   y+h, x,   y,   r);
  ctx.arcTo(x,   y,   x+w, y,   r);
  ctx.closePath();
}

export function initials(n){
  return (n||'?').trim().split(/\s+/).slice(0,2).map(w=>w[0]||'').join('').toUpperCase() || '?';
}

export function loadImg(src){
  return new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = src; });
}

/* place(): compute the draw rectangle (relative to a box origin) for a source
   of size iw x ih inside a box, honoring an {zoom,ox,oy} adjustment.
   fit 'cover'   -> fills + crops (photo); offsets are clamped so it always covers.
   fit 'contain' -> fits fully inside; free positioning. */
export function place(iw, ih, box, adjust, fit){
  const base = fit === 'cover' ? Math.max(box.w/iw, box.h/ih) : Math.min(box.w/iw, box.h/ih);
  const s = base * (adjust.zoom || 1);
  const dw = iw*s, dh = ih*s;
  let dx = (box.w-dw)/2 + (adjust.ox||0);
  let dy = (box.h-dh)/2 + (adjust.oy||0);
  if(fit === 'cover'){
    dx = clamp(dx, box.w-dw, 0);
    dy = clamp(dy, box.h-dh, 0);
    adjust.ox = dx - (box.w-dw)/2;   // keep the stored offset normalized
    adjust.oy = dy - (box.h-dh)/2;
  }
  return { dx, dy, dw, dh };
}
