import { useMemo, useState } from "react";
import { Activity, Award, Clock, Download, Flame, LogOut, RefreshCw, Search, SlidersHorizontal, TrendingUp, User, X } from "lucide-react";
import { AuthInline } from "./AuthScreen";
import { SyncBadge } from "./atoms";
import { C, CARD_SHADOW, RETENTION_DAYS } from "../lib/constants";
import { exportToExcel } from "../lib/excelExport";
import { FB_ENABLED } from "../lib/firebase";
import { computeStreak, withinDays } from "../lib/insights";
import { DEFAULT_LANDMARKS, MUSCLE_GROUPS, resolveLandmarks } from "../lib/landmarks";
import { fmtClock } from "../lib/sessionUtils";

export function ProfileScreen({ sessions, customDays, dayAdds, user, auth, syncStatus, syncError, lastSyncedAt, onForceSync, profileName, firstName, lastName, onUpdateName, bodyWeight, onUpdateBodyWeight, landmarkOverrides, onUpdateLandmarks }) {
  const [allTime, setAllTime] = useState(false);
  const scoped = useMemo(() => allTime ? sessions : sessions.filter((s) => withinDays(s.date, 30)), [sessions, allTime]);

  const stats = useMemo(() => {
    const totalWorkouts = scoped.length;
    const totalVolume = scoped.reduce((a, s) => a + (s.volume || 0), 0);
    const totalSeconds = scoped.reduce((a, s) => a + (s.totalElapsedSeconds || 0), 0);
    const workSeconds = scoped.reduce((a, s) => a + (s.workSeconds || 0), 0);
    const totalSets = scoped.reduce((a, s) => a + s.exercises.reduce((b, e) => b + e.sets.length, 0), 0);
    const tagCounts = { PUSH: 0, PULL: 0, LEGS: 0, CUSTOM: 0 };
    for (const s of scoped) tagCounts[s.dayTag] = (tagCounts[s.dayTag] || 0) + 1;
    const titleCounts = {}; for (const s of scoped) titleCounts[s.dayTitle] = (titleCounts[s.dayTitle] || 0) + 1;
    const favoriteDay = Object.entries(titleCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || "—";
    const prs = {};
    for (const s of scoped) for (const e of s.exercises) for (const st of e.sets) { const name = st.lift || e.selectedLift; const w = Number(st.weight) || 0; if (!prs[name] || w > prs[name].weight) prs[name] = { weight: w, reps: Number(st.reps) || 0 }; }
    const topPRs = Object.entries(prs).filter(([, v]) => v.weight > 0).sort((a, b) => b[1].weight - a[1].weight).slice(0, 5);
    const byEx = {};
    for (const s of [...scoped].sort((a, b) => new Date(a.date) - new Date(b.date))) for (const e of s.exercises) { if (!e.sets.length) continue; const top = Math.max(...e.sets.map((st) => Number(st.weight) || 0)); (byEx[e.exId] = byEx[e.exId] || { label: e.selectedLift, pts: [] }).pts.push(top); byEx[e.exId].label = e.selectedLift; }
    let mostImproved = null; for (const v of Object.values(byEx)) { if (v.pts.length < 2) continue; const gain = v.pts[v.pts.length - 1] - v.pts[0]; if (!mostImproved || gain > mostImproved.gain) mostImproved = { label: v.label, gain }; }
    const weeks = allTime ? Math.max(1, RETENTION_DAYS / 7) : 30 / 7;
    return { totalWorkouts, totalVolume, totalSeconds, workSeconds, totalSets, tagCounts, favoriteDay, topPRs, mostImproved, perWeek: totalWorkouts / weeks };
  }, [scoped, allTime]);

  const streak = useMemo(() => computeStreak(sessions), [sessions]);
  const workRatio = stats.totalSeconds ? Math.round((stats.workSeconds / stats.totalSeconds) * 100) : 0;
  const balanceTotal = stats.tagCounts.PUSH + stats.tagCounts.PULL + stats.tagCounts.LEGS || 1;
  const cards = [["Workouts", String(stats.totalWorkouts)], ["Volume", `${(stats.totalVolume / 1000).toFixed(1)}k lb`], ["Time", fmtClock(stats.totalSeconds)], ["Sets", String(stats.totalSets)], ["Streak", `${streak}`], ["Per week", stats.perWeek.toFixed(1)]];

  const [editingName, setEditingName] = useState(false);
  const [nameFirst, setNameFirst] = useState(firstName || "");
  const [nameLast, setNameLast] = useState(lastName || "");
  const nameInp = { backgroundColor: C.surface, color: C.ink, borderRadius: 10, padding: "9px 12px", fontSize: 15, outline: "none", border: `1px solid ${C.border}` };
  function startEditName() { setNameFirst(firstName || ""); setNameLast(lastName || ""); setEditingName(true); }
  function saveEditName() {
    if (!nameFirst.trim()) return;
    onUpdateName?.(nameFirst.trim(), nameLast.trim());
    setEditingName(false);
  }

  const [editingLandmarks, setEditingLandmarks] = useState(false);
  const [landmarkDraft, setLandmarkDraft] = useState(null);
  function openLandmarkEditor() { setLandmarkDraft(resolveLandmarks(landmarkOverrides)); setEditingLandmarks(true); }
  function updateDraft(muscle, idx, value) {
    setLandmarkDraft((prev) => {
      const next = { ...prev, [muscle]: [...prev[muscle]] };
      next[muscle][idx] = Math.max(0, Number(value) || 0);
      return next;
    });
  }
  function saveLandmarks() { onUpdateLandmarks?.(landmarkDraft); setEditingLandmarks(false); }
  function resetLandmarks() { setLandmarkDraft({ ...DEFAULT_LANDMARKS }); }

  return (
    <div className="px-5 pt-6 pb-32">
      {editingName ? (
        <div className="rounded-2xl p-4 mb-5" style={{ backgroundColor: C.surface, border: `1px solid ${C.border}` }}>
          <div className="text-[12px] font-semibold mb-2.5" style={{ color: C.ink }}>Edit name</div>
          <div className="flex gap-2 mb-2.5">
            <input style={{ ...nameInp, flex: 1 }} placeholder="First name" value={nameFirst} onChange={e => setNameFirst(e.target.value)} autoFocus onKeyDown={e => e.key === "Enter" && saveEditName()} />
            <input style={{ ...nameInp, flex: 1 }} placeholder="Last name (optional)" value={nameLast} onChange={e => setNameLast(e.target.value)} onKeyDown={e => e.key === "Enter" && saveEditName()} />
          </div>
          <div className="flex gap-2">
            <button onClick={saveEditName} disabled={!nameFirst.trim()} className="flex-1 rounded-xl py-2.5 text-[13px] font-semibold" style={{ backgroundColor: nameFirst.trim() ? C.ink : C.border, color: nameFirst.trim() ? "#fff" : C.ink3 }}>Save</button>
            <button onClick={() => setEditingName(false)} className="flex-1 rounded-xl py-2.5 text-[13px] font-semibold" style={{ backgroundColor: C.bg, color: C.ink2, border: `1px solid ${C.border2}` }}>Cancel</button>
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-3 mb-5">
          <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ backgroundColor: C.ink }}><span className="text-[18px] font-bold" style={{ color: "#fff" }}>{(profileName || "User")[0].toUpperCase()}</span></div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="text-[22px] font-bold tracking-tight truncate" style={{ color: C.ink }}>{profileName || "User"}</h1>
              <button onClick={startEditName} className="p-1.5 rounded-lg shrink-0" style={{ backgroundColor: C.surface }} aria-label="Edit name"><Search size={0} /><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={C.ink3} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4Z"/></svg></button>
            </div>
            <div className="text-[12px]" style={{ color: C.ink3 }}>{user?.email || "Local profile"}</div>
          </div>
        </div>
      )}

      <div className="flex gap-1.5 mb-5 p-1 rounded-xl" style={{ backgroundColor: C.surface }}>
        {[["Last 30 days", false], ["All time", true]].map(([lab, val]) => (
          <button key={lab} onClick={() => setAllTime(val)} className="flex-1 py-2 rounded-lg text-[12.5px] font-semibold" style={{ backgroundColor: allTime === val ? C.bg : "transparent", color: allTime === val ? C.ink : C.ink3, boxShadow: allTime === val ? CARD_SHADOW : "none" }}>{lab}</button>
        ))}
      </div>

      {scoped.length === 0 ? (
        <div className="text-center py-12" style={{ color: C.ink3 }}><User size={26} className="mx-auto mb-2" style={{ color: C.ink4 }} /><div className="text-[14px]">No workouts in this window.</div><div className="text-[12.5px] mt-1">Log a few to unlock your dashboard.</div></div>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-2 mb-5">
            {cards.map(([l, v]) => <div key={l} className="rounded-2xl p-3.5" style={{ backgroundColor: C.surface }}><div className="tabular-nums text-[18px] font-bold" style={{ color: C.ink }}>{v}</div><div className="text-[9px] uppercase tracking-wide mt-0.5" style={{ color: C.ink3 }}>{l}</div></div>)}
          </div>
          <div className="rounded-2xl p-4 mb-4" style={{ backgroundColor: C.bg, border: `1px solid ${C.border}` }}>
            <div className="text-[11px] uppercase tracking-[0.1em] font-bold mb-3" style={{ color: C.ink3 }}>Push / Pull / Legs balance</div>
            <div className="flex h-3 rounded-full overflow-hidden mb-2" style={{ backgroundColor: C.surface }}>
              <div style={{ width: `${(stats.tagCounts.PUSH / balanceTotal) * 100}%`, backgroundColor: C.push }} />
              <div style={{ width: `${(stats.tagCounts.PULL / balanceTotal) * 100}%`, backgroundColor: C.pull }} />
              <div style={{ width: `${(stats.tagCounts.LEGS / balanceTotal) * 100}%`, backgroundColor: C.legs }} />
            </div>
            <div className="flex justify-between text-[11.5px] tabular-nums"><span style={{ color: C.push }}>Push {stats.tagCounts.PUSH}</span><span style={{ color: C.pull }}>Pull {stats.tagCounts.PULL}</span><span style={{ color: C.legs }}>Legs {stats.tagCounts.LEGS}</span></div>
          </div>
          <div className="grid grid-cols-2 gap-2 mb-4">
            <div className="rounded-2xl p-3.5" style={{ backgroundColor: C.bg, border: `1px solid ${C.border}` }}><Clock size={15} style={{ color: C.accent }} /><div className="tabular-nums text-[15px] font-bold mt-2" style={{ color: C.ink }}>{workRatio}%</div><div className="text-[10px]" style={{ color: C.ink3 }}>work vs rest time</div></div>
            <div className="rounded-2xl p-3.5" style={{ backgroundColor: C.bg, border: `1px solid ${C.border}` }}><Flame size={15} style={{ color: C.push }} /><div className="text-[15px] font-bold mt-2 truncate" style={{ color: C.ink }}>{stats.favoriteDay}</div><div className="text-[10px]" style={{ color: C.ink3 }}>most-trained day</div></div>
          </div>
          {stats.mostImproved && stats.mostImproved.gain > 0 && (
            <div className="rounded-2xl p-3.5 mb-4 flex items-center gap-3" style={{ backgroundColor: C.goodSoft }}><TrendingUp size={18} style={{ color: C.good }} /><div><div className="text-[14px] font-semibold" style={{ color: C.ink }}>{stats.mostImproved.label}</div><div className="text-[12px]" style={{ color: C.good }}>most improved · +{stats.mostImproved.gain} lb</div></div></div>
          )}
          {stats.topPRs.length > 0 && (
            <div className="rounded-2xl p-4" style={{ backgroundColor: C.bg, border: `1px solid ${C.border}` }}>
              <div className="flex items-center gap-1.5 mb-3"><Award size={14} style={{ color: C.warn }} /><span className="text-[11px] uppercase tracking-[0.1em] font-bold" style={{ color: C.ink3 }}>Heaviest sets</span></div>
              <div className="flex flex-col gap-2">{stats.topPRs.map(([name, v]) => <div key={name} className="flex items-center justify-between"><span className="text-[13px] truncate mr-2" style={{ color: C.ink }}>{name}</span><span className="tabular-nums text-[12.5px] shrink-0" style={{ color: C.ink2 }}>{v.weight} lb × {v.reps}</span></div>)}</div>
            </div>
          )}
        </>
      )}

      {/* ── Account & Sync ─────────────────────────────────────────── */}
      {FB_ENABLED && (
        <div className="mt-5">
          <div className="text-[11px] font-bold uppercase tracking-[0.14em] mb-2" style={{ color: C.ink3 }}>Account</div>
          <div className="rounded-2xl overflow-hidden" style={{ border: `1px solid ${C.border}` }}>
            {user ? (
              <>
                <div className="p-4 flex items-center gap-3" style={{ borderBottom: `1px solid ${C.border}` }}>
                  <div className="w-10 h-10 rounded-full flex items-center justify-center text-[16px] font-bold" style={{ backgroundColor: C.accentSoft, color: C.accent }}>
                    {(user.displayName || user.email || "U")[0].toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[13px] font-semibold truncate" style={{ color: C.ink }}>{user.displayName || user.email}</div>
                    <div className="text-[11px] truncate" style={{ color: C.ink3 }}>{user.email}</div>
                  </div>
                  <SyncBadge status={syncStatus} />
                </div>
                {syncStatus === "synced" && lastSyncedAt && (
                  <div className="px-3.5 py-2 text-[11px]" style={{ color: C.ink3, borderBottom: `1px solid ${C.border}` }}>
                    Last confirmed upload: {new Date(lastSyncedAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
                  </div>
                )}
                {syncStatus === "failed" && syncError && (
                  <div className="px-3.5 py-2.5 text-[11.5px] leading-snug" style={{ backgroundColor: C.badSoft, color: C.bad, borderBottom: `1px solid ${C.border}` }}>
                    <span className="font-semibold">Sync error: </span>{syncError}
                  </div>
                )}
                <button onClick={onForceSync} className="w-full p-3.5 flex items-center gap-2.5 text-[13px] font-semibold text-left" style={{ borderBottom: `1px solid ${C.border}`, color: C.ink }}>
                  <RefreshCw size={15} style={{ color: C.ink3 }} /> Force Sync
                  <span className="ml-auto text-[11px]" style={{ color: C.ink4 }}>Re-upload pending</span>
                </button>
                <button onClick={() => auth.logout()} className="w-full p-3.5 flex items-center gap-2.5 text-[13px] font-semibold text-left" style={{ color: C.bad }}>
                  <LogOut size={15} /> Sign out
                </button>
              </>
            ) : (
              <>
                <div className="p-4" style={{ borderBottom: `1px solid ${C.border}` }}>
                  <div className="text-[13px] font-semibold mb-0.5" style={{ color: C.ink }}>Sync across devices</div>
                  <div className="text-[12px]" style={{ color: C.ink3 }}>Create a free account to back up your workouts and access them anywhere.</div>
                </div>
                <AuthInline auth={auth} />
              </>
            )}
          </div>
        </div>
      )}

      {/* ── Body weight (powers strength-to-weight) ─────────────────── */}
      <div className="mt-4">
        <div className="text-[11px] font-bold uppercase tracking-[0.14em] mb-2" style={{ color: C.ink3 }}>Body weight</div>
        <div className="rounded-2xl p-3.5 flex items-center gap-3" style={{ border: `1px solid ${C.border}` }}>
          <Activity size={15} style={{ color: C.accent }} />
          <span className="text-[13px] font-semibold" style={{ color: C.ink }}>Current weight</span>
          <div className="ml-auto flex items-center gap-1.5">
            <input type="number" inputMode="decimal" defaultValue={bodyWeight || ""} placeholder="—"
              onBlur={e => onUpdateBodyWeight?.(e.target.value ? Number(e.target.value) : null)}
              className="w-16 rounded-lg px-2.5 py-1.5 text-[14px] tabular-nums outline-none text-right" style={{ backgroundColor: C.surface, color: C.ink }} />
            <span className="text-[12px]" style={{ color: C.ink3 }}>lb</span>
          </div>
        </div>
        <div className="text-[11px] mt-2" style={{ color: C.ink4 }}>Used to show strength-to-weight ratio on each lift in Progress.</div>
      </div>

      {/* ── Volume benchmarks (MEV/MAV/MRV) ─────────────────────────── */}
      <div className="mt-4">
        <div className="text-[11px] font-bold uppercase tracking-[0.14em] mb-2" style={{ color: C.ink3 }}>Volume benchmarks</div>
        <div className="rounded-2xl overflow-hidden" style={{ border: `1px solid ${C.border}` }}>
          <button onClick={openLandmarkEditor} className="w-full p-3.5 flex items-center gap-2.5 text-[13px] font-semibold text-left" style={{ color: C.ink }}>
            <SlidersHorizontal size={15} style={{ color: C.accent }} /> Edit MEV / MAV / MRV
            <span className="ml-auto text-[11px]" style={{ color: C.ink4 }}>Per muscle group</span>
          </button>
        </div>
        <div className="text-[11px] mt-2" style={{ color: C.ink4 }}>Sets these Progress and Heatmap use to judge whether each muscle group's weekly volume is below MEV, in the MEV/MAV growth zone, or above MRV.</div>
      </div>

      {/* ── Export ───────────────────────────────────────────────────── */}
      <div className="mt-4">
        <div className="text-[11px] font-bold uppercase tracking-[0.14em] mb-2" style={{ color: C.ink3 }}>Export</div>
        <div className="rounded-2xl overflow-hidden" style={{ border: `1px solid ${C.border}` }}>
          <button onClick={() => exportToExcel(sessions, profileName).catch(() => alert("Export failed."))}
            className="w-full p-3.5 flex items-center gap-2.5 text-[13px] font-semibold text-left" style={{ color: C.ink }}>
            <Download size={15} style={{ color: C.good }} /> Export to Excel
            <span className="ml-auto text-[11px]" style={{ color: C.ink4 }}>Last 30 days · .xlsx</span>
          </button>
        </div>
        <div className="text-[11px] mt-2" style={{ color: C.ink4 }}>Includes session log, daily summary, and personal bests{user ? ". Data is synced to your account." : "."}</div>
      </div>

      {editingLandmarks && landmarkDraft && (
        <div className="fixed inset-0 z-50 flex items-end justify-center" style={{ backgroundColor: "rgba(0,0,0,0.4)" }} onClick={() => setEditingLandmarks(false)}>
          <div className="w-full max-w-md rounded-t-3xl p-5 pb-8 flex flex-col" style={{ backgroundColor: C.bg, maxHeight: "85vh" }} onClick={e => e.stopPropagation()}>
            <div className="w-10 h-1 rounded-full mx-auto mb-4 shrink-0" style={{ backgroundColor: C.border2 }} />
            <div className="flex items-center justify-between mb-1 shrink-0">
              <h3 className="text-[18px] font-bold tracking-tight" style={{ color: C.ink }}>Volume benchmarks</h3>
              <button onClick={() => setEditingLandmarks(false)} className="p-1" aria-label="Close"><X size={18} style={{ color: C.ink4 }} /></button>
            </div>
            <p className="text-[12.5px] mb-4 shrink-0" style={{ color: C.ink3 }}>Weekly hard sets per muscle group. MEV = minimum to grow, MAV = sweet spot, MRV = recovery ceiling.</p>
            <div className="overflow-y-auto flex-1 -mx-1 px-1">
              <div className="grid grid-cols-4 gap-2 mb-2 px-1 sticky top-0 z-10" style={{ backgroundColor: C.bg }}>
                <span className="text-[10px] font-bold uppercase tracking-wide" style={{ color: C.ink3 }}>Muscle</span>
                <span className="text-[10px] font-bold uppercase tracking-wide text-center" style={{ color: C.good }}>MEV</span>
                <span className="text-[10px] font-bold uppercase tracking-wide text-center" style={{ color: C.warn }}>MAV</span>
                <span className="text-[10px] font-bold uppercase tracking-wide text-center" style={{ color: C.bad }}>MRV</span>
              </div>
              <div className="flex flex-col gap-2">
                {MUSCLE_GROUPS.map((muscle) => (
                  <div key={muscle} className="grid grid-cols-4 gap-2 items-center px-1">
                    <span className="text-[13px] font-semibold truncate" style={{ color: C.ink }}>{muscle}</span>
                    {[0, 1, 2].map((idx) => (
                      <input key={idx} type="number" inputMode="numeric" min="0" value={landmarkDraft[muscle][idx]}
                        onChange={(e) => updateDraft(muscle, idx, e.target.value)}
                        className="w-full rounded-lg px-1.5 py-1.5 text-[13px] tabular-nums outline-none text-center"
                        style={{ backgroundColor: C.surface, color: C.ink }} />
                    ))}
                  </div>
                ))}
              </div>
            </div>
            <div className="flex gap-2 mt-4 pt-3 shrink-0" style={{ borderTop: `1px solid ${C.border}` }}>
              <button onClick={resetLandmarks} className="flex-1 rounded-xl py-2.5 text-[13px] font-semibold" style={{ backgroundColor: C.surface, color: C.ink2 }}>Reset to defaults</button>
              <button onClick={saveLandmarks} className="flex-1 rounded-xl py-2.5 text-[13px] font-semibold" style={{ backgroundColor: C.ink, color: "#fff" }}>Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ====================================================================== */
/* COACH                                                                  */
/* ====================================================================== */

