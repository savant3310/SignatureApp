/* templates/classic.js — the original design: a full-height orange bar on
   the left (holding the 3 social icons), name/title/company/contact text,
   and a diagonally-sliced photo reveal on the right. */
import { ctx } from '../canvas.js';
import { state } from '../state.js';
import { CFG, BRAND, COMPANY_NAME } from '../config.js';
import { clamp01, easeOut, seg, roundRectPath, initials, place } from '../util.js';
import { drawType, fadeSlide, drawBadge, drawSocialIcons } from '../draw-utils.js';

const LAY = {
  cardR: 12,
  barX: 4, barY: 4, barW: 40, barH: CFG.H - 8,        // orange bar (left, flush to card edge)
  contentX: 78,                                       // where text starts
  logoBox: { x: 78, y: 16, w: 150, h: 38 },           // logo box (top-left)
  nameY: 82, titleY: 104, companyY: 124, linkedinY: 148, phoneY: 172,
  px: 410, py: 24, pw: 640 - 16 - 410, ph: 200 - 48,  // sliced photo region (right)
  slices: 5, skew: 26                                 // diagonal cut
};

/* icons stacked in the orange bar, centered horizontally on it (barX + barW/2) */
const LINK_TABLE = { orientation: 'column', stripAt: 'start', stripSize: 44, cellSizes: [83, 34, 83] };

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
      g.addColorStop(0, state.accent); g.addColorStop(1, BRAND.black);
      ctx.fillStyle = g; ctx.fillRect(L.px-SK+sl, L.py, L.pw+2*SK, L.ph);
    }
    ctx.restore();
  }
  if(!state.photoImg){
    ctx.globalAlpha = overall; ctx.fillStyle = 'rgba(255,255,255,.92)';
    ctx.font = '700 44px -apple-system,Helvetica,Arial'; ctx.textAlign='center'; ctx.textBaseline='middle';
    ctx.fillText(initials(state.name), L.px+L.pw/2-6, L.py+L.ph/2);
  }
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

function drawBar(p){
  const L = LAY; const pb = easeOut(seg(p, 0.06, 0.3)); if(pb <= 0) return;
  ctx.save(); ctx.globalAlpha = pb; roundRectPath(ctx, L.barX, L.barY, L.barW, L.barH, 12); ctx.fillStyle = BRAND.orange; ctx.fill(); ctx.restore();
}

const LOGO_FIT = { zoom: 1, ox: 0, oy: 0 };
function drawLogo(p){
  const pe = easeOut(seg(p, 0, 0.24)); if(pe <= 0) return; const box = LAY.logoBox, accent = state.accent;
  ctx.save(); ctx.globalAlpha = pe;
  if(state.logoImg){
    const pl = place(state.logoImg.width, state.logoImg.height, box, LOGO_FIT, 'contain');
    ctx.drawImage(state.logoImg, box.x, box.y+pl.dy, pl.dw, pl.dh);
  } else {
    ctx.font = '800 17px -apple-system,Helvetica,Arial'; ctx.textAlign='left'; ctx.textBaseline='alphabetic';
    const sq = 13, by = box.y + box.h - 9; roundRectPath(ctx, box.x, by-13, sq, sq, 3); ctx.fillStyle = accent; ctx.fill();
    ctx.fillStyle = BRAND.black; ctx.fillText(COMPANY_NAME, box.x+sq+7, by);
  }
  ctx.restore();
}

function drawFrame(p, caretOn){
  const { W, H } = CFG, L = LAY, accent = state.accent;
  ctx.save(); roundRectPath(ctx, 4, 4, W-8, H-8, L.cardR); ctx.strokeStyle = '#e6e9f2'; ctx.lineWidth = 1.5; ctx.stroke(); ctx.restore();

  drawBar(p); drawSocialIcons(p, LINK_TABLE); drawPhoto(p); drawLogo(p);

  const pName = seg(p, 0.28, 0.56);
  ctx.font = '700 22px -apple-system,Helvetica,Arial';
  const nameW = ctx.measureText(state.name.slice(0, Math.round(clamp01(pName)*state.name.length))).width;
  drawType(state.name, L.contentX, L.nameY, '700 22px -apple-system,Helvetica,Arial', BRAND.orange, pName, caretOn, accent);
  if(state.badge){ const bp = seg(p, 0.56, 0.66); drawBadge(L.contentX+nameW+13, L.nameY-7, bp, accent); }

  fadeSlide(state.title,   L.contentX, L.titleY,   '600 14px -apple-system,Helvetica,Arial', accent,       seg(p, 0.50, 0.66));
  fadeSlide(state.company, L.contentX, L.companyY, '700 13px -apple-system,Helvetica,Arial', BRAND.orange, seg(p, 0.58, 0.74));
  const lines = []; if(state.linkedin) lines.push(state.linkedin); if(state.phone) lines.push(state.phone);
  const ys = [L.linkedinY, L.phoneY];
  lines.slice(0,2).forEach((tx, i) => fadeSlide(tx, L.contentX, ys[i], '400 12.5px -apple-system,Helvetica,Arial', BRAND.black, seg(p, 0.66 + i*0.06, 0.82 + i*0.06)));
}

/* Bounding box of the rendered LinkedIn line (always the first contact line
   when present — see the `lines` array above), used by publish.js to carve
   that text out of the "main" clickable region as its own link to the
   user's profile instead of the company website. Null when there's no
   LinkedIn text to link. */
function linkedinTextRect(){
  if(!state.linkedin) return null;
  ctx.save(); ctx.font = '400 12.5px -apple-system,Helvetica,Arial';
  const w = ctx.measureText(state.linkedin).width;
  ctx.restore();
  return { x: LAY.contentX - 2, y: LAY.linkedinY - 11, w: Math.ceil(w) + 4, h: 16 };
}

export default {
  id: 'classic',
  name: 'Classic Bar',
  linkTable: LINK_TABLE,
  photoBox: { w: LAY.pw, h: LAY.ph },
  linkedinRect: linkedinTextRect,
  drawFrame
};
