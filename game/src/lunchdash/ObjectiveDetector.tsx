// Drives the pickup interaction at each stop. You must reach the active stop's
// pull-in zone AND slow down; holding there fills a progress meter, then the
// pickup completes. Two special rules layered on the simple sequence:
//   - SALMON OVERBOARD: if you trash the bowl, the active stop snaps back to
//     Corporate Slop Bowlz for a fresh one — wherever you'd got to.
//   - HQ GUARD: roll into the Alignly HQ drop-off without both the bowl AND your
//     lunch and it won't accept you — it tells you to come back with both.
// Pure logic; lives inside the Canvas for a useFrame tick. Reads mutable car
// state — no re-renders.

import { useFrame } from '@react-three/fiber'
import { carPosition, carTelemetry } from './carState'
import { DESTINATIONS, ZONE_RADIUS, PICKUP_MAX_SPEED } from './destinations'
import { bowl, armBowl } from './bowlState'
import { driveClock } from './clockState'
import { pickup, resetPickup } from './pickupState'
import { useLunchStore, activeStop } from './lunchStore'

const OFFICE_INDEX = DESTINATIONS.findIndex((d) => d.kind === 'office')

export function ObjectiveDetector() {
  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.05)
    const { stepIndex, mustRebowl, done, advance, flagRebowl, clearRebowl } = useLunchStore.getState()
    if (done) {
      resetPickup()
      return
    }

    // the salmon went overboard since last frame → must fetch another bowl
    if (bowl.salmonGone && !mustRebowl && stepIndex >= 1) flagRebowl()

    const activeIdx = activeStop(stepIndex, mustRebowl)
    const d = DESTINATIONS[activeIdx]
    if (!d) return

    // HQ GUARD — if HQ isn't the active stop but you've pulled into its zone,
    // you're trying to finish without everything. Say so, don't complete.
    if (d.kind !== 'office') {
      const o = DESTINATIONS[OFFICE_INDEX]
      const odx = carPosition.x - o.x
      const odz = carPosition.z - o.z
      if (odx * odx + odz * odz <= ZONE_RADIUS * ZONE_RADIUS) {
        pickup.inZone = true
        pickup.filling = false
        pickup.progress = 0
        pickup.need = 1
        pickup.prompt = mustRebowl
          ? 'No salmon bowl — go back to Corporate Slop Bowlz for another'
          : 'Come back once you have the bowl AND your lunch'
        return
      }
    }

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
    pickup.prompt = mustRebowl
      ? 'Grabbing a fresh bowl…'
      : d.kind === 'office'
        ? 'Parking the car…'
        : d.id === 'bowlz'
          ? "Grabbing the exec's bowl…"
          : 'Waiting on your order…'
    pickup.progress += dt
    if (pickup.progress >= d.holdSeconds) {
      driveClock.minutes += d.timeCost // the wait eats the clock
      resetPickup()
      if (mustRebowl) {
        armBowl() // a fresh bowl — resume where you were (no advance)
        clearRebowl()
      } else {
        if (d.id === 'bowlz') armBowl() // the exec's bowl is now riding shotgun
        advance()
      }
    }
  })
  return null
}
