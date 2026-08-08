import { useMemo, useState } from "react";
import { ArrowLeft, Calendar, ChevronLeft, ChevronRight } from "lucide-react";
import { ProfileScreen } from "./ProfileScreen";
import { C } from "../lib/constants";
import { fmtClock, formatSetGroups, sameDay, sessionAccentColor } from "../lib/sessionUtils";

export function CalendarScreen({ sessions, onOpenDay }) {
  const [cursor, setCursor] = useState(() => { const d = new Date(); d.setDate(1); d.setHours(0, 0, 0, 0); return d; });
  const byDay = useMemo(() => { const m = {}; for (const s of sessions) { const d = new Date(s.date); (m[`${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`] ||= []).push(s); } return m; }, [sessions]);
  const year = cursor.getFullYear(), month = cursor.getMonth();
  const firstW = (new Date(year, month, 1).getDay() + 6) % 7;
  const dim = new Date(year, month + 1, 0).getDate();
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const cells = []; for (let i = 0; i < firstW; i++) cells.push(null); for (let d = 1; d <= dim; d++) cells.push(d);

  return (
    <div className="px-5 pt-6 pb-32">
      <h1 className="text-[24px] font-bold tracking-tight mb-5" style={{ color: C.ink }}>Calendar</h1>
      <div className="flex items-center justify-between mb-4">
        <button onClick={() => { const d = new Date(cursor); d.setMonth(d.getMonth() - 1); setCursor(d); }} className="p-2 rounded-xl" style={{ backgroundColor: C.surface }}><ChevronLeft size={16} style={{ color: C.ink2 }} /></button>
        <div className="text-[15px] font-semibold" style={{ color: C.ink }}>{cursor.toLocaleDateString("en-US", { month: "long", year: "numeric" })}</div>
        <button onClick={() => { const d = new Date(cursor); d.setMonth(d.getMonth() + 1); setCursor(d); }} className="p-2 rounded-xl" style={{ backgroundColor: C.surface }}><ChevronRight size={16} style={{ color: C.ink2 }} /></button>
      </div>
      <div className="grid grid-cols-7 gap-1.5 mb-1.5">{["M", "T", "W", "T", "F", "S", "S"].map((l, i) => <div key={i} className="text-center text-[10px] font-semibold" style={{ color: C.ink3 }}>{l}</div>)}</div>
      <div className="grid grid-cols-7 gap-1.5">
        {cells.map((d, i) => {
          if (d === null) return <div key={i} />;
          const date = new Date(year, month, d);
          const ds = byDay[`${year}-${month}-${d}`];
          const isToday = sameDay(date, today);
          const border = isToday ? `2px solid ${C.ink}` : "none";
          if (!ds) return (
            <button key={i} disabled className="aspect-square rounded-xl flex items-center justify-center" style={{ backgroundColor: C.surface, border }}>
              <span className="text-[12px] font-semibold tabular-nums" style={{ color: C.ink3 }}>{d}</span>
            </button>
          );
          const colors = [...new Set(ds.map(s => sessionAccentColor(s)))];
          const c1 = colors[0], c2 = colors[1] || null;
          return (
            <button key={i} onClick={() => onOpenDay(ds, date)} className="aspect-square rounded-xl flex flex-col items-center justify-center overflow-hidden relative" style={{ border }}>
              {c2 ? (
                <>
                  <svg className="absolute inset-0 w-full h-full" viewBox="0 0 40 40" preserveAspectRatio="none">
                    <polygon points="0,0 40,0 0,40" fill={c1} />
                    <polygon points="40,0 40,40 0,40" fill={c2} />
                  </svg>
                  <span className="relative z-10 text-[12px] font-semibold tabular-nums drop-shadow" style={{ color: "#fff" }}>{d}</span>
                </>
              ) : (
                <>
                  <div className="absolute inset-0" style={{ backgroundColor: c1 }} />
                  <span className="relative z-10 text-[12px] font-semibold tabular-nums" style={{ color: "#fff" }}>{d}</span>
                  {ds.length > 1 && <span className="relative z-10 text-[8px] font-bold" style={{ color: "#fff" }}>×{ds.length}</span>}
                </>
              )}
            </button>
          );
        })}
      </div>
      <div className="flex items-center justify-center gap-4 mt-6 flex-wrap">{[["Push", C.push], ["Pull", C.pull], ["Legs", C.legs], ["Cardio", C.cardio]].map(([l, col]) => <div key={l} className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: col }} /><span className="text-[11.5px]" style={{ color: C.ink2 }}>{l}</span></div>)}</div>
    </div>
  );
}


export function DayDetailScreen({ daySessions, date, onBack }) {
  return (
    <div className="px-5 pt-5 pb-32">
      <div className="flex items-center gap-2 mb-5">
        <button onClick={onBack} className="p-2 -ml-2 rounded-lg" aria-label="Back"><ArrowLeft size={20} style={{ color: C.ink2 }} /></button>
        <div><h1 className="text-[18px] font-bold tracking-tight" style={{ color: C.ink }}>{date.toLocaleDateString("en-US", { weekday: "long" })}</h1><div className="text-[12px]" style={{ color: C.ink3 }}>{date.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}</div></div>
      </div>
      <div className="flex flex-col gap-3">
        {daySessions.map((s) => {
          const accent = sessionAccentColor(s);
          return (
            <div key={s.id} className="rounded-2xl p-4" style={{ backgroundColor: C.bg, border: `1px solid ${C.border}` }}>
              <div className="flex items-center gap-2 mb-2">
                <div className="w-1 h-4 rounded-full" style={{ backgroundColor: accent }} />
                <span className="text-[14px] font-bold tracking-tight" style={{ color: C.ink }}>{s.dayTitle}</span>
                <span className="ml-auto tabular-nums text-[11.5px]" style={{ color: C.ink3 }}>{fmtClock(s.totalElapsedSeconds)} · {s.volume.toLocaleString()} lb</span>
              </div>
              <div className="flex flex-col gap-2">
                {s.exercises.filter((e) => e.sets.length).map((e) => (
                  <div key={e.exId} className="text-[12px]" style={{ color: C.ink2 }}><div className="font-medium mb-0.5" style={{ color: C.ink }}>{e.selectedLift}</div><div className="tabular-nums">{formatSetGroups(e.sets).map((g, gi) => <span key={gi}>{gi > 0 ? " → " : ""}{g.parts.join(", ")}{g.lift && g.lift !== e.selectedLift ? ` (${g.lift})` : ""}</span>)}</div></div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}


/* ====================================================================== */
/* PROFILE — last 30 days, with all-time toggle                          */
/* ====================================================================== */
/* ── Inline auth for ProfileScreen ─────────────────────────────────────── */

