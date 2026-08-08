import { User } from "lucide-react";
import { ex } from "./exerciseLibrary";
import { normalizeLiftName } from "./muscleMapping";

export async function exportToExcel(sessions, profileName) {
  const XLSX = await import("xlsx");
  const cutoff = Date.now() - 30 * 86400000;
  const recent = sessions.filter(s => new Date(s.date).getTime() >= cutoff).sort((a, b) => new Date(a.date) - new Date(b.date));

  const wb = XLSX.utils.book_new();

  // Sheet 1 — Session Log (one row per set)
  const logRows = [["Date", "Workout", "Exercise", "Set", "Weight (lb)", "Reps", "Volume (lb)", "Est. 1RM", "Notes"]];
  for (const s of recent) {
    const dateStr = new Date(s.date).toLocaleDateString();
    for (const ex of s.exercises) {
      ex.sets.forEach((set, i) => {
        const e1rm = set.weight && set.reps ? Math.round(set.weight * (1 + set.reps / 30)) : "";
        logRows.push([dateStr, s.dayTitle, ex.selectedLift, i + 1, set.weight || "", set.reps || "", (set.weight || 0) * (set.reps || 0), e1rm, ex.notes || ""]);
      });
    }
  }
  const ws1 = XLSX.utils.aoa_to_sheet(logRows);
  ws1["!cols"] = [{ wch: 12 }, { wch: 16 }, { wch: 24 }, { wch: 5 }, { wch: 11 }, { wch: 6 }, { wch: 11 }, { wch: 9 }, { wch: 30 }];
  XLSX.utils.book_append_sheet(wb, ws1, "Session Log");

  // Sheet 2 — Daily Summary
  const sumRows = [["Date", "Workout", "Total Volume (lb)", "Sets", "Duration (min)"]];
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
  const pbRows = [["Exercise", "Best Weight (lb)", "Reps", "Est. 1RM (lb)", "Date"]];
  Object.values(pbMap).sort((a, b) => b.e1rm - a.e1rm).forEach(pb => pbRows.push([pb.lift, pb.weight, pb.reps, Math.round(pb.e1rm), pb.date]));
  const ws3 = XLSX.utils.aoa_to_sheet(pbRows);
  ws3["!cols"] = [{ wch: 24 }, { wch: 16 }, { wch: 6 }, { wch: 14 }, { wch: 12 }];
  XLSX.utils.book_append_sheet(wb, ws3, "Personal Bests");

  const name = (profileName || "User").replace(/\s+/g, "_");
  XLSX.writeFile(wb, `IronLog_${name}_${new Date().toISOString().slice(0, 10)}.xlsx`);
}

/* ====================================================================== */
/* WORKOUT TEMPLATES                                                       */
/* ====================================================================== */

