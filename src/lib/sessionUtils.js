import { ACCENT, C, RETENTION_DAYS } from "./constants";
import { makeId } from "./id";
import { normalizeLiftName } from "./muscleMapping";

// Collapses a legacy randomized-suffix day ID (e.g. "push-a-k2j9x1p") back to its
// canonical built-in form ("push-a"), left over from a since-fixed bug where the
// built-in PPL day IDs got a fresh random suffix on every plan (re)selection —
// fragmenting that day's history across a new ID each time. Leaves any ID that
// doesn't match one of the known built-in bases untouched (custom/other-template
// days are never renamed).
function normalizeBuiltInDayId(id, knownIds) {
  if (!id) return id;
  if (knownIds.includes(id)) return id;
  for (const k of knownIds) {
    if (id.startsWith(k + "-")) return k;
  }
  return id;
}

// One-time repair: relinks sessions/customDays/dayAdds still carrying a legacy
// randomized day ID back to the canonical built-in ID, so their history rejoins
// that day's Progress > Load/day line instead of staying split off on its own.
// Pure and idempotent — safe to run on every load; it's a no-op once IDs are clean.
export function repairLegacyDayIds(sessions, customDays, dayAdds, knownIds) {
  let changed = false;

  const newSessions = sessions.map((s) => {
    const nid = normalizeBuiltInDayId(s.dayId, knownIds);
    if (nid === s.dayId) return s;
    changed = true;
    return { ...s, dayId: nid, lastUpdatedAt: Date.now() };
  });

  const newCustomDays = customDays.map((d) => {
    const nid = normalizeBuiltInDayId(d.id, knownIds);
    if (nid === d.id) return d;
    changed = true;
    return { ...d, id: nid };
  });

  const newDayAdds = {};
  for (const [oldId, list] of Object.entries(dayAdds || {})) {
    const nid = normalizeBuiltInDayId(oldId, knownIds);
    if (nid !== oldId) changed = true;
    newDayAdds[nid] = [...(newDayAdds[nid] || []), ...(list || [])];
  }

  return { sessions: newSessions, customDays: newCustomDays, dayAdds: newDayAdds, changed };
}

export function isCardioExercise(ex) {
  if (!ex) return false;
  if (ex.kind === "cardio") return true;
  if (ex.kind === "lifting") return false;
  return ex.muscle === "Cardio" || ex.section === "Cardio" || ex.equipment === "Cardio";
}
// True when every exercise in a session is cardio


export function isCardioOnlySession(exercises) {
  if (!exercises || exercises.length === 0) return false;
  return exercises.every(e => isCardioExercise(e));
}
// Color for a session — cardio-only = red


export function sessionAccentColor(session) {
  if (isCardioOnlySession(session.exercises)) return C.cardio;
  return ACCENT[session.dayTag] || C.accent;
}
// Color for a program day — all-cardio days show red


export function dayAccentColor(day) {
  if (day && Array.isArray(day.exercises) && day.exercises.length > 0 && day.exercises.every(e => isCardioExercise(e))) return C.cardio;
  return ACCENT[day && day.tag] || C.accent;
}

/* ====================================================================== */
/* FIREBASE CONFIG — paste your project config from console.firebase.google.com
   Leave apiKey empty to run in local-only mode (no auth, no sync).       */
/* ====================================================================== */


export function fmtClock(totalSeconds) {
  const s = Math.max(0, Math.round(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
  return `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}


export function fmtShortDate(iso) {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}


export function relativeDays(iso) {
  const then = new Date(iso).setHours(0, 0, 0, 0);
  const now = new Date().setHours(0, 0, 0, 0);
  const diff = Math.round((now - then) / 86400000);
  if (diff === 0) return "Today";
  if (diff === 1) return "Yesterday";
  return `${diff}d ago`;
}


export function sameDay(a, b) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}


export function pruneSessions(sessions) {
  const cutoff = Date.now() - RETENTION_DAYS * 86400000;
  return sessions
    .filter((s) => new Date(s.date).getTime() >= cutoff)
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, 300);
}



export function toActiveExercise(e) {
  const cardio = e.kind === "cardio" || e.section === "Cardio" || e.muscle === "Cardio";
  return {
    exId: e.id,
    section: e.section,
    selectedLift: e.best,
    best: e.best,
    subs: e.subs,
    kind: e.kind || (cardio ? "cardio" : "lifting"),
    muscle: e.muscle || e.section,
    setsLabel: e.setsLabel,
    repsLabel: e.repsLabel,
    rest: e.rest,
    sets: cardio ? [] : Array.from({ length: e.prefill }, () => ({ weight: "", reps: "", done: false })),
  };
}


export function buildActiveSession(day) {
  return {
    id: makeId(),
    dayId: day.id,
    dayTitle: day.title,
    dayTag: day.tag,
    date: new Date().toISOString(),
    startTime: Date.now(),
    phase: "working",        // working | resting | paused
    phaseStartedAt: Date.now(),
    workAccumSeconds: 0,
    restAccumSeconds: 0,
    restTarget: 0,
    exercises: day.exercises.map(toActiveExercise),
  };
}


export function liveTimes(a, now) {
  let work = a.workAccumSeconds || 0;
  let rest = a.restAccumSeconds || 0;
  if (a.phase === "working") work += (now - a.phaseStartedAt) / 1000;
  else if (a.phase === "resting") rest += (now - a.phaseStartedAt) / 1000;
  return { work, rest, total: work + rest };
}


export function committedAccum(a, now) {
  let work = a.workAccumSeconds || 0;
  let rest = a.restAccumSeconds || 0;
  if (a.phase === "working") work += (now - a.phaseStartedAt) / 1000;
  else if (a.phase === "resting") rest += (now - a.phaseStartedAt) / 1000;
  return { workAccumSeconds: work, restAccumSeconds: rest };
}


export function lastPerformanceFor(sessions, liftName) {
  // Scope previous performance to this exercise across ALL days/workouts — the same
  // movement performed on a different day still counts as "last time you did this",
  // since the exercise itself (not the day it happened to fall on) is what matters
  // for progressive overload.
  const target = liftName ? normalizeLiftName(liftName) : null;
  if (!target) return null;
  let best = null; // most recent match by date — never rely on array ordering
  for (const s of sessions) {
    for (const e of (s.exercises || [])) {
      if (!Array.isArray(e.sets) || e.sets.length === 0) continue;
      const exLift = normalizeLiftName(e.selectedLift || "");
      if (exLift !== target) continue;
      const sets = e.sets.filter((st) => !st.lift || normalizeLiftName(st.lift) === target);
      if (!sets.length) continue;
      const t = new Date(s.date).getTime();
      if (!best || t > best.t) best = { t, date: s.date, sets, lift: e.selectedLift };
    }
  }
  return best ? { date: best.date, sets: best.sets, lift: best.lift } : null;
}


export function sessionVolume(session) {
  let v = 0;
  for (const e of (session.exercises || [])) {
    for (const st of (e.sets || [])) v += (Number(st.weight) || 0) * (Number(st.reps) || 0);
  }
  return v;
}


export function formatSetGroups(sets) {
  const groups = [];
  for (const s of sets) {
    const lift = s.lift || "";
    const part = `${s.weight || 0}×${s.reps}`;
    const last = groups[groups.length - 1];
    if (last && last.lift === lift) last.parts.push(part);
    else groups.push({ lift, parts: [part] });
  }
  return groups;
}


export function migrateSession(s) {
  const exercises = Array.isArray(s.exercises) ? s.exercises.map((e) => ({
    exId: e.exId || `mig-${Math.random().toString(36).slice(2, 9)}`,
    selectedLift: e.selectedLift || e.best || "Exercise",
    notes: e.notes || "",
    cardio: !!e.cardio,
    muscle: e.muscle || e.section || "",
    ...e,
    sets: Array.isArray(e.sets) ? e.sets : [],
  })) : [];
  return {
    status: "completed",
    completedAt: s.completedAt || s.date,
    resumedAt: s.resumedAt || null,
    archivedAt: s.archivedAt || null,
    versionNumber: s.versionNumber || 1,
    parentWorkoutId: s.parentWorkoutId || null,
    volume: typeof s.volume === "number" ? s.volume : 0,
    totalElapsedSeconds: s.totalElapsedSeconds || 0,
    ...s,
    exercises,
  };
}

