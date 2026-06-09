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
import { carPosition } from './carState'
import { honk } from './honk'

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
  honkCd: number // cooldown (s) before this car can honk again
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
          honkCd: 0,
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
          honkCd: 0,
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

const FOLLOW_DIST = 15 // start slowing when something is this close ahead (m)
const STOP_GAP = 6.5 // come to a full stop at this gap
const PATH_HALF = 3.0 // lateral half-width of the lane a car "watches" ahead of it
let globalHonkCd = 0 // throttle so honks don't pile into a wall of noise

export function updateTraffic(dt: number) {
  const cars = traffic.cars
  globalHonkCd = Math.max(0, globalHonkCd - dt)
  for (const c of cars) {
    if (c.parked) continue
    c.honkCd = Math.max(0, c.honkCd - dt)
    if (c.stall > 0) {
      c.stall = Math.max(0, c.stall - dt)
      continue
    }
    const L = roadLen(c.road!)
    const fx = -Math.sin(c.heading) // forward unit vector (front is -Z at heading 0)
    const fz = -Math.cos(c.heading)
    // SPATIAL awareness: slow to keep a gap behind ANYTHING ahead in my path —
    // the car in front, a car crossing the intersection, OR the player. This is
    // what stops cars merging through each other and makes them queue + yield.
    let gap = Infinity
    let playerBlocking = false
    for (const o of cars) {
      if (o === c) continue
      const fwd = (o.x - c.x) * fx + (o.z - c.z) * fz // distance ahead
      if (fwd <= 0.3 || fwd >= gap || fwd >= FOLLOW_DIST) continue
      const lat = Math.abs((o.x - c.x) * -fz + (o.z - c.z) * fx) // sideways offset
      if (lat < PATH_HALF) gap = fwd
    }
    // the player, treated the same way — and flagged so we can honk at them
    {
      const fwd = (carPosition.x - c.x) * fx + (carPosition.z - c.z) * fz
      if (fwd > 0.3 && fwd < gap && fwd < FOLLOW_DIST) {
        const lat = Math.abs((carPosition.x - c.x) * -fz + (carPosition.z - c.z) * fx)
        if (lat < PATH_HALF + 0.5) {
          gap = fwd
          playerBlocking = true
        }
      }
    }
    let v = c.speed
    if (gap < FOLLOW_DIST) v = c.speed * Math.max(0, (gap - STOP_GAP) / (FOLLOW_DIST - STOP_GAP))
    // held up by the player and basically stopped → honk (rate-limited)
    if (playerBlocking && v < 1.5 && c.honkCd <= 0 && globalHonkCd <= 0) {
      honk()
      c.honkCd = 3
      globalHonkCd = 0.8
    }
    c.t += (c.dir * v * dt) / L
    c.t = ((c.t % 1) + 1) % 1
    placeMoving(c)
  }
}

// Player-vs-car collision as an ORIENTED BOX (cars are long, not round), so a
// "hit" only registers on real contact — not when you're a car-width to the side.
// Moving cars get knocked ("stalled") on contact; parked cars are immovable walls.
const HALF_W = 1.0 // car half-width
const HALF_L = 2.1 // car half-length
export function resolveTrafficCollision(px: number, pz: number, r: number) {
  let x = px
  let z = pz
  let hit = false
  let push = 0
  for (const c of traffic.cars) {
    if (!c.parked && c.stall > 0) continue // already knocked aside — drive through
    const sh = Math.sin(c.heading)
    const ch = Math.cos(c.heading)
    // player position in the car's local frame (rotate world delta by -heading)
    const dx = x - c.x
    const dz = z - c.z
    const lx = dx * ch - dz * sh
    const lz = dx * sh + dz * ch
    const qx = Math.max(-HALF_W, Math.min(lx, HALF_W))
    const qz = Math.max(-HALF_L, Math.min(lz, HALF_L))
    const ex = lx - qx
    const ez = lz - qz
    const d2 = ex * ex + ez * ez
    if (d2 >= r * r) continue
    let nlx: number
    let nlz: number
    let pen: number
    if (d2 > 1e-6) {
      const d = Math.sqrt(d2)
      nlx = ex / d
      nlz = ez / d
      pen = r - d
    } else {
      // player center inside the box — push out the nearest face
      const pL = lx + HALF_W
      const pR = HALF_W - lx
      const pD = lz + HALF_L
      const pU = HALF_L - lz
      const m = Math.min(pL, pR, pD, pU)
      nlx = m === pL ? -1 : m === pR ? 1 : 0
      nlz = m === pD ? -1 : m === pU ? 1 : 0
      pen = m + r
    }
    // rotate the local push back to world (by +heading) and apply
    const plx = nlx * pen
    const plz = nlz * pen
    x += plx * ch + plz * sh
    z += -plx * sh + plz * ch
    hit = true
    push = Math.max(push, pen)
    if (!c.parked) c.stall = 1.6
  }
  return { x, z, hit, push }
}

export function resetTraffic() {
  initTraffic()
}

initTraffic()
