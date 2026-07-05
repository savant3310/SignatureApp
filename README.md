# Animated Email Signature Studio

A small, self-contained web app your employees open in a browser to build a
personal **animated email signature**: a sliced-photo reveal, an animated (or
static) company logo, and a typed-out name/title — exported as a single
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
signature. Their company-branding settings (logo, colors) are remembered per
browser via `localStorage`.

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

Expand **Company & style settings** and either:

1. **Upload your logo** — a transparent **PNG** *or an animated **GIF***, and/or
2. Drop a file named **`logo.png`** into `assets/` — it loads automatically.

**Animated logo GIFs:** upload your own animated GIF to prototype the logo motion;
the app decodes its frames and plays them inside the signature. A small editor
appears — **drag to reposition** and **scroll / slide to zoom** to fit it in the
box. Keep logo GIFs short (~1–2 s) to keep the final file small.

Also set the **company name** (used as a text wordmark if there's no logo), the
**accent color**, which **social icons** show, and the **verified badge**.

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
│  ├─ config.js        ★ CFG (size/speed) + LAY (positions) + ACCENTS. Edit here first.
│  ├─ state.js         the app's data + default field values.
│  ├─ canvas.js        the shared preview <canvas> + 2D context.
│  ├─ util.js          pure helpers: easing, place() crop math, roundRectPath…
│  ├─ icons.js         social glyphs (LinkedIn / Instagram / YouTube / X).
│  ├─ render.js        ★ all drawing. drawFrame() composes one frame.
│  ├─ adjuster.js      the reusable drag/zoom crop editor.
│  ├─ logo.js          decodes uploaded logos (incl. animated GIF frames).
│  ├─ exporter.js      GIF/PNG export (worker guard + watchdog + errors).
│  └─ main.js          wiring: inputs, persistence, upload, preview loop, boot.
├─ vendor/
│  ├─ gif.js           GIF encoder    (global: GIF)
│  ├─ gif.worker.js    encoder worker
│  └─ gifuct.js        GIF decoder    (global: window.gifuct)
├─ assets/logo.png     optional company logo (auto-loaded if present)
├─ vercel.json         static hosting config
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
