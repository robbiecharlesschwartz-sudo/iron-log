import { normalizeLiftName } from "./muscleMapping";

/* How much history the spreadsheet covers.
 *
 * `days: null` means no lower bound — everything the app still holds. Note that
 * sessions are pruned at RETENTION_DAYS (365), so "All time" and "Last year" are the
 * same export for most people; both are offered because they stop being the same the
 * moment that retention changes, and because "all time" is the thing people look for.
 */
export const EXPORT_RANGES = [
  { id: "30d", label: "Last 30 days", days: 30 },
  { id: "3m", label: "Last 3 months", days: 91 },
  { id: "6m", label: "Last 6 months", days: 182 },
  { id: "1y", label: "Last year", days: 365 },
  { id: "all", label: "All time", days: null },
  { id: "custom", label: "Choose dates", days: null, custom: true },
];

/* Local midnight at either end of a "YYYY-MM-DD" from a date input.
 *
 * Deliberately not `new Date("2026-10-01")`: that parses as UTC midnight, so for
 * anyone west of Greenwich it lands on the previous evening and silently drops a day
 * off the front of the range. Splitting the parts and feeding them to the Date
 * constructor keeps it in the reader's own calendar, which is the one the date picker
 * showed them.
 */
export function startOfLocalDay(ymd) {
  if (!ymd) return null;
  const [y, m, d] = ymd.split("-").map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d, 0, 0, 0, 0).getTime();
}

export function endOfLocalDay(ymd) {
  if (!ymd) return null;
  const [y, m, d] = ymd.split("-").map(Number);
  if (!y || !m || !d) return null;
  // The "to" date is inclusive: picking the 9th should include the 9th's sessions.
  return new Date(y, m - 1, d, 23, 59, 59, 999).getTime();
}

/** The [from, to] bounds a range selection resolves to. Either may be null = open. */
function rangeBounds(range) {
  if (!range || range.id === "30d") return { from: Date.now() - 30 * 86400000, to: null };
  if (range.id === "custom") {
    return { from: startOfLocalDay(range.from), to: endOfLocalDay(range.to) };
  }
  const spec = EXPORT_RANGES.find((r) => r.id === range.id);
  return { from: spec && spec.days ? Date.now() - spec.days * 86400000 : null, to: null };
}

/** The sessions an export would contain, oldest first. Used by the picker to show a count. */
export function sessionsInRange(sessions, range) {
  const { from, to } = rangeBounds(range);
  return (sessions || [])
    .filter((s) => {
      const t = new Date(s.date).getTime();
      if (isNaN(t)) return false;
      if (from !== null && t < from) return false;
      if (to !== null && t > to) return false;
      return true;
    })
    .sort((a, b) => new Date(a.date) - new Date(b.date));
}

/** What the chosen range is called, for the sheet header and the file name. */
export function rangeLabel(range) {
  if (!range) return "Last 30 days";
  if (range.id === "custom") {
    const fmt = (ymd) => { const t = startOfLocalDay(ymd); return t ? new Date(t).toLocaleDateString() : "?"; };
    return `${fmt(range.from)} to ${fmt(range.to)}`;
  }
  return (EXPORT_RANGES.find((r) => r.id === range.id) || EXPORT_RANGES[0]).label;
}

export async function exportToExcel(sessions, profileName, range = null) {
  const XLSX = await import("xlsx");
  const recent = sessionsInRange(sessions, range);
  const label = rangeLabel(range);

  const wb = XLSX.utils.book_new();

  // Sheet 1 — Session Log (one row per set)
  const logRows = [[`Session log — ${label}`], [], ["Date", "Workout", "Exercise", "Set", "Weight (lb)", "Reps", "Volume (lb)", "Est. 1RM", "Notes"]];
  for (const s of recent) {
    const dateStr = new Date(s.date).toLocaleDateString();
    for (const ex of s.exercises) {
      ex.sets.forEach((set, i) => {
        const e1rm = set.weight && set.reps ? Math.round(set.weight * (1 + set.reps / 30)) : "";
        // `set.weight || ""` blanked a legitimate zero, so a bodyweight set — dips,
        // pull-ups, press-ups — came out of the spreadsheet looking unrecorded. The app
        // stores and shows 0 for these; the export now agrees with it. Est. 1RM stays
        // blank, because Epley on a zero load is a meaningless number, not a light one.
        const weight = Number(set.weight) || 0;
        logRows.push([dateStr, s.dayTitle, ex.selectedLift, i + 1, weight, set.reps || "", weight * (Number(set.reps) || 0), e1rm, ex.notes || ""]);
      });
    }
  }
  const ws1 = XLSX.utils.aoa_to_sheet(logRows);
  ws1["!cols"] = [{ wch: 12 }, { wch: 16 }, { wch: 24 }, { wch: 5 }, { wch: 11 }, { wch: 6 }, { wch: 11 }, { wch: 9 }, { wch: 30 }];
  XLSX.utils.book_append_sheet(wb, ws1, "Session Log");

  // Sheet 2 — Daily Summary
  const sumRows = [[`Daily summary — ${label}`], [], ["Date", "Workout", "Total Volume (lb)", "Sets", "Duration (min)"]];
  for (const s of recent) {
    const sets = s.exercises.reduce((a, e) => a + e.sets.length, 0);
    sumRows.push([new Date(s.date).toLocaleDateString(), s.dayTitle, s.volume || 0, sets, Math.round((s.totalElapsedSeconds || 0) / 60)]);
  }
  const ws2 = XLSX.utils.aoa_to_sheet(sumRows);
  ws2["!cols"] = [{ wch: 12 }, { wch: 18 }, { wch: 18 }, { wch: 6 }, { wch: 14 }];
  XLSX.utils.book_append_sheet(wb, ws2, "Daily Summary");

  // Sheet 3 — Personal Bests
  const pbMap = {};
  for (const s of recent) for (const ex of s.exercises) for (const set of ex.sets) {
    const key = normalizeLiftName(ex.selectedLift);
    const e1rm = set.weight && set.reps ? set.weight * (1 + set.reps / 30) : 0;
    if (!pbMap[key] || e1rm > pbMap[key].e1rm) pbMap[key] = { lift: ex.selectedLift, weight: set.weight, reps: set.reps, e1rm, date: new Date(s.date).toLocaleDateString() };
  }
  const pbRows = [[`Personal bests — ${label}`], [], ["Exercise", "Best Weight (lb)", "Reps", "Est. 1RM (lb)", "Date"]];
  Object.values(pbMap).sort((a, b) => b.e1rm - a.e1rm).forEach(pb => pbRows.push([pb.lift, pb.weight, pb.reps, Math.round(pb.e1rm), pb.date]));
  const ws3 = XLSX.utils.aoa_to_sheet(pbRows);
  ws3["!cols"] = [{ wch: 24 }, { wch: 16 }, { wch: 6 }, { wch: 14 }, { wch: 12 }];
  XLSX.utils.book_append_sheet(wb, ws3, "Personal Bests");

  const name = (profileName || "User").replace(/\s+/g, "_");
  // Without the range in the name, exporting 30 days and then a year writes the same
  // file name twice and the second lands in Downloads as "(1)".
  const slug = label.replace(/[^A-Za-z0-9]+/g, "-").replace(/^-|-$/g, "");
  XLSX.writeFile(wb, `IronLog_${name}_${slug}_${new Date().toISOString().slice(0, 10)}.xlsx`);
}

/* ====================================================================== */
/* WORKOUT TEMPLATES                                                       */
/* ====================================================================== */

