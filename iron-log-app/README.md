# Iron Log — standalone app

Fully self-contained. No build step, no CDN dependencies, no Claude account needed.
Everything (React, Recharts, Lucide icons, your data storage) is bundled into the
files in this folder. Workout history is saved in the browser's `localStorage`,
so it stays on whichever device you use it on.

## Fastest way to get it on your phone (Netlify, free, ~1 minute)

1. Go to https://app.netlify.com/drop on your computer.
2. Unzip this folder and drag the *folder* (not the zip) onto the page.
3. Netlify gives you a live URL immediately.
4. Open that URL on your phone, then:
   - **iPhone:** Safari → Share button → "Add to Home Screen"
   - **Android:** Chrome → ⋮ menu → "Add to Home screen" / "Install app"

You now have an app icon that launches full-screen, works offline after the
first load, and keeps your logged workouts.

## Other hosting options (same files, any of these work)

- **Vercel:** `vercel --prod` from inside this folder (after `npm i -g vercel`), or drag-and-drop on vercel.com.
- **GitHub Pages:** push this folder's contents to a repo, enable Pages in repo Settings → Pages, point it at the branch/root.
- **Cloudflare Pages:** same drag-and-drop flow as Netlify.

## Updating it later

If you want new features added, the easiest path is to come back here and ask
for the change — I'll rebuild this same folder. There's no separate "source"
file to hand-edit; the app.js is a minified bundle.

## Notes

- Data is per-browser. If you switch phones or browsers, history won't carry over automatically.
- Clearing your browser's site data for this app will also clear your workout history.
- The service worker caches the app shell so it opens even with no signal at the gym, but you do need a connection the very first time you load it.

---

# Live Apple Watch heart rate (optional)

iOS will not let a web app read Apple Health or pair directly with the Watch —
that's locked to native apps. The workaround is a small "bridge": a Shortcut
posts your Watch heart rate to a private URL, and Iron Log reads that URL every
few seconds during a workout. Expect a few seconds of lag, but it's live.

You need two pieces: a **relay URL** and a **Shortcut**.

## Piece 1 — A relay URL (free Cloudflare Worker)

A Worker is a tiny always-on endpoint. This one stores the latest BPM in memory:
the Shortcut POSTs to it, Iron Log GETs from it. It sends the CORS header the app
needs.

1. Make a free account at https://dash.cloudflare.com → Workers & Pages → Create → Worker.
2. Replace the starter code with this, then Deploy:

```js
let last = { bpm: null, t: 0 };
export default {
  async fetch(req) {
    const cors = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    };
    if (req.method === "OPTIONS") return new Response(null, { headers: cors });
    if (req.method === "POST") {
      const body = await req.text();
      const m = body.match(/-?\d+(\.\d+)?/);   // grab the first number sent
      if (m) last = { bpm: Math.round(parseFloat(m[0])), t: Date.now() };
      return new Response("ok", { headers: cors });
    }
    // GET → return the latest reading as JSON
    return new Response(JSON.stringify(last), {
      headers: { ...cors, "Content-Type": "application/json" },
    });
  },
};
```

3. Your Worker URL looks like `https://iron-log-hr.<you>.workers.dev`.
   - That URL is both the **POST target** (for the Shortcut) and the **read URL** (for the app).
   - Optional: add a secret path like `?k=somethingPrivate` and check it in the Worker so only you can post.

## Piece 2 — The iOS Shortcut

Shortcuts app → **+** → add these actions in order:

1. **Repeat** (Control Flow) — set a large count like 600 (≈ that many polls).
   Put the next actions *inside* the Repeat block:
2. **Find Health Samples** → Sample Type: **Heart Rate**, Sort by **End Date**,
   Order **Latest First**, **Limit 1**.
3. **Get Numbers from Input** (or **Get Details of Health Sample → Value**) to pull the BPM number.
4. **Get Contents of URL**:
   - URL: your Worker URL
   - Method: **POST**
   - Request Body: **Text**, set to the BPM number from step 3.
5. **Wait** → 5 seconds (match the poll interval you pick in the app).

Name it "Gym HR." Start it when you begin lifting (you can trigger it from the
Watch, or say "Hey Siri, Gym HR"). It keeps pushing until the repeats finish or
you stop it.

> Tip: iOS won't run a Shortcut loop forever in the deep background. Keeping the
> Watch workout active and starting the Shortcut at the top of your session works
> best. If readings stop, re-run "Gym HR."

## Piece 3 — Connect it in Iron Log

1. Open Iron Log → **Profile** tab → **Heart rate (Apple Watch)** → toggle on.
2. Paste your Worker URL into **Read URL**, hit **Save**, pick a poll interval.
3. Tap **Test connection** — once it shows a BPM, you're set.

During any workout you'll now see live BPM under the timer (color-shifts by zone),
and each finished session stores your **average** and **peak** heart rate — shown
on the summary screen and in the calendar day view.
