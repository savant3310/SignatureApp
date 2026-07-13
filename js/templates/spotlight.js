/* templates/spotlight.js — a bolder, circular-photo design (from a Figma
   mock): same orange bar + 3 social icons as Classic Bar, no card border
   (unlike Classic's subtle gray outline — this design floats edge-free),
   and an animated cluster of brand shapes — a big accent circle concentric
   with the headshot (a halo ring) plus two interlocking "loop" strokes
   peeking out behind it — instead of Classic's diagonal-slice rectangle. */
import { ctx } from '../canvas.js';
import { state } from '../state.js';
import { CFG, BRAND, COMPANY_NAME } from '../config.js';
import { clamp01, easeOut, easeOutBack, seg, roundRectPath, initials, place } from '../util.js';
import { drawType, fadeSlide, drawBadge, drawSocialIcons } from '../draw-utils.js';

const LAY = {
  cardR: 16,
  barX: 4, barY: 4, barW: 40, barH: CFG.H - 8,        // orange bar (left, flush to card edge) — same as Classic
  contentX: 78,                                       // where text starts
  logoBox: { x: 78, y: 16, w: 150, h: 38 },           // logo box (top-left)
  nameY: 82, titleY: 104, companyY: 124, linkedinY: 148, phoneY: 172,
  photoCx: 522, photoCy: 100, photoR: 70,             // circular headshot (right)
  circleR: 92                                         // big accent circle, concentric with the photo — a halo ring
};

/* icons stacked in the orange bar, centered horizontally on it — identical
   geometry to Classic so the same sliced-table link technique applies */
const LINK_TABLE = { orientation: 'column', stripAt: 'start', stripSize: 44, cellSizes: [83, 34, 83] };

/* An open "U" bracket stroke — the loop motif behind the photo. Drawn
   around its own center so scale-in animation (see drawLoops) can pivot
   there without recomputing the path. */
function loopPath(w, h, r){
  ctx.beginPath();
  ctx.moveTo(-w/2, -h/2);
  ctx.lineTo(-w/2, h/2 - r);
  ctx.arcTo(-w/2, h/2, -w/2 + r, h/2, r);
  ctx.lineTo(w/2 - r, h/2);
  ctx.arcTo(w/2, h/2, w/2, h/2 - r, r);
  ctx.lineTo(w/2, -h/2);
}

function drawLoop(cx, cy, w, h, r, rotationDeg, lineWidth, color, prog){
  if(prog <= 0) return;
  const s = easeOutBack(clamp01(prog));
  ctx.save();
  ctx.translate(cx, cy); ctx.rotate(rotationDeg * Math.PI/180); ctx.scale(s, s);
  ctx.lineWidth = lineWidth; ctx.strokeStyle = color; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.globalAlpha = clamp01(prog*3);
  loopPath(w, h, r); ctx.stroke();
  ctx.restore();
}

/* Decorative cluster behind the headshot: two loop strokes + a big accent
   circle, clipped to the card so nothing bleeds past its rounded corners.
   Drawn back-to-front so the circle (and later the photo) covers most of
   them, leaving just the peeking crescents seen in the mock. */
function drawDecoration(p){
  const L = LAY;
  ctx.save();
  roundRectPath(ctx, 4, 4, CFG.W - 8, CFG.H - 8, L.cardR); ctx.clip();

  drawLoop(L.photoCx - 48, L.photoCy + 12, 315, 270, 86, -10, 26, BRAND.black, seg(p, 0.04, 0.28));
  drawLoop(L.photoCx - 22, L.photoCy + 12, 315, 194, 72, 8, 22, BRAND.orange, seg(p, 0.09, 0.33));

  const cp = easeOutBack(clamp01(seg(p, 0.14, 0.38)));
  if(cp > 0){
    ctx.save(); ctx.translate(L.photoCx, L.photoCy); ctx.scale(cp, cp);
    ctx.globalAlpha = clamp01(seg(p, 0.14, 0.38)*3);
    ctx.beginPath(); ctx.arc(0, 0, L.circleR, 0, Math.PI*2); ctx.fillStyle = BRAND.blue; ctx.fill();
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

  drawBar(p); drawSocialIcons(p, LINK_TABLE); drawDecoration(p); drawPhoto(p); drawLogo(p);

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
  id: 'spotlight',
  name: 'Spotlight Circle',
  linkTable: LINK_TABLE,
  photoBox: { w: LAY.photoR*2, h: LAY.photoR*2 },
  linkedinRect: linkedinTextRect,
  drawFrame
};
