import { useRef, useState } from "react";
import { Activity, ArrowLeft, Check, ChevronDown, Copy, Flame, History, Play, Trash2, X } from "lucide-react";
import { C } from "../lib/constants";
import { fmtClock, fmtShortDate, formatSetGroups, relativeDays, sessionAccentColor, sessionVolume } from "../lib/sessionUtils";

export function SwipeSessionRow({ session, expanded, onToggle, onDelete, selectMode, selected, onSelectToggle, onContinue, onEdit }) {
  const accent = sessionAccentColor(session);
  const [dx, setDx] = useState(0);
  const startX = useRef(null);
  function ts(e) { if (selectMode) return; startX.current = e.touches[0].clientX; }
  function tm(e) { if (selectMode || startX.current === null) return; const d = e.touches[0].clientX - startX.current; if (d < 0) setDx(Math.max(-80, d)); }
  function te() { if (selectMode) return; setDx(dx < -40 ? -72 : 0); startX.current = null; }

  return (
    <div className="relative rounded-2xl overflow-hidden" style={{ backgroundColor: C.bad }}>
      <button onClick={() => onDelete(session.id)} className="absolute right-0 top-0 bottom-0 px-5 flex items-center justify-center" aria-label="Delete"><Trash2 size={16} style={{ color: "#fff" }} /></button>
      <div className="relative" style={{ backgroundColor: C.bg, border: `1px solid ${C.border}`, borderRadius: 16, transform: `translateX(${selectMode ? 0 : dx}px)`, transition: startX.current === null ? "transform 0.2s" : "none" }} onTouchStart={ts} onTouchMove={tm} onTouchEnd={te}>
        <button onClick={() => selectMode ? onSelectToggle(session.id) : onToggle(session.id)} className="w-full flex items-center gap-3 p-3.5 text-left">
          {selectMode && <div className="w-5 h-5 rounded-md flex items-center justify-center shrink-0" style={{ backgroundColor: selected ? C.ink : C.bg, border: `1.5px solid ${selected ? C.ink : C.border2}` }}>{selected && <Check size={13} color="#fff" strokeWidth={3} />}</div>}
          <div className="w-1 self-stretch rounded-full shrink-0" style={{ backgroundColor: accent }} />
          <div className="flex-1 min-w-0">
            <div className="text-[14px] font-semibold" style={{ color: C.ink }}>{session.dayTitle}</div>
            <div className="text-[11.5px]" style={{ color: C.ink3 }}>{fmtShortDate(session.date)} · {relativeDays(session.date)}</div>
          </div>
          <div className="text-right shrink-0">
            <div className="tabular-nums text-[12.5px]" style={{ color: C.ink2 }}>{fmtClock(session.totalElapsedSeconds)}</div>
            <div className="tabular-nums text-[11px]" style={{ color: C.ink3 }}>{session.volume.toLocaleString()} lb</div>
          </div>
          {!selectMode && <ChevronDown size={14} style={{ color: C.ink4, transform: expanded ? "rotate(180deg)" : "none" }} />}
        </button>
        {expanded && !selectMode && (
          <div className="px-3.5 pb-3.5 pt-0.5 flex flex-col gap-2">
            {session.exercises.filter((e) => e.sets.length || e.notes).map((e) => (
              <div key={e.exId} className="text-[12px]" style={{ color: C.ink2 }}>
                <div className="font-medium mb-0.5" style={{ color: C.ink }}>{e.selectedLift}</div>
                {e.sets.length > 0 && <div className="tabular-nums">{formatSetGroups(e.sets).map((g, gi) => <span key={gi}>{gi > 0 ? " → " : ""}{g.parts.join(", ")}{g.lift && g.lift !== e.selectedLift ? ` (${g.lift})` : ""}</span>)}</div>}
                {e.notes && <div className="mt-0.5 text-[11.5px] italic" style={{ color: C.ink3 }}>📝 {e.notes}</div>}
              </div>
            ))}
            <div className="flex gap-2 mt-1.5">
              <button onClick={() => onContinue(session)} className="flex-1 rounded-xl py-2.5 text-[13px] font-semibold flex items-center justify-center gap-1.5" style={{ backgroundColor: C.accentSoft, color: C.accent }}>
                <Play size={13} /> Continue
              </button>
              <button onClick={() => onEdit && onEdit(session)} className="flex-1 rounded-xl py-2.5 text-[13px] font-semibold flex items-center justify-center gap-1.5" style={{ backgroundColor: C.surface, color: C.ink2 }}>
                <Activity size={13} /> Edit
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
/* ====================================================================== */
/* EDIT PAST SESSION — remove sets/exercises, adjust duration            */
/* ====================================================================== */


export function EditSessionScreen({ session, onSave, onBack, onDelete }) {
  const [draft, setDraft] = useState(() => JSON.parse(JSON.stringify(session)));
  const totalSecs = draft.totalElapsedSeconds || 0;
  const [hh, setHh] = useState(String(Math.floor(totalSecs / 3600)));
  const [mm, setMm] = useState(String(Math.floor((totalSecs % 3600) / 60)));
  const [ss, setSs] = useState(String(Math.floor(totalSecs % 60)));
  const [confirmDel, setConfirmDel] = useState(false);
  const accent = sessionAccentColor(draft);

  function removeSet(exId, i) {
    setDraft(d => ({ ...d, exercises: d.exercises.map(e => e.exId === exId ? { ...e, sets: e.sets.filter((_, j) => j !== i) } : e) }));
  }
  function removeExercise(exId) {
    setDraft(d => ({ ...d, exercises: d.exercises.filter(e => e.exId !== exId) }));
  }
  function updateSet(exId, i, field, val) {
    setDraft(d => ({ ...d, exercises: d.exercises.map(e => e.exId === exId ? { ...e, sets: e.sets.map((st, j) => j === i ? { ...st, [field]: val } : st) } : e) }));
  }
  function save() {
    const secs = (parseInt(hh) || 0) * 3600 + (parseInt(mm) || 0) * 60 + (parseInt(ss) || 0);
    const cleaned = {
      ...draft,
      exercises: draft.exercises.map(e => ({ ...e, sets: (e.sets || []).map(st => ({ ...st, weight: Number(st.weight) || 0, reps: Number(st.reps) || 0 })) })),
      totalElapsedSeconds: secs,
      lastUpdatedAt: Date.now(),
    };
    cleaned.volume = sessionVolume(cleaned);
    onSave(cleaned);
  }
  const inp = { width: 56, backgroundColor: C.surface, color: C.ink, borderRadius: 8, padding: "6px 8px", fontSize: 15, outline: "none", border: `1px solid ${C.border}`, textAlign: "center" };
  const liveVol = sessionVolume({ exercises: draft.exercises });
  const liveSets = draft.exercises.reduce((a, e) => a + (e.sets || []).length, 0);

  return (
    <div className="px-5 pt-5 pb-32">
      <div className="flex items-center gap-2 mb-4">
        <button onClick={onBack} className="p-2 -ml-2 rounded-lg" aria-label="Back"><ArrowLeft size={20} style={{ color: C.ink2 }} /></button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <div className="w-1 h-4 rounded-full" style={{ backgroundColor: accent }} />
            <h1 className="text-[20px] font-bold tracking-tight truncate" style={{ color: C.ink }}>{draft.dayTitle}</h1>
          </div>
          <div className="text-[12px]" style={{ color: C.ink3 }}>{new Date(draft.date).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" })}</div>
        </div>
      </div>

      {/* Duration editor */}
      <div className="rounded-2xl p-4 mb-4" style={{ backgroundColor: C.surface2, border: `1px solid ${C.border}` }}>
        <div className="text-[12px] font-semibold mb-2" style={{ color: C.ink }}>Workout duration</div>
        <div className="flex items-center gap-2">
          <input type="number" min="0" style={inp} value={hh} onChange={e => setHh(e.target.value)} />
          <span className="text-[12px]" style={{ color: C.ink3 }}>h</span>
          <input type="number" min="0" max="59" style={inp} value={mm} onChange={e => setMm(e.target.value)} />
          <span className="text-[12px]" style={{ color: C.ink3 }}>m</span>
          <input type="number" min="0" max="59" style={inp} value={ss} onChange={e => setSs(e.target.value)} />
          <span className="text-[12px]" style={{ color: C.ink3 }}>s</span>
        </div>
      </div>

      {/* Live totals */}
      <div className="flex gap-2 mb-4">
        <div className="flex-1 rounded-xl p-3 text-center" style={{ backgroundColor: C.surface }}>
          <div className="text-[18px] font-bold tabular-nums" style={{ color: C.ink }}>{liveSets}</div>
          <div className="text-[10px] uppercase tracking-wide font-semibold" style={{ color: C.ink3 }}>Sets</div>
        </div>
        <div className="flex-1 rounded-xl p-3 text-center" style={{ backgroundColor: C.surface }}>
          <div className="text-[18px] font-bold tabular-nums" style={{ color: C.ink }}>{Math.round(liveVol).toLocaleString()}</div>
          <div className="text-[10px] uppercase tracking-wide font-semibold" style={{ color: C.ink3 }}>Volume (lb)</div>
        </div>
      </div>

      {/* Exercises */}
      {draft.exercises.length === 0 ? (
        <div className="text-center py-10 text-[13px]" style={{ color: C.ink3 }}>All exercises removed. Save to keep an empty session, or delete it entirely below.</div>
      ) : draft.exercises.map((e) => (
        <div key={e.exId} className="rounded-2xl mb-2.5 p-3.5" style={{ backgroundColor: C.bg, border: `1px solid ${C.border}` }}>
          <div className="flex items-center justify-between mb-2">
            <div className="text-[14px] font-semibold truncate flex-1" style={{ color: C.ink }}>{e.selectedLift}</div>
            <button onClick={() => removeExercise(e.exId)} className="ml-2 px-2.5 py-1.5 rounded-lg text-[11.5px] font-semibold flex items-center gap-1" style={{ backgroundColor: C.badSoft, color: C.bad }}>
              <Trash2 size={12} /> Remove
            </button>
          </div>
          {(e.sets || []).length === 0 ? (
            <div className="text-[11.5px]" style={{ color: C.ink3 }}>{e.cardio ? "Cardio — timed" : "No sets"}</div>
          ) : e.sets.map((st, i) => (
            <div key={i} className="flex items-center gap-2 py-1">
              <span className="w-5 text-[11px] tabular-nums" style={{ color: C.ink3 }}>{i + 1}</span>
              <input type="number" style={{ ...inp, width: 64 }} value={st.weight} onChange={ev => updateSet(e.exId, i, "weight", ev.target.value)} />
              <span className="text-[11px]" style={{ color: C.ink3 }}>lb</span>
              <input type="number" style={{ ...inp, width: 56 }} value={st.reps} onChange={ev => updateSet(e.exId, i, "reps", ev.target.value)} />
              <span className="text-[11px]" style={{ color: C.ink3 }}>reps</span>
              <button onClick={() => removeSet(e.exId, i)} className="ml-auto w-7 h-7 rounded-lg flex items-center justify-center" style={{ backgroundColor: C.surface }} aria-label="Remove set">
                <X size={13} style={{ color: C.ink3 }} />
              </button>
            </div>
          ))}
        </div>
      ))}

      <button onClick={save} className="w-full rounded-2xl py-3.5 text-[15px] font-semibold flex items-center justify-center gap-2 mt-4 mb-2.5" style={{ backgroundColor: C.ink, color: "#fff" }}>
        <Check size={16} /> Save changes
      </button>
      {confirmDel ? (
        <div className="rounded-2xl p-4" style={{ backgroundColor: C.badSoft }}>
          <div className="text-[13px] font-semibold mb-2" style={{ color: C.bad }}>Delete this entire workout from history?</div>
          <div className="flex gap-2">
            <button onClick={() => onDelete(draft.id)} className="flex-1 rounded-xl py-2.5 text-[13px] font-semibold" style={{ backgroundColor: C.bad, color: "#fff" }}>Delete</button>
            <button onClick={() => setConfirmDel(false)} className="flex-1 rounded-xl py-2.5 text-[13px] font-semibold" style={{ backgroundColor: C.bg, color: C.ink2 }}>Cancel</button>
          </div>
        </div>
      ) : (
        <button onClick={() => setConfirmDel(true)} className="w-full rounded-2xl py-3 text-[13.5px] font-semibold flex items-center justify-center gap-2" style={{ backgroundColor: C.badSoft, color: C.bad }}>
          <Trash2 size={15} /> Delete entire workout
        </button>
      )}
    </div>
  );
}


export function HistoryScreen({ sessions, onDeleteSessions, onContinue, onMerge, onEdit }) {
  const [expanded, setExpanded] = useState(null);
  const [selectMode, setSelectMode] = useState(false);
  const [selected, setSelected] = useState(new Set());
  function toggleSelect(id) { setSelected((p) => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n; }); }
  function deleteSelected() { onDeleteSessions(Array.from(selected)); setSelected(new Set()); setSelectMode(false); }
  function mergeSelected() { onMerge(Array.from(selected)); setSelected(new Set()); setSelectMode(false); }

  return (
    <div className="px-5 pt-6 pb-32">
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-[24px] font-bold tracking-tight" style={{ color: C.ink }}>History</h1>
        {sessions.length > 0 && <button onClick={() => { setSelectMode(!selectMode); setSelected(new Set()); }} className="text-[12.5px] font-semibold" style={{ color: selectMode ? C.bad : C.accent }}>{selectMode ? "Cancel" : "Select"}</button>}
      </div>
      {sessions.length === 0 ? (
        <div className="text-center py-16" style={{ color: C.ink3 }}>
          <Flame size={26} className="mx-auto mb-2" style={{ color: C.ink4 }} />
          <div className="text-[14px]">No sessions yet.</div>
          <div className="text-[12.5px] mt-1">Your finished workouts land here.</div>
        </div>
      ) : (
        <>
          {!selectMode
            ? <div className="text-[11px] mb-2" style={{ color: C.ink3 }}>Swipe a row left to delete · tap Select for bulk</div>
            : <div className="text-[11px] mb-2" style={{ color: C.ink3 }}>Select 2 or more to merge into one session, or delete.</div>}
          <div className="flex flex-col gap-2">{sessions.map((s) => <SwipeSessionRow key={s.id} session={s} expanded={expanded === s.id} onToggle={(id) => setExpanded(expanded === id ? null : id)} onDelete={(id) => onDeleteSessions([id])} selectMode={selectMode} selected={selected.has(s.id)} onSelectToggle={toggleSelect} onContinue={onContinue} onEdit={onEdit} />)}</div>
        </>
      )}
      {selectMode && selected.size > 0 && (
        <div className="fixed left-0 right-0 flex justify-center px-5" style={{ bottom: "calc(env(safe-area-inset-bottom, 0px) + 76px)" }}>
          <div className="max-w-md w-full flex gap-2">
            {selected.size >= 2 && (
              <button onClick={mergeSelected} className="flex-1 rounded-2xl py-3.5 text-[14px] font-semibold flex items-center justify-center gap-2" style={{ backgroundColor: C.accent, color: "#fff" }}><Copy size={15} /> Merge {selected.size}</button>
            )}
            <button onClick={deleteSelected} className="flex-1 rounded-2xl py-3.5 text-[14px] font-semibold flex items-center justify-center gap-2" style={{ backgroundColor: C.bad, color: "#fff" }}><Trash2 size={15} /> Delete {selected.size}</button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ====================================================================== */
/* CALENDAR + DAY DETAIL                                                  */
/* ====================================================================== */

