// Advances the Lunch Dash objective when the car reaches the active
// destination. Pure logic (renders null); lives inside the Canvas so it gets a
// useFrame tick. Reads the mutable carPosition directly — no re-renders.

import { useFrame } from '@react-three/fiber'
import { carPosition } from './carState'
import { DESTINATIONS, ARRIVAL_RADIUS } from './destinations'
import { bowl } from './bowlState'
import { useLunchStore } from './lunchStore'

export function ObjectiveDetector() {
  useFrame(() => {
    const { stepIndex, done, advance } = useLunchStore.getState()
    if (done) return
    const d = DESTINATIONS[stepIndex]
    if (!d) return
    const dx = carPosition.x - d.x
    const dz = carPosition.z - d.z
    if (dx * dx + dz * dz <= ARRIVAL_RADIUS * ARRIVAL_RADIUS) {
      // the bowl is now riding shotgun — from here to HQ, your driving is judged
      if (d.id === 'bowlz') bowl.carrying = true
      advance()
    }
  })
  return null
}
