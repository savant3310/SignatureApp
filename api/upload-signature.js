/* api/upload-signature.js — Vercel serverless function. Uploads the
 * client-rendered signature GIF to Vercel Blob and hands back its public
 * URL, so the app can publish a ready-to-paste HTML signature (with the
 * LinkedIn/website/Instagram icons independently clickable) without the
 * user having to host the image anywhere themselves.
 *
 * Needs a Blob store connected to this Vercel project (Storage tab in the
 * dashboard) — that's what provisions BLOB_READ_WRITE_TOKEN below; nothing
 * else to configure.
 */
const { put } = require('@vercel/blob');

const MAX_IMAGE_BYTES = 6 * 1024 * 1024; // raw bytes; keeps the base64 payload under Vercel's request-body limit
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX = 10;

const hitsByIp = new Map();
function rateLimited(ip) {
  const now = Date.now();
  const hits = (hitsByIp.get(ip) || []).filter(t => now - t < RATE_LIMIT_WINDOW_MS);
  hits.push(now);
  hitsByIp.set(ip, hits);
  return hits.length > RATE_LIMIT_MAX;
}

const slug = s => (s || 'signature').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'signature';

module.exports = async function handler(req, res) {
  try {
    if (req.method !== 'POST') { res.status(405).json({ error: 'Method not allowed' }); return; }

    const token = process.env.BLOB_READ_WRITE_TOKEN;
    if (!token) {
      res.status(500).json({ error: 'Server not configured — connect a Blob store to this project in Vercel’s Storage tab (provisions BLOB_READ_WRITE_TOKEN).' });
      return;
    }

    const ip = (req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown').split(',')[0].trim();
    if (rateLimited(ip)) { res.status(429).json({ error: 'Too many requests — try again in a minute' }); return; }

    let body;
    try { body = req.body; } catch (e) { body = null; } // platform body parsing throws on malformed JSON
    const { imageDataUrl, name } = body || {};
    const match = typeof imageDataUrl === 'string' && imageDataUrl.match(/^data:image\/(gif|png);base64,(.+)$/);
    if (!match) { res.status(400).json({ error: 'Missing or invalid image' }); return; }

    const [, ext, b64] = match;
    const buf = Buffer.from(b64, 'base64');
    if (buf.length > MAX_IMAGE_BYTES) { res.status(413).json({ error: 'Signature too large — try a smaller photo' }); return; }

    const blob = await put(`signatures/${slug(name)}.${ext}`, buf, {
      access: 'public',
      contentType: `image/${ext}`,
      token
    });

    res.status(200).json({ url: blob.url });
  } catch (err) {
    res.status(500).json({ error: 'Unexpected error', detail: String((err && err.message) || err) });
  }
};

module.exports.config = { maxDuration: 30 };
