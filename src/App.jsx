import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Copy, User } from "lucide-react";
import { AuthScreen } from "./components/AuthScreen";
import { CalendarScreen, DayDetailScreen } from "./components/CalendarScreen";
import { CoachScreen } from "./components/CoachScreen";
import { AddExerciseScreen, DayPreviewScreen, NewDayScreen } from "./components/DayScreens";
import { EditSessionScreen, HistoryScreen } from "./components/HistoryScreen";
import { ChangePlanScreen, HomeScreen } from "./components/HomeScreen";
import { LibraryScreen } from "./components/LibraryScreen";
import { BottomNav, InstallBanner } from "./components/Nav";
import { NameEntryScreen, OnboardingScreen } from "./components/Onboarding";
import { ProfileScreen } from "./components/ProfileScreen";
import { ProgressScreen } from "./components/ProgressScreen";
import { SummaryScreen, WorkoutScreen } from "./components/WorkoutScreen";
import { Logo } from "./components/atoms";
import { ACTIVE_KEY, ADDS_KEY, C, CUSTOM_EX_KEY, CUSTOM_KEY, FONT, LANDMARKS_KEY, ONBOARD_KEY, PLAN_INIT_KEY, PROFILE_KEY, SESS_KEY, SIDE_DAYS_KEY, SPECIAL_ROBBIE_EMAIL } from "./lib/constants";
import { WORKOUT_DAYS, templateDaysFromBuiltIn } from "./lib/exerciseLibrary";
import { FB_ENABLED, fbDeleteSession, fbLoadData, fbLoadSessions, fbSaveData, fbSaveSession, mergeSessions, useAuth } from "./lib/firebase";
import { ROTATION, generateInsights, recommendNextDay } from "./lib/insights";
import { normalizeLiftName } from "./lib/muscleMapping";
import { ensureNotifyPermission } from "./lib/notifications";
import { buildActiveSession, committedAccum, isCardioExercise, migrateSession, pruneSessions, repairLegacyDayIds, sessionVolume, toActiveExercise } from "./lib/sessionUtils";
import { makeId } from "./lib/id";

export default function IronLog() {
  const auth = useAuth();
  const [screen, setScreen] = useState("home");
  const [sessions, setSessions] = useState([]);
  const [customDays, setCustomDays] = useState([]);
  const [dayAdds, setDayAdds] = useState({});
  const [customExercises, setCustomExercises] = useState([]); // user-created exercises, persisted for future search/add
  const [landmarkOverrides, setLandmarkOverrides] = useState({}); // user-customized MEV/MAV/MRV per muscle group
  const [sideDays, setSideDays] = useState([]); // saved workouts outside the active training plan/rotation
  const [active, setActive] = useState(null);
  const [selectedDay, setSelectedDay] = useState(null);
  const [addTargetDay, setAddTargetDay] = useState(null);
  const [addReturnTo, setAddReturnTo] = useState("daypreview");
  const [calendarDay, setCalendarDay] = useState(null);
  const [lastFinished, setLastFinished] = useState(null);
  const [ready, setReady] = useState(false);
  const [showAuth, setShowAuth] = useState(false);
  const [showOnboard, setShowOnboard] = useState(false);
  const [showNameEntry, setShowNameEntry] = useState(false);
  const [syncStatus, setSyncStatus] = useState("offline");
  const [syncError, setSyncError] = useState(null); // last real error message, shown in Profile so it's not console-only
  const [lastSyncedAt, setLastSyncedAt] = useState(null); // timestamp of last CONFIRMED successful cloud write
  const [hasLocalData, setHasLocalData] = useState(false);
  const [profile, setProfile] = useState({ firstName: "", lastName: "", bodyWeight: null });
  const [planInitialized, setPlanInitialized] = useState(false);
  const [editingSession, setEditingSession] = useState(null);
  const pendingOnboardKeyRef = useRef(null); // not marked "onboarded" until the flow actually completes
  const prevUidRef = useRef(undefined);

  // Per-account storage key suffix — keeps each account's data isolated on the same device
  const keyFor = (base, u) => u ? `${base}::${u.uid}` : base;

  // ── Load data for current auth state (guest or specific account) ────────
  async function loadAllFor(u) {
    const sk = keyFor(SESS_KEY, u), ck = keyFor(CUSTOM_KEY, u), ak = keyFor(ADDS_KEY, u), pk = keyFor(PROFILE_KEY, u), plk = keyFor(PLAN_INIT_KEY, u), cek = keyFor(CUSTOM_EX_KEY, u), lmk = keyFor(LANDMARKS_KEY, u), sdk = keyFor(SIDE_DAYS_KEY, u);
    let sess = [], custom = [], adds = {}, prof = { firstName: "", lastName: "", bodyWeight: null }, planInit = false, customEx = [], landmarks = {}, sideDays = [];
    try { const r = await window.storage.get(sk); sess = r ? JSON.parse(r.value).map(migrateSession) : []; } catch {}
    try { const r = await window.storage.get(ck); custom = r ? JSON.parse(r.value) : []; } catch {}
    try { const r = await window.storage.get(ak); adds = r ? JSON.parse(r.value) : {}; } catch {}
    try { const r = await window.storage.get(pk); prof = r ? JSON.parse(r.value) : prof; } catch {}
    try { await window.storage.get(plk); planInit = true; } catch {}
    try { const r = await window.storage.get(cek); customEx = r ? JSON.parse(r.value) : []; } catch {}
    try { const r = await window.storage.get(lmk); landmarks = r ? JSON.parse(r.value) : {}; } catch {}
    try { const r = await window.storage.get(sdk); sideDays = r ? JSON.parse(r.value) : []; } catch {}
    return { sess, custom, adds, prof, planInit, customEx, landmarks, sideDays };
  }

  // ── Initial load (guest/local) ──────────────────────────────────────────
  useEffect(() => {
    (async () => {
      const { sess, custom, adds, prof, planInit, customEx, landmarks, sideDays: loadedSideDays } = await loadAllFor(null);
      const repaired = repairLegacyDayIds(sess, custom, adds, ROTATION);
      const [rSess, rCustom, rAdds] = repaired.changed ? [repaired.sessions, repaired.customDays, repaired.dayAdds] : [sess, custom, adds];
      if (repaired.changed) {
        window.storage.set(SESS_KEY, JSON.stringify(rSess)).catch(() => {});
        window.storage.set(CUSTOM_KEY, JSON.stringify(rCustom)).catch(() => {});
        window.storage.set(ADDS_KEY, JSON.stringify(rAdds)).catch(() => {});
      }
      setSessions(rSess); setCustomDays(rCustom); setDayAdds(rAdds); setProfile(prof); setPlanInitialized(planInit); setCustomExercises(customEx); setLandmarkOverrides(landmarks); setSideDays(loadedSideDays); setHasLocalData(rSess.length > 0);
      try { const r = await window.storage.get(ACTIVE_KEY); setActive(r ? JSON.parse(r.value) : null); } catch {}
      if (FB_ENABLED) { try { await window.storage.get(ONBOARD_KEY); } catch { setShowAuth(true); } }
      setReady(true);
    })();
  }, []);

  // ── React to auth state changes — load that account's data, clear on logout
  useEffect(() => {
    if (auth.authLoading) return;
    const u = auth.user;
    const prevUid = prevUidRef.current;
    const curUid = u?.uid || null;
    if (prevUid === curUid) return; // no change
    prevUidRef.current = curUid;

    (async () => {
      if (!u) {
        // Logged out (or initial guest load) → reload guest local data
        const { sess, custom, adds, prof, planInit, customEx, landmarks, sideDays: loadedSideDays } = await loadAllFor(null);
        const repaired = repairLegacyDayIds(sess, custom, adds, ROTATION);
        const [rSess, rCustom, rAdds] = repaired.changed ? [repaired.sessions, repaired.customDays, repaired.dayAdds] : [sess, custom, adds];
        if (repaired.changed) {
          window.storage.set(SESS_KEY, JSON.stringify(rSess)).catch(() => {});
          window.storage.set(CUSTOM_KEY, JSON.stringify(rCustom)).catch(() => {});
          window.storage.set(ADDS_KEY, JSON.stringify(rAdds)).catch(() => {});
        }
        setSessions(rSess); setCustomDays(rCustom); setDayAdds(rAdds); setProfile(prof); setPlanInitialized(planInit); setCustomExercises(customEx); setLandmarkOverrides(landmarks); setSideDays(loadedSideDays);
        // Only clear active workout if user was actually logged in before (not initial auth resolution)
        if (prevUid) setActive(null);
        setSyncStatus("offline"); setScreen("home");
        return;
      }
      // Logged in → load this account's local data, then merge cloud
      setSyncStatus("syncing"); setSyncError(null);
      const local = await loadAllFor(u);
      setSessions(local.sess); setCustomDays(local.custom); setDayAdds(local.adds); setProfile(local.prof); setPlanInitialized(local.planInit); setCustomExercises(local.customEx || []); setLandmarkOverrides(local.landmarks || {}); setSideDays(local.sideDays || []);

      const onboardKey = `${ONBOARD_KEY}-${u.uid}`;
      const planInitKey = keyFor(PLAN_INIT_KEY, u);
      const isRobbie = (u.email || "").toLowerCase() === SPECIAL_ROBBIE_EMAIL;

      // Merge cloud data FIRST — if another device already finished setup, this device
      // needs to see that before deciding whether to show onboarding again.
      let merged = { custom: local.custom, sess: local.sess, prof: local.prof, planInit: local.planInit, adds: local.adds };
      try {
        const [cloudSessions, cloudCustomDays, cloudDayAdds, cloudProfile, cloudPlanInit, cloudCustomEx, cloudLandmarks, cloudSideDays] = await Promise.all([
          fbLoadSessions(u.uid), fbLoadData(u.uid, "customDays"), fbLoadData(u.uid, "dayAdds"), fbLoadData(u.uid, "profile"), fbLoadData(u.uid, "planInitialized"), fbLoadData(u.uid, "customExercises"), fbLoadData(u.uid, "landmarks"), fbLoadData(u.uid, "sideDays")
        ]);
        const mergedSessions = mergeSessions(local.sess, cloudSessions || []);
        setSessions(mergedSessions); window.storage.set(keyFor(SESS_KEY, u), JSON.stringify(mergedSessions)).catch(() => {});
        merged.sess = mergedSessions;
        // PUSH side of the sync: any session that exists locally but not in the cloud yet
        // (e.g. trained as a guest, then logged in — or trained on this device while offline)
        // needs to go up, not just merge down. Without this, guest/offline history never
        // reaches the account and silently never appears on other devices.
        const cloudById = {}; for (const s of (cloudSessions || [])) cloudById[s.id] = s;
        const toPush = local.sess.filter((s) => !cloudById[s.id] || (s.lastUpdatedAt || 0) > (cloudById[s.id].lastUpdatedAt || 0));
        const pushResults = [];
        if (toPush.length) pushResults.push(...await Promise.all(toPush.map((s) => fbSaveSession(u.uid, s))));
        if (cloudCustomDays && cloudCustomDays.length) { setCustomDays(cloudCustomDays); window.storage.set(keyFor(CUSTOM_KEY, u), JSON.stringify(cloudCustomDays)).catch(() => {}); merged.custom = cloudCustomDays; }
        else if (local.custom && local.custom.length) { pushResults.push(await fbSaveData(u.uid, "customDays", local.custom)); }
        if (cloudDayAdds) { setDayAdds(cloudDayAdds); window.storage.set(keyFor(ADDS_KEY, u), JSON.stringify(cloudDayAdds)).catch(() => {}); merged.adds = cloudDayAdds; }
        else if (local.adds && Object.keys(local.adds).length) { pushResults.push(await fbSaveData(u.uid, "dayAdds", local.adds)); }
        if (cloudProfile && cloudProfile.firstName) { setProfile(cloudProfile); window.storage.set(keyFor(PROFILE_KEY, u), JSON.stringify(cloudProfile)).catch(() => {}); merged.prof = cloudProfile; }
        else if (local.prof && local.prof.firstName) { pushResults.push(await fbSaveData(u.uid, "profile", local.prof)); }
        if (cloudPlanInit) { window.storage.set(planInitKey, "1").catch(() => {}); merged.planInit = true; }
        if (cloudCustomEx && cloudCustomEx.length) { setCustomExercises(cloudCustomEx); window.storage.set(keyFor(CUSTOM_EX_KEY, u), JSON.stringify(cloudCustomEx)).catch(() => {}); }
        else if (local.customEx && local.customEx.length) { pushResults.push(await fbSaveData(u.uid, "customExercises", local.customEx)); }
        if (cloudLandmarks && Object.keys(cloudLandmarks).length) { setLandmarkOverrides(cloudLandmarks); window.storage.set(keyFor(LANDMARKS_KEY, u), JSON.stringify(cloudLandmarks)).catch(() => {}); }
        else if (local.landmarks && Object.keys(local.landmarks).length) { pushResults.push(await fbSaveData(u.uid, "landmarks", local.landmarks)); }
        if (cloudSideDays && cloudSideDays.length) { setSideDays(cloudSideDays); window.storage.set(keyFor(SIDE_DAYS_KEY, u), JSON.stringify(cloudSideDays)).catch(() => {}); }
        else if (local.sideDays && local.sideDays.length) { pushResults.push(await fbSaveData(u.uid, "sideDays", local.sideDays)); }
        const pushFailed = pushResults.find((r) => r && r.ok === false);
        if (pushFailed) { setSyncStatus("failed"); setSyncError(pushFailed.error); }
        else { setSyncStatus("synced"); setSyncError(null); setLastSyncedAt(Date.now()); }
      } catch (e) { console.warn("login sync merge failed:", e); setSyncStatus("failed"); setSyncError(String(e && e.message || e)); }

      // One-time repair for accounts still carrying a legacy randomized day ID (from a
      // since-fixed bug) — relinks their sessions/customDays/dayAdds back to the stable
      // built-in ID so history rejoins instead of staying split off on its own.
      const beforeRepairSess = merged.sess;
      const repaired = repairLegacyDayIds(merged.sess, merged.custom, merged.adds, ROTATION);
      if (repaired.changed) {
        merged.sess = repaired.sessions; merged.custom = repaired.customDays; merged.adds = repaired.dayAdds;
        setSessions(repaired.sessions); setCustomDays(repaired.customDays); setDayAdds(repaired.dayAdds);
        window.storage.set(keyFor(SESS_KEY, u), JSON.stringify(repaired.sessions)).catch(() => {});
        window.storage.set(keyFor(CUSTOM_KEY, u), JSON.stringify(repaired.customDays)).catch(() => {});
        window.storage.set(keyFor(ADDS_KEY, u), JSON.stringify(repaired.dayAdds)).catch(() => {});
        const changedSessions = repaired.sessions.filter((s, i) => s.dayId !== beforeRepairSess[i].dayId);
        Promise.all(changedSessions.map((s) => fbSaveSession(u.uid, s))).catch(() => {});
        fbSaveData(u.uid, "customDays", repaired.customDays).catch(() => {});
        fbSaveData(u.uid, "dayAdds", repaired.dayAdds).catch(() => {});
      }

      // "Established" = real evidence this account has actually been used before
      // (own days, own history, on this device or any other) — independent of any flag,
      // so accounts that existed before this fix shipped are never incorrectly re-prompted.
      const looksEstablished = (merged.custom && merged.custom.length > 0) || (merged.sess && merged.sess.length > 0);
      if (!merged.planInit && looksEstablished) {
        // Backfill silently for pre-existing accounts — no re-prompt.
        window.storage.set(planInitKey, "1").catch(() => {});
        fbSaveData(u.uid, "planInitialized", true).catch(() => {});
      }
      const effectivePlanInit = merged.planInit || looksEstablished;
      const needsNameEntry = !isRobbie && !merged.prof.firstName;
      const needsProgramChoice = !effectivePlanInit;
      const needsSetup = needsNameEntry || needsProgramChoice;
      setPlanInitialized(effectivePlanInit);

      setShowAuth(false);
      if (needsSetup) {
        // IMPORTANT: do NOT mark onboarding complete here. It's only persisted once the
        // person actually finishes NameEntry + picks a program in handleOnboard. That way
        // an interrupted signup always resumes correctly instead of silently dead-ending.
        pendingOnboardKeyRef.current = onboardKey;
        if (isRobbie) {
          if (!merged.prof.firstName) {
            const rp = { firstName: "Robbie", lastName: "", bodyWeight: null };
            setProfile(rp); window.storage.set(keyFor(PROFILE_KEY, u), JSON.stringify(rp)).catch(() => {});
            fbSaveData(u.uid, "profile", rp);
          }
          setShowOnboard(true);
        } else if (!merged.prof.firstName) {
          setShowNameEntry(true);
        } else {
          setShowOnboard(true);
        }
      }
    })();
  }, [auth.user, auth.authLoading]);

  const persistActive = useCallback((s) => { window.storage.set(ACTIVE_KEY, JSON.stringify(s)).catch(() => {}); }, []);
  const clearActiveStorage = useCallback(() => { window.storage.delete(ACTIVE_KEY).catch(() => {}); }, []);

  const uid = auth.user?.uid || null;

  // Resolve display name: Robbie only for special email; else profile first name; else "User"
  const profileName = useMemo(() => {
    if ((auth.user?.email || "").toLowerCase() === SPECIAL_ROBBIE_EMAIL) return "Robbie";
    return profile.firstName || "User";
  }, [profile, auth.user]);

  function handleSaveName(firstName, lastName, bodyWeight) {
    const np = { ...profile, firstName, lastName, bodyWeight: bodyWeight ?? profile.bodyWeight };
    setProfile(np);
    window.storage.set(keyFor(PROFILE_KEY, auth.user), JSON.stringify(np)).catch(() => {});
    if (uid) fbSaveData(uid, "profile", np).then(reportSyncResult);
    setShowNameEntry(false);
    setShowOnboard(true);
  }

  function handleUpdateBodyWeight(bw) {
    const np = { ...profile, bodyWeight: bw };
    setProfile(np);
    window.storage.set(keyFor(PROFILE_KEY, auth.user), JSON.stringify(np)).catch(() => {});
    if (uid) fbSaveData(uid, "profile", np).then(reportSyncResult);
  }

  function handleUpdateLandmarks(next) {
    setLandmarkOverrides(next);
    window.storage.set(keyFor(LANDMARKS_KEY, auth.user), JSON.stringify(next)).catch(() => {});
    if (uid) fbSaveData(uid, "landmarks", next).then(reportSyncResult);
  }

  function handleUpdateName(first, last) {
    const np = { ...profile, firstName: first, lastName: last };
    setProfile(np);
    window.storage.set(keyFor(PROFILE_KEY, auth.user), JSON.stringify(np)).catch(() => {});
    if (uid) fbSaveData(uid, "profile", np).then(reportSyncResult);
  }

  // Dual-write helpers (per-account local keys + cloud)
  // changed = the specific session(s) that were added/modified, so we push exactly those to cloud
  function saveSessions(next, changed) {
    window.storage.set(keyFor(SESS_KEY, auth.user), JSON.stringify(next)).catch(() => {});
    if (uid) {
      const toPush = changed ? (Array.isArray(changed) ? changed : [changed]) : next;
      setSyncStatus("syncing"); setSyncError(null);
      Promise.all(toPush.map(s => fbSaveSession(uid, { ...s, lastUpdatedAt: s.lastUpdatedAt || Date.now() })))
        .then((results) => {
          const failed = results.find(r => !r.ok);
          if (failed) { setSyncStatus("failed"); setSyncError(failed.error); }
          else { setSyncStatus("synced"); setSyncError(null); setLastSyncedAt(Date.now()); }
        });
    }
  }
  // Shared: after any single cloud write, actually look at whether it succeeded and
  // reflect that in the UI — this is what makes the sync badge trustworthy instead of
  // optimistic. Only updates state on genuine failure or a fresh confirmed success.
  function reportSyncResult(result) {
    if (!result) return;
    if (result.ok === false) { setSyncStatus("failed"); setSyncError(result.error || "Unknown error"); }
    else { setSyncStatus("synced"); setSyncError(null); setLastSyncedAt(Date.now()); }
  }
  function saveCustomDays(next) {
    window.storage.set(keyFor(CUSTOM_KEY, auth.user), JSON.stringify(next)).catch(() => {});
    if (uid) fbSaveData(uid, "customDays", next).then(reportSyncResult);
  }
  function saveDayAdds(next) {
    window.storage.set(keyFor(ADDS_KEY, auth.user), JSON.stringify(next)).catch(() => {});
    if (uid) fbSaveData(uid, "dayAdds", next).then(reportSyncResult);
  }
  function saveCustomExercises(next) {
    window.storage.set(keyFor(CUSTOM_EX_KEY, auth.user), JSON.stringify(next)).catch(() => {});
    if (uid) fbSaveData(uid, "customExercises", next).then(reportSyncResult);
  }
  // Persist a newly-created custom exercise so it's searchable/reusable in every future
  // workout, day, and account device. De-duped by name (case-insensitive) — re-creating
  // the same name just keeps the first definition rather than piling up duplicates.
  function handleNewCustomExercise(entry) {
    setCustomExercises((prev) => {
      const key = entry.name.trim().toLowerCase();
      if (prev.some((e) => e.name.trim().toLowerCase() === key)) return prev;
      const next = [...prev, entry];
      saveCustomExercises(next);
      return next;
    });
  }

  function saveSideDays(next) {
    window.storage.set(keyFor(SIDE_DAYS_KEY, auth.user), JSON.stringify(next)).catch(() => {});
    if (uid) fbSaveData(uid, "sideDays", next).then(reportSyncResult);
  }
  // Side workouts live entirely outside customDays/rotation — saving, deleting, or
  // starting one never touches the active training plan.
  function handleSaveSideDay(day) {
    setSideDays((prev) => { const next = [...prev, day]; saveSideDays(next); return next; });
    setScreen("library");
  }
  function handleDeleteSideDay(dayId) {
    setSideDays((prev) => { const next = prev.filter((d) => d.id !== dayId); saveSideDays(next); return next; });
  }
  function handleStartSideDay(day) {
    const fresh = buildActiveSession(day);
    setActive(fresh); persistActive(fresh); setScreen("workout"); ensureNotifyPermission();
  }

  function handleForceSync() {
    if (!uid) { alert("Sign in to sync across devices."); return; }
    setSyncStatus("syncing"); setSyncError(null);
    // Push everything, then pull and merge so all devices converge.
    Promise.all(sessions.map(sess => fbSaveSession(uid, { ...sess, lastUpdatedAt: sess.lastUpdatedAt || Date.now() })))
      .then((sessionResults) => Promise.all([
        fbSaveData(uid, "customDays", customDays),
        fbSaveData(uid, "dayAdds", dayAdds),
        fbSaveData(uid, "profile", profile),
        fbSaveData(uid, "customExercises", customExercises),
      ]).then((dataResults) => [...sessionResults, ...dataResults]))
      .then((allResults) => {
        const failed = allResults.find(r => r && r.ok === false);
        if (failed) { setSyncStatus("failed"); setSyncError(failed.error); return; }
        return fbLoadSessions(uid).then((cloud) => {
          // fbLoadSessions already migrates, but guard the merge itself so one malformed
          // record can never take the whole sync down.
          let merged;
          try { merged = mergeSessions(sessions, cloud || []); }
          catch (e) { console.warn("mergeSessions failed, keeping local:", e); merged = sessions; }
          setSessions(merged);
          window.storage.set(keyFor(SESS_KEY, auth.user), JSON.stringify(merged)).catch(() => {});
          setSyncStatus("synced"); setSyncError(null); setLastSyncedAt(Date.now());
        });
      })
      .catch((e) => { console.warn("forceSync failed:", e); setSyncStatus("failed"); setSyncError(String(e && e.message || e)); });
  }

  function handleOnboard(choice) {
    setShowOnboard(false);
    // The onboarding flow has now genuinely finished — persist BOTH flags here,
    // not earlier, so an interrupted signup (closed tab, backgrounded app, etc.)
    // before this point always resumes correctly instead of dead-ending.
    const planInitKey = keyFor(PLAN_INIT_KEY, auth.user);
    window.storage.set(planInitKey, "1").catch(() => {});
    setPlanInitialized(true);
    if (pendingOnboardKeyRef.current) {
      window.storage.set(pendingOnboardKeyRef.current, "1").catch(() => {});
      pendingOnboardKeyRef.current = null;
    }
    if (uid) fbSaveData(uid, "planInitialized", true).catch(() => {});

    if (choice.type === "blank") { setCustomDays([]); saveCustomDays([]); return; }
    if (choice.type === "template") {
      const tmpl = choice.template;
      if (tmpl.id === "blank") { setCustomDays([]); saveCustomDays([]); return; }
      const days = tmpl.days === null
        ? templateDaysFromBuiltIn()
        : tmpl.days.map(d => ({ ...d, custom: true }));
      setCustomDays(days); saveCustomDays(days);
    }
  }

  function handleDuplicateDay(day) {
    const copy = { ...day, id: `custom-${makeId()}`, title: `${day.title} (Copy)`, custom: true, exercises: day.exercises.map(e => ({ ...e, id: `${e.id}-copy` })) };
    setCustomDays(prev => { const next = [...prev, copy]; saveCustomDays(next); return next; });
  }

  function handleChangePlan(template) {
    const days = template.days === null
      ? templateDaysFromBuiltIn()
      : template.days.map(d => ({ ...d, custom: true }));
    setCustomDays(days); saveCustomDays(days);
    setScreen("home");
  }

  const allDays = useMemo(() => {
    // Once the person has gone through setup (planInitialized), respect their
    // choice exactly — including a deliberately empty/blank plan. Only fall back
    // to the default built-in PPL plan for guests who never set up anything at all.
    const base = planInitialized ? customDays : (customDays.length > 0 ? customDays : WORKOUT_DAYS);
    const merge = (day) => { const adds = (dayAdds[day.id] || []).map((a) => ({ ...a, added: true })); return adds.length ? { ...day, exercises: [...day.exercises, ...adds] } : day; };
    return base.map(merge);
  }, [customDays, dayAdds, planInitialized]);
  const allDaysById = useMemo(() => Object.fromEntries(allDays.map((d) => [d.id, d])), [allDays]);
  const nextDay = useMemo(() => recommendNextDay(sessions, allDaysById), [sessions, allDaysById]);
  const insights = useMemo(() => generateInsights(sessions, allDaysById, nextDay), [sessions, allDaysById, nextDay]);

  const liveSelectedDay = selectedDay ? allDaysById[selectedDay.id] || selectedDay : null;
  const liveAddTargetDay = addTargetDay ? allDaysById[addTargetDay.id] || addTargetDay : null;

  function handleSelectDay(day) { setSelectedDay(day); setScreen("daypreview"); }
  function handleStartDay(day) { const fresh = buildActiveSession(allDaysById[day.id] || day); setActive(fresh); persistActive(fresh); setScreen("workout"); ensureNotifyPermission(); }
  function handleResume() { setScreen("workout"); }
  function handleDiscardActive() { setActive(null); clearActiveStorage(); setScreen("home"); }

  function handleAddExercise(day) { setAddTargetDay(day); setAddReturnTo("daypreview"); setScreen("addexercise"); }
  function handleAddExerciseFromWorkout() { if (!active) return; setAddTargetDay({ id: active.dayId, tag: active.dayTag, title: active.dayTitle }); setAddReturnTo("workout"); setScreen("addexercise"); }
  function handleConfirmAdd(dayId, libEx) {
    const cardio = libEx.kind === "cardio" || libEx.muscle === "Cardio" || libEx.equipment === "Cardio";
    const exObj = { id: `add-${makeId()}`, section: libEx.muscle, best: libEx.name, subs: [], kind: cardio ? "cardio" : "lifting", muscle: libEx.muscle, setsLabel: cardio ? "—" : "3", repsLabel: cardio ? "timed" : "8–12", rest: libEx.rest || 90, prefill: cardio ? 0 : 3 };
    if (libEx.isCustom) handleNewCustomExercise({ name: libEx.name, muscle: libEx.muscle, equipment: libEx.equipment || "Other", rest: libEx.rest || 90, kind: cardio ? "cardio" : "lifting" });
    setDayAdds((prev) => { const next = { ...prev, [dayId]: [...(prev[dayId] || []), exObj] }; saveDayAdds(next); return next; });
    if (addReturnTo === "workout" && active && active.dayId === dayId) { const next = { ...active, exercises: [...active.exercises, toActiveExercise(exObj)] }; setActive(next); persistActive(next); setScreen("workout"); }
    else setScreen("daypreview");
  }
  function handleRemoveAdded(dayId, exId) { setDayAdds((prev) => { const next = { ...prev, [dayId]: (prev[dayId] || []).filter((e) => e.id !== exId) }; if (next[dayId].length === 0) delete next[dayId]; saveDayAdds(next); return next; }); }

  // Bake a day's current merged exercise list into customDays (converts built-in to editable custom)
  function commitDayExercises(dayId, newExercises) {
    const merged = allDaysById[dayId];
    if (!merged) return;
    // Strip the "added" flag — everything becomes a normal exercise on the custom day
    const exercises = newExercises.map(({ added, ...rest }) => rest);
    setCustomDays(prev => {
      const exists = prev.some(d => d.id === dayId);
      let next;
      if (exists) next = prev.map(d => d.id === dayId ? { ...d, exercises } : d);
      else next = [...prev, { id: merged.id, tag: merged.tag, title: merged.title, subtitle: merged.subtitle, custom: true, exercises }];
      saveCustomDays(next);
      return next;
    });
    // Clear any dayAdds for this day since they're now baked into the custom day
    setDayAdds(prev => { if (!prev[dayId]) return prev; const next = { ...prev }; delete next[dayId]; saveDayAdds(next); return next; });
  }
  function handleReorderExercise(dayId, exId, dir) {
    const day = allDaysById[dayId];
    if (!day) return;
    const arr = [...day.exercises];
    const idx = arr.findIndex(e => e.id === exId);
    const swap = idx + dir;
    if (idx < 0 || swap < 0 || swap >= arr.length) return;
    [arr[idx], arr[swap]] = [arr[swap], arr[idx]];
    commitDayExercises(dayId, arr);
  }
  function handleRemoveExercisePreview(dayId, exId, isAdded) {
    if (isAdded) { handleRemoveAdded(dayId, exId); return; }
    const day = allDaysById[dayId];
    if (!day) return;
    if (!window.confirm("Remove this exercise from the day?")) return;
    commitDayExercises(dayId, day.exercises.filter(e => e.id !== exId));
  }

  function handleFinish(session) {
    const now = Date.now();
    const acc = committedAccum(session, now);
    const record = {
      id: session.id, dayId: session.dayId, dayTitle: session.dayTitle, dayTag: session.dayTag, date: session.date,
      status: "completed", completedAt: new Date().toISOString(), resumedAt: session.resumedAt || null, archivedAt: null,
      versionNumber: session.versionNumber || 1, parentWorkoutId: session.parentWorkoutId || null,
      lastUpdatedAt: Date.now(),
      totalElapsedSeconds: acc.workAccumSeconds + acc.restAccumSeconds, restSeconds: acc.restAccumSeconds, workSeconds: acc.workAccumSeconds,
      exercises: session.exercises.map((e) => ({ exId: e.exId, selectedLift: e.selectedLift, notes: e.notes || "", cardio: isCardioExercise(e), muscle: e.muscle || e.section || "", sets: (e.sets || []).filter((s) => s.done).map((s) => ({ weight: Number(s.weight) || 0, reps: Number(s.reps) || 0, lift: s.lift || e.selectedLift })) })).filter((e) => e.sets.length > 0 || e.cardio || e.notes),
    };
    record.volume = sessionVolume(record);
    setSessions((prev) => { const next = pruneSessions([record, ...prev]); saveSessions(next, record); return next; });
    setActive(null); clearActiveStorage(); setLastFinished(record); setScreen("summary");
  }
  function handleContinueWorkout(record) {
    if (!record || !Array.isArray(record.exercises)) { alert("This session can't be continued."); return; }
    if (active && !window.confirm("You have an active workout. Continuing this one will replace it. Proceed?")) return;
    const rebuilt = {
      id: record.id || makeId(),
      dayId: record.dayId,
      dayTitle: record.dayTitle || "Workout",
      dayTag: record.dayTag || "CUSTOM",
      date: record.date || new Date().toISOString(),
      startTime: Date.now(),
      phase: "working",
      phaseStartedAt: Date.now(),
      workAccumSeconds: record.workSeconds || 0,
      restAccumSeconds: record.restSeconds || 0,
      restTarget: 0,
      resumedAt: new Date().toISOString(),
      versionNumber: (record.versionNumber || 1),
      parentWorkoutId: record.parentWorkoutId || null,
      exercises: record.exercises.map((e) => {
        const isCardio = !!e.cardio || e.kind === "cardio" || e.muscle === "Cardio" || e.section === "Cardio";
        const srcSets = Array.isArray(e.sets) ? e.sets : [];
        return {
          exId: e.exId || makeId(),
          section: e.muscle || e.section || "",
          selectedLift: e.selectedLift || e.best || "Exercise",
          best: e.selectedLift || e.best || "Exercise",
          subs: [],
          kind: isCardio ? "cardio" : "lifting",
          muscle: e.muscle || e.section || "",
          notes: e.notes || "",
          setsLabel: isCardio ? "—" : String(srcSets.length || 3),
          repsLabel: isCardio ? "timed" : "8-12",
          rest: 90,
          sets: isCardio ? [] : srcSets.map((s) => ({ weight: String(s.weight ?? ""), reps: String(s.reps ?? ""), done: true, lift: s.lift || e.selectedLift })),
        };
      }),
    };
    setSessions((prev) => { const next = prev.filter((s) => s.id !== record.id); saveSessions(next); return next; });
    if (uid) fbDeleteSession(uid, record.id);
    setActive(rebuilt); persistActive(rebuilt); setScreen("workout");
  }
  function handleSaveEditedSession(updated) {
    setSessions((prev) => {
      const next = prev.map((s) => (s.id === updated.id ? updated : s));
      saveSessions(next, updated);
      return next;
    });
    setEditingSession(null);
    setScreen("history");
  }

  function handleDeleteSessions(ids) {
    const set = new Set(ids);
    setSessions((prev) => { const next = prev.filter((s) => !set.has(s.id)); saveSessions(next); return next; });
    if (uid) ids.forEach(id => fbDeleteSession(uid, id));
  }
  function handleMergeSessions(ids) {
    if (!ids || ids.length < 2) return;
    const idSet = new Set(ids);
    const picked = sessions.filter((s) => idSet.has(s.id)).sort((a, b) => new Date(a.date) - new Date(b.date));
    if (picked.length < 2) return;
    if (!window.confirm(`Merge ${picked.length} sessions into one? The originals will be replaced by a single combined session.`)) return;

    const base = picked[0]; // earliest — keep its date/day identity
    // Union exercises by normalized lift name, concatenating sets and notes
    const exMap = new Map();
    const order = [];
    for (const s of picked) {
      for (const e of s.exercises) {
        const key = normalizeLiftName(e.selectedLift);
        if (!exMap.has(key)) { exMap.set(key, { exId: e.exId || makeId(), selectedLift: e.selectedLift, muscle: e.muscle || "", notes: e.notes || "", cardio: !!e.cardio, sets: [...(e.sets || [])] }); order.push(key); }
        else {
          const cur = exMap.get(key);
          cur.sets = [...cur.sets, ...(e.sets || [])];
          if (e.notes) cur.notes = cur.notes ? `${cur.notes} · ${e.notes}` : e.notes;
          cur.cardio = cur.cardio || !!e.cardio;
        }
      }
    }
    const mergedExercises = order.map((k) => exMap.get(k));
    const merged = {
      id: base.id,
      dayId: base.dayId, dayTitle: base.dayTitle, dayTag: base.dayTag, date: base.date,
      status: "completed", completedAt: new Date().toISOString(),
      resumedAt: base.resumedAt || null, archivedAt: null,
      versionNumber: base.versionNumber || 1, parentWorkoutId: base.parentWorkoutId || null,
      lastUpdatedAt: Date.now(),
      mergedFrom: picked.map((s) => s.id),
      totalElapsedSeconds: picked.reduce((a, s) => a + (s.totalElapsedSeconds || 0), 0),
      restSeconds: picked.reduce((a, s) => a + (s.restSeconds || 0), 0),
      workSeconds: picked.reduce((a, s) => a + (s.workSeconds || 0), 0),
      exercises: mergedExercises,
    };
    merged.volume = sessionVolume(merged);

    setSessions((prev) => {
      const next = pruneSessions([merged, ...prev.filter((s) => !idSet.has(s.id))]);
      saveSessions(next, merged);
      return next;
    });
    // Remove old cloud docs (except the one we reused), then save merged
    if (uid) {
      picked.forEach((s) => { if (s.id !== merged.id) fbDeleteSession(uid, s.id); });
    }
  }
  function handleSaveNewDay(day) { setCustomDays((prev) => { const next = [...prev, day]; saveCustomDays(next); return next; }); setScreen("home"); }
  function handleDeleteCustomDay(dayId) {
    setCustomDays((prev) => { const next = prev.filter((d) => d.id !== dayId); saveCustomDays(next); return next; });
    setScreen("home");
  }
  function openCalendarDay(ds, date) { setCalendarDay({ daySessions: ds, date }); setScreen("daydetail"); }

  if (!ready || auth.authLoading) return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-3" style={{ backgroundColor: C.bg, fontFamily: FONT }}>
      <Logo size={48} />
      <div className="text-[13px]" style={{ color: C.ink3 }}>Loading…</div>
    </div>
  );

  if (showAuth && FB_ENABLED && !auth.user) return (
    <div style={{ fontFamily: FONT, backgroundColor: C.surface }}>
      <div className="max-w-md mx-auto" style={{ backgroundColor: C.bg }}>
        <AuthScreen auth={auth} onGuest={() => { setShowAuth(false); window.storage.set(ONBOARD_KEY, "guest").catch(() => {}); }} />
      </div>
    </div>
  );

  if (showNameEntry) return (
    <div style={{ fontFamily: FONT, backgroundColor: C.surface }}>
      <div className="max-w-md mx-auto" style={{ backgroundColor: C.bg }}>
        <NameEntryScreen onSave={handleSaveName} />
      </div>
    </div>
  );

  if (showOnboard) return (
    <div style={{ fontFamily: FONT, backgroundColor: C.surface }}>
      <div className="max-w-md mx-auto" style={{ backgroundColor: C.bg }}>
        <OnboardingScreen hasLocalData={hasLocalData} onSelect={handleOnboard} />
      </div>
    </div>
  );

  const showNav = ["home", "calendar", "progress", "history", "profile"].includes(screen);

  return (
    <div className="min-h-screen" style={{ backgroundColor: C.surface, fontFamily: FONT, WebkitFontSmoothing: "antialiased" }}>
      <div className="max-w-md mx-auto relative" style={{ minHeight: "100vh", paddingTop: "env(safe-area-inset-top, 0px)", backgroundColor: C.bg }}>
        {screen === "home" && <HomeScreen sessions={sessions} activeSession={active} days={allDays} onSelectDay={handleSelectDay} onResume={handleResume} onDiscard={handleDiscardActive} onNewDay={() => setScreen("newday")} onOpenCoach={() => setScreen("coach")} onOpenLibrary={() => setScreen("library")} insights={insights} nextDay={nextDay} onDeleteDay={handleDeleteCustomDay} onDuplicateDay={handleDuplicateDay} onChangePlan={() => setScreen("changeplan")} />}
        {screen === "library" && <LibraryScreen sessions={sessions} customExercises={customExercises} sideDays={sideDays} onBack={() => setScreen("home")} onNewCustomExercise={handleNewCustomExercise} onNewSideDay={() => setScreen("newsideday")} onStartSideDay={handleStartSideDay} onDeleteSideDay={handleDeleteSideDay} />}
        {screen === "newsideday" && <NewDayScreen onSave={handleSaveSideDay} onCancel={() => setScreen("library")} customExercises={customExercises} onNewCustomExercise={handleNewCustomExercise} />}
        {screen === "changeplan" && <ChangePlanScreen currentDayCount={allDays.length} onSelect={handleChangePlan} onBack={() => setScreen("home")} />}
        {screen === "daypreview" && liveSelectedDay && <DayPreviewScreen day={liveSelectedDay} sessions={sessions} onStart={handleStartDay} onBack={() => setScreen("home")} onAddExercise={handleAddExercise} onRemoveAdded={handleRemoveAdded} onDeleteCustomDay={handleDeleteCustomDay} onReorderExercise={handleReorderExercise} onRemoveExercise={handleRemoveExercisePreview} />}
        {screen === "addexercise" && liveAddTargetDay && <AddExerciseScreen day={liveAddTargetDay} onAdd={handleConfirmAdd} onBack={() => setScreen(addReturnTo)} customExercises={customExercises} />}
        {screen === "calendar" && <CalendarScreen sessions={sessions} onOpenDay={openCalendarDay} />}
        {screen === "daydetail" && calendarDay && <DayDetailScreen daySessions={calendarDay.daySessions} date={calendarDay.date} onBack={() => setScreen("calendar")} />}
        {screen === "progress" && <ProgressScreen sessions={sessions} bodyWeight={profile.bodyWeight} landmarkOverrides={landmarkOverrides} />}
        {screen === "history" && <HistoryScreen sessions={sessions} onDeleteSessions={handleDeleteSessions} onContinue={handleContinueWorkout} onMerge={handleMergeSessions} onEdit={(s) => { setEditingSession(s); setScreen("editsession"); }} />}
        {screen === "editsession" && editingSession && <EditSessionScreen session={editingSession} onSave={handleSaveEditedSession} onBack={() => { setEditingSession(null); setScreen("history"); }} onDelete={(id) => { handleDeleteSessions([id]); setEditingSession(null); setScreen("history"); }} />}
        {screen === "profile" && <ProfileScreen sessions={sessions} customDays={customDays} dayAdds={dayAdds} user={auth.user} auth={auth} syncStatus={syncStatus} syncError={syncError} lastSyncedAt={lastSyncedAt} onForceSync={handleForceSync} profileName={profileName} firstName={profile.firstName} lastName={profile.lastName} onUpdateName={handleUpdateName} bodyWeight={profile.bodyWeight} onUpdateBodyWeight={handleUpdateBodyWeight} landmarkOverrides={landmarkOverrides} onUpdateLandmarks={handleUpdateLandmarks} />}
        {screen === "coach" && <CoachScreen insights={insights} nextDay={nextDay} onBack={() => setScreen("home")} onStartNext={handleSelectDay} profileName={profileName} />}
        {screen === "workout" && active && <WorkoutScreen active={active} setActive={setActive} sessions={sessions} persistActive={persistActive} onFinish={handleFinish} onExit={() => setScreen("home")} onAddExercise={handleAddExerciseFromWorkout} onDiscard={handleDiscardActive} />}
        {screen === "newday" && <NewDayScreen onSave={handleSaveNewDay} onCancel={() => setScreen("home")} customExercises={customExercises} onNewCustomExercise={handleNewCustomExercise} />}
        {screen === "summary" && lastFinished && <SummaryScreen session={lastFinished} onDone={() => setScreen("home")} />}
        {showNav && <BottomNav screen={screen} setScreen={setScreen} />}
        {showNav && <InstallBanner />}
      </div>
    </div>
  );
}

