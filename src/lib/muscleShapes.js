import { C } from "./constants";

export function muscleBelly(cx, topY, botY, topW, botW, bulge = 0.35) {
  const midY = (topY + botY) / 2;
  const midW = Math.max(topW, botW) * (1 + bulge);
  return `M${cx - topW},${topY}
    C${cx - topW},${topY + (midY - topY) * 0.5} ${cx - midW},${midY - (midY - topY) * 0.6} ${cx - midW},${midY}
    C${cx - midW},${midY + (botY - midY) * 0.6} ${cx - botW},${botY - (botY - midY) * 0.5} ${cx - botW},${botY}
    Q${cx},${botY + Math.min(10, botW * 0.4)} ${cx + botW},${botY}
    C${cx + botW},${botY - (botY - midY) * 0.5} ${cx + midW},${midY + (botY - midY) * 0.6} ${cx + midW},${midY}
    C${cx + midW},${midY - (midY - topY) * 0.6} ${cx + topW},${topY + (midY - topY) * 0.5} ${cx + topW},${topY}
    Q${cx},${topY - Math.min(10, topW * 0.4)} ${cx - topW},${topY} Z`;
}
// Same idea as muscleBelly, but the CENTERLINE also leans from cxTop to cxBot — needed
// for arms, whose true centerline drifts inward toward the wrist. A fixed-center shape
// drifts off the real limb path and leaves bare silhouette exposed on one edge; this
// doesn't. Widths/positions below are taken directly from the silhouette's own geometry
// (sampled numerically), not estimated.


export function muscleBellyLean(cxTop, cxBot, topY, botY, topW, botW, bulge = 0.35) {
  const midY = (topY + botY) / 2;
  const cxMid = (cxTop + cxBot) / 2;
  const midW = Math.max(topW, botW) * (1 + bulge);
  return `M${cxTop - topW},${topY}
    C${cxTop - topW},${topY + (midY - topY) * 0.5} ${cxMid - midW},${midY - (midY - topY) * 0.6} ${cxMid - midW},${midY}
    C${cxMid - midW},${midY + (botY - midY) * 0.6} ${cxBot - botW},${botY - (botY - midY) * 0.5} ${cxBot - botW},${botY}
    Q${cxBot},${botY + Math.min(10, botW * 0.4)} ${cxBot + botW},${botY}
    C${cxBot + botW},${botY - (botY - midY) * 0.5} ${cxMid + midW},${midY + (botY - midY) * 0.6} ${cxMid + midW},${midY}
    C${cxMid + midW},${midY - (midY - topY) * 0.6} ${cxTop + topW},${topY + (midY - topY) * 0.5} ${cxTop + topW},${topY}
    Q${cxTop},${topY - Math.min(10, topW * 0.4)} ${cxTop - topW},${topY} Z`;
}


export const FRONT_SHAPES = [
  // Traps — split into left/right halves along the spine centerline
  { id: "leftUpperTrap", region: "Traps", type: "path", d: "M100,58 L76,90 L88,138 L100,148 Z" },
  { id: "rightUpperTrap", region: "Traps", type: "path", d: "M100,58 L124,90 L112,138 L100,148 Z" },
  // Deltoids — leans from a narrow point near the neck down to the true armpit width
  { id: "leftFrontDeltoid", region: "Shoulders", type: "path", d: muscleBellyLean(70, 59, 62, 98, 9, 13, 0.05) },
  { id: "rightFrontDeltoid", region: "Shoulders", type: "path", d: muscleBellyLean(130, 141, 62, 98, 9, 13, 0.05) },
  // Pecs — two bold lobes meeting at the sternum
  { id: "leftChest", region: "Chest", type: "path", d: "M100,78 C86,68 72,72 67,86 C63,98 68,112 82,117 C93,120 100,112 100,98 Z" },
  { id: "rightChest", region: "Chest", type: "path", d: "M100,78 C114,68 128,72 133,86 C137,98 132,112 118,117 C107,120 100,112 100,98 Z" },
  // Biceps — upper arm only; leans inward toward the elbow matching the arm's true drift
  { id: "leftBiceps", region: "Biceps", type: "path", d: muscleBellyLean(59, 50, 98, 155, 11, 9, 0) },
  { id: "rightBiceps", region: "Biceps", type: "path", d: muscleBellyLean(141, 150, 98, 155, 11, 9, 0) },
  // Forearms — elbow to wrist, same centerline drift continued
  { id: "leftForearm", region: "Biceps", type: "path", d: muscleBellyLean(50, 48, 155, 195, 9, 7, 0) },
  { id: "rightForearm", region: "Biceps", type: "path", d: muscleBellyLean(150, 152, 155, 195, 9, 7, 0) },
  // Abs — three segments (upper / middle / lower), each one connected mass, not six blocks
  { id: "upperAbs", region: "Core", type: "rect", x: 83, y: 120, w: 34, h: 15, rx: 6 },
  { id: "middleAbs", region: "Core", type: "rect", x: 83, y: 137, w: 34, h: 15, rx: 6 },
  { id: "lowerAbs", region: "Core", type: "rect", x: 83, y: 154, w: 34, h: 15, rx: 6 },
  // Obliques — flank the ab column, within the torso's true side boundary
  { id: "leftOblique", region: "Core", type: "path", d: "M82,120 C76,120 72,132 72,146 C72,158 76,168 82,172 L82,120 Z" },
  { id: "rightOblique", region: "Core", type: "path", d: "M118,120 C124,120 128,132 128,146 C128,158 124,168 118,172 L118,120 Z" },
  // Hip flexors — small wedge at the groin crease, above the quads
  { id: "leftHipFlexor", region: "Quads", type: "path", d: "M82,175 C76,178 71,186 71,196 L88,198 C88,189 86,180 82,175 Z" },
  { id: "rightHipFlexor", region: "Quads", type: "path", d: "M118,175 C124,178 129,186 129,196 L112,198 C112,189 114,180 118,175 Z" },
  { id: "leftQuadriceps", region: "Quads", type: "path", d: muscleBelly(78, 200, 270, 16, 13, 0.05) },
  { id: "rightQuadriceps", region: "Quads", type: "path", d: muscleBelly(122, 200, 270, 16, 13, 0.05) },
  { id: "leftCalf", region: "Calves", type: "path", d: muscleBelly(78, 278, 328, 11.5, 7, 0.05) },
  { id: "rightCalf", region: "Calves", type: "path", d: muscleBelly(122, 278, 328, 11.5, 7, 0.05) },
];


export const BACK_SHAPES = [
  // Upper traps — split left/right along the spine
  { id: "leftUpperTrapBack", region: "Traps", type: "path", d: "M100,58 L76,90 L88,138 L100,148 Z" },
  { id: "rightUpperTrapBack", region: "Traps", type: "path", d: "M100,58 L124,90 L112,138 L100,148 Z" },
  // Rear delts — same lean-corrected arm geometry as the front view (same silhouette)
  { id: "leftRearDeltoid", region: "Shoulders", type: "path", d: muscleBellyLean(70, 59, 62, 98, 9, 13, 0.05) },
  { id: "rightRearDeltoid", region: "Shoulders", type: "path", d: muscleBellyLean(130, 141, 62, 98, 9, 13, 0.05) },
  // Upper back / rhomboids — sits flush against the traps, within the true torso width
  { id: "leftUpperBack", region: "UpperBack", type: "path", d: "M76,92 C72,103 72,118 76,129 C79,136 85,139 91,136 L88,94 C85,91 80,90 76,92 Z" },
  { id: "rightUpperBack", region: "UpperBack", type: "path", d: "M124,92 C128,103 128,118 124,129 C121,136 115,139 109,136 L112,94 C115,91 120,90 124,92 Z" },
  // Lats — wing flare tracking the torso's real boundary, narrower now that lower back is separate
  { id: "leftLat", region: "Lats", type: "path", d: "M75,106 C67,120 65,138 68,153 C71,161 78,163 84,158 L85,110 C82,106 78,104 75,106 Z" },
  { id: "rightLat", region: "Lats", type: "path", d: "M125,106 C133,120 135,138 132,153 C129,161 122,163 116,158 L115,110 C118,106 122,104 125,106 Z" },
  // Lower back / erector spinae — the strip below the lats, above the glutes
  { id: "lowerBack", region: "LowerBack", type: "path", d: "M87,158 C83,162 80,168 80,175 L120,175 C120,168 117,162 113,158 Z" },
  // Triceps — upper arm; forearms are separate below
  { id: "leftTriceps", region: "Triceps", type: "path", d: muscleBellyLean(59, 50, 98, 155, 11, 9, 0) },
  { id: "rightTriceps", region: "Triceps", type: "path", d: muscleBellyLean(141, 150, 98, 155, 11, 9, 0) },
  { id: "leftForearmBack", region: "Triceps", type: "path", d: muscleBellyLean(50, 48, 155, 195, 9, 7, 0) },
  { id: "rightForearmBack", region: "Triceps", type: "path", d: muscleBellyLean(150, 152, 155, 195, 9, 7, 0) },
  // Glutes — split left/right along the centerline
  { id: "leftGlute", region: "Glutes", type: "path", d: "M100,163 Q67,172 67,192 Q67,206 100,211 Z" },
  { id: "rightGlute", region: "Glutes", type: "path", d: "M100,163 Q133,172 133,192 Q133,206 100,211 Z" },
  { id: "leftHamstring", region: "Hamstrings", type: "path", d: muscleBelly(78, 213, 270, 16, 13, 0.05) },
  { id: "rightHamstring", region: "Hamstrings", type: "path", d: muscleBelly(122, 213, 270, 16, 13, 0.05) },
  { id: "leftCalfBack", region: "Calves", type: "path", d: muscleBelly(78, 278, 328, 11.5, 7, 0.05) },
  { id: "rightCalfBack", region: "Calves", type: "path", d: muscleBelly(122, 278, 328, 11.5, 7, 0.05) },
];
// Static outline — head, neck, torso, arms, legs, hands, feet — drawn once, never recolored.
// Single continuous silhouette — head, neck, shoulders, arms, hands, torso, legs, feet
// traced as ONE closed path so there are no overlapping edges or double lines. Muscle
// shapes are layered inside it. Drawn once and never recolored.


export const SILHOUETTE_PATH = `M100,6
  C110,6 118,15 118,26 C118,35 113,43 107,47 L107,57
  C123,59 138,65 146,76 C152,85 155,98 157,112
  C159,130 161,152 162,172 C162,184 161,192 160,198
  C160,205 157,209 152,209 C147,209 144,205 144,198
  C143,190 142,178 141,166 C139,146 136,126 132,110
  C130,101 127,93 124,88
  C127,104 129,124 129,142 C129,153 128,163 127,171
  C133,177 137,187 137,199 C138,215 138,243 136,269
  C134,291 132,311 131,323 C131,331 128,336 122,336
  C116,336 113,331 113,323 C112,305 110,283 108,263
  C106,241 104,219 102,203 L100,199 L98,203
  C96,219 94,241 92,263 C90,283 88,305 87,323
  C87,331 84,336 78,336 C72,336 69,331 69,323
  C68,311 66,291 64,269 C62,243 62,215 63,199
  C63,187 67,177 73,171 C72,163 71,153 71,142
  C71,124 73,104 76,88
  C73,93 70,101 68,110 C64,126 61,146 59,166
  C58,178 57,190 56,198 C56,205 53,209 48,209
  C43,209 40,205 40,198 C39,192 38,184 38,172
  C39,152 41,130 43,112 C45,98 48,85 54,76
  C62,65 77,59 93,57 L93,47
  C87,43 82,35 82,26 C82,15 90,6 100,6 Z`;

