# Review Queue Tracing

1. **ID generation** — Every answer in `PracticeContent` now calls `createReviewId()`. That helper uses `crypto.randomUUID()` when available or synthesizes a time/random string, ensuring deterministic correlation even when `window.crypto` is unavailable (SSR tests, mocks).

2. **Payload propagation** — The `reviewId` is attached to the `ReviewRequestPayload` before `submitReviewPayload` is invoked (with retries/backoff). Failed network requests reuse the same `reviewId` when the payload is queued locally via `offlineQueue.add`.

3. **Offline storage** — The queue persists entries as `{ reviewId, payload, timestamp }`. Removal/flushing operations pass the exact `reviewId` back to the queue so the log entries (`flushed`/`failed to flush`) refer to the same identifier stored in localStorage.

4. **Backend correlation** — The `/api/review` handler accepts the optional `reviewId` and includes it in all log hooks (`review request received`, `review processed`, and `review handler failed`). This lets stdout captures show the link between UI attempts, retries, queue flushes, and eventual server processing.

5. **Observability benefits** — When debugging an orphaned review, search logs for `reviewId`. The Practice UI logs the queue length and flush errors with the same ID; the queue and backend logs mirror it, eliminating guesswork about which attempt failed or succeeded.
