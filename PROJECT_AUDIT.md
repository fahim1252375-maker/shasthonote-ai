# ShasthoNote AI — implementation audit

**Audit basis:** repository files in this workspace. No live Firebase Rules compiler, Firebase Emulator, Gemini API credentials, or production service was available during this local review.

## Firebase configuration

- Project ID: `gen-lang-client-0324783220`.
- Firestore database ID: `(default)`.
- Region reported by the project owner: `asia-southeast1`.
- Firebase client configuration values other than the database ID were preserved.
- The client initializer uses `getFirestore(app)` for `(default)` and named database initialization only for a non-default ID.

## Firestore collections and actual use

| Collection | Current client behavior | Fields and constraints |
| --- | --- | --- |
| `users` | Profile `setDoc(..., { merge: true })`; no list query | `userId`, `email`; optional `displayName`, `photoURL`, `preferredLanguage` |
| `notes` | UID-filtered list query and `setDoc` | `HealthNote` in `src/types/index.ts`; required `id`, `userId`, `title`, `language`, `chiefComplaint`, `patientDescription`, `status`, `createdAt`, `updatedAt` |
| `documents` | UID-filtered list query and `setDoc` | `SourceDocument`; required `id`, `userId`, `name`, `category`, `fileType`, `extractedText`, `createdAt`; optional analysis fields and findings |
| `appointments` | UID-filtered list query and `setDoc` | `Appointment`; required `id`, `userId`, `doctorName`, `specialty`, `dateTime`, `location`, `status`, `createdAt`; optional linked note and checklist |
| `study_resources` | UID-filtered list query and `setDoc` | `StudyResource`; required `id`, `userId`, `title`, `type`, `topic`, `contentJson`, `createdAt`; optional source document ID |
| `vitals` | UID-filtered list query and `setDoc` | `VitalReading`; self-reported reading, value/unit, optional context and note |
| `medications` | UID-filtered list query and `setDoc` | `Medication`; reminder schedule, active flag and taken-dose log |

All six user-owned data collection queries constrain `userId == firebaseUser.uid`. There is no users collection list query; the profile is fetched by UID. The client assigns the authenticated UID in the parent save handlers. Guest demo records use separate localStorage keys and are not written to Firestore.

Date-like model fields are currently strings. `createdAt`/`updatedAt` are ISO-like strings; appointment `dateTime` is a formatted string, not a native Firestore Timestamp.

## Security rules state

- Rules cover the six user-owned data collections plus the `users` profile collection, with `hasAll()` required fields, `hasOnly()` allowlists, field type/length checks, enums, owner-only access, and the default-deny catch-all.
- `users/{userId}` get and delete additionally check `existing().userId == request.auth.uid`.
- For notes/documents/appointments/study_resources, create checks incoming ownership and document ID; update checks both old and new ownership and matching document ID.
- `users` list is denied.
- Limitations: Firestore Rules cannot iterate a variable-length array. The existing `documents.findings` validator checks the first map element only; further hardening or server-side trusted writes are needed to validate every array element.
- **The rules have not been compiled with the Firebase Rules compiler or Emulator and have not been deployed.**

## Backend/API state

- All `/api/gemini/*` routes require a verified Firebase ID token; local guest/demo mode cannot call them.
- Token verification uses Google's public Firebase Secure Token JWK keys and checks signature plus project/issuer/subject/time claims.
- The verification implementation is custom and does not check token revocation or disabled-user status. Firebase Admin SDK verification is recommended before production.
- Gemini client initialization is lazy, so the app shell can start without a Gemini key; AI endpoints return `503` if the key is missing.
- Gemini API model is configurable by `GEMINI_MODEL`; `.env.example` uses `gemini-2.5-flash` as a configurable default. Model availability must be checked in the operator's Google AI project.
- Audio overview produces a narration script; browser SpeechSynthesis performs playback. There is no Gemini audio/TTS output in this implementation.
- AI fallbacks no longer fabricate sample transcripts, clinical reports, or research results. Missing credentials/upstream failures return errors.
- Per-user API rate limiting is 20 requests per minute per server process, not distributed across instances.

## Main corrections made in this work

1. Loaded notes, documents, appointments, and study resources through UID-filtered Firestore queries after sign-in.
2. Added profile persistence to `users/{uid}` and kept guest demo data isolated in guest-only localStorage keys.
3. Removed the mock Firebase guest token; protected backend AI routes now require a real Firebase ID token.
4. Replaced the diagnostic read of a blocked `/test/connection` document with an owner-filtered notes query and explicit connection statuses.
5. Added backend token verification, endpoint input limits, a per-user in-process rate limit, and safer upstream error responses.
6. Removed fabricated AI fallback outputs and corrected the audio feature to accurately describe browser speech playback.
7. Added PDF inline data support for document analysis and clear upload limits.
8. Added persistent Firestore study resources and more accurate guest-mode messaging.
9. Updated documentation to match actual implemented behavior and remaining production work.
10. Applied the requested `/users/{userId}` get/delete existing-owner check.

## Verification performed / not performed

### Passed local checks

- TypeScript/TSX transpilation syntax check: 59 files across `src/`, `server.ts`, and `vite.config.ts`, 0 syntax diagnostics. This is **not** a full application type-check.
- Pure utility tests: 74 passed, 0 failed. The tests were compiled with the globally available TypeScript compiler and run with Node's built-in test runner; this is not the same as `npm test` using the project's installed `tsx` dependency.
- The standalone secure-backup module also passed a strict TypeScript check.
- Relative import path audit: 0 unresolved relative imports.
- Project JSON files parsed successfully.
- Static Firestore checks confirmed the default-deny catch-all, no users list access, the `/users/{userId}` existing-owner checks, and all seven collection match blocks.
- `firebase-applet-config.json` is byte-for-byte identical to the uploaded original ZIP; the project ID and `(default)` Firestore database configuration were not changed.

### Blocked / not performed

- `npm install` could not finish because the npm registry hostname lookup failed with `EAI_AGAIN`; `node_modules` is absent.
- `npm run typecheck` / `npm run lint` could not complete because the `@types/node` and `vite/client` type definitions are unavailable without dependencies.
- `npm run build` could not complete because the Vite executable is unavailable (`vite: not found`). No production bundle is claimed.
- No Firebase Rules compiler or Emulator is installed/available here, so Firestore Rules syntax compilation and emulator behavior are **not verified**.
- No live Firebase authentication/database test, Gemini API request, deployment, billing change, or Devpost submission was performed.

## v0.2.0 merge and feature additions

See `MERGE_REPORT.md` for the comparison of the two source packages and the full verification record.

- Collections now in use: `users`, `notes`, `documents`, `appointments`, `study_resources`, **`vitals`**, **`medications`**.
- Rules state: `firestore.rules` gained validators for `vitals` and `medications` and allows `appointments.checklistDone`. **Not compiled or emulator-tested; not published.** The same nested-list limitation applies (element types of `times`, `takenLog`, `checklistDone` are not validated individually; sizes are capped).
- Backend: added `GET /api/health`, `POST /api/gemini/ask-records`, security headers, report-only CSP, request id and redacted access log, JSON error handler, graceful shutdown.
- Local checks run in the build sandbox: 67 unit tests pass; type-check passes against stand-in type declarations; 52 server-render smoke checks pass. `npm install` / `npm run build` / live Firebase / live Gemini were **not** run there.


## v0.3.0 update (2026-11-12)

### Implemented

- Added PWA manifest, generated app icons, and a production service worker that caches only the static application shell and frontend assets. `/api/` requests and data/auth endpoints are never cached.
- Added an online/offline banner and dynamic document language metadata.
- Enabled persistent Firestore IndexedDB caching with multi-tab coordination, falling back to in-memory cache when persistent storage is unavailable.
- Added browser-side password-protected backup export/import using PBKDF2-SHA-256 (310,000 iterations) and AES-256-GCM; standard JSON backups remain compatible.
- Hardened backup import validation for nested findings, optional field types/limits, medication time strings, and numeric ranges.
- Added regression tests covering secure backup round-trip, wrong passwords, tampering, unsupported formats, and malformed imports.

### Verification in this environment

- Utility tests compiled with the globally available TypeScript compiler and ran with Node's built-in test runner: **74 passed, 0 failed**.
- Full dependency installation and the production Vite bundle were not verified. `npm install` did not complete in the sandbox, and no `node_modules` directory was available.
- Live Firebase/Firestore, Gemini, browser installation, service-worker lifecycle, and Firestore Emulator rules were not exercised.
- IndexedDB cache is local to the browser profile and is not an encrypted vault. Signing out does not erase this persistent cache; avoid shared browser profiles and clear the browser site data when retiring or handing off a device.



## v0.4.0 update (2026-11-12)

- Added `HealthInsightsView` as a first-class Documentation workspace route and navigation item.
- Added `buildHealthInsights`, a deterministic summary engine using saved vitals, active medication schedule completeness, appointments and document age. Latest vital per type is selected before assessment; urgent observations are ordered first.
- Added local text export of the currently loaded overview and explicit non-diagnostic/source labels.
- Expanded large-screen app shell to 1600px.
- Focused checks: isolated strict TypeScript compile of the insight engine passed; 5/5 focused runtime assertions passed. Full application typecheck, browser integration and production build remain unverified because dependencies were not available in this environment (npm install timed out).


## v0.5.0 engineering refinement (2026-11-12)

- Aligned package and app metadata to release `0.5.0`; current release documentation now describes the implementation and its unverified areas.
- Reused `isMedicationActiveOn()` for medication schedule and Health Insights counts. Invalid date keys are no longer treated as an active schedule.
- Changed Health Insights to ignore future-dated or malformed vital readings for current observations and to display separate data-quality notices. Historical abnormal values older than seven days are informational rather than current urgent alerts.
- Validated appointment/document dates before using them in summaries and localized Health Insights content in English and Bangla.
- Split the summary text builder from the React view, centralized Blob downloads, and delayed object URL revocation.
- Added shared structural validation for supported vital units, finite values and complete blood-pressure pairs; Health Insights and trend summaries use it.
- Added mocked-browser tests for download link removal, delayed object-URL cleanup and cleanup after a click exception.
- Updated vitals date filtering and statistics to ignore malformed timestamps.
- Added regression cases for invalid/future/stale readings, medication date ranges, appointment ordering, invalid document dates and localized exports.
- Utility test execution in this environment: **92 passed, 0 failed** after global TypeScript transpilation, run with Node's built-in test runner. This was not `npm test` with the project's `tsx` install.
- TypeScript/TSX syntax transpilation: **64 files, 0 syntax diagnostics**. This is not a semantic project-wide type-check.
- A strict TypeScript check passed for the utility dependency chain covering Health Insights, medication scheduling, vital validation/trends and health calculators. This is narrower than the full project typecheck.
- `npm install --no-audit --no-fund` timed out after 120 seconds; no `node_modules` directory was available afterward. Direct `npm run typecheck`, `npm test` and `npm run build` attempts were blocked by missing installed type declarations, `tsx` and Vite. Browser integration, Firebase Emulator, live Firebase/Gemini and deployment were not run.


## 2026-11-13 security hardening update

### Implemented in the security-hardening branch

- Firestore client cache changed from persistent IndexedDB to explicit memory-only cache for signed-in health records. This reduces local persistence but removes reliable signed-in offline record availability after a reload.
- Added an authenticated `/api/consent` GET/POST API. The server issues a versioned, UID-bound, HttpOnly, SameSite=Strict consent cookie signed with `AI_CONSENT_COOKIE_SECRET`; AI routes reject requests without a valid cookie. localStorage is now only a UI mirror.
- Changed Firestore `documents.findings` validation to a hard maximum of five elements and explicit validation of every allowed index (0–4). A ten-item test exposed Firestore's 1,000-expression evaluation limit, so both rules and UI now enforce a five-item cap; the Emulator suite checks the valid five-item boundary and malformed fifth item.
- Added Firestore Emulator regression tests for owner access, valid finding lists, malformed later findings and list length boundaries; CI provisions Emulator tooling and runs the rules suite.

### Remaining production blockers

- Firebase ID token verification is **not yet migrated** to Firebase Admin SDK. The current custom verifier still does not check revoked tokens or disabled users. This requires adding and locking the `firebase-admin` dependency, configuring a least-privilege service identity on the hosting platform, and validating `verifyIdToken(token, true)` in the deployed runtime.
- Emulator tests run against the repository rules in CI; the rules still need deliberate review and deployment to the actual Firebase project.
- GitHub branch protection has not been changed from this connector. Configure `main` to require a pull request and the CI status check, require branches to be up to date, and prohibit force-pushes/deletions.
- `AI_CONSENT_COOKIE_SECRET` must be configured as a unique secret of at least 32 characters in every deployed server environment. Generate it with `openssl rand -base64 32`. Without it, AI consent acceptance and AI endpoints fail closed.
- The signed consent cookie is server-verifiable enforcement, not a central legal consent ledger. Production privacy, retention, deletion, incident-response and vendor obligations still need an operator review.

### Verification status

This branch adds automated tests and CI steps, but no GitHub Actions run, Firebase deployment, production hosting configuration, live Firebase Admin verification or independent security assessment has been observed yet. Do not treat the branch as production approved until those gates are completed.
