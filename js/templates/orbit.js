/* templates/orbit.js — same bar/logo/text layout and circular halo-photo
   as Spotlight Circle (see spotlight.js), but the loop-bracket decoration
   is replaced with a cluster of brand-colored dots that swing in along a
   short arc around the headshot while popping up to full size — no
   border strokes, matching the rest of the app's floating-card look. */
import { ctx } from '../canvas.js';
import { state } from '../state.js';
import { CFG, BRAND } from '../config.js';
import { clamp01, easeOut, easeOutBack, seg, roundRectPath, initials, place } from '../util.js';
import { drawType, fadeSlide, drawBadge, drawSocialIcons } from '../draw-utils.js';
import { COMPANY_NAME } from '../config.js';

const LAY = {
  cardR: 16,
  barX: 4, barY: 4, barW: 40, barH: CFG.H - 8,        // orange bar (left, flush to card edge) — same as Classic/Spotlight
  contentX: 78,                                       // where text starts
  logoBox: { x: 78, y: 16, w: 150, h: 38 },           // logo box (top-left)
  nameY: 82, titleY: 104, companyY: 124, linkedinY: 148, phoneY: 172,
  photoCx: 522, photoCy: 100, photoR: 70,             // circular headshot (right) — same spot as Spotlight
  circleR: 92                                         // big accent circle, concentric with the photo
};

/* icons stacked in the orange bar, centered horizontally on it — identical
   geometry to Classic/Spotlight so the same sliced-table link technique applies */
const LINK_TABLE = { orientation: 'column', stripAt: 'start', stripSize: 44, cellSizes: [83, 34, 83] };

/* One orbiting dot: travels a short arc (angleFrom -> angleTo, degrees,
   standard canvas angles) around (cx,cy) at a fixed orbitR, while popping
   up from nothing to dotR. Motion uses a plain ease (settles smoothly on
   the arc); size uses easeOutBack for the same springy pop as drawBadge
   and Spotlight's loop strokes, so all three templates feel consistent. */
function drawDot(cx, cy, orbitR, angleFrom, angleTo, dotR, color, prog){
  if(prog <= 0) return;
  const t = clamp01(prog);
  const m = easeOut(t), s = easeOutBack(t);
  const angle = (angleFrom + (angleTo - angleFrom) * m) * Math.PI / 180;
  const x = cx + Math.cos(angle) * orbitR, y = cy + Math.sin(angle) * orbitR;
  ctx.save();
  ctx.translate(x, y); ctx.scale(s, s);
  ctx.globalAlpha = clamp01(prog * 3);
  ctx.beginPath(); ctx.arc(0, 0, dotR, 0, Math.PI * 2); ctx.fillStyle = color; ctx.fill();
  ctx.restore();
}

/* Dot cluster around the halo. Each dot's orbitR is DOT_GAP past the halo
   edge *plus its own radius* (LAY.circleR + DOT_GAP + r) so every dot's
   inner edge clears the halo by the same DOT_GAP, however big the dot is —
   that's what keeps the halo (drawn after, solid-filled) from painting
   over any of them. `to` is each dot's final rest angle; `from` is 45°
   earlier on the arc, so it visibly swings into place as it pops up.
   Only brand colors are used (no ad-hoc yellow etc.) to stay consistent
   with the rest of the app. */
const DOT_GAP = 10;
const DOTS = [
  { to: 55,   r: 16, color: BRAND.cream,    win: [0.00, 0.28] }, // large & subtle, bottom-right — drawn first so bolder dots layer over it
  { to: -20,  r: 14, color: BRAND.orange,   win: [0.02, 0.30] }, // large, upper-right
  { to: -58,  r: 10, color: BRAND.orange,   win: [0.05, 0.32] }, // medium, top
  { to: 15,   r: 8,  color: BRAND.orange,   win: [0.08, 0.34] }, // small-medium, right
  { to: -125, r: 6,  color: BRAND.orange,   win: [0.11, 0.36] }, // small, upper-left of halo
  { to: 140,  r: 6,  color: BRAND.blue,     win: [0.14, 0.38] }, // small, lower-left
  { to: -145, r: 5,  color: BRAND.black,    win: [0.17, 0.40] }, // small, left
  { to: 65,   r: 5,  color: BRAND.lavender, win: [0.20, 0.42] }  // small, bottom
];

function drawDots(p){
  const L = LAY;
  ctx.save();
  roundRectPath(ctx, 4, 4, CFG.W - 8, CFG.H - 8, L.cardR); ctx.clip();
  for(const d of DOTS){
    const orbitR = L.circleR + DOT_GAP + d.r;
    drawDot(L.photoCx, L.photoCy, orbitR, d.to - 45, d.to, d.r, d.color, seg(p, d.win[0], d.win[1]));
  }
  ctx.restore();
}

function drawHalo(p){
  const L = LAY;
  ctx.save();
  roundRectPath(ctx, 4, 4, CFG.W - 8, CFG.H - 8, L.cardR); ctx.clip();
  const cp = easeOutBack(clamp01(seg(p, 0.14, 0.38)));
  if(cp > 0){
    ctx.save(); ctx.translate(L.photoCx, L.photoCy); ctx.scale(cp, cp);
    ctx.globalAlpha = clamp01(seg(p, 0.14, 0.38) * 3);
    ctx.beginPath(); ctx.arc(0, 0, L.circleR, 0, Math.PI * 2); ctx.fillStyle = BRAND.blue; ctx.fill();
    ctx.restore();
  }
  ctx.restore();
}

function drawPhoto(p){
  const L = LAY;
  const prog = easeOutBack(clamp01(seg(p, 0.34, 0.62))); if(prog <= 0) return;
  const box = { w: L.photoR*2, h: L.photoR*2 };
  let pl = null; if(state.photoImg) pl = place(state.photoImg.width, state.photoImg.height, box, state.photoAdjust, 'cover');

  ctx.save();
  ctx.translate(L.photoCx, L.photoCy); ctx.scale(prog, prog);
  ctx.globalAlpha = clamp01(seg(p, 0.34, 0.62)*3);
  ctx.beginPath(); ctx.arc(0, 0, L.photoR, 0, Math.PI*2); ctx.clip();
  if(state.photoImg){
    ctx.drawImage(state.photoImg, -L.photoR + pl.dx, -L.photoR + pl.dy, pl.dw, pl.dh);
  } else {
    const g = ctx.createLinearGradient(-L.photoR, -L.photoR, L.photoR, L.photoR);
    g.addColorStop(0, state.accent); g.addColorStop(1, BRAND.black);
    ctx.fillStyle = g; ctx.fillRect(-L.photoR, -L.photoR, L.photoR*2, L.photoR*2);
    ctx.fillStyle = 'rgba(255,255,255,.92)'; ctx.font = '700 34px -apple-system,Helvetica,Arial';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(initials(state.name), 0, 2);
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
  const L = LAY, accent = state.accent;

  drawBar(p); drawSocialIcons(p, LINK_TABLE); drawDots(p); drawHalo(p); drawPhoto(p); drawLogo(p);

  const pName = seg(p, 0.28, 0.56);
  const NAME_FONT = '700 22px -apple-system,Helvetica,Arial';
  ctx.save(); ctx.font = NAME_FONT; // measureText uses whatever font is already set — must match drawType's below
  const nameW = ctx.measureText(state.name.slice(0, Math.round(clamp01(pName)*state.name.length))).width;
  ctx.restore();
  drawType(state.name, L.contentX, L.nameY, NAME_FONT, BRAND.orange, pName, caretOn, accent);
  if(state.badge){ const bp = seg(p, 0.56, 0.66); drawBadge(L.contentX+nameW+19, L.nameY-7, bp, accent); }

  fadeSlide(state.title,   L.contentX, L.titleY,   '600 14px -apple-system,Helvetica,Arial', accent,       seg(p, 0.50, 0.66));
  fadeSlide(state.company, L.contentX, L.companyY, '700 13px -apple-system,Helvetica,Arial', BRAND.orange, seg(p, 0.58, 0.74));
  const lines = []; if(state.linkedin) lines.push(state.linkedin); if(state.phone) lines.push(state.phone);
  const ys = [L.linkedinY, L.phoneY];
  lines.slice(0,2).forEach((tx, i) => fadeSlide(tx, L.contentX, ys[i], '400 12.5px -apple-system,Helvetica,Arial', BRAND.black, seg(p, 0.66 + i*0.06, 0.82 + i*0.06)));
}

function linkedinTextRect(){
  if(!state.linkedin) return null;
  ctx.save(); ctx.font = '400 12.5px -apple-system,Helvetica,Arial';
  const w = ctx.measureText(state.linkedin).width;
  ctx.restore();
  return { x: LAY.contentX - 2, y: LAY.linkedinY - 11, w: Math.ceil(w) + 4, h: 16 };
}

export default {
  id: 'orbit',
  name: 'Orbit Dots',
  linkTable: LINK_TABLE,
  photoBox: { w: LAY.photoR*2, h: LAY.photoR*2 },
  linkedinRect: linkedinTextRect,
  drawFrame
};
