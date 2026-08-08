import { useMemo, useState } from "react";
import { Activity, ChevronDown, Search, TrendingDown, TrendingUp, X } from "lucide-react";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { MuscleHeatmap } from "./MuscleHeatmap";
import { Sparkline } from "./atoms";
import { ACCENT, C, CARD_SHADOW } from "../lib/constants";
import { MUSCLE_ORDER } from "../lib/exerciseLibrary";
import { HEATMAP_LANDMARKS, HEATMAP_REGIONS, RANGE_OPTS, VOLUME_LANDMARKS, heatmapStatus, regionContributionsFor } from "../lib/heatmapData";
import { withinDays } from "../lib/insights";
import { muscleForLift, normalizeLiftName } from "../lib/muscleMapping";
import { sessionVolume } from "../lib/sessionUtils";

export function ProgressScreen({ sessions, bodyWeight }) {
  const [rangeDays, setRangeDays] = useState(30); // default 1M
  const [expandedId, setExpandedId] = useState(null);
  const [selectedPoint, setSelectedPoint] = useState(null); // {key, date, note}
  const [query, setQuery] = useState("");
  const [collapsed, setCollapsed] = useState({}); // muscle -> bool
  const [showInfo, setShowInfo] = useState(false);
  const [viewMode, setViewMode] = useState("exercise"); // "exercise" | "load"

  const scoped = useMemo(() => sessions.filter(s => withinDays(s.date, rangeDays)), [sessions, rangeDays]);

  // Weeks actually covered by the data in view. For fixed ranges (1W/1M/6M) this is
  // the range itself; for "All" it spans from the FIRST logged session to today, so
  // per-week averages aren't diluted by an artificial 100000-day window.
  const effectiveWeeks = useMemo(() => {
    if (!scoped.length) return 1;
    if (rangeDays < 100000) return Math.max(1, rangeDays / 7);
    const times = scoped.map(s => new Date(s.date).getTime()).filter(t => !isNaN(t));
    if (!times.length) return 1;
    const first = Math.min(...times);
    const spanDays = (Date.now() - first) / 86400000;
    return Math.max(1, spanDays / 7);
  }, [scoped, rangeDays]);

  // Total training load per workout-day over time (sum of weight×reps per session, grouped by day template).
  // Muscle-group heatmap: weekly sets per muscle vs its landmarks, plus recency.
  // Region-level effective volume: each session's sets are distributed to one or more
  // heatmap regions using regionContributionsFor's primary/secondary weights, then
  // summed per region for the selected window AND for the equivalent prior window
  // (for the trend arrow), plus recency (for the recovery fade) and top contributors.
  const heatmapData = useMemo(() => {
    const now = Date.now();
    const windowMs = rangeDays < 100000 ? rangeDays * 86400000
      : (scoped.length ? now - Math.min(...scoped.map(s => new Date(s.date).getTime())) : 7 * 86400000);
    const prevStart = now - windowMs * 2, prevEnd = now - windowMs;
    const prevSessions = sessions.filter(s => { const t = new Date(s.date).getTime(); return t >= prevStart && t < prevEnd; });

    function tally(sessionList) {
      const setCount = {}, primarySets = {}, secondarySets = {}, exerciseSets = {}, lastHit = {}, sessionDates = {};
      for (const s of sessionList) {
        const t = new Date(s.date).getTime();
        for (const e of (s.exercises || [])) {
          const n = (e.sets || []).length;
          if (!n) continue;
          const libMuscle = muscleForLift(e.selectedLift);
          for (const [region, weight] of regionContributionsFor(e.selectedLift, libMuscle)) {
            const contributed = n * weight;
            setCount[region] = (setCount[region] || 0) + contributed;
            // weight >= 0.7 means this exercise treats the region as its PRIMARY target
            // (e.g. Bench Press → Chest); anything lighter is assistance/secondary work
            // (e.g. Bench Press → Shoulders, Triceps). Mirrors how the exercise library
            // itself is organized, so it needs no separate tagging.
            if (weight >= 0.7) primarySets[region] = (primarySets[region] || 0) + contributed;
            else secondarySets[region] = (secondarySets[region] || 0) + contributed;
            (exerciseSets[region] = exerciseSets[region] || {});
            exerciseSets[region][e.selectedLift] = (exerciseSets[region][e.selectedLift] || 0) + contributed;
            if (!lastHit[region] || t > lastHit[region]) lastHit[region] = t;
            (sessionDates[region] = sessionDates[region] || new Set()).add(s.date.slice(0, 10));
          }
        }
      }
      return { setCount, primarySets, secondarySets, exerciseSets, lastHit, sessionDates };
    }
    const cur = tally(scoped);
    const prev = tally(prevSessions);
    const weeks = effectiveWeeks;

    const byRegion = {};
    for (const region of HEATMAP_REGIONS) {
      const sets = cur.setCount[region] || 0;
      const prevSets = prev.setCount[region] || 0;
      const perWeek = sets / weeks;
      const lm = HEATMAP_LANDMARKS[region];
      // MEV/MAV/MRV/Untargeted — this region's weekly-average volume vs its own landmarks.
      const status = heatmapStatus(perWeek, lm);
      const daysAgo = cur.lastHit[region] ? Math.floor((now - cur.lastHit[region]) / 86400000) : null;
      const top = Object.entries(cur.exerciseSets[region] || {}).sort((a, b) => b[1] - a[1]).slice(0, 4).map(([name]) => name);
      const sessionCount = (cur.sessionDates[region] || new Set()).size;
      const freqPerWeek = sessionCount / weeks;
      const trendPct = prevSets > 0 ? ((sets - prevSets) / prevSets) * 100 : (sets > 0 ? 100 : 0);
      byRegion[region] = { region, sets, perWeek, status, landmarks: lm, daysAgo, topExercises: top, freqPerWeek, trendPct };
    }
    return byRegion;
  }, [scoped, sessions, rangeDays, effectiveWeeks]);

  const loadByDay = useMemo(() => {
    const byDay = {};
    for (const s of [...scoped].sort((a, b) => new Date(a.date) - new Date(b.date))) {
      const vol = sessionVolume(s);
      if (vol <= 0) continue;
      const key = s.dayId || s.dayTitle || "workout";
      (byDay[key] = byDay[key] || { key, title: s.dayTitle || "Workout", tag: s.dayTag, points: [] }).points.push({ t: new Date(s.date).getTime(), load: vol, dateKey: s.date.slice(0, 10) });
    }
    return Object.values(byDay).filter(d => d.points.length > 0).sort((a, b) => b.points[b.points.length - 1].t - a.points[a.points.length - 1].t);
  }, [scoped]);

  const groups = useMemo(() => {
    const nameMap = new Map();
    for (const s of [...scoped].sort((a, b) => new Date(a.date) - new Date(b.date))) {
      const dateKey = s.date.slice(0, 10);
      for (const e of (s.exercises || [])) {
        if (!(e.sets || []).length) continue;
        const top = Math.max(...e.sets.map((st) => Number(st.weight) || 0));
        const reps = e.sets.reduce((best, st) => {
          const w = Number(st.weight) || 0;
          return (w === top || top === 0) ? Math.max(best, Number(st.reps) || 0) : best;
        }, 0);
        const key = normalizeLiftName(e.selectedLift);
        if (!nameMap.has(key)) nameMap.set(key, { key, label: e.selectedLift, tag: s.dayTag, muscle: muscleForLift(e.selectedLift), byDate: new Map() });
        const slot = nameMap.get(key);
        slot.label = e.selectedLift;
        slot.muscle = muscleForLift(e.selectedLift);
        slot.tag = s.dayTag;
        const existing = slot.byDate.get(dateKey);
        if (!existing || top > existing.weight) {
          slot.byDate.set(dateKey, { t: new Date(s.date).getTime(), weight: top, reps, note: e.notes || "", dateKey });
        }
      }
    }
    const byMuscle = {};
    for (const [, slot] of nameMap.entries()) {
      const points = Array.from(slot.byDate.values()).sort((a, b) => a.t - b.t);
      if (!points.length) continue;
      const entry = { key: slot.key, label: slot.label, tag: slot.tag, muscle: slot.muscle, points };
      (byMuscle[slot.muscle] = byMuscle[slot.muscle] || []).push(entry);
    }
    for (const m in byMuscle) byMuscle[m].sort((a, b) => b.points[b.points.length - 1].t - a.points[a.points.length - 1].t);
    return byMuscle;
  }, [scoped]);

  // Weekly set volume per muscle (for landmarks)
  const weeklyVolume = useMemo(() => {
    const weeks = effectiveWeeks;
    const counts = {};
    for (const s of scoped) for (const e of (s.exercises || [])) {
      const m = muscleForLift(e.selectedLift);
      counts[m] = (counts[m] || 0) + (e.sets || []).length;
    }
    const perWeek = {};
    for (const m in counts) perWeek[m] = counts[m] / weeks;
    return perWeek;
  }, [scoped, effectiveWeeks]);

  const q = query.trim().toLowerCase();
  // Filter groups by search query
  const filteredGroups = useMemo(() => {
    if (!q) return groups;
    const out = {};
    for (const m in groups) {
      const matches = groups[m].filter(slot => slot.label.toLowerCase().includes(q));
      if (matches.length) out[m] = matches;
    }
    return out;
  }, [groups, q]);

  const muscles = MUSCLE_ORDER.filter((m) => filteredGroups[m]);

  return (
    <div className="pb-32" style={{ backgroundColor: C.bg }}>
      <div className="sticky z-10 px-5 pt-6 pb-3" style={{ top: 0, backgroundColor: C.bg, borderBottom: `1px solid ${C.border}` }}>
        <div className="flex items-center justify-between mb-3">
          <h1 className="text-[24px] font-bold tracking-tight" style={{ color: C.ink }}>Progress</h1>
          <button onClick={() => setShowInfo(v => !v)} className="text-[11px] font-semibold px-2.5 py-1.5 rounded-lg" style={{ backgroundColor: C.surface, color: C.ink3 }}>What do these ranges mean?</button>
        </div>
        {showInfo && (
          <div className="rounded-xl p-3 mb-3 text-[12px] leading-relaxed" style={{ backgroundColor: C.accentSoft, color: C.accentInk }}>
            <div className="mb-1"><b>Building</b> — below the range most lifters need to see consistent growth. Room to add sets.</div>
            <div className="mb-1"><b>Productive</b> — a reasonable, commonly effective weekly range for hypertrophy in most lifters.</div>
            <div><b>High</b> — more volume than typical. Can still be productive if your recovery and performance hold up — these ranges are starting points, not hard limits specific to you.</div>
          </div>
        )}
        <div className="flex items-center gap-2 rounded-xl px-3 mb-3" style={{ backgroundColor: C.surface }}>
          <Search size={15} style={{ color: C.ink4 }} />
          <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search an exercise…" className="flex-1 bg-transparent py-2.5 text-[14px] outline-none" style={{ color: C.ink }} />
          {query && <button onClick={() => setQuery("")} className="p-1"><X size={14} style={{ color: C.ink4 }} /></button>}
        </div>
        <div className="flex gap-1.5 p-1 rounded-xl" style={{ backgroundColor: C.surface }}>
          {RANGE_OPTS.map(([lab, days]) => (
            <button key={lab} onClick={() => setRangeDays(days)} className="flex-1 py-2 rounded-lg text-[12.5px] font-semibold" style={{ backgroundColor: rangeDays === days ? C.bg : "transparent", color: rangeDays === days ? C.ink : C.ink3, boxShadow: rangeDays === days ? CARD_SHADOW : "none" }}>{lab}</button>
          ))}
        </div>
        <div className="flex gap-1.5 p-1 rounded-xl mt-2" style={{ backgroundColor: C.surface }}>
          {[["exercise", "Exercises"], ["load", "Load / day"], ["heatmap", "Heatmap"]].map(([m, lab]) => (
            <button key={m} onClick={() => setViewMode(m)} className="flex-1 py-2 rounded-lg text-[12.5px] font-semibold" style={{ backgroundColor: viewMode === m ? C.bg : "transparent", color: viewMode === m ? C.ink : C.ink3, boxShadow: viewMode === m ? CARD_SHADOW : "none" }}>{lab}</button>
          ))}
        </div>
      </div>

      {viewMode === "heatmap" ? (
        <MuscleHeatmap data={heatmapData} rangeDays={rangeDays} weeks={effectiveWeeks} />
      ) : viewMode === "load" ? (
        <div className="px-5 pt-4">
          {loadByDay.length === 0 ? (
            <div className="text-center py-16" style={{ color: C.ink3 }}>
              <Activity size={26} className="mx-auto mb-2" style={{ color: C.ink4 }} />
              <div className="text-[14px]">No load logged in this range.</div>
            </div>
          ) : loadByDay.map((d) => {
            const first = d.points[0].load, last = d.points[d.points.length - 1].load;
            const delta = d.points.length > 1 ? last - first : null;
            const accent = ACCENT[d.tag] || C.accent;
            const chartData = d.points.map(p => ({ date: p.dateKey, load: p.load }));
            return (
              <div key={d.key} className="mb-4 rounded-2xl p-4" style={{ backgroundColor: C.bg, border: `1px solid ${C.border}` }}>
                <div className="flex items-baseline justify-between mb-1">
                  <span className="text-[14px] font-bold tracking-tight" style={{ color: C.ink }}>{d.title}</span>
                  <span className="text-[12px] font-semibold tabular-nums" style={{ color: C.ink }}>{Math.round(last).toLocaleString()} lb</span>
                </div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-[11px]" style={{ color: C.ink3 }}>{d.points.length} sessions</span>
                  {delta !== null && <span className="text-[11px] font-semibold tabular-nums" style={{ color: delta >= 0 ? C.good : C.bad }}>{delta >= 0 ? "▲" : "▼"} {Math.abs(Math.round(delta)).toLocaleString()} lb total load</span>}
                </div>
                <div style={{ height: 120 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData} margin={{ top: 6, right: 6, bottom: 0, left: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke={C.border} vertical={false} />
                      <XAxis dataKey="date" tick={{ fontSize: 9, fill: C.ink4 }} tickFormatter={(v) => v.slice(5)} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 9, fill: C.ink4 }} axisLine={false} tickLine={false} width={38} tickFormatter={(v) => v >= 1000 ? (v/1000).toFixed(1)+"k" : v} />
                      <Tooltip formatter={(v) => [Math.round(v).toLocaleString() + " lb", "Load"]} labelStyle={{ fontSize: 11 }} contentStyle={{ fontSize: 11, borderRadius: 8 }} />
                      <Line type="natural" dataKey="load" stroke={accent} strokeWidth={2.5} dot={{ r: 3, fill: accent }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
      <div className="px-5 pt-4">
      {muscles.length === 0 ? (
        <div className="text-center py-16" style={{ color: C.ink3 }}>
          <Activity size={26} className="mx-auto mb-2" style={{ color: C.ink4 }} />
          <div className="text-[14px]">No sets logged in this range.</div>
          <div className="text-[12.5px] mt-1">Finish a workout to start tracking trends.</div>
        </div>
      ) : muscles.map((muscle) => {
        const slots = filteredGroups[muscle];
        const sessionCount = slots.reduce((a, s) => a + s.points.length, 0);
        const wv = weeklyVolume[muscle];
        const landmarks = VOLUME_LANDMARKS[muscle];
        const isCollapsed = collapsed[muscle] && !q; // search overrides collapse
        return (
          <div key={muscle} className="mb-6">
            <button onClick={() => setCollapsed(c => ({ ...c, [muscle]: !c[muscle] }))} className="w-full flex items-baseline justify-between mb-1.5">
              <span className="text-[15px] font-bold tracking-tight flex items-center gap-1.5" style={{ color: C.ink }}>
                <ChevronDown size={15} style={{ color: C.ink3, transform: isCollapsed ? "rotate(-90deg)" : "none", transition: "transform 0.15s" }} />
                {muscle}
              </span>
              <span className="text-[11px]" style={{ color: C.ink3 }}>{slots.length} {slots.length === 1 ? "lift" : "lifts"} · {sessionCount} sessions</span>
            </button>
            {!isCollapsed && <>
            {/* Volume landmark bar */}
            {wv != null && landmarks && (
              <div className="mb-2.5 rounded-xl p-2.5" style={{ backgroundColor: C.surface }}>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[10px] uppercase tracking-wide font-semibold" style={{ color: C.ink3 }}>Weekly volume</span>
                  <span className="text-[11px] font-semibold tabular-nums" style={{ color: vColor(wv, landmarks) }}>{wv.toFixed(1)} sets/wk · {vLabel(wv, landmarks)}</span>
                </div>
                <div className="relative h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: C.border }}>
                  <div className="absolute inset-y-0 left-0 rounded-full" style={{ width: `${Math.min(100, (wv / landmarks[2]) * 100)}%`, backgroundColor: vColor(wv, landmarks) }} />
                </div>
                <div className="flex justify-between mt-1 text-[9px]" style={{ color: C.ink4 }}>
                  <span>MEV {landmarks[0]}</span><span>MAV {landmarks[1]}</span><span>MRV {landmarks[2]}</span>
                </div>
              </div>
            )}
            <div className="flex flex-col gap-2">
              {slots.map((slot) => {
                const accent = ACCENT[slot.tag] || C.accent;
                const last = slot.points[slot.points.length - 1].weight;
                const prev = slot.points.length > 1 ? slot.points[slot.points.length - 2].weight : null;
                const delta = prev !== null ? last - prev : null;
                const open = expandedId === slot.key;
                const chartData = slot.points.map((p) => ({ t: p.t, weight: p.weight, reps: p.reps, note: p.note, dateKey: p.dateKey }));
                const s2w = bodyWeight ? (last / bodyWeight).toFixed(2) : null;
                return (
                  <div key={slot.key} className="rounded-2xl overflow-hidden" style={{ backgroundColor: C.bg, border: `1px solid ${open ? C.border2 : C.border}`, boxShadow: open ? CARD_SHADOW : "none" }}>
                    <button onClick={() => { setExpandedId(open ? null : slot.key); setSelectedPoint(null); }} className="w-full flex items-center gap-3 p-3.5 text-left">
                      <div className="flex-1 min-w-0">
                        <div className="text-[14px] font-semibold truncate" style={{ color: C.ink }}>{slot.label}</div>
                        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                          <span className="tabular-nums text-[12px]" style={{ color: C.ink2 }}>{last} lb</span>
                          {delta !== null && delta !== 0 && <span className="text-[12px] tabular-nums flex items-center gap-0.5" style={{ color: delta > 0 ? C.good : C.bad }}>{delta > 0 ? <TrendingUp size={10} /> : <TrendingDown size={10} />}{delta > 0 ? "+" : ""}{delta}</span>}
                          {s2w && <span className="text-[11px] tabular-nums px-1.5 py-0.5 rounded-md" style={{ backgroundColor: C.accentSoft, color: C.accent }}>{s2w}× BW</span>}
                        </div>
                      </div>
                      <Sparkline values={slot.points.map((p) => p.weight)} color={accent} />
                      <ChevronDown size={14} style={{ color: C.ink4, transform: open ? "rotate(180deg)" : "none" }} />
                    </button>
                    {open && (
                      <div className="px-2 pb-3">
                        <div style={{ width: "100%", height: 168 }}>
                          <ResponsiveContainer>
                            <LineChart data={chartData} margin={{ top: 8, right: 16, left: -4, bottom: 0 }}
                              onClick={(e) => { if (e && e.activePayload && e.activePayload[0]) { const p = e.activePayload[0].payload; setSelectedPoint({ key: slot.key, date: new Date(p.t).toLocaleDateString(), note: p.note, weight: p.weight, reps: p.reps }); } }}>
                              <CartesianGrid stroke={C.border} vertical={false} />
                              <XAxis dataKey="t" type="number" scale="time" domain={["dataMin", "dataMax"]} tickFormatter={(v) => new Date(v).toLocaleDateString("en-US", { month: "short", day: "numeric" })} tick={{ fontSize: 10, fill: C.ink3 }} axisLine={{ stroke: C.border }} tickLine={false} />
                              <YAxis tick={{ fontSize: 10, fill: C.ink3 }} axisLine={false} tickLine={false} width={38} />
                              <Tooltip contentStyle={{ backgroundColor: "#fff", border: `1px solid ${C.border2}`, borderRadius: 10, fontSize: 12, boxShadow: CARD_SHADOW }} labelStyle={{ color: C.ink3 }} itemStyle={{ color: C.ink }} labelFormatter={(v) => new Date(v).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })} formatter={(val, n, p) => [`${val} lb × ${p.payload.reps}${p.payload.note ? " 📝" : ""}`, "Top set"]} />
                              <Line type="natural" dataKey="weight" stroke={accent} strokeWidth={2.5} dot={(props) => { const has = props.payload.note; return <circle key={props.cx} cx={props.cx} cy={props.cy} r={has ? 5 : 3.5} fill={has ? C.accent : accent} stroke={has ? "#fff" : "none"} strokeWidth={has ? 1.5 : 0} />; }} activeDot={{ r: 6 }} />
                            </LineChart>
                          </ResponsiveContainer>
                        </div>
                        {selectedPoint && selectedPoint.key === slot.key && (
                          <div className="mx-2 mt-1 rounded-xl p-3" style={{ backgroundColor: C.surface }}>
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-[12px] font-semibold" style={{ color: C.ink }}>{selectedPoint.date}</span>
                              <span className="text-[11px] tabular-nums" style={{ color: C.ink3 }}>{selectedPoint.weight} lb × {selectedPoint.reps}</span>
                            </div>
                            {selectedPoint.note ? <div className="text-[12px]" style={{ color: C.ink2 }}>{selectedPoint.note}</div> : <div className="text-[11px] italic" style={{ color: C.ink4 }}>No notes for this day.</div>}
                          </div>
                        )}
                        {!selectedPoint && <div className="text-[10.5px] text-center mt-1" style={{ color: C.ink4 }}>Tap a point on the chart to see that day's notes</div>}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            </>}
          </div>
        );
      })}
      </div>
      )}
    </div>
  );
}


export function vLabel(v, [mev, mav, mrv]) { if (v < mev) return "below MEV"; if (v < mav) return "growth zone"; if (v <= mrv) return "high"; return "over MRV"; }


export function vColor(v, [mev, mav, mrv]) { if (v < mev) return C.ink3; if (v < mav) return C.good; if (v <= mrv) return C.warn; return C.bad; }

/* ====================================================================== */
/* HISTORY — swipe + multi-select delete                                 */
/* ====================================================================== */

