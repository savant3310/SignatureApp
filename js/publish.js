/* publish.js — the app's one primary action: render the intro animation to
 * a GIF in-browser (gif.js), upload it through /api/upload-signature to get
 * public URLs, then build and copy an HTML signature with the LinkedIn/
 * website/Instagram icons wired up as real, independently clickable links.
 *
 * A single embedded image can only carry one link, and Gmail's/Outlook's
 * signature editors strip position:absolute on paste (confirmed by testing),
 * so a CSS overlay of <a> tags doesn't survive. Instead this cuts the
 * rendered frame into rectangles — 3 tiny strips for the icons plus one
 * piece for the rest — and reassembles them as a plain HTML <table>, the
 * same "sliced image" technique used for clickable regions in HTML email
 * since before CSS positioning was safe to rely on there. Tables and plain
 * <a><img> survive paste sanitizers; position/left/top do not.
 *
 * The slice geometry comes from the active template's `linkTable` (see
 * link-table.js + js/templates/*.js) so this works the same for every
 * template regardless of which edge its icon strip sits on. When the
 * template also exposes a `linkedinRect` (a bounding box for user-entered
 * text it draws inside the "rest" piece), that piece gets split 5 ways
 * around it (see splitMainRect in link-table.js) so the text carries its
 * own link instead of inheriting the surrounding one.
 */
import { CFG, SOCIAL_LINKS } from './config.js';
import { canvas, ctx } from './canvas.js';
import { state } from './state.js';
import { drawFrame, activeTemplate } from './render.js';
import { sliceRects, splitMainRect } from './link-table.js';

const slug = s => (s || 'signature').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'signature';

/* Turns whatever a user typed into the LinkedIn field ("linkedin.com/in/x",
   "www.linkedin.com/in/x", a full https:// URL, ...) into an absolute URL
   so the carved-out text slice (see splitMainRect) links somewhere valid. */
function normalizeUrl(raw){
  const s = (raw || '').trim();
  if(!s) return null;
  return /^https?:\/\//i.test(s) ? s : 'https://' + s.replace(/^\/+/, '');
}

/* order the 3 icon slices are drawn in (see draw-utils.js drawSocialIcons) —
   must match cellSizes order in every template's linkTable */
const LINK_ORDER = [
  { key: 'linkedin', href: SOCIAL_LINKS.linkedin },
  { key: 'website', href: SOCIAL_LINKS.website },
  { key: 'instagram', href: SOCIAL_LINKS.instagram }
];

/* Renders the intro animation once, splitting each frame into per-slice
   canvases (per the active template's linkTable geometry, plus the 5-way
   split of "main" around textRect when there's LinkedIn text to carve out
   as its own link) and feeding each to its own gif.js encoder in lockstep so
   every GIF stays frame-synced. Returns a Blob per slice key — either
   { main, linkedin, website, instagram } or, when textRect is given,
   { 'main-top','main-left','main-text','main-right','main-bottom', linkedin, website, instagram }. */
function renderSlicedGifs(onProgress, textRect){
  return new Promise((resolve, reject) => {
    if(typeof window.GIF !== 'function'){ reject(new Error('Encoder not loaded (vendor/gif.js missing).')); return; }

    const { icon: iconRects, main: mainRect } = sliceRects(activeTemplate().linkTable);
    const mainSplit = splitMainRect(mainRect, textRect);
    const mainSlices = mainSplit
      ? [
          { key: 'main-top', ...mainSplit.top, workers: 2 },
          { key: 'main-left', ...mainSplit.left, workers: 1 },
          { key: 'main-text', ...mainSplit.text, workers: 1 },
          { key: 'main-right', ...mainSplit.right, workers: 1 },
          { key: 'main-bottom', ...mainSplit.bottom, workers: 1 }
        ]
      : [ { key: 'main', ...mainRect, workers: 2 } ];
    const slices = [
      ...LINK_ORDER.map((link, i) => ({ key: link.key, ...iconRects[i], workers: 1 })),
      ...mainSlices
    ];

    let watchdog;
    try{
      const rigs = slices.map(s => {
        const cv = document.createElement('canvas'); cv.width = s.w; cv.height = s.h;
        const sctx = cv.getContext('2d');
        const g = new window.GIF({ workers: s.workers, quality: 8, width: s.w, height: s.h, workerScript: 'vendor/gif.worker.js', background: CFG.BG, repeat: CFG.LOOP_REPEATS });
        return { ...s, cv, sctx, g, done: false };
      });

      watchdog = setTimeout(() => {
        if(rigs.some(r => !r.done)) reject(new Error('Encoding timed out — the GIF worker looks blocked. Make sure you\'re on the hosted/served link, not file://.'));
      }, 45000);

      const addFrame = (p, caretOn, delay) => {
        drawFrame(p, caretOn);
        rigs.forEach(r => {
          r.sctx.clearRect(0, 0, r.w, r.h);
          r.sctx.drawImage(canvas, r.x, r.y, r.w, r.h, 0, 0, r.w, r.h);
          r.g.addFrame(r.sctx, { copy: true, delay });
        });
      };

      for(let f = 0; f < CFG.INTRO_FRAMES; f++){
        addFrame(f/(CFG.INTRO_FRAMES-1), Math.floor(f/5)%2===0, CFG.FRAME_DELAY);
      }
      addFrame(1, false, CFG.HOLD_DELAY);

      let finishedCount = 0;
      const results = {};
      rigs.forEach(r => {
        r.g.on('progress', pr => { r.progress = pr; onProgress && onProgress(rigs.reduce((a, x) => a + (x.progress || 0), 0) / rigs.length); });
        r.g.on('finished', blob => { r.done = true; results[r.key] = blob; finishedCount++;
          if(finishedCount === rigs.length){ clearTimeout(watchdog); resolve(results); } });
        r.g.on('abort', () => { r.done = true; clearTimeout(watchdog); reject(new Error('Encoding aborted.')); });
        r.g.render();
      });
    } catch(e){ if(watchdog) clearTimeout(watchdog); reject(e); }
  });
}

function blobToDataUrl(blob){
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result);
    r.onerror = () => reject(r.error || new Error('Failed to read a rendered GIF'));
    r.readAsDataURL(blob);
  });
}

/* Plain-table reassembly, zero spacing/border, MSO-safe resets — no CSS
   position anywhere so it survives Gmail's/Outlook's paste sanitizer.
   Handles both linkTable orientations: 'column' (icon strip on the left or
   right, main cell rowspans across it) and 'row' (icon strip along the top
   or bottom, main cell colspans across it).

   When textRect is given, the "main" cell isn't one image — it's a nested
   table of the 5 pieces from splitMainRect, so the LinkedIn text can carry
   its own link to the user's profile while everything around it (name,
   photo, whitespace) keeps linking to the company website, exactly like
   before. */
function buildHtml(urls, linkTable, textRect){
  const { orientation, stripAt } = linkTable;
  const { icon: iconRects, main: mainRect } = sliceRects(linkTable);
  const mainSplit = splitMainRect(mainRect, textRect);

  const cellStyle = (w, h) => `width:${w}px;height:${h}px;padding:0;margin:0;font-size:0;line-height:0;mso-line-height-rule:exactly;`;
  const linkedImg = (key, r, href, alt) =>
    `<a href="${href}" target="_blank" rel="noopener" style="text-decoration:none;">` +
    `<img src="${urls[key]}" width="${r.w}" height="${r.h}" alt="${alt || ''}" style="display:block;border:0;outline:none;width:${r.w}px;height:${r.h}px;">` +
    `</a>`;

  const iconTds = LINK_ORDER.map((link, i) => {
    const r = iconRects[i];
    return `<td width="${r.w}" height="${r.h}" style="${cellStyle(r.w, r.h)}">${linkedImg(link.key, r, link.href)}</td>`;
  });

  const mainSpanAttr = orientation === 'column' ? `rowspan="${LINK_ORDER.length}"` : `colspan="${LINK_ORDER.length}"`;
  let mainTd;
  if(mainSplit){
    const linkedinHref = normalizeUrl(state.linkedin);
    const wideTd = (key, r, alt) => `<td colspan="3" width="${r.w}" height="${r.h}" style="${cellStyle(r.w, r.h)}">${linkedImg(key, r, SOCIAL_LINKS.website, alt)}</td>`;
    const inner =
      `<tr>${wideTd('main-top', mainSplit.top, state.name + ' signature')}</tr>\n` +
      `<tr>` +
        `<td width="${mainSplit.left.w}" height="${mainSplit.left.h}" style="${cellStyle(mainSplit.left.w, mainSplit.left.h)}">${linkedImg('main-left', mainSplit.left, SOCIAL_LINKS.website)}</td>` +
        `<td width="${mainSplit.text.w}" height="${mainSplit.text.h}" style="${cellStyle(mainSplit.text.w, mainSplit.text.h)}">${linkedImg('main-text', mainSplit.text, linkedinHref, state.name + ' on LinkedIn')}</td>` +
        `<td width="${mainSplit.right.w}" height="${mainSplit.right.h}" style="${cellStyle(mainSplit.right.w, mainSplit.right.h)}">${linkedImg('main-right', mainSplit.right, SOCIAL_LINKS.website)}</td>` +
      `</tr>\n` +
      `<tr>${wideTd('main-bottom', mainSplit.bottom)}</tr>`;
    mainTd = `<td width="${mainRect.w}" height="${mainRect.h}" ${mainSpanAttr} style="padding:0;margin:0;font-size:0;line-height:0;">` +
      `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;mso-table-lspace:0pt;mso-table-rspace:0pt;">\n${inner}\n</table>` +
      `</td>`;
  } else {
    mainTd = `<td width="${mainRect.w}" height="${mainRect.h}" ${mainSpanAttr} style="${cellStyle(mainRect.w, mainRect.h)}">${linkedImg('main', mainRect, SOCIAL_LINKS.website, state.name + ' signature')}</td>`;
  }

  let rowsHtml;
  if(orientation === 'column'){
    rowsHtml = iconTds.map((cell, i) => {
      if(i !== 0) return `<tr>${cell}</tr>`;
      return stripAt === 'start' ? `<tr>${cell}${mainTd}</tr>` : `<tr>${mainTd}${cell}</tr>`;
    }).join('\n');
  } else {
    const iconRow = `<tr>${iconTds.join('')}</tr>`;
    const mainRow = `<tr>${mainTd}</tr>`;
    rowsHtml = stripAt === 'start' ? `${iconRow}\n${mainRow}` : `${mainRow}\n${iconRow}`;
  }

  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;mso-table-lspace:0pt;mso-table-rspace:0pt;">\n${rowsHtml}\n</table>`;
}

/* Writes both text/html (so pasting into a rich-text signature box like
   Gmail's or Outlook's renders real links) and text/plain (source, as a
   fallback) to the clipboard. */
async function copyRich(html){
  if(navigator.clipboard && window.ClipboardItem){
    await navigator.clipboard.write([new window.ClipboardItem({
      'text/html': new Blob([html], { type: 'text/html' }),
      'text/plain': new Blob([html], { type: 'text/plain' })
    })]);
  } else if(navigator.clipboard && navigator.clipboard.writeText){
    await navigator.clipboard.writeText(html);
  } else {
    throw new Error('Clipboard access isn\'t available in this browser — copy the HTML manually.');
  }
}

export function makePublisher({ btn, setStatus, showProgress, setBar, restart }){
  btn.addEventListener('click', async () => {
    if(location.protocol === 'file:'){
      setStatus('⚠ This needs the page to be <b>served</b> (http/https), not opened as a local file. Open the hosted link, or run the start script.');
      return;
    }
    btn.disabled = true; showProgress(true); setStatus('Rendering frames…');
    try{
      const textRect = activeTemplate().linkedinRect ? activeTemplate().linkedinRect() : null;
      const blobs = await renderSlicedGifs(pr => { setBar(Math.round(pr*50)); setStatus('Encoding… ' + Math.round(pr*100) + '%'); }, textRect);
      const totalKb = (Object.values(blobs).reduce((a, b) => a + b.size, 0)/1024).toFixed(0);
      setBar(55); setStatus('Encoded (' + totalKb + ' KB total). Uploading…');

      const name = slug(state.name) + '-signature';
      const dataUrls = {};
      for(const key of Object.keys(blobs)) dataUrls[key] = await blobToDataUrl(blobs[key]);

      const r = await fetch('/api/upload-signature', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, slices: dataUrls })
      });
      const json = await r.json().catch(() => ({}));
      if(!r.ok) throw new Error(json.error || ('Upload failed (' + r.status + ')'));
      setBar(90);

      const html = buildHtml(json.urls, activeTemplate().linkTable, textRect);
      await copyRich(html);
      setBar(100);
      const linkedinNote = textRect ? ' (and the LinkedIn line itself)' : '';
      setStatus('Copied! Paste directly into your Gmail/Outlook signature editor — the signature links to the website, and LinkedIn/website/Instagram in the bar' + linkedinNote + ' are real clickable links too.');
      restart();
    }catch(e){
      setStatus('⚠ ' + (e && e.message ? e.message : e));
    }finally{
      btn.disabled = false; showProgress(false);
    }
  });
}
