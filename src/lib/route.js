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

/**
 * Move without reloading. Same path is not a navigation.
 *
 * `replace` swaps the current entry instead of adding one, which an automatic
 * redirect must do: pushing "/" -> "/app" leaves "/" in history, and Back from the
 * app lands on a page that immediately redirects forward again. The reader is then
 * stuck, with no way out but closing the tab.
 */
export function go(path, { replace = false } = {}) {
  if (window.location.pathname === path) return;
  window.history[replace ? "replaceState" : "pushState"]({}, "", path);
  window.dispatchEvent(new PopStateEvent("popstate"));
}

/** Calls back with the new route on Back, Forward, and on `go`. */
export function onRouteChange(handler) {
  const fire = () => handler(routeFor());
  window.addEventListener("popstate", fire);
  return () => window.removeEventListener("popstate", fire);
}

/**
 * Should a visit to the public page go straight through to the app?
 *
 * Pulled out of the component so the rule can be tested, because it is the one piece
 * of this that is easy to get subtly wrong and invisible when it is:
 *
 *   - `authLoading` has to block the decision. Firebase answers asynchronously, and
 *     deciding before it does shows the landing page to a signed-in reader for a frame
 *     and then yanks it away.
 *   - `onboarded` is three-valued. `null` means the check has not finished, which is
 *     not the same as `false`, and treating it as false flashes the page at every
 *     returning reader.
 *   - A guest counts as returning. Someone who chose to use the app without an account
 *     has been here before; showing them a sign-up pitch on every launch is the bug
 *     this rule exists to avoid.
 */
export function shouldEnterApp({ route, signedIn, onboarded, authLoading }) {
  if (route !== "landing") return false;
  if (authLoading || onboarded === null) return false; // not decided yet
  return signedIn || onboarded === true;
}
