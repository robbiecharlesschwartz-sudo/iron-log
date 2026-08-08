import { useEffect, useRef, useState } from "react";
import { Calendar, Download, Dumbbell, History, TrendingUp, User, X } from "lucide-react";
import { C, INSTALL_DISMISS_KEY } from "../lib/constants";

export function BottomNav({ screen, setScreen }) {
  const tabs = [
    { id: "home", label: "Train", icon: Dumbbell },
    { id: "calendar", label: "Calendar", icon: Calendar },
    { id: "progress", label: "Progress", icon: TrendingUp },
    { id: "history", label: "History", icon: History },
    { id: "profile", label: "Profile", icon: User },
  ];
  return (
    <div className="fixed bottom-0 left-0 right-0 flex justify-center z-20" style={{ backgroundColor: "rgba(255,255,255,0.92)", backdropFilter: "blur(12px)", borderTop: `1px solid ${C.border}`, paddingBottom: "env(safe-area-inset-bottom, 0px)" }}>
      <div className="max-w-md w-full flex">
        {tabs.map((tb) => { const Icon = tb.icon; const a = screen === tb.id; return (
          <button key={tb.id} onClick={() => setScreen(tb.id)} className="flex-1 flex flex-col items-center gap-1 py-2.5"><Icon size={19} style={{ color: a ? C.ink : C.ink4 }} /><span className="text-[9.5px] font-semibold" style={{ color: a ? C.ink : C.ink4 }}>{tb.label}</span></button>
        ); })}
      </div>
    </div>
  );
}

/* ====================================================================== */
/* ROOT                                                                   */
/* ====================================================================== */
/* ====================================================================== */
/* INSTALL BANNER — one-time, dismissible, platform-aware                  */
/* ====================================================================== */


export function InstallBanner() {
  const [visible, setVisible] = useState(false);
  const [platform, setPlatform] = useState("other"); // "ios" | "android" | "other"
  const [showIosSheet, setShowIosSheet] = useState(false);
  const deferredRef = useRef(null);

  useEffect(() => {
    // Already installed / running standalone → never show
    const standalone = window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true;
    if (standalone) return;
    // Previously dismissed → respect it
    let dismissed = false;
    try { const v = localStorage.getItem(INSTALL_DISMISS_KEY); dismissed = v === "1"; } catch {}
    if (dismissed) return;

    const ua = window.navigator.userAgent || "";
    const isIOS = /iphone|ipad|ipod/i.test(ua) || (/Mac/.test(ua) && "ontouchend" in document);
    const isAndroid = /android/i.test(ua);

    if (isIOS) {
      setPlatform("ios");
      // iOS gives no install event — show the hint after a short delay so it isn't jarring on first paint
      const t = setTimeout(() => setVisible(true), 1500);
      return () => clearTimeout(t);
    }

    // Android / desktop Chrome: wait for the real install prompt so the button works
    const onBIP = (e) => {
      e.preventDefault();
      deferredRef.current = e;
      setPlatform(isAndroid ? "android" : "other");
      setVisible(true);
    };
    window.addEventListener("beforeinstallprompt", onBIP);
    // If already installed via appinstalled, hide
    const onInstalled = () => { setVisible(false); dismiss(); };
    window.addEventListener("appinstalled", onInstalled);
    return () => { window.removeEventListener("beforeinstallprompt", onBIP); window.removeEventListener("appinstalled", onInstalled); };
  }, []);

  function dismiss() {
    try { localStorage.setItem(INSTALL_DISMISS_KEY, "1"); } catch {}
    setVisible(false);
    setShowIosSheet(false);
  }

  async function handleInstall() {
    if (platform === "ios") { setShowIosSheet(true); return; }
    const ev = deferredRef.current;
    if (!ev) { dismiss(); return; }
    ev.prompt();
    try { await ev.userChoice; } catch {}
    deferredRef.current = null;
    dismiss();
  }

  if (!visible) return null;

  return (
    <>
      <div className="fixed left-0 right-0 z-40 flex justify-center px-4" style={{ bottom: "calc(env(safe-area-inset-bottom, 0px) + 74px)" }}>
        <div className="max-w-md w-full rounded-2xl flex items-center gap-3 px-3.5 py-3" style={{ backgroundColor: C.ink, boxShadow: "0 8px 28px rgba(0,0,0,0.28)" }}>
          <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: "rgba(255,255,255,0.12)" }}>
            <Download size={18} style={{ color: "#fff" }} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[13.5px] font-semibold leading-tight" style={{ color: "#fff" }}>Install Iron Log</div>
            <div className="text-[11.5px] leading-tight mt-0.5" style={{ color: "rgba(255,255,255,0.62)" }}>Full screen, home-screen icon, keeps the screen awake.</div>
          </div>
          <button onClick={handleInstall} className="rounded-xl px-3.5 py-2 text-[12.5px] font-semibold shrink-0" style={{ backgroundColor: "#fff", color: C.ink }}>
            {platform === "ios" ? "How" : "Install"}
          </button>
          <button onClick={dismiss} className="p-1.5 shrink-0" aria-label="Dismiss"><X size={16} style={{ color: "rgba(255,255,255,0.55)" }} /></button>
        </div>
      </div>

      {showIosSheet && (
        <div className="fixed inset-0 z-50 flex items-end justify-center" style={{ backgroundColor: "rgba(0,0,0,0.45)" }} onClick={dismiss}>
          <div className="max-w-md w-full rounded-t-3xl px-5 pt-5 pb-8" style={{ backgroundColor: C.bg }} onClick={(e) => e.stopPropagation()}>
            <div className="w-9 h-1 rounded-full mx-auto mb-4" style={{ backgroundColor: C.border2 }} />
            <div className="text-[17px] font-bold tracking-tight mb-1" style={{ color: C.ink }}>Add to Home Screen</div>
            <div className="text-[13px] mb-4" style={{ color: C.ink3 }}>iOS installs apps through the Share menu — two quick taps:</div>
            <div className="flex items-start gap-3 mb-3">
              <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-[13px] font-bold" style={{ backgroundColor: C.accentSoft, color: C.accentInk }}>1</div>
              <div className="text-[13.5px] pt-0.5" style={{ color: C.ink }}>Tap the <b>Share</b> button in Safari's toolbar (the square with an up arrow).</div>
            </div>
            <div className="flex items-start gap-3 mb-5">
              <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-[13px] font-bold" style={{ backgroundColor: C.accentSoft, color: C.accentInk }}>2</div>
              <div className="text-[13.5px] pt-0.5" style={{ color: C.ink }}>Scroll down and tap <b>Add to Home Screen</b>, then <b>Add</b>.</div>
            </div>
            <button onClick={dismiss} className="w-full rounded-2xl py-3 text-[14px] font-semibold" style={{ backgroundColor: C.ink, color: "#fff" }}>Got it</button>
          </div>
        </div>
      )}
    </>
  );
}

