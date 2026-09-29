import esbuild from "esbuild";
import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

/* The lib modules import each other without file extensions, which Node's ESM resolver
   refuses. Rather than rewrite every import purely to make tests runnable, bundle the
   suite the same way the app itself is bundled and run that — so the tests execute the
   real shipped modules, not a copy or a mock. */

/* A unique directory per run, so a leftover build from an interrupted run — or two runs
   overlapping — can never have one process reading a bundle another is mid-write on. */
const OUT = mkdtempSync(join(tmpdir(), "iron-log-test-"));
const BUNDLE = join(OUT, "invariants.test.mjs");

try {
  await esbuild.build({
    entryPoints: ["test/invariants.test.mjs"],
    bundle: true,
    platform: "node",
    format: "esm",
    outfile: BUNDLE,
    loader: { ".js": "jsx", ".jsx": "jsx" },
    jsx: "automatic",
    logLevel: "error",
  });

  const res = spawnSync("node", ["--test", BUNDLE], { stdio: "inherit" });
  process.exitCode = res.status ?? 1;
} finally {
  rmSync(OUT, { recursive: true, force: true });
}
