/* api/generate-avatar.js — Vercel serverless function. This is the ONLY place
 * OPENAI_API_KEY is ever read; it lives in a Vercel environment variable and
 * never reaches the browser. The client sends just: a shared team passcode
 * (also a server-only env var) + the employee's own uploaded photo.
 *
 * The stylization prompt is fixed here, not accepted from the client — so
 * this endpoint can't be repurposed into a general "generate anything" free
 * image proxy even by someone who has the passcode.
 *
 * Defense in depth (the passcode is the primary gate; the rest just reduce
 * blast radius / cost if the passcode leaks):
 *   - photo size cap, so a single call can't be made arbitrarily expensive
 *   - a per-instance in-memory rate limit (best-effort only — serverless
 *     instances are ephemeral/parallel, this is not a substitute for setting
 *     a hard spend cap on the OpenAI account itself)
 */

const crypto = require('crypto');

const MAX_IMAGE_BYTES = 3 * 1024 * 1024; // raw bytes; keeps base64 payload under Vercel's request-body limit
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX = 5;
const PROMPT = `Transform this portrait into a beautiful Studio Ghibli-inspired illustration while preserving the person's exact facial features, hairstyle, expression, skin tone, and pose. Create a soft, hand-painted anime aesthetic with delicate watercolor textures, warm pastel colors, expressive eyes, subtle blush, and gentle lighting. Keep the loose black top and natural hairstyle unchanged. Use a clean, warm beige background with a dreamy atmosphere. The artwork should feel like a frame from a Studio Ghibli film—peaceful, elegant, nostalgic, and full of warmth. Soft painterly shading, delicate linework, cinematic composition, natural proportions, high detail, premium quality, magical realism, subtle depth of field, 8K illustration.`;

const hitsByIp = new Map();

function rateLimited(ip) {
  const now = Date.now();
  const hits = (hitsByIp.get(ip) || []).filter(t => now - t < RATE_LIMIT_WINDOW_MS);
  hits.push(now);
  hitsByIp.set(ip, hits);
  return hits.length > RATE_LIMIT_MAX;
}

function passcodeMatches(supplied, expected) {
  const a = Buffer.from(String(supplied || ''));
  const b = Buffer.from(String(expected || ''));
  if (a.length !== b.length) return false; // timingSafeEqual requires equal-length buffers
  return crypto.timingSafeEqual(a, b);
}

module.exports = async function handler(req, res) {
  try {
    if (req.method !== 'POST') { res.status(405).json({ error: 'Method not allowed' }); return; }

    const apiKey = process.env.OPENAI_API_KEY;
    const passcode = process.env.AVATAR_PASSCODE;
    if (!apiKey || !passcode) { res.status(500).json({ error: 'Server not configured (missing env vars)' }); return; }

    if (!passcodeMatches(req.headers['x-passcode'], passcode)) {
      res.status(401).json({ error: 'Invalid passcode' }); return;
    }

    const ip = (req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown').split(',')[0].trim();
    if (rateLimited(ip)) { res.status(429).json({ error: 'Too many requests — try again in a minute' }); return; }

    let body;
    try { body = req.body; } catch (e) { body = null; } // platform body parsing throws on malformed JSON
    const { imageDataUrl } = body || {};
    const match = typeof imageDataUrl === 'string' && imageDataUrl.match(/^data:(image\/[a-zA-Z+]+);base64,(.+)$/);
    if (!match) { res.status(400).json({ error: 'Missing or invalid image' }); return; }

    const [, mime, b64] = match;
    const buf = Buffer.from(b64, 'base64');
    if (buf.length > MAX_IMAGE_BYTES) { res.status(413).json({ error: 'Photo too large — try a smaller image' }); return; }

    const form = new FormData();
    form.append('model', 'gpt-image-1');
    form.append('prompt', PROMPT);
    form.append('size', '1024x1024');
    form.append('image', new Blob([buf], { type: mime }), 'photo.png');

    const r = await fetch('https://api.openai.com/v1/images/edits', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}` },
      body: form
    });

    if (!r.ok) {
      const detail = await r.text().catch(() => '');
      res.status(502).json({ error: 'Avatar generation failed', detail: detail.slice(0, 300) });
      return;
    }

    const json = await r.json();
    const outB64 = json.data && json.data[0] && json.data[0].b64_json;
    if (!outB64) { res.status(502).json({ error: 'No image returned by the model' }); return; }

    res.status(200).json({ image: `data:image/png;base64,${outB64}` });
  } catch (err) {
    res.status(500).json({ error: 'Unexpected error', detail: String((err && err.message) || err) });
  }
};

module.exports.config = { maxDuration: 60 };
