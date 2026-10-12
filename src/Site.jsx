import { useCallback, useEffect, useState } from "react";
import IronLog from "./App.jsx";
import Landing from "./components/Landing.jsx";
import LegalPage from "./components/LegalPage.jsx";
import { APP_PATH, PAGES, go, onRouteChange, routeFor, shouldEnterApp } from "./lib/route";
import { FB_ENABLED, useAuth } from "./lib/firebase";
import { C, FONT, ONBOARD_KEY } from "./lib/constants";
import { Logo } from "./components/atoms";

/**
 * What the URL gets: the public page at "/", the app everywhere else.
 *
 * Sits above the app so the app itself is unchanged — it still knows nothing about
 * URLs and its screens are still state. All this does is decide whether to mount it,
 * and hand the landing page the buttons that lead in.
 *
 * The public page is for people who have not been here before. Anyone with an account,
 * or who already chose to use it without one, is sent straight through to the app —
 * opening your own training log should not mean reading a pitch for it first.
 */
export default function Site() {
  const [route, setRoute] = useState(() => routeFor());
  /** What the auth screen should open on when the app mounts. */
  const [authIntent, setAuthIntent] = useState(null);
  const auth = useAuth();
  /** null until the check finishes: "unknown" has to be distinct from "no". */
  const [onboarded, setOnboarded] = useState(null);

  useEffect(() => onRouteChange(setRoute), []);

  useEffect(() => {
    // window.storage.get rejects when the key is absent — that is its "not found".
    window.storage.get(ONBOARD_KEY).then(() => setOnboarded(true)).catch(() => setOnboarded(false));
  }, []);

  const signedIn = FB_ENABLED && !!auth.user;
  // The rule itself lives in route.js, where it can be tested. See shouldEnterApp.
  const enterApp = shouldEnterApp({ route, signedIn, onboarded, authLoading: auth.authLoading });
  const undecided = auth.authLoading || onboarded === null;

  useEffect(() => {
    if (enterApp) go(APP_PATH, { replace: true });
  }, [enterApp]);

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
    // Either still deciding, or decided and on the way out. Showing the public page in
    // the meantime is the flash this whole dance exists to avoid; the app's own splash
    // is what a returning reader expects to see.
    if (undecided || enterApp) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center gap-3"
          style={{ backgroundColor: C.bg, fontFamily: FONT }}>
          <Logo size={48} />
          <div className="text-[13px]" style={{ color: C.ink3 }}>Loading…</div>
        </div>
      );
    }
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
