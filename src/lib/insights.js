import { Activity, ArrowLeftRight, CalendarClock, Flame, Footprints, Heart, Repeat, Snowflake, Sparkles, Target, TrendingDown, TrendingUp, Trophy, Zap } from "lucide-react";
import { muscleForLift, normalizeLiftName } from "./muscleMapping";
import { fmtShortDate, lastPerformanceFor } from "./sessionUtils";

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


/* ====================================================================== */
/* DERIVED STATISTICS                                                     */
/* Every coach tip below is written off one of these. They only ever       */
/* summarise rows that exist in the log — none of them fill a gap with an  */
/* assumption, an average, or a "typical" starting number. If the data     */
/* isn't there, the helper returns nothing and the tip is not emitted.     */
/* ====================================================================== */

// The library's own categories (MUSCLE_ORDER), minus Cardio and Other — so a tip never
// names a muscle group the user cannot see anywhere else in the app.
const MAJOR_MUSCLES = ["Chest", "Back", "Shoulders", "Biceps", "Triceps", "Legs", "Core"];
const PUSH_MUSCLES = ["Chest", "Shoulders", "Triceps"];
const PULL_MUSCLES = ["Back", "Biceps"];

const fmtNum = (n) => Math.round(n).toLocaleString("en-US");
const daysBetween = (a, b) => Math.floor((a - b) / 86400000);
// Saved records carry an explicit `cardio` flag; older ones only carry the muscle.
const isCardioRecord = (e) => !!e.cardio || e.muscle === "Cardio" || e.kind === "cardio";

// One entry per (lift, session), oldest first, each holding that session's top-weight
// set. Grouped by NORMALIZED name so "Barbell Bench Press" and "Bench Press" share a
// line while Cable Fly and Cable Crossover stay apart.
export function liftTimeline(sessions) {
  const byLift = new Map();
  for (const s of sessions || []) {
    const t = new Date(s.date).getTime();
    if (isNaN(t)) continue;
    for (const e of (s.exercises || [])) {
      if (!e.selectedLift) continue;
      const sets = (e.sets || []).filter((st) => (Number(st.weight) || 0) > 0 && (Number(st.reps) || 0) > 0);
      if (!sets.length) continue;
      const key = normalizeLiftName(e.selectedLift);
      const top = Math.max(...sets.map((st) => Number(st.weight) || 0));
      const topReps = Math.max(...sets.filter((st) => (Number(st.weight) || 0) === top).map((st) => Number(st.reps) || 0));
      const list = byLift.get(key) || [];
      // The same lift can appear twice in one workout (e.g. re-added after a superset).
      // Collapse those into the session's single heaviest showing rather than letting one
      // workout look like two sessions of progress.
      const same = list.find((x) => x.date === s.date);
      if (same) { if (top > same.top) { same.top = top; same.topReps = topReps; } }
      else list.push({ t, date: s.date, lift: e.selectedLift, top, topReps, setCount: sets.length });
      byLift.set(key, list);
    }
  }
  for (const list of byLift.values()) list.sort((a, b) => a.t - b.t);
  return byLift;
}

// Working sets per muscle over a window, plus when each muscle was last touched.
export function muscleStats(sessions, days) {
  const sets = {}, lastHit = {};
  for (const s of sessions || []) {
    const t = new Date(s.date).getTime();
    if (isNaN(t)) continue;
    const inWindow = days == null || Date.now() - t <= days * 86400000;
    for (const e of (s.exercises || [])) {
      const n = (e.sets || []).length;
      if (!n || isCardioRecord(e)) continue;
      const mus = muscleForLift(e.selectedLift);
      if (inWindow) sets[mus] = (sets[mus] || 0) + n;
      if (!lastHit[mus] || t > lastHit[mus]) lastHit[mus] = t;
    }
  }
  return { sets, lastHit };
}

// Total weight moved inside a half-open window, measured in whole 7-day blocks back
// from now so every block being compared is the same length. Comparing a part-finished
// calendar week against finished ones would report a crash in volume every Monday.
function volumeInBlock(sessions, blocksAgo) {
  const end = Date.now() - blocksAgo * 7 * 86400000;
  const start = end - 7 * 86400000;
  let v = 0, count = 0;
  for (const s of sessions || []) {
    const t = new Date(s.date).getTime();
    if (isNaN(t) || t < start || t >= end) continue;
    v += s.volume || 0;
    count++;
  }
  return { volume: v, count };
}


/* ====================================================================== */
/* TIP GENERATORS — one concern each, each returns a tip or null          */
/* ====================================================================== */

// Days since the last session, when that gap is long enough to be worth naming.
function layoffTip(sessions) {
  const last = sessions[0];
  if (!last) return null;
  const days = daysBetween(Date.now(), new Date(last.date).getTime());
  if (days < 5 || days > 60) return null;
  return {
    id: "layoff", icon: CalendarClock, tone: "warn",
    title: `${days} days since your last session`,
    body: `Your last workout was ${last.dayTitle || "a session"} on ${fmtShortDate(last.date)}. Strength holds for a couple of weeks — come back at the same weights rather than restarting lower.`,
  };
}

// A heavier top set than this lift has ever shown, or the same weight for more reps.
// Needs prior history for the lift: a first-ever log is a starting point, not a record.
function recordTip(timeline) {
  let best = null;
  for (const entries of timeline.values()) {
    if (entries.length < 2) continue;
    const latest = entries[entries.length - 1];
    if (daysBetween(Date.now(), latest.t) > 14) continue;
    const prior = entries.slice(0, -1);
    const priorBest = Math.max(...prior.map((e) => e.top));
    if (latest.top > priorBest) {
      const gain = latest.top - priorBest;
      if (!best || gain > best.gain) {
        best = {
          gain, t: latest.t,
          tip: {
            id: "pr", icon: Trophy, tone: "good",
            title: `New best: ${latest.lift} ${fmtNum(latest.top)} lb`,
            body: `${fmtNum(latest.top)} lb × ${latest.topReps} on ${fmtShortDate(latest.date)}, past your previous best of ${fmtNum(priorBest)} lb. Hold this weight until all your sets are clean, then add 5.`,
          },
        };
      }
      continue;
    }
    // No new weight — but more reps at the same top weight is still a record, and it's
    // the progression that earns the next jump.
    const atSame = prior.filter((e) => e.top === latest.top);
    if (atSame.length && latest.topReps > Math.max(...atSame.map((e) => e.topReps)) && !best) {
      best = {
        gain: 0, t: latest.t,
        tip: {
          id: "pr", icon: Trophy, tone: "good",
          title: `${latest.lift}: new rep best at ${fmtNum(latest.top)} lb`,
          body: `${latest.topReps} reps on ${fmtShortDate(latest.date)}, up from ${Math.max(...atSame.map((e) => e.topReps))}. Reps first, then weight — that's the jump earned.`,
        },
      };
    }
  }
  return best ? best.tip : null;
}

// Three logged sessions of a lift with no new top weight across them. Returns the tip
// plus the normalized lift name, so the "add 5 lb" tip for the same lift can stand down.
function stallTip(timeline) {
  let worst = null;
  for (const [key, entries] of timeline) {
    if (entries.length < 3) continue;
    const last3 = entries.slice(-3);
    if (daysBetween(Date.now(), last3[2].t) > 21) continue;
    if (Math.max(last3[1].top, last3[2].top) > last3[0].top) continue;
    const span = daysBetween(last3[2].t, last3[0].t);
    if (span < 7) continue; // three sessions inside a week is a cluster, not a plateau
    if (!worst || last3[2].t > worst.t) {
      const cur = last3[2];
      const deload = Math.max(5, Math.round((cur.top * 0.9) / 5) * 5);
      worst = {
        t: cur.t, key,
        tip: {
          id: "stall", icon: Repeat, tone: "warn",
          title: `${cur.lift} hasn't moved in 3 sessions`,
          body: `Top sets went ${fmtNum(last3[0].top)} → ${fmtNum(last3[1].top)} → ${fmtNum(cur.top)} lb over ${span} days. Chase one extra rep at ${fmtNum(cur.top)} lb before adding weight, or drop to ${fmtNum(deload)} lb for a week and build back through it.`,
        },
      };
    }
  }
  return worst;
}

// A muscle the user does train, that hasn't been touched in a fortnight.
function coldMuscleTip(sessions) {
  const last = sessions[0];
  if (!last || daysBetween(Date.now(), new Date(last.date).getTime()) > 10) return null;
  const { lastHit } = muscleStats(sessions, null);
  const history = muscleStats(sessions, 120).sets;
  let pick = null;
  for (const m of MAJOR_MUSCLES) {
    if (!lastHit[m] || (history[m] || 0) < 4) continue;
    const days = daysBetween(Date.now(), lastHit[m]);
    if (days < 14 || days > 120) continue;
    if (!pick || days > pick.days) pick = { muscle: m, days, at: lastHit[m] };
  }
  if (!pick) return null;
  const since = sessions.filter((s) => new Date(s.date).getTime() > pick.at).length;
  return {
    id: "cold", icon: Snowflake, tone: "warn",
    title: `${pick.muscle} hasn't been trained in ${pick.days} days`,
    body: `Your last ${pick.muscle.toLowerCase()} sets were ${fmtShortDate(new Date(pick.at).toISOString())}, and you've logged ${since} session${since === 1 ? "" : "s"} since without it.`,
  };
}

// Push volume against pull volume over the last month.
function balanceTip(sessions) {
  const recent = sessions.filter((s) => withinDays(s.date, 30));
  if (recent.length < 4) return null;
  const { sets } = muscleStats(recent, 30);
  const push = PUSH_MUSCLES.reduce((a, m) => a + (sets[m] || 0), 0);
  const pull = PULL_MUSCLES.reduce((a, m) => a + (sets[m] || 0), 0);
  if (!push || !pull || push + pull < 20) return null;
  const ratio = push / pull;
  if (ratio >= 1.6) {
    return {
      id: "balance", icon: ArrowLeftRight, tone: "warn",
      title: `You're pushing ${ratio.toFixed(1)}× more than you pull`,
      body: `Last 30 days: ${fmtNum(push)} push sets vs ${fmtNum(pull)} pull sets. Rows and pulldowns are what keep the shoulders behind all that pressing healthy — an extra pull set or two evens it out.`,
    };
  }
  if (ratio <= 0.625) {
    return {
      id: "balance", icon: ArrowLeftRight, tone: "warn",
      title: `You're pulling ${(1 / ratio).toFixed(1)}× more than you push`,
      body: `Last 30 days: ${fmtNum(pull)} pull sets vs ${fmtNum(push)} push sets. Pressing volume has fallen behind — worth a set back on chest or shoulders.`,
    };
  }
  return null;
}

// Last 7 days of tonnage against the 3 equal-length blocks before it.
function volumeTip(sessions) {
  const cur = volumeInBlock(sessions, 0);
  if (!cur.count) return null;
  const prior = [1, 2, 3].map((b) => volumeInBlock(sessions, b));
  if (prior.filter((p) => p.count > 0).length < 2) return null;
  const avg = prior.reduce((a, p) => a + p.volume, 0) / prior.length;
  if (!(avg > 0) || !(cur.volume > 0)) return null;
  const pct = ((cur.volume - avg) / avg) * 100;
  if (Math.abs(pct) < 20) return null;
  if (pct > 0) {
    return {
      id: "volume", icon: TrendingUp, tone: "good",
      title: `Volume is up ${Math.round(pct)}% over the last 7 days`,
      body: `${fmtNum(cur.volume)} lb moved across ${cur.count} session${cur.count === 1 ? "" : "s"}, against a ${fmtNum(avg)} lb average over the 3 weeks before. Big jumps are where niggles start — hold here for a week before climbing again.`,
    };
  }
  return {
    id: "volume", icon: TrendingDown, tone: "warn",
    title: `Volume is down ${Math.round(Math.abs(pct))}% over the last 7 days`,
    body: `${fmtNum(cur.volume)} lb moved across ${cur.count} session${cur.count === 1 ? "" : "s"}, against a ${fmtNum(avg)} lb average over the 3 weeks before. Fine if it's a deload — otherwise one more working set per exercise closes the gap.`,
  };
}

// Only speaks to someone who already does cardio.
function cardioTip(sessions) {
  let lastCardio = null, name = "", cardioSessions = 0;
  for (const s of sessions || []) {
    const t = new Date(s.date).getTime();
    if (isNaN(t)) continue;
    const c = (s.exercises || []).find(isCardioRecord);
    if (!c) continue;
    cardioSessions++;
    if (!lastCardio || t > lastCardio) { lastCardio = t; name = c.selectedLift || "cardio"; }
  }
  if (cardioSessions < 2 || !lastCardio) return null;
  const days = daysBetween(Date.now(), lastCardio);
  if (days < 14 || days > 120) return null;
  const since = sessions.filter((s) => new Date(s.date).getTime() > lastCardio).length;
  return {
    id: "cardio", icon: Footprints, tone: "warn",
    title: `No cardio logged in ${days} days`,
    body: `Your last was ${name} on ${fmtShortDate(new Date(lastCardio).toISOString())}, with ${since} session${since === 1 ? "" : "s"} since. You've built the habit before — one easy session keeps the conditioning you already paid for.`,
  };
}


export function generateInsights(sessions, allDaysById, nextDay) {
  if (!sessions.length) {
    return [{ id: "welcome", icon: Sparkles, tone: "accent", title: "Log your first session", body: "Once you train a few times, your coach starts spotting trends, weak points, and progressive-overload targets here." }];
  }

  const out = [];
  const timeline = liftTimeline(sessions);
  const stall = stallTip(timeline);

  // 1 — returning after a gap. Leads, because nothing else matters until there's a
  // session on the board again.
  const layoff = layoffTip(sessions);
  if (layoff) out.push(layoff);

  // 2 — progressive overload on the next workout's primary lift. Advise on the lift
  // actually performed in that slot (the user may always swap in a substitute), and
  // label it with the name attached to the very record the number came from. If there
  // is no logged history for it, say nothing rather than invent a starting point.
  // Suppressed when that same lift has stalled — "add 5 lb" directly contradicts the
  // plateau advice below, and the plateau is the more specific read.
  if (nextDay && nextDay.exercises[0]) {
    const main = nextDay.exercises[0];
    const liftName = lastLiftForSlot(sessions, main.id) || main.best;
    const last = topSetForLift(sessions, liftName);
    const stalledHere = stall && liftName && stall.key === normalizeLiftName(liftName);
    if (last && !stalledHere) {
      out.push({
        id: "overload", icon: Target, tone: "accent",
        title: `${last.lift}: aim for ${last.top + 5} lb`,
        body: `Last time you hit ${last.top} lb × ${last.reps}. If ${last.reps} felt solid, add 5 lb today — otherwise match the weight and chase one more rep first.`,
      });
    }
  }

  // 3 — a record set in the last fortnight.
  const pr = recordTip(timeline);
  if (pr) out.push(pr);

  // 4 — a lift that has stopped moving.
  if (stall) out.push(stall.tip);

  // 5 — a muscle that has gone cold. Takes precedence over the relative "lagging"
  // reading below for the same muscle: a date is more actionable than a ratio.
  const cold = coldMuscleTip(sessions);
  if (cold) out.push(cold);

  // 6 — weak point: least-trained muscle in the last 30 days, relative to the most.
  const recent = sessions.filter((s) => withinDays(s.date, 30));
  if (recent.length >= 2) {
    const setsByMuscle = muscleStats(recent, 30).sets;
    const major = ["Chest", "Back", "Shoulders", "Legs"].map((m) => [m, setsByMuscle[m] || 0]);
    major.sort((a, b) => a[1] - b[1]);
    const trained = major.filter((x) => x[1] > 0);
    const alreadyNamed = cold && cold.title.startsWith(major[0][0]);
    if (trained.length && !alreadyNamed && major[0][1] < (major[major.length - 1][1] || 1) * 0.55) {
      out.push({
        id: "weak", icon: Zap, tone: "warn",
        title: `${major[0][0]} is lagging`,
        body: `Over the last 30 days ${major[0][0].toLowerCase()} got the fewest working sets (${major[0][1]}). Consider adding a set or an extra ${major[0][0].toLowerCase()} movement.`,
      });
    }
  }

  // 7 — push/pull split.
  const balance = balanceTip(sessions);
  if (balance) out.push(balance);

  // 8 — tonnage trend.
  const volume = volumeTip(sessions);
  if (volume) out.push(volume);

  // 9 — conditioning, for people who already log it.
  const cardio = cardioTip(sessions);
  if (cardio) out.push(cardio);

  // 10 — consistency this week vs last
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

  // 11 — recovery / density
  const last3 = sessions.filter((s) => withinDays(s.date, 3)).length;
  if (last3 >= 3) out.push({ id: "recovery", icon: Heart, tone: "warn", title: "Training density is high", body: `${last3} sessions in 3 days. Make sure sleep and protein are dialed in — recovery is where the growth happens.` });
  else if (recent.length >= 3) out.push({ id: "recovery", icon: Heart, tone: "good", title: "Recovery looks balanced", body: "Your session spacing over the last month gives muscles time to adapt. Good rhythm." });

  // Ordered most-actionable first, so the two the home screen shows are the two worth
  // acting on. Everything true is returned; how much of it surfaces today is
  // visibleInsights' job below.
  return out;
}


/* ====================================================================== */
/* WHAT SURFACES TODAY                                                    */
/* ====================================================================== */

export const TIPS_PER_DAY = 5;

// Local calendar date. Not toISOString().slice(0,10) — that is UTC, so for anyone west
// of Greenwich the coach's "day" would roll over in the early evening.
export function localDayKey(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

// Five at a time, and dismissing one does NOT pull the next one up behind it. The queue
// advances once a day, so clearing the board is a decision that holds until tomorrow
// rather than an endless scroll of advice — and what is left has a chance to be acted on
// before more arrives. `queued` is how many true observations are waiting their turn.
export function visibleInsights(allTips, dismissed, budget, today = localDayKey()) {
  const gone = new Set(dismissed || []);
  // Keyed on id AND headline: several ids ("consist", "recovery", "volume") are reused for
  // opposite messages, so clearing "This week is behind your pace" must not also bury next
  // week's good news.
  const live = (allTips || []).filter((t) => !gone.has(`${t.id}::${t.title}`));
  const spent = budget && budget.day === today ? Math.max(0, Number(budget.count) || 0) : 0;
  const visible = live.slice(0, Math.max(0, TIPS_PER_DAY - spent));
  return { visible, queued: live.length - visible.length };
}

// One dismissal spends one of today's slots. A budget left over from a previous day is
// stale, so it starts the count again rather than carrying forward.
export function spendInsightBudget(budget, today = localDayKey()) {
  const count = (budget && budget.day === today ? Number(budget.count) || 0 : 0) + 1;
  return { day: today, count };
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
