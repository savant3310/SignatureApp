/* render.js — all drawing. drawFrame(p, caretOn) is a pure function of the
   current state + intro progress p (0..1, 1 = settled). Both the live
   preview and the GIF export call drawFrame. */
import { ctx } from './canvas.js';
import { state } from './state.js';
import { CFG, LAY, COMPANY_NAME } from './config.js';
import { clamp01, easeOut, easeOutBack, seg, roundRectPath, initials, place } from './util.js';

/* ---- typewriter + fade/slide text ---- */
function drawType(text, x, y, font, color, prog, caretOn, accent){
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
function fadeSlide(text, x, y, font, color, prog){
  if(prog <= 0) return; const e = easeOut(prog);
  ctx.save(); ctx.font = font; ctx.textAlign='left'; ctx.textBaseline='alphabetic';
  ctx.globalAlpha = e; ctx.translate((1-e)*10, 0); ctx.fillStyle = color; ctx.fillText(text, x, y); ctx.restore();
}

/* ---- sliced photo (right), with crop adjust ---- */
function drawPhoto(p){
  const L = LAY, N = L.slices, SK = L.skew;
  const overall = easeOut(seg(p, 0.26, 0.9)); if(overall <= 0) return;
  const box = { w: L.pw, h: L.ph };
  let pl = null; if(state.photoImg) pl = place(state.photoImg.width, state.photoImg.height, box, state.photoAdjust, 'cover');
  ctx.save();
  roundRectPath(ctx, L.px, L.py, L.pw, L.ph, 10); ctx.clip();
  const step = (L.pw + SK) / N, OV = 0.75; // OV: slight clip overlap so adjacent slices' anti-aliased edges don't leave a seam
  for(let i=0;i<N;i++){
    const tx0 = L.px + i*step, tx1 = tx0 + step;
    const rev = easeOut(seg(p, 0.26 + i*0.05, 0.26 + i*0.05 + 0.30)); if(rev <= 0) continue;
    ctx.save();
    ctx.beginPath(); ctx.moveTo(tx0-OV, L.py); ctx.lineTo(tx1+OV, L.py); ctx.lineTo(tx1+OV-SK, L.py+L.ph); ctx.lineTo(tx0-OV-SK, L.py+L.ph); ctx.closePath(); ctx.clip();
    ctx.globalAlpha = overall*rev; const sl = (1-rev)*46;
    if(state.photoImg){ ctx.drawImage(state.photoImg, L.px+pl.dx+sl, L.py+pl.dy, pl.dw, pl.dh); }
    else{
      const g = ctx.createLinearGradient(L.px, L.py, L.px+L.pw, L.py+L.ph);
      g.addColorStop(0, state.accent); g.addColorStop(1, '#20263f');
      ctx.fillStyle = g; ctx.fillRect(L.px-SK+sl, L.py, L.pw+2*SK, L.ph);
    }
    ctx.restore();
  }
  // placeholder initials when no photo
  if(!state.photoImg){
    ctx.globalAlpha = overall; ctx.fillStyle = 'rgba(255,255,255,.92)';
    ctx.font = '700 44px -apple-system,Helvetica,Arial'; ctx.textAlign='center'; ctx.textBaseline='middle';
    ctx.fillText(initials(state.name), L.px+L.pw/2-6, L.py+L.ph/2);
  }
  // glare sweep
  const gp = seg(p, 0.55, 1.06);
  if(gp > 0 && gp < 1){
    const gx = L.px-40 + gp*(L.pw+90); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'lighter';
    const grad = ctx.createLinearGradient(gx-24, 0, gx+24, 0);
    grad.addColorStop(0,'rgba(255,255,255,0)'); grad.addColorStop(.5,'rgba(255,255,255,.30)'); grad.addColorStop(1,'rgba(255,255,255,0)');
    ctx.fillStyle = grad; ctx.beginPath();
    ctx.moveTo(gx+SK, L.py); ctx.lineTo(gx+SK+30, L.py); ctx.lineTo(gx+30-SK, L.py+L.ph); ctx.lineTo(gx-SK, L.py+L.ph); ctx.closePath(); ctx.fill();
    ctx.globalCompositeOperation = 'source-over';
  }
  ctx.restore();
}

/* ---- accent bar (left) ---- */
function drawBar(p){
  const L = LAY; const pb = easeOut(seg(p, 0.06, 0.3)); if(pb <= 0) return;
  ctx.save(); ctx.globalAlpha = pb; roundRectPath(ctx, L.barX, L.barY, L.barW, L.barH, 12); ctx.fillStyle = '#ff5e00'; ctx.fill(); ctx.restore();
}

/* ---- social icons stacked in the orange bar (LinkedIn, website, Instagram).
   Purely visual here — the flat GIF can't carry per-icon links; real
   clickable links come from publish.js, which uploads the rendered GIF and
   overlays <a> tags at these same iconBar coordinates over the hosted copy. ---- */
function drawSocialIcons(p){
  const pe = easeOut(seg(p, 0.10, 0.34)); if(pe <= 0) return;
  const b = LAY.iconBar, imgs = [state.linkedinIconImg, state.websiteIconImg, state.instagramIconImg];
  ctx.save(); ctx.globalAlpha = pe;
  imgs.forEach((img, i) => {
    if(!img) return;
    const y = b.ys[i], s = b.size;
    const pl = place(img.width, img.height, { w: s, h: s }, { zoom: 1, ox: 0, oy: 0 }, 'contain');
    ctx.drawImage(img, b.cx - s/2 + pl.dx, y - s/2 + pl.dy, pl.dw, pl.dh);
  });
  ctx.restore();
}

/* ---- verified badge ---- */
function drawBadge(x, y, prog, accent){
  if(prog <= 0) return; const s = easeOutBack(clamp01(prog)), r = 7.5;
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
  ctx.beginPath(); ctx.arc(0, 0, r, 0, 7); ctx.fillStyle = accent; ctx.fill();
  ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.8; ctx.lineCap='round'; ctx.lineJoin='round';
  ctx.beginPath(); ctx.moveTo(-3.2, 0.3); ctx.lineTo(-0.8, 2.6); ctx.lineTo(3.4, -2.4); ctx.stroke(); ctx.restore();
}

/* ---- logo: fixed image (assets/logo.png) if present, else a text wordmark.
   Not user-configurable — no upload, no crop/position controls. */
const LOGO_FIT = { zoom: 1, ox: 0, oy: 0 };
function drawLogo(p){
  const pe = easeOut(seg(p, 0, 0.24)); if(pe <= 0) return; const box = LAY.logoBox, accent = state.accent;
  ctx.save(); ctx.globalAlpha = pe;
  if(state.logoImg){
    const pl = place(state.logoImg.width, state.logoImg.height, box, LOGO_FIT, 'contain');
    ctx.drawImage(state.logoImg, box.x, box.y+pl.dy, pl.dw, pl.dh); // left-aligned with box.x (== contentX), not centered
  } else {
    ctx.font = '800 17px -apple-system,Helvetica,Arial'; ctx.textAlign='left'; ctx.textBaseline='alphabetic';
    const sq = 13, by = box.y + box.h - 9; roundRectPath(ctx, box.x, by-13, sq, sq, 3); ctx.fillStyle = accent; ctx.fill();
    ctx.fillStyle = '#141a2b'; ctx.fillText(COMPANY_NAME, box.x+sq+7, by);
  }
  ctx.restore();
}

/* ---- compose one frame ---- */
export function drawFrame(p, caretOn){
  const { W, H } = CFG, L = LAY, accent = state.accent;
  ctx.clearRect(0, 0, W, H); ctx.fillStyle = CFG.BG; ctx.fillRect(0, 0, W, H);
  ctx.save(); roundRectPath(ctx, 4, 4, W-8, H-8, L.cardR); ctx.strokeStyle = '#e6e9f2'; ctx.lineWidth = 1.5; ctx.stroke(); ctx.restore();

  drawBar(p); drawSocialIcons(p); drawPhoto(p); drawLogo(p);

  const pName = seg(p, 0.28, 0.56);
  ctx.font = '700 22px -apple-system,Helvetica,Arial';
  const nameW = ctx.measureText(state.name.slice(0, Math.round(clamp01(pName)*state.name.length))).width;
  drawType(state.name, L.contentX, L.nameY, '700 22px -apple-system,Helvetica,Arial', '#ff5e00', pName, caretOn, accent);
  if(state.badge){ const bp = seg(p, 0.56, 0.66); drawBadge(L.contentX+nameW+13, L.nameY-7, bp, accent); }

  fadeSlide(state.title,   L.contentX, L.titleY,   '600 14px -apple-system,Helvetica,Arial', accent,    seg(p, 0.50, 0.66));
  fadeSlide(state.company, L.contentX, L.companyY, '700 13px -apple-system,Helvetica,Arial', '#ff5e00', seg(p, 0.58, 0.74));
  const lines = []; if(state.linkedin) lines.push(state.linkedin); if(state.website) lines.push(state.website); if(state.phone) lines.push(state.phone);
  const ys = [L.linkedinY, L.websiteY, L.phoneY];
  lines.slice(0,3).forEach((tx, i) => fadeSlide(tx, L.contentX, ys[i], '400 12.5px -apple-system,Helvetica,Arial', '#5b6478', seg(p, 0.66 + i*0.06, 0.82 + i*0.06)));
}
