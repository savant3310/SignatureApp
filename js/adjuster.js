/* adjuster.js — reusable drag + zoom crop editor.
   Edits an {zoom,ox,oy} object against a target box aspect, live.
   Used for the headshot (fit 'cover'); also supports fit 'contain' for any
   future image element positioned without cropping. */
import { clamp, place } from './util.js';

export function makeAdjuster(o){
  const c = o.canvas, cx = c.getContext('2d');
  c.width = o.cw; c.height = Math.round(o.cw * o.box.h / o.box.w);
  const ES = () => c.width / o.box.w;   // editor pixels per box pixel

  function render(){
    cx.clearRect(0, 0, c.width, c.height);
    if(o.fit === 'contain'){                         // checkerboard behind transparent logos
      const t = 8;
      for(let y=0;y<c.height;y+=t) for(let x=0;x<c.width;x+=t){ cx.fillStyle = ((x+y)/t)%2 ? '#141a2b' : '#1b2138'; cx.fillRect(x, y, t, t); }
    } else { cx.fillStyle = '#0c1020'; cx.fillRect(0, 0, c.width, c.height); }

    const src = o.getSource();
    if(src){ const e = ES(); const pl = place(src.width, src.height, o.box, o.adjust, o.fit);
      cx.drawImage(src, pl.dx*e, pl.dy*e, pl.dw*e, pl.dh*e); }

    cx.strokeStyle = 'rgba(91,124,250,.9)'; cx.lineWidth = 2; cx.strokeRect(1, 1, c.width-2, c.height-2);
    if(o.fit === 'cover'){                            // rule-of-thirds guide
      cx.strokeStyle = 'rgba(255,255,255,.35)'; cx.lineWidth = 1;
      for(let i=1;i<3;i++){ cx.beginPath(); cx.moveTo(c.width*i/3, 0); cx.lineTo(c.width*i/3, c.height); cx.moveTo(0, c.height*i/3); cx.lineTo(c.width, c.height*i/3); cx.stroke(); }
    }
    if(!src){ cx.fillStyle = '#9aa3c4'; cx.font = '12px sans-serif'; cx.textAlign = 'center'; cx.fillText('No image yet', c.width/2, c.height/2); }
  }

  let drag = false, lx = 0, ly = 0;
  c.addEventListener('pointerdown', e => { if(!o.getSource()) return; drag = true; lx = e.offsetX; ly = e.offsetY; c.setPointerCapture(e.pointerId); });
  c.addEventListener('pointermove', e => { if(!drag) return; const e2 = ES(); o.adjust.ox += (e.offsetX-lx)/e2; o.adjust.oy += (e.offsetY-ly)/e2; lx = e.offsetX; ly = e.offsetY; render(); o.onChange && o.onChange(); });
  c.addEventListener('pointerup', () => { drag = false; o.onCommit && o.onCommit(); });
  c.addEventListener('wheel', e => { if(!o.getSource()) return; e.preventDefault();
    o.adjust.zoom = clamp((o.adjust.zoom||1)*(1 - e.deltaY*0.0012), +o.slider.min, +o.slider.max);
    o.slider.value = o.adjust.zoom; render(); o.onChange && o.onChange(); o.onCommit && o.onCommit(); }, { passive: false });
  o.slider.addEventListener('input', () => { o.adjust.zoom = +o.slider.value; render(); o.onChange && o.onChange(); });
  o.slider.addEventListener('change', () => { o.onCommit && o.onCommit(); });
  o.reset.addEventListener('click', () => { o.adjust.zoom = 1; o.adjust.ox = 0; o.adjust.oy = 0; o.slider.value = 1; render(); o.onChange && o.onChange(); o.onCommit && o.onCommit(); });

  return {
    render,
    syncSlider: () => { o.slider.value = o.adjust.zoom || 1; },
    /* Call after mutating o.box in place (e.g. switching to a template with
       a differently-shaped photo box) — resizes the editor canvas to match
       the new aspect ratio, since that's only computed once at creation. */
    setBox: box => { o.box.w = box.w; o.box.h = box.h; c.height = Math.round(o.cw * o.box.h / o.box.w); render(); }
  };
}
