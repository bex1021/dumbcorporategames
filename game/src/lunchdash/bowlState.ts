// Salmon-bowl state — the core Lunch Dash mechanic. Plain mutable module state
// (same convention as carState / crashState): the Car writes `integrity` as the
// bowl sloshes on hard corners and crashes, the HUD reads it for the gauge, and
// the end screen reads the final tier. Reset each run by LunchDash.
//
// You pick the bowl up at Corporate Slop Bowlz (the first stop). From then until
// you hand it over at Alignly HQ it rides in the car: drive smooth and lift off
// for corners to keep it Composed; yank the wheel at speed or crash and it ends
// up Disheveled. The arrival tier is what Phase 4 (the exec review) reacts to.

import { BOWL } from './driveConfig'

export const bowl = {
  carrying: false, // true once picked up at the bowl stop
  integrity: 100, // 0..100 — full at pickup, only ever drops (a spill doesn't un-spill)
  sloshPulse: 0, // ticks up on a notable slosh — the HUD flashes on the change
}

export type BowlTier = 'composed' | 'functional' | 'disheveled'

// Where the bowl ends up determines how the exec receives you in Phase 4.
export function bowlTier(integrity: number): BowlTier {
  if (integrity >= 70) return 'composed'
  if (integrity >= 30) return 'functional'
  return 'disheveled'
}

// One frame of sloshing. Kept here (not inline in the Car) so the model is in
// one place and can be exercised directly. `latAccel` is the sideways force on
// the bowl (m/s², = speed × yaw-rate); `sevGain` is crash severity picked up
// this frame. Integrity only ever drops.
export function sloshBowl(latAccel: number, sevGain: number, dt: number) {
  if (!bowl.carrying) return
  let slosh = 0
  if (latAccel > BOWL.latThreshold) slosh += (latAccel - BOWL.latThreshold) * BOWL.latRate * dt
  slosh += sevGain * BOWL.crashRate
  if (slosh > 0) {
    bowl.integrity = Math.max(0, bowl.integrity - slosh)
    if (slosh > BOWL.pulseMin) bowl.sloshPulse++
  }
}

export function resetBowl() {
  bowl.carrying = false
  bowl.integrity = 100
  bowl.sloshPulse = 0
}
