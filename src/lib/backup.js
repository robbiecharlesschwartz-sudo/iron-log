/* Full-fidelity JSON backup.

   The Excel export is a readable report of the last 30 days — useful, but lossy and not
   restorable. This is the other half: everything the app owns, in the shape it stores it,
   so a browser profile wiped, a Firebase mishap, or a move between origins (localStorage
   is per-origin, so switching hosts does NOT carry guest data) is recoverable. */

export const BACKUP_FORMAT = "iron-log-backup";
export const BACKUP_VERSION = 1;

export function buildBackup(state) {
  return {
    format: BACKUP_FORMAT,
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    account: state.userEmail || null, // provenance only; never used to gate a restore
    data: {
      sessions: state.sessions || [],
      customDays: state.customDays || [],
      dayAdds: state.dayAdds || {},
      customExercises: state.customExercises || [],
      sideDays: state.sideDays || [],
      landmarkOverrides: state.landmarkOverrides || {},
      dismissedInsights: state.dismissedInsights || [],
      profile: state.profile || {},
    },
  };
}

export function downloadBackup(state) {
  const backup = buildBackup(state);
  const name = (state.profileName || "IronLog").replace(/[^A-Za-z0-9]/g, "") || "IronLog";
  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `IronLog_Backup_${name}_${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
  return backup;
}

/* Parse and validate. Throws with a human-readable reason rather than returning a
   half-understood object — a restore writes over training history, so anything we are
   not certain about must stop before it touches state. */
export function parseBackup(text) {
  let parsed;
  try { parsed = JSON.parse(text); }
  catch { throw new Error("That file isn't valid JSON."); }

  if (!parsed || typeof parsed !== "object") throw new Error("That file isn't an Iron Log backup.");
  if (parsed.format !== BACKUP_FORMAT) throw new Error("That file isn't an Iron Log backup.");
  if (typeof parsed.version !== "number" || parsed.version > BACKUP_VERSION) {
    throw new Error(`That backup was made by a newer version of Iron Log (v${parsed.version}).`);
  }

  const d = parsed.data;
  if (!d || typeof d !== "object") throw new Error("That backup has no data in it.");
  if (!Array.isArray(d.sessions)) throw new Error("That backup is missing its session history.");

  for (const s of d.sessions) {
    if (!s || typeof s.id !== "string" || !Array.isArray(s.exercises)) {
      throw new Error("That backup contains a malformed session and wasn't restored.");
    }
  }

  return parsed;
}

/* Sessions MERGE rather than replace — restoring an older backup must never delete
   workouts logged since it was taken. Newest wins per id, matching the cloud-sync rule.
   Settings collections are replaced wholesale, since they're small and a partial merge
   of e.g. custom days produces duplicates rather than a coherent plan. */
export function mergeBackup(current, backup) {
  const d = backup.data;
  const byId = new Map();
  for (const s of current.sessions || []) byId.set(s.id, s);
  for (const s of d.sessions) {
    const existing = byId.get(s.id);
    if (!existing || (s.lastUpdatedAt || 0) >= (existing.lastUpdatedAt || 0)) byId.set(s.id, s);
  }
  const sessions = [...byId.values()].sort((a, b) => new Date(b.date) - new Date(a.date));

  return {
    sessions,
    addedSessions: sessions.length - (current.sessions || []).length,
    customDays: Array.isArray(d.customDays) ? d.customDays : (current.customDays || []),
    dayAdds: d.dayAdds && typeof d.dayAdds === "object" ? d.dayAdds : (current.dayAdds || {}),
    customExercises: Array.isArray(d.customExercises) ? d.customExercises : (current.customExercises || []),
    sideDays: Array.isArray(d.sideDays) ? d.sideDays : (current.sideDays || []),
    landmarkOverrides: d.landmarkOverrides && typeof d.landmarkOverrides === "object" ? d.landmarkOverrides : (current.landmarkOverrides || {}),
    dismissedInsights: Array.isArray(d.dismissedInsights) ? d.dismissedInsights : (current.dismissedInsights || []),
    profile: d.profile && typeof d.profile === "object" ? d.profile : (current.profile || {}),
  };
}
