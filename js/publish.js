/* publish.js — the app's one primary action: render the intro animation to
 * a GIF in-browser (gif.js), upload it through /api/upload-signature to get
 * a public URL, then build and copy an HTML fragment that embeds that image
 * with the LinkedIn/website/Instagram icons in the orange bar wired up as
 * real, independently clickable links (a flat pasted image alone can't do
 * that — see the <a> overlay in buildHtml below).
 */
import { CFG, LAY, SOCIAL_LINKS } from './config.js';
import { canvas, ctx } from './canvas.js';
import { state } from './state.js';
import { drawFrame } from './render.js';

const slug = s => (s || 'signature').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'signature';

/* same top-to-bottom order the icons are drawn in (see render.js drawSocialIcons) */
const LINK_ORDER = [SOCIAL_LINKS.linkedin, SOCIAL_LINKS.website, SOCIAL_LINKS.instagram];

function renderGif(onProgress){
  return new Promise((resolve, reject) => {
    if(typeof window.GIF !== 'function'){ reject(new Error('Encoder not loaded (vendor/gif.js missing).')); return; }
    let g, done = false, watchdog;
    try{
      g = new window.GIF({ workers:2, quality:8, width:CFG.W, height:CFG.H, workerScript:'vendor/gif.worker.js', background:CFG.BG, repeat:CFG.LOOP_REPEATS });
      watchdog = setTimeout(() => { if(!done) reject(new Error('Encoding timed out — the GIF worker looks blocked. Make sure you\'re on the hosted/served link, not file://.')); }, 30000);

      for(let f=0; f<CFG.INTRO_FRAMES; f++){
        drawFrame(f/(CFG.INTRO_FRAMES-1), Math.floor(f/5)%2===0);
        g.addFrame(ctx, { copy:true, delay:CFG.FRAME_DELAY });
      }
      drawFrame(1, false);
      g.addFrame(ctx, { copy:true, delay:CFG.HOLD_DELAY });

      g.on('progress', pr => onProgress && onProgress(pr));
      g.on('finished', blob => { done = true; clearTimeout(watchdog); resolve(blob); });
      g.on('abort', () => { done = true; clearTimeout(watchdog); reject(new Error('Encoding aborted.')); });
      g.render();
    } catch(e){ if(watchdog) clearTimeout(watchdog); reject(e); }
  });
}

function blobToDataUrl(blob){
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result);
    r.onerror = () => reject(r.error || new Error('Failed to read the rendered GIF'));
    r.readAsDataURL(blob);
  });
}

function buildHtml(imgUrl){
  const b = LAY.iconBar;
  const areas = LINK_ORDER.map((href, i) => {
    const y = b.ys[i], s = b.size, top = Math.round(y - s/2), left = Math.round(b.cx - s/2);
    return `<a href="${href}" target="_blank" rel="noopener" style="position:absolute;left:${left}px;top:${top}px;width:${s}px;height:${s}px;display:block;"></a>`;
  }).join('\n  ');
  return `<div style="position:relative;width:${CFG.W}px;height:${CFG.H}px;line-height:0;font-size:0;">
  <img src="${imgUrl}" width="${CFG.W}" height="${CFG.H}" alt="${state.name} signature" style="display:block;border:0;max-width:100%;">
  ${areas}
</div>`;
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
      const blob = await renderGif(pr => { setBar(Math.round(pr*50)); setStatus('Encoding… ' + Math.round(pr*100) + '%'); });
      const kb = (blob.size/1024).toFixed(0);
      const warn = blob.size > 1024*1024 ? ' (over 1 MB — consider a smaller photo)' : '';
      setBar(55); setStatus('Encoded (' + kb + ' KB' + warn + '). Uploading…');

      const imageDataUrl = await blobToDataUrl(blob);
      const r = await fetch('/api/upload-signature', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageDataUrl, name: slug(state.name) + '-signature' })
      });
      const json = await r.json().catch(() => ({}));
      if(!r.ok) throw new Error(json.error || ('Upload failed (' + r.status + ')'));
      setBar(90);

      const html = buildHtml(json.url);
      await copyRich(html);
      setBar(100);
      setStatus('Copied! Paste directly into your Gmail/Outlook signature editor — LinkedIn, website and Instagram in the bar are real clickable links. Hosted at <a href="' + json.url + '" target="_blank" rel="noopener">' + json.url + '</a>.');
      restart();
    }catch(e){
      setStatus('⚠ ' + (e && e.message ? e.message : e));
    }finally{
      btn.disabled = false; showProgress(false);
    }
  });
}
