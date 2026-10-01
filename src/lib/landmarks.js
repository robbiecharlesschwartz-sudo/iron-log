// Single source of truth for weekly-set volume landmarks (MEV/MAV/MRV) per muscle
// group, shared by the Exercises tab's volume bars and the Heatmap tab's body-map
// colors, so both always agree. Users can override any muscle's numbers from
// Profile; anything not overridden falls back to these defaults.
export const DEFAULT_LANDMARKS = {
  Chest: [6, 10, 20],
  Back: [6, 10, 25],
  Shoulders: [6, 10, 25],
  Biceps: [6, 8, 20],
  Triceps: [4, 6, 18],
  Quads: [6, 8, 20],
  Hamstrings: [4, 6, 15],
  Glutes: [4, 12, 16],
  Calves: [4, 6, 16],
  Core: [0, 12, 20],
};

export const MUSCLE_GROUPS = Object.keys(DEFAULT_LANDMARKS);

// The Heatmap tab's body-map regions map 1:1 onto these muscle groups now that Back
// (lats, traps, upper and lower back) renders as a single combined region.
export const REGION_TO_MUSCLE = {
  Chest: "Chest", Shoulders: "Shoulders", Triceps: "Triceps", Biceps: "Biceps", Back: "Back",
  Core: "Core", Glutes: "Glutes", Quads: "Quads", Hamstrings: "Hamstrings", Calves: "Calves",
};

// Lower body is one category in every exercise list (MUSCLE_ORDER), so its volume bar
// needs a floor and a ceiling of its own. They are the sum of the four leg groups' —
// the only reading consistent with the set count shown beside it, which is likewise the
// sum of its parts. Derived rather than stored: it is NOT in MUSCLE_GROUPS, so the
// landmark editor still edits quads, hamstrings, glutes and calves individually, and an
// override to any of them flows straight through into this total.
const DERIVED_GROUPS = { Legs: ["Quads", "Hamstrings", "Glutes", "Calves"] };

export function resolveLandmarks(overrides) {
  const out = {};
  for (const m of MUSCLE_GROUPS) out[m] = (overrides && overrides[m]) || DEFAULT_LANDMARKS[m];
  for (const [name, parts] of Object.entries(DERIVED_GROUPS)) {
    out[name] = parts.reduce((acc, p) => [acc[0] + out[p][0], acc[1] + out[p][1], acc[2] + out[p][2]], [0, 0, 0]);
  }
  return out;
}
