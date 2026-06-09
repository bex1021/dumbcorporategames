// On-rails traffic + parked cars — the moving life of the city. Plain mutable
// module state (same convention as carState): a system component advances the
// moving cars each frame and writes their world transforms here; the renderer
// reads them for instancing, and the player <Car> reads them for collision.
//
// Deliberately simple (project lock: no physics engine, no real AI):
//   - moving cars cruise a road on rails at a steady speed and loop; same-lane
//     cars share a speed so they keep spacing and never pile up on their own.
//   - the player can ram them: they get knocked out of motion ("stalled") for a
//     beat, then resume — so traffic reacts without needing AI.
//   - parked cars are just cars with `parked: true`: they never move and always
//     act as solid obstacles.

import { ROADS, paintGaps, roadWidth, type Road } from './cityLayout'

export type TrafficCar = {
  parked: boolean
  // moving-car path (unused when parked)
  road: Road | null
  dir: 1 | -1
  t: number // 0..1 along the road
  speed: number // m/s
  off: number // signed lateral offset from centerline
  colorIdx: number
  stall: number // seconds left knocked-out after a ram (moving cars only)
  // live world transform (written by updateTraffic, read by renderer + collision)
  x: number
  z: number
  heading: number
}

export const TRAFFIC_COLORS = ['#b8bcc2', '#9aa0a6', '#cdb89a', '#7d8893', '#86918c', '#b7a39c', '#a9b0a0', '#cabf9f']

export const traffic: { cars: TrafficCar[] } = { cars: [] }

function roadLen(r: Road): number {
  return Math.hypot(r.b.x - r.a.x, r.b.z - r.a.z) || 1
}

// place a moving car's world transform from its road param + offset
function placeMoving(c: TrafficCar) {
  const r = c.road!
  const L = roadLen(r)
  const ux = (r.b.x - r.a.x) / L
  const uz = (r.b.z - r.a.z) / L
  const px = -uz // right of the a→b direction (right-hand traffic)
  const pz = ux
  c.x = r.a.x + (r.b.x - r.a.x) * c.t + px * c.off
  c.z = r.a.z + (r.b.z - r.a.z) * c.t + pz * c.off
  c.heading = Math.atan2(-c.dir * ux, -c.dir * uz) // car front is -Z at heading 0
}

export function initTraffic() {
  const cars: TrafficCar[] = []
  let ci = 0
  // moving traffic only on the long through-roads (skip short connectors)
  const throughRoads = ROADS.filter((r) => roadLen(r) > 200)
  throughRoads.forEach((r, ri) => {
    const W = roadWidth(r.type)
    const lane = W >= 18 ? 2.5 : 2.8 // sit in a travel lane, not on the lane line
    const L = roadLen(r)
    const perDir = Math.max(2, Math.round(L / 110))
    for (const dir of [1, -1] as const) {
      for (let i = 0; i < perDir; i++) {
        const c: TrafficCar = {
          parked: false,
          road: r,
          dir,
          t: ((i + (dir === 1 ? 0 : 0.5)) / perDir) % 1,
          speed: 9 + ((ri + i) % 3) * 1.6, // 9–12 m/s, a little variety
          off: dir === 1 ? lane : -lane,
          colorIdx: ci % TRAFFIC_COLORS.length,
          stall: 0,
          x: 0,
          z: 0,
          heading: 0,
        }
        placeMoving(c)
        cars.push(c)
        ci++
      }
    }
  })

  // parked cars along the downtown curbs (between the edge line and the
  // sidewalk), skipping the intersection boxes via the same gap logic as paint.
  const parkRoads = ROADS.filter((r) => {
    const midZ = (r.a.z + r.b.z) / 2
    return roadLen(r) > 120 && midZ > -125 && midZ < 130 // flat, central streets
  })
  parkRoads.forEach((r) => {
    const W = roadWidth(r.type)
    const curb = W / 2 - 1.3 // just inside the edge line
    const L = roadLen(r)
    const gaps = paintGaps(r, 8) // keep clear of intersections
    const ux = (r.b.x - r.a.x) / L
    const uz = (r.b.z - r.a.z) / L
    const px = uz
    const pz = -ux
    const step = 10
    for (let d = 14; d < L - 14; d += step) {
      const t = d / L
      if (gaps.some((g) => t > g[0] && t < g[1])) continue
      for (const side of [1, -1] as const) {
        // leave gaps so it isn't bumper-to-bumper
        if ((Math.round(d / step) + (side === 1 ? 0 : 1)) % 2 === 0) continue
        const cx = r.a.x + (r.b.x - r.a.x) * t + px * curb * side
        const cz = r.a.z + (r.b.z - r.a.z) * t + pz * curb * side
        // only park in the built-up core — not out toward the edges / countryside
        if (Math.abs(cx) > 235 || cz < -118 || cz > 228) continue
        cars.push({
          parked: true,
          road: null,
          dir: 1,
          t: 0,
          speed: 0,
          off: 0,
          colorIdx: ci % TRAFFIC_COLORS.length,
          stall: 0,
          x: cx,
          z: cz,
          heading: Math.atan2(-ux, -uz), // aligned with the curb
        })
        ci++
      }
    }
  })

  traffic.cars = cars
}

const FOLLOW_DIST = 15 // start slowing when the car ahead is within this many metres
const STOP_GAP = 6.5 // come to a full stop at this gap, so cars queue bumper-to-bumper-ish

export function updateTraffic(dt: number) {
  const cars = traffic.cars
  for (const c of cars) {
    if (c.parked) continue
    if (c.stall > 0) {
      c.stall = Math.max(0, c.stall - dt)
      continue
    }
    const L = roadLen(c.road!)
    // car-following: find the nearest car AHEAD in this same lane (same road +
    // direction; parked cars are on the curb, not the travel lane) and slow to
    // hold a gap — so traffic queues one-after-another instead of merging.
    let gap = Infinity
    for (const o of cars) {
      if (o === c || o.parked || o.road !== c.road || o.dir !== c.dir) continue
      let ahead = ((o.t - c.t) * c.dir) % 1
      ahead = (ahead + 1) % 1 // forward fractional distance to o, in [0,1)
      const d = ahead * L
      if (d > 0.01 && d < gap) gap = d
    }
    let v = c.speed
    if (gap < FOLLOW_DIST) v = c.speed * Math.max(0, (gap - STOP_GAP) / (FOLLOW_DIST - STOP_GAP))
    c.t += (c.dir * v * dt) / L
    c.t = ((c.t % 1) + 1) % 1
    placeMoving(c)
  }
}

const CAR_R = 2.0 // a traffic car's collision radius
// Push the player circle out of any car it overlaps. Moving cars get knocked
// ("stalled") on contact; parked cars are immovable walls. Returns the push so
// <Car> can scrub speed / register a crash like a building hit.
export function resolveTrafficCollision(px: number, pz: number, r: number) {
  let x = px
  let z = pz
  let hit = false
  let push = 0
  for (const c of traffic.cars) {
    if (!c.parked && c.stall > 0) continue // already knocked aside — drive through
    const dx = x - c.x
    const dz = z - c.z
    const rad = r + CAR_R
    const d2 = dx * dx + dz * dz
    if (d2 < rad * rad) {
      let d = Math.sqrt(d2)
      let ndx: number
      let ndz: number
      if (d < 1e-3) {
        ndx = 1 // exactly concentric — shove out along +x so we still separate
        ndz = 0
        d = 0
      } else {
        ndx = dx / d
        ndz = dz / d
      }
      const p = rad - d
      x += ndx * p
      z += ndz * p
      hit = true
      push = Math.max(push, p)
      if (!c.parked) c.stall = 1.6 // knock the moving car out of motion briefly
    }
  }
  return { x, z, hit, push }
}

export function resetTraffic() {
  initTraffic()
}

initTraffic()
