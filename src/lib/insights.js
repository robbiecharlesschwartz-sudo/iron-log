import { Activity, Flame, Heart, Sparkles, Target, Zap } from "lucide-react";
import { muscleForLift } from "./muscleMapping";
import { lastPerformanceFor } from "./sessionUtils";

export function withinDays(iso, days) {
  return Date.now() - new Date(iso).getTime() <= days * 86400000;
}


export function startOfWeek(d) {
  const x = new Date(d); x.setHours(0, 0, 0, 0);
  const day = (x.getDay() + 6) % 7; // Mon=0
  x.setDate(x.getDate() - day);
  return x;
}


export function weekStats(sessions) {
  const ws = startOfWeek(new Date()).getTime();
  const wk = sessions.filter((s) => new Date(s.date).getTime() >= ws);
  return {
    count: wk.length,
    volume: wk.reduce((a, s) => a + (s.volume || 0), 0),
    sets: wk.reduce((a, s) => a + s.exercises.reduce((b, e) => b + e.sets.length, 0), 0),
  };
}


export function estDurationMin(day) {
  const secs = day.exercises.reduce((a, e) => a + (e.prefill || 3) * ((e.rest || 75) + 45), 0);
  return Math.max(15, Math.round(secs / 60 / 5) * 5);
}


export const ROTATION = ["push-a", "pull-a", "legs-a", "push-b", "pull-b", "legs-b"];


export function recommendNextDay(sessions, allDaysById) {
  const lastBuilt = sessions.find((s) => ROTATION.includes(s.dayId));
  if (!lastBuilt) return allDaysById[ROTATION[0]];
  const idx = ROTATION.indexOf(lastBuilt.dayId);
  return allDaysById[ROTATION[(idx + 1) % ROTATION.length]] || allDaysById[ROTATION[0]];
}


export function lastSessionForDay(sessions, dayId) {
  return sessions.find((s) => s.dayId === dayId) || null;
}


// Which lift the user actually performed in a given day-template slot, most recently.
// Every template slot has substitutes ("Back Squat" offers Leg Press / Hack Squat), so
// the slot's headline lift is frequently NOT the one that got logged.
export function lastLiftForSlot(sessions, exId) {
  let best = null;
  for (const s of sessions) {
    for (const e of (s.exercises || [])) {
      if (e.exId !== exId || !(e.sets || []).length || !e.selectedLift) continue;
      const t = new Date(s.date).getTime();
      if (!best || t > best.t) best = { t, lift: e.selectedLift };
    }
  }
  return best ? best.lift : null;
}

// Heaviest set the user has actually logged FOR THIS LIFT, by name.
//
// This used to look the exercise up by day-template slot id, which meant the weight
// came from whatever was logged in that slot while the label came from the slot's
// headline lift — so logging Leg Press at 360 in the "Back Squat" slot produced
// "Back Squat: aim for 365 lb. Last time you hit 360" for someone who has never
// squatted. Going through lastPerformanceFor ties the number to the lift's own name.
//
// Reps are taken from the top-weight set specifically. Taking max weight and max reps
// independently invents a set that never happened: 315x3 and 225x12 in the same
// exercise would report "315 lb x 12".
export function topSetForLift(sessions, liftName) {
  const perf = lastPerformanceFor(sessions, liftName);
  if (!perf || !perf.sets.length) return null;
  const top = Math.max(...perf.sets.map((st) => Number(st.weight) || 0));
  if (!(top > 0)) return null;
  const reps = Math.max(...perf.sets.filter((st) => (Number(st.weight) || 0) === top).map((st) => Number(st.reps) || 0));
  if (!(reps > 0)) return null;
  return { date: perf.date, top, reps, lift: perf.lift };
}


export function generateInsights(sessions, allDaysById, nextDay) {
  const out = [];
  if (!sessions.length) {
    out.push({ id: "welcome", icon: Sparkles, tone: "accent", title: "Log your first session", body: "Once you train a few times, your coach starts spotting trends, weak points, and progressive-overload targets here." });
    return out;
  }

  // 1 — progressive overload on the next workout's primary lift. Advise on the lift
  // actually performed in that slot (the user may always swap in a substitute), and
  // label it with the name attached to the very record the number came from. If there
  // is no logged history for it, say nothing rather than invent a starting point.
  if (nextDay && nextDay.exercises[0]) {
    const main = nextDay.exercises[0];
    const last = topSetForLift(sessions, lastLiftForSlot(sessions, main.id) || main.best);
    if (last) {
      out.push({
        id: "overload", icon: Target, tone: "accent",
        title: `${last.lift}: aim for ${last.top + 5} lb`,
        body: `Last time you hit ${last.top} lb × ${last.reps}. If ${last.reps} felt solid, add 5 lb today — otherwise match the weight and chase one more rep first.`,
      });
    }
  }

  // 2 — weak point: least-trained muscle in last 30 days
  const recent = sessions.filter((s) => withinDays(s.date, 30));
  if (recent.length >= 2) {
    const setsByMuscle = {};
    for (const s of recent) for (const e of s.exercises) {
      const mus = muscleForLift(e.selectedLift);
      setsByMuscle[mus] = (setsByMuscle[mus] || 0) + e.sets.length;
    }
    const major = ["Chest", "Back", "Shoulders", "Quads", "Hamstrings"].map((m) => [m, setsByMuscle[m] || 0]);
    major.sort((a, b) => a[1] - b[1]);
    const trained = major.filter((x) => x[1] > 0);
    if (trained.length && major[0][1] < (major[major.length - 1][1] || 1) * 0.55) {
      out.push({
        id: "weak", icon: Zap, tone: "warn",
        title: `${major[0][0]} is lagging`,
        body: `Over the last 30 days ${major[0][0].toLowerCase()} got the fewest working sets (${major[0][1]}). Consider adding a set or an extra ${major[0][0].toLowerCase()} movement.`,
      });
    }
  }

  // 3 — consistency this week vs last
  const nowW = startOfWeek(new Date()).getTime();
  const lastW = nowW - 7 * 86400000;
  const thisWk = sessions.filter((s) => new Date(s.date).getTime() >= nowW).length;
  const prevWk = sessions.filter((s) => { const t = new Date(s.date).getTime(); return t >= lastW && t < nowW; }).length;
  if (thisWk || prevWk) {
    if (thisWk >= prevWk && prevWk > 0) {
      out.push({ id: "consist", icon: Flame, tone: "good", title: `${thisWk} sessions logged this week`, body: `You're matching or beating last week (${prevWk}). Consistency is the lever — keep the streak alive.` });
    } else if (prevWk - thisWk >= 2) {
      out.push({ id: "consist", icon: Activity, tone: "warn", title: "This week is behind your pace", body: `You've logged ${thisWk} so far vs ${prevWk} last week. One short session keeps the momentum.` });
    }
  }

  // 4 — recovery / density
  const last3 = sessions.filter((s) => withinDays(s.date, 3)).length;
  if (last3 >= 3) out.push({ id: "recovery", icon: Heart, tone: "warn", title: "Training density is high", body: `${last3} sessions in 3 days. Make sure sleep and protein are dialed in — recovery is where the growth happens.` });
  else if (recent.length >= 3) out.push({ id: "recovery", icon: Heart, tone: "good", title: "Recovery looks balanced", body: "Your session spacing over the last month gives muscles time to adapt. Good rhythm." });

  return out;
}


export function computeStreak(sessions) {
  if (!sessions.length) return 0;
  const dayKeys = new Set(sessions.map((s) => { const d = new Date(s.date); d.setHours(0, 0, 0, 0); return d.getTime(); }));
  let streak = 0;
  const cur = new Date(); cur.setHours(0, 0, 0, 0);
  // allow today or yesterday to seed the streak
  if (!dayKeys.has(cur.getTime())) cur.setDate(cur.getDate() - 1);
  while (dayKeys.has(cur.getTime())) { streak++; cur.setDate(cur.getDate() - 1); }
  return streak;
}

