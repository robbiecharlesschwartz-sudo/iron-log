/* Which page the URL is asking for.
 *
 * The app has never had routing — it is one screen held in state — and a router
 * library would be a dependency bought for four static destinations. So this is
 * pushState and popstate directly, which is all the job needs.
 *
 * "/" is the public page and anything unrecognised is the app, rather than the other
 * way round: a bookmark, a shared link or an auth redirect landing on a path nobody
 * planned for should open the thing the person already uses, not a sales pitch.
 */

export const APP_PATH = "/app";

/** The public pages, by path. Everything not listed here is the app. */
export const PAGES = { "/privacy": "privacy", "/terms": "terms", "/contact": "contact" };

/** "landing", one of PAGES, or "app". */
export function routeFor(pathname = window.location.pathname) {
  // A trailing slash is the same page; "/index.html" is what the installed PWA starts
  // on and what a static host serves for "/".
  const path = pathname.replace(/\/+$/, "") || "/";
  if (path === "/" || path === "/index.html") return "landing";
  return PAGES[path] || "app";
}

/** Move without reloading. Same path is not a navigation. */
export function go(path) {
  if (window.location.pathname === path) return;
  window.history.pushState({}, "", path);
  window.dispatchEvent(new PopStateEvent("popstate"));
}

/** Calls back with the new route on Back, Forward, and on `go`. */
export function onRouteChange(handler) {
  const fire = () => handler(routeFor());
  window.addEventListener("popstate", fire);
  return () => window.removeEventListener("popstate", fire);
}
