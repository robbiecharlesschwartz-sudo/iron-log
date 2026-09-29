import test from "node:test";
import assert from "node:assert/strict";

import { EXERCISE_LIBRARY } from "../src/lib/exerciseLibrary.js";
import { muscleForLift, normalizeLiftName } from "../src/lib/muscleMapping.js";
import { lastPerformanceFor } from "../src/lib/sessionUtils.js";
import { topSetForLift, lastLiftForSlot, generateInsights } from "../src/lib/insights.js";
import { heatmapStatus, regionContributionsFor, HEATMAP_REGIONS } from "../src/lib/heatmapData.js";
import { DEFAULT_LANDMARKS, REGION_TO_MUSCLE, resolveLandmarks } from "../src/lib/landmarks.js";
import { buildBackup, parseBackup, mergeBackup } from "../src/lib/backup.js";

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
    ["Reverse Pec Flye", "Shoulders"],
    ["Cable Upright Row", "Shoulders"],
    ["Tricep Dips", "Triceps"],
    ["Nordic Hamstring Curl", "Hamstrings"],
    ["Seated Hamstring Curl", "Hamstrings"],
    ["Chest Supported Row", "Back"],
    ["Sumo Deadlift High Pull", "Glutes"],
    ["Incline Chest Fly", "Chest"],
  ]) {
    assert.equal(muscleForLift(name), muscle, `${name} should resolve to ${muscle}`);
  }
});

test("§8.5 partial matching prefers the longest match", () => {
  assert.equal(muscleForLift("Barbell Romanian Deadlift"), "Hamstrings", '"Deadlift" must not shadow "Romanian Deadlift"');
  assert.equal(muscleForLift("DB Romanian Deadlift"), "Hamstrings");
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
