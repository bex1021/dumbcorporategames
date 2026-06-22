// Drives the pickup interaction at each stop. You must reach the active stop's
// pull-in zone AND slow down; holding there fills a progress meter, then the
// pickup completes (the bowl arms at Corporate Slop Bowlz, the stop's time cost
// is charged, and the objective advances). Pure logic; lives inside the Canvas
// for a useFrame tick. Reads mutable car state — no re-renders.

import { useFrame } from '@react-three/fiber'
import { carPosition, carTelemetry } from './carState'
import { DESTINATIONS, ZONE_RADIUS, PICKUP_MAX_SPEED } from './destinations'
import { bowl } from './bowlState'
import { driveClock } from './clockState'
import { pickup, resetPickup } from './pickupState'
import { useLunchStore } from './lunchStore'

export function ObjectiveDetector() {
  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.05)
    const { stepIndex, done, advance } = useLunchStore.getState()
    if (done) {
      resetPickup()
      return
    }
    const d = DESTINATIONS[stepIndex]
    if (!d) return

    const dx = carPosition.x - d.x
    const dz = carPosition.z - d.z
    const inZone = dx * dx + dz * dz <= ZONE_RADIUS * ZONE_RADIUS
    pickup.inZone = inZone
    pickup.need = d.holdSeconds

    if (!inZone) {
      pickup.filling = false
      pickup.prompt = ''
      pickup.progress = Math.max(0, pickup.progress - dt * 2) // bleed off if you pull away
      return
    }

    if (Math.abs(carTelemetry.speed) >= PICKUP_MAX_SPEED) {
      // in the zone but blowing through it — tell them to slow up
      pickup.filling = false
      pickup.prompt = 'Slow down to pull up to the window'
      pickup.progress = Math.max(0, pickup.progress - dt)
      return
    }

    // pulled up and slow — fill the pickup
    pickup.filling = true
    pickup.prompt = d.kind === 'office' ? 'Parking the car…' : d.id === 'bowlz' ? "Grabbing the exec's bowl…" : 'Waiting on your order…'
    pickup.progress += dt
    if (pickup.progress >= d.holdSeconds) {
      if (d.id === 'bowlz') bowl.carrying = true // the bowl is now riding shotgun
      driveClock.minutes += d.timeCost // the wait eats the clock
      resetPickup()
      advance()
    }
  })
  return null
}
