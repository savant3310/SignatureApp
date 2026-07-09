# Animated Email Signature Studio

A small, self-contained web app your employees open in a browser to build a
personal **animated email signature**: a sliced-photo reveal, the company
wordmark, and a typed-out name/title — exported as a single
**animated GIF** that plays inside real email clients (Gmail, Outlook, Apple Mail).

Why a GIF? Email clients strip JavaScript and CSS animations, so an animated GIF
is the only format that actually moves inside a signature. The app renders the
animation frame-by-frame and encodes the GIF **entirely in the browser** — nothing
is uploaded anywhere.

---

## ⚠️ It must be *served*, not opened as a file

The GIF encoder runs in a Web Worker, which browsers **block on `file://`** pages.
So **don't double-click `index.html`** — the preview will animate but "Download
animated GIF" won't produce a file. Use one of these instead:

- the **hosted link** (deploy to Vercel — see below), or
- the **local start script** (runs a tiny web server).

---

## Deploy to Vercel (recommended — gives you a shareable link)

This is a plain static site, so there's no build step.

**Easiest — drag & drop:**
1. Go to <https://vercel.com/new>.
2. Drag the whole `signature-app` folder onto the page (or "Deploy" an uploaded folder).
3. Vercel gives you a URL like `https://your-signatures.vercel.app` — share it with employees.

**Or with the CLI:**
```
npm i -g vercel
cd signature-app
vercel          # first run: answer the prompts (creates a preview URL)
vercel --prod   # publish to the production URL
```

**Or via Git:** push `signature-app` to a GitHub repo and "Import Project" on
vercel.com. If the app isn't at the repo root, set the **Root Directory** to the
folder that contains `index.html`. No framework preset / build command needed
(it's static).

Each employee visits the link, fills in their details, and downloads their own
signature. Their company-branding settings (colors) are remembered per
browser via `localStorage`.

---

## Animated avatar generator (uses OpenAI's API — needs setup)

Employees can turn their uploaded headshot into an illustrated/animated-style
avatar. This calls OpenAI's image API, which means an API key is involved —
**that key must never end up in the browser.** The app never talks to OpenAI
directly; it calls a small serverless function (`api/generate-avatar.js`)
that holds the key server-side and proxies the request. The client only ever
sends a shared team passcode + the employee's own photo; the stylization
prompt is fixed in the server code so the endpoint can't be turned into a
general-purpose image generator even by someone who has the passcode.

**One-time setup (you, not each employee):**
1. In the Vercel project → **Settings → Environment Variables**, add:
   - `OPENAI_API_KEY` — your OpenAI key.
   - `AVATAR_PASSCODE` — any short shared passcode you invent.
   Redeploy after adding them (env var changes need a fresh deploy to take effect).
2. **Set a spending limit on the OpenAI account itself** (platform.openai.com →
   billing). The passcode and rate limit in `api/generate-avatar.js` reduce
   abuse, but a hard cost cap on the account is the real backstop — code alone
   can't guarantee a key never gets misused if it leaks some other way.
3. Share the passcode with employees once (e.g. in the same message as the
   app link). They paste it into **Company & style settings → Animated avatar
   generator passcode** — it's remembered per browser via `localStorage`,
   same as the accent setting.

**Local development:** the plain `python -m http.server` start scripts can't
run serverless functions, so "Generate animated avatar" will fail locally
unless you run `vercel dev` instead (needs `npm i -g vercel`, then `vercel
link` once, then a local `.env.local` copied from `.env.example` with real
values). Everything else in the app works fine under the plain start scripts.

---

## Run it locally (for development / offline use)

You need **Python 3** (ships with macOS/Linux; on Windows install from python.org
and tick "Add to PATH"). Then:

- **Windows** — double-click `start-windows.bat`
- **macOS** — double-click `start-mac.command` (first time: right-click → Open)
- **Linux** — run `./start-linux.sh`

Your browser opens `http://localhost:8000`. Keep the terminal window open while
using the app. To let colleagues on your network use it, run:
```
python3 -m http.server 8000 --bind 0.0.0.0
```
and share `http://<your-computer-ip>:8000`.

---

## Set your company branding (do this once)

The logo is fixed and **not user-configurable** — there's no upload UI, so
employees can't change it:

- Drop a **`logo.png`** into `assets/` and it's drawn as the logo image in
  every signature, or
- Leave `assets/logo.png` absent and it falls back to a text wordmark —
  **OPRAAH** — set in `js/config.js` → `COMPANY_NAME`.

Expand **Company & style settings** to set the **accent color** and the
**verified badge** (these remain per-employee-browser settings).

---

## How an employee makes their signature

1. Type full name, job title, company, email, website (phone optional).
2. Upload a headshot, then **adjust it**: drag to reposition and scroll/slide to
   zoom so the face sits fully inside the frame. What you see in the editor is
   exactly what gets exported.
3. Watch the live preview; click **Replay** to see it again.
4. Click **Download animated GIF** (or **Download static PNG** as a fallback).
5. Add it to their signature:
   - **Gmail:** Settings → See all settings → Signature → image icon → upload the GIF.
   - **Outlook (new):** Settings → Mail → Compose and reply → Signature → insert picture.
   - **Apple Mail:** drag the GIF into the signature box.

---

## Project layout — where to edit what

```
signature-app/
├─ index.html          markup only (form + preview). No logic here.
├─ styles.css          all styling.
├─ js/
│  ├─ config.js        ★ CFG (size/speed) + LAY (positions) + ACCENTS + COMPANY_NAME. Edit here first.
│  ├─ state.js         the app's data + default field values.
│  ├─ canvas.js        the shared preview <canvas> + 2D context.
│  ├─ util.js          pure helpers: easing, place() crop math, roundRectPath…
│  ├─ render.js        ★ all drawing. drawFrame() composes one frame.
│  ├─ adjuster.js      the reusable drag/zoom crop editor (used for the headshot).
│  ├─ exporter.js      GIF/PNG export (worker guard + watchdog + errors).
│  ├─ avatar.js        client side of the animated-avatar generator (calls api/generate-avatar.js).
│  └─ main.js          wiring: inputs, persistence, upload, preview loop, boot.
├─ api/
│  └─ generate-avatar.js  ★ Vercel serverless function — the ONLY place OPENAI_API_KEY is read.
├─ vendor/
│  ├─ gif.js           GIF encoder    (global: GIF)
│  └─ gif.worker.js    encoder worker
├─ assets/logo.png     fixed logo image (optional — falls back to a text wordmark if absent)
├─ vercel.json         static hosting config + api/ function settings
├─ .env.example        env var names for local `vercel dev` (copy to .env.local, fill in, never commit)
├─ start-windows.bat / start-mac.command / start-linux.sh
└─ README.md
```

Common edits:
- **Speed / size:** `js/config.js` → `CFG` (`INTRO_FRAMES`, `FRAME_DELAY`, `W`, `H`).
- **Where things sit:** `js/config.js` → `LAY` (`logoBox`, `px/py/pw/ph`, `slices`, `skew`).
- **How the animation looks:** `js/render.js` (each `draw*` function).
- **Colors / UI chrome:** `styles.css`.

The files are loaded as ES modules, which is another reason the app must be served
over http(s) rather than opened as a `file://` page.
