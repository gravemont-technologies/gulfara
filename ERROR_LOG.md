# Gulfara Error Log (Chronological)

| # | Date (UTC) | Context | Symptom | Root Cause | Resolution |
|---|------------|---------|---------|------------|------------|
| 1 | 2025-01-?? | Dev server | `RadioGroupItem must be used within RadioGroup` during onboarding | Radix component nesting incorrect | Wrapped `RadioGroupItem` with `RadioGroup` and updated labels |
| 2 | 2025-01-?? | Dev server | Blank dashboard after login | `Layout` expected `<Outlet>` children; router provided nested routes | Converted layout to accept children and reinstated Router `<Outlet>` |
| 3 | 2025-01-?? | OpenAI integration | `POST /v1/chat/completions 400` | Used legacy Chat Completions payload | Migrated to `/v1/responses` with JSON schema |
| 4 | 2025-01-?? | OpenAI integration | `Unsupported parameter: response_format` | New Responses API expects schema under `text.format` | Updated payload structure |
| 5 | 2025-01-?? | OpenAI integration | `Unknown parameter: response_modality` | Field renamed to `modalities` in new API | Replaced property and re-tested |
| 6 | 2025-01-?? | OpenAI integration | `Unknown parameter: modalities` | Latest Responses API removed the field entirely | Removed property; rely on `text.format` only |
| 7 | 2025-01-?? | Dev server | `Failed to fetch dynamically imported module` on `/onboarding` | Vite dev `base` set to `/gulf-arabic-flashcards/` causing chunk 404 | Dev base forced to `/`, production base configurable |
| 8 | 2025-01-?? | Playwright smoke | Landing CTA not found | Tests still navigated to `/gulf-arabic-flashcards/` after base reset | Updated Playwright base URL and smoke routes to `/` |

> **Source references:** For detailed remediation notes see `ERRORS.md` entries 1–8 and `.specstory/history/`.

