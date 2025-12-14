# Integration Risks — Offline Practice

## Core assumptions
1. **Supabase connection is available whenever Practice loads.**
   - Risk: network outages or service-mode misconfigurations mean the session initialization never completes and the UI falls back to "No cards ready" without context.
   - Mitigation: log deck/profile load failures and keep a lightweight retry button tied to the same state so the user can refresh once connectivity returns.

2. **`profileContext.profile` and prefetched deck data are populated before any review is submitted.**
   - Risk: stale or missing profile/deck leads to `baseProfile` being `null`, so review attempts quietly return early (Status: guard returns) and the experience stalls.
   - Mitigation: gate the Practice view on both `deck` and `profile` readiness (with a minimal loading state) and emit a warning log when either is missing but `hasCards` is true.

3. **Offline queue grows only when `/api/review` fails and is flushed immediately afterward.**
   - Risk: prolonged server downtime causes the queue to swell (localStorage capacity) and repeated retries mislead the user. When connectivity returns, the flush loop spikes requests.
   - Mitigation: enforce a configurable queue cap (e.g., 500 entries), show an informative toast when the cap is hit, and back off the flush call with exponential jitter instead of synchronous loop.

4. **Retry/backoff loop hits resolved API or surfaces errors quickly.**
   - Risk: the current retry loop keeps hitting the endpoint until max attempts; without per-request correlation we can’t tell which attempt succeeded or which payload is in the queue.
   - Mitigation: the newly propagated `reviewId` gives every attempt a traceable anchor; log the `reviewId` when queuing so the admin can match queue flushing logs to the originating attempt.

5. **Deck regeneration and profile updates succeed without blocking the UX.**
   - Risk: a backend failure during `ensureDeckForProfile` could leave the deck unchanged while the session is complete, confusing the user.
   - Mitigation: log failures at warn level, keep the refresh trigger decoupled from the UI path, and avoid blocking the final modal on deck regen—allow manual refresh.

## Minimal tracking plan
- Log warnings when the offline queue length exceeds 250 to track prolonged outages.
- Monitor Supabase latency spikes (client or server) and replay the `reviewId` in logs so we can correlate which reviews were retried.

## Resilience checkpoints
- Add a guard that renders an error card when both deck and profile are missing (instead of `null`).
- Revisit session initialization after `refresh()` to ensure `deckCards` is recalculated even if `ensureDeckForProfile` failed.
