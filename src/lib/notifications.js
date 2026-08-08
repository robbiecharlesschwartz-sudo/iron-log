export async function ensureNotifyPermission() {
  if (!("Notification" in window)) return false;
  if (Notification.permission === "granted") return true;
  if (Notification.permission === "denied") return false;
  try { const p = await Notification.requestPermission(); return p === "granted"; } catch { return false; }
}


export function scheduleRestNotification(delayMs, label) {
  try {
    if (!("serviceWorker" in navigator) || !navigator.serviceWorker.controller) return;
    if (!("Notification" in window) || Notification.permission !== "granted") return;
    navigator.serviceWorker.controller.postMessage({ type: "REST_SCHEDULE", delay: delayMs, label });
  } catch {}
}


export function cancelRestNotification() {
  try {
    if (!("serviceWorker" in navigator) || !navigator.serviceWorker.controller) return;
    navigator.serviceWorker.controller.postMessage({ type: "REST_CANCEL" });
  } catch {}
}

