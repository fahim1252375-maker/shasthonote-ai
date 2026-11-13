<!-- Project README: ShasthoNote AI -->

<p align="center">
  <img src="https://capsule-render.vercel.app/api?type=waving&color=0:14243A,50:0F766E,100:2563EB&height=190&section=header&text=ShasthoNote%20AI&fontSize=42&fontColor=ffffff&fontAlignY=38&desc=Organise%20health%20information.%20Prepare%20for%20better%20conversations.&descAlignY=62&descSize=13" alt="ShasthoNote AI — Health information workspace" />
</p>

<p align="center">
  <strong>A Bangla-English workspace for organising personal health information before a conversation with a healthcare professional.</strong>
</p>

<p align="center">
  <a href="https://github.com/fahim1252375-maker/shasthonote-ai/actions/workflows/ci.yml"><img src="https://github.com/fahim1252375-maker/shasthonote-ai/actions/workflows/ci.yml/badge.svg?branch=main" alt="Continuous integration" /></a>
  <img src="https://img.shields.io/badge/Version-0.5.0-2563EB?style=flat-square" alt="Version 0.5.0" />
  <img src="https://img.shields.io/badge/Language-English%20%2B%20Bangla-0F766E?style=flat-square" alt="English and Bangla" />
  <img src="https://img.shields.io/badge/Status-Prototype-D97706?style=flat-square" alt="Prototype" />
</p>

<p align="center">
  <a href="./START_HERE_BN.md">বাংলা Setup Guide</a> ·
  <a href="./ARCHITECTURE.md">Architecture</a> ·
  <a href="./API_DOCUMENTATION.md">API Documentation</a> ·
  <a href="./PRIVACY.md">Privacy</a> ·
  <a href="./SECURITY.md">Security</a>
</p>

---

## Overview

ShasthoNote AI helps users organise information they may want to discuss with a healthcare professional. The workspace brings consultation notes, documents, appointments, self-recorded measurements, medication schedules, and learning materials into one place.

Optional AI features can summarise selected notes or explain selected document content. The application is a **personal-information and preparation prototype**, not a medical device, diagnostic system, treatment planner, or replacement for a clinician.

The bundled sample records are synthetic and intended only for demonstration.

## Main Workflows

| Workspace | What it supports |
|---|---|
| Consultation notes | Record concerns, symptom history, allergies, existing medicines, and questions for a clinician; prepare patient and clinician-facing summaries |
| Documents | Extract and explain selected PDF, image, or text content; verify all extracted values against the original |
| Appointments | Organise visits, link related notes, and prepare a printable visit pack |
| Personal tracking | Log blood pressure, glucose, weight, temperature, heart rate, and SpO₂; view trends and export CSV |
| Medication schedule | Store user-entered schedules and dose check-ins; the app does not prescribe or change doses |
| Health Insights | Review deterministic observations derived from saved records and valid measurements |
| Research and learning | Ask questions about selected record passages and create study materials such as flashcards, quizzes, and study guides |
| Privacy and portability | Use synthetic guest data, Google sign-in with Firestore-backed records, and JSON or password-protected `.shasthonote` backups |

## Technology

| Layer | Implementation |
|---|---|
| Frontend | React 19, TypeScript, Vite 8, Tailwind CSS 4 |
| Backend | Express 4, TypeScript, `tsx` |
| Authentication | Firebase Authentication with Google sign-in |
| Data storage | Cloud Firestore; memory-only browser cache for signed-in health records |
| AI | Google Gemini through the server-side `@google/genai` client |
| UI icons | lucide-react |
| Tests | Node.js built-in test runner through `tsx` |
| Build | Vite production frontend bundle |

## Continuous Integration

The GitHub Actions workflow runs on pushes to `main`, pull requests targeting `main`, and manual dispatch. It installs dependencies from the committed lockfile and runs:

1. `npm run typecheck`
2. `npm test`
3. Firestore Rules tests in the Firebase Emulator Suite (`npm run test:rules`)
4. `npm run build`

These checks cover TypeScript validation, the current utility test suite, and the frontend production build. They do not constitute live Firebase/Gemini integration tests, browser end-to-end tests, or deployment verification.

## Run Locally

### Requirements

- Node.js **22.12 or later** (the repository's `.node-version` currently specifies `22.16.0`)
- npm
- A Firebase project configured for Google Authentication and Cloud Firestore
- A Gemini API key only for AI-powered endpoints

### Install

```bash
git clone https://github.com/fahim1252375-maker/shasthonote-ai.git
cd shasthonote-ai
npm ci
cp .env.example .env
```

Configure the server-side values in `.env` as required:

```env
GEMINI_API_KEY="your-gemini-api-key"
GEMINI_MODEL="gemini-2.5-flash"
FIREBASE_PROJECT_ID="your-firebase-project-id"
PORT=3000
CSP_ENFORCE=false
```

- Keep `GEMINI_API_KEY` on the server. Never put it in a `VITE_` variable, frontend source, or a public repository.
- The Firebase project ID must match the project configured in `firebase-applet-config.json`.
- In Firebase Console, enable Google as an Authentication provider, add local and deployed domains to Authorized domains, and configure Firestore.
- Generate `AI_CONSENT_COOKIE_SECRET` with `openssl rand -base64 32` and configure it in the server environment. AI endpoints fail closed unless the server can verify a signed consent cookie.
- Review `firestore.rules` and run `npm run test:rules` before deploying rules. Having a rules file in this repository does not mean those rules have been deployed to your Firebase project.

### Start

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). The Express server serves the Vite development client and the `/api/*` routes.

- **Guest mode** uses synthetic browser-local demo data and cannot call protected AI endpoints.
- **Google sign-in** enables Firestore-backed records.
- **AI features** require a server-issued, UID-bound consent cookie after the account-specific data-use notice is accepted. The browser's localStorage flag is only a UI mirror.

## Project Commands

| Command | Purpose |
|---|---|
| `npm run dev` | Start the Express/Vite development server |
| `npm start` | Start the server; production mode serves `dist/` |
| `npm run typecheck` | Run TypeScript without emitting files |
| `npm test` | Run utility and server-helper tests through Node's test runner and `tsx` |
| `npm run test:rules` | Run Firestore rules tests against a running Emulator (requires `firebase-tools` and `@firebase/rules-unit-testing`) |
| `npm run build` | Build the Vite frontend into `dist/` |
| `npm run preview` | Preview the frontend build without the Express API server |
| `npm run clean` | Remove the generated `dist/` directory |

There is no separate ESLint or Prettier configuration in this repository. `typecheck` is a TypeScript check, not a style linter. The current unit tests cover utility modules; they do not replace browser, Firebase Emulator, or live Gemini integration tests.

## Environment Variables

| Variable | Required | Default | Purpose |
|---|---|---|---|
| `GEMINI_API_KEY` | For AI features | Unset | Server-side Gemini API key |
| `GEMINI_MODEL` | No | `gemini-2.5-flash` | Model identifier passed to the Gemini client |
| `FIREBASE_PROJECT_ID` | Usually no | Project ID from `firebase-applet-config.json` | Expected Firebase token audience and issuer |
| `PORT` | No | `3000` | Express listening port |
| `AI_CONSENT_COOKIE_SECRET` | For AI consent | Unset | Unique 32+ character secret used to sign server-enforced consent cookies; generate with `openssl rand -base64 32` |
| `CSP_ENFORCE` | No | `false` | Enables enforcing Content Security Policy when set to `true` |
| `NODE_ENV` | No | Runtime-dependent | Controls production headers and static asset serving |

## Repository Guide

```text
src/
  components/   React views for each workspace
  data/         Synthetic guest/demo records
  lib/          Firebase, record access, consent and browser-download helpers
  types/        Shared application data types
  utils/        Calculations, validation, export and backup helpers + tests
server.ts       Express API, Firebase token verification and Gemini routes
firestore.rules Firestore ownership and field validation rules
public/         PWA manifest, icons and static service worker
```

Further documentation:

- [ARCHITECTURE.md](./ARCHITECTURE.md) — application structure and data flow
- [API_DOCUMENTATION.md](./API_DOCUMENTATION.md) — server routes
- [PRIVACY.md](./PRIVACY.md) — data handling and privacy boundaries
- [SECURITY.md](./SECURITY.md) — security notes and reporting
- [FEATURE_ROADMAP.md](./FEATURE_ROADMAP.md) — feature status and future verification
- [docs/AI_DISCLOSURE.md](./docs/AI_DISCLOSURE.md) — AI-use disclosure checklist

## Privacy, Safety, and Limitations

- This prototype has not been clinically validated. Do not use it to diagnose, prescribe, decide medication changes, or manage an emergency.
- Vital reference checks are general-purpose rules and may not fit an individual's medical history or clinician-set targets.
- AI summaries, extracted document values, research responses, and nearby-care results can be incomplete or incorrect. Check original documents and verify important details directly.
- AI requests send the selected content to the configured server and Gemini API. Do not upload identifiable health information until privacy requirements and vendor terms have been reviewed.
- Signed-in Firestore data uses a memory-only browser cache; it is not intentionally persisted to IndexedDB. This reduces data remaining after sign-out but means signed-in records are not reliably available after reload while offline.
- The service worker caches static frontend assets only. AI features require a network connection.
- The current CI workflow does not test live Firebase/Gemini flows, browser automation, or production deployment. Firestore rules, CSP enforcement, and hosting configuration need environment-specific verification.

## Development and AI Disclosure

AI tools may be used as supporting aids for brainstorming, understanding unfamiliar concepts, debugging, implementation support, and documentation. Contributors are responsible for understanding, reviewing, and testing all published changes. Do not claim unaided authorship, clinical validation, or completed testing unless those claims are accurate. See [docs/AI_DISCLOSURE.md](./docs/AI_DISCLOSURE.md).

## License

See the repository's [LICENSE](./LICENSE) file.
