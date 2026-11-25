/** IndexedDB key-value store, with a localStorage fallback. */

const DB = 'nebula-os';
const STORE = 'kv';

function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error('IndexedDB failed'));
  });
}

function idbGet(db, key) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly');
    const request = tx.objectStore(STORE).get(key);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function idbSet(db, key, value) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).put(value, key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

let dbPromise = null;
function db() {
  if (!dbPromise) {
    dbPromise = openDB().catch((error) => {
      dbPromise = null;
      throw error;
    });
  }
  return dbPromise;
}

export async function persistGet(key) {
  try {
    const database = await db();
    const value = await idbGet(database, key);
    if (value !== undefined) return value;
  } catch {
    /* fall through */
  }
  try {
    const raw = localStorage.getItem(`nebula.kv.${key}`);
    return raw ? JSON.parse(raw) : undefined;
  } catch {
    return undefined;
  }
}

export async function persistSet(key, value) {
  try {
    const database = await db();
    await idbSet(database, key, value);
    return;
  } catch {
    /* fall through */
  }
  try {
    localStorage.setItem(`nebula.kv.${key}`, JSON.stringify(value));
  } catch {
    /* ignore quota */
  }
}
