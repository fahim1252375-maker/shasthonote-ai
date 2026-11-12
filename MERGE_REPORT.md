> Historical report: this file records the earlier v0.2.0 merge and checks. Its test counts and verification statements are not evidence for the current v0.5.0 release. See [docs/REVIEW_REPORT.md](./docs/REVIEW_REPORT.md) for the latest package verification.

# Merge report — ShasthoNote AI v0.2.0

Two uploaded packages were merged into this single project:

| Package | Role in the merge |
| --- | --- |
| `ShasthoNoteAI_hackathon_ready_local.zip` ("A") | **Base.** The later, hardened version. |
| `shasthonote-ai-3.zip` ("B") | Compared file by file against A. |

## What the comparison found

- **No file exists only in B.** A contains every file B has, plus `API_DOCUMENTATION.md`, `PRIVACY.md`, `START_HERE_BN.md` and `docs/`.
- 24 files differ. In each, A is the newer implementation. The lines that exist only in B are older code that A deliberately replaced:
  - `src/lib/firebase.ts` (B): a guest token stub `getIdToken: async () => 'mock-token'` instead of requiring a real Firebase ID token.
  - `src/components/NearbyCareView.tsx`, `MindMapView.tsx` and `AudioOverviewView.tsx` (B): hard-coded content pre-filled as the initial state instead of an empty state (a Dhanmondi hospital list with named hospitals and addresses, a "Type 2 Diabetes Clinical Care" mind map, a diabetes audio script). Those hospital details were never verified.
  - `server.ts` (B, 599 lines vs A, 760): contains no Firebase ID-token verification and no rate limiting on the Gemini routes (A has both).
- Because of this, **nothing from B was ported back**: doing so would have re-introduced unverifiable demo content and an unauthenticated API path. The bundled synthetic sample data in `src/data/mockData.ts` (present in both) is unchanged.

If you know of something specific in B that you want kept (a screen, text, design), tell me the file name and I will port it.

## What was added on top of A (v0.2.0)

New code: `src/utils/{redFlags,vitals,medications,labTrends,search,backup,visitPack,recordChunks,mindMap}.ts` (each with tests), `src/lib/{consent,records,download}.ts`, and the components `VitalsTrackerView`, `MedicationsView`, `LabTrendsView`, `VisitPackView`, `PrivacyCenterView`, `AskRecordsView`, `CommandPalette`, `ConsentModal`, `TodayPanel`, `RedFlagBanner`, `TrendChart`.

Changed code: `App.tsx`, `Navbar.tsx` (data-driven tabs + search button), `AppointmentsView.tsx` (persisted checklist, status, delete), `MindMapView.tsx` (save / open / delete), `NoteCreatorView.tsx` (red-flag banner), `src/lib/firebase.ts` (consent gate), `server.ts` (headers, request id, `/api/health`, `/api/gemini/ask-records`, JSON errors, graceful shutdown), `firestore.rules` (`vitals`, `medications`, `appointments.checklistDone`), `firebase-blueprint.json`, `package.json` (0.2.0, test glob), `.env.example` (`CSP_ENFORCE`), and the docs.

## Verification performed in the build sandbox

- `npm test` equivalent (`tsx --test "src/utils/*.test.ts"`): **67 tests pass** (6 pre-existing + 61 new). Writing the tests caught and fixed a real bug (units containing "/" such as `g/dL` made lab values unreadable).
- TypeScript: whole `src/` and `server.ts` type-checked with the project's non-strict `tsconfig` against hand-written stand-ins for React, lucide, Firebase and Express types (the real packages could not be installed: no network in the sandbox). This found and fixed three genuine issues (union narrowing without `strictNullChecks`, `Map` tuple inference, `useMemo` generic inference).
- Render smoke test: every new/changed component was server-rendered in English and Bangla with sample data (52 renders), and the expected output was checked (charts, alerts, checkboxes, dialogs).

## Not verified (please do these on your machine)

1. `npm install`, then `npm run typecheck`, `npm test`, `npm run build` with the real packages.
2. **`firestore.rules` was edited but never compiled or run in the Firebase emulator.** Test the new `vitals` and `medications` rules and the `checklistDone` change before publishing. Until published, signed-in saves of vitals, medicines and checklist ticks will fail with a permission error (guest mode is unaffected).
3. No live Firebase sign-in, Firestore read/write, or Gemini call was made. `/api/gemini/ask-records` has not been called against the real model.
4. The report-only CSP has not been tried on a deployed build; browser notifications, printing and the Ctrl/⌘+K shortcut were not exercised in a real browser.
5. Medical reference ranges in `vitals.ts` are general guidance and the red-flag keyword lists are not clinically validated. Have a clinician review them before any real-world use.
