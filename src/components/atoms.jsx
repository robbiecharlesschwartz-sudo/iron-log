import { useRef, useState } from "react";
import { Check, Cloud, CloudOff, Copy, RefreshCw, Sparkles, Trash2 } from "lucide-react";
import { ACCENT, C, CARD_SHADOW } from "../lib/constants";

export function Logo({ size = 32 }) {
  return (
    <img
      src="data:image/png;base64,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"
      width={size}
      height={size}
      alt="Iron Log"
      style={{ borderRadius: Math.round(size * 0.22), display: "block" }}
    />
  );
}


export function CatTag({ tag, colorOverride }) {
  const accent = colorOverride || ACCENT[tag] || C.accent;
  return (
    <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold" style={{ color: C.ink2 }}>
      <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: accent }} />
      {tag.charAt(0) + tag.slice(1).toLowerCase()}
    </span>
  );
}


export function EquipPill({ equipment }) {
  return (
    <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-md" style={{ color: C.ink2, backgroundColor: C.surface, border: `1px solid ${C.border}` }}>
      {equipment}
    </span>
  );
}


export function Ring({ fraction, color, size = 150, strokeWidth = 8, track = C.border, children }) {
  const r = size / 2 - strokeWidth;
  const c = 2 * Math.PI * r;
  const offset = c * (1 - Math.max(0, Math.min(1, fraction)));
  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} stroke={track} strokeWidth={strokeWidth} fill="none" />
        <circle cx={size / 2} cy={size / 2} r={r} stroke={color} strokeWidth={strokeWidth} fill="none"
          strokeDasharray={c} strokeDashoffset={offset} strokeLinecap="round"
          style={{ transition: "stroke-dashoffset 0.4s ease" }} />
      </svg>
      <div className="absolute flex flex-col items-center justify-center">{children}</div>
    </div>
  );
}


export function Sparkline({ values, color, width = 64, height = 26 }) {
  if (!values || values.length < 2) return <svg width={width} height={height} />;
  const min = Math.min(...values), max = Math.max(...values), range = max - min || 1;
  const stepX = width / (values.length - 1);
  const pts = values.map((v, i) => `${(i * stepX).toFixed(1)},${(height - ((v - min) / range) * height).toFixed(1)}`).join(" ");
  return (
    <svg width={width} height={height}>
      <polyline points={pts} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}


export function Toggle({ on, onChange }) {
  return (
    <button onClick={onChange} className="w-11 h-[26px] rounded-full relative transition-colors shrink-0" style={{ backgroundColor: on ? C.accent : C.border2 }} aria-label="Toggle">
      <span className="absolute top-[2px] w-[22px] h-[22px] rounded-full transition-all" style={{ backgroundColor: "#FFFFFF", left: on ? "23px" : "2px", boxShadow: "0 1px 2px rgba(0,0,0,0.15)" }} />
    </button>
  );
}


export const TONE = {
  accent: { fg: C.accent, bg: C.accentSoft },
  good: { fg: C.good, bg: C.goodSoft },
  warn: { fg: C.warn, bg: C.warnSoft },
  bad: { fg: C.bad, bg: C.badSoft },
};


export function InsightCard({ insight }) {
  const Icon = insight.icon || Sparkles;
  const tone = TONE[insight.tone] || TONE.accent;
  return (
    <div className="rounded-2xl p-3.5 flex gap-3" style={{ backgroundColor: C.bg, border: `1px solid ${C.border}`, boxShadow: CARD_SHADOW }}>
      <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: tone.bg }}>
        <Icon size={17} style={{ color: tone.fg }} />
      </div>
      <div className="min-w-0">
        <div className="text-[13.5px] font-semibold leading-snug" style={{ color: C.ink }}>{insight.title}</div>
        <div className="text-[12.5px] mt-0.5 leading-snug" style={{ color: C.ink2 }}>{insight.body}</div>
      </div>
    </div>
  );
}

/* ====================================================================== */
/* TRAIN — dashboard                                                      */
/* ====================================================================== */
/* ====================================================================== */
/* SWIPEABLE CARD — reveals delete/duplicate/archive on swipe-left        */
/* ====================================================================== */


export function SwipeableCard({ children, onDelete, onDuplicate, style, className }) {
  const [offset, setOffset] = useState(0);
  const [open, setOpen] = useState(false);
  const startX = useRef(null);
  const THRESHOLD = 50, OPEN = -128;
  const handleTouchStart = e => { startX.current = e.touches[0].clientX; };
  const handleTouchMove = e => {
    if (startX.current == null) return;
    const dx = e.touches[0].clientX - startX.current;
    if (dx < 0) setOffset(Math.max(OPEN, dx));
    else if (open) setOffset(Math.min(0, OPEN + dx));
  };
  const handleTouchEnd = () => {
    const snap = offset < -(THRESHOLD) ? OPEN : 0;
    setOffset(snap); setOpen(snap === OPEN); startX.current = null;
  };
  const close = () => { setOffset(0); setOpen(false); };
  return (
    <div className="relative overflow-hidden" style={{ borderRadius: 16 }}>
      <div className="absolute right-0 top-0 bottom-0 flex" style={{ width: 128 }}>
        <button onClick={() => { onDuplicate?.(); close(); }} className="flex-1 flex flex-col items-center justify-center gap-0.5 text-[11px] font-semibold" style={{ backgroundColor: C.accent, color: "#fff" }}>
          <Copy size={16} /><span>Copy</span>
        </button>
        <button onClick={() => { onDelete?.(); close(); }} className="flex-1 flex flex-col items-center justify-center gap-0.5 text-[11px] font-semibold" style={{ backgroundColor: C.bad, color: "#fff" }}>
          <Trash2 size={16} /><span>Delete</span>
        </button>
      </div>
      <div style={{ transform: `translateX(${offset}px)`, transition: startX.current != null ? "none" : "transform 0.2s ease", ...style }}
        className={className}
        onTouchStart={handleTouchStart} onTouchMove={handleTouchMove} onTouchEnd={handleTouchEnd}>
        {children}
      </div>
    </div>
  );
}

/* ====================================================================== */
/* SYNC BADGE                                                              */
/* ====================================================================== */


export function SyncBadge({ status }) {
  const cfg = {
    synced:   { icon: <Check size={11} />,       label: "Synced",  color: C.good },
    syncing:  { icon: <RefreshCw size={11} />,   label: "Syncing", color: C.accent },
    pending:  { icon: <Cloud size={11} />,        label: "Pending", color: C.warn },
    failed:   { icon: <CloudOff size={11} />,     label: "Failed",  color: C.bad },
    offline:  { icon: <CloudOff size={11} />,     label: "Offline", color: C.ink4 },
  }[status] || { icon: <Cloud size={11} />, label: "—", color: C.ink4 };
  return (
    <div className="flex items-center gap-1 px-2 py-1 rounded-lg" style={{ backgroundColor: C.surface, color: cfg.color }}>
      {cfg.icon}
      <span className="text-[10px] font-semibold">{cfg.label}</span>
    </div>
  );
}

/* ====================================================================== */
/* AUTH SCREEN                                                             */
/* ====================================================================== */

