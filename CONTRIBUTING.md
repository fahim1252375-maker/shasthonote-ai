# Contributing to ShasthoNote AI

Thank you for considering a contribution. Improvements to accessibility, privacy, data integrity, documentation, testing, and maintainability are especially valuable.

## Before You Start

- Read the [README](./README.md), [architecture guide](./ARCHITECTURE.md), [privacy notes](./PRIVACY.md), and [security policy](./SECURITY.md).
- Open an issue before large or behaviour-changing work so the scope can be discussed.
- Keep changes focused and document any new data flow or external service.
- Never add real patient records, identifiable health information, screenshots containing personal data, API keys, access tokens, or private Firebase data to the repository or issue tracker. Use synthetic fixtures only.

## Local Development

Requirements: Node.js 22.12 or later and npm. The repository's `.node-version` currently specifies 22.16.0.

```bash
npm ci
cp .env.example .env
npm run dev
```

Configure Firebase and optional Gemini access in your local environment. Keep `GEMINI_API_KEY` server-side; never expose it through frontend code or a `VITE_` variable.

## Validation

Run the checks relevant to your change:

```bash
npm run typecheck
npm test
npm run build
```

The current test suite covers utility modules; it does not replace browser end-to-end, Firebase Emulator, or live Gemini integration tests. State exactly which checks you ran and what remains unverified. There is no separate ESLint or Prettier configuration in this repository.

## Health, Privacy, and AI Boundaries

- Do not add claims that the product diagnoses, treats, prescribes, or replaces professional medical advice.
- Do not use real patient data in tests, fixtures, sample accounts, screenshots, or issue reports.
- Make AI data flows explicit. State what content is sent to the server and external AI provider.
- Treat AI summaries, extracted values, and generated explanations as fallible; preserve source review and user consent.
- Do not describe browser IndexedDB persistence as encrypted storage or a secure medical vault.
- Preserve account isolation, consent checks, access controls, and data-export behaviour.
- Keep emergency and clinical decisions outside the scope of generated AI guidance.

## Pull Requests

- Use a focused branch and a descriptive commit message.
- Explain the user problem, the implementation, and any trade-offs.
- Add or update tests for changed behaviour.
- Update API, architecture, privacy, security, or AI-disclosure documentation when applicable.
- Include screenshots for meaningful interface changes, using synthetic data only.
- Disclose AI assistance where relevant and required by the event or contribution rules.
