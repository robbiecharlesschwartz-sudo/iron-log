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
  // 2. Partial name match. Two rules keep this honest, because a naive "first entry
  // that appears inside the name" is wrong twice over:
  //   - Longest wins, so "Barbell Romanian Deadlift" resolves against "Romanian
  //     Deadlift" (Hamstrings) instead of plain "Deadlift" (Back), which merely
  //     happens to sit earlier in the array.
  //   - The match has to account for most of the name. "Tricep Dips" contains "Dips"
  //     but is not a chest exercise; a 4-of-11-character overlap is not evidence, so
  //     weak matches fall through to the keyword rules below instead.
  let best = null;
  for (const e of EXERCISE_LIBRARY) {
    const libLower = e.name.toLowerCase();
    if (!(lower.includes(libLower) || libLower.includes(lower))) continue;
    const coverage = Math.min(lower.length, libLower.length) / Math.max(lower.length, libLower.length);
    if (coverage < 0.6) continue;
    if (!best || libLower.length > best.len) best = { muscle: e.muscle, len: libLower.length };
  }
  if (best) return best.muscle;
  // 3. Heuristics for names not in the library at all — i.e. exercises the user typed
  // themselves. Order is load-bearing: the first match wins, so every rule has to run
  // BEFORE any broader rule that would also match it. "Rear Delt Fly" has to beat
  // "fly"→Chest, "Upright Row" has to beat "row"→Back, "Tricep Dip" has to beat
  // "dip"→Chest, "Nordic Hamstring Curl" has to beat "curl"→Biceps, and "Romanian
  // Deadlift" has to beat "deadlift"→Back. Specific first, generic last.
  const has = (...w) => w.some((x) => lower.includes(x));
  if (has("cardio", "treadmill", "bike", "rowing", "jump rope", "elliptical", "swimming", "stair")) return "Cardio";
  // Shoulders before Chest ("fly") and Back ("row")
  if (has("shoulder press", "overhead press", "push press", "ohp", "arnold", "lateral raise", "lateral", "delt", "rear ", "reverse fly", "reverse pec", "bent over fly", "bent-over fly", "face pull", "upright row", "front raise")) return "Shoulders";
  // Triceps before Chest ("dip", "bench")
  if (has("pushdown", "tricep", "skull", "close-grip", "close grip", "overhead extension", "jm press", "tate press")) return "Triceps";
  // Hamstrings before Back ("deadlift") and Biceps ("curl")
  if (has("rdl", "romanian", "leg curl", "hamstring", "nordic", "good morning", "stiff-leg", "stiff leg", "glute-ham", "glute ham")) return "Hamstrings";
  // Glutes before Back ("deadlift")
  if (has("hip thrust", "glute", "kickback", "bridge", "sumo", "pull-through", "pull through", "abduction")) return "Glutes";
  if (has("calf")) return "Calves";
  if (has("curl")) return "Biceps"; // leg/hamstring/nordic curls already returned above
  if (has("squat", "leg press", "leg extension", "lunge", "split squat", "step-up", "step up")) return "Quads";
  if (has("row", "pulldown", "pull-up", "pullup", "chin-up", "chinup", "deadlift", "pullover", "shrug", "lat ")) return "Back";
  if (has("bench", "chest", "pec", "fly", "incline press", "push-up", "pushup", "dip")) return "Chest";
  if (has("plank", "crunch", "leg raise", "knee raise", "ab wheel", "ab ", "russian", "core", "sit-up", "situp", "pallof", "woodchop", "dead bug", "l-sit", "carry")) return "Core";
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

