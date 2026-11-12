# ShasthoNote AI v0.5.0

[![CI](https://github.com/fahim1252375-maker/shasthonote-ai/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/fahim1252375-maker/shasthonote-ai/actions/workflows/ci.yml)

ShasthoNote AI is a Bangla-English workspace for organizing health information before a conversation with a healthcare professional. It brings consultation notes, medical documents, appointments, self-recorded measurements and learning tools into one place. AI features help summarize or explain selected material; the app is not a diagnostic or treatment system.

## What is in the app

- **Consultation notes:** record a concern, symptom history, allergies, existing medicines and questions for a clinician. The AI summary endpoint can turn the selected note into a patient summary and a clinician-facing brief.
- **Documents:** submit PDF, image or text content for extraction and explanation. Extracted values should always be checked against the original file.
- **Appointments and preparation:** manage visits, link notes, and prepare a printable visit pack from saved information.
- **Personal tracking:** log blood pressure, glucose, weight, temperature, heart rate and SpO₂; view trends and export CSV. The medication area stores user-entered schedules and dose check-ins. It does not prescribe doses.
- **Health Insights:** review deterministic observations from saved vitals, medication schedules, appointments and older documents. Invalid or future-dated readings are excluded from current vital observations and called out for review.
- **Research and learning:** ask questions against selected record passages, create flashcards/quizzes/study guides/mind maps, and generate a narration script. Browser SpeechSynthesis reads the script; the server does not create an audio file.
- **Privacy tools:** use guest demo data, sign in with Google to store records in Firestore, and export either a JSON backup or a password-protected `.shasthonote` backup.

The bundled sample data is synthetic. Use it for demonstrations; do not treat it as a real patient's record.

## Technology

| Area | Implementation |
| --- | --- |
| Web client | React 19, TypeScript, Vite 8, Tailwind CSS 4 |
| UI icons | lucide-react |
| Backend | Express 4, TypeScript executed by tsx |
| Authentication and records | Firebase Authentication and Cloud Firestore |
| AI | Google Gemini through the server-side `@google/genai` client |
| Offline support | Firestore IndexedDB persistence and a service worker for static app assets |
| Tests | Node.js `node:test` tests run through `tsx` |

## Continuous integration

GitHub Actions runs the CI workflow on pushes to `main`, pull requests targeting `main`, and manual dispatches. It uses the Node.js version specified in `.node-version`, installs the committed npm lockfile with `npm ci`, and runs these checks in order:

1. `npm run typecheck`
2. `npm test`
3. `npm run build`

The workflow has read-only repository permissions and cancels superseded runs for the same branch or pull request. These checks validate the TypeScript project, utility test suite and frontend production build. They do not run live Firebase/Gemini integration tests, browser end-to-end tests, or deploy the application.

## Run locally

### Requirements

- Node.js 22.12 or later. The repository's `.node-version` currently specifies 22.16.0.
- npm (included with Node.js).
- A Firebase project configured for Google sign-in and Firestore.
- A Gemini API key only if you intend to use the AI endpoints.

### Install and configure

For a clean install that matches the committed lockfile:

```bash
npm ci
cp .env.example .env
```

When intentionally changing dependencies, use `npm install` and commit the updated `package-lock.json`.

The application already includes a Firebase client configuration in `firebase-applet-config.json`. Check that it points to a Firebase project you are authorized to use. The project ID can be overridden for server-side token verification with `FIREBASE_PROJECT_ID`.

Set the server-side Gemini key in `.env` when using AI features:

```env
GEMINI_API_KEY="your-gemini-api-key"
GEMINI_MODEL="gemini-2.5-flash"
FIREBASE_PROJECT_ID="your-firebase-project-id"
PORT=3000
CSP_ENFORCE=false
```

`GEMINI_API_KEY` must remain on the server. Do not put it in a `VITE_` variable, browser code, or the Firebase client configuration. The app shell can start without the key, but AI requests will return an unavailable response. `GEMINI_MODEL` defaults to `gemini-2.5-flash`; confirm that the selected model is available to your Google AI project.

In Firebase Console, enable Google as an Authentication provider, add the local and deployed domains to Authorized domains, and configure Firestore. Review `firestore.rules` and test it with the Firebase Emulator before deploying the rules. The presence of the rules file in this repository does not mean that it has been deployed to your Firebase project.

### Start the application

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). `npm run dev` starts the Express server, which serves the Vite development client and `/api/*` routes. Guest mode uses local browser storage and cannot call AI endpoints. Sign in with Google to use Firestore-backed records and AI features; the account-specific AI data-use notice must be accepted before a request is sent.

## Project commands

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the Express/Vite development server |
| `npm start` | Start the server (production mode serves `dist/`) |
| `npm run typecheck` | Run the TypeScript compiler without emitting files |
| `npm test` | Run utility tests with Node's test runner through `tsx` |
| `npm run build` | Create the Vite production frontend bundle in `dist/` |
| `npm run preview` | Preview the Vite bundle without the Express API server |
| `npm run clean` | Remove the generated Vite `dist/` directory |

There is no separate ESLint or Prettier configuration in this repository. `typecheck` is a TypeScript check, not a style linter. The test suite currently covers utility modules; it does not replace browser, Firebase Emulator or live Gemini integration tests. The committed `package-lock.json` is used by CI and is the reproducible npm dependency baseline.

## Environment variables

| Variable | Required | Default | Purpose |
| --- | --- | --- | --- |
| `GEMINI_API_KEY` | For AI features | unset | Server-side Google Gemini API key |
| `GEMINI_MODEL` | No | `gemini-2.5-flash` | Model name passed to the Gemini client |
| `FIREBASE_PROJECT_ID` | No, if client config has a project ID | `firebase-applet-config.json` project ID | Expected Firebase token audience and issuer |
| `PORT` | No | `3000` | Express listening port |
| `CSP_ENFORCE` | No | `false` | Send enforcing CSP when set to `true`; otherwise production uses report-only CSP |
| `NODE_ENV` | No | determined by runtime | Controls production headers and static serving |

## Code layout

```text
src/
  components/   React views for each workspace
  data/         Synthetic guest/demo records
  lib/          Firebase, record access, consent and browser download helpers
  types/        Shared application data types
  utils/        Pure calculations, validation, export and backup logic + unit tests
server.ts       Express API, Firebase token verification and Gemini routes
firestore.rules Firestore ownership and field validation rules
public/         PWA manifest, icons and static service worker
```

See [ARCHITECTURE.md](./ARCHITECTURE.md) for the data flow, [API_DOCUMENTATION.md](./API_DOCUMENTATION.md) for server routes, [SECURITY.md](./SECURITY.md) and [PRIVACY.md](./PRIVACY.md) for data-handling limits, and [FEATURE_ROADMAP.md](./FEATURE_ROADMAP.md) for what still needs verification.

## Important limitations

- This is a prototype. It has not been clinically validated and must not be used to diagnose, prescribe, decide medication changes or manage emergencies.
- Vital reference checks are general-purpose rules. They may not match an individual's medical history or clinician-set targets.
- AI summaries, extracted document values, research responses and nearby-care results can be incomplete or wrong. Check original documents and verify details directly.
- AI requests send the selected content to the configured server and Gemini API. Do not upload identifiable health information until privacy requirements and vendor terms have been reviewed.
- Firestore IndexedDB persistence is not an encrypted vault. Signing out does not clear the browser's persistent cache. Avoid shared browser profiles and clear site data before handing over a device.
- The service worker caches static frontend assets only. AI features require a network connection.
- The custom Firebase ID-token verifier does not check token revocation or disabled-user status. Rate limiting is in-memory per server process. Firestore rules, production hosting, CSP enforcement and live Firebase/Gemini flows require environment-specific testing.

## Development and AI disclosure

Document which tools assisted implementation, what you personally designed or changed, which tests you actually ran, and what remains unverified. Do not claim unaided authorship or clinical validation unless those claims are true. See [docs/AI_DISCLOSURE.md](./docs/AI_DISCLOSURE.md) for a disclosure checklist.
