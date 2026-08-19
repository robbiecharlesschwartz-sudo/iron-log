import { useMemo, useState } from "react";
import { Activity, ArrowLeft, Clock, Dumbbell, Plus, Search, X } from "lucide-react";
import { EquipPill } from "./atoms";
import { C } from "../lib/constants";
import { EQUIPMENT_FILTERS, MUSCLE_ORDER, mergeLibrary } from "../lib/exerciseLibrary";
import { lastPerformanceFor } from "../lib/sessionUtils";

function CustomExerciseForm({ onCreate }) {
  const [name, setName] = useState("");
  const [kind, setKind] = useState("lifting");
  const [muscle, setMuscle] = useState("Chest");

  function create() {
    if (!name.trim()) return;
    onCreate({ name: name.trim(), muscle, equipment: kind === "cardio" ? "Cardio" : "Other", rest: 90, kind, isCustom: true });
    setName(""); setKind("lifting"); setMuscle("Chest");
  }

  return (
    <div className="rounded-2xl p-4" style={{ backgroundColor: C.surface, border: `1px solid ${C.border}` }}>
      <div className="text-[12px] font-semibold mb-2.5" style={{ color: C.ink }}>Create a new exercise</div>
      <div className="flex flex-col gap-2.5">
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Exercise name" className="w-full rounded-xl px-3 py-2 text-[14px] outline-none" style={{ backgroundColor: C.bg, color: C.ink, border: `1px solid ${C.border2}` }} onKeyDown={(e) => e.key === "Enter" && create()} />
        <div className="flex gap-2">
          <button onClick={() => setKind("lifting")} className="flex-1 py-2 rounded-xl text-[12.5px] font-semibold flex items-center justify-center gap-1.5" style={{ backgroundColor: kind === "lifting" ? C.ink : C.bg, color: kind === "lifting" ? "#fff" : C.ink2, border: `1px solid ${kind === "lifting" ? C.ink : C.border2}` }}>
            <Dumbbell size={14} /> Weight lifting
          </button>
          <button onClick={() => setKind("cardio")} className="flex-1 py-2 rounded-xl text-[12.5px] font-semibold flex items-center justify-center gap-1.5" style={{ backgroundColor: kind === "cardio" ? C.ink : C.bg, color: kind === "cardio" ? "#fff" : C.ink2, border: `1px solid ${kind === "cardio" ? C.ink : C.border2}` }}>
            <Activity size={14} /> Cardio
          </button>
        </div>
        <div className="text-[11px] uppercase tracking-wide font-semibold" style={{ color: C.ink3 }}>Muscle group</div>
        <div className="flex gap-1.5 overflow-x-auto pb-1">
          {MUSCLE_ORDER.map((m) => (
            <button key={m} onClick={() => setMuscle(m)} className="text-[12px] px-3 py-1.5 rounded-full font-semibold whitespace-nowrap shrink-0"
              style={{ backgroundColor: muscle === m ? C.ink : C.bg, color: muscle === m ? "#fff" : C.ink2, border: `1px solid ${muscle === m ? C.ink : C.border2}` }}>{m}</button>
          ))}
        </div>
        <button onClick={create} disabled={!name.trim()} className="w-full py-2.5 rounded-xl text-[13px] font-semibold" style={{ backgroundColor: name.trim() ? C.ink : C.border, color: name.trim() ? "#fff" : C.ink3 }}>Create exercise</button>
      </div>
    </div>
  );
}

export function LibraryScreen({ sessions, customExercises, onBack, onNewCustomExercise }) {
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState("All");
  const [openName, setOpenName] = useState(null);
  const [showCreate, setShowCreate] = useState(false);

  const fullLibrary = useMemo(() => mergeLibrary(customExercises), [customExercises]);
  const results = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const list = fullLibrary.filter((e) => {
      if (filter !== "All" && e.equipment !== filter) return false;
      if (!needle) return true;
      return e.name.toLowerCase().includes(needle) || e.muscle.toLowerCase().includes(needle);
    });
    const byMuscle = {};
    for (const e of list) (byMuscle[e.muscle] = byMuscle[e.muscle] || []).push(e);
    return byMuscle;
  }, [q, filter, fullLibrary]);

  return (
    <div className="px-5 pt-5 pb-32">
      <div className="flex items-center gap-2 mb-5">
        <button onClick={onBack} className="p-2 -ml-2 rounded-lg" aria-label="Back"><ArrowLeft size={20} style={{ color: C.ink2 }} /></button>
        <h1 className="text-[20px] font-bold tracking-tight" style={{ color: C.ink }}>Library</h1>
      </div>

      <div className="flex items-center gap-2 rounded-2xl px-3.5 py-3 mb-3" style={{ backgroundColor: C.surface }}>
        <Search size={17} style={{ color: C.ink3 }} />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search exercises or muscle" className="flex-1 bg-transparent outline-none text-[15px]" style={{ color: C.ink }} />
        {q && <button onClick={() => setQ("")} aria-label="Clear"><X size={16} style={{ color: C.ink3 }} /></button>}
      </div>
      <div className="flex gap-1.5 mb-5 overflow-x-auto pb-1">
        {EQUIPMENT_FILTERS.map((f) => (
          <button key={f} onClick={() => setFilter(f)} className="text-[12px] px-3 py-1.5 rounded-full font-semibold whitespace-nowrap shrink-0"
            style={{ backgroundColor: filter === f ? C.ink : C.surface, color: filter === f ? "#fff" : C.ink2 }}>{f}</button>
        ))}
      </div>

      {Object.keys(results).length === 0 ? (
        <div className="text-center py-10 text-[14px]" style={{ color: C.ink3 }}>No matches. Try another search.</div>
      ) : MUSCLE_ORDER.filter((m) => results[m]).map((muscle) => (
        <div key={muscle} className="mb-5">
          <div className="text-[11px] uppercase tracking-[0.14em] font-bold mb-2" style={{ color: C.ink3 }}>{muscle}</div>
          <div className="flex flex-col gap-2">
            {results[muscle].map((e) => {
              const open = openName === e.name;
              const last = open ? lastPerformanceFor(sessions, e.name) : null;
              return (
                <div key={e.name} className="rounded-2xl overflow-hidden" style={{ backgroundColor: C.bg, border: `1px solid ${open ? C.border2 : C.border}` }}>
                  <button onClick={() => setOpenName(open ? null : e.name)} className="w-full p-3.5 flex items-center gap-3 text-left">
                    <div className="flex-1 min-w-0">
                      <div className="text-[14px] font-semibold truncate" style={{ color: C.ink }}>{e.name}</div>
                      <div className="mt-1"><EquipPill equipment={e.equipment} /></div>
                    </div>
                  </button>
                  {open && (
                    <div className="px-3.5 pb-3.5 -mt-1">
                      {last ? (
                        <div className="rounded-xl p-3 flex items-center gap-2.5" style={{ backgroundColor: C.surface }}>
                          <Clock size={14} style={{ color: C.ink3 }} />
                          <div>
                            <div className="text-[13px] font-semibold" style={{ color: C.ink }}>Last time: {last.sets[0]?.weight ?? "—"} lb × {last.sets[0]?.reps ?? "—"}</div>
                            <div className="text-[11.5px]" style={{ color: C.ink3 }}>{new Date(last.date).toLocaleDateString()}</div>
                          </div>
                        </div>
                      ) : (
                        <div className="rounded-xl p-3 text-[13px]" style={{ backgroundColor: C.surface, color: C.ink3 }}>You haven't logged this exercise yet.</div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}

      <div className="mt-2">
        {showCreate ? (
          <CustomExerciseForm onCreate={(entry) => { onNewCustomExercise(entry); setShowCreate(false); }} />
        ) : (
          <button onClick={() => setShowCreate(true)} className="w-full rounded-2xl p-4 flex items-center justify-center gap-2 text-[13px] font-semibold" style={{ backgroundColor: C.surface, color: C.accent }}>
            <Plus size={15} /> Create a new exercise
          </button>
        )}
      </div>
    </div>
  );
}
