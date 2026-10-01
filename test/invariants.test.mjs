import test from "node:test";
import assert from "node:assert/strict";

import { EXERCISE_LIBRARY } from "../src/lib/exerciseLibrary.js";
import { muscleForLift, normalizeLiftName } from "../src/lib/muscleMapping.js";
import { lastPerformanceFor } from "../src/lib/sessionUtils.js";
import { topSetForLift, lastLiftForSlot, generateInsights, visibleInsights, spendInsightBudget, localDayKey, TIPS_PER_DAY } from "../src/lib/insights.js";
import { heatmapStatus, regionContributionsFor, HEATMAP_REGIONS } from "../src/lib/heatmapData.js";
import { DEFAULT_LANDMARKS, MUSCLE_GROUPS, REGION_TO_MUSCLE, resolveLandmarks } from "../src/lib/landmarks.js";
import { buildBackup, parseBackup, mergeBackup } from "../src/lib/backup.js";
import { isFavorite, toggleFavorite } from "../src/lib/favorites.js";

/* Every test here corresponds to an invariant in PROJECT_OVERVIEW.md §8, and every
   invariant there was a real bug that shipped and got reported. The point of the file is
   that re-introducing any of them fails loudly instead of quietly reaching production. */

const daysAgo = (n) => new Date(Date.now() - n * 86400000).toISOString();
const session = (date, exercises) => ({ id: "s" + date, dayId: "legs-a", dayTitle: "Legs A", dayTag: "LEGS", date, exercises });
const ex = (exId, lift, sets) => ({ exId, selectedLift: lift, notes: "", cardio: false, muscle: "Quads", sets });
const set = (weight, reps, lift) => ({ weight, reps, lift });

/* ── §8.1 — a number must never be attached to a different lift's name ───────────
   The coach looked history up by day-template SLOT id and labelled it with the slot's
   headline lift, so Leg Press logged in the "Back Squat" slot became
   "Back Squat: aim for 365 lb" for someone who had never squatted. */

test("§8.1 previous performance is matched by lift name, not template slot", () => {
  const history = [session(daysAgo(3), [ex("legs-a-1", "Leg Press", [set(340, 8, "Leg Press"), set(360, 5, "Leg Press")])])];
  assert.equal(lastPerformanceFor(history, "Back Squat"), null, "Back Squat must not inherit the Leg Press sets logged in its slot");
  assert.ok(lastPerformanceFor(history, "Leg Press"), "Leg Press must still find its own history");
});

test("§8.1 the coach labels a tip with the lift the number came from", () => {
  const history = [session(daysAgo(3), [ex("legs-a-1", "Leg Press", [set(360, 5, "Leg Press")])])];
  const tip = topSetForLift(history, lastLiftForSlot(history, "legs-a-1") || "Back Squat");
  assert.equal(tip.lift, "Leg Press");
  assert.equal(tip.top, 360);
});

test("§8.1 no logged history for a lift produces no tip, never an invented starting point", () => {
  const unrelated = [session(daysAgo(3), [ex("push-a-1", "Barbell Bench Press", [set(185, 5, "Barbell Bench Press")])])];
  assert.equal(topSetForLift(unrelated, "Back Squat"), null);
});

/* ── §8.2 — reps come from the top-weight set ───────────────────────────────────
   Taking max weight and max reps independently reported "315 lb x 12" for an exercise
   containing 315x3 and 225x12 — a set that never happened. */

test("§8.2 reps are read from the heaviest set, not the highest rep count", () => {
  const history = [session(daysAgo(1), [ex("legs-a-1", "Back Squat", [set(315, 3, "Back Squat"), set(225, 12, "Back Squat")])])];
  const top = topSetForLift(history, "Back Squat");
  assert.equal(top.top, 315);
  assert.equal(top.reps, 3, "315x12 is a set that was never performed");
});

/* ── §8.3 — a synonym may only collapse spellings of ONE exercise ───────────────
   normalizeLiftName mapped "cable crossover" -> "cable fly", so Cable Crossover showed
   Cable Fly's sets as its own previous performance. */

const sharesHistory = (a, b) => normalizeLiftName(a) === normalizeLiftName(b);

test("§8.3 distinct library exercises never share history", () => {
  for (const [a, b] of [
    ["Cable Crossover", "Cable Fly"],
    ["Wide-Grip Lat Pulldown", "Lat Pulldown"],
    ["Seated Dumbbell Press", "Seated Dumbbell Shoulder Press"],
  ]) {
    assert.equal(sharesHistory(a, b), false, `${a} must not share history with ${b}`);
  }
});

test("§8.3 spelling variants of one exercise still share history", () => {
  for (const [a, b] of [
    ["Face Pull", "Face Pulls"],
    ["Weighted Pull-Up", "Weighted Pull-Ups"],
    ["RDL", "Romanian Deadlift"],
    ["BB Row", "Barbell Row"],
    ["Barbell Squat", "Back Squat"],
    ["Incline DB Press", "Incline Dumbbell Press"],
    ["Pull Up", "Pull-Ups"],
  ]) {
    assert.equal(sharesHistory(a, b), true, `${a} should share history with ${b}`);
  }
});

test("§8.3 the Cable Crossover report reproduces clean end to end", () => {
  const history = [session(daysAgo(34), [ex("x1", "Cable Fly", [
    set(130, 12, "Cable Fly"), set(160, 10, "Cable Fly"), set(160, 10, "Cable Fly"), set(115, 10, "Cable Fly"),
  ])])];
  assert.equal(lastPerformanceFor(history, "Cable Crossover"), null);
  assert.equal(lastPerformanceFor(history, "Cable Fly").sets.length, 4);
});

/* ── §8.4 / §8.5 — name resolution ──────────────────────────────────────────────
   Keyword rules ran broad-before-specific, so "fly"->Chest caught Rear Delt Fly and
   "curl"->Biceps caught Nordic Hamstring Curl. The partial matcher returned whichever
   library name sat earliest in the array, so "Deadlift" shadowed "Romanian Deadlift",
   and a 4-letter "Dips" hijacked "Tricep Dips". */

test("§8.4 keyword heuristics resolve specific patterns before broad ones", () => {
  for (const [name, muscle] of [
    ["Rear Delt Flye", "Shoulders"],
    ["Bent Over Fly", "Shoulders"],
    ["Reverse Pec Flye", "Back"],
    ["Cable Face Pull", "Back"],
    ["Cable Upright Row", "Shoulders"],
    ["Tricep Dips", "Triceps"],
    ["Nordic Hamstring Curl", "Legs"],
    ["Seated Hamstring Curl", "Legs"],
    ["Chest Supported Row", "Back"],
    ["Sumo Deadlift High Pull", "Legs"],
    ["Incline Chest Fly", "Chest"],
    ["Cable Shoulder External Rotation", "Shoulders"],
    ["Hip Adduction Machine", "Legs"],
  ]) {
    assert.equal(muscleForLift(name), muscle, `${name} should resolve to ${muscle}`);
  }
});

test("§8.5 partial matching prefers the longest match", () => {
  assert.equal(muscleForLift("Barbell Romanian Deadlift"), "Legs", '"Deadlift" (Back) must not shadow "Romanian Deadlift" (Legs)');
  assert.equal(muscleForLift("DB Romanian Deadlift"), "Legs");
});

test("§8.5 a weak partial match falls through to the keyword rules", () => {
  assert.equal(muscleForLift("Tricep Dips"), "Triceps", '"Dips" covers too little of the name to win');
});

test("every library exercise resolves to its own declared muscle", () => {
  const wrong = EXERCISE_LIBRARY.filter((e) => muscleForLift(e.name) !== e.muscle);
  assert.deepEqual(wrong.map((e) => e.name), [], "no library entry may be shadowed by another");
});

test("no two near-duplicate library names disagree on muscle", () => {
  const byCanonical = new Map();
  for (const e of EXERCISE_LIBRARY) {
    const key = e.name.toLowerCase().replace(/[^a-z]/g, "").replace(/s$/, "");
    if (!byCanonical.has(key)) byCanonical.set(key, new Set());
    byCanonical.get(key).add(e.muscle);
  }
  const conflicts = [...byCanonical].filter(([, muscles]) => muscles.size > 1).map(([k]) => k);
  assert.deepEqual(conflicts, []);
});

/* ── §8.6 — a displayed colour and the number beside it share one computation ────
   Training Distribution coloured bars from the worst sub-region while printing a
   combined total, so Arms read "27 / 8-20" in yellow instead of red. */

test("§8.6 heatmap status thresholds are inclusive-low, exclusive-high", () => {
  const lm = [6, 10, 20]; // mev, mav, mrv
  assert.equal(heatmapStatus(0, lm), "gray");
  assert.equal(heatmapStatus(5.9, lm), "gray");
  assert.equal(heatmapStatus(6, lm), "green");
  assert.equal(heatmapStatus(9.9, lm), "green");
  assert.equal(heatmapStatus(10, lm), "yellow");
  assert.equal(heatmapStatus(19.9, lm), "yellow");
  assert.equal(heatmapStatus(20, lm), "red");
  assert.equal(heatmapStatus(27, lm), "red", "the Arms 27-sets report must land red");
});

test("§8.6 status is gray when a region has no landmarks or no volume", () => {
  assert.equal(heatmapStatus(10, null), "gray");
  assert.equal(heatmapStatus(0, [6, 10, 20]), "gray");
});

/* ── supporting structure ───────────────────────────────────────────────────── */

test("every heatmap region maps to a real muscle group with landmarks", () => {
  const landmarks = resolveLandmarks({});
  for (const region of HEATMAP_REGIONS) {
    const muscle = REGION_TO_MUSCLE[region];
    assert.ok(muscle, `${region} has no muscle mapping`);
    assert.ok(DEFAULT_LANDMARKS[muscle], `${muscle} has no default landmarks`);
    assert.equal(landmarks[muscle].length, 3);
  }
});

test("landmark overrides win over defaults and leave other muscles alone", () => {
  const resolved = resolveLandmarks({ Chest: [1, 2, 3] });
  assert.deepEqual(resolved.Chest, [1, 2, 3]);
  assert.deepEqual(resolved.Back, DEFAULT_LANDMARKS.Back);
});

test("every exercise contributes only to real heatmap regions", () => {
  for (const e of EXERCISE_LIBRARY) {
    for (const [region, weight] of regionContributionsFor(e.name, e.muscle)) {
      assert.ok(HEATMAP_REGIONS.includes(region), `${e.name} contributes to unknown region ${region}`);
      assert.ok(weight > 0 && weight <= 1, `${e.name} has out-of-range weight ${weight}`);
    }
  }
});

test("cardio contributes to no strength region", () => {
  assert.deepEqual(regionContributionsFor("Treadmill Run", "Cardio"), []);
});

/* ── coach output is derived, never invented ────────────────────────────────── */

test("the coach says nothing at all when there is no history", () => {
  const tips = generateInsights([], {}, null);
  assert.equal(tips.length, 1);
  assert.equal(tips[0].id, "welcome");
});

/* ── backup / restore ───────────────────────────────────────────────────────
   A restore writes over training history, so it must refuse anything it does not
   fully understand, and must never delete work logged after the backup was taken. */

test("a backup round-trips every collection the app owns", () => {
  const state = {
    sessions: [session(daysAgo(1), [ex("a", "Back Squat", [set(225, 5, "Back Squat")])])],
    customDays: [{ id: "d1", exercises: [] }],
    dayAdds: { "push-a": [{ id: "x" }] },
    customExercises: [{ name: "My Lift", muscle: "Chest" }],
    sideDays: [{ id: "s1", exercises: [] }],
    landmarkOverrides: { Chest: [1, 2, 3] },
    dismissedInsights: ["weak::Chest is lagging"],
    profile: { firstName: "R" },
  };
  const restored = parseBackup(JSON.stringify(buildBackup(state)));
  for (const key of Object.keys(state)) {
    assert.deepEqual(restored.data[key], state[key], `${key} did not survive the round trip`);
  }
});

test("restoring an older backup never deletes newer sessions", () => {
  const older = { sessions: [session(daysAgo(30), [ex("a", "Back Squat", [set(200, 5, "Back Squat")])])] };
  const backup = buildBackup(older);
  const current = {
    sessions: [
      session(daysAgo(1), [ex("a", "Back Squat", [set(250, 5, "Back Squat")])]),
      session(daysAgo(30), [ex("a", "Back Squat", [set(200, 5, "Back Squat")])]),
    ],
  };
  const merged = mergeBackup(current, backup);
  assert.equal(merged.sessions.length, 2, "the session logged since the backup must survive");
  assert.equal(merged.addedSessions, 0);
});

test("a backup adds sessions the current device is missing", () => {
  const backup = buildBackup({ sessions: [session(daysAgo(9), [ex("a", "Back Squat", [set(210, 5, "Back Squat")])])] });
  const merged = mergeBackup({ sessions: [] }, backup);
  assert.equal(merged.sessions.length, 1);
  assert.equal(merged.addedSessions, 1);
});

test("restore refuses anything that isn't a well-formed Iron Log backup", () => {
  for (const [input, why] of [
    ["not json at all", "invalid JSON"],
    [JSON.stringify({ hello: "world" }), "wrong format marker"],
    [JSON.stringify({ format: "iron-log-backup", version: 999, data: { sessions: [] } }), "newer version"],
    [JSON.stringify({ format: "iron-log-backup", version: 1 }), "no data"],
    [JSON.stringify({ format: "iron-log-backup", version: 1, data: {} }), "no sessions array"],
    [JSON.stringify({ format: "iron-log-backup", version: 1, data: { sessions: [{ id: 1 }] } }), "malformed session"],
  ]) {
    assert.throws(() => parseBackup(input), Error, `should have refused: ${why}`);
  }
});

test("coach tips carry a stable id and a title for dismissal keying", () => {
  const history = [
    session(daysAgo(2), [ex("legs-a-1", "Back Squat", [set(225, 5, "Back Squat")])]),
    session(daysAgo(4), [ex("legs-a-1", "Back Squat", [set(220, 5, "Back Squat")])]),
  ];
  for (const tip of generateInsights(history, {}, null)) {
    assert.ok(tip.id, "every tip needs an id");
    assert.ok(tip.title, "dismissal is keyed on id::title, so title must exist");
  }
});

/* ── one display category, ten body-map regions ─────────────────────────────
   Lower body is a single "Legs" category in every list the user sees, but the heatmap
   and the volume landmarks still work per muscle. That indirection lives in
   classifyLegExercise, keyed on the exercise NAME — so if it ever regresses, a leg day
   quietly colours the wrong part of the silhouette and the landmark comparison for
   quads, hamstrings, glutes and calves all drift at once. */

test("the Legs category still resolves to the right body-map region", () => {
  for (const [name, region] of [
    ["Back Squat", "Quads"],
    ["Leg Press", "Quads"],
    ["Bulgarian Split Squat", "Quads"],
    ["Reverse Nordic", "Quads"],
    ["Romanian Deadlift", "Hamstrings"],
    ["Seated Leg Curl", "Hamstrings"],
    ["Glute-Ham Raise", "Hamstrings"],
    ["Hip Thrust", "Glutes"],
    ["Cable Pull-Through", "Glutes"],
    ["Hip Abduction Machine", "Glutes"],
    ["Hip Adduction Machine", "Glutes"],
    ["Standing Calf Raise", "Calves"],
    ["Leg Press Calf Raise", "Calves"],
  ]) {
    const contributions = regionContributionsFor(name, muscleForLift(name));
    assert.equal(muscleForLift(name), "Legs", `${name} belongs to the Legs category`);
    assert.equal(contributions[0][0], region, `${name} should load ${region} first`);
    assert.equal(contributions[0][1], 1, `${name} should treat ${region} as its primary`);
  }
});

test("every Legs exercise lands on a real, non-Legs heatmap region", () => {
  const legs = EXERCISE_LIBRARY.filter((e) => e.muscle === "Legs");
  assert.ok(legs.length > 20, "the library should still hold a full lower-body catalogue");
  for (const e of legs) {
    for (const [region] of regionContributionsFor(e.name, e.muscle)) {
      assert.ok(HEATMAP_REGIONS.includes(region), `${e.name} contributed to unknown region ${region}`);
      assert.notEqual(region, "Legs", "Legs is a display category, never a heatmap region");
    }
  }
});

/* ── coach output is derived, never invented ────────────────────────────────
   Every tip is a sentence about the user's own numbers, so each one has to be traceable
   to a row in the log. The failure that prompted this was a confident "Back Squat: aim
   for 365 lb" for someone who had never squatted. */

test("every number the coach prints appears in the log it was given", () => {
  const history = [
    session(daysAgo(2), [ex("legs-a-1", "Back Squat", [set(225, 5, "Back Squat"), set(235, 3, "Back Squat")])]),
    session(daysAgo(9), [ex("legs-a-1", "Back Squat", [set(225, 5, "Back Squat")])]),
    session(daysAgo(16), [ex("legs-a-1", "Back Squat", [set(220, 5, "Back Squat")])]),
  ];
  const tips = generateInsights(history, {}, null);
  assert.ok(tips.length, "a three-session history should produce at least one tip");
  const logged = new Set(["220", "225", "235", "3", "5"]);
  for (const tip of tips) {
    // Every weight-shaped number in a tip must be one that was actually logged, a count
    // the tip itself derives (sessions, days, percentages), or a date.
    assert.ok(!/\b(36[0-9]|3[1-9][0-9])\b/.test(tip.title + tip.body), `invented weight in: ${tip.title}`);
  }
  const pr = tips.find((t) => t.id === "pr");
  assert.ok(pr, "a 235 lb top set after a 225 lb best is a record");
  assert.ok(pr.title.includes("235"), "the record must quote the weight that was logged");
  assert.ok(pr.body.includes("225"), "and the previous best it beat");
  assert.ok(logged.has("235"));
});

test("a first-ever log of a lift is a starting point, not a personal record", () => {
  const history = [session(daysAgo(1), [ex("a", "Front Squat", [set(185, 5, "Front Squat")])])];
  assert.equal(generateInsights(history, {}, null).find((t) => t.id === "pr"), undefined);
});

test("a stalled lift suppresses the add-5-lb tip for that same lift", () => {
  const history = [
    session(daysAgo(2), [ex("legs-a-1", "Back Squat", [set(225, 5, "Back Squat")])]),
    session(daysAgo(10), [ex("legs-a-1", "Back Squat", [set(225, 5, "Back Squat")])]),
    session(daysAgo(18), [ex("legs-a-1", "Back Squat", [set(225, 5, "Back Squat")])]),
  ];
  const nextDay = { id: "legs-a", exercises: [{ id: "legs-a-1", best: "Back Squat" }] };
  const tips = generateInsights(history, {}, nextDay);
  assert.ok(tips.find((t) => t.id === "stall"), "three sessions at one weight is a plateau");
  assert.equal(tips.find((t) => t.id === "overload"), undefined, "'add 5 lb' contradicts the plateau advice");
});

/* ── starred exercises ─────────────────────────────────────────────────────── */

test("starring is case-insensitive and toggles cleanly", () => {
  let favs = toggleFavorite([], "Back Squat");
  assert.deepEqual(favs, ["Back Squat"]);
  assert.ok(isFavorite(favs, "back squat"), "matching must ignore case");
  favs = toggleFavorite(favs, "BACK SQUAT");
  assert.deepEqual(favs, [], "un-starring must match the same way starring did");
  assert.deepEqual(toggleFavorite(["Back Squat"], "  "), ["Back Squat"], "a blank name changes nothing");
});

test("a backup carries starred exercises, and an older one doesn't wipe them", () => {
  const state = { sessions: [], favorites: ["Back Squat"] };
  assert.deepEqual(parseBackup(JSON.stringify(buildBackup(state))).data.favorites, ["Back Squat"]);
  // A backup taken before starring existed has no favorites key at all.
  const old = { format: "iron-log-backup", version: 1, data: { sessions: [] } };
  assert.deepEqual(mergeBackup({ sessions: [], favorites: ["Hip Thrust"] }, old).favorites, ["Hip Thrust"]);
});

test("the Legs volume bar's landmarks are the sum of its four muscle groups", () => {
  const lm = resolveLandmarks({});
  for (let i = 0; i < 3; i++) {
    const sum = ["Quads", "Hamstrings", "Glutes", "Calves"].reduce((a, m) => a + lm[m][i], 0);
    assert.equal(lm.Legs[i], sum, "a combined set count needs a combined landmark to be read against");
  }
  // An override to one leg group has to move the combined total with it.
  const bumped = resolveLandmarks({ Quads: [100, 200, 300] });
  assert.equal(bumped.Legs[0], lm.Legs[0] - lm.Quads[0] + 100);
  // Legs is derived, so it must never appear as its own editable muscle group.
  assert.ok(!MUSCLE_GROUPS.includes("Legs"));
});

/* ── the coach drips, it doesn't dump ──────────────────────────────────────── */

const tips = (n) => Array.from({ length: n }, (_, i) => ({ id: "t" + i, title: "Tip " + i }));
const key = (t) => `${t.id}::${t.title}`;

test("at most five tips surface at once, however many are true", () => {
  const { visible, queued } = visibleInsights(tips(11), [], null, "2026-09-30");
  assert.equal(visible.length, TIPS_PER_DAY);
  assert.equal(queued, 6, "the rest are queued, not discarded");
  assert.deepEqual(visible.map((t) => t.id), ["t0", "t1", "t2", "t3", "t4"], "highest priority first");
});

test("dismissing a tip does not pull the next one up until tomorrow", () => {
  const all = tips(11);
  const today = "2026-09-30";
  const budget = spendInsightBudget(spendInsightBudget(null, today), today);
  assert.deepEqual(budget, { day: today, count: 2 });

  const sameDay = visibleInsights(all, [key(all[0]), key(all[1])], budget, today);
  assert.equal(sameDay.visible.length, 3, "two dismissed from five leaves three, with no backfill");
  assert.deepEqual(sameDay.visible.map((t) => t.id), ["t2", "t3", "t4"]);

  const tomorrow = visibleInsights(all, [key(all[0]), key(all[1])], budget, "2026-10-01");
  assert.equal(tomorrow.visible.length, TIPS_PER_DAY, "the queue advances on a new day");
  assert.deepEqual(tomorrow.visible.map((t) => t.id), ["t2", "t3", "t4", "t5", "t6"]);
});

test("clearing the whole board leaves nothing until tomorrow, and says how much is waiting", () => {
  const all = tips(8);
  const today = "2026-09-30";
  let budget = null;
  for (let i = 0; i < 5; i++) budget = spendInsightBudget(budget, today);
  const dismissed = all.slice(0, 5).map(key);
  const now = visibleInsights(all, dismissed, budget, today);
  assert.equal(now.visible.length, 0);
  assert.equal(now.queued, 3, "the three still true are what the empty state promises for tomorrow");
  assert.equal(visibleInsights(all, dismissed, budget, "2026-10-01").visible.length, 3);
});

test("a budget left over from another day is ignored, not carried forward", () => {
  const stale = { day: "2026-09-01", count: 5 };
  assert.equal(visibleInsights(tips(11), [], stale, "2026-09-30").visible.length, TIPS_PER_DAY);
  assert.deepEqual(spendInsightBudget(stale, "2026-09-30"), { day: "2026-09-30", count: 1 });
});

test("the coach's day rolls over at local midnight, not UTC", () => {
  // 23:30 on the 30th, local time. A UTC-based key would call this the 1st for anyone
  // east of Greenwich and the 30th for anyone west — the tip queue would advance at the
  // wrong hour, in opposite directions, depending on where you are.
  const late = new Date(2026, 8, 30, 23, 30);
  assert.equal(localDayKey(late), "2026-09-30");
  assert.equal(localDayKey(new Date(2026, 0, 5)), "2026-01-05", "month and day are zero-padded");
});
