/* main.js — wires the UI together: DOM refs, inputs, persistence, the crop
   editor, photo upload, export buttons, and the live-preview loop. */
import { CFG, ACCENTS, LAY, WEBSITE_URL } from './config.js';
import { state } from './state.js';
import { drawFrame } from './render.js';
import { makeAdjuster } from './adjuster.js';
import { makeExporter } from './exporter.js';
import { generateAvatar } from './avatar.js';

const $ = id => document.getElementById(id);
const els = {
  name:$('f-name'), title:$('f-title'), company:$('f-company'), linkedin:$('f-linkedin'),
  website:$('f-website'), phone:$('f-phone'), photo:$('f-photo'),
  photoLabel:$('photo-label'),
  status:$('status'), progress:$('progress'), progressBar:document.querySelector('#progress i'),
  swatches:$('swatches'), badgeSeg:$('badgeSeg'),
  replay:$('replay'), exportGif:$('export-gif'), exportPng:$('export-png'), dl:$('dl'),
  photoEditor:$('photoEditor'), photoCrop:$('photoCrop'), photoZoom:$('photoZoom'), photoReset:$('photoReset'),
  passcode:$('f-passcode'), passcodeToggle:$('passcodeToggle'), avatarBlock:$('avatarBlock'), genAvatar:$('genAvatar'), avatarToggle:$('avatarToggle'), avatarStatus:$('avatarStatus')
};

/* ---- reflect initial state into the default-valued inputs ---- */
els.name.value = state.name; els.title.value = state.title; els.company.value = state.company;
els.linkedin.value = state.linkedin; els.website.value = state.website; els.phone.value = state.phone;

/* ---- status / progress helpers ---- */
function setStatus(h){ els.status.innerHTML = h; }
function showProgress(on){ els.progress.classList.toggle('on', on); els.progressBar.style.width = '0%'; }
function setBar(pct){ els.progressBar.style.width = pct + '%'; }
function setAvatarStatus(h){ els.avatarStatus.innerHTML = h; }

/* ---- avatar passcode (kept separate from sig.cfg — it's a shared access
   gate for the paid generator API, not a rendering/branding setting) ---- */
function savePasscode(){ try{ localStorage.setItem('sig.passcode', els.passcode.value); }catch(e){} }
function loadPasscode(){ try{ const v = localStorage.getItem('sig.passcode'); if(v) els.passcode.value = v; }catch(e){} }
els.passcode.addEventListener('input', savePasscode);
els.passcodeToggle.addEventListener('click', () => {
  const show = els.passcode.type === 'password';
  els.passcode.type = show ? 'text' : 'password';
  els.passcodeToggle.textContent = show ? 'Hide' : 'Show';
});

/* ---- preview loop ---- */
let animStart = performance.now();
const INTRO_MS = CFG.INTRO_FRAMES * CFG.FRAME_DELAY, LOOP_PAUSE = 2600;
function tick(now){
  const t = now - animStart; let p, caret;
  if(t < INTRO_MS){ p = t/INTRO_MS; caret = Math.floor(now/450)%2 === 0; } else { p = 1; caret = false; }
  drawFrame(p, caret);
  if(t > INTRO_MS + LOOP_PAUSE) animStart = now;
  requestAnimationFrame(tick);
}
function restart(){ animStart = performance.now(); }

/* ---- persistence (company + style, saved in this browser) ---- */
function saveCfg(){ try{ localStorage.setItem('sig.cfg', JSON.stringify({
  company: state.company, accent: state.accent, badge: state.badge })); }catch(e){} }
function loadCfg(){ try{
  const d = JSON.parse(localStorage.getItem('sig.cfg') || 'null'); if(!d) return;
  if(d.company){ state.company = d.company; els.company.value = d.company; }
  if(d.accent) state.accent = d.accent;
  if(typeof d.badge === 'boolean') state.badge = d.badge;
}catch(e){} }

/* ---- accent swatches ---- */
ACCENTS.forEach(c => { const s = document.createElement('div'); s.className = 'swatch'; s.style.background = c;
  if(c === state.accent) s.classList.add('sel');
  s.onclick = () => { state.accent = c; saveCfg(); [...els.swatches.children].forEach(x=>x.classList.remove('sel')); s.classList.add('sel'); };
  els.swatches.appendChild(s); });

/* ---- verified badge toggle ---- */
[...els.badgeSeg.children].forEach(b => b.onclick = () => { state.badge = b.dataset.v === '1';
  [...els.badgeSeg.children].forEach(x => x.classList.remove('on')); b.classList.add('on'); saveCfg(); restart(); });

/* ---- crop editor ---- */
const photoAdj = makeAdjuster({ canvas: els.photoCrop, slider: els.photoZoom, reset: els.photoReset, cw: 300,
  box: { w: LAY.pw, h: LAY.ph }, fit: 'cover', getSource: () => state.photoImg, adjust: state.photoAdjust, onCommit: saveCfg });

/* ---- text inputs ---- */
function bind(el, key, after){ el.addEventListener('input', () => { state[key] = el.value; if(after) after(); restart(); }); }
bind(els.name,'name'); bind(els.title,'title'); bind(els.company,'company', saveCfg);
bind(els.linkedin,'linkedin'); bind(els.website,'website'); bind(els.phone,'phone');
els.replay.onclick = restart;

/* ---- photo upload ---- */
function showImage(img){
  state.photoImg = img; state.photoAdjust.zoom = 1; state.photoAdjust.ox = 0; state.photoAdjust.oy = 0;
  els.photoZoom.value = 1; photoAdj.render(); restart();
}
els.photo.addEventListener('change', e => { const f = e.target.files[0]; if(!f) return;
  const img = new Image();
  img.onload = () => { state.photoOriginalImg = img; state.avatarImg = null; showImage(img);
    els.photoEditor.style.display = 'block';
    els.avatarBlock.style.display = 'block'; els.genAvatar.style.display = 'inline-block'; els.genAvatar.disabled = false;
    els.avatarToggle.style.display = 'none'; setAvatarStatus(''); };
  img.src = URL.createObjectURL(f); els.photoLabel.textContent = f.name; });

/* ---- animated avatar generation (calls the /api/generate-avatar proxy —
   never talks to OpenAI directly, so no API key is ever present in this
   file or the browser). Generated once per uploaded photo and cached in
   state.avatarImg — switching back and forth afterward never calls the API
   again, so it never costs more credits. ---- */
els.genAvatar.addEventListener('click', async () => {
  if(!state.photoImg) return;
  els.genAvatar.disabled = true; setAvatarStatus('Generating… this can take up to 30s.');
  try{
    const dataUrl = await generateAvatar(state.photoImg, els.passcode.value);
    const img = new Image();
    img.onload = () => { state.avatarImg = img; showImage(img);
      els.genAvatar.style.display = 'none';
      els.avatarToggle.textContent = 'Use original photo'; els.avatarToggle.style.display = 'inline-block';
      setAvatarStatus('Animated avatar applied.'); };
    img.src = dataUrl;
  }catch(err){ setAvatarStatus('⚠ ' + (err && err.message ? err.message : err)); els.genAvatar.disabled = false; }
});
els.avatarToggle.addEventListener('click', () => {
  const showingAvatar = state.photoImg === state.avatarImg;
  showImage(showingAvatar ? state.photoOriginalImg : state.avatarImg);
  els.avatarToggle.textContent = showingAvatar ? 'Use generated avatar' : 'Use original photo';
  setAvatarStatus(showingAvatar ? 'Showing your original photo.' : 'Showing the generated avatar.');
});

/* ---- export buttons ---- */
makeExporter({ gifBtn: els.exportGif, pngBtn: els.exportPng, dl: els.dl, setStatus, showProgress, setBar, restart });

/* ---- fixed logo + website icon images (assets/*.png) — not user-configurable;
   the logo drops out to a text wordmark in render.js if its file isn't present ---- */
(() => { const img = new Image(); img.onload = () => { state.logoImg = img; restart(); }; img.src = 'assets/logo.png'; })();
(() => { const img = new Image(); img.onload = () => { state.websiteIconImg = img; restart(); }; img.src = 'assets/icon-website.png'; })();

/* ---- boot ---- */
$('site-url').textContent = WEBSITE_URL;
loadCfg();
loadPasscode();
photoAdj.render();
if(location.protocol === 'file:'){
  setStatus('⚠ You\'re viewing this as a local file. It previews fine, but <b>GIF export needs the hosted link</b> (or the start script). See the note below.');
}
requestAnimationFrame(tick);
