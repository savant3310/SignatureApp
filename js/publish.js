/* publish.js — the app's one primary action: render the intro animation to
 * a GIF in-browser (gif.js), upload it through /api/upload-signature to get
 * public URLs, then build and copy an HTML signature with the LinkedIn/
 * website/Instagram icons wired up as real, independently clickable links.
 *
 * A single embedded image can only carry one link, and Gmail's/Outlook's
 * signature editors strip position:absolute on paste (confirmed by testing),
 * so a CSS overlay of <a> tags doesn't survive. Instead this cuts the
 * rendered frame into 4 rectangles — 3 tiny strips for the icons plus one
 * piece for the rest — and reassembles them as a plain HTML <table>, the
 * same "sliced image" technique used for clickable regions in HTML email
 * since before CSS positioning was safe to rely on there. Tables and plain
 * <a><img> survive paste sanitizers; position/left/top do not.
 *
 * The slice geometry comes from the active template's `linkTable` (see
 * link-table.js + js/templates/*.js) so this works the same for every
 * template regardless of which edge its icon strip sits on.
 */
import { CFG, SOCIAL_LINKS } from './config.js';
import { canvas, ctx } from './canvas.js';
import { state } from './state.js';
import { drawFrame, activeTemplate } from './render.js';
import { sliceRects } from './link-table.js';

const slug = s => (s || 'signature').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'signature';

/* order the 3 icon slices are drawn in (see draw-utils.js drawSocialIcons) —
   must match cellSizes order in every template's linkTable */
const LINK_ORDER = [
  { key: 'linkedin', href: SOCIAL_LINKS.linkedin },
  { key: 'website', href: SOCIAL_LINKS.website },
  { key: 'instagram', href: SOCIAL_LINKS.instagram }
];

/* Renders the intro animation once, splitting each frame into the 4 slice
   canvases (per the active template's linkTable geometry) and feeding each
   to its own gif.js encoder in lockstep so all 4 GIFs stay frame-synced.
   Returns { main, linkedin, website, instagram } Blobs. */
function renderSlicedGifs(onProgress){
  return new Promise((resolve, reject) => {
    if(typeof window.GIF !== 'function'){ reject(new Error('Encoder not loaded (vendor/gif.js missing).')); return; }

    const { icon: iconRects, main: mainRect } = sliceRects(activeTemplate().linkTable);
    const slices = [
      ...LINK_ORDER.map((link, i) => ({ key: link.key, ...iconRects[i], workers: 1 })),
      { key: 'main', ...mainRect, workers: 2 }
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
   or bottom, main cell colspans across it). */
function buildHtml(urls, linkTable){
  const { orientation, stripAt } = linkTable;
  const { icon: iconRects } = sliceRects(linkTable);

  const cellStyle = (w, h) => `width:${w}px;height:${h}px;padding:0;margin:0;font-size:0;line-height:0;mso-line-height-rule:exactly;`;
  const iconTds = LINK_ORDER.map((link, i) => {
    const r = iconRects[i];
    return `<td width="${r.w}" height="${r.h}" style="${cellStyle(r.w, r.h)}">` +
      `<a href="${link.href}" target="_blank" rel="noopener" style="text-decoration:none;">` +
      `<img src="${urls[link.key]}" width="${r.w}" height="${r.h}" alt="" style="display:block;border:0;outline:none;width:${r.w}px;height:${r.h}px;">` +
      `</a></td>`;
  });

  const { main: mainRect } = sliceRects(linkTable);
  const mainSpanAttr = orientation === 'column' ? `rowspan="${LINK_ORDER.length}"` : `colspan="${LINK_ORDER.length}"`;
  const mainTd = `<td width="${mainRect.w}" height="${mainRect.h}" ${mainSpanAttr} style="${cellStyle(mainRect.w, mainRect.h)}">` +
    `<a href="${SOCIAL_LINKS.website}" target="_blank" rel="noopener" style="text-decoration:none;">` +
    `<img src="${urls.main}" width="${mainRect.w}" height="${mainRect.h}" alt="${state.name} signature" style="display:block;border:0;outline:none;width:${mainRect.w}px;height:${mainRect.h}px;">` +
    `</a></td>`;

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
      const blobs = await renderSlicedGifs(pr => { setBar(Math.round(pr*50)); setStatus('Encoding… ' + Math.round(pr*100) + '%'); });
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

      const html = buildHtml(json.urls, activeTemplate().linkTable);
      await copyRich(html);
      setBar(100);
      setStatus('Copied! Paste directly into your Gmail/Outlook signature editor — the signature links to the website, and LinkedIn/website/Instagram in the bar are real clickable links too.');
      restart();
    }catch(e){
      setStatus('⚠ ' + (e && e.message ? e.message : e));
    }finally{
      btn.disabled = false; showProgress(false);
    }
  });
}
