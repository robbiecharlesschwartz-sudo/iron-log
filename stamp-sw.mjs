import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";

/* Derive the service-worker cache name from the bundles it actually caches.
   Bumping it by hand was a deploy step you could forget, and forgetting it leaves every
   client on the previous build with nothing to indicate anything went wrong. Hashing the
   shipped output instead means the cache name changes exactly when the code does, and a
   rebuild that produces identical output correctly leaves it alone. */

const hash = createHash("sha256")
  .update(readFileSync("app.js"))
  .update(readFileSync("app.css"))
  .digest("hex")
  .slice(0, 10);

const FILE = "sw.js";
const before = readFileSync(FILE, "utf8");

/* Anchored to the CACHE assignment at the start of a line, deliberately.
   A looser /iron-log-[a-z0-9]+/ would also rewrite STATE_CACHE ("iron-log-state-v1"),
   which is the durable store holding the rest-timer's target timestamp across service
   worker restarts. Renaming that every build would orphan a pending rest notification
   on every single deploy. */
const PATTERN = /^const CACHE = "iron-log-[^"]*";$/m;

if (!PATTERN.test(before)) {
  console.error(`stamp-sw: could not find the CACHE assignment in ${FILE} — refusing to write.`);
  process.exit(1);
}

const after = before.replace(PATTERN, `const CACHE = "iron-log-${hash}";`);

if (!after.includes('const STATE_CACHE = "iron-log-state-v1";')) {
  console.error("stamp-sw: STATE_CACHE was altered — refusing to write.");
  process.exit(1);
}

writeFileSync(FILE, after);
console.log(`stamp-sw: cache = iron-log-${hash}`);
