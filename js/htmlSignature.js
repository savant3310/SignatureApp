/* htmlSignature.js — builds a clickable-icon version of the signature.
   A downloaded GIF/PNG is a flat image: Gmail/Outlook let you hyperlink the
   whole pasted image to one URL, but they don't support per-region hotspots
   inside it. So instead this wraps the (separately hosted) signature image
   in a small HTML fragment with three invisible <a> tags positioned exactly
   over the LinkedIn / website / Instagram icons drawn in the orange bar —
   pasting the *rendered* result into a rich-text signature box keeps those
   as real, independently clickable links. */
import { CFG, LAY, SOCIAL_LINKS } from './config.js';
import { state } from './state.js';

/* same top-to-bottom order the icons are drawn in (see render.js drawSocialIcons) */
const LINK_ORDER = [SOCIAL_LINKS.linkedin, SOCIAL_LINKS.website, SOCIAL_LINKS.instagram];

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

export function makeHtmlSignatureExporter({ btn, urlInput, setStatus }){
  btn.addEventListener('click', async () => {
    const imgUrl = (urlInput.value || '').trim();
    if(!imgUrl){
      setStatus('⚠ First download the GIF/PNG, upload it somewhere it gets a public URL (your site, an image host, etc.), then paste that URL into <b>Hosted image URL</b> above and click again.');
      urlInput.focus();
      return;
    }
    const html = buildHtml(imgUrl);
    try{
      await copyRich(html);
      setStatus('Copied! Paste directly into your Gmail/Outlook signature editor — the LinkedIn, website and Instagram icons in the bar are now real clickable links.');
    }catch(e){
      setStatus('⚠ Couldn\'t copy automatically (' + (e && e.message ? e.message : e) + '). HTML logged to the console — copy it from there.');
      console.log(html);
    }
  });
}
