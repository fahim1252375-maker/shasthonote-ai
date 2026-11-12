# Changelog

## 0.5.0 — Engineering refinement

- Resolved the previous ZIP/package version mismatch and aligned package metadata, app metadata and current documentation.
- Centralized active-medication date checks so Health Insights counts and reminder scheduling use the same inclusive local-date rules.
- Excluded invalid and future-dated vital readings from current Health Insights observations; added data-quality observations for those records.
- Validated appointment and document timestamps before using them in summaries.
- Localized Health Insights titles, details, actions and sources in Bangla and English.
- Moved Health Insights text generation into a pure export utility and kept the React view focused on rendering and navigation.
- Added tests for medication status consistency, invalid/future/stale readings, invalid appointments/documents, ordering and localized export content.
- Centralized text/Blob downloads and deferred object-URL revocation; reused the helper for Health Insights, Vitals CSV and note JSON exports.
- Added shared saved-vital validation for supported units, finite values and complete blood-pressure pairs; used it in Health Insights and trend summaries.
- Excluded malformed vital timestamps from date filters and trend summaries.
- Simplified the Health Insights layout and replaced vague section labels with descriptions of the actual calculations.
- Removed unused direct dependencies `motion` and `autoprefixer`; no package upgrades were made.

## 0.4.0 — Health Insights workspace

- Added a dedicated Health Insights workspace for saved vitals, active medication schedules, documents and upcoming appointments.
- Added deterministic observations ordered by severity, with source labels and follow-up prompts. It does not diagnose or predict disease.
- Added a local text export of the loaded overview and expanded the workspace width for larger screens.

## 0.3.0

- Added the installable PWA shell, Firestore IndexedDB persistence and encrypted backup/restore.

## 0.2.0

- Added vitals and medication tracking, lab trends, doctor visit pack, red-flag screening, consent controls, privacy tools and Ask My Records.
