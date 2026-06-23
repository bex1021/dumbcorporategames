// Salmon-bowl state — the core Lunch Dash mechanic. Plain mutable module state
// (same convention as carState / crashState): the Car writes `integrity` as the
// bowl sloshes on hard corners and crashes, the HUD reads it for the gauge, and
// the end screen reads the final tier. Reset each run by LunchDash.
//
// You pick the bowl up at Corporate Slop Bowlz (the first stop). From then until
// you hand it over at Alignly HQ it rides in the car: drive smooth and lift off
// for corners to keep it Composed; yank the wheel at speed or crash and it ends
// up Disheveled. If you trash it completely the SALMON GOES OVERBOARD — the bowl
// is ruined and you must drive back for a fresh one (see ObjectiveDetector).

import { BOWL } from './driveConfig'

// integrity at/below which the salmon itself is ejected — the bowl is a write-off
export const SALMON_OVERBOARD = 5

export const bowl = {
  carrying: false, // true once a bowl is in the car
  integrity: 100, // 0..100 — full at pickup, only ever drops within one bowl
  sloshPulse: 0, // ticks up on a notable slosh — the HUD flashes on the change
  salmonGone: false, // the salmon went overboard — this bowl is ruined, fetch another
  serial: 0, // bumps on each fresh (re)pickup — lets the bowl-cam reset cleanly
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
  if (!bowl.carrying || bowl.salmonGone) return
  let slosh = 0
  if (latAccel > BOWL.latThreshold) slosh += (latAccel - BOWL.latThreshold) * BOWL.latRate * dt
  slosh += sevGain * BOWL.crashRate
  if (slosh > 0) {
    bowl.integrity = Math.max(0, bowl.integrity - slosh)
    if (slosh > BOWL.pulseMin) bowl.sloshPulse++
    // trashed it — the salmon is gone and this bowl no longer counts
    if (bowl.integrity <= SALMON_OVERBOARD) bowl.salmonGone = true
  }
}

// (Re)acquire a pristine bowl at Corporate Slop Bowlz — first pickup or after an
// overboard. Bumps `serial` so the bowl-cam knows to start a clean bowl.
export function armBowl() {
  bowl.carrying = true
  bowl.integrity = 100
  bowl.salmonGone = false
  bowl.serial++
}

export function resetBowl() {
  bowl.carrying = false
  bowl.integrity = 100
  bowl.sloshPulse = 0
  bowl.salmonGone = false
  bowl.serial = 0
}
