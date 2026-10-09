/* Every word on the public page, in one place.
 *
 * Kept apart from the markup so the copy can be rewritten without touching a
 * component, and so every claim sits in one file where a drifting one is easy to
 * spot. Two rules it was written under, the same two the coach is held to:
 *
 *   no hype       — "revolutionary", "seamless", "unlock", "supercharge" are not
 *                   words anybody uses about an app they actually like.
 *   no inventing  — no user counts, no testimonials, no accuracy figures, no named
 *                   competitors. Every number below was read off the code: 203 is
 *                   EXERCISE_LIBRARY.length, 6 is WORKOUT_TEMPLATES.length, the ten
 *                   heatmap regions are HEATMAP_REGIONS. If a claim here stops being
 *                   true of the app, the claim is the bug.
 */

export const APP_NAME = "Iron Log";

export const SEO = {
  title: "Iron Log — a workout tracker that tells you what to lift next",
  description:
    "Free strength training log. Plan your week, run the session with a rest timer that works with your phone locked, and see what to add weight to next — worked out from your own lifts, never guessed.",
  /* The Netlify host, not the Vercel one, and deliberately: Firebase only accepts
     sign-ins from its authorized domains, and iron-log-zeta-six.vercel.app is not on
     that list. Pointing the canonical URL at a host where "Sign up free" cannot work
     would be the worst possible bug on a page whose whole job is that button. */
  origin: "https://ironlogexercise.netlify.app",
};

export const NAV = {
  logIn: "Log in",
  signUp: "Sign up free",
  openApp: "Open app",
  menu: "Menu",
  links: [
    { href: "#how", label: "How it works" },
    { href: "#features", label: "Features" },
    { href: "#coach", label: "The coach" },
    { href: "#faq", label: "FAQ" },
  ],
};

export const HERO = {
  headline: "Log the set. Know the next one.",
  sub: "Iron Log keeps your training in one place and works out what to lift next from what you actually lifted — not from a plan written for somebody else.",
  primary: "Sign up free",
  secondary: "See how it works",
  note: "Free, no subscription. Works offline, and you can start without an account.",
};

export const HOW = {
  title: "Three steps",
  steps: [
    {
      n: "01",
      title: "Pick a program",
      body: "Start from a ready-made split — push/pull/legs, upper/lower, full body — or build your days from scratch. Change anything whenever you like.",
    },
    {
      n: "02",
      title: "Run the session",
      body: "Tap a set to start it. The rest timer runs itself and tells you when you are up, even with the phone in your pocket. Last session's weights are on every row.",
    },
    {
      n: "03",
      title: "See what moved",
      body: "Charts per lift, a body map of where your volume actually went, and a coach that points out the thing worth doing something about.",
    },
  ],
};

export const FEATURES = {
  title: "What you get",
  sub: "All of it is in the app today. Nothing here is a waiting list or a paid tier.",
  cards: [
    {
      icon: "dumbbell",
      title: "203 exercises, or your own",
      body: "Six ready-made programs to start from, a library of 203 movements with substitutes for each, and room to add anything missing. Star the ones you use and they rise to the top.",
    },
    {
      icon: "timer",
      title: "A rest timer that survives your pocket",
      body: "Start a set, and rest starts itself when you finish it. The timer is handed to the service worker, so it still fires if the screen locks or the browser throws the tab away — you get a notification, not a timer that quietly died.",
    },
    {
      icon: "target",
      title: "Numbers from your own log",
      body: "Every exercise shows what you did last time, matched on the exercise itself rather than the slot it sat in. If you have never done a lift, the app says nothing about it instead of inventing a starting weight.",
    },
    {
      icon: "activity",
      title: "A body map of your volume",
      body: "Ten muscle regions, coloured by weekly sets against your own MEV/MAV/MRV landmarks. It is how you notice that four months of training has quietly skipped your hamstrings.",
    },
    {
      icon: "cloud",
      title: "Offline, and installable",
      body: "It runs from your phone's home screen like an app and keeps working in a basement gym with no signal. Sign in and it syncs across devices; stay signed out and it all stays on the one device.",
    },
    {
      icon: "download",
      title: "Your data comes out",
      body: "An Excel export for reading, and a full JSON backup that restores everything — sessions, programs, custom exercises, settings. Nothing is locked in.",
    },
  ],
};

export const COACH = {
  title: "A coach that only says what it can show you",
  sub: "The coach reads your log and surfaces up to five observations at a time. It will tell you a lift has not moved in three sessions, that your back has not been trained in a fortnight, or that you are pushing far more than you pull — and it quotes the numbers it got that from.",
  /* Phrased as shapes rather than as a promise about any one person's data: what
     appears depends entirely on what is in the log. */
  examples: [
    { kind: "Personal record", line: "New best: Back Squat 235 lb", detail: "235 lb × 3, past your previous best of 225 lb." },
    { kind: "Plateau", line: "Bench Press hasn't moved in 3 sessions", detail: "Top sets went 185 → 185 → 185 lb over 19 days." },
    { kind: "Gap", line: "Back hasn't been trained in 18 days", detail: "You've logged 6 sessions since without it." },
  ],
  footnote:
    "It arrives a few at a time rather than all at once, so it reads as advice rather than a report. Dismiss one and the next waits until tomorrow.",
};

export const COMPARE = {
  title: "Compared with paid lifting apps",
  sub: "Written to be checkable rather than flattering. “Typical paid apps” means the usual shape of subscription trackers — they vary, so check whichever one you are weighing this against.",
  columns: ["", APP_NAME, "Typical paid apps"],
  rows: [
    { label: "Price", ours: "Free", theirs: "Monthly or yearly subscription" },
    { label: "Programs and exercises", ours: "All of them, no tier", theirs: "Often the better ones are paid" },
    { label: "Works with no signal", ours: "Yes", theirs: "Varies" },
    { label: "Ads", ours: "None", theirs: "Common on free tiers" },
    { label: "Export everything", ours: "Excel and a full backup file", theirs: "Varies, sometimes paid" },
    { label: "Advice when it has no data", ours: "Says nothing", theirs: "Often a generic suggestion" },
  ],
  footnote:
    "One honest trade: this is a tool for logging and reading your own training, not a social network. There is no feed, no friends list and nothing to share.",
};

export const FAQ = {
  title: "Questions",
  items: [
    {
      q: "Is it really free?",
      a: "Yes. No card, no trial, no paid tier holding back the good programs. There is nothing to cancel.",
    },
    {
      q: "Do I need an account?",
      a: "No. You can use the whole app signed out and everything stays on that device. An account exists so your history follows you to a new phone and survives clearing your browser data — that is the only thing it buys you.",
    },
    {
      q: "Does it work without signal?",
      a: "Yes. Add it to your home screen and it opens and runs offline, which matters in most basements that call themselves gyms. Anything logged offline syncs when you are back on a connection and signed in.",
    },
    {
      q: "What does the coach actually base its advice on?",
      a: "Only your own logged sets. It compares a lift against its own history, counts sets per muscle, looks at how long since you trained something, and so on. If there is no history for a lift it says nothing about it — it will never tell you to aim for a weight you have never touched.",
    },
    {
      q: "Can I change the programs?",
      a: "All of it. Reorder exercises, swap in a substitute, add or remove movements, build a day from nothing, pair two exercises into a superset. When you finish a session it asks whether the changes you made should stick to that day or just apply to today.",
    },
    {
      q: "Can I get my data out?",
      a: "An Excel export for a readable record, and a JSON backup that restores the lot on another browser or device. Both from the Profile tab.",
    },
  ],
};

export const FINAL = {
  title: "Start with today's session.",
  sub: "Pick a program, log one workout, and see what it tells you. Nothing to cancel if you would rather not.",
  cta: "Sign up free",
};

export const FOOTER = {
  tagline: "A free training log that does the arithmetic for you.",
  links: [
    { href: "/privacy", label: "Privacy" },
    { href: "/terms", label: "Terms" },
    { href: "/contact", label: "Contact" },
  ],
};

/* The mock in the hero. Drawn in HTML rather than screenshotted so it stays sharp at
   any width, costs no image bytes, and cannot go stale the next time the real UI
   moves. Plausible numbers for one ordinary session, not anybody's actual log. */
export const MOCK = {
  day: "Push B",
  meta: "Chest / Shoulders / Triceps",
  clock: "24:18",
  exercise: "Incline Dumbbell Press",
  last: "Last: 70 lb × 8",
  sets: [
    { n: 1, weight: "70", reps: "8", done: true },
    { n: 2, weight: "70", reps: "8", done: true },
    { n: 3, weight: "75", reps: "6", done: false },
  ],
  restLabel: "Rest",
  rest: "1:30",
  tip: { title: "Incline Dumbbell Press: aim for 75 lb", body: "Last time you hit 70 lb × 8." },
};

/* The three footer pages.
 *
 * Placeholders, and they say so in the first line rather than impersonating a policy.
 * A privacy policy is a promise, and one nobody has read before it ships is a promise
 * nobody made. What each page does say about the app today is true and checkable.
 */
export const LEGAL = {
  privacy: {
    title: "Privacy",
    lede: "The short version, while the full policy is being written.",
    points: [
      "Signed out, everything stays in your own browser — sessions, programs and settings never leave the device.",
      "Signed in, your training data is stored in this project's database so it can follow you between devices, and only your account can read it.",
      "There is no advertising, no tracking of what you lift, and nothing sold to anybody.",
      "You can take everything out at any time as an Excel file or a full backup, and delete your account on request.",
    ],
    footer: "A full privacy policy will replace this page before anyone is asked to rely on it.",
  },
  terms: {
    title: "Terms",
    lede: "Placeholder. The terms of use have not been written yet.",
    points: [
      `${APP_NAME} is free and provided as-is, with no warranty.`,
      "It is a training log, not medical or coaching advice. What it suggests is arithmetic on your own numbers — judging whether a weight is safe for you on the day is yours to do.",
      "Keep your own backup of anything you would not want to lose. The app can make you one in a tap.",
    ],
    footer: "This page is a stand-in so the link goes somewhere honest rather than nowhere.",
  },
  contact: {
    title: "Contact",
    lede: "Placeholder — add your address here before launch.",
    points: [
      "Bugs, wrong numbers and missing exercises are all worth sending.",
      "There is no support rota: this is a free tool maintained by one person.",
    ],
    footer: "Replace this with a real email address or a link to the issue tracker.",
  },
};
