/**
 * Per-account record of the user's choice about sending selected text/files to the AI server.
 * Stored only in this browser (localStorage), keyed by Firebase UID, so switching accounts
 * on a shared device never reuses someone else's consent.
 */
export type AiConsentState = 'granted' | 'declined' | 'unset';

const keyFor = (uid: string) => `shastho:consent:ai:v1:${uid}`;

export function getAiConsentState(uid: string): AiConsentState {
  try {
    const value = localStorage.getItem(keyFor(uid));
    return value === 'granted' || value === 'declined' ? value : 'unset';
  } catch {
    return 'unset';
  }
}

export function hasAiConsent(uid: string): boolean {
  return getAiConsentState(uid) === 'granted';
}

export function setAiConsent(uid: string, granted: boolean): void {
  try {
    localStorage.setItem(keyFor(uid), granted ? 'granted' : 'declined');
  } catch (error) {
    console.warn('Could not store the AI consent choice in this browser:', error);
  }
}

export function clearAiConsent(uid: string): void {
  try {
    localStorage.removeItem(keyFor(uid));
  } catch {
    /* ignore */
  }
}

export const AI_CONSENT_REQUIRED_MESSAGE =
  'Please review and accept the AI data-use notice first (Privacy Center). / AI ডেটা-ব্যবহার নোটিশ আগে দেখে গ্রহণ করুন (Privacy Center)।';
