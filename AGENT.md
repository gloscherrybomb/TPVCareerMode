# TPV Career Mode — Agent Guide

Reference for agents working in this repository. Focus is on what the experience is, how data flows, and where to make changes.

## Product Overview
- TPV Career Mode turns TrainingPeaks Virtual race results into a season-based career. Players progress through ordered events, unlock optional choices, and finish with a three-stage Local Tour (events 13–15).
- Frontend is static HTML/CSS/JS (no bundler) served directly from the repo; Firebase client SDKs provide auth and Firestore reads/writes.
- Race results are ingested offline via Node scripts and written to Firestore; the UI simply reads from those documents.

## Key Pages & Scripts
- `index.html` + `app.js`: Marketing/landing plus login/signup modal. Handles Firebase auth (email/password + Google), UID capture, and exposes `window.careerMode` to other pages.
- `events.html`: Season hub with timeline, progress stats, and stage cards. Loads `event-sequence.js` (stage definitions + `ProgressManager`), `event-data.js` (static event metadata), `events.js` (filtering/UI), and `season-completion*.js` for end-of-season banners.
- `event-detail.html` (not listed above but backed by): `event-detail-results.js` (renders results table, Local Tour GC, DNS handling, and pre/post-race sections) plus `event-detail-interview.js` (post-race interview text). Uses URL `?id=` to pick event.
- `local-tour.html`: Three-stage mini-tour overview fed by the same results data.
- `standings.html` + `standings.js`: Builds season leaderboard from Firestore results (with bot backfill). Includes filters and rider/bot profile modals.
- `peloton.html` + `peloton.js`: Displays generated bot peloton; ties into bot profile modal and profile request flow.
- `profile.html` + `profile.js`: Shows user stats, recent results, awards, ARR band, personality module (`profile-personality.js`), and personality awards display.
- Other feature UIs: `palmares.html` (trophy cabinet), `store.html` (unlockables via Cadence Credits), `season-completion-ui.js` (celebrations), `achievement-notifications.js` (toast queue), `cadence-credits.js` (soft currency/feature flag), `notification-queue.js`.

## Data & Progression Model
- Stage order is defined in `event-sequence.js` (`eventSequence` array). Stages 1,2,4,5,7 are mandatory; stages 3,6,8 are optional-choice stages; stage 9 is the Local Tour (events 13–15 in order).
- `ProgressManager` in `event-sequence.js` owns local state plus Firestore sync:
  - Fields persisted: `currentStage`, `completedStages`, `completedOptionalEvents` (a.k.a. `usedOptionalEvents`), `choiceSelections`, `totalPoints`.
  - Unlock logic: stage N unlocks only after N-1 is completed unless admin override is toggled.
  - Admin mode toggle is exposed on Events page for whitelisted users (`checkAdminStatus` in inline JS).
- Event metadata lives in `event-data.js` keyed by event number; includes name, subtitle, mandatory flag, course, distance, climbing, maxPoints, descriptive copy, and strategy notes.

## Firebase Shape (client-side)
- Config lives in `firebase-config.js` and is imported wherever Firebase SDK is used.
- Collections:
  - `users/{authUid}`: Starts with `name`, `email`, TPV `uid` (16-char hex), `currentStage`, `completedStages`, `completedOptionalEvents` (or `usedOptionalEvents`), `choiceSelections`, `totalPoints`, `createdAt`. Result processing adds rich stats: `careerPoints`, `totalEvents`, `totalWins`, `totalPodiums`, `totalTop10s`, `winRate`, `podiumRate`, `bestFinish`, `averageFinish`, per-event result blobs `event{N}Results`, DNS flags `event14DNS`/`event15DNS`, `season1Standings` (array with bot backfill), `season1Rank`, Local Tour fields (`tourProgress`, `localTourStatus`, `localTourGCPosition`), `awards` counts, `season1CelebrationViewed`, etc.
  - `results/season{S}_event{E}`: `results` array with per-rider entries (uid/name/arr/points/time/position/predictedPosition/bonuses/flags like `isBot`, `earned*` medals). Tour GC is derived client-side from stored stage results.
  - `botProfiles/{botUid}`: Bot bio data + image URLs surfaced in the bot profile modal.
  - `botProfileRequests/*`: Requests appended by the GitHub Action; also mirrored into `bot-profile-requests/requests.txt`.
- Auth: Email/password and Google sign-in supported. On Google sign-in, a secondary modal captures the TPV UID before allowing progression.

## Result Ingestion & Maintenance (Node / offline)
- Scripts use Firebase Admin; set env `FIREBASE_SERVICE_ACCOUNT` to the JSON string of the service account.
- `process-results.js`: Main ingestion pipeline for CSVs in `race_results/season_1/event_*`. Validates stage order (`STAGE_REQUIREMENTS`), updates `users` docs (progression, points, awards, tour/DNS logic), writes `results/season{S}_event{E}` docs, calculates narrative snippets (`story-generator.js`), awards (`awards-calculation.js`), currency (`currency-config.js`/`cadence-credits.js`), and unlocks (`unlock-config.js`).
- `reprocess-results.js`: Resets user event fields (and optionally `results` docs) then reprocesses CSVs. Flags: `--dry-run`, `--reset-only`, `--user UID`, `--season N`.
- `reset-user-results.js`: Targeted reset helper for a single user.
- `generate_results.py`: Utility to fabricate CSVs for testing; writes into the appropriate `race_results/season_*` folder.
- `check-file-order.js`: Ensures race result files are processed in sequence.
- Data files: `race_results/season_1/event_*/` contain the ingested CSVs; `ExportedWorld.json` and `UnboundLittleEgypt.gpx` are route/world assets for context.

## Awards, Currency, Unlocks
- Awards are defined in `awards-config.js`; calculations live in `awards-calculation.js` and are applied during ingestion. Counts are stored on the user doc and displayed on profile/palmares.
- Cadence Credits (soft currency) and feature flags are in `currency-config.js` and surfaced on the store page via `cadence-credits.js`.
- Unlockables and gating rules are defined in `unlock-config.js`; UI hooks exist in the store and profile.

## Personality & Narrative
- `profile-personality.js` + `personality-awards-*` render rider personality and badges on the profile page.
- `narrative-database.js`, `story-selector.js`, and `story-generator.js` support dynamic story text shown on event detail pages and season wrap-ups (`season-completion.js`/`season-completion-ui.js`).

## Common Workflows
- Add/edit events: Update `event-data.js` (metadata) and `event-sequence.js` (ordering/choice pools). Keep `STAGE_REQUIREMENTS` in `process-results.js` and `reprocess-results.js` in sync.
- Change scoring/awards: Adjust configs in `awards-config.js`, `awards-calculation.js`, and `currency-config.js`; rerun `process-results.js` or `reprocess-results.js` to apply.
- Refresh standings after new CSVs: Run `process-results.js` (or `reprocess-results.js` to reset + apply). Standings are recomputed client-side from `results` documents.
- Reset a user/season: Use `reset-user-results.js` or the Season 1 reset helper exposed in `events.html` inline script (requires logged-in user and admin).

## Gotchas
- No bundler/package manifest: install server-side deps manually (`npm i firebase-admin papaparse`) before running Node scripts.
- Client SDK imports are direct-from-CDN ES modules; pages must be served over HTTP(S) for Firebase auth to work reliably (opening `file://` can break auth callbacks).
- Optional events can only be used once per career; enforcement happens in both the UI and ingestion scripts—keep them aligned when making changes.
- Local Tour (events 13–15) must be completed in order; missing the 36-hour window triggers DNS flags that still mark the season complete.
- Admin toggle in Events page relies on `checkAdminStatus` (inline in `events.html`); ensure the admin list is updated if adding maintainers.
