import { CSS } from "@dnd-kit/utilities";

export const RANGE_OPTS = [["1W", 7], ["1M", 30], ["6M", 182], ["All Time", 100000]];

/* ====================================================================== */
/* MUSCLE HEATMAP — body-map engine                                       */
/* The app's exercise library tags each lift with ONE primary "muscle"
   category (e.g. "Back"). The heatmap wants finer regions (Lats, Upper
   Back, Traps) plus secondary-muscle spillover (e.g. Bench Press also
   loads Shoulders/Triceps a bit). Rather than hand-tagging 200+ exercises
   with exact secondary muscles, we use a documented heuristic: each library
   category maps to one or more heatmap regions with primary/secondary
   weights, and "Back" is further split by name keywords (row vs pulldown
   vs shrug vs deadlift-pattern). This is an approximation, not exact
   biomechanics — good enough for "at a glance" body-map coloring. */


export const HEATMAP_REGIONS = ["Chest", "Shoulders", "Triceps", "Biceps", "UpperBack", "Lats", "Traps", "LowerBack", "Core", "Glutes", "Quads", "Hamstrings", "Calves"];
// Per-region landmarks now come from lib/landmarks.js (via REGION_TO_MUSCLE), the single
// shared, user-editable source of truth also used by the Exercises tab's volume bars.
// Separate, directly-authored ranges for the broad Training Distribution groups (Chest/Back/
// Legs/Shoulders/Arms/Core). These are NOT a sum of the sub-region numbers above — summing
// 4 back sub-regions' landmarks previously produced a "22-56 sets" range, which reads as an
// authoritative target when it's actually an arithmetic artifact, not a real prescription.


export const BROAD_GROUP_LANDMARKS = {
  Chest: [6, 10, 16], Back: [8, 14, 20], Legs: [10, 16, 24],
  Shoulders: [6, 10, 16], Arms: [8, 14, 20], Core: [4, 8, 14],
};
// Classify a "Back"-category exercise into its dominant back sub-regions by name.


export function classifyBackExercise(name) {
  const n = (name || "").toLowerCase();
  if (n.includes("shrug")) return [["Traps", 1], ["UpperBack", 0.2]];
  if (n.includes("pulldown") || n.includes("pull-up") || n.includes("pullup") || n.includes("chin-up") || n.includes("chin up"))
    return [["Lats", 1], ["Biceps", 0.3]];
  if (n.includes("face pull") || n.includes("rear delt") || n.includes("reverse fly") || n.includes("reverse pec"))
    return [["Shoulders", 0.8], ["UpperBack", 0.4]];
  if (n.includes("deadlift") || n.includes("rack pull") || n.includes("good morning") || n.includes("hyperextension"))
    return [["LowerBack", 1], ["Glutes", 0.5], ["Hamstrings", 0.3]];
  if (n.includes("row")) return [["UpperBack", 0.7], ["Lats", 0.5], ["Biceps", 0.3]];
  return [["UpperBack", 0.6], ["Lats", 0.6]]; // generic back movement fallback
}
// Map a logged exercise to weighted heatmap-region contributions per set.


export function regionContributionsFor(exerciseName, libraryMuscle) {
  const m = libraryMuscle;
  if (m === "Back") return classifyBackExercise(exerciseName);
  if (m === "Chest") return [["Chest", 1], ["Shoulders", 0.4], ["Triceps", 0.3]];
  if (m === "Shoulders") return [["Shoulders", 1], ["Triceps", 0.2]];
  if (m === "Triceps") return [["Triceps", 1], ["Shoulders", 0.15]];
  if (m === "Biceps") return [["Biceps", 1]];
  if (m === "Quads") return [["Quads", 1], ["Glutes", 0.25]];
  if (m === "Hamstrings") return [["Hamstrings", 1], ["Glutes", 0.4]];
  if (m === "Glutes") return [["Glutes", 1], ["Hamstrings", 0.3]];
  if (m === "Calves") return [["Calves", 1]];
  if (m === "Core") return [["Core", 1]];
  return []; // Cardio / Other — not represented on the strength body map
}
// gray / green / yellow / red — purely a function of accumulated weekly sets vs that
// region's MEV/MAV/MRV, exactly matching the rest of the app's volume-landmark logic.
// Primary Muscles / Secondary Muscles / Untargeted — matches how fitness-tracking
// body maps (Strava, Fitbod, etc.) present this: red = a region that was the PRIMARY
// target of at least one exercise you did in range; yellow = only ever worked as
// assistance/secondary; gray = untouched. Simpler and more legible than a volume-
// landmark gradient, while the tap-to-expand panel still surfaces sets/week detail.
// MEV / MAV / MRV / Untargeted — a region's weekly-average sets compared against its
// own volume landmarks. Below MEV = not enough direct work yet (gray). MEV–MAV = building
// (green). MAV–MRV = optimal growth zone (yellow). At/above MRV = high volume, watch
// recovery (red). This is the Garmin-style four-tier model.


export function heatmapStatus(perWeek, landmarks) {
  if (!landmarks || perWeek <= 0) return "gray";
  const [mev, mav, mrv] = landmarks;
  if (perWeek < mev) return "gray";
  if (perWeek < mav) return "green";
  if (perWeek < mrv) return "yellow";
  return "red";
}


export const HEATMAP_STATUS_COLOR = { gray: "#5E6168", green: "#22C55E", yellow: "#FACC15", red: "#EF4444" };


export const HEATMAP_STATUS_LABEL = { gray: "Below MEV", green: "MEV", yellow: "MAV", red: "Above MRV" };


export const HEATMAP_STATUS_SHORT = { gray: "—", green: "MEV", yellow: "MAV", red: "MRV+" };


export const HEATMAP_DISPLAY_NAME = {
  Chest: "Chest", Shoulders: "Shoulders", Triceps: "Triceps", Biceps: "Biceps",
  UpperBack: "Upper Back", Lats: "Lats", Traps: "Traps", LowerBack: "Lower Back", Core: "Core",
  Glutes: "Glutes", Quads: "Quads", Hamstrings: "Hamstrings", Calves: "Calves",
};
// Recovery fade: freshly-trained muscles render darker/duller; by ~96h they're back
// to full brightness, signalling "ready to train again." Pure CSS filter, no re-render
// of the SVG shape itself — only the filter value changes, so this is cheap to animate.


export function recoveryFilter(daysAgo, status) {
  if (status === "gray" || daysAgo === null) return "none";
  const factor = Math.max(0, Math.min(1, daysAgo / 4)); // 0 = just trained, 1 = fully recovered (~96h)
  const brightness = 0.62 + factor * 0.38;
  const saturate = 0.75 + factor * 0.25;
  return `brightness(${brightness.toFixed(2)}) saturate(${saturate.toFixed(2)})`;
}

// A single muscle region shape — its own independent SVG element, own fill/filter,
// own 250ms transition. Only this element repaints when its status changes.
// A single named muscle — its own independent SVG path with a semantic id, own
// fill/filter, own 250ms transition. React only assigns `fill`; the path geometry
// itself never changes. Only this element repaints when its status changes.

