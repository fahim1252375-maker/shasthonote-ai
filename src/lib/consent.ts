/**
 * The current AI data-use notice version. The server binds its signed consent cookie to this.
 */
export const AI_CONSENT_VERSION = 'ai-data-use-v1';

/**
 * Non-authoritative UI mirror of the user's choice, keyed by Firebase UID.
 * The backend does not trust this localStorage value: all AI routes require a
 * server-issued, HttpOnly, UID-bound consent cookie as well.
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
