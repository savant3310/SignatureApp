/* render.js — all drawing. drawFrame(p, caretOn, t) is a pure function of the
   current state + intro progress p (0..1, 1 = settled) + time t (ms, for the
   animated logo). Both the live preview and the GIF export call drawFrame. */
import { ctx } from './canvas.js';
import { state } from './state.js';
import { CFG, LAY, ALL_SOCIALS } from './config.js';
import { clamp01, easeOut, easeOutBack, seg, roundRectPath, initials, place } from './util.js';
import { ICONS, icoX } from './icons.js';

/* which frame of an animated-GIF logo to show at time t (ms) */
export function currentLogoFrame(t){
  const fr = state.logo.frames; if(!fr || !fr.length) return null;
  let tt = t % Math.max(1, state.logo.totalDelay);
  for(const f of fr){ tt -= f.delay; if(tt < 0) return f.canvas; }
  return fr[fr.length-1].canvas;
}

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
  const step = (L.pw + SK) / N;
  for(let i=0;i<N;i++){
    const tx0 = L.px + i*step, tx1 = tx0 + step;
    const rev = easeOut(seg(p, 0.26 + i*0.05, 0.26 + i*0.05 + 0.30)); if(rev <= 0) continue;
    ctx.save();
    ctx.beginPath(); ctx.moveTo(tx0, L.py); ctx.lineTo(tx1, L.py); ctx.lineTo(tx1-SK, L.py+L.ph); ctx.lineTo(tx0-SK, L.py+L.ph); ctx.closePath(); ctx.clip();
    ctx.globalAlpha = overall*rev; const sl = (1-rev)*46;
    if(state.photoImg){ ctx.drawImage(state.photoImg, L.px+pl.dx+sl, L.py+pl.dy, pl.dw, pl.dh); }
    else{
      const g = ctx.createLinearGradient(L.px, L.py, L.px+L.pw, L.py+L.ph);
      g.addColorStop(0, state.accent); g.addColorStop(1, '#20263f');
      ctx.fillStyle = g; ctx.fillRect(L.px-SK+sl, L.py, L.pw+2*SK, L.ph);
    }
    ctx.restore();
  }
  // diagonal white seams
  ctx.globalAlpha = overall; ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2.4; ctx.lineCap = 'round';
  for(let i=1;i<N;i++){ const tx = L.px + i*step; ctx.beginPath(); ctx.moveTo(tx, L.py-2); ctx.lineTo(tx-SK, L.py+L.ph+2); ctx.stroke(); }
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

/* ---- dark social bar (left) ---- */
function drawBar(p){
  const L = LAY; const pb = easeOut(seg(p, 0.06, 0.3)); if(pb <= 0) return;
  ctx.save(); ctx.globalAlpha = pb; roundRectPath(ctx, L.barX, L.barY, L.barW, L.barH, 12); ctx.fillStyle = '#141a2b'; ctx.fill(); ctx.restore();
  const list = state.socials.filter(s => ALL_SOCIALS.includes(s)); const n = list.length || 1; const cx = L.barX + L.barW/2;
  list.forEach((k, i) => {
    const cy = L.barY + (i+1)*L.barH/(n+1);
    const pi = easeOut(seg(p, 0.16 + i*0.06, 0.16 + i*0.06 + 0.24)); if(pi <= 0) return;
    ctx.save(); ctx.globalAlpha = pi; ctx.translate(0, (1-pi)*8); (ICONS[k] || icoX)(ctx, cx, cy, 9); ctx.restore();
  });
}

/* ---- verified badge ---- */
function drawBadge(x, y, prog, accent){
  if(prog <= 0) return; const s = easeOutBack(clamp01(prog)), r = 7.5;
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
  ctx.beginPath(); ctx.arc(0, 0, r, 0, 7); ctx.fillStyle = accent; ctx.fill();
  ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.8; ctx.lineCap='round'; ctx.lineJoin='round';
  ctx.beginPath(); ctx.moveTo(-3.2, 0.3); ctx.lineTo(-0.8, 2.6); ctx.lineTo(3.4, -2.4); ctx.stroke(); ctx.restore();
}

/* ---- logo: wordmark / static image / animated gif ---- */
function drawLogo(p, t){
  const pe = easeOut(seg(p, 0, 0.24)); if(pe <= 0) return; const box = LAY.logoBox, accent = state.accent;
  ctx.save(); ctx.globalAlpha = pe;
  if(state.logo.type === 'wordmark'){
    const label = (state.company || 'COMPANY').toUpperCase();
    ctx.font = '800 17px -apple-system,Helvetica,Arial'; ctx.textAlign='left'; ctx.textBaseline='alphabetic';
    const sq = 13, by = box.y + box.h - 9; roundRectPath(ctx, box.x, by-13, sq, sq, 3); ctx.fillStyle = accent; ctx.fill();
    ctx.fillStyle = '#141a2b'; ctx.fillText(label, box.x+sq+7, by);
  } else {
    const src = state.logo.type === 'gif' ? currentLogoFrame(t) : state.logo.img;
    if(src){
      const pl = place(src.width, src.height, box, state.logo.adjust, 'contain');
      ctx.save(); roundRectPath(ctx, box.x, box.y, box.w, box.h, 4); ctx.clip();
      ctx.drawImage(src, box.x+pl.dx, box.y+pl.dy, pl.dw, pl.dh); ctx.restore();
    }
  }
  ctx.restore();
}

/* ---- compose one frame ---- */
export function drawFrame(p, caretOn, t){
  const { W, H } = CFG, L = LAY, accent = state.accent; t = t || 0;
  ctx.clearRect(0, 0, W, H); ctx.fillStyle = CFG.BG; ctx.fillRect(0, 0, W, H);
  ctx.save(); roundRectPath(ctx, 4, 4, W-8, H-8, L.cardR); ctx.strokeStyle = '#e6e9f2'; ctx.lineWidth = 1.5; ctx.stroke(); ctx.restore();

  drawBar(p); drawPhoto(p); drawLogo(p, t);

  const pName = seg(p, 0.28, 0.56);
  ctx.font = '700 22px -apple-system,Helvetica,Arial';
  const nameW = ctx.measureText(state.name.slice(0, Math.round(clamp01(pName)*state.name.length))).width;
  drawType(state.name, L.contentX, L.nameY, '700 22px -apple-system,Helvetica,Arial', '#ff5e00', pName, caretOn, accent);
  if(state.badge){ const bp = seg(p, 0.56, 0.66); drawBadge(L.contentX+nameW+13, L.nameY-7, bp, accent); }

  fadeSlide(state.title,   L.contentX, L.titleY,   '600 14px -apple-system,Helvetica,Arial', accent,    seg(p, 0.50, 0.66));
  fadeSlide(state.company, L.contentX, L.companyY, '700 13px -apple-system,Helvetica,Arial', '#ff5e00', seg(p, 0.58, 0.74));
  const lines = []; if(state.email) lines.push(state.email); if(state.website) lines.push(state.website); if(state.phone) lines.push(state.phone);
  const ys = [L.emailY, L.websiteY, L.phoneY];
  lines.slice(0,3).forEach((tx, i) => fadeSlide(tx, L.contentX, ys[i], '400 12.5px -apple-system,Helvetica,Arial', '#5b6478', seg(p, 0.66 + i*0.06, 0.82 + i*0.06)));
}
