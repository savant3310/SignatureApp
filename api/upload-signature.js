/* api/upload-signature.js — Vercel serverless function. Uploads the
 * client-rendered signature GIF slices (see publish.js — the frame is cut
 * into pieces so the icons, and optionally the LinkedIn text line, can be
 * individually hyperlinked in a plain HTML table, since Gmail/Outlook strip
 * position:absolute on paste) to Vercel Blob and hands back their public
 * URLs, so the app can publish a ready-to-paste signature without the user
 * hosting anything themselves.
 *
 * The client sends either a plain "main" slice, or — when there's LinkedIn
 * text to carve a link out of — the 5-piece "main-top/left/text/right/
 * bottom" split from splitMainRect (see link-table.js). ALLOWED_KEYS is a
 * whitelist (not just a shape check): every key is interpolated straight
 * into a Blob storage path below, so an unrecognized key must be rejected
 * before it ever reaches that path.
 *
 * Needs a Blob store connected to this Vercel project (Storage tab in the
 * dashboard); nothing else to configure. Connecting the store provisions
 * BLOB_STORE_ID, and `put()` below authenticates with it automatically via
 * Vercel's OIDC token (present at runtime once connected) — falling back to
 * a classic BLOB_READ_WRITE_TOKEN if that's what's set instead.
 *
 * Also logs a usage row (name, ip, user-agent, timestamp) to Postgres for
 * every successful generation — piggybacked on this call rather than a
 * separate request, so tracking usage costs no extra round-trip. Logging
 * failures never fail the actual upload; the signature is the point, the
 * log is just observability. Query it directly in Neon's SQL editor:
 * `SELECT * FROM generations ORDER BY created_at DESC;`
 */
const { put } = require('@vercel/blob');
const { neon } = require('@neondatabase/serverless');

const ICON_KEYS = ['linkedin', 'website', 'instagram'];
const MAIN_KEYS = ['main'];
const MAIN_SPLIT_KEYS = ['main-top', 'main-left', 'main-text', 'main-right', 'main-bottom'];
const ALLOWED_KEYS = new Set([...ICON_KEYS, ...MAIN_KEYS, ...MAIN_SPLIT_KEYS]);
const MAX_IMAGE_BYTES = 3 * 1024 * 1024;      // raw bytes per slice
const MAX_TOTAL_BYTES = 6 * 1024 * 1024;      // raw bytes across all slices — stays under Vercel's request-body ceiling once base64-encoded
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

    if (!process.env.BLOB_STORE_ID && !process.env.BLOB_READ_WRITE_TOKEN) {
      res.status(500).json({ error: 'Server not configured — connect a Blob store to this project in Vercel’s Storage tab.' });
      return;
    }

    const ip = (req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown').split(',')[0].trim();
    if (rateLimited(ip)) { res.status(429).json({ error: 'Too many requests — try again in a minute' }); return; }

    let body;
    try { body = req.body; } catch (e) { body = null; } // platform body parsing throws on malformed JSON
    const { slices, name } = body || {};
    if (!slices || typeof slices !== 'object') {
      res.status(400).json({ error: 'Missing or invalid image slices' }); return;
    }

    const keys = Object.keys(slices);
    const keySet = new Set(keys);
    if (!keys.length || keys.some(k => !ALLOWED_KEYS.has(k))) {
      res.status(400).json({ error: 'Missing or invalid image slices' }); return;
    }
    if (ICON_KEYS.some(k => !keySet.has(k))) {
      res.status(400).json({ error: 'Missing icon image slice(s)' }); return;
    }
    // "main" (no LinkedIn text to link) and the 5-piece split (see
    // splitMainRect) are the only two valid shapes for the rest of the
    // signature — never a partial mix, and never a stray extra key from
    // the other shape tagging along.
    const hasPlainMain = MAIN_KEYS.every(k => keySet.has(k));
    const hasSplitMain = MAIN_SPLIT_KEYS.every(k => keySet.has(k));
    const expectedCount = ICON_KEYS.length + (hasPlainMain ? MAIN_KEYS.length : hasSplitMain ? MAIN_SPLIT_KEYS.length : -1);
    if (hasPlainMain === hasSplitMain || keys.length !== expectedCount) {
      res.status(400).json({ error: 'Missing or invalid image slices' }); return;
    }
    const sliceKeys = [...ICON_KEYS, ...(hasPlainMain ? MAIN_KEYS : MAIN_SPLIT_KEYS)];

    const buffers = {};
    let total = 0;
    for (const key of sliceKeys) {
      const match = typeof slices[key] === 'string' && slices[key].match(/^data:image\/(gif|png);base64,(.+)$/);
      if (!match) { res.status(400).json({ error: `Missing or invalid image for "${key}"` }); return; }
      const [, ext, b64] = match;
      const buf = Buffer.from(b64, 'base64');
      if (buf.length > MAX_IMAGE_BYTES) { res.status(413).json({ error: 'Signature too large — try a smaller photo' }); return; }
      total += buf.length;
      buffers[key] = { buf, ext };
    }
    if (total > MAX_TOTAL_BYTES) { res.status(413).json({ error: 'Signature too large — try a smaller photo' }); return; }

    const base = slug(name);
    const uploads = await Promise.all(sliceKeys.map(async key => {
      const { buf, ext } = buffers[key];
      const blob = await put(`signatures/${base}/${key}.${ext}`, buf, {
        access: 'public',
        contentType: `image/${ext}`,
        addRandomSuffix: true // every generation (or two people with similar names) needs its own URLs, not an overwrite collision
      });
      return [key, blob.url];
    }));

    if (process.env.DATABASE_URL) {
      try {
        const sql = neon(process.env.DATABASE_URL);
        await sql`INSERT INTO generations (name, ip, user_agent) VALUES (${name || null}, ${ip}, ${req.headers['user-agent'] || null})`;
      } catch (logErr) { console.error('generations log failed:', logErr); } // best-effort — never blocks the response
    }

    res.status(200).json({ urls: Object.fromEntries(uploads) });
  } catch (err) {
    res.status(500).json({ error: 'Unexpected error', detail: String((err && err.message) || err) });
  }
};

module.exports.config = { maxDuration: 30 };
