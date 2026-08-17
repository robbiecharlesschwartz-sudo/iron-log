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

export function resolveLandmarks(overrides) {
  const out = {};
  for (const m of MUSCLE_GROUPS) out[m] = (overrides && overrides[m]) || DEFAULT_LANDMARKS[m];
  return out;
}
