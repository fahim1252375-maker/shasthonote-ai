# Privacy notice

ShasthoNote AI is a prototype health-documentation and learning workspace. It is not certified for clinical use. This notice is an implementation summary, not legal advice or a jurisdiction-specific privacy policy.

## Information the app can handle

Depending on the features used, information may include:

- Google account identifiers and basic profile details from Firebase Authentication.
- Consultation notes, symptoms, allergies, existing medicines, questions and appointment details entered by the user.
- Extracted document text, document analysis summaries and structured findings.
- Study topics, generated study content and selected source passages.
- Audio recorded in the browser for transcription.
- Self-entered blood pressure, glucose, weight, temperature, heart-rate and SpO₂ readings, plus medicine names, doses and reminder times.

## Where the information is stored or sent

- Guest/demo records are stored in local storage in the current browser profile.
- Signed-in records are stored in the configured Firebase project's Firestore database. The app queries user-owned records by Firebase UID, and the Firestore rules are intended to enforce owner-only access.
- Signed-in Firestore records use a memory-only browser cache and are not intentionally persisted to IndexedDB. Guest/demo records remain in local storage and are synthetic.
- When an AI feature is used, the selected text or media is sent to this app's server and forwarded to the Gemini API configured by the operator. AI content is not required for local deterministic functions such as the red-flag screener, vitals calculations or Health Insights.
- The document analyzer stores extracted text and analysis results in Firestore. It does not upload the original document file to Firebase Storage.

## Offline storage and backup

The service worker caches the static application shell and selected frontend assets. It does not cache `/api/` responses, Firebase authentication responses, Firestore records or uploaded health-document files. Signed-in health records use an in-memory Firestore cache and are not guaranteed to remain available after reload while offline; AI requests require a network connection.

The Privacy & Data Center can export a password-protected `.shasthonote` backup using PBKDF2-SHA-256 and AES-256-GCM. The passphrase is processed in the browser and is not saved or sent to the server. The app cannot recover a lost passphrase. A plain JSON backup is also available for compatibility; it is not encrypted.

## User precautions

Do not enter another person's identifiable health information without their permission. Avoid shared browser profiles and use device-level screen locks and encryption. Clear this site's browser data before handing a device to someone else. Confirm extracted values and AI summaries against the original document and a qualified healthcare professional.

Do not use this prototype for emergencies, diagnosis, prescriptions, medication decisions or clinical triage.

## Export, deletion and AI data-use notice

The Privacy & Data Center supports:

- accepting or declining AI use for the signed-in account (the server issues a UID-bound, HttpOnly, signed consent cookie; localStorage only mirrors the choice for UI display);
- exporting all loaded records as an unencrypted JSON file;
- exporting a password-protected encrypted backup;
- restoring a validated backup; and
- deleting records in the current account after a typed confirmation.

Deleting account records does not delete the Firebase Authentication account, previously downloaded backups, vendor-held copies under their own terms, or all browser cache automatically. Guest mode can reset its local data separately.

AI routes enforce consent on the server by requiring a valid, versioned, UID-bound HttpOnly cookie signed with `AI_CONSENT_COOKIE_SECRET`; changing localStorage alone cannot enable AI requests. The signed cookie is a server-verifiable permission token, not a centrally stored legal consent ledger or proof of identity beyond the authenticated Firebase UID. A production operator still needs a clear retention period, data-subject request process, operator-level deletion process, incident response plan and vendor/subprocessor review.

## Contact and formal policy

Before accepting real patient information, a production operator must add a legal entity/name, contact channel, jurisdiction, retention periods, data-subject request process, subprocessors and the privacy notices required in the target jurisdiction.
