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

// The Heatmap tab renders finer body-map regions than the landmark table tracks
// (e.g. Back splits into Lats/Traps/UpperBack/LowerBack for the silhouette) — each
// region borrows its parent muscle group's landmark.
export const REGION_TO_MUSCLE = {
  Chest: "Chest", Shoulders: "Shoulders", Triceps: "Triceps", Biceps: "Biceps",
  UpperBack: "Back", Lats: "Back", Traps: "Back", LowerBack: "Back",
  Core: "Core", Glutes: "Glutes", Quads: "Quads", Hamstrings: "Hamstrings", Calves: "Calves",
};

export function resolveLandmarks(overrides) {
  const out = {};
  for (const m of MUSCLE_GROUPS) out[m] = (overrides && overrides[m]) || DEFAULT_LANDMARKS[m];
  return out;
}
