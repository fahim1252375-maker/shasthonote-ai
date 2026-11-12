# Architecture

## Runtime overview

```text
Browser
  React application (src/)
    ├─ workspace views (src/components/)
    ├─ domain helpers and tests (src/utils/)
    ├─ Firebase and browser integrations (src/lib/)
    ├─ guest sample data (src/data/)
    └─ Firebase Authentication + Firestore
          │
          └─ same-origin /api/gemini/* requests with Firebase ID token
                         │
                         ▼
                  Express server (server.ts)
                    ├─ verify Firebase ID token
                    ├─ apply per-process user rate limit
                    ├─ validate request fields and payload size
                    └─ call Google Gemini using server-only API key
```

The frontend and API are served from the same origin by the Express server. In development, Vite middleware serves the client; in production, Express serves the built `dist/` directory.

## Frontend responsibilities

- `src/App.tsx` owns top-level workspace navigation, authentication state and the in-memory record collections. It coordinates Firestore reads/writes and passes data/actions into the page components.
- `src/components/` contains the UI for notes, documents, appointments, tracking, insights, research and privacy tools. Components do not call Firestore directly for ordinary record mutations; the app passes callbacks.
- `src/utils/` contains calculations and transformations that can run without React or network access. These modules include their Node `node:test` unit tests.
- `src/lib/firebase.ts` creates the Firebase app, configures Firestore persistence and supplies `authenticatedApiFetch()` for protected AI routes.
- `src/lib/records.ts` provides owner-filtered record access for the `vitals` and `medications` collections. Other primary collections are loaded in `App.tsx` with equivalent UID filters.
- `src/lib/consent.ts` stores the AI data-use acknowledgement in browser local storage, keyed by Firebase UID. This is a user-facing gate in the client, not a server-side legal consent ledger.
- `src/lib/download.ts` centralizes browser blob/text downloads and delayed object-URL revocation.

### Local and cloud data

Guest demo data is stored under separate `shastho:guest:*` local-storage keys. It is not copied into a signed-in user's account. When a user signs in, the app clears the in-memory guest lists before loading that user's own Firestore records. Firestore queries include `where('userId', '==', uid)` and the rules also enforce ownership.

Firestore persistent local cache uses IndexedDB and the multi-tab manager where supported. The client falls back to the in-memory Firestore cache if persistent initialization fails. The persistent cache is not encrypted; signing out does not remove it. Use a trusted browser profile and clear site data before handing a device to another person.

The service worker in `public/sw.js` caches the application shell and selected static assets. It bypasses API requests and does not cache Firestore data, authentication responses or uploaded health documents. Offline use is therefore limited to cached frontend assets and data already available in the browser's storage layer.

## Backend responsibilities

`server.ts` is the Express entry point. It:

1. Sets security-related response headers and request IDs.
2. Verifies Firebase ID tokens for `/api/gemini/*` using Google's Secure Token public signing keys and checks the token's signature and relevant claims.
3. Applies an in-memory limit of 20 requests per user per 60-second window per Node process.
4. Parses JSON with an 18 MB body limit and applies endpoint-specific field, type and length checks.
5. Sends selected input to the configured Gemini model using `GEMINI_API_KEY`, which is read only by the server.

The `/api/health` endpoint reports process/configuration information. It does not call Firebase or Gemini and should not be interpreted as a dependency health check.

## Firestore collections

| Collection | Owner field | Main record type | Use |
| --- | --- | --- | --- |
| `users` | document ID = UID | `UserProfile` | Basic profile and preferred language |
| `notes` | `userId` | `HealthNote` | Consultation notes and summaries |
| `documents` | `userId` | `SourceDocument` | Extracted text and analysis results |
| `appointments` | `userId` | `Appointment` | Visit details and checklist state |
| `study_resources` | `userId` | `StudyResource` | Saved study output |
| `vitals` | `userId` | `VitalReading` | User-entered measurements |
| `medications` | `userId` | `Medication` | User-entered reminder schedules and check-ins |

Record dates are stored as strings. Vital `measuredAt` values represent measurement timestamps. Medication `startDate`/`endDate` and `times` use the device's local calendar/time. Appointment `dateTime` is parsed by the browser as a date-time string. Do not mix local medication date keys with UTC ISO date slices.

## Health Insights data flow

`src/utils/healthInsights.ts` owns the calculations and data selection. It:

- selects the latest valid, non-future reading for each vital type;
- marks abnormal readings older than seven days as historical information rather than a current urgent alert;
- requires a supported vital type/unit, finite values and a complete blood-pressure pair; malformed records are skipped and counted;
- uses the same medication date-range helper as the reminder scheduler;
- includes only valid appointments whose status is `upcoming` and whose time has not passed;
- counts documents older than 365 days when their creation date is valid;
- sorts observations by severity without making a diagnosis or treatment decision.

`src/components/HealthInsightsView.tsx` renders the localized English/Bangla UI. `src/utils/healthInsightsExport.ts` builds the downloadable text output without using browser APIs. This keeps the data rules, presentation and download mechanism separate.

## Tests

Utility tests live beside the code in `src/utils/*.test.ts`. They use Node's built-in `node:test` and `node:assert` APIs, executed by the package's `tsx --test` script. The suite does not include React component tests, browser automation, Firestore Emulator tests or live Gemini tests.

## Security and operational limitations

- The Firebase token verifier is custom and does not check revocation or disabled-account status. Use Firebase Admin SDK verification before production.
- Rate limiting is local to one process; multi-instance deployments need a shared store.
- Firestore rules have not been certified by Firebase Emulator tests in this package review. `documents.findings` validation only examines the first map due to Security Rules limitations.
- AI quote matching confirms that a quote is present in supplied text, not that the quote supports the answer or that the medical claim is true.
- Original document files are forwarded to Gemini for analysis but are not persisted in Firebase Storage by this app.
- Firestore's IndexedDB cache is not an encrypted vault. A downloaded unencrypted JSON backup is also not protected.
- This codebase is a prototype and has no clinical validation or production security certification.
