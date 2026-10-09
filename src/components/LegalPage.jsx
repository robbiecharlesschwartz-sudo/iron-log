import { Logo } from "./atoms";
import { APP_NAME, LEGAL } from "../lib/landingCopy";

/**
 * Privacy, Terms and Contact — placeholders, and labelled as placeholders.
 *
 * A footer link that 404s is worse than one saying "not written yet", and a page of
 * invented legal text is worse than either: a privacy policy is a promise, and one
 * nobody has read before it ships is a promise nobody made. The words live in
 * landingCopy.js with the rest of the page's copy, so there is one file to edit.
 */
export default function LegalPage({ page, onHome }) {
  const copy = LEGAL[page];
  if (!copy) return null;

  return (
    <div className="lp lp-root">
      <header className="border-b" style={{ borderColor: "var(--lp-line)" }}>
        <div className="lp-wrap flex items-center py-3">
          <a href="/" className="flex items-center gap-2.5 font-semibold" onClick={onHome}>
            <Logo size={26} />
            <span>{APP_NAME}</span>
          </a>
        </div>
      </header>

      <main id="main" className="lp-wrap py-14 sm:py-20">
        <h1 className="text-[30px] font-semibold tracking-[-0.02em] sm:text-[38px]">{copy.title}</h1>
        <p className="lp-sub mt-3 max-w-[62ch]">{copy.lede}</p>

        <ul className="mt-8 flex max-w-[70ch] flex-col gap-3">
          {copy.points.map((point) => (
            <li key={point} className="lp-card p-4 text-[15px] leading-7">{point}</li>
          ))}
        </ul>

        <p className="lp-sub mt-8 max-w-[62ch] text-sm">{copy.footer}</p>

        <p className="mt-8">
          <a className="lp-btn lp-btn-ghost" href="/" onClick={onHome}>← Back</a>
        </p>
      </main>
    </div>
  );
}
