import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import {
  collection,
  getDocsFromServer,
  getFirestore,
  initializeFirestore,
  limit,
  persistentLocalCache,
  persistentMultipleTabManager,
  query,
  where,
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';
import { AI_CONSENT_REQUIRED_MESSAGE, hasAiConsent } from './consent';

// Reuse the existing app instance during Vite HMR.
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
const databaseId =
  firebaseConfig.firestoreDatabaseId && firebaseConfig.firestoreDatabaseId !== '(default)'
    ? firebaseConfig.firestoreDatabaseId
    : undefined;

/**
 * Keep the signed-in user's Firestore cache in IndexedDB across reloads and tabs.
 * Firestore queues writes while offline and syncs them after reconnecting. If the
 * browser blocks persistent storage (private mode / unsupported environment), fall
 * back to the normal in-memory Firestore instance without breaking app startup.
 */
function createFirestore(): ReturnType<typeof getFirestore> {
  try {
    return initializeFirestore(
      app,
      { localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }) },
      databaseId,
    );
  } catch (error) {
    console.warn('Persistent Firestore cache is unavailable; using in-memory cache instead:', error);
    return getFirestore(app, databaseId);
  }
}

export const db = createFirestore();

export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

export type FirestoreConnectionStatus =
  | 'connected'
  | 'unauthenticated'
  | 'permission-denied'
  | 'offline'
  | 'error';

/**
 * Check Firestore connectivity using an authenticated, rules-compatible query.
 * A permission error is deliberately reported separately from a network failure.
 */
export async function testConnection(): Promise<FirestoreConnectionStatus> {
  const currentUser = auth.currentUser;
  if (!currentUser) return 'unauthenticated';

  try {
    await getDocsFromServer(
      query(
        collection(db, 'notes'),
        where('userId', '==', currentUser.uid),
        limit(1),
      ),
    );
    return 'connected';
  } catch (error) {
    const code = (error as { code?: string } | null)?.code;
    if (code === 'permission-denied') return 'permission-denied';
    if (
      code === 'unavailable' ||
      code === 'deadline-exceeded' ||
      code === 'network-request-failed'
    ) {
      return 'offline';
    }

    console.error('Unexpected Firestore connection check error:', error);
    return 'error';
  }
}

/**
 * Send a same-origin API request with the current Firebase user's ID token.
 * Guest/demo mode deliberately cannot call protected AI endpoints.
 */
export async function authenticatedApiFetch(input: RequestInfo | URL, init: RequestInit = {}): Promise<Response> {
  const currentUser = auth.currentUser;
  if (!currentUser) {
    throw new Error('Sign in with Google to use AI features. Guest demo mode does not send data to the AI server.');
  }

  // AI requests send the selected text/files to the server and on to Gemini, so the
  // signed-in user must have accepted the data-use notice (see Privacy Center / ConsentModal).
  if (!hasAiConsent(currentUser.uid)) {
    throw new Error(AI_CONSENT_REQUIRED_MESSAGE);
  }

  const idToken = await currentUser.getIdToken();
  const headers = new Headers(init.headers || {});
  headers.set('Authorization', `Bearer ${idToken}`);
  return fetch(input, { ...init, headers, credentials: 'same-origin' });
}
