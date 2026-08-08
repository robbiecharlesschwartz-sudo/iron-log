import { ArrowLeft, ArrowUpRight, Sparkles, User } from "lucide-react";
import { InsightCard } from "./atoms";
import { C } from "../lib/constants";
import { estDurationMin } from "../lib/insights";
import { dayAccentColor } from "../lib/sessionUtils";

export function CoachScreen({ insights, nextDay, onBack, onStartNext, profileName }) {
  const accent = nextDay ? dayAccentColor(nextDay) : C.accent;
  return (
    <div className="px-5 pt-5 pb-32">
      <div className="flex items-center gap-2 mb-5">
        <button onClick={onBack} className="p-2 -ml-2 rounded-lg" aria-label="Back"><ArrowLeft size={20} style={{ color: C.ink2 }} /></button>
        <div className="flex items-center gap-2"><div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ backgroundColor: C.accentSoft }}><Sparkles size={16} style={{ color: C.accent }} /></div><h1 className="text-[20px] font-bold tracking-tight" style={{ color: C.ink }}>Coach</h1></div>
      </div>

      {profileName && profileName !== "User" && (
        <div className="text-[14px] mb-4" style={{ color: C.ink2 }}>Here's what stands out, <span className="font-semibold" style={{ color: C.ink }}>{profileName}</span>.</div>
      )}

      {nextDay && (
        <div className="rounded-2xl p-4 mb-4" style={{ backgroundColor: C.ink }}>
          <div className="text-[11px] uppercase tracking-[0.12em] font-bold mb-1" style={{ color: "rgba(255,255,255,0.55)" }}>Recommended next</div>
          <div className="text-[20px] font-bold tracking-tight mb-1" style={{ color: "#fff" }}>{nextDay.title}</div>
          <div className="text-[12.5px] mb-3" style={{ color: "rgba(255,255,255,0.7)" }}>{nextDay.subtitle} · ~{estDurationMin(nextDay)} min</div>
          <button onClick={() => onStartNext(nextDay)} className="rounded-xl px-4 py-2.5 text-[13px] font-semibold flex items-center gap-1.5" style={{ backgroundColor: "#fff", color: C.ink }}>Start now <ArrowUpRight size={15} /></button>
        </div>
      )}

      <div className="flex flex-col gap-2.5">{insights.map((ins) => <InsightCard key={ins.id} insight={ins} />)}</div>

      <div className="rounded-2xl p-4 mt-4 text-center" style={{ backgroundColor: C.surface }}>
        <div className="text-[12.5px]" style={{ color: C.ink3 }}>Your coach surfaces these observations automatically from everything you log.</div>
      </div>
    </div>
  );
}

/* ====================================================================== */
/* NAV                                                                    */
/* ====================================================================== */

