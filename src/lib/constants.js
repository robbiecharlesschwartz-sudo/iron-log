export const C = {
  bg: "#FFFFFF",
  surface: "#F6F7F9",
  surface2: "#FBFBFD",
  raised: "#FFFFFF",
  border: "#ECEDF1",
  border2: "#E2E4EA",
  ink: "#16171C",
  ink2: "#5C6069",
  ink3: "#9A9EA8",
  ink4: "#C2C6CE",
  accent: "#4F46E5",
  accentSoft: "#EEEEFC",
  accentInk: "#4338CA",
  good: "#15A150",
  goodSoft: "#E7F5EC",
  warn: "#D9982F",
  warnSoft: "#FAF1DE",
  bad: "#DC5B4B",
  badSoft: "#FBEAE7",
  push: "#E0A400",
  pull: "#3B7DE0",
  legs: "#1E9E63",
  cardio: "#E23B3B",
};


export const ACCENT = { PUSH: C.push, PULL: C.pull, LEGS: C.legs, CUSTOM: C.accent, CARDIO: C.cardio };


export const ACCENT_SOFT = { PUSH: "#FBF2D6", PULL: "#E6EFFB", LEGS: "#E3F4EB", CUSTOM: C.accentSoft, CARDIO: "#FBE3E3" };


export const FONT = '-apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", Roboto, Helvetica, Arial, sans-serif';


export const CARD_SHADOW = "0 1px 2px rgba(22,23,28,0.04), 0 1px 3px rgba(22,23,28,0.03)";


export const RETENTION_DAYS = 365;


export const SESS_KEY = "iron-log-sessions-v2";


export const ACTIVE_KEY = "iron-log-active-v3";


export const CUSTOM_KEY = "iron-log-custom-days-v1";


export const ADDS_KEY = "iron-log-day-adds-v1";


export const CUSTOM_EX_KEY = "iron-log-custom-exercises-v1"; // user-created exercises, persisted for future reuse


export const ONBOARD_KEY = "iron-log-onboarded";


export const PROFILE_KEY = "iron-log-profile-v1";


export const PLAN_INIT_KEY = "iron-log-plan-initialized";


export const INSTALL_DISMISS_KEY = "iron-log-install-dismissed";
export const LANDMARKS_KEY = "iron-log-landmarks-v1";

// ── Rest-timer notification helpers ──────────────────────────────────────


export const SPECIAL_ROBBIE_EMAIL = "robbiecschwartz@icloud.com";

// Cardio detection — explicit only. An exercise is cardio if flagged kind:"cardio",
// or its muscle/section is exactly "Cardio". Core, abs, etc. are NEVER cardio.

