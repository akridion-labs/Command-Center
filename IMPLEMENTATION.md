# Slice 13: Conversational ask box

## Changes
- `src/ask/AskBox.tsx`: follow-up turns send `history: [previous]` with the new query; a "loading…" state shows while `/vyom/ask` is pending; a failed call (network error, 500, bad JSON, 401/403) shows NOT BUILT with "/vyom/ask unreachable" and no answer or sources; answers list their `sources` labelled by tool name; a `configProblem` is shown near the sources.
- `src/Deck.tsx`: passes `/vyom/me`'s `config_problem` to the AskBox; a `/vyom/me` that is not built, refused (403) or unreachable renders `<NotBuilt>` in a "/vyom/me" slot, with the server's `why` kept word for word; added a Spend tile that shows NOT BUILT (no endpoint).
- Tests: `src/ask/Slice13AskBox.test.tsx` and `e2e/ask13.spec.ts` (TC-13-1 to TC-13-14).

## Verification
- `npx vitest run src/ask` and `npx playwright test --grep-invert @visual ask13` were run after the last change.
- TC-13-12 is a `@visual` test with a new screenshot baseline that has not been approved yet; it was not run.
- The full test suite was not run for this rework.
