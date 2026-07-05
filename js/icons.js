/* icons.js — social glyphs drawn as white marks. Each takes (ctx, cx, cy, s). */
import { roundRectPath } from './util.js';

export function icoLinkedIn(ctx, cx, cy, s){
  ctx.fillStyle='#fff'; ctx.font='800 '+Math.round(s)+'px Helvetica,Arial';
  ctx.textAlign='center'; ctx.textBaseline='middle'; ctx.fillText('in', cx, cy+1);
}
export function icoInstagram(ctx, cx, cy, s){
  const r=s*1.05; ctx.strokeStyle='#fff'; ctx.lineWidth=1.6;
  roundRectPath(ctx, cx-r/2, cy-r/2, r, r, r*0.3); ctx.stroke();
  ctx.beginPath(); ctx.arc(cx, cy, r*0.26, 0, 7); ctx.stroke();
  ctx.beginPath(); ctx.arc(cx+r*0.28, cy-r*0.28, 1, 0, 7); ctx.fillStyle='#fff'; ctx.fill();
}
export function icoYouTube(ctx, cx, cy, s){
  const w=s*1.5, h=s*1.05; ctx.fillStyle='#fff'; roundRectPath(ctx, cx-w/2, cy-h/2, w, h, 3); ctx.fill();
  ctx.fillStyle='#141a2b'; ctx.beginPath(); ctx.moveTo(cx-2.5, cy-4); ctx.lineTo(cx-2.5, cy+4); ctx.lineTo(cx+5, cy); ctx.closePath(); ctx.fill();
}
export function icoX(ctx, cx, cy, s){
  ctx.strokeStyle='#fff'; ctx.lineWidth=1.8; const r=s*0.7;
  ctx.beginPath(); ctx.moveTo(cx-r, cy-r); ctx.lineTo(cx+r, cy+r); ctx.moveTo(cx+r, cy-r); ctx.lineTo(cx-r, cy+r); ctx.stroke();
}
export const ICONS = { linkedin: icoLinkedIn, instagram: icoInstagram, youtube: icoYouTube, x: icoX };
