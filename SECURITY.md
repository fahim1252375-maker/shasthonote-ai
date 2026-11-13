# Security notes — ShasthoNote AI

This document describes the current repository implementation. It is not a certification, penetration-test report, or claim of regulatory compliance.

## Offline storage and backup security

- Signed-in Firestore records use a memory-only cache; the app no longer enables persistent IndexedDB caching for health data. This reduces local persistence but does not protect data from a compromised browser session, extensions, screenshots or a compromised device. Guest demo data remains in localStorage and is synthetic.
- The PWA service worker only caches static same-origin assets and the app shell. It bypasses `/api/` requests and never caches health data or authentication responses.
- Encrypted backup files use AES-256-GCM with a PBKDF2-SHA-256 derived key (310,000 iterations), random 128-bit salt, and random 96-bit IV. Do not reuse a weak passphrase. Losing the passphrase makes the backup unrecoverable.
- Plain JSON backups are intentionally retained for compatibility but are not encrypted. Store them as sensitive personal data.


## Authentication and API access

- The browser uses Firebase Authentication with Google sign-in.
- Guest/demo mode has a local demo profile only. It does not create a Firebase credential and cannot call `/api/gemini/*`.
- `src/lib/firebase.ts` obtains a Firebase ID token from the current signed-in user and sends it as a Bearer token in same-origin API requests.
- `server.ts` verifies the RS256 signature using Google's Firebase Secure Token public JWK endpoint, then checks the project audience, issuer, subject, expiration, issued-at time, and authentication time. Verification fails closed if the key service cannot be reached or the token is invalid.
- The API key is read only from server-side `GEMINI_API_KEY`. It is not placed in Vite client code.

The current token verifier is still a custom implementation using Node's crypto APIs. It verifies the Firebase signature and core project/time claims, but does **not** check token revocation or disabled-user status. Replacing it with `firebase-admin` and `verifyIdToken(token, true)` remains a required production blocker; this repository change does not claim that gap is fixed.

## Firestore access

The app uses the existing project `gen-lang-client-0324783220` and Firestore database `(default)`.

| Collection | Access model |
| --- | --- |
| `users/{userId}` | A user can get, create, update, or delete only their UID profile. Collection listing is denied. |
| `notes/{noteId}` | Authenticated owner-only get/list/create/update/delete. List queries must filter `userId == request.auth.uid`. |
| `documents/{documentId}` | Same owner-only model. |
| `appointments/{appointmentId}` | Same owner-only model. |
| `study_resources/{resourceId}` | Same owner-only model. |
| `vitals/{vitalId}` | Same owner-only model; `type` and `context` are enums, numbers are range-checked. |
| `medications/{medicationId}` | Same owner-only model; `times` ≤ 12 and `takenLog` ≤ 800 entries. |

The rules contain a default-deny catch-all. The data collections require `userId` ownership on create and both old/new ownership on update. Stored `id` values must match the corresponding Firestore document ID. Field allowlists use `hasOnly()` and mandatory fields use `hasAll()`.

`documents.findings` is capped at five maps to stay within the Firestore Rules expression budget. Since Firestore Security Rules do not provide a general loop over arbitrary list elements, the rules explicitly validate indices 0–4 with short-circuit size guards. Every permitted finding is checked for allowed keys, required string fields and field-length limits. The UI truncates extracted findings to the same five-item maximum. The Emulator regression suite tests five valid items, a malformed fifth item and the size boundary.

`testConnection()` issues an authenticated owner-filtered query and distinguishes permission denial from network unavailability.

## Data handling

- Signed-in notes, documents, appointments, study resources, vitals, and medicines are read from Firestore using UID-filtered queries.
- Guest demo data is held in separate browser-local storage keys and is not merged into signed-in Firestore data.
- The original medical PDF/image is sent to the Gemini API for analysis but is not uploaded to Firebase Storage by the current app. Extracted text, the analysis summary, and findings are saved in Firestore.
- AI requests send the selected user content to the configured Gemini API. Users should avoid uploading identifiable medical data until consent, privacy obligations, and vendor data terms have been reviewed.

## HTTP headers, logging and AI data-use notice

- Every response sets `X-Content-Type-Options: nosniff`, `X-Frame-Options: SAMEORIGIN`, `Referrer-Policy: strict-origin-when-cross-origin`, a restrictive `Permissions-Policy`, and `Cross-Origin-Opener-Policy: same-origin-allow-popups` (required for the Firebase Google sign-in popup).
- In production the server also sends `Strict-Transport-Security` (when the request is HTTPS) and a Content-Security-Policy as **`Content-Security-Policy-Report-Only`** by default. Set `CSP_ENFORCE=true` only after the browser console shows no violations; a wrong policy could otherwise break sign-in. The policy has not been tested against a deployed build.
- `/api/*` responses include `X-Request-Id`; the access log contains only method, path, status and duration.
- AI routes require both Firebase authentication and a versioned, UID-bound HttpOnly consent cookie signed by `AI_CONSENT_COOKIE_SECRET`. The server issues or clears the cookie through authenticated `/api/consent` endpoints; localStorage is only a UI mirror and cannot authorise requests. The cookie is not a central legal-consent ledger.
- The red-flag screener, vitals, medicine logic, lab trends, search and visit pack all run in the browser and send nothing to the server.
- Backup import keeps only allow-listed fields, validates every record, skips duplicates and **ignores any `userId` in the file** (records are re-owned by the signed-in user).

## Abuse controls and limitations

- `/api/gemini/*` requires a valid server-signed consent cookie and has an in-memory per-user limit of 20 requests per 60-second window per Node process.
- The rate limiter is not shared across processes or hosts. Production needs a distributed store, quotas/alerts, and abuse monitoring.
- The custom Firebase verifier's key retrieval depends on outbound HTTPS to Google's public key endpoint; failure returns 503 rather than allowing an unverified request. Revocation and disabled-account status are still not checked until the Admin SDK migration is completed.
- The API authenticates and rate-limits before parsing AI JSON payloads, then applies an 18 MB parser cap and endpoint-specific input length/type checks.
- Do not trust AI-generated health summaries, extracted lab values, research answers, map results, or suggested questions as medical facts. A healthcare professional must verify them.

## Before production

1. Replace the custom token verifier with Firebase Admin SDK verification and enable revocation/disabled-account checks.
2. Run and review the Firestore Emulator test suite in CI; deploy the tested rules to the intended Firebase project only after review.
3. Finish the active `main` ruleset configuration. The ruleset already requires pull requests, blocks deletion and force-pushes, and requires linear history. However, its required-status-check list is empty and the up-to-date requirement is disabled. Add both `Typecheck, test and build` and `Analyze JavaScript and TypeScript` as required checks, then enable the requirement that branches be up to date.
4. Configure HTTPS and secure hosting; verify the report-only CSP, then enforce it (`CSP_ENFORCE=true`); confirm HSTS is sent by your host/proxy.
5. Use a distributed rate limiter and set API usage budgets/alerts.
6. Define patient-data consent, retention, export, deletion, backup, incident response, and vendor data-processing procedures.
7. Complete an independent security and privacy review before using real patient data.

## Deployment status

This project workspace has not published the Firestore rules, deployed backend code, enabled billing, or submitted anything to Devpost.
