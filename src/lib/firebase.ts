import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import {
  collection,
  getDocsFromServer,
  getFirestore,
  initializeFirestore,
  limit,
  memoryLocalCache,
  query,
  where,
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';
import { AI_CONSENT_REQUIRED_MESSAGE, AI_CONSENT_VERSION, hasAiConsent } from './consent';

// Reuse the existing app instance during Vite HMR.
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
const databaseId =
  firebaseConfig.firestoreDatabaseId && firebaseConfig.firestoreDatabaseId !== '(default)'
    ? firebaseConfig.firestoreDatabaseId
    : undefined;

/**
 * Health records are intentionally restricted to Firestore's in-memory cache.
 * Persistent browser storage (IndexedDB) is not an encrypted vault and can survive
 * sign-out or device hand-off. This trades signed-in offline persistence for a
 * smaller local exposure window; guest demo data remains synthetic/local-only.
 */
function createFirestore(): ReturnType<typeof getFirestore> {
  try {
    return initializeFirestore(app, { localCache: memoryLocalCache() }, databaseId);
  } catch (error) {
    console.warn('Could not initialise the explicit in-memory Firestore cache; using the default in-memory cache:', error);
    return databaseId ? getFirestore(app, databaseId) : getFirestore(app);
  }
}

export const db = createFirestore();

export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

/**
 * Read the server-authoritative AI consent state. The server issues an HttpOnly,
 * UID-bound cookie only after an authenticated consent action.
 */
export async function getServerAiConsent(): Promise<boolean> {
  const currentUser = auth.currentUser;
  if (!currentUser) return false;
  const idToken = await currentUser.getIdToken();
  const response = await fetch('/api/consent', {
    method: 'GET',
    headers: { Authorization: `Bearer ${idToken}` },
    credentials: 'same-origin',
    cache: 'no-store',
  });
  if (!response.ok) {
    const body = await response.json().catch(() => ({})) as { error?: string };
    throw new Error(body.error || 'Could not check the server-side AI consent state.');
  }
  const body = await response.json() as { granted?: boolean };
  return body.granted === true;
}

/** Record the user's choice with the authenticated server before updating local UI state. */
export async function setServerAiConsent(granted: boolean): Promise<void> {
  const currentUser = auth.currentUser;
  if (!currentUser) throw new Error('Sign in before changing AI consent.');
  const idToken = await currentUser.getIdToken();
  const response = await fetch('/api/consent', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${idToken}`,
      'Content-Type': 'application/json',
    },
    credentials: 'same-origin',
    cache: 'no-store',
    body: JSON.stringify({ granted, version: AI_CONSENT_VERSION }),
  });
  if (!response.ok) {
    const body = await response.json().catch(() => ({})) as { error?: string };
    throw new Error(body.error || 'Could not save the AI consent choice on the server.');
  }
}

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
