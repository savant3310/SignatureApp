/* logo.js — load a logo from a data URL. Animated GIFs are decoded (via the
   global window.gifuct) into fully-composited frames + delays; other images
   load as a single still. Updates state.logo, then calls the provided hooks. */
import { state } from './state.js';
import { loadImg } from './util.js';

function mkCanvas(w, h){ const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }

export async function loadLogo(dataURL, hooks = {}){
  const { onDone, onError, setLabel } = hooks;
  try{
    if(/^data:image\/gif/i.test(dataURL) && window.gifuct){
      const buf = await (await fetch(dataURL)).arrayBuffer();
      const gif = window.gifuct.parseGIF(buf);
      const raw = window.gifuct.decompressFrames(gif, true);
      if(raw.length > 1){
        const W = gif.lsd.width, H = gif.lsd.height;
        const full = mkCanvas(W, H); const fx = full.getContext('2d');
        const frames = []; let prevDisposal = 0, prevRect = null;
        for(const fr of raw){
          if(prevDisposal === 2 && prevRect) fx.clearRect(prevRect.left, prevRect.top, prevRect.width, prevRect.height);
          const tmp = mkCanvas(fr.dims.width, fr.dims.height);
          tmp.getContext('2d').putImageData(new ImageData(new Uint8ClampedArray(fr.patch), fr.dims.width, fr.dims.height), 0, 0);
          fx.drawImage(tmp, fr.dims.left, fr.dims.top);
          const snap = mkCanvas(W, H); snap.getContext('2d').drawImage(full, 0, 0);
          frames.push({ canvas: snap, delay: Math.max(20, fr.delay || 100) });
          prevDisposal = fr.disposalType; prevRect = fr.dims;
        }
        const totalDelay = frames.reduce((s, f) => s + f.delay, 0);
        state.logo = { type: 'gif', src: dataURL, img: null, frames, totalDelay, adjust: state.logo.adjust || { zoom:1, ox:0, oy:0 } };
        setLabel && setLabel('Animated logo ✓ (' + frames.length + ' frames)');
      } else {
        const img = await loadImg(dataURL);
        state.logo = { type: 'image', src: dataURL, img, frames: null, totalDelay: 0, adjust: state.logo.adjust || { zoom:1, ox:0, oy:0 } };
        setLabel && setLabel('Logo ✓');
      }
    } else {
      const img = await loadImg(dataURL);
      state.logo = { type: 'image', src: dataURL, img, frames: null, totalDelay: 0, adjust: state.logo.adjust || { zoom:1, ox:0, oy:0 } };
      setLabel && setLabel('Logo ✓');
    }
    onDone && onDone();
  } catch(err){ onError && onError(err); }
}
