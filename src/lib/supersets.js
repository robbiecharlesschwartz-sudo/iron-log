/* Supersets — the round-robin rules, with no React in them.
 *
 * Lifted out of WorkoutScreen because these are pure functions over an exercise list
 * and because this is where the rest-timer bug lived: rest was suppressed for a whole
 * superset group instead of only on a handoff between its partners, so a superset
 * never rested at all. Out here the rule can be tested directly.
 */

/* ---------------------------------------------------------------------- */
/* Supersets: consecutive exercises are grouped when linkedToNext=true on */
/* each member but the last. Within a group, sets alternate round by      */
/* round (A1, B1, A2, B2…) instead of finishing one exercise before the   */
/* next. Rest is only inserted once a full round through the group        */
/* completes — not between the group's own members.                      */
/* ---------------------------------------------------------------------- */
export function computeSupersetGroups(exercises) {
  const groups = [];
  let i = 0;
  while (i < exercises.length) {
    const group = [exercises[i]];
    while (exercises[i]?.linkedToNext && i + 1 < exercises.length) {
      i++;
      group.push(exercises[i]);
    }
    groups.push(group);
    i++;
  }
  return groups;
}
export function supersetGroupOf(exercises, exId) {
  return computeSupersetGroups(exercises).find((g) => g.some((e) => e.exId === exId)) || null;
}
// Rest between rounds uses the last exercise in the group's configured rest.
export function groupRestValue(group) { return group && group.length ? group[group.length - 1].rest : 0; }
// True only when the set just finished hands off to a *partner* exercise within the
// same round — the one case rest is skipped. Moving on to the next round (or back to
// a set in the same exercise, which is what happens when you jump around with the
// row Play buttons) completes the round and earns a rest like any other set.
export function handsOffWithinRound(group, target, afterTarget) {
  if (!group || group.length < 2 || !afterTarget) return false;
  return afterTarget.exId !== target.exId
    && afterTarget.setIdx === target.setIdx
    && group.some((e) => e.exId === afterTarget.exId);
}

/* ---------------------------------------------------------------------- */
/* Helper: find the next uncompleted set, interleaving supersets           */
/*                                                                        */
/* Starting a set parks focus on whatever the user picked, and focus wins  */
/* until that work is finished — so tapping Play on an exercise further    */
/* down the workout runs THAT exercise to completion instead of snapping   */
/* back to the earliest unfinished one. Focus is held on the whole         */
/* superset group, not a lone exercise, so jumping into one half of a pair */
/* still alternates with its partner the way a superset is meant to run.   */
/* Once the focused group is done, focus expires on its own and the plain  */
/* top-to-bottom order resumes.                                           */
/* ---------------------------------------------------------------------- */
export function firstUndoneIn(group) {
  if (group.length === 1) {
    const e = group[0];
    const i = e.sets.findIndex((s) => !s.done);
    return i === -1 ? null : { exId: e.exId, setIdx: i };
  }
  const maxRounds = Math.max(...group.map((e) => e.sets.length));
  for (let r = 0; r < maxRounds; r++) {
    for (const e of group) {
      if (e.sets[r] && !e.sets[r].done) return { exId: e.exId, setIdx: r };
    }
  }
  return null;
}
export function nextUndone(exercises, focusId = null) {
  const groups = computeSupersetGroups(exercises);
  if (focusId) {
    const focused = groups.find((g) => g.some((e) => e.exId === focusId));
    const hit = focused && firstUndoneIn(focused);
    if (hit) return hit;
  }
  for (const group of groups) {
    const hit = firstUndoneIn(group);
    if (hit) return hit;
  }
  return null; // all sets complete
}
