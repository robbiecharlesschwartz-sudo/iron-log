# Iron Log — Full Project Overview

A single-file reference for the whole project. Drop this into another project to give it
complete context on Iron Log without reading the codebase.

Accurate as of **2026-09-29**, service worker cache `iron-log-v68`, commit `10633c6`.

---

## 1. What it is

A personal workout-tracking **PWA** for one user (Robbie). You pick a training day from a
plan, run the workout with a live set/rest timer, and the app builds history, progress
charts, a muscle-volume heatmap, and automated coaching tips out of what you logged.

Single-user by design. No multi-tenancy, no roles, no backend of its own — Firebase is the
only server-side dependency.

- **Repo:** `github.com/robbiecharlesschwartz-sudo/iron-log`
- **Local path:** `/Users/robbieschwartz/Projects/iron-log`
- **~6,000 lines** across 28 source files.

---

## 2. Deployments — read this before touching anything

**Four live deployments of the same repo.** They are not clones of one another; they are
separate hosts that happen to auto-deploy from the same `main`.

| URL | Host | Status |
|---|---|---|
| `iron-log-zeta-six.vercel.app` | Vercel | Current, and the intended long-term home |
| `ironlogexercise.netlify.app` | Netlify | Live, tracks `main` |
| `ironlogexercisen.netlify.app` | Netlify | Live, tracks `main` (note trailing **n**) |
| `ironlogexercises.netlify.app` | Netlify | **Stale — frozen at v39** (note trailing **s**) |

### The trap

Four near-identical domains differing by one letter. `ironlogexercise` / `ironlogexercisen`
/ `ironlogexercises` are three different sites. Verifying a deploy against the wrong one, or
debugging a URL that isn't the one you're looking at, is the single most common way to waste
an hour here. **Always check the `CACHE` string in `/sw.js` to confirm which build a URL is
actually serving.**

### Firebase authorized domains (blocks sign-in)

Firebase Auth only permits sign-in from domains on its allowlist. Current list:

```
localhost
iron-log-718df.firebaseapp.com
ironlogexercises.netlify.app     ← the STALE v39 site
ironlogexercise.netlify.app
```

`iron-log-zeta-six.vercel.app` is **not** on it. **Sign-in does not work on Vercel today.**
Since workout history lives in Firebase behind that sign-in, retiring the Netlify sites
before adding the Vercel domain would produce a deployment nobody can log into.

**To migrate to Vercel:** add `iron-log-zeta-six.vercel.app` in Firebase Console →
Authentication → Settings → Authorized domains → confirm sign-in works → *then* delete the
Netlify sites.

Two irreversible side effects of dropping an origin: `localStorage` is per-origin, so
guest/unsynced data on a Netlify URL does not follow you to Vercel (signed-in data is in
Firebase and does); and any PWA installed to a home screen from a Netlify URL breaks.

---

## 3. Stack and build

- **React 18** — function components and hooks only, no class components
- **Tailwind CSS 3** — plus a hand-rolled token palette in `src/lib/constants.js` (`C`)
- **esbuild** — no webpack, no Vite
- **Firebase** — Firestore + Auth (project `iron-log-718df`)
- **Recharts** (progress charts), **lucide-react** (icons), **@dnd-kit** (drag-reorder),
  **xlsx**/SheetJS (Excel export)

```bash
npm run build   # esbuild src/main.jsx → app.js,  tailwind src/input.css → app.css
npm run dev     # esbuild watch mode
```

**`app.js` and `app.css` are build artifacts that are committed to the repo.** Both hosts
publish from the repo root with no build step of their own (`vercel.json` sets
`outputDirectory: "."`). If you change anything in `src/` you **must** run `npm run build`
and commit the output, or the deploy ships stale code.

---

## 4. Repo layout

```
build.mjs              esbuild config
index.html             shell; loads app.css + app.js, registers sw.js
sw.js                  service worker — cache versioning + rest-timer notifications
vercel.json            Vercel config (no build, root output, no-cache on sw/index)
_headers               Netlify equivalent of the above
manifest.json          PWA manifest
app.js / app.css       BUILD ARTIFACTS — committed

src/
  main.jsx             entry: mounts App
  storage.js           window.storage shim over localStorage (async get/set/delete/list)
  App.jsx              (736) root: all state, persistence, cloud sync, screen router
  input.css            tailwind entry

  components/
    WorkoutScreen.jsx  (911) live workout: timer, sets, supersets, drag, finish flow
    DayScreens.jsx     (653) DayPreview / AddExercise / NewDay (+ side workouts)
    ProgressScreen.jsx (388) exercises, load/day, heatmap tabs
    ProfileScreen.jsx  (263) profile, landmark editor, sync status, export
    HistoryScreen.jsx  (224) past sessions + session editor
    MuscleHeatmap.jsx  (210) body map SVG + training distribution
    HomeScreen.jsx     (199) dashboard, program list, plan switcher
    atoms.jsx          (197) shared primitives (InsightCard, Ring, CatTag, SwipeableCard…)
    LibraryScreen.jsx  (133) browse/search every exercise
    AuthScreen.jsx     (133) sign-in
    Nav.jsx            (129) bottom nav + install banner
    Onboarding.jsx     (106)
    CalendarScreen.jsx (101)
    CoachScreen.jsx     (48)

  lib/
    exerciseLibrary.js (522) exercise catalog, built-in days, plan templates
    sessionUtils.js    (248) session shapes, timers, previous-performance lookup
    insights.js        (163) coach tips
    muscleShapes.js    (125) SVG path geometry for the body map
    heatmapData.js     (125) regions, contribution weights, status thresholds
    muscleMapping.js   (119) lift name → muscle; name normalization
    firebase.js        (105) config, CRUD, useAuth, session merge
    constants.js        (79) color tokens + every storage key
    excelExport.js      (57)
    landmarks.js        (31) MEV/MAV/MRV defaults + region→muscle map
    notifications.js    (24) postMessage bridge to the service worker
    id.js                (3)
```

---

## 5. Data model

### Three different exercise shapes — do not confuse them

**Day-template exercise** (lives on a day, in `WORKOUT_DAYS` or `customDays`):
```js
{ id, section, best, subs: [], kind: "lifting"|"cardio", muscle,
  setsLabel, repsLabel, rest, prefill, linkedToNext }
```
`best` is the headline lift; `subs` are substitutes offered in the UI.

**Active-session exercise** (`toActiveExercise` converts template → this):
```js
{ exId, section, selectedLift, best, subs, kind, muscle,
  setsLabel, repsLabel, rest, sets: [{weight,reps,done}], linkedToNext, notes? }
```
`selectedLift` is what's actually being performed and **may differ from `best`** — this
distinction is the source of a whole class of historical bugs (see §8).

**Saved session record** (written by `handleFinish`, whitelisted — extra fields are dropped):
```js
{ id, dayId, dayTitle, dayTag, date, status, completedAt, resumedAt, archivedAt,
  versionNumber, parentWorkoutId, lastUpdatedAt,
  totalElapsedSeconds, restSeconds, workSeconds, volume,
  exercises: [{ exId, selectedLift, notes, cardio, muscle,
                sets: [{ weight, reps, lift }] }] }
```
Only completed sets are saved. Each set records its own `lift`, so a mid-exercise lift swap
stays attributable.

**Active session** (`buildActiveSession`):
```js
{ id, dayId, dayTitle, dayTag, date, startTime,
  phase: "working"|"resting"|"paused", phaseStartedAt,
  workAccumSeconds, restAccumSeconds, restTarget, exercises: [...] }
```

### Storage keys (all in `constants.js`)

| Key | Holds |
|---|---|
| `iron-log-sessions-v2` | completed sessions |
| `iron-log-active-v3` | in-progress session |
| `iron-log-custom-days-v1` | user-owned day templates |
| `iron-log-day-adds-v1` | exercises appended to a built-in day |
| `iron-log-custom-exercises-v1` | user-created exercises |
| `iron-log-side-days-v1` | workouts outside the plan rotation |
| `iron-log-landmarks-v1` | MEV/MAV/MRV overrides |
| `iron-log-dismissed-insights-v1` | cleared coach tips |
| `iron-log-profile-v1`, `-onboarded`, `-plan-initialized`, `-install-dismissed` | misc |

**Per-account namespacing:** `keyFor(base, user)` appends `::<uid>` when signed in, so each
account's data is isolated on the same device. Guest data uses the bare key.

Retention: `pruneSessions` keeps 365 days and caps at 300 sessions.

### Cloud sync

Firestore layout: `users/{uid}/sessions/{sessionId}` and `users/{uid}/data/{key}`.

Dual-write: every mutation writes localStorage **and** Firestore. On login, local and cloud
merge by `lastUpdatedAt`, then anything local-only is pushed up (this is what carries guest
history into an account). Dismissed insights merge as a **union** rather than either/or.

All cloud reads run through `migrateSession` — Firestore returns whatever shape was written,
possibly by an older version, and a raw record crashes anything reading `.exercises`.

---

## 6. Screens

Flat router in `App.jsx` on a `screen` string — no router library.

```
home · daypreview · addexercise · newday · workout · summary
progress · history · editsession · calendar · daydetail
coach · library · profile · changeplan
```

Bottom nav: **Train · Calendar · Progress · History · Profile**.

---

## 7. Core subsystems

### Exercise library and muscle resolution
`EXERCISE_LIBRARY` holds **203 exercises** (deduped by lowercase name; first wins), each with
one primary `muscle` drawn from `MUSCLE_ORDER`:
**Chest · Back · Shoulders · Biceps · Triceps · Legs · Core · Cardio · Other.**

These are *display/sort* categories, not the heatmap's regions. Lower body is a single
**Legs** category, because nobody browses a library by hamstring vs glute — while the
heatmap still tracks Quads, Hamstrings, Glutes and Calves separately, each with its own
landmarks. `heatmapData.classifyLegExercise(name)` is what bridges the two, recovering the
region from the exercise's own name, exactly as `classifyBackExercise` already did for the
combined Back category. Face Pulls and Reverse Pec Deck are filed under **Back**.

Six plan templates: `ppl6`, `bro5`, `ul4`, `fb3`, `beginner`, `blank`.
Six built-in days: `push-a`, `pull-a`, `legs-a`, `push-b`, `pull-b`, `legs-b`.

`muscleForLift(name)` resolves any lift name in three stages:
1. **Exact** library match
2. **Partial** match — longest candidate wins, and must cover ≥60% of the name
3. **Keyword heuristics**, ordered specific-before-broad

Both rules in stage 2 and the ordering in stage 3 are load-bearing; see §8.

### Volume landmarks (MEV / MAV / MRV)
`landmarks.js` is the single source of truth, shared by the heatmap, Training Distribution,
and the Exercises tab. User-editable per muscle from Profile; unset muscles fall back to
defaults. `resolveLandmarks` also derives a non-editable **Legs** total (the sum of Quads,
Hamstrings, Glutes and Calves) for the Progress tab's combined Legs volume bar — a combined
set count has to be read against a combined landmark. `heatmapStatus(perWeek, [mev,mav,mrv])` → `gray < mev ≤ green < mav ≤ yellow < mrv ≤ red`.

### Heatmap
Ten regions: Chest, Shoulders, Triceps, Biceps, Back, Core, Glutes, Quads, Hamstrings, Calves.
Back is one combined region (lats/traps/upper/lower together).

`regionContributionsFor()` spreads each exercise over a primary region at weight 1 plus
secondary regions at fractional weights (bench → Chest 1, Shoulders 0.4, Triceps 0.3).

A `Legs`-category exercise is routed through `classifyLegExercise` first (calves → Calves,
ab/adduction → Glutes, RDL/leg-curl names → Hamstrings, thrust/glute names → Glutes,
everything else → Quads). The old per-muscle branches are kept for custom exercises the user
tagged by hand before lower body became one category.

**Quads + Hamstrings render as one "Legs" area on the silhouette only.** That merge is a
display concern — `SILHOUETTE_MERGE` adds a derived `Legs` entry alongside the real regions
rather than replacing them, so Training Distribution still lists Quads and Hamstrings
separately. Status is range-based (`sets ÷ weeks in the selected range`), matching the numbers
printed beside it. Tapping the dark panel clears the selection.

### Supersets
Adjacent exercises with `linkedToNext: true` form a group. Built **in the day builder**
(pick two exercises into slots, confirm), not toggled mid-workout.

- Sets alternate round-robin: A1 → B1 → A2 → B2
- Rest is skipped **only** on a partner handoff inside the same round; completing a round
  earns a rest
- The group drags, drops, and deletes as **one block** — a drop can never land between members
- Flattening re-derives `linkedToNext` from block shape, so reordering preserves pairs and
  removing one member dissolves only that pair

### Workout set flow
Every set row has a **Play** button; tapping it makes that exact set the one the header timer
is running, so you can start any set anywhere without reordering. Only the running set shows a
**Check**, which is identical to the header's "End Set" — logs it and starts rest.

`focusExId` pins targeting to the exercise (really, its superset group) you jumped into, so
finishing a set there advances within it rather than snapping back to the earliest unfinished
exercise. Focus expires on its own once the group runs out of sets.

### Finish flow
Two endings, both logging the session identically:
- **End workout, don't save changes** — the day keeps its saved exercise list
- **Save changes to workout** — order, additions, removals (and set counts) are written back
  to the day

Adding an exercise mid-workout is **session-local** and only sticks if you choose to save.
Adding from Day Preview edits the day immediately. Saving is skipped when the list is
unchanged, so ending an untouched built-in day can't silently convert it to a custom day.

### Coach insights (`insights.js`)
Four tips: `overload`, `weak`, `consist`, `recovery`. Each is dismissible; the dismissal key is
`` `${id}::${title}` `` — **not** the id alone, because `consist` and `recovery` are reused for
opposite messages and keying on id would bury next week's good news along with this week's bad.

### Service worker and rest notifications
`sw.js` is network-first for shell files (`index.html`, `app.js`, `app.css`, `sw.js`) and
cache-first for static assets.

Rest notifications survive the worker being killed: the **target timestamp** (not a countdown)
is persisted via the Cache API in `iron-log-state-v1`, and `checkOverdueRestOnRevival()` runs
at the top level on every script evaluation — both fresh install and revival-after-idle-kill.
An overdue notification fires late rather than being lost. The activate handler deliberately
exempts `STATE_CACHE` from cleanup.

This is best-effort, not guaranteed: without a push server, an OS that fully suspends the
browser can still delay or drop it.

---

## 8. Invariants — break these and you reintroduce a shipped bug

Each of these was a real, user-reported defect. They are listed with the failure they cause.

1. **Never attach a number to a lift name from a different record.**
   The coach looked up history by day-template *slot id* and labelled it with the slot's
   headline lift, so logging Leg Press at 360 in the "Back Squat" slot produced *"Back Squat:
   aim for 365 lb"* for someone who had never squatted. Go through `lastPerformanceFor`, which
   matches on the lift's own name, and label from the same record the number came from.

2. **Never take max weight and max reps independently.**
   315×3 and 225×12 in one exercise reported "315 lb × 12" — a set that never happened. Reps
   must come from the top-weight set.

3. **A name synonym may only collapse spellings of ONE exercise.**
   `normalizeLiftName` mapped `cable crossover → cable fly`, so Cable Crossover showed Cable
   Fly's sets as its own history. The table is now filtered against the library at module load:
   if both sides are real library exercises and aren't each other's spelling, the mapping is
   dropped. `rdl`/`romanian deadlift` and `face pull`/`face pulls` still share; Cable Crossover,
   Wide-Grip Lat Pulldown and Seated Dumbbell Press no longer do.

4. **Keyword heuristics run specific-before-broad.**
   `fly→Chest` caught Rear Delt Fly, `row→Back` caught Upright Row, `dip→Chest` caught Tricep
   Dip, `curl→Biceps` caught Nordic Hamstring Curl, `deadlift→Back` caught Romanian Deadlift.
   10 of 11 sampled custom names resolved wrong.

5. **Partial name matching takes the longest match and needs ≥60% coverage.**
   Otherwise "Deadlift" (early in the array) shadows "Romanian Deadlift", and a 4-letter "Dips"
   hijacks "Tricep Dips".

6. **A displayed color and the number beside it must come from the same computation.**
   Training Distribution colored bars from the worst sub-region while printing a combined
   total, so Arms showed "27 / 8–20" in yellow instead of red.

7. **Every sentence the coach prints must be traceable to a logged row.**
   There are eleven tip generators (overload, record, plateau, layoff, cold muscle, weak point,
   push/pull balance, volume trend, cardio gap, consistency, recovery). Each one returns nothing
   at all when its data isn't there, rather than filling the gap with an average or a typical
   starting number — and a plateau on a lift suppresses the "add 5 lb" tip for that same lift,
   because the two contradict each other.

   `generateInsights` returns everything that is true; `visibleInsights` decides how much of
   it surfaces. **Five at a time, and a dismissal does not backfill until the next local day**
   — `INSIGHT_BUDGET_KEY` holds `{day, count}` of slots today's dismissals have spent, and a
   budget from any other day is ignored rather than carried forward. Use `localDayKey`, not
   `toISOString().slice(0,10)`: the latter is UTC, so the queue would advance in the early
   evening for anyone west of Greenwich.

8. **Starting a day rebuilds its session from the template.**
   So it destroys a workout in progress. Day Preview hides Start and offers Resume for the live
   day, and confirms before abandoning a different day's session.

9. **Bump the `CACHE` string in `sw.js` on every deploy**, and rebuild `app.js`. Otherwise
   clients keep the old bundle.

---

## 9. Gotchas

- **`app.js`/`app.css` are committed build artifacts.** Editing `src/` without `npm run build`
  ships nothing.
- **Circular imports.** `insights.js` imports `sessionUtils.js`; `sessionUtils.js` imports
  `muscleMapping.js`; `muscleMapping.js` imports `exerciseLibrary.js`. Adding an import back up
  that chain breaks the bundle. Nothing in `lib/` may import a component.
- **Local dev server.** Apple's `python3` is currently blocked on an unaccepted Xcode license
  after an OS update. The preview config now runs a small Node static server instead, which
  sends `no-store` — this also ends the long-running problem where a stale `app.css`/`app.js`
  was served from browser HTTP cache and forced a port bump every session.
- **`repairLegacyDayIds`** runs on every load, normalizing randomized-suffix day ids back to
  canonical built-in ids. Left over from a fixed bug that fragmented a day's history across a
  new id on every plan re-selection.
- **Singular/plural domains.** See §2. This has burned time more than once.

---

## 10. Deploy procedure

```bash
# 1. bump the cache version in sw.js  (iron-log-vNN → vNN+1)
npm run build
git add -A && git commit -m "..." && git push origin main

# 2. confirm the new build is actually live
until curl -s https://iron-log-zeta-six.vercel.app/sw.js | grep -q 'iron-log-vNN'; do sleep 3; done
```

Both hosts auto-deploy from `main`; a push updates Vercel and both live Netlify sites.

---

## 11. Recent history (newest first)

| Commit | Change |
|---|---|
| `10633c6` | Previous performance only for the exact same exercise (Cable Crossover fix) |
| `152fbf2` | Serve from repo root on Vercel |
| `cff495e` | Deploy to Vercel from GitHub |
| `8a73312` | Full-width Start bar; clears once a session runs; Resume + discard guard |
| `58da38b` | Coach no longer attributes one lift's numbers to another |
| `262f60a` | Corrected primary muscles across the library and its name matcher |
| `daeda29` | Floating corner → Start; saving the exercise list became a choice |
| `636b131` | Dismissable coach tips; quads+hamstrings drawn as one "Legs" area |
| `cdc9e24` | Workout stays on the exercise you jumped into |
| `9cd8a5a` | Supersets drag as one unit; per-set Play buttons |
| `5807683` | Superset creation moved into the day builder |
| `810d109` | Training Distribution split into per-muscle bars |
| `8ee211c` | Rest notifications survive the service worker being killed |
| `04e3181` | Library screen + side workouts |
| `887e2af` | Back merged into one heatmap region; muscle-group picker |

---

## 12. Open items

- **Vercel cannot authenticate** until its domain is added to Firebase (§2). Blocks retiring
  Netlify.
- **Three redundant deployments.** The stale `ironlogexercises.netlify.app` (v39) is still
  live and still authorized for sign-in.
- **No automated tests.** Verification to date has been seeded-browser testing plus one-off
  Node scripts run against the real modules.
