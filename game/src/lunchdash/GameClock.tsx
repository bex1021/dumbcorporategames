// Ticks the Lunch Dash clock each frame (renders null; lives inside the Canvas
// for useFrame). Noon (12:00, the Architecture Sync) is a HARD deadline: the
// clock stops there and if the player hasn't delivered, the run is lost
// (timeOut). The balance harness confirms careful play finishes ~11:54, so the
// deadline is tense but fair.

import { useFrame } from '@react-three/fiber'
import { driveClock, END_MIN, IN_GAME_MIN_PER_SEC } from './clockState'
import { useLunchStore } from './lunchStore'

export function GameClock() {
  useFrame((_, delta) => {
    const store = useLunchStore.getState()
    if (store.done) return // run's over — freeze the clock at the end time
    driveClock.minutes = Math.min(END_MIN, driveClock.minutes + Math.min(delta, 0.05) * IN_GAME_MIN_PER_SEC)
    if (driveClock.minutes >= END_MIN) store.timeOut() // noon — out of time, you lose
  })
  return null
}
