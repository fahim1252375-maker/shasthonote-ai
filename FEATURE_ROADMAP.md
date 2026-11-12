# Feature status and remaining work

The checkmarks below mean that code for the feature is present in this repository. They do not mean a live service, deployed environment or end-to-end workflow has been certified.

## Implemented in the client

- [x] Bangla and English interface with responsive workspace navigation.
- [x] Google sign-in and a guest demo mode with separate local storage keys.
- [x] UID-filtered Firestore reads/writes for notes, documents, appointments, study resources, vitals and medications.
- [x] Consultation note editor, generated summaries and missing-information prompts.
- [x] Audio recording and a server-side transcription request.
- [x] PDF, image and text document analysis request flow.
- [x] Appointment management, linked notes, timeline and printable visit pack.
- [x] Vitals tracker, reference labels, trend charts and CSV export.
- [x] Medication schedule list, adherence log and in-tab browser reminders.
- [x] Lab trends extracted from saved document findings.
- [x] Health Insights with deterministic observations, localized text, date validation and local text export.
- [x] Research with optional Google Search grounding and exact-quote matching against selected passages.
- [x] Ask My Records, study resources, saved mind maps and narration-script playback through browser SpeechSynthesis.
- [x] Privacy tools for JSON/encrypted backup, restore, consent and account-record deletion.
- [x] Installable PWA metadata, static app-shell caching and offline status feedback.

## Backend and security controls in code

- [x] Express endpoints for Gemini-backed features.
- [x] Firebase ID-token verification before protected AI requests.
- [x] Per-process per-user request limit (20 requests per 60 seconds).
- [x] Request IDs, selected security headers and redacted request logging.
- [x] 18 MB JSON parser limit and endpoint-level request validation.
- [x] Firestore rules with owner checks, field allowlists and default deny.

## v0.5.0 engineering refinement

- [x] Align project/package metadata to one release version.
- [x] Use a shared medication date-range helper for reminders and Health Insights counts.
- [x] Exclude invalid/future-dated measurements from current vital observations and identify skipped records.
- [x] Apply the same supported-unit and complete blood-pressure checks in Health Insights and vital trend summaries.
- [x] Validate timestamps before selecting future appointments or older documents.
- [x] Localize Health Insights content and separate summary-export formatting from the React view.
- [x] Centralize browser file downloads and delay object-URL cleanup until after the click task.
- [x] Ignore malformed vital timestamps in trend filtering and summaries.
- [x] Add regression tests for the edge cases listed above.

## Still needs environment-level verification

- [ ] Install the declared dependencies and run the project's own `npm run typecheck`, `npm test` and `npm run build` commands.
- [ ] Run browser tests for guest mode, Google sign-in, navigation, downloads, recording, document upload and responsive layouts.
- [ ] Test owner/non-owner access, all CRUD paths and query rules in the Firebase Emulator.
- [ ] Test Google sign-in and Firestore data isolation using the configured Firebase project.
- [ ] Test each Gemini endpoint with a configured API key and verify the selected model/tools are enabled for that project.
- [ ] Verify the PWA cache and Firestore offline behavior in supported browsers and account-switch scenarios.
- [ ] Review CSP violations in a deployed environment before setting `CSP_ENFORCE=true`.
- [ ] Replace custom Firebase token validation with Firebase Admin SDK verification, including revocation/disabled-account checks.
- [ ] Add distributed rate limiting, API usage alerts and an incident/retention process before production use.

## Not implemented

- Push notifications that work when the browser is closed.
- Clinician/caregiver account sharing or a consent-based sharing workflow.
- Cross-laboratory unit normalization and clinical validation of interpretations.
- A clinically validated decision-support or emergency triage workflow.

Do not describe the project as clinically validated, production-ready, zero-hallucination or certified for handling real patient records.
