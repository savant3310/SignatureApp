/* main.js — wires the UI together: DOM refs, inputs, persistence, the crop
   editors, logo/photo upload, export buttons, and the live-preview loop. */
import { CFG, ACCENTS, ALL_SOCIALS, LAY } from './config.js';
import { state } from './state.js';
import { drawFrame, currentLogoFrame } from './render.js';
import { makeAdjuster } from './adjuster.js';
import { loadLogo } from './logo.js';
import { makeExporter } from './exporter.js';

const $ = id => document.getElementById(id);
const els = {
  name:$('f-name'), title:$('f-title'), company:$('f-company'), email:$('f-email'),
  website:$('f-website'), phone:$('f-phone'), photo:$('f-photo'), logo:$('f-logo'),
  photoLabel:$('photo-label'), logoLabel:$('logo-label'),
  status:$('status'), progress:$('progress'), progressBar:document.querySelector('#progress i'),
  swatches:$('swatches'), socialChecks:$('socialChecks'), badgeSeg:$('badgeSeg'),
  replay:$('replay'), exportGif:$('export-gif'), exportPng:$('export-png'), dl:$('dl'),
  photoEditor:$('photoEditor'), photoCrop:$('photoCrop'), photoZoom:$('photoZoom'), photoReset:$('photoReset'),
  logoEditor:$('logoEditor'), logoCrop:$('logoCrop'), logoZoom:$('logoZoom'), logoReset:$('logoReset')
};

/* ---- reflect initial state into the default-valued inputs ---- */
els.name.value = state.name; els.title.value = state.title; els.company.value = state.company;
els.email.value = state.email; els.website.value = state.website; els.phone.value = state.phone;

/* ---- status / progress helpers ---- */
function setStatus(h){ els.status.innerHTML = h; }
function showProgress(on){ els.progress.classList.toggle('on', on); els.progressBar.style.width = '0%'; }
function setBar(pct){ els.progressBar.style.width = pct + '%'; }

/* ---- preview loop ---- */
let animStart = performance.now();
const INTRO_MS = CFG.INTRO_FRAMES * CFG.FRAME_DELAY, LOOP_PAUSE = 2600;
function tick(now){
  const t = now - animStart; let p, caret;
  if(t < INTRO_MS){ p = t/INTRO_MS; caret = Math.floor(now/450)%2 === 0; } else { p = 1; caret = false; }
  drawFrame(p, caret, now);
  if(t > INTRO_MS + LOOP_PAUSE) animStart = now;
  requestAnimationFrame(tick);
}
function restart(){ animStart = performance.now(); }

/* ---- persistence (company + style, saved in this browser) ---- */
function saveCfg(){ try{ localStorage.setItem('sig.cfg', JSON.stringify({
  company: state.company, accent: state.accent, socials: state.socials, badge: state.badge,
  logoSrc: state.logo.src, logoAdjust: state.logo.adjust })); }catch(e){} }
function loadCfg(){ try{
  const d = JSON.parse(localStorage.getItem('sig.cfg') || 'null'); if(!d) return;
  if(d.company){ state.company = d.company; els.company.value = d.company; }
  if(d.accent) state.accent = d.accent;
  if(Array.isArray(d.socials)) state.socials = d.socials;
  if(typeof d.badge === 'boolean') state.badge = d.badge;
  if(d.logoAdjust) state.logo.adjust = d.logoAdjust;
  if(d.logoSrc) loadLogo(d.logoSrc, { onDone:()=>{ showLogoEditor(); logoAdj.render(); restart(); }, setLabel:t=>els.logoLabel.textContent=t });
}catch(e){} }

/* ---- accent swatches ---- */
ACCENTS.forEach(c => { const s = document.createElement('div'); s.className = 'swatch'; s.style.background = c;
  if(c === state.accent) s.classList.add('sel');
  s.onclick = () => { state.accent = c; saveCfg(); [...els.swatches.children].forEach(x=>x.classList.remove('sel')); s.classList.add('sel'); };
  els.swatches.appendChild(s); });

/* ---- social toggles ---- */
function buildSocialChecks(){ els.socialChecks.innerHTML = '';
  ALL_SOCIALS.forEach(k => { const l = document.createElement('label'); const cb = document.createElement('input');
    cb.type = 'checkbox'; cb.checked = state.socials.includes(k);
    cb.onchange = () => { state.socials = ALL_SOCIALS.filter(s => s===k ? cb.checked : state.socials.includes(s)); saveCfg(); restart(); };
    l.appendChild(cb); l.appendChild(document.createTextNode(' ' + k[0].toUpperCase() + k.slice(1))); els.socialChecks.appendChild(l); }); }

/* ---- verified badge toggle ---- */
[...els.badgeSeg.children].forEach(b => b.onclick = () => { state.badge = b.dataset.v === '1';
  [...els.badgeSeg.children].forEach(x => x.classList.remove('on')); b.classList.add('on'); saveCfg(); restart(); });

/* ---- crop editors ---- */
const photoAdj = makeAdjuster({ canvas: els.photoCrop, slider: els.photoZoom, reset: els.photoReset, cw: 300,
  box: { w: LAY.pw, h: LAY.ph }, fit: 'cover', getSource: () => state.photoImg, adjust: state.photoAdjust, onCommit: saveCfg });
const logoAdj = makeAdjuster({ canvas: els.logoCrop, slider: els.logoZoom, reset: els.logoReset, cw: 300,
  box: { w: LAY.logoBox.w, h: LAY.logoBox.h }, fit: 'contain',
  getSource: () => state.logo.type === 'gif' ? currentLogoFrame(0) : (state.logo.type === 'image' ? state.logo.img : null),
  adjust: state.logo.adjust, onCommit: saveCfg });
function showLogoEditor(){ els.logoEditor.style.display = 'block'; logoAdj.syncSlider(); }

/* ---- auto-load a bundled logo (assets/logo.png) if present ---- */
function tryBundledLogo(){ if(state.logo.src) return; const img = new Image();
  img.onload = () => { if(!state.logo.src){ state.logo = { type:'image', src:'assets/logo.png', img, frames:null, totalDelay:0, adjust: state.logo.adjust }; showLogoEditor(); logoAdj.render(); } };
  img.onerror = () => {}; img.src = 'assets/logo.png'; }

/* ---- text inputs ---- */
function bind(el, key, after){ el.addEventListener('input', () => { state[key] = el.value; if(after) after(); restart(); }); }
bind(els.name,'name'); bind(els.title,'title'); bind(els.company,'company', saveCfg);
bind(els.email,'email'); bind(els.website,'website'); bind(els.phone,'phone');
els.replay.onclick = restart;

/* ---- photo upload ---- */
els.photo.addEventListener('change', e => { const f = e.target.files[0]; if(!f) return;
  const img = new Image();
  img.onload = () => { state.photoImg = img; state.photoAdjust.zoom = 1; state.photoAdjust.ox = 0; state.photoAdjust.oy = 0;
    els.photoZoom.value = 1; els.photoEditor.style.display = 'block'; photoAdj.render(); restart(); };
  img.src = URL.createObjectURL(f); els.photoLabel.textContent = f.name; });

/* ---- logo upload ---- */
els.logo.addEventListener('change', e => { const f = e.target.files[0]; if(!f) return; const r = new FileReader();
  r.onload = () => { state.logo.adjust = { zoom:1, ox:0, oy:0 };
    loadLogo(r.result, { onDone:()=>{ showLogoEditor(); logoAdj.render(); saveCfg(); restart(); },
      onError:()=> setStatus('Could not read that logo. Try a PNG or a standard animated GIF.'),
      setLabel:t=>els.logoLabel.textContent=t }); };
  r.readAsDataURL(f); });

/* ---- export buttons ---- */
makeExporter({ gifBtn: els.exportGif, pngBtn: els.exportPng, dl: els.dl, setStatus, showProgress, setBar, restart });

/* ---- boot ---- */
loadCfg();
buildSocialChecks();
tryBundledLogo();
photoAdj.render();
logoAdj.render();
if(location.protocol === 'file:'){
  setStatus('⚠ You\'re viewing this as a local file. It previews fine, but <b>GIF export needs the hosted link</b> (or the start script). See the note below.');
}
requestAnimationFrame(tick);
