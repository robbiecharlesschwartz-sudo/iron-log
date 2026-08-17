import { useMemo, useState } from "react";
import { ArrowLeft, ArrowUpRight, ChevronRight, Play, Plus, RefreshCw, Search, Sparkles, Trash2 } from "lucide-react";
import { CatTag, InsightCard, Logo, SwipeableCard } from "./atoms";
import { C, CARD_SHADOW } from "../lib/constants";
import { WORKOUT_TEMPLATES } from "../lib/exerciseLibrary";
import { computeStreak, estDurationMin, lastSessionForDay, weekStats } from "../lib/insights";
import { dayAccentColor, relativeDays } from "../lib/sessionUtils";

export function HomeScreen({ sessions, activeSession, days, onSelectDay, onResume, onDiscard, onNewDay, onOpenCoach, onOpenLibrary, insights, nextDay, onDeleteDay, onDuplicateDay, onChangePlan }) {
  const wk = useMemo(() => weekStats(sessions), [sessions]);
  const streak = useMemo(() => computeStreak(sessions), [sessions]);
  const last = sessions[0];
  const nextAccent = nextDay ? dayAccentColor(nextDay) : C.accent;
  const nextLast = nextDay ? lastSessionForDay(sessions, nextDay.id) : null;

  return (
    <div className="px-5 pt-6 pb-32">
      <div className="flex items-center gap-2.5 mb-7">
        <Logo size={32} />
        <div className="flex-1">
          <div className="text-[19px] font-bold tracking-tight leading-none" style={{ color: C.ink }}>Iron Log</div>
        </div>
        <button onClick={onOpenLibrary} className="p-2 rounded-full" style={{ backgroundColor: C.surface }} aria-label="Library">
          <Search size={16} style={{ color: C.ink2 }} />
        </button>
        <button onClick={onOpenCoach} className="flex items-center gap-1.5 px-3 py-2 rounded-full" style={{ backgroundColor: C.accentSoft }}>
          <Sparkles size={14} style={{ color: C.accent }} />
          <span className="text-[12px] font-semibold" style={{ color: C.accentInk }}>Coach</span>
        </button>
      </div>

      {activeSession && (
        <button onClick={onResume} className="w-full rounded-2xl p-4 mb-4 flex items-center gap-3 text-left" style={{ backgroundColor: C.ink }}>
          <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: "rgba(255,255,255,0.12)" }}>
            <Play size={16} style={{ color: "#fff" }} fill="#fff" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[14px] font-semibold" style={{ color: "#fff" }}>Resume {activeSession.dayTitle}</div>
            <div className="text-[12px]" style={{ color: "rgba(255,255,255,0.6)" }}>Workout in progress</div>
          </div>
          <span onClick={(e) => { e.stopPropagation(); onDiscard(); }} className="p-2 rounded-lg" style={{ backgroundColor: "rgba(255,255,255,0.08)" }}><Trash2 size={14} style={{ color: "rgba(255,255,255,0.7)" }} /></span>
        </button>
      )}

      {/* Today / Next up */}
      {nextDay && !activeSession && (
        <div className="rounded-3xl p-5 mb-4" style={{ backgroundColor: C.bg, border: `1px solid ${C.border}`, boxShadow: CARD_SHADOW }}>
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-bold uppercase tracking-[0.14em]" style={{ color: C.ink3 }}>Next up</span>
            <CatTag tag={nextDay.tag} colorOverride={nextAccent} />
          </div>
          <div className="text-[26px] font-bold tracking-tight leading-none mb-1.5" style={{ color: C.ink }}>{nextDay.title}</div>
          <div className="text-[13px] mb-1" style={{ color: C.ink2 }}>{nextDay.subtitle}</div>
          <div className="text-[12.5px] mb-4 flex items-center gap-1.5" style={{ color: C.ink3 }}>
            {nextDay.exercises.length} exercises · ~{estDurationMin(nextDay)} min
            {nextLast && <> · last {relativeDays(nextLast.date)}</>}
          </div>
          <button onClick={() => onSelectDay(nextDay)} className="w-full rounded-2xl py-3.5 text-[15px] font-semibold flex items-center justify-center gap-2" style={{ backgroundColor: C.ink, color: "#fff" }}>
            Start {nextDay.title} <ArrowUpRight size={17} />
          </button>
        </div>
      )}

      {/* This week */}
      <div className="grid grid-cols-4 gap-2.5 mb-4">
        {[
          ["This week", String(wk.count)],
          ["Volume", wk.volume >= 1000 ? `${(wk.volume / 1000).toFixed(1)}k` : String(wk.volume)],
          ["Sets", String(wk.sets)],
          ["Streak", String(streak)],
        ].map(([label, val]) => (
          <div key={label} className="rounded-2xl py-3 px-2.5 text-center" style={{ backgroundColor: C.surface }}>
            <div className="text-[20px] font-bold tabular-nums leading-none" style={{ color: C.ink }}>{val}</div>
            <div className="text-[10px] uppercase tracking-wide mt-1.5" style={{ color: C.ink3 }}>{label}</div>
          </div>
        ))}
      </div>

      {/* Coach preview */}
      {insights.length > 0 && (
        <div className="mb-5">
          <div className="flex items-center justify-between mb-2.5">
            <span className="text-[11px] font-bold uppercase tracking-[0.14em]" style={{ color: C.ink3 }}>From your coach</span>
            <button onClick={onOpenCoach} className="text-[12px] font-semibold flex items-center gap-0.5" style={{ color: C.accent }}>All <ChevronRight size={13} /></button>
          </div>
          <div className="flex flex-col gap-2.5">
            {insights.slice(0, 2).map((ins) => <InsightCard key={ins.id} insight={ins} />)}
          </div>
        </div>
      )}

      {/* Program */}
      <div className="flex items-center justify-between mb-2.5">
        <span className="text-[11px] font-bold uppercase tracking-[0.14em]" style={{ color: C.ink3 }}>Program</span>
      </div>
      {days.length === 0 && (
        <div className="rounded-2xl p-5 mb-4 text-center" style={{ backgroundColor: C.surface, border: `1px dashed ${C.border2}` }}>
          <div className="text-[14px] font-semibold mb-1" style={{ color: C.ink }}>No training days yet</div>
          <div className="text-[12.5px] mb-4" style={{ color: C.ink3 }}>Pick a ready-made program or build your own day from scratch.</div>
          <div className="flex gap-2">
            <button onClick={onChangePlan} className="flex-1 rounded-xl py-2.5 text-[13px] font-semibold" style={{ backgroundColor: C.ink, color: "#fff" }}>Choose a program</button>
            <button onClick={onNewDay} className="flex-1 rounded-xl py-2.5 text-[13px] font-semibold" style={{ backgroundColor: C.bg, color: C.ink, border: `1px solid ${C.border2}` }}>New day</button>
          </div>
        </div>
      )}
      <div className="flex flex-col gap-2.5 mb-3">
        {days.map((day) => {
          const accent = dayAccentColor(day);
          const dl = lastSessionForDay(sessions, day.id);
          const isCustom = day.custom;
          return (
            <SwipeableCard key={day.id}
              onDelete={() => onDeleteDay?.(day.id)}
              onDuplicate={() => onDuplicateDay?.(day)}>
              <button onClick={() => onSelectDay(day)} className="rounded-2xl text-left p-4 flex items-center gap-3.5 w-full"
                style={{ backgroundColor: C.bg, border: `1px solid ${C.border}` }}>
                <div className="w-1 self-stretch rounded-full shrink-0" style={{ backgroundColor: accent }} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-[16px] font-semibold tracking-tight" style={{ color: C.ink }}>{day.title}</span>
                    <CatTag tag={day.tag} colorOverride={accent} />
                  </div>
                  <div className="text-[12px] truncate" style={{ color: C.ink3 }}>
                    {day.exercises.length} exercises · ~{estDurationMin(day)} min{dl ? ` · last ${relativeDays(dl.date)}` : ""}
                  </div>
                </div>
                <ChevronRight size={18} style={{ color: C.ink4 }} />
              </button>
            </SwipeableCard>
          );
        })}
      </div>

      <div className="flex gap-2">
        <button onClick={onNewDay} className="flex-1 rounded-2xl py-3.5 flex items-center justify-center gap-2 text-[13px] font-semibold" style={{ backgroundColor: C.surface, color: C.ink2 }}>
          <Plus size={15} /> New day
        </button>
        <button onClick={onChangePlan} className="flex-1 rounded-2xl py-3.5 flex items-center justify-center gap-2 text-[13px] font-semibold" style={{ backgroundColor: C.accentSoft, color: C.accent }}>
          <RefreshCw size={14} /> Switch plan
        </button>
      </div>
    </div>
  );
}

/* ====================================================================== */
/* DAY PREVIEW                                                            */
/* ====================================================================== */
/* ====================================================================== */
/* CHANGE PLAN SCREEN                                                     */
/* ====================================================================== */


export function ChangePlanScreen({ currentDayCount, onSelect, onBack }) {
  const [confirming, setConfirming] = useState(null);
  if (confirming) return (
    <div className="px-5 pt-12 flex flex-col items-center" style={{ backgroundColor: C.bg, minHeight: "100vh" }}>
      <span className="text-[52px] mb-3">{confirming.emoji}</span>
      <h2 className="text-[20px] font-bold tracking-tight mb-1 text-center" style={{ color: C.ink }}>{confirming.name}</h2>
      <p className="text-[13px] text-center mb-2" style={{ color: C.ink3 }}>{confirming.description}</p>
      {confirming.days && <p className="text-[12px] font-semibold mb-2" style={{ color: C.ink4 }}>{confirming.days.length} training days</p>}
      <div className="rounded-2xl p-4 mb-6 w-full max-w-xs" style={{ backgroundColor: C.warnSoft, border: `1px solid ${C.warn}` }}>
        <p className="text-[12.5px] leading-snug" style={{ color: C.warn }}>
          This will replace your current {currentDayCount} training days. Your workout history is kept — only the plan changes.
        </p>
      </div>
      <button onClick={() => onSelect(confirming)} className="w-full max-w-xs rounded-2xl py-3.5 text-[15px] font-semibold mb-3" style={{ backgroundColor: C.ink, color: "#fff" }}>
        Switch to this plan
      </button>
      <button onClick={() => setConfirming(null)} className="text-[13px]" style={{ color: C.ink3 }}>← Choose different</button>
    </div>
  );
  return (
    <div className="px-5 pt-5 pb-24" style={{ backgroundColor: C.bg, minHeight: "100vh" }}>
      <div className="flex items-center gap-2 mb-5">
        <button onClick={onBack} className="p-2 -ml-2 rounded-lg"><ArrowLeft size={20} style={{ color: C.ink2 }} /></button>
        <div>
          <h1 className="text-[18px] font-bold tracking-tight" style={{ color: C.ink }}>Switch Training Plan</h1>
          <p className="text-[12px]" style={{ color: C.ink3 }}>Your history is always kept</p>
        </div>
      </div>
      <div className="flex flex-col gap-3">
        {WORKOUT_TEMPLATES.filter(t => t.id !== "blank").map(t => (
          <button key={t.id} onClick={() => setConfirming(t)}
            className="rounded-2xl p-4 flex items-start gap-3 text-left w-full" style={{ backgroundColor: C.bg, border: `1px solid ${C.border}` }}>
            <span className="text-[24px] leading-none mt-0.5 shrink-0">{t.emoji}</span>
            <div className="flex-1 min-w-0">
              <div className="text-[14px] font-semibold" style={{ color: C.ink }}>{t.name}</div>
              <div className="text-[12px] mt-0.5" style={{ color: C.ink3 }}>{t.description}</div>
              {t.days && <div className="text-[11px] mt-1 font-semibold" style={{ color: C.ink4 }}>{t.days.length} days</div>}
            </div>
            <ChevronRight size={16} style={{ color: C.ink4 }} className="shrink-0 mt-1" />
          </button>
        ))}
      </div>
    </div>
  );
}

