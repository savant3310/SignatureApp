/* exporter.js — build the downloadable files.
   GIF export uses the global window.GIF (gif.js) with a web worker, so it must
   run on a served page (http/https), NOT a double-clicked file:// page — the
   guard + watchdog below explain that clearly instead of failing silently. */
import { CFG } from './config.js';
import { canvas, ctx } from './canvas.js';
import { state } from './state.js';
import { drawFrame } from './render.js';

const slug = s => (s||'signature').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'') || 'signature';

export function makeExporter({ gifBtn, pngBtn, dl, setStatus, showProgress, setBar, restart }){
  function download(blob, name){ const url = URL.createObjectURL(blob); dl.href = url; dl.download = name; dl.click(); }

  function gif(){
    if(location.protocol === 'file:'){
      setStatus('⚠ GIF export needs the page to be <b>served</b> (http/https). Open the hosted link, or run the start script — a double-clicked file can\'t start the encoder.');
      return;
    }
    if(typeof window.GIF !== 'function'){ setStatus('⚠ Encoder not loaded (vendor/gif.js missing).'); return; }
    let g, done = false, watchdog;
    try{
      gifBtn.disabled = true; showProgress(true); setStatus('Rendering frames…');
      g = new window.GIF({ workers:2, quality:8, width:CFG.W, height:CFG.H, workerScript:'vendor/gif.worker.js', background:CFG.BG, repeat:-1 });

      watchdog = setTimeout(() => { if(!done){ showProgress(false); gifBtn.disabled = false;
        setStatus('⚠ Encoding timed out — the GIF worker looks blocked. Make sure you\'re on the hosted/served link, not file://.'); } }, 30000);

      for(let f=0; f<CFG.INTRO_FRAMES; f++){
        drawFrame(f/(CFG.INTRO_FRAMES-1), Math.floor(f/5)%2===0, f*CFG.FRAME_DELAY);
        g.addFrame(ctx, { copy:true, delay:CFG.FRAME_DELAY });
      }
      drawFrame(1, false, CFG.INTRO_FRAMES*CFG.FRAME_DELAY);
      g.addFrame(ctx, { copy:true, delay:CFG.HOLD_DELAY });

      g.on('progress', pr => { setBar(Math.round(pr*100)); setStatus('Encoding… ' + Math.round(pr*100) + '%'); });
      g.on('finished', blob => {
        done = true; clearTimeout(watchdog); showProgress(false); gifBtn.disabled = false;
        const name = slug(state.name) + '-signature.gif'; download(blob, name);
        const kb = (blob.size/1024).toFixed(0);
        const warn = blob.size > 1024*1024 ? ' <b style="color:#f5a623">(over 1 MB — try a smaller photo or shorter logo GIF)</b>' : '';
        setStatus('Saved <b>' + name + '</b> — ' + kb + ' KB.' + warn + ' Add it to your email signature as an image.');
        restart();
      });
      g.on('abort', () => { done = true; clearTimeout(watchdog); showProgress(false); gifBtn.disabled = false; setStatus('⚠ Encoding aborted.'); });
      g.render();
    } catch(e){
      if(watchdog) clearTimeout(watchdog); showProgress(false); gifBtn.disabled = false;
      setStatus('⚠ Export failed: ' + (e && e.message ? e.message : e));
    }
  }

  function png(){
    try{
      drawFrame(1, false, CFG.INTRO_FRAMES*CFG.FRAME_DELAY);
      canvas.toBlob(b => { download(b, slug(state.name) + '-signature.png');
        setStatus('Saved static PNG (final frame) — a safe fallback for clients that block GIFs.'); restart(); }, 'image/png');
    } catch(e){ setStatus('⚠ PNG export failed: ' + (e && e.message ? e.message : e)); }
  }

  gifBtn.addEventListener('click', gif);
  pngBtn.addEventListener('click', png);
  return { gif, png };
}
