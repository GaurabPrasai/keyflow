import api from "../services/api";
import { loadSessions, saveSessions } from "./storage";

const BATCH = 100;
let inFlight = null;

/** Upload sessions in batches; the server upserts by id so retries are safe. */
export async function pushSessions(sessions) {
  for (let i = 0; i < sessions.length; i += BATCH) {
    await api.bulkSessions(sessions.slice(i, i + BATCH));
  }
}

export function pushSessionInBackground(session, authenticated) {
  if (!authenticated || !session) return;
  const run = () => api.bulkSessions([session]).catch(() => {});
  if (typeof requestIdleCallback === "function") requestIdleCallback(run, { timeout: 3_000 });
  else window.setTimeout(run, 1_000);
}

/**
 * Merge the server copy into local storage, then upload anything the server is
 * missing. Called after sign-in; safe to call more than once.
 */
export function syncSessions() {
  if (inFlight) return inFlight;
  inFlight = (async () => {
    const local = await loadSessions();
    try {
      const data = await api.listSessions(500);
      const known = new Set(local.map((session) => session.id));
      const missing = (data.sessions || []).filter((session) => !known.has(session.id));
      if (missing.length) await saveSessions(missing);
    } catch {
      /* offline: local reports still work */
    }
    try {
      if (local.length) await pushSessions(local);
    } catch {
      /* retried next sign-in */
    }
  })().finally(() => {
    inFlight = null;
  });
  return inFlight;
}
