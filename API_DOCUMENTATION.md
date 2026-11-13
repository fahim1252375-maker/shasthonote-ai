# API documentation — ShasthoNote AI

All `/api/gemini/*` routes require a valid Firebase ID token in `Authorization: Bearer <token>`. Guest/demo sessions are not accepted. The browser helper in `src/lib/firebase.ts` adds the token automatically.

The API key is server-side only (`GEMINI_API_KEY`). All endpoints use the server-configured `GEMINI_MODEL` (default in `.env.example`: `gemini-2.5-flash`). Verify that this model is available to the API project; model availability may change.

## Health and status

### `GET /api/test`

Returns a simple server process status and current epoch milliseconds. It does not verify Firebase or Gemini connectivity.

### `GET /api/health`

Unauthenticated readiness probe: `{ status, version, time, uptimeSeconds, geminiConfigured, model, firebaseProjectId, environment }`. It reports whether configuration is present only; it never returns secrets and does not call Gemini or Firebase.

Every `/api/*` response carries an `X-Request-Id` header. The server logs only `method path status duration` per request (no bodies, query strings, tokens or health content). Malformed or oversized JSON bodies return `{ success: false, error }` with `400` / `413`.

### `GET /api/gemini/*` authentication

Requests without a valid Firebase ID token return `401`. If Google's public token-signing keys cannot be retrieved, the service returns `503`.

## AI endpoints

### `POST /api/gemini/summarize`

Request JSON fields: `title`, `chiefComplaint`, `patientDescription`, `onsetDate`, `duration`, `symptoms`, `reportedMedicalHistory`, `existingMedications`, `allergies`, `questionsForDoctor`, `targetLanguage` (`en` or `bn`).

Returns `{ success, data }`, with patient summary, doctor brief, timeline, missing information, and suggested questions. It is organizational support, not diagnosis or treatment.

### `POST /api/gemini/transcribe`

Request: `{ audioBase64, mimeType, languageHint }`, where MIME type is one of WebM, OGG, WAV, MPEG, or MP4 audio and language hint is `en`, `bn`, or `mixed`.

Returns `{ success, transcript }`.

### `POST /api/gemini/analyze-document`

Request may include one of `imageBase64`, `pdfBase64`, or `textContent`, plus `mimeType` for images and `category`. Image formats accepted: JPEG, PNG, WEBP. PDFs and images are sent inline to Gemini. The route limits upload payload sizes and document text.

Returns `{ success, data }` with document type, extracted findings, plain-language explanation, clarification questions, and OCR confidence. Always compare extracted values with the original document.

### `POST /api/gemini/grounded-research`

Request: `{ query, sourceChunks, useGoogleSearch, language }`. Source chunks are limited in count and length and include `id`, `title`, `page`, and `text`.

Returns `{ success, data }`. For uploaded sources, the server checks proposed exact quotes against the supplied text and filters quotes that do not match. A quote match does not establish that the underlying statement is true or medically appropriate. Google Search grounding is optional and depends on model/project support.

### `POST /api/gemini/ask-records`

Request: `{ query, sourceChunks, language }` where `sourceChunks` is 1–8 passages of up to 12,000 characters, each `{ id, title, page, text }`, built by the client from the notes/documents the user selected. `language` is `en` or `bn`.

Returns `{ success, data: { answer, foundInSources, citedPassages, followUpQuestions } }`. The server verifies every proposed quote against the supplied text with the same checker as `grounded-research` and drops quotes that do not match; `followUpQuestions` are capped at 5. The prompt forbids diagnosis and medication changes and tells the model to advise urgent care when the records describe emergency warning signs. A matched quote proves only that the words exist in the record, not that they are correct.

### `POST /api/gemini/nearby-care`

Request: `{ locationQuery, specialty }`.

Uses the Gemini Google Maps tool when available. The app does not independently verify hours, appointments, quality, or current availability. Confirm all facility details directly before travelling.

### `POST /api/gemini/study-studio`

Request: `{ topic, documentText?, mode, language }`. `mode` is `flashcards`, `quiz`, `mindmap`, or `study_guide`.

Returns `{ success, data }` in a mode-specific structure. Educational output should be checked against trusted source material.

### `POST /api/gemini/narration-script`

Request: `{ text, title?, language? }`.

Returns `{ success, data: { audioTitle, script, keyPoints, durationEstimate } }`. Gemini generates text only. The browser's SpeechSynthesis API reads the script aloud; this endpoint does not generate an audio file.

## Limits

The server uses an Express JSON body parser capped at 18 MB, endpoint-specific field limits, and an in-memory per-user rate limit of 20 requests per minute per server process. Production deployments with multiple instances must use a shared rate-limit store and configure additional quotas/monitoring.


## Server-enforced AI consent

- `GET /api/consent` — requires a Firebase ID token; returns whether the current UID has a valid server-signed AI consent cookie.
- `POST /api/consent` — requires a Firebase ID token and JSON `{ "granted": boolean, "version": "ai-data-use-v1" }`. Granting consent issues a 180-day HttpOnly, UID-bound cookie; declining clears it.
- The server requires `AI_CONSENT_COOKIE_SECRET` (at least 32 characters). Without it, consent cannot be granted and AI endpoints fail closed.
