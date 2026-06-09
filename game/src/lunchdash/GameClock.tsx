// Ticks the Lunch Dash clock each frame (renders null; lives inside the Canvas
// for useFrame). Stops at the noon deadline and when the run is complete.

import { useFrame } from '@react-three/fiber'
import { driveClock, END_MIN, IN_GAME_MIN_PER_SEC } from './clockState'
import { useLunchStore } from './lunchStore'

export function GameClock() {
  useFrame((_, delta) => {
    if (!driveClock.running || useLunchStore.getState().done) return
    driveClock.minutes = Math.min(END_MIN, driveClock.minutes + Math.min(delta, 0.05) * IN_GAME_MIN_PER_SEC)
    if (driveClock.minutes >= END_MIN) driveClock.running = false
  })
  return null
}
