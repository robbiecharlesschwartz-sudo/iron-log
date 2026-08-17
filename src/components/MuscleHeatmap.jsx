import { useMemo, useState } from "react";
import { X } from "lucide-react";
import { C } from "../lib/constants";
import { BROAD_GROUP_LANDMARKS, HEATMAP_DISPLAY_NAME, HEATMAP_REGIONS, HEATMAP_STATUS_COLOR, HEATMAP_STATUS_LABEL, HEATMAP_STATUS_SHORT, recoveryFilter } from "../lib/heatmapData";
import { BACK_SHAPES, FRONT_SHAPES, SILHOUETTE_PATH } from "../lib/muscleShapes";

export function MusclePath({ shape, region, data, selected, onSelect }) {
  const d = data[region];
  const fill = HEATMAP_STATUS_COLOR[d ? d.status : "gray"];
  const filter = d ? recoveryFilter(d.daysAgo, d.status) : "none";
  const common = {
    id: shape.id,
    fill, filter,
    style: { transition: "fill 250ms ease, filter 250ms ease, opacity 250ms ease, stroke 150ms ease", cursor: "pointer" },
    stroke: selected === region ? "#fff" : "rgba(255,255,255,0.35)",
    strokeWidth: selected === region ? 2 : 1,
    strokeLinejoin: "round",
    opacity: selected && selected !== region ? 0.5 : 1,
    onClick: () => onSelect(region),
  };
  if (shape.type === "rect") return <rect x={shape.x} y={shape.y} width={shape.w} height={shape.h} rx={shape.rx ?? 10} {...common} />;
  return <path d={shape.d} {...common} />;
}

// Smooth, symmetric muscle-belly shape: tapers from a top width to a bottom width with
// a bulge in the middle (like a bicep, calf, or quad in profile) — replaces plain rects
// with an actual muscle silhouette. All curves, no straight edges or sharp corners.


export function BodyOutline() {
  return <path d={SILHOUETTE_PATH} fill="#1E2027" stroke="rgba(255,255,255,0.5)" strokeWidth="1.6" strokeLinejoin="round" />;
}


export function MuscleHeatmap({ data, rangeDays, weeks }) {
  const [selected, setSelected] = useState(null);
  const totalSets = HEATMAP_REGIONS.reduce((a, r) => a + (data[r]?.sets || 0), 0);
  const hasAnyData = totalSets > 0;
  const sel = selected ? data[selected] : null;

  // Training Distribution — broad groups the user actually thinks in (Chest/Back/Legs/Shoulders/Arms/Core).
  // Each shows "Effective Sets (This Period)" against its combined weekly-recommended range,
  // with the bar/number colored by the worst (highest-tier) status among its sub-regions.
  const distGroups = useMemo(() => {
    const worstStatus = (regions) => {
      const order = { red: 3, yellow: 2, green: 1, gray: 0 };
      let best = "gray";
      for (const r of regions) { const s = data[r]?.status || "gray"; if (order[s] > order[best]) best = s; }
      return best;
    };
    const w = Math.max(1, weeks || 1);
    const groupOf = (label, regions) => {
      const periodSets = regions.reduce((a, r) => a + (data[r]?.sets || 0), 0);
      const lm = BROAD_GROUP_LANDMARKS[label] || [0, 0, 0];
      return { label, regions, periodSets, min: Math.round(lm[0] * w), max: Math.round(lm[2] * w), status: worstStatus(regions) };
    };
    return [
      groupOf("Chest", ["Chest"]),
      groupOf("Back", ["UpperBack", "Lats", "Traps", "LowerBack"]),
      groupOf("Legs", ["Quads", "Hamstrings", "Glutes", "Calves"]),
      groupOf("Shoulders", ["Shoulders"]),
      groupOf("Arms", ["Biceps", "Triceps"]),
      groupOf("Core", ["Core"]),
    ];
  }, [data, weeks]);

  return (
    <div className="px-5 pt-2">
      <div className="rounded-3xl p-4 mb-4" style={{ backgroundColor: "#15171C" }}>
        {!hasAnyData && (
          <div className="text-center py-3 mb-2 text-[12px]" style={{ color: "rgba(255,255,255,0.45)" }}>
            No sets logged in this range yet — the map will light up once you start training.
          </div>
        )}
        <div className="flex items-center justify-center gap-6">
          <div className="flex-1 max-w-[170px]">
            <svg viewBox="0 0 200 340" className="w-full">
              <BodyOutline />
              {FRONT_SHAPES.map((sh, i) => <MusclePath key={sh.id || i} shape={sh} region={sh.region} data={data} selected={selected} onSelect={setSelected} />)}
            </svg>
            <div className="text-center text-[10.5px] font-semibold mt-1" style={{ color: "rgba(255,255,255,0.4)" }}>Front</div>
          </div>
          <div className="flex-1 max-w-[170px]">
            <svg viewBox="0 0 200 340" className="w-full">
              <BodyOutline />
              {BACK_SHAPES.map((sh, i) => <MusclePath key={sh.id || i} shape={sh} region={sh.region} data={data} selected={selected} onSelect={setSelected} />)}
            </svg>
            <div className="text-center text-[10.5px] font-semibold mt-1" style={{ color: "rgba(255,255,255,0.4)" }}>Back</div>
          </div>
        </div>

        <div className="flex items-center justify-center gap-4 mt-3 flex-wrap">
          {["red", "yellow", "green", "gray"].map((k) => (
            <div key={k} className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: HEATMAP_STATUS_COLOR[k] }} />
              <span className="text-[10.5px] font-semibold" style={{ color: "rgba(255,255,255,0.7)" }}>
                {k === "red" ? "MRV+" : k === "yellow" ? "MAV" : k === "green" ? "MEV" : "Untargeted"}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Detail panel — appears when a region is tapped */}
      {sel && (
        <div className="rounded-2xl p-4 mb-4" style={{ backgroundColor: C.bg, border: `1px solid ${C.border}` }}>
          <div className="flex items-center justify-between mb-3.5">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: HEATMAP_STATUS_COLOR[sel.status] }} />
              <span className="text-[17px] font-bold tracking-tight" style={{ color: C.ink }}>{HEATMAP_DISPLAY_NAME[sel.region]}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold px-2 py-1 rounded-lg" style={{ backgroundColor: HEATMAP_STATUS_COLOR[sel.status], color: sel.status === "yellow" || sel.status === "green" ? "#0A0B0D" : "#fff" }}>
                {HEATMAP_STATUS_SHORT[sel.status]}
              </span>
              <button onClick={() => setSelected(null)} className="p-1" aria-label="Close"><X size={16} style={{ color: C.ink4 }} /></button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 mb-3.5">
            <div>
              <div className="text-[26px] font-bold tabular-nums leading-none" style={{ color: C.ink }}>{Math.round(sel.sets)}<span className="text-[13px] font-semibold ml-1" style={{ color: C.ink3 }}>Sets</span></div>
              <div className="text-[10.5px] uppercase tracking-wide font-semibold mt-1" style={{ color: C.ink3 }}>Effective Sets</div>
            </div>
            <div>
              <div className="text-[20px] font-bold tabular-nums leading-none" style={{ color: C.ink }}>{sel.landmarks ? `${sel.landmarks[0]}–${sel.landmarks[2]}` : "—"}</div>
              <div className="text-[10.5px] uppercase tracking-wide font-semibold mt-1" style={{ color: C.ink3 }}>Weekly Range</div>
              <div className="text-[11px] font-semibold mt-0.5" style={{ color: HEATMAP_STATUS_COLOR[sel.status] }}>{HEATMAP_STATUS_LABEL[sel.status]}</div>
            </div>
          </div>

          <div className="flex items-center justify-between mb-3 pb-3" style={{ borderBottom: `1px solid ${C.border}` }}>
            <div>
              <div className="text-[10.5px] uppercase tracking-wide font-semibold mb-0.5" style={{ color: C.ink3 }}>Last Trained</div>
              <div className="text-[13.5px] font-semibold" style={{ color: C.ink }}>
                {sel.daysAgo === null ? "Never" : sel.daysAgo === 0 ? "Today" : sel.daysAgo === 1 ? "1 day ago" : `${sel.daysAgo} days ago`}
              </div>
            </div>
            <div className="text-right">
              <div className="text-[10.5px] uppercase tracking-wide font-semibold mb-0.5" style={{ color: C.ink3 }}>Trend</div>
              <div className="text-[13.5px] font-semibold flex items-center gap-1 justify-end" style={{ color: sel.trendPct >= 0 ? C.good : C.bad }}>
                {sel.trendPct >= 0 ? "↑" : "↓"} {Math.abs(Math.round(sel.trendPct))}%
                <span className="text-[11px] font-normal" style={{ color: C.ink3 }}>vs prior</span>
              </div>
            </div>
          </div>

          {sel.topExercises.length > 0 && (
            <div>
              <div className="text-[10.5px] uppercase tracking-wide font-semibold mb-1" style={{ color: C.ink3 }}>Top Exercises</div>
              <div className="text-[13px]" style={{ color: C.ink2 }}>{sel.topExercises.join(", ")}</div>
            </div>
          )}
        </div>
      )}

      {/* Training distribution */}
      <div className="rounded-2xl p-4 mb-4" style={{ backgroundColor: C.surface }}>
        <div className="text-[11px] font-bold uppercase tracking-[0.1em] mb-1.5" style={{ color: C.ink3 }}>Training Distribution</div>
        <div className="text-[11.5px] leading-snug mb-4" style={{ color: C.ink3 }}>
          Effective Sets (This Period) shows your total hard sets per muscle group compared to your recommended range for this period.
        </div>
        <div className="flex flex-col gap-3">
          {distGroups.map((g) => {
            const pct = g.max > 0 ? Math.min(100, (g.periodSets / g.max) * 100) : 0;
            const color = HEATMAP_STATUS_COLOR[g.status];
            return (
              <div key={g.label} className="flex items-center gap-2.5">
                <span className="text-[12.5px] font-semibold w-[70px] shrink-0" style={{ color: C.ink2 }}>{g.label}</span>
                <div className="flex-1 h-2.5 rounded-full overflow-hidden" style={{ backgroundColor: C.border }}>
                  <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: color, transition: "width 250ms ease, background-color 250ms ease" }} />
                </div>
                <span className="text-[11.5px] tabular-nums shrink-0 text-right" style={{ color: C.ink2, minWidth: 62 }}>
                  {Math.round(g.periodSets)} / {g.min}–{g.max}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Explanatory legend — what each status actually means */}
      <div className="grid grid-cols-2 gap-2.5 mb-6">
        {[
          { k: "green", title: "MEV", sub: "", body: "Minimum Effective Volume — enough to grow, but there's room to add sets." },
          { k: "yellow", title: "MAV", sub: "", body: "Maximum Adaptive Volume — the sweet spot for hypertrophy." },
          { k: "red", title: "MRV+", sub: "", body: "At or above Maximum Recoverable Volume. Can work well if recovery keeps up — not a hard ceiling." },
          { k: "gray", title: "Untargeted", sub: "", body: "Below MEV — not enough direct work for this muscle group yet." },
        ].map((item) => (
          <div key={item.k} className="rounded-xl p-3" style={{ backgroundColor: C.surface }}>
            <div className="flex items-center gap-1.5 mb-1">
              <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: HEATMAP_STATUS_COLOR[item.k] }} />
              <span className="text-[11.5px] font-bold" style={{ color: C.ink }}>{item.title}{item.sub ? ` (${item.sub})` : ""}</span>
            </div>
            <div className="text-[10.5px] leading-snug" style={{ color: C.ink3 }}>{item.body}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

