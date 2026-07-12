/* templates/sidebar.js — LinkedIn/website/Instagram each shown as an
   icon + its value, stacked in a left column against a soft cream panel;
   a circular photo with a Memphis-style ring accent on the right. */
import { ctx } from '../canvas.js';
import { state } from '../state.js';
import { CFG, BRAND, COMPANY_NAME } from '../config.js';
import { easeOut, clamp01, seg, roundRectPath, initials, place } from '../util.js';
import { drawType, fadeSlide, drawBadge, drawSocialIcons, fitText } from '../draw-utils.js';
import { iconCenters } from '../link-table.js';

const LAY = {
  stripW: 220,
  logoBox: { x: 236, y: 16, w: 130, h: 30 },
  photo: { cx: 300, cy: 106, r: 52 },
  nameX: 368, nameY: 84, titleY: 106, companyY: 126,
  labelX: 48, labelMaxW: 156
};

/* icon+label rows stacked in the left strip, icons left-aligned at x=26
   (not centered) so label text can follow at LAY.labelX */
const LINK_TABLE = { orientation: 'column', stripAt: 'start', stripSize: LAY.stripW, cellSizes: [67, 66, 67], iconOffset: 26 };

function drawStripBg(p){
  const pb = easeOut(seg(p, 0.04, 0.26)); if(pb <= 0) return;
  ctx.save(); ctx.globalAlpha = pb;
  roundRectPath(ctx, 4, 4, LAY.stripW - 4, CFG.H - 8, 12);
  ctx.fillStyle = BRAND.cream; ctx.fill();
  ctx.restore();
  ctx.save(); ctx.globalAlpha = pb * 0.5;
  ctx.strokeStyle = BRAND.black; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(LAY.stripW, 22); ctx.lineTo(LAY.stripW, CFG.H - 22); ctx.stroke();
  ctx.restore();
}

/* Memphis-style geometric accents behind the photo — brand colors only */
function drawDecor(p){
  const pd = easeOut(seg(p, 0.10, 0.40)); if(pd <= 0) return;
  const { cx, cy, r } = LAY.photo;
  ctx.save(); ctx.globalAlpha = pd * 0.5;
  ctx.strokeStyle = BRAND.lavender; ctx.lineWidth = 6;
  ctx.beginPath(); ctx.arc(cx + 8, cy - 6, r + 22, 0.15 * Math.PI, 1.1 * Math.PI); ctx.stroke();
  ctx.restore();
  ctx.save(); ctx.globalAlpha = pd * 0.85; ctx.fillStyle = BRAND.orange;
  ctx.beginPath(); ctx.arc(CFG.W - 34, 30, 9, 0, Math.PI*2); ctx.fill();
  ctx.restore();
  ctx.save(); ctx.globalAlpha = pd * 0.7; ctx.fillStyle = BRAND.blue;
  ctx.beginPath(); ctx.arc(CFG.W - 20, 168, 6, 0, Math.PI*2); ctx.fill();
  ctx.restore();
}

function drawPhoto(p){
  const { cx, cy, r } = LAY.photo;
  const overall = easeOut(seg(p, 0.30, 0.62)); if(overall <= 0) return;
  const rad = Math.max(0.001, r * overall);
  ctx.save();
  ctx.beginPath(); ctx.arc(cx, cy, rad, 0, Math.PI*2); ctx.clip();
  const box = { w: r*2, h: r*2 };
  if(state.photoImg){
    const pl = place(state.photoImg.width, state.photoImg.height, box, state.photoAdjust, 'cover');
    ctx.drawImage(state.photoImg, cx-r+pl.dx, cy-r+pl.dy, pl.dw, pl.dh);
  } else {
    const g = ctx.createLinearGradient(cx-r, cy-r, cx+r, cy+r);
    g.addColorStop(0, state.accent); g.addColorStop(1, BRAND.black);
    ctx.fillStyle = g; ctx.fillRect(cx-r, cy-r, r*2, r*2);
    ctx.fillStyle = 'rgba(255,255,255,.92)'; ctx.font = '700 30px -apple-system,Helvetica,Arial';
    ctx.textAlign='center'; ctx.textBaseline='middle'; ctx.fillText(initials(state.name), cx, cy);
  }
  ctx.restore();
  ctx.save(); ctx.globalAlpha = overall; ctx.strokeStyle = BRAND.orange; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI*2); ctx.stroke(); ctx.restore();
}

const LOGO_FIT = { zoom: 1, ox: 0, oy: 0 };
function drawLogo(p){
  const pe = easeOut(seg(p, 0, 0.24)); if(pe <= 0) return; const box = LAY.logoBox, accent = state.accent;
  ctx.save(); ctx.globalAlpha = pe;
  if(state.logoImg){
    const pl = place(state.logoImg.width, state.logoImg.height, box, LOGO_FIT, 'contain');
    ctx.drawImage(state.logoImg, box.x, box.y+pl.dy, pl.dw, pl.dh);
  } else {
    ctx.font = '800 15px -apple-system,Helvetica,Arial'; ctx.textAlign='left'; ctx.textBaseline='alphabetic';
    const sq = 12, by = box.y + box.h - 8; roundRectPath(ctx, box.x, by-12, sq, sq, 3); ctx.fillStyle = accent; ctx.fill();
    ctx.fillStyle = BRAND.black; ctx.fillText(COMPANY_NAME, box.x+sq+6, by);
  }
  ctx.restore();
}

function drawLabels(p){
  const centers = iconCenters(LINK_TABLE);
  const vals = [state.linkedin, state.website, 'opraah.in'];
  ctx.save(); ctx.font = '500 12px -apple-system,Helvetica,Arial'; ctx.textAlign='left'; ctx.textBaseline='middle';
  vals.forEach((v, i) => {
    const rowP = easeOut(seg(p, 0.16 + i*0.06, 0.42 + i*0.06)); if(rowP <= 0 || !v) return;
    ctx.globalAlpha = rowP; ctx.fillStyle = BRAND.black;
    ctx.fillText(fitText(v, '500 12px -apple-system,Helvetica,Arial', LAY.labelMaxW), LAY.labelX, centers[i].y);
  });
  ctx.restore();
}

function drawFrame(p, caretOn){
  const accent = state.accent;

  drawStripBg(p); drawDecor(p); drawSocialIcons(p, LINK_TABLE); drawLabels(p); drawPhoto(p); drawLogo(p);

  const pName = seg(p, 0.32, 0.58);
  ctx.font = '700 20px -apple-system,Helvetica,Arial';
  const nameW = ctx.measureText(state.name.slice(0, Math.round(clamp01(pName)*state.name.length))).width;
  drawType(state.name, LAY.nameX, LAY.nameY, '700 20px -apple-system,Helvetica,Arial', BRAND.black, pName, caretOn, accent);
  if(state.badge){ const bp = seg(p, 0.58, 0.68); drawBadge(LAY.nameX+nameW+13, LAY.nameY-6, bp, accent); }

  fadeSlide(state.title,   LAY.nameX, LAY.titleY,   '600 13px -apple-system,Helvetica,Arial', accent,       seg(p, 0.52, 0.68));
  fadeSlide(state.company, LAY.nameX, LAY.companyY, '700 12.5px -apple-system,Helvetica,Arial', BRAND.orange, seg(p, 0.60, 0.76));
}

export default {
  id: 'sidebar',
  name: 'Sidebar',
  linkTable: LINK_TABLE,
  photoBox: { w: LAY.photo.r*2, h: LAY.photo.r*2 },
  drawFrame
};
