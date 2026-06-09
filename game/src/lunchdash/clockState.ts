// The Lunch Dash clock. 60 in-game minutes (11:00 AM → 12:00 PM deadline)
// elapse over ~12 real minutes — the 5:1 compression from the blueprint. Plain
// mutable module state (like carState); ticked by <GameClock>, read by the HUD.

export const START_MIN = 11 * 60 // 11:00 AM
export const END_MIN = 12 * 60 // 12:00 PM (hard deadline)

// in-game minutes per real second: (60 in-game min) / (12 real min * 60 s)
export const IN_GAME_MIN_PER_SEC = (END_MIN - START_MIN) / (12 * 60)

export const driveClock = { minutes: START_MIN, running: true }
