import { Check } from "lucide-react";
import { EXERCISE_LIBRARY } from "./exerciseLibrary";

export const LIFT_MUSCLE = (() => {
  const m = {};
  for (const e of EXERCISE_LIBRARY) m[e.name.toLowerCase()] = e.muscle;
  return m;
})();


export function muscleForLift(name) {
  if (!name) return "Other";
  // 1. Exact match in library (case-insensitive) — always wins
  const lower = name.trim().toLowerCase();
  for (const e of EXERCISE_LIBRARY) {
    if (e.name.toLowerCase() === lower) return e.muscle;
  }
  // 2. Partial name match — if library name is fully contained or vice-versa
  for (const e of EXERCISE_LIBRARY) {
    const libLower = e.name.toLowerCase();
    if (lower.includes(libLower) || libLower.includes(lower)) return e.muscle;
  }
  // 3. Heuristics for names not in library
  const has = (...w) => w.some((x) => lower.includes(x));
  if (has("cardio", "treadmill", "bike", "rowing", "jump rope", "elliptical", "swimming", "stair")) return "Cardio";
  if (has("bench", "chest", "pec", "fly", "incline press", "push-up", "dip")) return "Chest";
  if (has("row", "pulldown", "pull-up", "pullup", "deadlift", "pullover", "lat ")) return "Back";
  if (has("shoulder press", "overhead press", "lateral raise", "lateral", "delt", "face pull", "ohp", "arnold", "upright row")) return "Shoulders";
  if (has("curl") && !has("leg curl")) return "Biceps";
  if (has("pushdown", "tricep", "skull", "close-grip", "overhead extension")) return "Triceps";
  if (has("squat", "leg press", "leg extension", "lunge", "split squat", "step-up")) return "Quads";
  if (has("rdl", "romanian", "leg curl", "hamstring", "nordic")) return "Hamstrings";
  if (has("hip thrust", "glute", "kickback", "bridge")) return "Glutes";
  if (has("calf")) return "Calves";
  if (has("plank", "crunch", "leg raise", "ab wheel", "ab ", "russian", "core")) return "Core";
  return "Other";
}

/* Normalize lift names to a canonical form for cross-workout deduplication */


export function normalizeLiftName(name) {
  if (!name) return "";
  let s = name.trim().toLowerCase();
  // Abbreviation expansions
  s = s.replace(/\bdb\b/g, "dumbbell").replace(/\bbb\b/g, "barbell").replace(/\bez\b/g, "ez-bar");
  // Strip parenthetical modifiers that don't change the exercise identity
  s = s.replace(/\s*\([^)]*\)/g, "").trim();
  // Common synonym mappings → canonical name
  const MAP = {
    "seated dumbbell press": "seated dumbbell shoulder press",
    "overhead press": "barbell overhead press",
    "ohp": "barbell overhead press",
    "pull up": "pull-ups", "pullup": "pull-ups", "pull-up": "pull-ups",
    "weighted pull up": "weighted pull-ups", "weighted pull-up": "weighted pull-ups",
    "romanian deadlift": "romanian deadlift", "rdl": "romanian deadlift",
    "dumbbell rdl": "dumbbell rdl",
    "back squat": "back squat", "barbell back squat": "back squat",
    "barbell squat": "back squat",
    "incline db press": "incline dumbbell press",
    "cable fly": "cable fly", "cable crossover": "cable fly",
    "face pull": "face pulls",
    "lat pulldown": "lat pulldown", "wide-grip lat pulldown": "lat pulldown",
    "barbell row": "barbell row", "bb row": "barbell row",
  };
  // Check exact canonical map
  if (MAP[s]) s = MAP[s];
  // Normalize plural/singular variation
  s = s.replace(/\bpresses\b/g, "press").replace(/\bcurls\b/g, "curl")
       .replace(/\brows\b/g, "row").replace(/\braises\b/g, "raise");
  // Collapse whitespace
  s = s.replace(/\s+/g, " ").trim();
  return s;
}

