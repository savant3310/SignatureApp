/* draw-utils.js — low-level canvas drawing primitives shared by every
   template. Pure functions, no layout knowledge — each template composes
   these against its own coordinates. All draw onto the shared preview
   canvas (see canvas.js); publish.js later crops copies of that canvas per
   template's link-table geometry. */
import { ctx } from './canvas.js';
import { state } from './state.js';
import { clamp01, easeOut, easeOutBack, seg, place } from './util.js';
import { iconCenters, ICON_SIZE } from './link-table.js';

export function drawType(text, x, y, font, color, prog, caretOn, accent){
  if(prog <= 0) return;
  ctx.save(); ctx.font = font; ctx.textAlign='left'; ctx.textBaseline='alphabetic';
  const n = Math.round(clamp01(prog)*text.length); const shown = text.slice(0, n);
  ctx.globalAlpha = clamp01(prog*4); ctx.fillStyle = color; ctx.fillText(shown, x, y);
  if(prog < 1 && caretOn){
    const w = ctx.measureText(shown).width; const fs = parseInt(font.match(/(\d+)px/)[1], 10);
    ctx.fillStyle = accent; ctx.fillRect(x+w+2, y-fs+3, 2, fs);
  }
  ctx.restore();
}

export function fadeSlide(text, x, y, font, color, prog){
  if(prog <= 0) return; const e = easeOut(prog);
  ctx.save(); ctx.font = font; ctx.textAlign='left'; ctx.textBaseline='alphabetic';
  ctx.globalAlpha = e; ctx.translate((1-e)*10, 0); ctx.fillStyle = color; ctx.fillText(text, x, y); ctx.restore();
}

/* Truncates text with an ellipsis so it fits maxWidth at the given font —
   for narrower templates where user-entered text (linkedin/website URLs)
   could otherwise overflow a fixed-width column. */
export function fitText(text, font, maxWidth){
  ctx.save(); ctx.font = font;
  let out = text;
  if(ctx.measureText(text).width > maxWidth){
    let lo = 0, hi = text.length;
    while(lo < hi){
      const mid = (lo+hi+1) >> 1;
      if(ctx.measureText(text.slice(0, mid)+'…').width <= maxWidth) lo = mid; else hi = mid-1;
    }
    out = text.slice(0, lo) + '…';
  }
  ctx.restore();
  return out;
}

export function drawBadge(x, y, prog, accent){
  if(prog <= 0) return; const s = easeOutBack(clamp01(prog)), r = 7.5;
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
  ctx.beginPath(); ctx.arc(0, 0, r, 0, 7); ctx.fillStyle = accent; ctx.fill();
  ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.8; ctx.lineCap='round'; ctx.lineJoin='round';
  ctx.beginPath(); ctx.moveTo(-3.2, 0.3); ctx.lineTo(-0.8, 2.6); ctx.lineTo(3.4, -2.4); ctx.stroke(); ctx.restore();
}

/* Social icons (LinkedIn/website/Instagram) positioned along a template's
   linkTable strip — see link-table.js for why they must sit on a straight
   edge strip. Purely visual; publish.js overlays the real <a> links on a
   sliced-table reconstruction of this same geometry. */
export function drawSocialIcons(p, linkTable){
  const pe = easeOut(seg(p, 0.10, 0.34)); if(pe <= 0) return;
  const centers = iconCenters(linkTable);
  const imgs = [state.linkedinIconImg, state.websiteIconImg, state.instagramIconImg];
  ctx.save(); ctx.globalAlpha = pe;
  imgs.forEach((img, i) => {
    if(!img) return;
    const { x, y } = centers[i], s = ICON_SIZE;
    const pl = place(img.width, img.height, { w: s, h: s }, { zoom: 1, ox: 0, oy: 0 }, 'contain');
    ctx.drawImage(img, x - s/2 + pl.dx, y - s/2 + pl.dy, pl.dw, pl.dh);
  });
  ctx.restore();
}
