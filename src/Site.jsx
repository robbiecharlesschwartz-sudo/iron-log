import { useCallback, useEffect, useState } from "react";
import IronLog from "./App.jsx";
import Landing from "./components/Landing.jsx";
import LegalPage from "./components/LegalPage.jsx";
import { APP_PATH, PAGES, go, onRouteChange, routeFor } from "./lib/route";
import { FB_ENABLED, useAuth } from "./lib/firebase";

/**
 * What the URL gets: the public page at "/", the app everywhere else.
 *
 * Sits above the app so the app itself is unchanged — it still knows nothing about
 * URLs and its screens are still state. All this does is decide whether to mount it,
 * and hand the landing page the buttons that lead in.
 *
 * Someone signed in who deliberately visits "/" still gets the public page, with the
 * buttons swapped for "Open app". Redirecting them away from a page they asked for
 * would mean they could never read it again, which is a strange thing to do to the one
 * page that explains the product.
 */
export default function Site() {
  const [route, setRoute] = useState(() => routeFor());
  /** What the auth screen should open on when the app mounts. */
  const [authIntent, setAuthIntent] = useState(null);
  const auth = useAuth();

  useEffect(() => onRouteChange(setRoute), []);

  /*
   * Keep the boot script's class in step with the route.
   *
   * index.html sets `at-root` before the first paint so a dark-mode reader does not
   * watch a white page turn dark. That runs once, on load — every move after it is a
   * pushState, which repaints nothing. Walking from the landing page into the app
   * would otherwise leave the class behind and stand the app, which is light and only
   * light, on a dark page.
   */
  useEffect(() => {
    document.documentElement.classList.toggle("at-root", route !== "app");
  }, [route]);

  const enter = useCallback((intent) => {
    setAuthIntent(intent ?? null);
    go(APP_PATH);
  }, []);

  // routeFor already resolved the path to a page name; PAGES is its source of truth.
  if (Object.values(PAGES).includes(route)) {
    return <LegalPage page={route} onHome={(event) => { event.preventDefault(); go("/"); }} />;
  }

  if (route === "landing") {
    return (
      <Landing
        signedIn={FB_ENABLED && !!auth.user}
        onSignUp={() => enter("signup")}
        onLogIn={() => enter("signin")}
        onOpenApp={() => enter(null)}
      />
    );
  }

  // `authIntent` is consumed once. Without clearing it, leaving the sign-in screen and
  // coming back later would reopen whichever tab the landing page chose minutes ago.
  // Signing out returns to the public page: the app still works signed out, so this is
  // a navigation rather than a lock-out.
  return (
    <IronLog
      authIntent={authIntent}
      onAuthIntentUsed={() => setAuthIntent(null)}
      onSignedOut={() => go("/")}
    />
  );
}
