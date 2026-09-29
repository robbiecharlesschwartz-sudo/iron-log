import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, normalize } from "node:path";

/* Local static server for the built app.
   Two reasons this exists instead of `python3 -m http.server`:
   - macOS' bundled python3 is an Xcode shim that stops working after an OS update until
     the licence is accepted, which silently breaks local preview.
   - That server sends no cache headers, so the browser held onto stale app.js/app.css
     across rebuilds and the only reliable workaround was changing port every time.
   Everything here is served no-store, so a rebuild is picked up on the next reload. */

const port = Number(process.argv[2] || 8548);
const root = process.argv[3] || process.cwd();

const TYPES = {
  ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".json": "application/json",
  ".png": "image/png", ".ico": "image/x-icon", ".svg": "image/svg+xml",
  ".webmanifest": "application/manifest+json", ".map": "application/json",
};

createServer(async (req, res) => {
  let pathname = decodeURIComponent(new URL(req.url, "http://localhost").pathname);
  if (pathname.endsWith("/")) pathname += "index.html";
  const file = join(root, normalize(pathname).replace(/^(\.\.[/\\])+/, ""));
  try {
    const body = await readFile(file);
    res.writeHead(200, {
      "Content-Type": TYPES[extname(file)] || "application/octet-stream",
      "Cache-Control": "no-store, no-cache, must-revalidate",
    });
    res.end(body);
  } catch {
    res.writeHead(404, { "Cache-Control": "no-store" });
    res.end("not found");
  }
}).listen(port, () => console.log(`serving ${root} on http://localhost:${port}`));
