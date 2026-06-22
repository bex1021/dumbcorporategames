// Faceless pedestrians + the HR-incident consequence. The whole point of the
// "generic pedestrians" idea: you can't kill anyone (no blood, no ragdoll) — but
// clip one and it's logged as an HR incident that dings your final standing. So
// the reward is for the *clean* driver. Plain mutable module state.
//
// Peds shuffle back and forth along the sidewalks (offset outside each road).
// To hit one you have to mount the curb — driving badly — which is exactly the
// behavior we're discouraging.

import { ROADS, roadWidth, type Road } from './cityLayout'
import { carPosition } from './carState'
import { driveClock } from './clockState'

export const HR_TIME_PENALTY = 3 // in-game minutes lost each time you clip someone

export type Ped = {
  road: Road
  off: number // signed sidewalk offset from the road centerline
  t: number // 0..1 along the road
  dir: 1 | -1
  speed: number // m/s
  phase: number // walk-bob phase offset
  down: number // seconds left "down" after being clipped (then it gets back up)
  x: number
  z: number
}

export const peds: { list: Ped[] } = { list: [] }

// Driving record. `incidents` is the running count; `pulse` ticks on each new
// hit so the HUD can fire a toast without polling.
export const hr = { incidents: 0, pulse: 0 }

function roadLen(r: Road): number {
  return Math.hypot(r.b.x - r.a.x, r.b.z - r.a.z) || 1
}

function placePed(p: Ped) {
  const r = p.road
  const L = roadLen(r)
  const ux = (r.b.x - r.a.x) / L
  const uz = (r.b.z - r.a.z) / L
  const px = uz
  const pz = -ux
  p.x = r.a.x + (r.b.x - r.a.x) * p.t + px * p.off
  p.z = r.a.z + (r.b.z - r.a.z) * p.t + pz * p.off
}

export function initPeds() {
  const list: Ped[] = []
  const walkRoads = ROADS.filter((r) => roadLen(r) > 200)
  walkRoads.forEach((r) => {
    const sw = roadWidth(r.type) / 2 + 2 // sidewalk centerline
    const L = roadLen(r)
    const count = Math.max(2, Math.round(L / 120))
    for (const side of [1, -1] as const) {
      for (let i = 0; i < count; i++) {
        const p: Ped = {
          road: r,
          off: side * sw,
          t: (i + 0.25) / count,
          dir: i % 2 ? 1 : -1,
          speed: 1.0 + (i % 3) * 0.3,
          phase: i * 1.7,
          down: 0,
          x: 0,
          z: 0,
        }
        placePed(p)
        list.push(p)
      }
    }
  })
  peds.list = list
}

const HIT_R = 2.1 // player-center to ped distance that counts as a clip

export function updatePeds(dt: number) {
  for (const p of peds.list) {
    if (p.down > 0) {
      p.down = Math.max(0, p.down - dt)
      continue
    }
    p.t += (p.dir * p.speed * dt) / roadLen(p.road)
    if (p.t > 1) {
      p.t = 1
      p.dir = -1
    } else if (p.t < 0) {
      p.t = 0
      p.dir = 1
    }
    placePed(p)
  }
  // clip detection vs the player car
  const cx = carPosition.x
  const cz = carPosition.z
  for (const p of peds.list) {
    if (p.down > 0) continue
    const dx = p.x - cx
    const dz = p.z - cz
    if (dx * dx + dz * dz < HIT_R * HIT_R) {
      p.down = 4 // knocked down; gets back up after a few seconds
      hr.incidents++
      hr.pulse++
      driveClock.minutes += HR_TIME_PENALTY // "exchanging info" eats your clock
    }
  }
}

export function resetPeds() {
  hr.incidents = 0
  hr.pulse = 0
  initPeds()
}

initPeds()
