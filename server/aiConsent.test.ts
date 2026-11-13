import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  AI_CONSENT_COOKIE_MAX_AGE_SECONDS,
  issueAiConsentCookie,
  verifyAiConsentCookie,
} from './aiConsent';

const SECRET = 'test-only-secret-that-is-at-least-32-characters';

test('server consent cookie is valid only for the issuing Firebase UID', () => {
  const now = Date.UTC(2026, 10, 13, 12, 0, 0);
  const cookie = issueAiConsentCookie('user-123', SECRET, now);
  assert.equal(verifyAiConsentCookie(cookie, 'user-123', SECRET, now + 1_000), true);
  assert.equal(verifyAiConsentCookie(cookie, 'another-user', SECRET, now + 1_000), false);
});

test('server consent cookie rejects payload tampering and a different signing secret', () => {
  const cookie = issueAiConsentCookie('user-123', SECRET);
  const [payload, signature] = cookie.split('.');
  const changedPayload = Buffer.from(JSON.stringify({ uid: 'attacker', version: 'ai-data-use-v1' })).toString('base64url');
  assert.equal(verifyAiConsentCookie(`${changedPayload}.${signature}`, 'user-123', SECRET), false);
  assert.equal(verifyAiConsentCookie(cookie, 'user-123', 'different-secret-that-is-also-at-least-32-characters'), false);
});

test('server consent cookie expires and rejects malformed or short-secret values', () => {
  const now = Date.UTC(2026, 10, 13, 12, 0, 0);
  const cookie = issueAiConsentCookie('user-123', SECRET, now);
  const expiredAt = now + (AI_CONSENT_COOKIE_MAX_AGE_SECONDS + 1) * 1_000;
  assert.equal(verifyAiConsentCookie(cookie, 'user-123', SECRET, expiredAt), false);
  assert.equal(verifyAiConsentCookie('not-a-cookie', 'user-123', SECRET), false);
  assert.throws(() => issueAiConsentCookie('user-123', 'short', now), /at least 32 characters/);
});
