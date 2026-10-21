import { useEffect, useState } from "react";
import {
  Activity, Check, ChevronDown, CloudUpload, Download, Dumbbell, Menu, Play, Target, Timer, X,
} from "lucide-react";
import { Logo } from "./atoms";
import { APP_NAME, COACH, COMPARE, FAQ, FEATURES, FINAL, FOOTER, HERO, HOW, MOCK, NAV } from "../lib/landingCopy";

/* The public page.
 *
 * Deliberately shares nothing with the app's components: those are built around the
 * `C` palette as inline styles and a phone-width column, and both are wrong here. This
 * uses the `.lp` variables from input.css instead, so it can follow the reader's system
 * theme without the app having to.
 */

const ICONS = { dumbbell: Dumbbell, timer: Timer, target: Target, activity: Activity, cloud: CloudUpload, download: Download };

export default function Landing({ onSignUp, onLogIn }) {
  return (
    <div className="lp lp-root">
      <Nav onSignUp={onSignUp} onLogIn={onLogIn} />
      <main id="main">
        <Hero onSignUp={onSignUp} />
        <HowItWorks />
        <Features />
        <CoachSection />
        <Comparison />
        <Faq />
        <FinalCta onSignUp={onSignUp} />
      </main>
      <Footer />
    </div>
  );
}

function Nav({ onSignUp, onLogIn }) {
  const [open, setOpen] = useState(false);

  // A menu left open behind the section you jumped to is a menu you have to close
  // twice, so Escape and any link both shut it.
  useEffect(() => {
    if (!open) return;
    const esc = (event) => event.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  }, [open]);

  return (
    <header
      className="sticky top-0 z-40 border-b backdrop-blur"
      style={{ borderColor: "var(--lp-line)", background: "color-mix(in srgb, var(--lp-bg) 88%, transparent)" }}
    >
      {/* Somebody tabbing in needs a way past the navigation. */}
      <a href="#main" className="lp-btn lp-btn-primary sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-3">
        Skip to content
      </a>
      <div className="lp-wrap flex items-center gap-4 py-3">
        <a href="/" className="flex items-center gap-2.5 font-semibold tracking-[-0.01em]">
          <Logo size={26} />
          <span>{APP_NAME}</span>
        </a>

        <nav aria-label="Sections" className="ml-6 hidden items-center gap-6 text-sm md:flex">
          {NAV.links.map((link) => (
            <a key={link.href} href={link.href} className="hover:underline" style={{ color: "var(--lp-dim)" }}>
              {link.label}
            </a>
          ))}
        </nav>

        <div className="ml-auto hidden items-center gap-3 md:flex">
          <button className="text-sm font-medium hover:underline" onClick={onLogIn}>{NAV.logIn}</button>
              <button className="lp-btn lp-btn-primary" onClick={onSignUp}>{NAV.signUp}</button>
        </div>

        <button
          className="lp-btn lp-btn-ghost ml-auto !px-3 !py-2 md:hidden"
          aria-expanded={open}
          aria-label={NAV.menu}
          onClick={() => setOpen((value) => !value)}
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {open && (
        <div className="border-t md:hidden" style={{ borderColor: "var(--lp-line)" }}>
          <div className="lp-wrap flex flex-col gap-1 py-3">
            {NAV.links.map((link) => (
              <a key={link.href} href={link.href} className="py-2.5 text-[15px]" onClick={() => setOpen(false)}>
                {link.label}
              </a>
            ))}
            <div className="mt-2 flex flex-col gap-2">
              <button className="lp-btn lp-btn-ghost" onClick={onLogIn}>{NAV.logIn}</button>
                  <button className="lp-btn lp-btn-primary" onClick={onSignUp}>{NAV.signUp}</button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}

function Hero({ onSignUp }) {
  return (
    <section className="lp-wrap grid items-center gap-12 py-14 sm:py-20 lg:grid-cols-[1.05fr_1fr] lg:gap-16">
      <div>
        <h1 className="text-[34px] font-semibold leading-[1.08] tracking-[-0.03em] sm:text-[46px]">{HERO.headline}</h1>
        <p className="lp-sub mt-5 max-w-[52ch] text-[16px]">{HERO.sub}</p>
        <div className="mt-8 flex flex-wrap gap-3">
          <button className="lp-btn lp-btn-primary" onClick={onSignUp}>{HERO.primary}</button>
          <a className="lp-btn lp-btn-ghost" href="#how">{HERO.secondary}</a>
        </div>
        <p className="mt-5 text-[13.5px]" style={{ color: "var(--lp-dim)" }}>{HERO.note}</p>
      </div>
      <SessionMock />
    </section>
  );
}

/* The product shot, in HTML. No screenshot to go stale, no image bytes to download,
   and it stays sharp at any width. */
function SessionMock() {
  return (
    <div className="lp-card overflow-hidden" aria-hidden="true">
      <div className="flex items-center justify-between border-b px-4 py-3" style={{ borderColor: "var(--lp-line)" }}>
        <div>
          <div className="text-[15px] font-semibold">{MOCK.day}</div>
          <div className="text-[12px]" style={{ color: "var(--lp-dim)" }}>{MOCK.meta}</div>
        </div>
        <div className="text-[20px] font-semibold tabular-nums">{MOCK.clock}</div>
      </div>

      <div className="px-4 py-4">
        <div className="flex items-baseline justify-between">
          <div className="text-[14px] font-semibold">{MOCK.exercise}</div>
          <div className="text-[12px]" style={{ color: "var(--lp-dim)" }}>{MOCK.last}</div>
        </div>

        <div className="mt-3 flex flex-col gap-2">
          {MOCK.sets.map((set) => (
            <div
              key={set.n}
              className="flex items-center gap-3 rounded-xl px-3 py-2.5"
              style={{ background: "var(--lp-bg)", border: "1px solid var(--lp-line)" }}
            >
              <span className="w-4 text-[12px] tabular-nums" style={{ color: "var(--lp-dim)" }}>{set.n}</span>
              <span className="text-[14px] tabular-nums">{set.weight} lb</span>
              <span className="text-[13px]" style={{ color: "var(--lp-dim)" }}>× {set.reps}</span>
              <span
                className="ml-auto flex h-7 w-7 items-center justify-center rounded-full"
                style={{ background: set.done ? "var(--lp-good)" : "var(--lp-text)" }}
              >
                {set.done
                  ? <Check className="h-3.5 w-3.5" strokeWidth={3} style={{ color: "var(--lp-bg)" }} />
                  : <Play className="h-3 w-3" fill="currentColor" style={{ color: "var(--lp-bg)" }} />}
              </span>
            </div>
          ))}
        </div>

        <div
          className="mt-3 flex items-center gap-2 rounded-xl px-3 py-2.5"
          style={{ background: "var(--lp-accent-soft)" }}
        >
          <Timer className="h-4 w-4" style={{ color: "var(--lp-accent)" }} />
          <span className="text-[13px]" style={{ color: "var(--lp-dim)" }}>{MOCK.restLabel}</span>
          <span className="ml-auto text-[15px] font-semibold tabular-nums" style={{ color: "var(--lp-accent)" }}>{MOCK.rest}</span>
        </div>

        <div className="mt-3 rounded-xl px-3 py-3" style={{ border: "1px solid var(--lp-line)" }}>
          <div className="flex items-start gap-2.5">
            <Target className="mt-0.5 h-4 w-4 shrink-0" style={{ color: "var(--lp-accent)" }} />
            <div>
              <div className="text-[13px] font-semibold leading-snug">{MOCK.tip.title}</div>
              <div className="mt-0.5 text-[12.5px] leading-snug" style={{ color: "var(--lp-dim)" }}>{MOCK.tip.body}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function HowItWorks() {
  return (
    <Section id="how" title={HOW.title}>
      <ol className="grid gap-5 sm:grid-cols-3">
        {HOW.steps.map((step) => (
          <li key={step.n} className="lp-card p-5">
            <div className="text-[13px] font-semibold tabular-nums" style={{ color: "var(--lp-accent)" }}>{step.n}</div>
            <h3 className="mt-2 text-[17px] font-semibold tracking-[-0.01em]">{step.title}</h3>
            <p className="mt-2 text-[14.5px] leading-7" style={{ color: "var(--lp-dim)" }}>{step.body}</p>
          </li>
        ))}
      </ol>
    </Section>
  );
}

function Features() {
  return (
    <Section id="features" title={FEATURES.title} sub={FEATURES.sub}>
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {FEATURES.cards.map((card) => {
          const Icon = ICONS[card.icon] || Dumbbell;
          return (
            <div key={card.title} className="lp-card p-5">
              <span
                className="flex h-10 w-10 items-center justify-center rounded-xl"
                style={{ background: "var(--lp-accent-soft)" }}
              >
                <Icon className="h-5 w-5" style={{ color: "var(--lp-accent)" }} />
              </span>
              <h3 className="mt-4 text-[17px] font-semibold tracking-[-0.01em]">{card.title}</h3>
              <p className="mt-2 text-[14.5px] leading-7" style={{ color: "var(--lp-dim)" }}>{card.body}</p>
            </div>
          );
        })}
      </div>
    </Section>
  );
}

function CoachSection() {
  return (
    <Section id="coach" title={COACH.title} sub={COACH.sub}>
      <div className="grid gap-4 sm:grid-cols-3">
        {COACH.examples.map((example) => (
          <div key={example.line} className="lp-card p-4">
            <div className="text-[11px] font-semibold uppercase tracking-[0.08em]" style={{ color: "var(--lp-accent)" }}>
              {example.kind}
            </div>
            <div className="mt-2 text-[14.5px] font-semibold leading-snug">{example.line}</div>
            <div className="mt-1.5 text-[13px] leading-6" style={{ color: "var(--lp-dim)" }}>{example.detail}</div>
          </div>
        ))}
      </div>
      <p className="lp-sub mt-5 max-w-[68ch] text-[14px]">{COACH.footnote}</p>
    </Section>
  );
}

function Comparison() {
  return (
    <Section id="compare" title={COMPARE.title} sub={COMPARE.sub}>
      <div className="lp-card overflow-x-auto">
        <table className="w-full border-collapse text-left text-[14.5px]">
          <caption className="sr-only">{COMPARE.title}</caption>
          <thead>
            <tr>
              {COMPARE.columns.map((column, index) => (
                <th
                  key={column || index}
                  scope="col"
                  className="border-b px-4 py-3 text-[13px] font-semibold"
                  style={{ borderColor: "var(--lp-line)", color: index === 1 ? "var(--lp-accent)" : "var(--lp-dim)" }}
                >
                  {column}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {COMPARE.rows.map((row) => (
              <tr key={row.label}>
                <th scope="row" className="border-b px-4 py-3 font-medium" style={{ borderColor: "var(--lp-line)" }}>
                  {row.label}
                </th>
                <td className="border-b px-4 py-3 font-medium" style={{ borderColor: "var(--lp-line)" }}>{row.ours}</td>
                <td className="border-b px-4 py-3" style={{ borderColor: "var(--lp-line)", color: "var(--lp-dim)" }}>{row.theirs}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="lp-sub mt-5 max-w-[68ch] text-[14px]">{COMPARE.footnote}</p>
    </Section>
  );
}

/* <details> rather than a toggle in state: it opens without JavaScript, it is
   keyboard-operable for free, and find-in-page can see a closed answer. */
function Faq() {
  return (
    <Section id="faq" title={FAQ.title}>
      <div className="flex flex-col gap-3">
        {FAQ.items.map((item) => (
          <details key={item.q} className="lp-card group px-4 py-3">
            <summary className="flex cursor-pointer list-none items-center gap-3 py-1.5 text-[15.5px] font-medium">
              {item.q}
              <ChevronDown
                className="ml-auto h-4 w-4 shrink-0 transition-transform group-open:rotate-180"
                style={{ color: "var(--lp-dim)" }}
              />
            </summary>
            <p className="pb-2 pt-1 text-[14.5px] leading-7" style={{ color: "var(--lp-dim)" }}>{item.a}</p>
          </details>
        ))}
      </div>
    </Section>
  );
}

function FinalCta({ onSignUp }) {
  return (
    <section className="lp-wrap py-14 sm:py-20">
      <div className="lp-card px-6 py-10 text-center sm:px-10">
        <h2 className="lp-h2">{FINAL.title}</h2>
        <p className="lp-sub mx-auto mt-3 max-w-[52ch]">{FINAL.sub}</p>
        <div className="mt-7">
          <button className="lp-btn lp-btn-primary" onClick={onSignUp}>{FINAL.cta}</button>
        </div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="border-t py-10" style={{ borderColor: "var(--lp-line)" }}>
      <div className="lp-wrap flex flex-col gap-4 sm:flex-row sm:items-center">
        <div>
          <div className="flex items-center gap-2 font-semibold">
            <Logo size={20} />
            {APP_NAME}
          </div>
          <p className="mt-1 text-sm" style={{ color: "var(--lp-dim)" }}>{FOOTER.tagline}</p>
        </div>
        <nav aria-label="Legal" className="flex flex-wrap gap-5 text-sm sm:ml-auto">
          {FOOTER.links.map((link) => (
            <a key={link.href} href={link.href} className="hover:underline" style={{ color: "var(--lp-dim)" }}>
              {link.label}
            </a>
          ))}
        </nav>
      </div>
      <div className="lp-wrap mt-6 text-xs" style={{ color: "var(--lp-dim)" }}>
        © {new Date().getFullYear()} {APP_NAME}
      </div>
    </footer>
  );
}

/**
 * A titled band.
 *
 * `content-visibility: auto` is the lazy-loading this page can actually use — there
 * are no images below the fold to defer, so what is left to save is the layout and
 * paint of sections nobody has scrolled to. The size hint keeps the scrollbar from
 * jumping as they come into view.
 */
function Section({ id, title, sub, children }) {
  return (
    <section id={id} className="lp-wrap py-14 sm:py-20" style={{ contentVisibility: "auto", containIntrinsicSize: "auto 480px" }}>
      <h2 className="lp-h2">{title}</h2>
      {sub && <p className="lp-sub mt-3 max-w-[68ch]">{sub}</p>}
      <div className="mt-8">{children}</div>
    </section>
  );
}
