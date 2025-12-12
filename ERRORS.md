# Error Log – November 2025

## 1. Landing Page Blank Screen
- **Symptom:** Visiting `http://127.0.0.1:5173/gulf-arabic-flashcards/` rendered a blank page with no console errors.
- **Cause:** `BrowserRouter` was using the default basename (`'/'`) while Vite served the app from `/gulf-arabic-flashcards/`, so React Router never matched `/gulf-arabic-flashcards/`.
- **Fix:** Set `basename={import.meta.env.BASE_URL ?? '/'}` in `src/App.tsx`. Landing page now renders correctly.

## 2. Onboarding Crash (`RadioGroupItem` outside `RadioGroup`)
- **Symptom:** Navigating past the onboarding quiz threw `Uncaught Error: RadioGroupItem must be used within RadioGroup`.
- **Cause:** Several `RadioGroupItem` components (gender, age range, difficulty level) were rendered outside a `RadioGroup` context.
- **Fix:** Wrapped each group in a proper `RadioGroup`, removed the deprecated “Other” gender option, and refactored difficulty cards to use hidden radio inputs. Onboarding now loads without runtime errors.

## 3. Flashcard Reveal Experience
- **Requirement:** Keep Arabic side visible by default, flip to English on demand, and add a reveal button.
- **Implementation:** `GulfaraFlashcard` now:
  - Resets state on card change.
  - Blurs the Arabic term until “Reveal Word” is pressed.
  - Provides a dedicated “Show English” button for flipping.

## 4. Playwright Smoke Failures
- **Strict mode violations:** Multiple “Start Learning” buttons triggered strict-mode selector errors.
  - **Resolution:** Use `.first()` to target the hero CTA specifically.
- **Onboarding heading timeout:** Original assertion looked for a non-existent “Onboarding” heading.
  - **Resolution:** Wait for the actual heading text (`Welcome to Gulfara`) with a longer timeout.
- **Result:** `npm run test:smoke` now passes cleanly.

## Verification
- `npm run test:unit`
- `npm run test:integration`
- `npm run test:smoke`
- Manual sanity: landing hero, onboarding, and practice with GPT-5 nano schema all return 200 responses.

---

## 5. GPT-5 Nano 400 Errors (Practice Flow)
- **Symptom:** Each flashcard submission triggered `POST .../chat/completions 400` and console logs “OpenAI API request failed”.
- **Cause:** The GPT‑5 nano endpoint expects the `/v1/responses` payload with JSON schema metadata; our original chat completion prompt was invalid.
- **Fix:** Switched to `/v1/responses`, added strict `json_schema` response_format, and send flashcard metadata with the learner’s performance. Added detailed error logging to surface response bodies.
- **Follow-up:** Practice cards now submit successfully with real keys; Playwright smoke tests pass.

## 6. GPT-5 Nano 400 Errors (Unknown parameter: response_modality)
- **Symptom:** After migrating to `/v1/responses`, console reported `Unknown parameter: 'response_modality'`.
- **Cause:** The correct field name in the new API is `modalities` (array), and JSON-schema configuration belongs inside `text.format`.
- **Fix:** Updated payload to use `modalities: ['text']` and moved the schema under `text: { format: { ... } }` in both `adjustDifficulty` and `generateRecommendations`.
- **Status:** Practice flow now hits GPT-5 nano successfully with no 400 responses.

## 7. GPT-5 Nano 400 Errors (Unknown parameter: modalities)
- **Symptom:** Practice submissions returned `Unknown parameter: 'modalities'` after the prior fix.
- **Cause:** Latest Responses API spec no longer accepts a `modalities` field; JSON schema is configured solely via `text.format`.
- **Fix:** Removed the `modalities` property from both adapter payloads; schema remains under `text.format`.
- **Status:** Requests now send only the documented fields. Awaiting manual verification and automated test runs.
- Manual sanity: landing hero, onboarding step 1, and practice flashcards behave as expected.

## 8. Vite Dev Base Path vs. Lazy Imports
- **Symptom:** Navigating from the landing page to `/onboarding` crashed with `Failed to fetch dynamically imported module`.
- **Cause:** The dev server was serving under `/gulf-arabic-flashcards/`, so lazy-loaded chunks requested `/gulf-arabic-flashcards/src/...`, which the on-the-fly server cannot resolve. Playwright smoke tests also assumed the sub-path and stalled.
- **Fix:** Made both Vite configs return `'/'` during `serve`, with optional sub-path via `VITE_APP_BASE_PATH`/`BASE_PATH` for production. Updated `BrowserRouter` to use `'/'` in development and aligned Playwright config/tests to hit root paths.
- **Status:** Dev navigation and smoke suite pass; production builds retain the ability to deploy under a sub-directory.


