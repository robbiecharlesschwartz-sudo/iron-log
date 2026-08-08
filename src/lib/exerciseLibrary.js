import { Dumbbell, Pause } from "lucide-react";
import { C } from "./constants";
import { makeId } from "./id";

export function makeTemplateDay(id, tag, title, subtitle, exercises) {
  return { id, tag, title, subtitle, custom: true, exercises: exercises.map((e, i) => ({ id: `${id}-ex-${i}`, section: e[0], best: e[1], subs: [], setsLabel: String(e[2]), repsLabel: e[3], rest: e[4], prefill: e[2] })) };
}


export const WORKOUT_TEMPLATES = [
  {
    id: "ppl6", name: "6-Day Push / Pull / Legs", emoji: "💪",
    description: "Classic hypertrophy split — 2× PPL per week, 17–22 sets per session",
    days: null // signals to use existing WORKOUT_DAYS
  },
  {
    id: "bro5", name: "5-Day Bodybuilding Split", emoji: "🏆",
    description: "One muscle group per day, high volume isolation",
    days: [
      makeTemplateDay("bro-chest","PUSH","Chest Day","Pecs, anterior delts, triceps",[
        ["Chest","Barbell Bench Press",4,"6-10",120],["Chest","Incline Dumbbell Press",4,"10-12",90],
        ["Chest","Cable Fly",3,"12-15",60],["Chest","Dumbbell Fly",3,"12-15",60],["Triceps","Tricep Pushdown",3,"12-15",60]]),
      makeTemplateDay("bro-back","PULL","Back Day","Lats, rhomboids, rear delts",[
        ["Back","Deadlift",3,"5",180],["Back","Pull-Up",4,"8-12",90],["Back","Barbell Row",4,"10",90],
        ["Back","Seated Cable Row",3,"12",75],["Biceps","Barbell Curl",3,"12",60]]),
      makeTemplateDay("bro-shoulder","PUSH","Shoulder Day","All three delt heads",[
        ["Shoulders","Overhead Press",4,"8-10",120],["Shoulders","Dumbbell Lateral Raise",4,"12-15",60],
        ["Shoulders","Face Pull",3,"15-20",45],["Shoulders","Rear Delt Fly",3,"15",45],["Triceps","Skull Crusher",3,"10-12",75]]),
      makeTemplateDay("bro-arms","CUSTOM","Arms Day","Biceps and triceps superset focus",[
        ["Biceps","Barbell Curl",4,"10-12",75],["Triceps","Skull Crusher",4,"10-12",75],
        ["Biceps","Hammer Curl",3,"12",60],["Triceps","Tricep Pushdown",3,"12-15",60],
        ["Biceps","Concentration Curl",3,"12",45],["Triceps","Overhead Tricep Extension",3,"12",45]]),
      makeTemplateDay("bro-legs","LEGS","Leg Day","Quads, hamstrings, glutes, calves",[
        ["Quads","Barbell Squat",4,"8-10",180],["Hamstrings","Romanian Deadlift",4,"10",120],
        ["Quads","Leg Press",3,"12-15",90],["Hamstrings","Leg Curl",3,"12",75],
        ["Quads","Leg Extension",3,"15",60],["Calves","Calf Raise",4,"15-20",45]])
    ]
  },
  {
    id: "ul4", name: "4-Day Upper / Lower", emoji: "⚡",
    description: "Strength days + hypertrophy days — balanced and efficient",
    days: [
      makeTemplateDay("ul-upper-a","PUSH","Upper A","Strength focus — heavy compounds",[
        ["Chest","Barbell Bench Press",4,"5",180],["Back","Barbell Row",4,"5",180],
        ["Shoulders","Overhead Press",3,"8",120],["Back","Pull-Up",3,"8",120],["Shoulders","Dumbbell Lateral Raise",3,"12",60]]),
      makeTemplateDay("ul-lower-a","LEGS","Lower A","Strength focus — squat and hinge",[
        ["Quads","Barbell Squat",4,"5",180],["Hamstrings","Romanian Deadlift",3,"8",120],
        ["Quads","Leg Press",3,"10",90],["Hamstrings","Leg Curl",3,"10",75],["Calves","Calf Raise",4,"15",60]]),
      makeTemplateDay("ul-upper-b","PULL","Upper B","Hypertrophy focus — volume work",[
        ["Chest","Incline Dumbbell Press",4,"10-12",75],["Back","Lat Pulldown",4,"10-12",75],
        ["Chest","Cable Fly",3,"12-15",60],["Back","Seated Cable Row",3,"12",60],
        ["Biceps","Barbell Curl",3,"12",60],["Triceps","Tricep Pushdown",3,"12",60]]),
      makeTemplateDay("ul-lower-b","LEGS","Lower B","Hypertrophy focus — higher reps",[
        ["Hamstrings","Romanian Deadlift",4,"10",90],["Quads","Leg Press",4,"12-15",75],
        ["Glutes","Hip Thrust",4,"12",75],["Quads","Leg Extension",3,"15",60],
        ["Hamstrings","Leg Curl",3,"15",60],["Calves","Calf Raise",4,"20",45]])
    ]
  },
  {
    id: "fb3", name: "3-Day Full Body", emoji: "🔥",
    description: "Hit everything 3× per week — great for busy schedules",
    days: [
      makeTemplateDay("fb-a","PUSH","Full Body A","Squat pattern emphasis",[
        ["Quads","Barbell Squat",3,"5",180],["Chest","Barbell Bench Press",3,"8",90],
        ["Back","Barbell Row",3,"8",90],["Shoulders","Overhead Press",2,"10",75],["Hamstrings","Romanian Deadlift",3,"10",90]]),
      makeTemplateDay("fb-b","PULL","Full Body B","Hip hinge emphasis",[
        ["Quads","Barbell Squat",3,"5",180],["Back","Deadlift",1,"5",180],
        ["Back","Pull-Up",3,"8",90],["Chest","Dumbbell Bench Press",3,"10",75],["Shoulders","Dumbbell Lateral Raise",3,"15",60]]),
      makeTemplateDay("fb-c","LEGS","Full Body C","Glute emphasis",[
        ["Quads","Barbell Squat",3,"5",180],["Chest","Barbell Bench Press",3,"8",90],
        ["Glutes","Hip Thrust",3,"12",90],["Back","Barbell Row",3,"8",90],["Shoulders","Face Pull",3,"15",60]])
    ]
  },
  {
    id: "beginner", name: "Beginner Strength", emoji: "🌱",
    description: "Alternating A/B workouts — add weight every session",
    days: [
      makeTemplateDay("beg-a","PUSH","Workout A","Add 5 lb to each lift each session",[
        ["Quads","Barbell Squat",3,"5",180],["Chest","Barbell Bench Press",3,"5",180],["Back","Deadlift",1,"5",180]]),
      makeTemplateDay("beg-b","PULL","Workout B","Rotate with Workout A — 3× per week",[
        ["Quads","Barbell Squat",3,"5",180],["Shoulders","Overhead Press",3,"5",180],["Back","Barbell Row",3,"5",180]])
    ]
  },
  { id: "blank", name: "Start Completely Blank", emoji: "✏️", description: "Build your own program from scratch", days: [] }
];

// Deep-clone WORKOUT_DAYS as editable custom days (when PPL template selected)


export function templateDaysFromBuiltIn() {
  return WORKOUT_DAYS.map(day => ({
    ...day, id: `${day.id}-${makeId()}`, custom: true,
    exercises: day.exercises.map(e => ({ ...e, id: `${e.id}-${makeId()}` }))
  }));
}


export const MUSCLE_ORDER = ["Chest", "Back", "Shoulders", "Biceps", "Triceps", "Quads", "Hamstrings", "Glutes", "Calves", "Core", "Cardio", "Other"];


export const lx = (name, muscle, equipment, rest) => ({ name, muscle, equipment, rest });


export const EXERCISE_LIBRARY_RAW = [
  // Chest
  lx("Barbell Bench Press", "Chest", "Barbell", 150),
  lx("Incline Barbell Press", "Chest", "Barbell", 150),
  lx("Dumbbell Bench Press", "Chest", "Dumbbell", 120),
  lx("Incline Dumbbell Press", "Chest", "Dumbbell", 120),
  lx("Machine Chest Press", "Chest", "Machine", 90),
  lx("Incline Machine Press", "Chest", "Machine", 120),
  lx("Pec Deck", "Chest", "Machine", 75),
  lx("Cable Fly", "Chest", "Cable", 75),
  lx("Low-to-High Cable Fly", "Chest", "Cable", 75),
  lx("Push-Ups", "Chest", "Bodyweight", 60),
  lx("Dips", "Chest", "Bodyweight", 90),
  // Back
  lx("Deadlift", "Back", "Barbell", 180),
  lx("Barbell Row", "Back", "Barbell", 150),
  lx("T-Bar Row", "Back", "Barbell", 150),
  lx("Pull-Ups", "Back", "Bodyweight", 120),
  lx("Weighted Pull-Ups", "Back", "Bodyweight", 150),
  lx("Lat Pulldown", "Back", "Cable", 120),
  lx("Wide-Grip Lat Pulldown", "Back", "Cable", 120),
  lx("Single-Arm Lat Pulldown", "Back", "Cable", 75),
  lx("Seated Cable Row", "Back", "Cable", 120),
  lx("Chest-Supported Row", "Back", "Machine", 120),
  lx("Straight-Arm Pulldown", "Back", "Cable", 75),
  lx("Machine Pullover", "Back", "Machine", 75),
  lx("Dumbbell Row", "Back", "Dumbbell", 90),
  // Shoulders
  lx("Barbell Overhead Press", "Shoulders", "Barbell", 120),
  lx("Seated Dumbbell Shoulder Press", "Shoulders", "Dumbbell", 120),
  lx("Machine Shoulder Press", "Shoulders", "Machine", 90),
  lx("Dumbbell Lateral Raise", "Shoulders", "Dumbbell", 60),
  lx("Cable Lateral Raise", "Shoulders", "Cable", 60),
  lx("Machine Lateral Raise", "Shoulders", "Machine", 60),
  lx("Face Pulls", "Shoulders", "Cable", 75),
  lx("Reverse Pec Deck", "Shoulders", "Machine", 75),
  lx("Rear Delt Cable Fly", "Shoulders", "Cable", 75),
  // Triceps
  lx("Rope Pushdown", "Triceps", "Cable", 60),
  lx("Straight Bar Pushdown", "Triceps", "Cable", 60),
  lx("Overhead Cable Extension", "Triceps", "Cable", 75),
  lx("Skull Crushers", "Triceps", "Barbell", 75),
  lx("Dumbbell Overhead Extension", "Triceps", "Dumbbell", 75),
  lx("Close-Grip Bench Press", "Triceps", "Barbell", 120),
  // Biceps
  lx("Barbell Curl", "Biceps", "Barbell", 75),
  lx("EZ-Bar Curl", "Biceps", "Barbell", 75),
  lx("Incline Dumbbell Curl", "Biceps", "Dumbbell", 75),
  lx("Hammer Curl", "Biceps", "Dumbbell", 75),
  lx("Drag Curl", "Biceps", "Barbell", 75),
  lx("Cable Curl", "Biceps", "Cable", 60),
  lx("Preacher Curl", "Biceps", "Machine", 75),
  lx("Rope Hammer Curl", "Biceps", "Cable", 60),
  // Quads
  lx("Back Squat", "Quads", "Barbell", 180),
  lx("Front Squat", "Quads", "Barbell", 150),
  lx("Leg Press", "Quads", "Machine", 120),
  lx("Hack Squat", "Quads", "Machine", 120),
  lx("Leg Extension", "Quads", "Machine", 75),
  lx("Bulgarian Split Squat", "Quads", "Dumbbell", 90),
  lx("Walking Lunges", "Quads", "Dumbbell", 90),
  lx("Goblet Squat", "Quads", "Dumbbell", 90),
  // Hamstrings
  lx("Romanian Deadlift", "Hamstrings", "Barbell", 150),
  lx("Dumbbell RDL", "Hamstrings", "Dumbbell", 120),
  lx("Lying Leg Curl", "Hamstrings", "Machine", 75),
  lx("Seated Leg Curl", "Hamstrings", "Machine", 75),
  lx("Nordic Curl", "Hamstrings", "Bodyweight", 90),
  // Glutes
  lx("Hip Thrust", "Glutes", "Barbell", 120),
  lx("Glute Bridge", "Glutes", "Barbell", 90),
  lx("Cable Kickback", "Glutes", "Cable", 60),
  lx("Step-Ups", "Glutes", "Dumbbell", 75),
  // Calves
  lx("Standing Calf Raise", "Calves", "Machine", 60),
  lx("Seated Calf Raise", "Calves", "Machine", 60),
  lx("Leg Press Calf Raise", "Calves", "Machine", 60),
  // Core
  lx("Hanging Leg Raise", "Core", "Bodyweight", 60),
  lx("Cable Crunch", "Core", "Cable", 60),
  lx("Weighted Plank", "Core", "Bodyweight", 60),
  lx("Ab Wheel", "Core", "Bodyweight", 60),
  lx("Russian Twist", "Core", "Bodyweight", 60),
  // Cardio — log level as "weight", duration (min) as "reps"
  lx("Treadmill Run", "Cardio", "Cardio", 0),
  lx("Treadmill Walk", "Cardio", "Cardio", 0),
  lx("Incline Treadmill Walk", "Cardio", "Cardio", 0),
  lx("Stationary Bike", "Cardio", "Cardio", 0),
  lx("Assault Bike", "Cardio", "Cardio", 0),
  lx("Spin Bike", "Cardio", "Cardio", 0),
  lx("Rowing Machine", "Cardio", "Cardio", 0),
  lx("Ski Erg", "Cardio", "Cardio", 0),
  lx("Jump Rope", "Cardio", "Cardio", 0),
  lx("Stair Climber", "Cardio", "Cardio", 0),
  lx("Elliptical", "Cardio", "Cardio", 0),
  lx("Swimming", "Cardio", "Cardio", 0),
  lx("Outdoor Run", "Cardio", "Cardio", 0),
  lx("Outdoor Cycling", "Cardio", "Cardio", 0),
  lx("Incline Walk", "Cardio", "Cardio", 0),
  lx("Sled Push", "Cardio", "Cardio", 0),
  lx("Sled Pull", "Cardio", "Cardio", 0),
  lx("Battle Ropes", "Cardio", "Cardio", 0),
  lx("Box Jumps", "Cardio", "Cardio", 0),
  lx("Burpees", "Cardio", "Cardio", 0),
  lx("Mountain Climbers", "Cardio", "Cardio", 0),
  lx("High Knees", "Cardio", "Cardio", 0),
  lx("Hiking", "Cardio", "Cardio", 0),
  lx("Jumping Jacks", "Cardio", "Cardio", 0),

  // More Chest
  lx("Decline Barbell Press", "Chest", "Barbell", 150),
  lx("Decline Dumbbell Press", "Chest", "Dumbbell", 120),
  lx("Svend Press", "Chest", "Plate", 60),
  lx("Cable Crossover", "Chest", "Cable", 75),
  lx("Smith Machine Bench Press", "Chest", "Machine", 120),
  lx("Floor Press", "Chest", "Barbell", 120),

  // More Back
  lx("Chin-Up", "Back", "Bodyweight", 120),
  lx("Wide-Grip Pull-Up", "Back", "Bodyweight", 120),
  lx("Chest-Supported Row", "Back", "Machine", 90),
  lx("T-Bar Row", "Back", "Barbell", 120),
  lx("Meadows Row", "Back", "Barbell", 90),
  lx("Single-Arm Dumbbell Row", "Back", "Dumbbell", 90),
  lx("Straight-Arm Pulldown", "Back", "Cable", 60),
  lx("Rack Pull", "Back", "Barbell", 180),
  lx("Pendlay Row", "Back", "Barbell", 120),
  lx("Inverted Row", "Back", "Bodyweight", 75),

  // More Shoulders
  lx("Seated Dumbbell Press", "Shoulders", "Dumbbell", 120),
  lx("Arnold Press", "Shoulders", "Dumbbell", 120),
  lx("Cable Lateral Raise", "Shoulders", "Cable", 60),
  lx("Machine Lateral Raise", "Shoulders", "Machine", 60),
  lx("Reverse Pec Deck", "Shoulders", "Machine", 60),
  lx("Upright Row", "Shoulders", "Barbell", 75),
  lx("Front Raise", "Shoulders", "Dumbbell", 60),
  lx("Landmine Press", "Shoulders", "Barbell", 90),

  // More Triceps
  lx("Close-Grip Bench Press", "Triceps", "Barbell", 120),
  lx("Overhead Cable Extension", "Triceps", "Cable", 60),
  lx("Rope Pushdown", "Triceps", "Cable", 60),
  lx("Dumbbell Kickback", "Triceps", "Dumbbell", 45),
  lx("JM Press", "Triceps", "Barbell", 90),
  lx("Diamond Push-Up", "Triceps", "Bodyweight", 60),

  // More Biceps
  lx("Incline Dumbbell Curl", "Biceps", "Dumbbell", 60),
  lx("Preacher Curl", "Biceps", "Barbell", 60),
  lx("Cable Curl", "Biceps", "Cable", 60),
  lx("Spider Curl", "Biceps", "Dumbbell", 45),
  lx("EZ-Bar Curl", "Biceps", "Barbell", 60),
  lx("Reverse Curl", "Biceps", "Barbell", 60),

  // More Quads
  lx("Front Squat", "Quads", "Barbell", 180),
  lx("Hack Squat", "Quads", "Machine", 150),
  lx("Bulgarian Split Squat", "Quads", "Dumbbell", 90),
  lx("Walking Lunge", "Quads", "Dumbbell", 90),
  lx("Goblet Squat", "Quads", "Dumbbell", 90),
  lx("Smith Machine Squat", "Quads", "Machine", 150),
  lx("Step-Up", "Quads", "Dumbbell", 75),

  // More Hamstrings
  lx("Seated Leg Curl", "Hamstrings", "Machine", 75),
  lx("Lying Leg Curl", "Hamstrings", "Machine", 75),
  lx("Stiff-Leg Deadlift", "Hamstrings", "Barbell", 120),
  lx("Good Morning", "Hamstrings", "Barbell", 120),
  lx("Nordic Curl", "Hamstrings", "Bodyweight", 90),

  // More Glutes
  lx("Barbell Hip Thrust", "Glutes", "Barbell", 120),
  lx("Cable Kickback", "Glutes", "Cable", 45),
  lx("Glute Bridge", "Glutes", "Barbell", 75),
  lx("Reverse Lunge", "Glutes", "Dumbbell", 75),
  lx("Sumo Deadlift", "Glutes", "Barbell", 180),

  // More Calves
  lx("Seated Calf Raise", "Calves", "Machine", 45),
  lx("Standing Calf Raise", "Calves", "Machine", 45),
  lx("Leg Press Calf Raise", "Calves", "Machine", 45),

  // More Core
  lx("Hanging Leg Raise", "Core", "Bodyweight", 60),
  lx("Cable Crunch", "Core", "Cable", 45),
  lx("Plank", "Core", "Bodyweight", 45),
  lx("Russian Twist", "Core", "Bodyweight", 45),
  lx("Ab Wheel Rollout", "Core", "Bodyweight", 60),
  lx("Decline Sit-Up", "Core", "Bodyweight", 45),
  lx("Bicycle Crunch", "Core", "Bodyweight", 45),
  lx("Dead Bug", "Core", "Bodyweight", 45),

  // ── Additional variants ────────────────────────────────────────────────
  // Chest
  lx("Larsen Press", "Chest", "Barbell", 150),
  lx("Spoto Press", "Chest", "Barbell", 150),
  lx("Board Press", "Chest", "Barbell", 150),
  lx("Guillotine Press", "Chest", "Barbell", 120),
  lx("Weighted Dip", "Chest", "Bodyweight", 120),
  lx("Deficit Push-Up", "Chest", "Bodyweight", 60),
  lx("Cable Press", "Chest", "Cable", 90),
  lx("Single-Arm Cable Fly", "Chest", "Cable", 60),
  lx("Incline Cable Fly", "Chest", "Cable", 75),
  lx("Dumbbell Pullover", "Chest", "Dumbbell", 90),
  // Back
  lx("Weighted Pull-Up", "Back", "Bodyweight", 150),
  lx("Neutral-Grip Pull-Up", "Back", "Bodyweight", 120),
  lx("Kroc Row", "Back", "Dumbbell", 120),
  lx("Seal Row", "Back", "Barbell", 120),
  lx("Machine Row", "Back", "Machine", 90),
  lx("Wide-Grip Cable Row", "Back", "Cable", 90),
  lx("Single-Arm Lat Pulldown", "Back", "Cable", 75),
  lx("Reverse-Grip Lat Pulldown", "Back", "Cable", 90),
  lx("Face Pull", "Back", "Cable", 60),
  lx("Snatch-Grip Deadlift", "Back", "Barbell", 180),
  lx("Trap Bar Deadlift", "Back", "Barbell", 180),
  lx("Barbell Shrug", "Back", "Barbell", 75),
  lx("Dumbbell Shrug", "Back", "Dumbbell", 75),
  // Shoulders
  lx("Standing Overhead Press", "Shoulders", "Barbell", 150),
  lx("Push Press", "Shoulders", "Barbell", 150),
  lx("Z Press", "Shoulders", "Barbell", 120),
  lx("Behind-the-Neck Press", "Shoulders", "Barbell", 120),
  lx("Leaning Cable Lateral Raise", "Shoulders", "Cable", 60),
  lx("Cable Rear Delt Fly", "Shoulders", "Cable", 60),
  lx("Bent-Over Reverse Fly", "Shoulders", "Dumbbell", 60),
  lx("Cuban Press", "Shoulders", "Dumbbell", 60),
  lx("Plate Front Raise", "Shoulders", "Plate", 60),
  // Triceps
  lx("Skull Crusher", "Triceps", "Barbell", 90),
  lx("Cross-Body Extension", "Triceps", "Dumbbell", 60),
  lx("Single-Arm Pushdown", "Triceps", "Cable", 45),
  lx("Reverse-Grip Pushdown", "Triceps", "Cable", 60),
  lx("Bench Dip", "Triceps", "Bodyweight", 60),
  lx("Tate Press", "Triceps", "Dumbbell", 75),
  // Biceps
  lx("Barbell Curl", "Biceps", "Barbell", 75),
  lx("Hammer Curl", "Biceps", "Dumbbell", 60),
  lx("Concentration Curl", "Biceps", "Dumbbell", 45),
  lx("Bayesian Curl", "Biceps", "Cable", 60),
  lx("Drag Curl", "Biceps", "Barbell", 60),
  lx("Zottman Curl", "Biceps", "Dumbbell", 60),
  lx("Machine Preacher Curl", "Biceps", "Machine", 60),
  // Quads
  lx("Back Squat", "Quads", "Barbell", 180),
  lx("Pause Squat", "Quads", "Barbell", 180),
  lx("Safety Bar Squat", "Quads", "Barbell", 180),
  lx("Box Squat", "Quads", "Barbell", 180),
  lx("Belt Squat", "Quads", "Machine", 120),
  lx("Sissy Squat", "Quads", "Bodyweight", 75),
  lx("Reverse Nordic", "Quads", "Bodyweight", 75),
  lx("Split Squat", "Quads", "Dumbbell", 90),
  // Hamstrings
  lx("Romanian Deadlift", "Hamstrings", "Barbell", 150),
  lx("Single-Leg RDL", "Hamstrings", "Dumbbell", 90),
  lx("Glute-Ham Raise", "Hamstrings", "Bodyweight", 90),
  lx("Cable Pull-Through", "Hamstrings", "Cable", 75),
  lx("Standing Leg Curl", "Hamstrings", "Machine", 60),
  // Glutes
  lx("Single-Leg Hip Thrust", "Glutes", "Bodyweight", 75),
  lx("Machine Hip Thrust", "Glutes", "Machine", 90),
  lx("Frog Pump", "Glutes", "Dumbbell", 60),
  lx("Curtsy Lunge", "Glutes", "Dumbbell", 75),
  lx("Hip Abduction Machine", "Glutes", "Machine", 60),
  // Calves
  lx("Donkey Calf Raise", "Calves", "Machine", 45),
  lx("Single-Leg Calf Raise", "Calves", "Bodyweight", 45),
  lx("Smith Machine Calf Raise", "Calves", "Machine", 45),
  // Core
  lx("Hanging Knee Raise", "Core", "Bodyweight", 60),
  lx("Toes-to-Bar", "Core", "Bodyweight", 75),
  lx("Side Plank", "Core", "Bodyweight", 45),
  lx("Pallof Press", "Core", "Cable", 45),
  lx("Weighted Crunch", "Core", "Plate", 45),
  lx("Woodchopper", "Core", "Cable", 45),
  lx("L-Sit", "Core", "Bodyweight", 60),
  lx("Farmer's Carry", "Core", "Dumbbell", 90),
  lx("Suitcase Carry", "Core", "Dumbbell", 75),
];

// Collapse any accidental duplicates (same name) — first definition wins.
// Keeps the library self-maintaining as entries get added over time.


export const EXERCISE_LIBRARY = (() => {
  const seen = new Set();
  const out = [];
  for (const e of EXERCISE_LIBRARY_RAW) {
    const key = e.name.trim().toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(e);
  }
  return out;
})();

// Auto-categorize a new custom exercise by the workout it was created in, so the
// user never has to hand-pick a muscle group for something obvious.


export function autoMuscleForDay(day, kind) {
  if (kind === "cardio") return "Cardio";
  const tag = day?.tag;
  if (tag === "PUSH") return "Chest";
  if (tag === "PULL") return "Back";
  if (tag === "LEGS") return "Quads";
  // For custom/full-body days, fall back to whatever the day's own exercises lean toward.
  if (day?.exercises?.length) {
    const counts = {};
    for (const e of day.exercises) { const m = e.muscle || e.section; if (m) counts[m] = (counts[m] || 0) + 1; }
    const top = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
    if (top) return top[0];
  }
  return "Other";
}
// Merge the built-in library with the user's saved custom exercises (deduped, custom wins on name clash
// since it reflects what the user actually meant by that name going forward).


export function mergeLibrary(customExercises) {
  if (!customExercises || !customExercises.length) return EXERCISE_LIBRARY;
  const seen = new Set(customExercises.map((e) => e.name.trim().toLowerCase()));
  return [...customExercises, ...EXERCISE_LIBRARY.filter((e) => !seen.has(e.name.trim().toLowerCase()))];
}


export const EQUIPMENT_FILTERS = ["All", "Barbell", "Dumbbell", "Machine", "Cable", "Bodyweight", "Cardio"];


export const ex = (id, section, best, subs, setsLabel, repsLabel, rest, prefill) => ({
  id, section, best, subs, setsLabel, repsLabel, rest, prefill,
});


export const WORKOUT_DAYS = [
  {
    id: "push-a", tag: "PUSH", title: "Push A",
    subtitle: "Strength & Mass — Chest / Shoulders / Triceps",
    exercises: [
      ex("push-a-1", "Primary Chest Press", "Barbell Bench Press", ["Dumbbell Bench Press", "Machine Chest Press"], "4", "5–8", 150, 4),
      ex("push-a-2", "Secondary Chest", "Incline Dumbbell Press", ["Incline Machine Press", "Smith Incline Press"], "3–4", "8–12", 120, 4),
      ex("push-a-3", "Shoulder Press", "Seated Dumbbell Shoulder Press", ["Machine Shoulder Press", "Barbell Overhead Press"], "3", "6–10", 120, 3),
      ex("push-a-4", "Lateral Delts", "Cable Lateral Raise", ["Dumbbell Lateral Raise", "Machine Lateral Raise"], "3", "12–15", 75, 3),
      ex("push-a-5", "Triceps 1", "Rope Pushdown", ["Straight Bar Pushdown", "V-Bar Pushdown"], "3", "10–15", 75, 3),
      ex("push-a-6", "Triceps 2", "Overhead Cable Extension", ["Skull Crushers", "Dumbbell Overhead Extension"], "3", "10–12", 75, 3),
      ex("push-a-7", "Core", "Hanging Leg Raise", ["Cable Crunch", "Weighted Plank"], "3", "10–15", 60, 3),
    ],
  },
  {
    id: "pull-a", tag: "PULL", title: "Pull A",
    subtitle: "Back Thickness & Biceps",
    exercises: [
      ex("pull-a-1", "Primary Vertical Pull", "Weighted Pull-Ups", ["Lat Pulldown", "Assisted Pull-Ups"], "4", "5–8", 150, 4),
      ex("pull-a-2", "Primary Horizontal Pull", "T-Bar Row", ["Chest-Supported Row", "Seated Cable Row"], "3–4", "6–10", 150, 4),
      ex("pull-a-3", "Lat Isolation", "Straight-Arm Pulldown", ["Single-Arm Lat Pulldown", "Machine Pullover"], "3", "10–15", 75, 3),
      ex("pull-a-4", "Rear Delts", "Face Pulls", ["Reverse Pec Deck", "Rear Delt Cable Fly"], "3", "12–15", 75, 3),
      ex("pull-a-5", "Biceps 1", "Incline Dumbbell Curl", ["Drag Curl", "EZ-Bar Curl"], "3", "8–12", 75, 3),
      ex("pull-a-6", "Biceps 2", "Hammer Curl", ["Cross-Body DB Curl", "Rope Hammer Curl"], "3", "10–12", 75, 3),
      ex("pull-a-7", "Core", "Cable Crunch", ["Hanging Leg Raise", "Weighted Plank"], "3", "12–15", 60, 3),
    ],
  },
  {
    id: "legs-a", tag: "LEGS", title: "Legs A",
    subtitle: "Quad-Dominant",
    exercises: [
      ex("legs-a-1", "Primary Quad", "Back Squat", ["Leg Press", "Hack Squat"], "4", "6–10", 150, 4),
      ex("legs-a-2", "Quad Isolation", "Leg Extension", ["Sissy Squat", "Spanish Squat"], "3", "12–15", 75, 3),
      ex("legs-a-3", "Hamstring Isolation", "Lying Leg Curl", ["Seated Leg Curl", "Nordic Curl"], "3", "10–15", 75, 3),
      ex("legs-a-4", "Unilateral Quad / Glute", "Bulgarian Split Squat", ["Walking Lunges", "Step-Ups"], "3", "10–12/leg", 90, 3),
      ex("legs-a-5", "Calves", "Standing Calf Raise", ["Leg Press Calf Raise"], "4", "10–15", 60, 4),
      ex("legs-a-6", "Core", "Cable Crunch", ["Hanging Leg Raise", "Weighted Plank"], "3", "12–15", 60, 3),
    ],
  },
  {
    id: "push-b", tag: "PUSH", title: "Push B",
    subtitle: "Hypertrophy / Pump — Chest / Shoulders / Triceps",
    exercises: [
      ex("push-b-1", "Primary Upper Chest", "Incline Machine Press", ["Incline Dumbbell Press", "Smith Incline Press"], "4", "8–12", 120, 4),
      ex("push-b-2", "Secondary Chest", "Dumbbell Bench Press", ["Machine Chest Press", "Push-Ups (weighted)"], "3", "8–12", 120, 3),
      ex("push-b-3", "Chest Isolation", "Low-to-High Cable Fly", ["Pec Deck", "Dumbbell Fly"], "3", "12–15", 75, 3),
      ex("push-b-4", "Lateral Delts", "Dumbbell Lateral Raise", ["Cable Lateral Raise", "Machine Lateral Raise"], "3", "12–15", 75, 3),
      ex("push-b-5", "Shoulder Press", "Barbell Overhead Press", ["Machine Shoulder Press", "Seated Dumbbell Press"], "3", "8–12", 120, 3),
      ex("push-b-6", "Triceps", "Straight Bar Pushdown", ["Rope Pushdown", "V-Bar Pushdown"], "3", "10–15", 75, 3),
      ex("push-b-7", "Optional Finisher", "Cable Fly Partial Reps", ["Push-Up Burnout", "Machine Fly Partials"], "2", "15–25", 60, 2),
      ex("push-b-8", "Core", "Weighted Plank", ["Cable Crunch", "Hanging Leg Raise"], "3", "30–45s", 60, 3),
    ],
  },
  {
    id: "pull-b", tag: "PULL", title: "Pull B",
    subtitle: "Back Width & Rear Delts",
    exercises: [
      ex("pull-b-1", "Primary Vertical Pull", "Lat Pulldown (wide grip)", ["Weighted Pull-Ups", "Assisted Pull-Ups"], "4", "8–12", 120, 4),
      ex("pull-b-2", "Primary Horizontal Pull", "Seated Cable Row", ["T-Bar Row", "Chest-Supported Row"], "3–4", "8–12", 120, 4),
      ex("pull-b-3", "Lat Isolation", "Single-Arm Lat Pulldown", ["Straight-Arm Pulldown", "Machine Pullover"], "3", "10–15", 75, 3),
      ex("pull-b-4", "Rear Delts", "Reverse Pec Deck", ["Face Pulls", "Rear Delt Cable Fly"], "3", "12–15", 75, 3),
      ex("pull-b-5", "Biceps 1", "Drag Curl", ["EZ-Bar Curl", "Incline Dumbbell Curl"], "3", "8–12", 75, 3),
      ex("pull-b-6", "Biceps 2", "Rope Hammer Curl", ["Cross-Body DB Curl", "Hammer Curl"], "3", "10–12", 75, 3),
      ex("pull-b-7", "Core", "Cable Crunch", ["Hanging Leg Raise", "Weighted Plank"], "3", "12–15", 60, 3),
    ],
  },
  {
    id: "legs-b", tag: "LEGS", title: "Legs B",
    subtitle: "Hamstring / Glute-Dominant",
    exercises: [
      ex("legs-b-1", "Primary Hip Hinge", "Romanian Deadlift", ["Dumbbell RDL", "Hip Thrust"], "4", "6–10", 150, 4),
      ex("legs-b-2", "Glutes", "Hip Thrust", ["Dumbbell RDL", "Walking Lunges"], "3–4", "8–12", 120, 4),
      ex("legs-b-3", "Hamstring Isolation", "Seated Leg Curl", ["Lying Leg Curl", "Nordic Curl"], "3", "10–15", 75, 3),
      ex("legs-b-4", "Quad Balance", "Leg Press (high foot placement)", ["Hack Squat", "Back Squat"], "3", "10–15", 90, 3),
      ex("legs-b-5", "Calves", "Seated Calf Raise", ["Standing Calf Raise", "Leg Press Calf Raise"], "4", "10–15", 60, 4),
      ex("legs-b-6", "Core", "Hanging Leg Raise", ["Cable Crunch", "Weighted Plank"], "3", "10–15", 60, 3),
    ],
  },
];

