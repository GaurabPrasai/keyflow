/**
 * Session storage. Guests keep everything in IndexedDB; browsers without it
 * (or in private mode where it throws) fall back to localStorage. Writes never
 * block typing: callers use saveSession() from an idle callback.
 */
const DB_NAME = "keyflow";
const STORE = "sessions";
const DB_VERSION = 1;
const LS_KEY = "keyflow-sessions";
const MAX_LOCAL = 5_000;

let dbPromise = null;
let memory = null;

function openDb() {
  if (dbPromise) return dbPromise;
  if (typeof indexedDB === "undefined") {
    dbPromise = Promise.resolve(null);
    return dbPromise;
  }
  dbPromise = new Promise((resolve) => {
    let request;
    try {
      request = indexedDB.open(DB_NAME, DB_VERSION);
    } catch {
      resolve(null);
      return;
    }
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE)) {
        const store = db.createObjectStore(STORE, { keyPath: "id" });
        store.createIndex("startedAt", "startedAt");
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => resolve(null);
    request.onblocked = () => resolve(null);
  });
  return dbPromise;
}

function readFallback() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeFallback(sessions) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(sessions.slice(-MAX_LOCAL)));
  } catch {
    /* storage full or blocked - sessions still work for this tab */
  }
}

function byNewest(a, b) {
  return String(b.startedAt).localeCompare(String(a.startedAt));
}

export async function loadSessions() {
  if (memory) return memory.slice();
  const db = await openDb();
  if (!db) {
    memory = readFallback().sort(byNewest);
    return memory.slice();
  }
  const sessions = await new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE, "readonly");
      const request = tx.objectStore(STORE).getAll();
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => resolve([]);
    } catch {
      resolve([]);
    }
  });
  memory = sessions.sort(byNewest);
  return memory.slice();
}

export async function saveSession(session) {
  if (!session?.id) return;
  if (memory) {
    memory = [session, ...memory.filter((item) => item.id !== session.id)].sort(byNewest);
  }
  const db = await openDb();
  if (!db) {
    const sessions = readFallback().filter((item) => item.id !== session.id);
    sessions.push(session);
    writeFallback(sessions);
    memory = sessions.sort(byNewest);
    return;
  }
  await new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE, "readwrite");
      tx.objectStore(STORE).put(session);
      tx.oncomplete = resolve;
      tx.onerror = resolve;
      tx.onabort = resolve;
    } catch {
      resolve();
    }
  });
}

export async function saveSessions(sessions) {
  for (const session of sessions) {
    await saveSession(session);
  }
}

export async function deleteAllSessions() {
  memory = [];
  const db = await openDb();
  if (db) {
    await new Promise((resolve) => {
      try {
        const tx = db.transaction(STORE, "readwrite");
        tx.objectStore(STORE).clear();
        tx.oncomplete = resolve;
        tx.onerror = resolve;
        tx.onabort = resolve;
      } catch {
        resolve();
      }
    });
  }
  try {
    localStorage.removeItem(LS_KEY);
  } catch {
    /* ignore */
  }
}

/** Runs a callback when the main thread is free, falling back to a timeout. */
export function whenIdle(callback, timeout = 1_500) {
  if (typeof requestIdleCallback === "function") {
    requestIdleCallback(callback, { timeout });
    return;
  }
  window.setTimeout(callback, 0);
}
