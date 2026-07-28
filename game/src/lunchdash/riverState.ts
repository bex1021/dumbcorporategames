// The river dunk — what happens when you drive into the water.
//
// The river used to be an invisible wall: resolveCarCollision shoved the car
// back onto the bank, so the water read as painted ground you bounced off. Now
// it's a real hazard with a real consequence, in the same deadpan register as
// the HR incident: you sink, the city fishes you out, and the paperwork eats
// minutes you do not have. Plain mutable module state (same convention as
// carState / crashState / pedState) — the Car drives the sequence each frame,
// the HUD reads it for the murk overlay and the toast.
//
// Sequence: dry → sinking (you're in, control is gone) → recovering (towed to
// the nearest dry roadway, screen clearing) → dry.

import { carPosition, carFacing, carTelemetry, carAir } from './carState'
import { nearestRoadPoint, resolveCarCollision } from './cityLayout'
import { terrainHeight } from './terrain'
import { driveClock } from './clockState'
import { crash } from './crashState'
import { bowl } from './bowlState'
import { DRIVE, RIVER } from './driveConfig'
import { splash } from './driveAudio'

export type RiverPhase = 'dry' | 'sinking' | 'recovering'

export const river = {
  phase: 'dry' as RiverPhase,
  t: 0, // seconds elapsed in the current phase
  dunks: 0, // how many times this run — a Retrospective receipt
  pulse: 0, // ticks on each new dunk so the HUD can fire its toast
  submersion: 0, // 0..1 how far the body is under — drives the car's sink
  murk: 0, // 0..1 screen overlay; also covers the tow-out teleport
}

// True while the river owns the car: player input is ignored and the drive loop
// runs the sink instead of the throttle.
export function riverHasControl(): boolean {
  return river.phase !== 'dry'
}

// Went in. Called by the Car the frame the hull crosses the waterline.
export function beginDunk() {
  if (river.phase !== 'dry') return
  river.phase = 'sinking'
  river.t = 0
  river.dunks++
  river.pulse++
  splash()
  crash.shake = Math.max(crash.shake, 0.7)
  // If the exec's bowl was aboard it is now at the bottom of the river. This
  // routes into the EXISTING salmon-overboard flow, so ObjectiveDetector sends
  // you back to Corporate Slop Bowlz for a fresh one — same recovery path as
  // sloshing it to nothing, no new failure mode to learn.
  if (bowl.carrying && !bowl.salmonGone) {
    bowl.integrity = 0
    bowl.salmonGone = true
    bowl.sloshPulse++
  }
}

// Hauled out and dropped on the nearest stretch of dry roadway, facing whichever
// way along the lane is closest to how you went in. Mirrors the full carAir
// reset the dev teleport does — in particular prevGh must be the DESTINATION's
// ground height, or the next frame reads a huge climb rate and fires a phantom
// launch.
function towOut() {
  const spot = nearestRoadPoint(carPosition.x, carPosition.z)
  const fwdX = -Math.sin(carFacing.y)
  const fwdZ = -Math.cos(carFacing.y)
  const keep = fwdX * spot.dirX + fwdZ * spot.dirZ >= 0
  const dx = keep ? spot.dirX : -spot.dirX
  const dz = keep ? spot.dirZ : -spot.dirZ

  const safe = resolveCarCollision(spot.x, spot.z, DRIVE.carRadius)
  const gy = terrainHeight(safe.x, safe.z)
  carPosition.set(safe.x, 0, safe.z)
  carFacing.y = Math.atan2(-dx, -dz)
  carTelemetry.speed = 0
  carAir.y = gy
  carAir.vy = 0
  carAir.airborne = false
  carAir.prevGh = gy
  carAir.climb = 0

  driveClock.minutes += RIVER.timePenalty
}

export function updateRiver(dt: number) {
  if (river.phase === 'dry') return
  river.t += dt

  if (river.phase === 'sinking') {
    // Water kills the car's momentum fast, but it keeps drifting in for a beat
    // — the Car still integrates position, just with no throttle behind it.
    carTelemetry.speed *= Math.exp(-RIVER.drag * dt)
    const p = Math.min(1, river.t / RIVER.sinkSeconds)
    // Ease the sink in (p²) so the car noses under slowly and stays readable
    // while the murk — which closes much faster — takes the screen. Without the
    // easing the body drops out of frame while the view is still clear, which
    // reads as the car vanishing rather than sinking.
    river.submersion = p * p
    river.murk = Math.min(1, p / 0.7)
    if (river.t >= RIVER.sinkSeconds) {
      towOut()
      river.phase = 'recovering'
      river.t = 0
      river.submersion = 0 // back on dry land; only the screen is still clearing
      river.murk = 1
    }
    return
  }

  // recovering — hold the murk long enough to hide the camera swinging to the
  // new position, then clear it and hand control back.
  carTelemetry.speed = 0
  const p = Math.min(1, river.t / RIVER.recoverSeconds)
  river.murk = p < 0.35 ? 1 : 1 - (p - 0.35) / 0.65
  if (river.t >= RIVER.recoverSeconds) {
    river.phase = 'dry'
    river.murk = 0
    river.submersion = 0
  }
}

export function resetRiver() {
  river.phase = 'dry'
  river.t = 0
  river.dunks = 0
  river.pulse = 0
  river.submersion = 0
  river.murk = 0
}
