/* api/generate-avatar.js — Vercel serverless function. This is the ONLY place
 * OPENAI_API_KEY is ever read; it lives in a Vercel environment variable and
 * never reaches the browser. The client sends just: a shared team passcode
 * (also a server-only env var), the employee's own uploaded photo, and their
 * typed name (used only to enforce the per-person cap below).
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
 *   - a per-person lifetime cap (GENERATION_CAP), tracked in Postgres since
 *     the in-memory rate limit above resets per instance and can't count
 *     "how many times has this person ever generated one". There's no login
 *     in this app, so "person" means the typed full name (case-insensitive) —
 *     the same identity concept already used for the `generations` log in
 *     upload-signature.js. Someone could type a different name to dodge
 *     this, but that's an acceptable tradeoff for an internal, trusted-
 *     employee tool; this cap is about cost control, not security.
 *
 * One-time setup: run this in Neon's SQL editor before the cap can work —
 *   CREATE TABLE avatar_generations (
 *     id SERIAL PRIMARY KEY,
 *     name TEXT NOT NULL,
 *     ip TEXT,
 *     user_agent TEXT,
 *     created_at TIMESTAMPTZ NOT NULL DEFAULT now()
 *   );
 *   CREATE INDEX avatar_generations_name_idx ON avatar_generations (lower(name));
 * To see usage per person: SELECT name, COUNT(*) FROM avatar_generations GROUP BY name ORDER BY count(*) DESC;
 */

const crypto = require('crypto');
const { neon } = require('@neondatabase/serverless');

const MAX_IMAGE_BYTES = 3 * 1024 * 1024; // raw bytes; keeps base64 payload under Vercel's request-body limit
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX = 5;
const GENERATION_CAP = 2; // lifetime generations allowed per person (see avatar_generations table)
const CAP_MESSAGE = 'Sorry, no more generations available — please contact your administrator.';
const PROMPT = `Transform the uploaded profile picture into a bold 1970s psychedelic poster illustration in the following style:
Subject treatment: Keep the person's face as the central focus, cut out cleanly from its background. Preserve their actual facial features, skin tone, and likeness, but render the image with slightly boosted contrast and warm, editorial color grading. If they're wearing glasses, a hat, or other accessories, keep them. Add a stylized beret or keep existing headwear rendered in a rich, textured single color (teal, mustard, or burnt orange).
Typography: Surround the face with large, hand-drawn groovy retro lettering that wraps around the head in a circular/enclosing composition. The letters must be thick, rounded, liquid-like bubble forms with organic swooshes and blobs filling negative space — classic late-60s/70s psychedelic funk style. Use placeholder text "[YOUR TEXT HERE]" split across top and bottom (e.g., two words top, two words bottom) so the words frame the face.
Color palette: Warm cream or off-white background. Bright vermillion/orange-red for all typography and decorative blob accents. Keep it to a tight 2–3 color palette for a screen-printed, retro poster feel.
Composition: Portrait orientation. Face centered. Lettering and abstract teardrop/blob shapes fill all surrounding space edge-to-edge with no empty gaps. Flat vector-style shapes, no gradients on the text, slight print texture overall.
Mood: Vintage art-show flyer, funky, expressive, gallery-poster energy. 1:1 aspect ratio.`;

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
    const dbUrl = process.env.DATABASE_URL;
    if (!apiKey || !passcode || !dbUrl) { res.status(500).json({ error: 'Server not configured (missing env vars)' }); return; }

    if (!passcodeMatches(req.headers['x-passcode'], passcode)) {
      res.status(401).json({ error: 'Invalid passcode' }); return;
    }

    const ip = (req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown').split(',')[0].trim();
    if (rateLimited(ip)) { res.status(429).json({ error: 'Too many requests — try again in a minute' }); return; }

    let body;
    try { body = req.body; } catch (e) { body = null; } // platform body parsing throws on malformed JSON
    const { imageDataUrl, name } = body || {};
    const personName = typeof name === 'string' ? name.trim() : '';
    if (!personName) { res.status(400).json({ error: 'Missing name' }); return; }
    const match = typeof imageDataUrl === 'string' && imageDataUrl.match(/^data:(image\/[a-zA-Z+]+);base64,(.+)$/);
    if (!match) { res.status(400).json({ error: 'Missing or invalid image' }); return; }

    const [, mime, b64] = match;
    const buf = Buffer.from(b64, 'base64');
    if (buf.length > MAX_IMAGE_BYTES) { res.status(413).json({ error: 'Photo too large — try a smaller image' }); return; }

    const sql = neon(dbUrl);
    // Fails closed: if we can't verify the cap, don't spend money calling
    // OpenAI — this check exists specifically for cost control.
    let usedCount;
    try {
      const rows = await sql`SELECT COUNT(*)::int AS count FROM avatar_generations WHERE lower(name) = lower(${personName})`;
      usedCount = rows[0]?.count ?? 0;
    } catch (dbErr) {
      console.error('avatar_generations count failed:', dbErr);
      res.status(500).json({ error: 'Unable to verify usage — try again shortly' }); return;
    }
    if (usedCount >= GENERATION_CAP) { res.status(403).json({ error: CAP_MESSAGE }); return; }

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

    try {
      await sql`INSERT INTO avatar_generations (name, ip, user_agent) VALUES (${personName}, ${ip}, ${req.headers['user-agent'] || null})`;
    } catch (logErr) { console.error('avatar_generations insert failed:', logErr); } // best-effort — never blocks the response the user already paid for

    res.status(200).json({ image: `data:image/png;base64,${outB64}` });
  } catch (err) {
    res.status(500).json({ error: 'Unexpected error', detail: String((err && err.message) || err) });
  }
};

module.exports.config = { maxDuration: 60 };
