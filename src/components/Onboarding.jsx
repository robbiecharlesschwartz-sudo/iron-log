import { useState } from "react";
import { ArrowLeft, ChevronRight } from "lucide-react";
import { Logo } from "./atoms";
import { C } from "../lib/constants";
import { WORKOUT_TEMPLATES } from "../lib/exerciseLibrary";

export function OnboardingScreen({ hasLocalData, onSelect }) {
  const [step, setStep] = useState("main"); // main | templates | confirm
  const [chosen, setChosen] = useState(null);

  if (step === "templates") {
    return (
      <div className="px-5 pt-12 pb-24" style={{ backgroundColor: C.bg }}>
        <button onClick={() => setStep("main")} className="flex items-center gap-1 mb-5" style={{ color: C.ink3 }}><ArrowLeft size={16} /> Back</button>
        <h1 className="text-[22px] font-bold tracking-tight mb-1" style={{ color: C.ink }}>Choose a program</h1>
        <p className="text-[13px] mb-6" style={{ color: C.ink3 }}>You can edit or swap days at any time.</p>
        <div className="flex flex-col gap-3">
          {WORKOUT_TEMPLATES.filter(t => t.id !== "blank").map(t => (
            <button key={t.id} onClick={() => { setChosen(t); setStep("confirm"); }}
              className="rounded-2xl p-4 flex items-start gap-3 text-left" style={{ backgroundColor: C.bg, border: `1px solid ${C.border}` }}>
              <span className="text-[22px] leading-none mt-0.5">{t.emoji}</span>
              <div>
                <div className="text-[14px] font-semibold" style={{ color: C.ink }}>{t.name}</div>
                <div className="text-[12px] mt-0.5" style={{ color: C.ink3 }}>{t.description}</div>
                {t.days && <div className="text-[11px] mt-1 font-semibold" style={{ color: C.ink4 }}>{t.days.length} days</div>}
              </div>
              <ChevronRight size={16} className="ml-auto shrink-0 mt-1" style={{ color: C.ink4 }} />
            </button>
          ))}
        </div>
      </div>
    );
  }

  if (step === "confirm" && chosen) {
    return (
      <div className="px-5 pt-12 pb-24 flex flex-col items-center" style={{ backgroundColor: C.bg }}>
        <span className="text-[48px] mb-3">{chosen.emoji}</span>
        <h1 className="text-[20px] font-bold tracking-tight mb-1 text-center" style={{ color: C.ink }}>{chosen.name}</h1>
        <p className="text-[13px] mb-2 text-center" style={{ color: C.ink3 }}>{chosen.description}</p>
        {chosen.days && <p className="text-[12px] mb-6 font-semibold" style={{ color: C.ink4 }}>{chosen.days.length} training days</p>}
        <button onClick={() => onSelect({ type: "template", template: chosen })} className="w-full max-w-xs rounded-2xl py-3.5 text-[15px] font-semibold mb-3" style={{ backgroundColor: C.ink, color: "#fff" }}>Load this program</button>
        <button onClick={() => setStep("templates")} className="text-[13px]" style={{ color: C.ink3 }}>← Choose different</button>
      </div>
    );
  }

  return (
    <div className="px-5 pt-12 pb-24" style={{ backgroundColor: C.bg }}>
      <div className="mb-8">
        <Logo size={40} />
        <h1 className="text-[24px] font-bold tracking-tight mt-3 mb-1" style={{ color: C.ink }}>Set up your training</h1>
        <p className="text-[14px]" style={{ color: C.ink3 }}>How do you want to start?</p>
      </div>
      <div className="flex flex-col gap-3">
        <button onClick={() => setStep("templates")} className="rounded-2xl p-4 flex items-center gap-3 text-left active:scale-[0.99] transition-transform" style={{ backgroundColor: C.bg, border: `1px solid ${C.border}` }}>
          <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 text-[20px]">📋</div>
          <div className="flex-1 min-w-0">
            <div className="text-[14px] font-semibold" style={{ color: C.ink }}>Choose a program</div>
            <div className="text-[12px]" style={{ color: C.ink3 }}>PPL, Upper/Lower, Full Body, Bro Split, Beginner</div>
          </div>
          <ChevronRight size={16} style={{ color: C.ink4 }} />
        </button>
        <button onClick={() => onSelect({ type: "blank" })} className="rounded-2xl p-4 flex items-center gap-3 text-left active:scale-[0.99] transition-transform" style={{ backgroundColor: C.surface }}>
          <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 text-[20px]">✏️</div>
          <div className="flex-1 min-w-0">
            <div className="text-[14px] font-semibold" style={{ color: C.ink }}>Start completely blank</div>
            <div className="text-[12px]" style={{ color: C.ink3 }}>Build your own days and exercises</div>
          </div>
          <ChevronRight size={16} style={{ color: C.ink4 }} />
        </button>
      </div>
    </div>
  );
}

/* ====================================================================== */
/* NAME ENTRY — shown right after account creation                        */
/* ====================================================================== */


export function NameEntryScreen({ onSave }) {
  const [first, setFirst] = useState("");
  const [last, setLast] = useState("");
  const [weight, setWeight] = useState("");
  const inp = { backgroundColor: C.surface, color: C.ink, borderRadius: 12, padding: "11px 14px", fontSize: 16, outline: "none", width: "100%", border: `1px solid ${C.border}` };
  const submit = () => { if (first.trim()) onSave(first.trim(), last.trim(), weight ? Number(weight) : null); };
  return (
    <div className="px-6 pt-16 pb-24 flex flex-col" style={{ backgroundColor: C.bg, minHeight: "100vh" }}>
      <Logo size={44} />
      <h1 className="text-[24px] font-bold tracking-tight mt-4 mb-1" style={{ color: C.ink }}>Welcome — what's your name?</h1>
      <p className="text-[14px] mb-8" style={{ color: C.ink3 }}>We'll use this on your profile and in coaching tips.</p>
      <label className="text-[11px] uppercase tracking-wide font-bold mb-1.5" style={{ color: C.ink3 }}>First name <span style={{ color: C.bad }}>*</span></label>
      <input style={{ ...inp, marginBottom: 16 }} placeholder="First name" value={first} onChange={e => setFirst(e.target.value)} autoFocus />
      <label className="text-[11px] uppercase tracking-wide font-bold mb-1.5" style={{ color: C.ink3 }}>Last name <span style={{ color: C.ink4 }}>(optional)</span></label>
      <input style={{ ...inp, marginBottom: 16 }} placeholder="Last name" value={last} onChange={e => setLast(e.target.value)} />
      <label className="text-[11px] uppercase tracking-wide font-bold mb-1.5" style={{ color: C.ink3 }}>Body weight (lb) <span style={{ color: C.ink4 }}>(optional — powers strength-to-weight)</span></label>
      <input type="number" inputMode="decimal" style={{ ...inp, marginBottom: 28 }} placeholder="e.g. 175" value={weight} onChange={e => setWeight(e.target.value)} onKeyDown={e => e.key === "Enter" && submit()} />
      <button onClick={submit} disabled={!first.trim()}
        className="w-full rounded-2xl py-3.5 text-[15px] font-semibold" style={{ backgroundColor: first.trim() ? C.ink : C.surface, color: first.trim() ? "#fff" : C.ink3 }}>
        Continue
      </button>
    </div>
  );
}

