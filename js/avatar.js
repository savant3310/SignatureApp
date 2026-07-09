/* avatar.js — talks to the /api/generate-avatar serverless proxy. The OpenAI
   key never touches the browser; this only ever sends the shared team
   passcode plus the employee's own already-uploaded photo. Requires the page
   to be served through Vercel (or `vercel dev`) — the endpoint doesn't exist
   under the plain python start scripts. */

function downscaledDataUrl(img, maxDim){
  const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
  const w = Math.max(1, Math.round(img.width * scale)), h = Math.max(1, Math.round(img.height * scale));
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  c.getContext('2d').drawImage(img, 0, 0, w, h);
  return c.toDataURL('image/png');
}

export async function generateAvatar(photoImg, passcode){
  const imageDataUrl = downscaledDataUrl(photoImg, 1024);
  const res = await fetch('/api/generate-avatar', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-passcode': passcode || '' },
    body: JSON.stringify({ imageDataUrl })
  });
  const json = await res.json().catch(() => ({}));
  if(!res.ok) throw new Error(json.error || ('Request failed (' + res.status + ')'));
  return json.image; // data URL
}
