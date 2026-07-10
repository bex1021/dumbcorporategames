// The Lunch Dash clock. 60 in-game minutes (12:00 PM → 1:00 PM Architecture
// Sync) are the run's universal currency: the exec pings you at lunch and needs
// the bowl back by 1:00 for the key meeting. Plain mutable module state (like
// carState); ticked by <GameClock>, read by the HUD + the scoring. NOTE: the
// window is still exactly 60 min, so the autopilot-tuned budget below is
// unchanged — only the wall-clock labels moved from 11→12 to 12→1.

export const START_MIN = 12 * 60 // 12:00 PM — lunch break begins
export const END_MIN = 13 * 60 // 1:00 PM — the deadline (the Architecture Sync)
export const HARDCAP_MIN = 13 * 60 + 30 // 1:30 — total no-show; the run auto-fails here

// Real-time budget for the 11:00→12:00 hour. TUNED via the autopilot balance
// harness (scripts/playtest/lunchdash_run.ts) against the spread route (~1.3km)
// + the parade detour: in the 140–180s band, careless play reliably fails
// (real stakes) while careful/skilled play stays on-time. 150s (24:1) sits in
// the middle. Re-run the sweep after any route/hazard change.
const REAL_SECONDS_PER_HOUR = 150
export const IN_GAME_MIN_PER_SEC = (END_MIN - START_MIN) / REAL_SECONDS_PER_HOUR

export const driveClock = { minutes: START_MIN, running: true }
