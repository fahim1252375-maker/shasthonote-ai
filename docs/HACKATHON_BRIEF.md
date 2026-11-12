# ShasthoNote AI — hackathon project brief (competition-neutral draft)

## One-line description

ShasthoNote AI is a bilingual Bangla-English health documentation and learning workspace that helps people organize symptoms, reports, and questions before speaking with a healthcare professional.

## Problem

People may arrive at consultations with fragmented symptom histories, unclear timelines, scattered test reports, and difficulty explaining health concerns across language or medical-literacy barriers. Important context can be missed when notes and documents are not organized.

## Proposed solution

ShasthoNote AI combines structured consultation notes, voice transcription, document text extraction and explanation, appointment preparation, and source-based learning in one workspace. It is designed to improve organization and communication, not to diagnose or prescribe.

## Current demo flow

1. Open the bilingual dashboard and review clearly labelled synthetic demo data.
2. Create a consultation note with symptoms, onset, duration, medication/allergy context, and questions for a clinician.
3. Sign in with Google and request an AI-generated patient summary and doctor brief.
4. Upload a non-identifying sample document (or use a clearly labelled synthetic sample) and inspect extracted findings.
5. Save an appointment and link it to a consultation note.
6. Open Research & Learning to generate flashcards, a quiz, a mind map, or a narration script from source material.
7. Show how the account's saved notes, documents, appointments, study resources, vitals, and medicines are isolated by Firebase UID.

## What makes the demo distinct

- Bangla and English support in one workflow.
- Consultation preparation and health-document organization in addition to learning tools.
- A single UID-isolated Firestore model across seven collections, with browser-persistent caching for supported offline workflows.
- Clear separation between AI-generated suggestions, synthetic samples, and user-reported facts.

## Honest limits to disclose

- No clinical validation or measured health outcome is claimed.
- AI summaries and extracted values can be wrong; original reports and clinicians remain authoritative.
- AI requests transmit selected user content to the configured Gemini API.
- Nearby care suggestions need direct verification.
- Audio is a generated narration script read by browser speech synthesis, not downloadable AI audio.
- Real Firebase/Gemini integration, security rules, and production build must be tested in the target deployment environment before public judging. The service worker caches only static frontend assets; the Firestore IndexedDB cache is local to the browser and is not an encrypted vault.

## Suggested 60-second pitch

"ShasthoNote AI helps people prepare for better conversations with healthcare professionals. Many patients have symptoms, medicine lists, appointments, and reports scattered across different places. Our bilingual workspace helps them organize that information, prepare a clear consultation brief, understand what a report says, and learn from selected source material. It keeps each signed-in user's records separated in Firebase and labels AI-generated output as assistance rather than medical authority. We are building for clearer communication and better preparation—not automated diagnosis."

## Competition-specific work still required

This draft must be adapted after choosing a specific Devpost event. Add the official challenge track, judging criteria, team details, implementation evidence, live demo URL, repository URL, screenshots, and any required disclosures only after verifying that event's current rules.


## Official Devpost requirements checked 12 November 2026

Event: DSH Hacks V2 ($100k+ in prizes!) — https://dsh-hacks-v2.devpost.com/

Theme: AI x Healthcare. The host explicitly permits AI use in submissions. Judging criteria (5-point scale):

1. Idea — theme fit, innovation and potential public impact.
2. Implementation — working solution and technical challenge.
3. Design — user experience and interface quality.
4. Presentation — clarity of problem and solution.

The retrieved submission requirements call for an interactive project, a demo video, a one-page project description PDF, a GitHub repository / code PDF, and a ZIP. The current event record showed submissions open with a deadline of 15 November 2026, 07:45 UTC (Pacific time zone setting in the event record). Verify the live event page before relying on deadlines.

**AI disclosure:** The event rules explicitly allow AI. Do not claim 0% AI use or conceal assistance. In the submission, identify which tools were used, which parts were AI-assisted, what the participant personally designed/implemented, and what was tested manually. A truthful process log is stronger than a false claim.

**Current release note:** v0.5.0 refines Health Insights date handling, medication-status consistency, bilingual content, export handling and regression coverage. The workspace is deterministic and is not clinically validated; it does not diagnose or predict disease. The application build, live Firebase/Gemini flows, Firestore Emulator rules and deployed hosting still require verification in the target environment. The event details above are a dated research note, not a live status check; confirm dates and submission requirements on the official event page before relying on them.
