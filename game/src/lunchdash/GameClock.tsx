// Ticks the Lunch Dash clock each frame (renders null; lives inside the Canvas
// for useFrame). The clock keeps running PAST noon into "late" territory; if it
// reaches the 12:30 hard cap with the player still not home, the run auto-fails.

import { useFrame } from '@react-three/fiber'
import { driveClock, HARDCAP_MIN, IN_GAME_MIN_PER_SEC } from './clockState'
import { useLunchStore } from './lunchStore'

export function GameClock() {
  useFrame((_, delta) => {
    const store = useLunchStore.getState()
    if (store.done) return // run's over — freeze the clock at the arrival time
    driveClock.minutes = Math.min(HARDCAP_MIN, driveClock.minutes + Math.min(delta, 0.05) * IN_GAME_MIN_PER_SEC)
    if (driveClock.minutes >= HARDCAP_MIN) store.finishLate()
  })
  return null
}
