import { createHmac, timingSafeEqual } from 'node:crypto';
import { AI_CONSENT_VERSION } from '../src/lib/consent';

export const AI_CONSENT_COOKIE_NAME = 'shastho_ai_consent';
export const AI_CONSENT_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 180;

interface ConsentPayload {
  uid: string;
  version: string;
  acceptedAt: number;
  expiresAt: number;
}

function signatureFor(encodedPayload: string, secret: string): string {
  return createHmac('sha256', secret).update(encodedPayload).digest('base64url');
}

export function issueAiConsentCookie(uid: string, secret: string, nowMs = Date.now()): string {
  if (!uid || !secret || secret.length < 32) {
    throw new Error('AI_CONSENT_COOKIE_SECRET must contain at least 32 characters.');
  }
  const acceptedAt = Math.floor(nowMs / 1000);
  const payload: ConsentPayload = {
    uid,
    version: AI_CONSENT_VERSION,
    acceptedAt,
    expiresAt: acceptedAt + AI_CONSENT_COOKIE_MAX_AGE_SECONDS,
  };
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString('base64url');
  return `${encodedPayload}.${signatureFor(encodedPayload, secret)}`;
}

/**
 * Validate integrity, UID binding, consent version and expiry. This is a
 * server-verifiable permission token, not a central legal consent ledger.
 */
export function verifyAiConsentCookie(
  value: string | null | undefined,
  uid: string,
  secret: string,
  nowMs = Date.now(),
): boolean {
  if (!value || value.length > 2048 || !uid || !secret || secret.length < 32) return false;
  const parts = value.split('.');
  if (parts.length !== 2 || !parts[0] || !parts[1]) return false;

  const expected = Buffer.from(signatureFor(parts[0], secret), 'base64url');
  const supplied = Buffer.from(parts[1], 'base64url');
  if (expected.length !== supplied.length || !timingSafeEqual(expected, supplied)) return false;

  try {
    const payload = JSON.parse(Buffer.from(parts[0], 'base64url').toString('utf8')) as Partial<ConsentPayload>;
    const nowSeconds = Math.floor(nowMs / 1000);
    return payload.uid === uid &&
      payload.version === AI_CONSENT_VERSION &&
      Number.isInteger(payload.acceptedAt) &&
      Number.isInteger(payload.expiresAt) &&
      (payload.acceptedAt as number) <= nowSeconds + 60 &&
      (payload.acceptedAt as number) > 0 &&
      (payload.expiresAt as number) > nowSeconds &&
      (payload.expiresAt as number) - (payload.acceptedAt as number) === AI_CONSENT_COOKIE_MAX_AGE_SECONDS;
  } catch {
    return false;
  }
}
