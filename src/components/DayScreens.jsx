import { useMemo, useState } from "react";
import { Activity, ArrowLeft, ArrowUpRight, ChevronDown, ChevronUp, Dumbbell, Plus, Search, Trash2, X } from "lucide-react";
import { FloatingAddButton } from "./WorkoutScreen";
import { CatTag, EquipPill } from "./atoms";
import { C } from "../lib/constants";
import { EQUIPMENT_FILTERS, MUSCLE_ORDER, autoMuscleForDay, ex, mergeLibrary } from "../lib/exerciseLibrary";
import { estDurationMin } from "../lib/insights";
import { dayAccentColor, relativeDays } from "../lib/sessionUtils";
import { makeId } from "../lib/id";

export function DayPreviewScreen({ day, sessions, onStart, onBack, onAddExercise, onRemoveAdded, onDeleteCustomDay, onReorderExercise, onRemoveExercise }) {
  const accent = dayAccentColor(day);
  const lastDone = sessions.find((s) => s.dayId === day.id);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [editMode, setEditMode] = useState(false);

  return (
    <div className="px-5 pt-5 pb-32">
      <div className="flex items-center gap-2 mb-5">
        <button onClick={onBack} className="p-2 -ml-2 rounded-lg" aria-label="Back"><ArrowLeft size={20} style={{ color: C.ink2 }} /></button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h1 className="text-[22px] font-bold tracking-tight truncate" style={{ color: C.ink }}>{day.title}</h1>
            <CatTag tag={day.tag} colorOverride={accent} />
          </div>
          <div className="text-[12.5px] mt-0.5" style={{ color: C.ink2 }}>{day.subtitle}</div>
        </div>
      </div>

      <div className="text-[12px] mb-4" style={{ color: C.ink3 }}>
        {day.exercises.length} exercises · ~{estDurationMin(day)} min{lastDone ? ` · last done ${relativeDays(lastDone.date)}` : ""}
      </div>

      <div className="flex items-center justify-between mb-2.5">
        <span className="text-[11px] uppercase tracking-[0.14em] font-bold" style={{ color: C.ink3 }}>Exercises</span>
        <div className="flex items-center gap-3">
          <button onClick={() => setEditMode(v => !v)} className="flex items-center gap-1 text-[12px] font-semibold" style={{ color: editMode ? C.accent : C.ink3 }}>
            {editMode ? "Done" : "Edit"}
          </button>
          <button onClick={() => onAddExercise(day)} className="flex items-center gap-1 text-[12px] font-semibold" style={{ color: C.accent }}><Plus size={14} /> Add</button>
        </div>
      </div>

      <div className="flex flex-col gap-2 mb-6">
        {day.exercises.map((e, idx) => (
          <div key={e.id} className="rounded-2xl p-3.5 flex items-start gap-2" style={{ backgroundColor: C.bg, border: `1px solid ${C.border}` }}>
            {editMode && (
              <div className="flex flex-col gap-1 shrink-0 mr-1">
                <button onClick={() => onReorderExercise(day.id, e.id, -1)} disabled={idx === 0} className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ backgroundColor: C.surface, opacity: idx === 0 ? 0.35 : 1 }} aria-label="Move up"><ChevronUp size={14} style={{ color: C.ink2 }} /></button>
                <button onClick={() => onReorderExercise(day.id, e.id, 1)} disabled={idx === day.exercises.length - 1} className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ backgroundColor: C.surface, opacity: idx === day.exercises.length - 1 ? 0.35 : 1 }} aria-label="Move down"><ChevronDown size={14} style={{ color: C.ink2 }} /></button>
              </div>
            )}
            <div className="flex-1 min-w-0">
              {e.section && <div className="text-[10px] uppercase tracking-wide font-semibold mb-0.5" style={{ color: C.ink3 }}>{e.section}</div>}
              <div className="text-[14px] font-semibold" style={{ color: C.ink }}>{e.best}</div>
              {e.subs.length > 0 && <div className="text-[12px] mt-0.5" style={{ color: C.ink3 }}>or {e.subs.join(" / ")}</div>}
              <div className="text-[12px] tabular-nums mt-1" style={{ color: C.ink2 }}>{e.setsLabel} × {e.repsLabel} · rest {e.rest}s</div>
            </div>
            {editMode
              ? <button onClick={() => onRemoveExercise(day.id, e.id, e.added)} className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: C.badSoft }} aria-label="Delete exercise"><Trash2 size={14} style={{ color: C.bad }} /></button>
              : (e.added && <button onClick={() => onRemoveAdded(day.id, e.id)} className="p-1.5 shrink-0" aria-label="Remove"><X size={15} style={{ color: C.ink3 }} /></button>)}
          </div>
        ))}
      </div>

      <button onClick={() => onStart(day)} className="w-full rounded-2xl py-4 text-[15px] font-semibold mb-3 flex items-center justify-center gap-2" style={{ backgroundColor: C.ink, color: "#fff" }}>
        Start workout <ArrowUpRight size={17} />
      </button>

      <FloatingAddButton onClick={() => onAddExercise(day)} bottom={24} />

      {day.custom && (confirmDelete ? (
        <div className="flex items-center justify-center gap-3 text-[12px]">
          <span style={{ color: C.ink2 }}>Delete this day?</span>
          <button onClick={() => onDeleteCustomDay(day.id)} className="font-semibold px-3 py-1.5 rounded-lg" style={{ backgroundColor: C.bad, color: "#fff" }}>Delete</button>
          <button onClick={() => setConfirmDelete(false)} style={{ color: C.ink3 }}>Cancel</button>
        </div>
      ) : (
        <button onClick={() => setConfirmDelete(true)} className="w-full text-center text-[12px] font-semibold" style={{ color: C.ink3 }}>Delete custom day</button>
      ))}
    </div>
  );
}

/* ====================================================================== */
/* ADD EXERCISE — searchable library                                     */
/* ====================================================================== */


export function AddExerciseScreen({ day, onAdd, onBack, customExercises }) {
  const accent = dayAccentColor(day);
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState("All");
  const [showCustom, setShowCustom] = useState(false);
  const [customName, setCustomName] = useState("");
  const [customKind, setCustomKind] = useState("lifting");
  const [customMuscle, setCustomMuscle] = useState(null); // null = use the auto-suggested muscle
  const autoMuscle = autoMuscleForDay(day, customKind);
  const effectiveMuscle = customMuscle || autoMuscle;
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

  function addCustom() {
    if (!customName.trim()) return;
    onAdd(day.id, { name: customName.trim(), muscle: effectiveMuscle, equipment: customKind === "cardio" ? "Cardio" : "Other", rest: 90, kind: customKind, isCustom: true });
    setCustomName(""); setShowCustom(false); setCustomKind("lifting"); setCustomMuscle(null);
  }

  return (
    <div className="px-5 pt-5 pb-32">
      <div className="flex items-center gap-2 mb-4">
        <button onClick={onBack} className="p-2 -ml-2 rounded-lg" aria-label="Back"><ArrowLeft size={20} style={{ color: C.ink2 }} /></button>
        <h1 className="text-[18px] font-bold tracking-tight" style={{ color: C.ink }}>Add to {day.title}</h1>
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
        <div className="text-center py-12 text-[14px]" style={{ color: C.ink3 }}>No matches. Try another search.</div>
      ) : MUSCLE_ORDER.filter((m) => results[m]).map((muscle) => (
        <div key={muscle} className="mb-5">
          <div className="text-[11px] uppercase tracking-[0.14em] font-bold mb-2" style={{ color: C.ink3 }}>{muscle}</div>
          <div className="flex flex-col gap-2">
            {results[muscle].map((e) => (
              <button key={e.name} onClick={() => onAdd(day.id, e)} className="rounded-2xl p-3.5 flex items-center gap-3 text-left active:scale-[0.99] transition-transform" style={{ backgroundColor: C.bg, border: `1px solid ${C.border}` }}>
                <div className="flex-1 min-w-0">
                  <div className="text-[14px] font-semibold truncate" style={{ color: C.ink }}>{e.name}</div>
                  <div className="mt-1"><EquipPill equipment={e.equipment} /></div>
                </div>
                <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: C.accentSoft }}><Plus size={16} style={{ color: C.accent }} /></div>
              </button>
            ))}
          </div>
        </div>
      ))}

      {/* Custom exercise at bottom */}
      <div className="mt-2 rounded-2xl p-4" style={{ backgroundColor: C.surface, border: `1px solid ${C.border}` }}>
        <div className="text-[12px] font-semibold mb-1.5" style={{ color: C.ink }}>Create custom exercise</div>
        {showCustom ? (
          <div className="flex flex-col gap-2.5">
            <input value={customName} onChange={(e) => setCustomName(e.target.value)} placeholder="Exercise name" className="w-full rounded-xl px-3 py-2 text-[14px] outline-none" style={{ backgroundColor: C.bg, color: C.ink, border: `1px solid ${C.border2}` }} autoFocus onKeyDown={(e) => e.key === "Enter" && addCustom()} />
            <div className="flex gap-2">
              <button onClick={() => setCustomKind("lifting")} className="flex-1 py-2 rounded-xl text-[12.5px] font-semibold flex items-center justify-center gap-1.5" style={{ backgroundColor: customKind === "lifting" ? C.ink : C.bg, color: customKind === "lifting" ? "#fff" : C.ink2, border: `1px solid ${customKind === "lifting" ? C.ink : C.border2}` }}>
                <Dumbbell size={14} /> Weight lifting
              </button>
              <button onClick={() => setCustomKind("cardio")} className="flex-1 py-2 rounded-xl text-[12.5px] font-semibold flex items-center justify-center gap-1.5" style={{ backgroundColor: customKind === "cardio" ? C.ink : C.bg, color: customKind === "cardio" ? "#fff" : C.ink2, border: `1px solid ${customKind === "cardio" ? C.ink : C.border2}` }}>
                <Activity size={14} /> Cardio
              </button>
            </div>
            <div className="text-[11px]" style={{ color: C.ink4 }}>{customKind === "cardio" ? "Cardio is timed during the workout — no sets or reps." : "Weight lifting logs sets, reps, and weight."}</div>
            <div className="text-[11px] uppercase tracking-wide font-semibold" style={{ color: C.ink3 }}>Muscle group</div>
            <div className="flex gap-1.5 overflow-x-auto pb-1">
              {MUSCLE_ORDER.map((m) => (
                <button key={m} onClick={() => setCustomMuscle(m)} className="text-[12px] px-3 py-1.5 rounded-full font-semibold whitespace-nowrap shrink-0"
                  style={{ backgroundColor: effectiveMuscle === m ? C.ink : C.bg, color: effectiveMuscle === m ? "#fff" : C.ink2, border: `1px solid ${effectiveMuscle === m ? C.ink : C.border2}` }}>{m}</button>
              ))}
            </div>
            <button onClick={addCustom} disabled={!customName.trim()} className="w-full py-2.5 rounded-xl text-[13px] font-semibold" style={{ backgroundColor: customName.trim() ? C.ink : C.border, color: customName.trim() ? "#fff" : C.ink3 }}>Add exercise</button>
          </div>
        ) : (
          <button onClick={() => setShowCustom(true)} className="flex items-center gap-2 text-[13px] font-semibold" style={{ color: C.accent }}>
            <Plus size={15} /> Add custom exercise name
          </button>
        )}
      </div>
    </div>
  );
}

/* ====================================================================== */
/* SET ROW + EXERCISE CARD                                                */
/* ====================================================================== */


export function blankRow(o) { return { tempId: makeId(), name: "", section: "", setsCount: "3", repsLabel: "8-12", rest: "90", ...o }; }


export function NewDayScreen({ onSave, onCancel, customExercises, onNewCustomExercise }) {
  const [title, setTitle] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const [tag, setTag] = useState("CUSTOM");
  const [rows, setRows] = useState(() => [blankRow()]);
  const [pickingFor, setPickingFor] = useState(null); // tempId being picked
  const [pickerQ, setPickerQ] = useState("");
  const [pickerFilter, setPickerFilter] = useState("All");
  const [customInput, setCustomInput] = useState(""); // for custom exercise name
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [customKind, setCustomKind] = useState("lifting");
  const [customMuscle, setCustomMuscle] = useState(null); // null = use the auto-suggested muscle
  const autoCustomMuscle = customKind === "cardio" ? "Cardio" : (tag === "PUSH" ? "Chest" : tag === "PULL" ? "Back" : tag === "LEGS" ? "Quads" : "Other");
  const effectiveCustomMuscle = customMuscle || autoCustomMuscle;

  const canSave = title.trim() && rows.some((r) => r.name.trim());
  const inputCls = "w-full rounded-xl px-3 py-2.5 text-[15px] outline-none";
  const inputSty = { backgroundColor: C.surface, color: C.ink };

  const fullLibrary = useMemo(() => mergeLibrary(customExercises), [customExercises]);
  const pickerResults = useMemo(() => {
    const needle = pickerQ.trim().toLowerCase();
    const list = fullLibrary.filter((e) => {
      if (pickerFilter !== "All" && e.equipment !== pickerFilter) return false;
      if (!needle) return true;
      return e.name.toLowerCase().includes(needle) || e.muscle.toLowerCase().includes(needle);
    });
    const byMuscle = {};
    for (const e of list) (byMuscle[e.muscle] = byMuscle[e.muscle] || []).push(e);
    return byMuscle;
  }, [pickerQ, pickerFilter, fullLibrary]);

  function pickExercise(libEx) {
    const cardio = libEx.muscle === "Cardio" || libEx.equipment === "Cardio";
    setRows((r) => r.map((x) => x.tempId === pickingFor ? { ...x, name: libEx.name, section: libEx.muscle, rest: String(libEx.rest || 90), kind: cardio ? "cardio" : "lifting" } : x));
    setPickingFor(null); setPickerQ(""); setPickerFilter("All"); setShowCustomInput(false); setCustomInput("");
  }
  function pickCustom() {
    if (!customInput.trim()) return;
    const muscle = effectiveCustomMuscle;
    setRows((r) => r.map((x) => x.tempId === pickingFor ? { ...x, name: customInput.trim(), kind: customKind, section: muscle } : x));
    onNewCustomExercise && onNewCustomExercise({ name: customInput.trim(), muscle, equipment: customKind === "cardio" ? "Cardio" : "Other", rest: 90, kind: customKind, isCustom: true });
    setPickingFor(null); setPickerQ(""); setPickerFilter("All"); setShowCustomInput(false); setCustomInput(""); setCustomKind("lifting"); setCustomMuscle(null);
  }

  function handleSave() {
    const exercises = rows.filter((r) => r.name.trim()).map((r, i) => {
      const cardio = r.kind === "cardio" || r.section === "Cardio";
      return { id: `custom-ex-${makeId()}-${i}`, section: r.section.trim(), best: r.name.trim(), subs: [], kind: cardio ? "cardio" : "lifting", muscle: r.section.trim(), setsLabel: cardio ? "—" : String(r.setsCount || "3"), repsLabel: cardio ? "timed" : (r.repsLabel.trim() || "8-12"), rest: Number(r.rest) || 90, prefill: cardio ? 0 : Math.max(1, Number(r.setsCount) || 3) };
    });
    onSave({ id: `custom-${makeId()}`, tag, title: title.trim(), subtitle: subtitle.trim() || `${exercises.length} exercises`, custom: true, exercises });
  }

  // Exercise picker overlay
  if (pickingFor !== null) {
    return (
      <div className="px-5 pt-5 pb-32">
        <div className="flex items-center gap-2 mb-4">
          <button onClick={() => { setPickingFor(null); setPickerQ(""); setPickerFilter("All"); setShowCustomInput(false); setCustomInput(""); }} className="p-2 -ml-2 rounded-lg" aria-label="Back"><ArrowLeft size={20} style={{ color: C.ink2 }} /></button>
          <h1 className="text-[18px] font-bold tracking-tight" style={{ color: C.ink }}>Pick an exercise</h1>
        </div>
        <div className="flex items-center gap-2 rounded-2xl px-3.5 py-3 mb-3" style={{ backgroundColor: C.surface }}>
          <Search size={17} style={{ color: C.ink3 }} />
          <input value={pickerQ} onChange={(e) => setPickerQ(e.target.value)} placeholder="Search exercises or muscle" className="flex-1 bg-transparent outline-none text-[15px]" style={{ color: C.ink }} autoFocus />
          {pickerQ && <button onClick={() => setPickerQ("")} aria-label="Clear"><X size={16} style={{ color: C.ink3 }} /></button>}
        </div>
        <div className="flex gap-1.5 mb-5 overflow-x-auto pb-1">
          {EQUIPMENT_FILTERS.map((f) => (
            <button key={f} onClick={() => setPickerFilter(f)} className="text-[12px] px-3 py-1.5 rounded-full font-semibold whitespace-nowrap shrink-0"
              style={{ backgroundColor: pickerFilter === f ? C.ink : C.surface, color: pickerFilter === f ? "#fff" : C.ink2 }}>{f}</button>
          ))}
        </div>
        {Object.keys(pickerResults).length === 0 ? (
          <div className="text-center py-8 text-[14px]" style={{ color: C.ink3 }}>No matches.</div>
        ) : MUSCLE_ORDER.filter((m) => pickerResults[m]).map((muscle) => (
          <div key={muscle} className="mb-5">
            <div className="text-[11px] uppercase tracking-[0.14em] font-bold mb-2" style={{ color: C.ink3 }}>{muscle}</div>
            <div className="flex flex-col gap-2">
              {pickerResults[muscle].map((e) => (
                <button key={e.name} onClick={() => pickExercise(e)} className="rounded-2xl p-3.5 flex items-center gap-3 text-left" style={{ backgroundColor: C.bg, border: `1px solid ${C.border}` }}>
                  <div className="flex-1 min-w-0">
                    <div className="text-[14px] font-semibold truncate" style={{ color: C.ink }}>{e.name}</div>
                    <div className="mt-1"><EquipPill equipment={e.equipment} /></div>
                  </div>
                  <Plus size={16} style={{ color: C.accent }} />
                </button>
              ))}
            </div>
          </div>
        ))}
        {/* Custom exercise at bottom */}
        <div className="mt-4 rounded-2xl p-4" style={{ backgroundColor: C.surface, border: `1px solid ${C.border}` }}>
          <div className="text-[12px] font-semibold mb-2" style={{ color: C.ink }}>Create custom exercise</div>
          {showCustomInput ? (
            <div className="flex flex-col gap-2.5">
              <input value={customInput} onChange={(e) => setCustomInput(e.target.value)} placeholder="Exercise name" className="w-full rounded-xl px-3 py-2 text-[14px] outline-none" style={{ backgroundColor: C.bg, color: C.ink, border: `1px solid ${C.border2}` }} autoFocus onKeyDown={(e) => e.key === "Enter" && pickCustom()} />
              <div className="flex gap-2">
                <button onClick={() => setCustomKind("lifting")} className="flex-1 py-2 rounded-xl text-[12.5px] font-semibold flex items-center justify-center gap-1.5" style={{ backgroundColor: customKind === "lifting" ? C.ink : C.bg, color: customKind === "lifting" ? "#fff" : C.ink2, border: `1px solid ${customKind === "lifting" ? C.ink : C.border2}` }}><Dumbbell size={14} /> Weight lifting</button>
                <button onClick={() => setCustomKind("cardio")} className="flex-1 py-2 rounded-xl text-[12.5px] font-semibold flex items-center justify-center gap-1.5" style={{ backgroundColor: customKind === "cardio" ? C.ink : C.bg, color: customKind === "cardio" ? "#fff" : C.ink2, border: `1px solid ${customKind === "cardio" ? C.ink : C.border2}` }}><Activity size={14} /> Cardio</button>
              </div>
              <div className="text-[11px] uppercase tracking-wide font-semibold" style={{ color: C.ink3 }}>Muscle group</div>
              <div className="flex gap-1.5 overflow-x-auto pb-1">
                {MUSCLE_ORDER.map((m) => (
                  <button key={m} onClick={() => setCustomMuscle(m)} className="text-[12px] px-3 py-1.5 rounded-full font-semibold whitespace-nowrap shrink-0"
                    style={{ backgroundColor: effectiveCustomMuscle === m ? C.ink : C.bg, color: effectiveCustomMuscle === m ? "#fff" : C.ink2, border: `1px solid ${effectiveCustomMuscle === m ? C.ink : C.border2}` }}>{m}</button>
                ))}
              </div>
              <button onClick={pickCustom} disabled={!customInput.trim()} className="w-full py-2.5 rounded-xl text-[13px] font-semibold" style={{ backgroundColor: customInput.trim() ? C.ink : C.border, color: customInput.trim() ? "#fff" : C.ink3 }}>Add exercise</button>
            </div>
          ) : (
            <button onClick={() => setShowCustomInput(true)} className="flex items-center gap-2 text-[13px] font-semibold" style={{ color: C.accent }}>
              <Plus size={15} /> Add custom exercise name
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="px-5 pt-5 pb-32">
      <div className="flex items-center gap-2 mb-5">
        <button onClick={onCancel} className="p-2 -ml-2 rounded-lg" aria-label="Back"><ArrowLeft size={20} style={{ color: C.ink2 }} /></button>
        <h1 className="text-[18px] font-bold tracking-tight" style={{ color: C.ink }}>New workout day</h1>
      </div>
      <label className="text-[11px] uppercase tracking-wide font-bold" style={{ color: C.ink3 }}>Day name</label>
      <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Arms Day" className={inputCls + " mt-1 mb-3"} style={inputSty} />
      <label className="text-[11px] uppercase tracking-wide font-bold" style={{ color: C.ink3 }}>Subtitle (optional)</label>
      <input value={subtitle} onChange={(e) => setSubtitle(e.target.value)} placeholder="e.g. Biceps & triceps focus" className={inputCls + " mt-1 mb-3"} style={inputSty} />
      <label className="text-[11px] uppercase tracking-wide font-bold" style={{ color: C.ink3 }}>Focus</label>
      <div className="flex gap-1.5 mt-1 mb-4">
        {["PUSH", "PULL", "LEGS", "CUSTOM"].map((tg) => <button key={tg} onClick={() => setTag(tg)} className="text-[12px] px-3 py-1.5 rounded-full font-semibold" style={{ backgroundColor: tag === tg ? C.ink : C.surface, color: tag === tg ? "#fff" : C.ink2 }}>{tg.charAt(0) + tg.slice(1).toLowerCase()}</button>)}
      </div>
      <div className="text-[11px] uppercase tracking-wide font-bold mb-2" style={{ color: C.ink3 }}>Exercises</div>
      <div className="flex flex-col gap-2.5 mb-3">
        {rows.map((row) => (
          <div key={row.tempId} className="rounded-2xl p-3" style={{ backgroundColor: C.bg, border: `1px solid ${C.border}` }}>
            <div className="flex gap-2 mb-2">
              <button onClick={() => setPickingFor(row.tempId)} className="flex-1 rounded-lg px-2.5 py-2 text-left text-[14px] outline-none" style={{ backgroundColor: C.surface, color: row.name ? C.ink : C.ink3 }}>
                {row.name || "Tap to pick exercise →"}
              </button>
              <button onClick={() => setRows((r) => r.filter((x) => x.tempId !== row.tempId))} className="p-2 rounded-lg shrink-0" style={{ backgroundColor: C.surface }} aria-label="Remove"><X size={14} style={{ color: C.ink3 }} /></button>
            </div>
            {row.name && (
              <>
                <input value={row.section} onChange={(e) => setRows((r) => r.map((x) => x.tempId === row.tempId ? { ...x, section: e.target.value } : x))} placeholder="Muscle group (optional)" className="w-full rounded-lg px-2.5 py-2 text-[13px] outline-none mb-2" style={{ backgroundColor: C.surface, color: C.ink }} />
                {row.kind === "cardio" ? (
                  <div className="flex items-center gap-2 rounded-lg px-2.5 py-2" style={{ backgroundColor: C.surface }}>
                    <Activity size={13} style={{ color: C.accent }} />
                    <span className="text-[12px] font-semibold" style={{ color: C.accent }}>Cardio — timed only</span>
                  </div>
                ) : (
                <div className="flex gap-2">
                  {[["Sets", "setsCount", "number"], ["Reps", "repsLabel", "text"], ["Rest (s)", "rest", "number"]].map(([lab, key, ty]) => (
                    <div key={key} className="flex-1">
                      <span className="text-[9px] uppercase font-bold" style={{ color: C.ink3 }}>{lab}</span>
                      <input type={ty} value={row[key]} onChange={(e) => setRows((r) => r.map((x) => x.tempId === row.tempId ? { ...x, [key]: e.target.value } : x))} className="w-full rounded-lg px-2 py-1.5 text-[15px] tabular-nums outline-none mt-0.5" style={{ backgroundColor: C.surface, color: C.ink }} />
                    </div>
                  ))}
                </div>
                )}
              </>
            )}
          </div>
        ))}
      </div>
      <button onClick={() => setRows((r) => [...r, blankRow()])} className="w-full rounded-xl py-2.5 text-[12px] font-semibold flex items-center justify-center gap-1.5 mb-6" style={{ backgroundColor: C.surface, color: C.ink2 }}><Plus size={14} /> Add exercise</button>
      <button onClick={handleSave} disabled={!canSave} className="w-full rounded-2xl py-3.5 text-[15px] font-semibold" style={{ backgroundColor: canSave ? C.ink : C.surface, color: canSave ? "#fff" : C.ink3 }}>Save workout day</button>
    </div>
  );
}

/* ====================================================================== */
/* PROGRESS — grouped by muscle, with time range + strength-to-weight     */
/* ====================================================================== */

