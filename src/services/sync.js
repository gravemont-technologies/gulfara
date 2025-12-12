// ARCHIVED: Supabase sync removed. Persistence now handled via Firebase/Firestore.
import { openDB } from 'idb';

const DB_NAME = 'gulfArabicFlashcards';
const QUEUE_STORE = 'syncQueue';

const hasIndexedDB = typeof indexedDB !== 'undefined';

const dbPromise = hasIndexedDB
  ? openDB(DB_NAME, 1, {
      upgrade(db) {
        db.createObjectStore(QUEUE_STORE, { keyPath: 'id', autoIncrement: true });
      },
    })
  : null;

export const queueAction = async (action) => {
  if (!hasIndexedDB || !dbPromise) {
    return;
  }
  const db = await dbPromise;
  await db.add(QUEUE_STORE, action);
};

export const sync = async () => {
  if (!hasIndexedDB || !dbPromise) return;
  if (!navigator.onLine) return;

  // TODO: Replace with Firebase/Firestore sync logic
  console.warn('sync: Supabase removed, implement Firebase persistence.');
  const db = await dbPromise;
  let transaction = await db.getAll(QUEUE_STORE);

  // Stub: mark all actions as processed without actual sync
  for (const action of transaction) {
    console.log('Queued action (not synced):', action.type);
    // Skip actual sync logic during migration
    await db.delete(QUEUE_STORE, action.id);
  }
};

export const syncFunction = async (data) => data;

if (hasIndexedDB) {
  window.addEventListener('online', sync);
  setInterval(sync, 60000);
}