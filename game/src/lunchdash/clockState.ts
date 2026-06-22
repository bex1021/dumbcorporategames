// The Lunch Dash clock. 60 in-game minutes (11:00 AM → 12:00 PM Architecture
// Sync) are the run's universal currency. Plain mutable module state (like
// carState); ticked by <GameClock>, read by the HUD + the scoring.

export const START_MIN = 11 * 60 // 11:00 AM
export const END_MIN = 12 * 60 // 12:00 PM — the noon deadline (the Architecture Sync)
export const HARDCAP_MIN = 12 * 60 + 30 // 12:30 — total no-show; the run auto-fails here

// Real-time budget for the 11:00→12:00 hour. TUNABLE — and it needed tuning:
// the original 12 real minutes (5:1) was set for the blueprint's tiny 3×3
// downtown. The shipped city + faster driving make a clean run ~2–3 real min,
// so a 12-min clock never threatened noon. 4 real min (15:1) makes the deadline
// real while still leaving a first-timer room to navigate. Retune from playtest.
const REAL_SECONDS_PER_HOUR = 240
export const IN_GAME_MIN_PER_SEC = (END_MIN - START_MIN) / REAL_SECONDS_PER_HOUR

export const driveClock = { minutes: START_MIN, running: true }
