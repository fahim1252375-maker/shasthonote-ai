/**
 * Small generic helpers for per-user Firestore collections.
 * Every query is filtered by `userId`, matching the owner-only Firestore rules.
 */
import { collection, deleteDoc, doc, getDocs, query, setDoc, where } from 'firebase/firestore';
import { db } from './firebase';

export type OwnedCollection =
  | 'notes'
  | 'documents'
  | 'appointments'
  | 'study_resources'
  | 'vitals'
  | 'medications';

export const OWNED_COLLECTIONS: OwnedCollection[] = [
  'notes',
  'documents',
  'appointments',
  'study_resources',
  'vitals',
  'medications',
];

/** Firestore rejects `undefined` field values; a JSON round trip drops them safely. */
function withoutUndefined<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

export async function saveOwnedRecord<T extends { id: string; userId: string }>(
  name: OwnedCollection,
  record: T,
): Promise<void> {
  await setDoc(doc(db, name, record.id), withoutUndefined(record));
}

export async function deleteOwnedRecord(name: OwnedCollection, id: string): Promise<void> {
  await deleteDoc(doc(db, name, id));
}

export async function loadOwnedRecords<T extends { userId: string }>(name: OwnedCollection, uid: string): Promise<T[]> {
  const snapshot = await getDocs(query(collection(db, name), where('userId', '==', uid)));
  return snapshot.docs.map((item) => item.data() as T).filter((item) => item.userId === uid);
}

/**
 * Permanently delete every record the signed-in user owns (and their profile document).
 * Returns how many documents were removed from each collection.
 * This does NOT delete the Firebase Authentication account itself.
 */
export async function deleteAllOwnedRecords(uid: string): Promise<Record<OwnedCollection | 'profile', number>> {
  const counts = {
    notes: 0,
    documents: 0,
    appointments: 0,
    study_resources: 0,
    vitals: 0,
    medications: 0,
    profile: 0,
  } as Record<OwnedCollection | 'profile', number>;

  for (const name of OWNED_COLLECTIONS) {
    const snapshot = await getDocs(query(collection(db, name), where('userId', '==', uid)));
    const ids = snapshot.docs.filter((item) => (item.data() as { userId?: string }).userId === uid).map((item) => item.id);
    // Small batches keep memory and request bursts bounded.
    for (let index = 0; index < ids.length; index += 20) {
      await Promise.all(ids.slice(index, index + 20).map((id) => deleteDoc(doc(db, name, id))));
    }
    counts[name] = ids.length;
  }

  try {
    await deleteDoc(doc(db, 'users', uid));
    counts.profile = 1;
  } catch (error) {
    console.warn('Could not delete the profile document (it may not exist):', error);
  }
  return counts;
}
