# Iron Log

A workout tracker that runs in the browser and installs to a phone home screen.
Training programs, a live session timer, progress charts, a body heatmap, and
coaching notes derived from your own logged sets.

```bash
npm install
npm run build     # required: app.js, app.css and sw.js are committed build artifacts
npm test          # 47 invariant tests
```

`npm run build` must be run before committing — CI fails if the committed artifacts
do not match a fresh build of `src/`.

Data is stored in the browser. Signing in syncs it to Firebase so it survives a new
device; signed out, everything stays local.

**[PROJECT_OVERVIEW.md](PROJECT_OVERVIEW.md)** is the reference: architecture, data
model, every screen, the invariants in §8 and why each one exists, and the deploy
procedure.
