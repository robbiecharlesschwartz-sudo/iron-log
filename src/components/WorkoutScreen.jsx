import { useEffect, useRef, useState } from "react";
import { Activity, ArrowLeft, Check, ChevronDown, Clock, History, Pause, Play, Plus, SkipForward, Trash2, TrendingDown, TrendingUp, User, X } from "lucide-react";
import { DndContext, DragOverlay, PointerSensor, TouchSensor, closestCenter, useSensor, useSensors } from "@dnd-kit/core";
import { SortableContext, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { restrictToVerticalAxis } from "@dnd-kit/modifiers";
import { Ring } from "./atoms";
import { ACCENT, C, CARD_SHADOW } from "../lib/constants";
import { ex } from "../lib/exerciseLibrary";
import { cancelRestNotification, scheduleRestNotification } from "../lib/notifications";
import { committedAccum, fmtClock, fmtShortDate, formatSetGroups, isCardioExercise, isCardioOnlySession, lastPerformanceFor, liveTimes, relativeDays } from "../lib/sessionUtils";

export function SetRow({ idx, set, prevSet, accent, onChange, onLog, onRemove }) {
  const canLog = set.reps !== "" && !set.done;
  const weightNum = Number(set.weight) || 0;
  const delta = prevSet ? weightNum - (Number(prevSet.weight) || 0) : null;

  if (set.done) {
    return (
      <div className="flex items-center gap-3 py-2 px-1">
        <div className="w-6 h-6 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: C.good }}><Check size={13} color="#fff" strokeWidth={3} /></div>
        <div className="tabular-nums text-[14px]" style={{ color: C.ink }}>{set.weight || 0} <span style={{ color: C.ink3 }}>lb</span> × {set.reps} <span style={{ color: C.ink3 }}>reps</span></div>
        <div className="ml-auto flex items-center gap-2.5">
          {delta !== null && delta !== 0 && <span className="text-[12px] tabular-nums flex items-center gap-0.5" style={{ color: delta > 0 ? C.good : C.bad }}>{delta > 0 ? <TrendingUp size={11} /> : <TrendingDown size={11} />}{delta > 0 ? "+" : ""}{delta}</span>}
          <button onClick={onRemove} className="p-1" aria-label="Remove set"><X size={13} style={{ color: C.ink4 }} /></button>
        </div>
      </div>
    );
  }
  return (
    <div className="py-1.5">
      <div className="flex items-center gap-2">
        <div className="w-6 h-6 rounded-full flex items-center justify-center shrink-0 tabular-nums text-[12px] font-semibold" style={{ border: `1.5px solid ${C.border2}`, color: C.ink3 }}>{idx + 1}</div>
        <div className="flex items-center gap-1 flex-1">
          <input type="number" inputMode="decimal" placeholder={prevSet ? String(prevSet.weight) : "0"} value={set.weight} onChange={(e) => onChange({ ...set, weight: e.target.value })} className="w-16 rounded-xl px-2.5 py-2 text-[15px] tabular-nums outline-none" style={{ backgroundColor: C.surface, color: C.ink }} />
          <span className="text-[11px]" style={{ color: C.ink3 }}>lb</span>
          <input type="number" inputMode="numeric" placeholder={prevSet ? String(prevSet.reps) : "0"} value={set.reps} onChange={(e) => onChange({ ...set, reps: e.target.value })} className="w-14 rounded-xl px-2.5 py-2 text-[15px] tabular-nums outline-none ml-1" style={{ backgroundColor: C.surface, color: C.ink }} />
          <span className="text-[11px]" style={{ color: C.ink3 }}>reps</span>
        </div>
        <button onClick={onLog} disabled={!canLog} className="w-9 h-9 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: canLog ? C.ink : C.surface }}>
          <Check size={15} color={canLog ? "#fff" : C.ink4} strokeWidth={3} />
        </button>
        <button onClick={onRemove} className="w-7 h-7 rounded-full flex items-center justify-center shrink-0" aria-label="Remove set"><X size={13} style={{ color: C.ink4 }} /></button>
      </div>
      {prevSet && (
        <div className="text-[10.5px] tabular-nums mt-0.5 ml-8" style={{ color: C.ink4 }}>
          Last: {prevSet.weight} lb × {prevSet.reps}
        </div>
      )}
    </div>
  );
}

/* ── Cardio per-exercise timer — count up or countdown from goal ─────── */


export function CardioTimer({ exercise }) {
  const [running, setRunning] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [done, setDone] = useState(false);
  const [goalMins, setGoalMins] = useState("");
  const [goalSecs, setGoalSecs] = useState("");
  const [mode, setMode] = useState("up"); // "up" | "down"
  const intervalRef = useRef(null);
  const goalSeconds = (parseInt(goalMins) || 0) * 60 + (parseInt(goalSecs) || 0);
  const hasGoal = goalSeconds > 0;

  useEffect(() => {
    if (running) {
      intervalRef.current = setInterval(() => {
        setElapsed(e => {
          const next = e + 1;
          if (mode === "down" && hasGoal && next >= goalSeconds) { setRunning(false); setDone(true); return goalSeconds; }
          return next;
        });
      }, 1000);
    } else { clearInterval(intervalRef.current); }
    return () => clearInterval(intervalRef.current);
  }, [running, mode, goalSeconds, hasGoal]);

  function start() { setRunning(true); setDone(false); }
  function stop() { setRunning(false); setDone(true); }
  function reset() { setRunning(false); setElapsed(0); setDone(false); }

  const displaySeconds = mode === "down" && hasGoal ? Math.max(0, goalSeconds - elapsed) : elapsed;
  const mins = Math.floor(displaySeconds / 60);
  const secs = displaySeconds % 60;
  const fmt = `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  const progress = hasGoal ? Math.min(1, elapsed / goalSeconds) : null;
  const timerColor = done ? C.good : running ? C.cardio : C.ink;
  const inp = { width: 52, backgroundColor: C.bg, color: C.ink, borderRadius: 8, padding: "4px 8px", fontSize: 15, outline: "none", border: `1px solid ${C.border}`, textAlign: "center" };

  return (
    <div className="rounded-2xl p-4" style={{ backgroundColor: C.surface2, border: `1px solid ${C.border}` }}>
      {/* Mode toggle — always available */}
      {!running && !done && (
        <div className="flex items-center justify-center mb-3">
          <div className="flex rounded-lg overflow-hidden" style={{ border: `1px solid ${C.border}` }}>
            <button onClick={() => setMode("up")} className="px-4 py-1.5 text-[12px] font-semibold" style={{ backgroundColor: mode === "up" ? C.cardio : C.bg, color: mode === "up" ? "#fff" : C.ink3 }}>↑ Count up</button>
            <button onClick={() => setMode("down")} className="px-4 py-1.5 text-[12px] font-semibold" style={{ backgroundColor: mode === "down" ? C.cardio : C.bg, color: mode === "down" ? "#fff" : C.ink3 }}>↓ Countdown</button>
          </div>
        </div>
      )}
      {/* Goal input */}
      {!running && !done && (
        <div className="flex items-center justify-center gap-2 mb-3">
          <span className="text-[11px] font-semibold" style={{ color: C.ink3 }}>{mode === "down" ? "Countdown from" : "Goal"}</span>
          <input type="number" style={inp} placeholder="mm" min="0" value={goalMins} onChange={e => setGoalMins(e.target.value)} />
          <span style={{ color: C.ink3 }}>:</span>
          <input type="number" style={inp} placeholder="ss" min="0" max="59" value={goalSecs} onChange={e => setGoalSecs(e.target.value)} />
          {mode === "up" && <span className="text-[11px]" style={{ color: C.ink4 }}>(optional)</span>}
        </div>
      )}
      {/* Progress bar */}
      {progress !== null && (
        <div className="h-1.5 rounded-full mb-3 overflow-hidden" style={{ backgroundColor: C.border }}>
          <div className="h-full rounded-full transition-all" style={{ width: `${progress * 100}%`, backgroundColor: done ? C.good : C.cardio }} />
        </div>
      )}
      {/* Timer display */}
      <div className="text-[48px] tabular-nums font-bold tracking-tight text-center mb-3" style={{ color: timerColor }}>{fmt}</div>
      {done && <div className="text-[13px] font-semibold text-center mb-3 flex items-center justify-center gap-1.5" style={{ color: C.good }}><Check size={14} /> Done — {String(Math.floor(elapsed/60)).padStart(2,"0")}:{String(elapsed%60).padStart(2,"0")}</div>}
      <div className="flex gap-2">
        {!running && !done && <button onClick={start} disabled={mode === "down" && !hasGoal} className="flex-1 rounded-xl py-3 text-[14px] font-semibold flex items-center justify-center gap-2" style={{ backgroundColor: (mode === "down" && !hasGoal) ? C.border : C.cardio, color: (mode === "down" && !hasGoal) ? C.ink3 : "#fff" }}><Play size={14} /> {mode === "down" && !hasGoal ? "Set a time first" : "Start"}</button>}
        {running && <button onClick={stop} className="flex-1 rounded-xl py-3 text-[14px] font-semibold flex items-center justify-center gap-2" style={{ backgroundColor: C.good, color: "#fff" }}><Check size={14} /> Finish</button>}
        {(done || elapsed > 0) && <button onClick={reset} className="rounded-xl py-3 px-4 text-[13px] font-semibold" style={{ backgroundColor: C.surface, color: C.ink2 }}>Reset</button>}
      </div>
    </div>
  );
}


export function ExerciseCard({ exercise, prev, accent, isOpen, onToggle, onLogSet, onAddSet, onRemoveSet, onSelectLift, onDeleteExercise, onUpdateNotes, dragHandleProps }) {
  const cardio = isCardioExercise(exercise);
  const doneCount = exercise.sets.filter((s) => s.done).length;
  const allDone = cardio ? !!exercise.cardioDone : (doneCount === exercise.sets.length && exercise.sets.length > 0);
  const liftOptions = [exercise.best, ...(exercise.subs || [])];
  const [notesOpen, setNotesOpen] = useState(false);

  return (
    <div className="rounded-2xl mb-2.5 overflow-hidden" style={{ backgroundColor: C.bg, border: `1px solid ${isOpen ? C.border2 : C.border}`, boxShadow: isOpen ? CARD_SHADOW : "none" }}>
      <div className="w-full flex items-center gap-2 p-3.5">
        <div {...(dragHandleProps || {})} className="flex flex-col items-center justify-center gap-[3px] shrink-0 px-2 py-1 -m-1" style={{ touchAction: "none", cursor: "grab", ...(dragHandleProps?.style || {}) }} aria-label="Drag to reorder">
          <span className="block rounded-full" style={{ width: 16, height: 2, backgroundColor: C.ink4 }} />
          <span className="block rounded-full" style={{ width: 16, height: 2, backgroundColor: C.ink4 }} />
          <span className="block rounded-full" style={{ width: 16, height: 2, backgroundColor: C.ink4 }} />
        </div>
        <button onClick={onToggle} className="flex items-center gap-3 flex-1 min-w-0 text-left">
          <div className="flex gap-1 shrink-0">
            {cardio
              ? <Activity size={18} style={{ color: allDone ? C.good : C.ink3 }} />
              : exercise.sets.map((s, i) => <div key={i} className="w-1.5 h-5 rounded-full" style={{ backgroundColor: s.done ? C.good : C.border2 }} />)}
          </div>
          <div className="flex-1 min-w-0">
            {exercise.section && <div className="text-[10px] uppercase tracking-wide font-semibold" style={{ color: C.ink3 }}>{exercise.section}</div>}
            <div className="text-[14px] font-semibold truncate" style={{ color: C.ink }}>{exercise.selectedLift}</div>
            <div className="text-[12px] tabular-nums" style={{ color: C.ink3 }}>{cardio ? "Cardio · timed" : `${exercise.setsLabel} × ${exercise.repsLabel} · rest ${exercise.rest}s`}</div>
            {prev && !cardio && !isOpen && (
              <div className="text-[11.5px] font-semibold tabular-nums mt-0.5 flex items-center gap-1" style={{ color: accent }}>
                <Clock size={11} /> Last: {formatSetGroups(prev.sets).map((g) => g.parts.join(", ")).join(" → ")}
              </div>
            )}
          </div>
          {allDone && <Check size={16} style={{ color: C.good }} />}
          <ChevronDown size={16} style={{ color: C.ink4, transform: isOpen ? "rotate(180deg)" : "none", transition: "transform 0.2s" }} />
        </button>
      </div>
      {isOpen && (
        <div className="px-3.5 pb-3.5">
          {/* Notes + delete controls (reorder is in the header) */}
          <div className="flex items-center gap-1.5 mb-3">
            <button onClick={() => setNotesOpen(v => !v)} className="h-8 px-2.5 rounded-lg flex items-center gap-1.5 text-[12px] font-semibold" style={{ backgroundColor: exercise.notes ? C.accentSoft : C.surface, color: exercise.notes ? C.accent : C.ink2 }}>
              <Activity size={13} /> Notes{exercise.notes ? " ✓" : ""}
            </button>
            <button onClick={onDeleteExercise} className="h-8 px-2.5 rounded-lg flex items-center gap-1.5 text-[12px] font-semibold ml-auto" style={{ backgroundColor: C.badSoft, color: C.bad }}><Trash2 size={13} /> Remove</button>
          </div>

          {notesOpen && (
            <textarea value={exercise.notes || ""} onChange={e => onUpdateNotes(exercise.exId, e.target.value)} placeholder="Notes for this exercise (e.g. felt strong, tweaked grip)…"
              className="w-full rounded-xl px-3 py-2.5 text-[13px] outline-none mb-3 resize-none" rows={2} style={{ backgroundColor: C.surface, color: C.ink, border: `1px solid ${C.border}` }} />
          )}

          {liftOptions.length > 1 && (
            <div className="flex gap-1.5 mb-3 flex-wrap">
              {liftOptions.map((liftName) => (
                <button key={liftName} onClick={() => onSelectLift(liftName)} className="text-[12px] px-2.5 py-1 rounded-full font-medium"
                  style={{ backgroundColor: exercise.selectedLift === liftName ? C.ink : C.surface, color: exercise.selectedLift === liftName ? "#fff" : C.ink2 }}>
                  {liftName === exercise.best ? `${liftName} · best` : liftName}
                </button>
              ))}
            </div>
          )}
          {prev && !cardio && (
            <div className="text-[12px] mb-2" style={{ color: C.ink3 }}>
              Last time ({relativeDays(prev.date)}): {formatSetGroups(prev.sets).map((g) => `${g.parts.join(", ")}${g.lift && g.lift !== exercise.selectedLift ? ` (${g.lift})` : ""}`).join(" → ")}
            </div>
          )}
          {cardio ? (
            <CardioTimer exercise={exercise} />
          ) : (
            <>
              <div className="rounded-xl px-2" style={{ backgroundColor: C.surface2, border: `1px solid ${C.border}` }}>
                {exercise.sets.map((s, i) => (
                  <SetRow key={i} idx={i} set={s} prevSet={prev?.sets?.[i] || null} accent={accent}
                    onChange={(ns) => onLogSet(exercise.exId, i, ns, false)}
                    onLog={() => onLogSet(exercise.exId, i, { ...s, done: true, lift: exercise.selectedLift }, true)}
                    onRemove={() => onRemoveSet(exercise.exId, i)} />
                ))}
                {exercise.sets.length === 0 && <div className="text-[12px] py-3 text-center" style={{ color: C.ink3 }}>No sets yet — add one below.</div>}
              </div>
              <button onClick={() => onAddSet(exercise.exId)} className="flex items-center gap-1.5 mt-2.5 text-[12px] font-semibold" style={{ color: C.accent }}><Plus size={14} /> Add set</button>
            </>
          )}
        </div>
      )}
    </div>
  );
}

/* ====================================================================== */
/* WORKOUT — white, sticky Finish at the bottom                          */
/* ====================================================================== */
/* ── Floating "add exercise" button ──────────────────────────────────── */


export function FloatingAddButton({ onClick, label = "Add exercise", bottom = 90 }) {
  return (
    <button onClick={onClick} aria-label={label}
      className="fixed right-5 z-30 flex items-center gap-2 rounded-full pl-4 pr-5 py-3.5"
      style={{ bottom: `calc(env(safe-area-inset-bottom, 0px) + ${bottom}px)`, backgroundColor: C.ink, color: "#fff", boxShadow: "0 10px 28px rgba(0,0,0,0.3)" }}>
      <Plus size={18} /><span className="text-[13.5px] font-semibold">{label}</span>
    </button>
  );
}

/* ── Drag-to-reorder + swipe-to-delete list ───────────────────────────────
   Geometry-based: the dragged card follows the finger exactly, sibling cards
   slide out of the way in real time, and the drop lands where you see the gap. */


export function DragSwipeList({ items, onReorder, onDelete, renderItem, keyFor: getKey }) {
  const [activeId, setActiveId] = useState(null);
  const [swipe, setSwipe] = useState({ id: null, dx: 0, open: false });
  const swipeStart = useRef({ x: 0, y: 0 });
  const swipeMode = useRef(null); // "swipe" | null — never fights the drag handle, they occupy different DOM nodes

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 120, tolerance: 6 } })
  );

  const ids = items.map((it, i) => getKey(it, i));
  const activeIndex = activeId != null ? ids.indexOf(activeId) : -1;
  const activeItem = activeIndex >= 0 ? items[activeIndex] : null;

  function handleDragStart(e) {
    setActiveId(e.active.id);
    if (navigator.vibrate) navigator.vibrate(10);
  }
  function handleDragEnd(e) {
    const { active, over } = e;
    setActiveId(null);
    if (!over || active.id === over.id) return;
    const from = ids.indexOf(active.id);
    const to = ids.indexOf(over.id);
    if (from >= 0 && to >= 0) onReorder(from, to);
  }
  function handleDragCancel() { setActiveId(null); }

  // Swipe-to-delete: lives entirely on the card body's own touch events, completely
  // independent of dnd-kit (which only listens on the drag handle) — no gesture conflict.
  const DELETE_W = 84;
  function onTouchStart(id, e) {
    if (e.touches.length !== 1) return;
    swipeStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    swipeMode.current = null;
    if (swipe.open && swipe.id !== id) setSwipe({ id: null, dx: 0, open: false });
  }
  function onTouchMove(id, e) {
    const t = e.touches[0];
    const dx = t.clientX - swipeStart.current.x;
    const dy = t.clientY - swipeStart.current.y;
    if (swipeMode.current === null) {
      if (Math.abs(dx) > 10 && Math.abs(dx) > Math.abs(dy)) swipeMode.current = "swipe";
      else if (Math.abs(dy) > 10) swipeMode.current = "scroll";
    }
    if (swipeMode.current === "swipe") {
      e.preventDefault();
      const base = swipe.open && swipe.id === id ? -DELETE_W : 0;
      setSwipe({ id, dx: Math.max(-DELETE_W - 24, Math.min(0, base + dx)), open: swipe.open && swipe.id === id });
    }
  }
  function onTouchEnd(id) {
    if (swipeMode.current === "swipe") {
      const open = swipe.dx < -DELETE_W / 2;
      setSwipe({ id, dx: open ? -DELETE_W : 0, open });
    }
    swipeMode.current = null;
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      modifiers={[restrictToVerticalAxis]}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <SortableContext items={ids} strategy={verticalListSortingStrategy}>
        <div style={{ userSelect: activeId ? "none" : "auto", WebkitUserSelect: activeId ? "none" : "auto" }}>
          {items.map((item, i) => {
            const id = getKey(item, i);
            const sx = swipe.id === id ? swipe.dx : 0;
            return (
              <SortableRow key={id} id={id} isBeingDragged={activeId === id}>
                {(handleProps, isDragging) => (
                  <div className="relative mb-2.5">
                    {/* Delete action revealed by swipe */}
                    <div className="absolute inset-y-0 right-0 flex items-center" style={{ width: DELETE_W }}>
                      <button onClick={() => { onDelete(i); setSwipe({ id: null, dx: 0, open: false }); }}
                        className="h-full w-full rounded-2xl flex flex-col items-center justify-center gap-1"
                        style={{ backgroundColor: C.bad, color: "#fff" }}>
                        <Trash2 size={18} /><span className="text-[11px] font-semibold">Delete</span>
                      </button>
                    </div>
                    <div
                      onTouchStart={(e) => onTouchStart(id, e)}
                      onTouchMove={(e) => onTouchMove(id, e)}
                      onTouchEnd={() => onTouchEnd(id)}
                      onTouchCancel={() => onTouchEnd(id)}
                      style={{
                        transform: isDragging ? undefined : `translate3d(${sx}px, 0, 0)`,
                        transition: swipeMode.current === "swipe" ? "none" : "transform 0.2s cubic-bezier(.2,.8,.3,1)",
                        opacity: isDragging ? 0 : 1, // real row hides; DragOverlay clone shows in its place
                        position: "relative",
                        borderRadius: 16,
                      }}
                    >
                      {renderItem(item, i, false, handleProps)}
                    </div>
                  </div>
                )}
              </SortableRow>
            );
          })}
        </div>
      </SortableContext>

      {/* Floating clone that follows the pointer with zero list-reflow lag */}
      <DragOverlay dropAnimation={{ duration: 180, easing: "cubic-bezier(.2,.8,.3,1)" }} zIndex={60}>
        {activeItem ? (
          <div style={{ transform: "scale(1.02)", boxShadow: "0 16px 36px rgba(0,0,0,0.28)", opacity: 0.97, borderRadius: 16, cursor: "grabbing" }}>
            {renderItem(activeItem, activeIndex, true, {})}
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}

// Thin per-row sortable wrapper — isolates dnd-kit's transform/listeners so only the
// dragged row (and its immediate render) ever re-renders during a drag, not the whole list.


export function SortableRow({ id, isBeingDragged, children }) {
  const { setNodeRef, transform, transition, isDragging, attributes, listeners } = useSortable({ id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition: isDragging ? "none" : transition,
    zIndex: isDragging ? 40 : "auto",
    touchAction: "none", // handle-only: prevents the drag handle from also trying to scroll the page
  };
  return (
    <div ref={setNodeRef} style={{ transform: style.transform, transition: style.transition, zIndex: style.zIndex }}>
      {children({ ...attributes, ...listeners, style: { touchAction: "none", cursor: "grab" } }, isDragging)}
    </div>
  );
}


export function WorkoutScreen({ active, setActive, sessions, persistActive, onFinish, onExit, onAddExercise, onDiscard }) {
  const accent = isCardioOnlySession(active.exercises) ? C.cardio : (ACCENT[active.dayTag] || C.accent);
  const [openExId, setOpenExId] = useState(() => active.exercises.find((e) => (e.sets || []).some((s) => !s.done))?.exId || active.exercises[0]?.exId || null);
  const [, forceTick] = useState(0);
  const [inSet, setInSet] = useState(false);
  const [setStart, setSetStart] = useState(null);
  const [confirmFinish, setConfirmFinish] = useState(false);
  const [confirmDiscard, setConfirmDiscard] = useState(false);

  useEffect(() => { const id = setInterval(() => forceTick((n) => n + 1), 1000); return () => clearInterval(id); }, []);

  // Rest timer LOOPS — when it expires it resets (no auto-end). User must press Skip or Start Set.
  // No auto-endRest useEffect here intentionally.

  // Schedule a background notification for when rest completes; cancel when rest ends.
  // Only fires if the user has left the app (handled inside the service worker).
  useEffect(() => {
    if (active.phase === "resting" && active.restTarget > 0) {
      const elapsed = (Date.now() - active.phaseStartedAt) / 1000;
      const remaining = Math.max(0, active.restTarget - elapsed);
      const nt = nextUndone(active.exercises);
      const ex = nt ? active.exercises.find((e) => e.exId === nt.exId) : null;
      const label = ex ? ex.selectedLift : "";
      scheduleRestNotification(remaining * 1000, label);
    } else {
      cancelRestNotification();
    }
    // eslint-disable-next-line
  }, [active.phase, active.phaseStartedAt, active.restTarget]);

  // Clean up any pending notification when leaving the workout screen.
  useEffect(() => () => cancelRestNotification(), []);

  /* ---------------------------------------------------------------------- */
  /* Helper: find the globally next uncompleted set (in exercise order)     */
  /* ---------------------------------------------------------------------- */
  function nextUndone(exercises) {
    for (const e of exercises) {
      const i = e.sets.findIndex((s) => !s.done);
      if (i !== -1) return { exId: e.exId, setIdx: i };
    }
    return null; // all sets complete
  }

  function endRest() {
    const now = Date.now();
    const next = { ...active, ...committedAccum(active, now), phase: "working", phaseStartedAt: now, restTarget: 0 };
    setActive(next); persistActive(next);
    setInSet(false); setSetStart(null);
    // Auto-open the next exercise that has uncompleted sets
    const nxt = nextUndone(next.exercises);
    if (nxt) setOpenExId(nxt.exId);
  }
  function adjustRest(d) { const next = { ...active, restTarget: Math.max(5, active.restTarget + d) }; setActive(next); persistActive(next); }
  function togglePause() {
    const now = Date.now();
    if (active.phase === "paused") { const next = { ...active, phase: "working", phaseStartedAt: now }; setActive(next); persistActive(next); }
    else { const next = { ...active, ...committedAccum(active, now), phase: "paused", phaseStartedAt: now, restTarget: 0 }; setActive(next); persistActive(next); }
  }

  function handleStartSet() {
    const target = nextUndone(active.exercises);
    if (!target) return;
    setInSet(true); setSetStart(Date.now());
    // Jump to the exercise card that owns the next set
    if (openExId !== target.exId) setOpenExId(target.exId);
  }

  function handleEndSet() {
    const target = nextUndone(active.exercises);
    setInSet(false); setSetStart(null);
    if (!target || active.phase === "resting") return;
    const ex = active.exercises.find((e) => e.exId === target.exId);
    if (!ex) return;
    const s = ex.sets[target.setIdx];
    const lastDone = ex.sets.slice(0, target.setIdx).filter((x) => x.done).pop();
    const weight = s.weight !== "" ? s.weight : (lastDone?.weight ?? "");
    const reps = s.reps !== "" ? s.reps : (lastDone?.reps ?? "");
    const loggedSet = { ...s, weight, reps, done: true, lift: ex.selectedLift };
    const now = Date.now();
    let exercises = active.exercises.map((e) =>
      e.exId !== target.exId ? e : { ...e, sets: e.sets.map((st, i) => i === target.setIdx ? loggedSet : st) }
    );
    // Auto-fill next undone set in same exercise with the logged weight/reps (if still empty)
    exercises = exercises.map((e) => {
      if (e.exId !== target.exId) return e;
      return { ...e, sets: e.sets.map((st, i) => {
        if (i <= target.setIdx || st.done) return st;
        return { ...st, weight: st.weight || weight, reps: st.reps || reps };
      })};
    });
    const afterTarget = nextUndone(exercises);
    if (afterTarget && afterTarget.exId !== target.exId) { /* next exercise — endRest will open it */ }
    const next = { ...active, exercises, ...committedAccum(active, now), phase: "resting", phaseStartedAt: now, restTarget: ex.rest };
    setActive(next); persistActive(next);
  }

  function handleLogSet(exId, setIdx, newSet, isLog) {
    const now = Date.now();
    if (isLog) { setInSet(false); setSetStart(null); }
    let exercises = active.exercises.map((e) => e.exId === exId ? { ...e, sets: e.sets.map((s, i) => i === setIdx ? newSet : s) } : e);
    // Auto-fill next undone sets in same exercise when logging a set
    if (isLog) {
      exercises = exercises.map((e) => {
        if (e.exId !== exId) return e;
        return { ...e, sets: e.sets.map((st, i) => {
          if (i <= setIdx || st.done) return st;
          return { ...st, weight: st.weight || newSet.weight || "", reps: st.reps || newSet.reps || "" };
        })};
      });
    }
    let next = { ...active, exercises };
    if (isLog && active.phase !== "resting") {
      const ex2 = exercises.find((e) => e.exId === exId);
      next = { ...next, ...committedAccum(active, now), phase: "resting", phaseStartedAt: now, restTarget: ex2.rest };
      if (ex2.sets.every((s) => s.done)) {
        const nxt = exercises.find((e) => e.exId !== exId && e.sets.some((s) => !s.done));
        if (nxt) setOpenExId(nxt.exId);
      }
    } else if (isLog) {
      const ex2 = exercises.find((e) => e.exId === exId);
      if (ex2.sets.every((s) => s.done)) {
        const nxt = exercises.find((e) => e.exId !== exId && e.sets.some((s) => !s.done));
        if (nxt) setOpenExId(nxt.exId);
      }
    }
    setActive(next);
    if (isLog) persistActive(next);
  }
  function handleAddSet(exId) { const next = { ...active, exercises: active.exercises.map((e) => e.exId === exId ? { ...e, sets: [...e.sets, { weight: "", reps: "", done: false }] } : e) }; setActive(next); persistActive(next); }
  function handleRemoveSet(exId, i) { const next = { ...active, exercises: active.exercises.map((e) => e.exId === exId ? { ...e, sets: e.sets.filter((_, j) => j !== i) } : e) }; setActive(next); persistActive(next); }
  function handleSelectLift(exId, lift) { const next = { ...active, exercises: active.exercises.map((e) => e.exId === exId ? { ...e, selectedLift: lift } : e) }; setActive(next); persistActive(next); }
  function handleMoveExercise(exId, dir) {
    const idx = active.exercises.findIndex(e => e.exId === exId);
    const swap = idx + dir;
    if (idx < 0 || swap < 0 || swap >= active.exercises.length) return;
    const arr = [...active.exercises];
    [arr[idx], arr[swap]] = [arr[swap], arr[idx]];
    const next = { ...active, exercises: arr }; setActive(next); persistActive(next);
  }
  function handleReorderTo(fromIdx, toIdx) {
    if (fromIdx === toIdx || fromIdx < 0 || toIdx < 0) return;
    const arr = [...active.exercises];
    if (fromIdx >= arr.length || toIdx >= arr.length) return;
    const [moved] = arr.splice(fromIdx, 1);
    arr.splice(toIdx, 0, moved);
    const next = { ...active, exercises: arr }; setActive(next); persistActive(next);
  }
  function handleDeleteExercise(exId) {
    const next = { ...active, exercises: active.exercises.filter(e => e.exId !== exId) };
    setActive(next); persistActive(next);
    if (openExId === exId) { const nxt = next.exercises[0]; setOpenExId(nxt ? nxt.exId : null); }
  }
  function handleUpdateNotes(exId, notes) {
    const next = { ...active, exercises: active.exercises.map(e => e.exId === exId ? { ...e, notes } : e) };
    setActive(next); persistActive(next);
  }

  const now = Date.now();
  const t = liveTimes(active, now);
  const setDuration = inSet && setStart ? Math.max(0, (now - setStart) / 1000) : 0;
  const resting = active.phase === "resting";
  const paused = active.phase === "paused";

  const restElapsed = resting ? (now - active.phaseStartedAt) / 1000 : 0;
  const restOver = resting && active.restTarget > 0 && restElapsed > active.restTarget;
  const restRemaining = resting && active.restTarget > 0 ? Math.max(0, active.restTarget - restElapsed) : 0;
  const restOvertime = restOver ? restElapsed - active.restTarget : 0;

  const nextTarget = nextUndone(active.exercises);
  const targetEx = nextTarget ? active.exercises.find((e) => e.exId === nextTarget.exId) : null;
  const targetSetNum = nextTarget ? nextTarget.setIdx + 1 : null;
  const targetSetTotal = targetEx ? targetEx.sets.length : 0;
  const targetIsNewEx = targetEx && targetEx.exId !== openExId;
  const allDoneFlag = !nextTarget;
  const targetExShort = targetEx ? targetEx.selectedLift.split(" ").slice(0, 3).join(" ") : "";

  const ringFraction = inSet ? 1 : (resting ? (restOver ? 1 : (active.restTarget > 0 ? restRemaining / active.restTarget : 0)) : 1);
  const ringColor = inSet ? C.good : (resting ? (restOver ? C.bad : C.warn) : (paused ? C.ink4 : C.ink));
  const setsLogged = active.exercises.reduce((a, e) => a + e.sets.filter((s) => s.done).length, 0);
  const setsPlanned = active.exercises.reduce((a, e) => a + e.sets.length, 0);
  // Pure cardio session = no sets at all (most reliable guard, covers all exercise creation paths)
  const noSets = setsPlanned === 0;

  return (
    <div className="pb-10" style={{ backgroundColor: C.bg }}>
      <div className="sticky z-10 px-5 pt-3 pb-4" style={{ top: "env(safe-area-inset-top, 0px)", backgroundColor: C.bg, borderBottom: `1px solid ${C.border}` }}>
        <div className="flex items-center justify-between mb-1">
          <button onClick={onExit} className="p-2 -ml-2 rounded-lg" aria-label="Back"><ArrowLeft size={20} style={{ color: C.ink2 }} /></button>
          <div className="text-center">
            <div className="text-[15px] font-bold tracking-tight" style={{ color: C.ink }}>{active.dayTitle}</div>
            <div className="text-[11px] tabular-nums" style={{ color: C.ink3 }}>
              {noSets ? `${fmtClock(t.total)} · cardio` : `${setsLogged}/${setsPlanned} sets · ${fmtClock(t.total)}`}
            </div>
          </div>
          <button onClick={() => setConfirmFinish(true)} className="px-3 py-1.5 -mr-1 rounded-xl text-[12.5px] font-semibold flex items-center gap-1.5" style={{ backgroundColor: C.good, color: "#fff" }} aria-label="Finish workout"><Check size={14} /> Finish</button>
        </div>

        {noSets ? (
          <div className="flex items-center justify-between mt-2 px-1">
            <div className="flex items-center gap-2">
              <span className="tabular-nums text-[22px] font-bold leading-none" style={{ color: paused ? C.ink3 : C.cardio }}>{fmtClock(t.total)}</span>
              <span className="text-[10px] uppercase tracking-[0.1em] font-semibold" style={{ color: C.ink4 }}>{paused ? "paused" : "session"}</span>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={togglePause} className="w-9 h-9 rounded-full flex items-center justify-center" style={{ backgroundColor: paused ? C.ink : C.surface, border: `1px solid ${paused ? C.ink : C.border2}` }} aria-label={paused ? "Resume" : "Pause"}>
                {paused ? <Play size={15} style={{ color: "#fff" }} /> : <Pause size={15} style={{ color: C.ink3 }} />}
              </button>
              <button onClick={() => setConfirmFinish(true)} className="px-4 py-2 rounded-xl text-[13px] font-semibold flex items-center gap-1.5" style={{ backgroundColor: C.good, color: "#fff" }}>
                <Check size={14} /> Finish
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center mt-2">
            <Ring size={180} strokeWidth={9} fraction={ringFraction} color={ringColor}>
              {inSet ? (
                <>
                  <span className="tabular-nums text-[40px] font-bold leading-none" style={{ color: C.good }}>{fmtClock(setDuration)}</span>
                  <span className="text-[11px] font-semibold mt-1" style={{ color: C.good }}>
                    SET {targetSetNum}{targetSetTotal > 1 ? ` OF ${targetSetTotal}` : ""}
                  </span>
                </>
              ) : (
                <>
                  <span className="tabular-nums text-[34px] font-bold leading-none" style={{ color: resting ? C.ink3 : C.ink }}>{fmtClock(t.work)}</span>
                  <span className="text-[9px] uppercase tracking-[0.12em] font-semibold mt-0.5" style={{ color: resting ? C.ink4 : C.ink2 }}>Working</span>
                  <div className="w-6 h-px my-1" style={{ backgroundColor: C.border2 }} />
                  <span className="tabular-nums text-[18px] font-bold leading-none" style={{ color: resting ? (restOver ? C.bad : C.warn) : C.ink3 }}>
                    {resting ? (restOver ? `+${fmtClock(restOvertime)}` : fmtClock(restRemaining)) : fmtClock(t.rest)}
                  </span>
                  <span className="text-[9px] uppercase tracking-[0.1em] font-semibold mt-0.5" style={{ color: resting ? (restOver ? C.bad : C.warn) : C.ink4 }}>
                    {resting ? (restOver ? "Overtime" : "Rest left") : "Resting"}
                  </span>
                </>
              )}
            </Ring>

            {resting ? (
              <div className="flex gap-2 mt-3">
                <button onClick={() => adjustRest(-15)} className="px-3.5 py-2 rounded-xl text-[12px] font-semibold" style={{ backgroundColor: C.surface, color: C.ink2 }}>−15s</button>
                <button onClick={() => adjustRest(15)} className="px-3.5 py-2 rounded-xl text-[12px] font-semibold" style={{ backgroundColor: C.surface, color: C.ink2 }}>+15s</button>
                {restOver ? (
                  <button onClick={() => { endRest(); handleStartSet(); }} className="px-4 py-2 rounded-xl text-[13px] font-semibold flex items-center gap-1.5" style={{ backgroundColor: C.ink, color: "#fff" }}>
                    <Play size={13} /> Start Set {targetSetNum || ""}
                  </button>
                ) : (
                  <button onClick={endRest} className="px-4 py-2 rounded-xl text-[12px] font-semibold uppercase flex items-center gap-1.5" style={{ backgroundColor: C.warn, color: "#fff" }}><SkipForward size={13} /> Skip</button>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-3 mt-3" style={{ width: 232 }}>
                <button onClick={togglePause} className="w-10 h-10 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: paused ? C.ink : C.surface, border: `1px solid ${paused ? C.ink : C.border2}` }} aria-label={paused ? "Resume" : "Pause"}>
                  {paused ? <Play size={16} style={{ color: "#fff" }} /> : <Pause size={16} style={{ color: C.ink3 }} />}
                </button>
                {allDoneFlag ? (
                  <button onClick={() => setConfirmFinish(true)} className="flex-1 py-3 rounded-2xl text-[14px] font-semibold flex items-center justify-center gap-1.5" style={{ backgroundColor: C.good, color: "#fff" }}>
                    <Check size={15} /> Finish workout
                  </button>
                ) : (
                  <button onClick={inSet ? handleEndSet : handleStartSet} className="flex-1 rounded-2xl flex flex-col items-center justify-center py-2.5 gap-0.5" style={{ backgroundColor: inSet ? C.good : C.ink, color: "#fff", minHeight: 48 }}>
                    <span className="text-[14px] font-semibold leading-tight">
                      {inSet ? `End Set ${targetSetNum}` : `Start Set ${targetSetNum}`}
                    </span>
                    <span className="text-[10px] leading-tight" style={{ opacity: 0.65 }}>
                      {targetIsNewEx ? targetExShort : `${targetSetNum} of ${targetSetTotal} · ${targetExShort}`}
                    </span>
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="px-5 pt-4">
        <DragSwipeList
          items={active.exercises}
          keyFor={(e) => e.exId}
          onReorder={handleReorderTo}
          onDelete={(i) => { const ex = active.exercises[i]; if (ex) handleDeleteExercise(ex.exId); }}
          renderItem={(e, idx, isDragging, handleProps) => (
            <ExerciseCard exercise={e} prev={lastPerformanceFor(sessions, e.selectedLift)} accent={accent}
              isOpen={!isDragging && openExId === e.exId} onToggle={() => setOpenExId(openExId === e.exId ? null : e.exId)}
              onLogSet={handleLogSet} onAddSet={handleAddSet} onRemoveSet={handleRemoveSet} onSelectLift={(l) => handleSelectLift(e.exId, l)}
              onDeleteExercise={() => handleDeleteExercise(e.exId)}
              onUpdateNotes={handleUpdateNotes} dragHandleProps={handleProps} />
          )}
        />
        <button onClick={onAddExercise} className="w-full rounded-2xl py-3.5 mt-1 flex items-center justify-center gap-2 text-[13px] font-semibold" style={{ backgroundColor: C.surface, color: C.ink2 }}><Plus size={15} /> Add exercise</button>

        {/* Finish workout — non-floating, at bottom of scroll */}
        <button onClick={() => setConfirmFinish(true)} className="w-full rounded-2xl py-4 text-[15px] font-semibold flex items-center justify-center gap-2 mt-4 mb-10" style={{ backgroundColor: C.ink, color: "#fff" }}>
          <Check size={17} /> Finish workout
        </button>
      </div>

      <FloatingAddButton onClick={onAddExercise} bottom={24} />

      {/* Confirm finish modal */}
      {confirmFinish && (
        <div className="fixed inset-0 z-50 flex items-end justify-center" style={{ backgroundColor: "rgba(0,0,0,0.4)" }} onClick={() => { setConfirmFinish(false); setConfirmDiscard(false); }}>
          <div className="w-full max-w-md rounded-t-3xl p-5 pb-8" style={{ backgroundColor: C.bg }} onClick={e => e.stopPropagation()}>
            <div className="w-10 h-1 rounded-full mx-auto mb-4" style={{ backgroundColor: C.border2 }} />
            {confirmDiscard ? (
              <>
                <h3 className="text-[18px] font-bold tracking-tight mb-1" style={{ color: C.bad }}>Delete this workout?</h3>
                <p className="text-[13px] mb-5" style={{ color: C.ink3 }}>This permanently discards the session and everything logged in it. It won't be saved to your history. This can't be undone.</p>
                <button onClick={() => { setConfirmFinish(false); setConfirmDiscard(false); onDiscard && onDiscard(); }} className="w-full rounded-2xl py-3.5 text-[15px] font-semibold mb-2.5 flex items-center justify-center gap-2" style={{ backgroundColor: C.bad, color: "#fff" }}>
                  <Trash2 size={16} /> Yes, delete workout
                </button>
                <button onClick={() => setConfirmDiscard(false)} className="w-full rounded-2xl py-3 text-[14px] font-semibold" style={{ backgroundColor: C.surface, color: C.ink2 }}>
                  Back
                </button>
              </>
            ) : (
              <>
                <h3 className="text-[18px] font-bold tracking-tight mb-1" style={{ color: C.ink }}>Finish this workout?</h3>
                <p className="text-[13px] mb-5" style={{ color: C.ink3 }}>You logged {setsLogged} of {setsPlanned} sets. You can reopen and continue this session later from History if you need to.</p>
                <button onClick={() => { setConfirmFinish(false); onFinish(active); }} className="w-full rounded-2xl py-3.5 text-[15px] font-semibold mb-2.5 flex items-center justify-center gap-2" style={{ backgroundColor: C.good, color: "#fff" }}>
                  <Check size={16} /> Yes, finish workout
                </button>
                <button onClick={() => setConfirmFinish(false)} className="w-full rounded-2xl py-3 text-[14px] font-semibold mb-2.5" style={{ backgroundColor: C.surface, color: C.ink2 }}>
                  Keep training
                </button>
                <button onClick={() => setConfirmDiscard(true)} className="w-full rounded-2xl py-3 text-[13.5px] font-semibold flex items-center justify-center gap-2" style={{ backgroundColor: C.badSoft, color: C.bad }}>
                  <Trash2 size={15} /> Delete workout without saving
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* ====================================================================== */
/* SUMMARY                                                                */
/* ====================================================================== */


export function SummaryScreen({ session, onDone }) {
  const cards = [["Total time", fmtClock(session.totalElapsedSeconds)], ["Working", fmtClock(session.workSeconds)], ["Resting", fmtClock(session.restSeconds)], ["Volume", `${session.volume.toLocaleString()} lb`]];
  return (
    <div className="px-5 pt-14 pb-10 flex flex-col items-center">
      <div className="w-16 h-16 rounded-full flex items-center justify-center mb-4" style={{ backgroundColor: C.goodSoft }}><Check size={28} style={{ color: C.good }} strokeWidth={3} /></div>
      <div className="text-[20px] font-bold tracking-tight mb-1" style={{ color: C.ink }}>{session.dayTitle} complete</div>
      <div className="text-[13px] mb-7" style={{ color: C.ink3 }}>Logged {fmtShortDate(session.date)}</div>
      <div className="grid grid-cols-2 gap-2.5 w-full max-w-xs mb-3">
        {cards.map(([l, v]) => (
          <div key={l} className="rounded-2xl p-3.5" style={{ backgroundColor: C.surface }}>
            <div className="tabular-nums text-[17px] font-bold" style={{ color: C.ink }}>{v}</div>
            <div className="text-[10px] uppercase tracking-wide mt-0.5" style={{ color: C.ink3 }}>{l}</div>
          </div>
        ))}
      </div>
      <button onClick={onDone} className="w-full max-w-xs rounded-2xl py-3.5 text-[15px] font-semibold mt-3" style={{ backgroundColor: C.ink, color: "#fff" }}>Done</button>
    </div>
  );
}

/* ====================================================================== */
/* NEW DAY                                                                */
/* ====================================================================== */

