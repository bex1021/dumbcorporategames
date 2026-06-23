// The Lunch Dash clock. 60 in-game minutes (11:00 AM → 12:00 PM Architecture
// Sync) are the run's universal currency. Plain mutable module state (like
// carState); ticked by <GameClock>, read by the HUD + the scoring.

export const START_MIN = 11 * 60 // 11:00 AM
export const END_MIN = 12 * 60 // 12:00 PM — the noon deadline (the Architecture Sync)
export const HARDCAP_MIN = 12 * 60 + 30 // 12:30 — total no-show; the run auto-fails here

// Real-time budget for the 11:00→12:00 hour. TUNED via the autopilot balance
// harness (scripts/playtest/lunchdash_run.ts) against the spread route (~1.3km)
// + the parade detour: in the 140–180s band, careless play reliably fails
// (real stakes) while careful/skilled play stays on-time. 150s (24:1) sits in
// the middle. Re-run the sweep after any route/hazard change.
const REAL_SECONDS_PER_HOUR = 150
export const IN_GAME_MIN_PER_SEC = (END_MIN - START_MIN) / REAL_SECONDS_PER_HOUR

export const driveClock = { minutes: START_MIN, running: true }
