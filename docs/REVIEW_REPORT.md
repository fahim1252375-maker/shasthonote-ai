# Engineering review — v0.5.0

Review date: 12 November 2026
Baseline: `ShasthoNoteAI_v0.4.1_Reviewed.zip`
Release version: `0.5.0`

## Scope

Reviewed the supplied ZIP's file tree, package/configuration files, documentation, application entry point, backend routes, shared data types, utility modules and unit tests. Changes were limited to concrete maintainability and correctness issues found in that code. The existing product direction and major feature areas were retained.

## Changes made

- Made release metadata consistent at `0.5.0` in `package.json`, `metadata.json`, the README, changelog, setup guide and feature/review documentation. The prior archive filename said `0.4.1` while its internal package and metadata said `0.4.0`.
- Centralized medication activity decisions through `isMedicationActiveOn()`. Health Insights counts now use the same inclusive start/end date rules as the reminder scheduler.
- Hardened medication date validation and made reminder-time normalization tolerate missing runtime values.
- Updated Health Insights to skip invalid/future-dated vital readings when selecting current measurements. Such entries are identified separately so they are not silently treated as current readings.
- Kept abnormal readings older than seven days in the historical/information category, rather than showing them as current urgent alerts.
- Validated appointment and document timestamps before including them in summaries.
- Added English/Bangla text for Health Insights observations, actions and sources.
- Moved overview export formatting into `src/utils/healthInsightsExport.ts`; `HealthInsightsView.tsx` now focuses on rendering, navigation and invoking the export helper.
- Reworked Health Insights presentation to use less decorative styling, clearer section labels, consistent severity treatment and visible focus states.
- Centralized browser Blob/text downloads in `src/lib/download.ts`. The helper removes its temporary anchor and delays object-URL revocation; Health Insights, CSV and note JSON exports now reuse it.
- Updated vital sorting/filtering/statistics so malformed timestamps and non-finite readings do not contaminate trend summaries.
- Removed unused direct dependencies `motion` and `autoprefixer`; no dependency upgrades were performed.
- Rewrote README, architecture, roadmap, setup and privacy documentation to describe the code that is present and distinguish code presence from integration verification.

## Files changed

- `package.json`, `bun.lock`, `metadata.json`, `Dockerfile`
- `README.md`, `ARCHITECTURE.md`, `FEATURE_ROADMAP.md`, `START_HERE_BN.md`, `CHANGELOG.md`, `SECURITY.md`, `PRIVACY.md`, `PROJECT_AUDIT.md`, `MERGE_REPORT.md`
- `docs/HACKATHON_BRIEF.md`, `docs/REVIEW_REPORT.md`
- `src/components/HealthInsightsView.tsx`, `src/components/ExportCenterView.tsx`, `src/components/VitalsTrackerView.tsx`
- `src/lib/download.ts`
- `src/utils/healthInsights.ts`, `src/utils/healthInsights.test.ts`, `src/utils/healthInsightsExport.ts`, `src/utils/download.test.ts`, `src/utils/medications.ts`, `src/utils/medications.test.ts`, `src/utils/vitals.ts`, `src/utils/vitals.test.ts`

New files: `src/utils/healthInsightsExport.ts` and `src/utils/download.test.ts`.

## Verification performed

| Check | Result | Notes |
| --- | --- | --- |
| TypeScript/TSX syntax transpilation | Passed: 64 files, 0 syntax diagnostics | Uses the globally installed TypeScript transpiler; this does not perform semantic type checking. |
| Strict utility type-check | Passed | Global `tsc --strict` checked the Health Insights, medication, vitals, export and calculator dependency chain. It does not replace the project-wide check. |
| Utility unit tests | Passed: 92, failed: 0 | Transpiled test and utility files with global TypeScript, then ran generated JavaScript with Node's built-in `node:test` runner. The download helper test uses a lightweight DOM mock. |
| `npm install --no-audit --no-fund` | Not completed | Timed out after 120 seconds; `node_modules` was not created. |
| `npm run typecheck` | Attempted, blocked | Failed because `@types/node` and `vite/client` declarations are not installed. |
| `npm test` | Attempted, blocked | Failed because the project-local `tsx` executable is not installed. The 92 tests were instead run through the global transpile + Node test route described above. |
| `npm run build` | Attempted, blocked | Failed because the project-local Vite executable is not installed. |
| Browser/Firebase/Gemini integration | Not run | Requires installed dependencies, browser session and configured external services. |
| Firestore Emulator / deployment | Not run | No emulator or deployment was run as part of this package review. |

## Remaining issues and limitations

- Full project type-checking and production bundling remain unverified. Run `npm install`, `npm run typecheck`, `npm test` and `npm run build` on a network-enabled machine before submission or deployment.
- The repository has a Bun lockfile but its current deployment scripts use npm, and there is no committed `package-lock.json`. npm dependency resolution therefore follows the declared version ranges instead of a fully pinned npm lock. Generate and commit an npm lockfile in the intended development environment, then switch CI/deployment to `npm ci`. The Bun lockfile was syntax-parsed but not regenerated or installed with Bun because the Bun CLI was unavailable.
- Several AI-facing views still consume dynamic Gemini response payloads with loose `any` types. Add runtime schemas and parse API responses from `unknown` before relying on those screens with real data; this was not expanded into a broad unverified rewrite.
- No real-browser tests cover focus movement, responsive breakpoints, MediaRecorder, file downloads or account-switching behavior. The download helper has unit coverage with a mocked DOM, not browser automation.
- Firestore rules have not been tested in the Firebase Emulator. The rule for `documents.findings` only validates the first map.
- The custom Firebase ID-token verifier does not check revocation or disabled-user status. Replace it with Firebase Admin SDK verification before production.
- The request limiter is per Node process, not shared across instances.
- The client-side AI data-use acknowledgement is stored in local storage; it is not a server-side legal consent record.
- Firestore IndexedDB caching is not encrypted. Clear browser site data before handing over a device.
- AI summaries, extracted document values and research results may be wrong. This project has no clinical validation.

## Next verification commands

Run these from the project root on a machine with registry access:

```bash
npm install
npm run typecheck
npm test
npm run build
```

Then test Google sign-in, account isolation, consent, data export/import/deletion, offline behavior and all AI routes in the intended Firebase/Gemini environment. Test `firestore.rules` in the Emulator before deploying them.
