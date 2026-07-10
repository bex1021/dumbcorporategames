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

import { ROADS, paintGaps, roadWidth, SIGNALS, PARADE, DEST_POINTS, STOREFRONTS, type Road } from './cityLayout'
import { carPosition } from './carState'
import { honk } from './honk'
import { tickSignals, signalState } from './signalState'

export type TrafficCar = {
  parked: boolean
  // moving-car path (unused when parked)
  road: Road | null
  dir: 1 | -1
  t: number // 0..1 along the road
  speed: number // m/s
  off: number // signed lateral offset from centerline
  colorIdx: number
  vtype: string // vehicle archetype key (see VEHICLE_SPECS)
  stall: number // seconds left knocked-out after a ram (moving cars only)
  honkCd: number // cooldown (s) before this car can honk again
  // live world transform (written by updateTraffic, read by renderer + collision)
  x: number
  z: number
  heading: number
}

// ── vehicle archetypes ──────────────────────────────────────────────────────
// A diverse, colourful fleet: sedans + SUVs + a few taxis, pickups, delivery
// vans, sports cars, and city buses. Each carries its own silhouette (body +
// cabin/window band + wheel size), collision box, speed multiplier, and colour
// palette. The renderer (Traffic.tsx) draws one instanced set per type; the
// collision resolver reads the per-type half-extents. `weight` sets how common
// each type is; picks are deterministic (index hash) so replays stay stable.
export type VehicleSpec = {
  key: string
  weight: number
  colors: string[]
  cabinColor: string
  body: [number, number, number]
  cabin: [number, number, number]
  cabinZ: number
  cabinMode: 'roof' | 'band'
  wheelR: number
  axle: number // half wheelbase (front/rear wheel z-offset)
  track: number // half track (left/right wheel x-offset)
  halfW: number // collision half-width
  halfL: number // collision half-length
  speedMul: number
}

export const VEHICLE_SPECS: VehicleSpec[] = [
  {
    key: 'sedan', weight: 7, cabinColor: '#23262c', cabinMode: 'roof',
    body: [1.9, 0.6, 4.2], cabin: [1.5, 0.55, 2.0], cabinZ: 0.12,
    wheelR: 0.42, axle: 1.5, track: 0.92, halfW: 1.0, halfL: 2.1, speedMul: 1.0,
    colors: ['#c1543f', '#3f6fae', '#4a8f6f', '#d8b34a', '#8f8f96', '#c8ccd0', '#5a5f66', '#7a4f8a', '#b8bcc2', '#2f3439'],
  },
  {
    key: 'suv', weight: 4, cabinColor: '#20242a', cabinMode: 'roof',
    body: [2.02, 0.95, 4.6], cabin: [1.78, 0.72, 2.7], cabinZ: 0.05,
    wheelR: 0.5, axle: 1.6, track: 1.0, halfW: 1.06, halfL: 2.35, speedMul: 0.96,
    colors: ['#2f3439', '#c8ccd0', '#3f6fae', '#7a3f3f', '#46583f', '#8f8f96', '#5a4230'],
  },
  {
    key: 'taxi', weight: 2, cabinColor: '#1c1c1c', cabinMode: 'roof',
    body: [1.9, 0.62, 4.2], cabin: [1.5, 0.55, 2.0], cabinZ: 0.12,
    wheelR: 0.42, axle: 1.5, track: 0.92, halfW: 1.0, halfL: 2.1, speedMul: 1.0,
    colors: ['#f2b60c', '#f0a800'],
  },
  {
    key: 'pickup', weight: 2, cabinColor: '#23262c', cabinMode: 'roof',
    body: [1.95, 0.7, 4.9], cabin: [1.68, 0.66, 1.9], cabinZ: -0.95,
    wheelR: 0.48, axle: 1.62, track: 0.95, halfW: 1.06, halfL: 2.45, speedMul: 0.98,
    colors: ['#b8402f', '#2f4a6f', '#3a4034', '#8f8f96', '#c8ccd0', '#5a4a2f', '#101316'],
  },
  {
    key: 'van', weight: 2, cabinColor: '#2a2e34', cabinMode: 'band',
    body: [2.08, 1.5, 5.2], cabin: [2.02, 0.5, 1.1], cabinZ: -2.0,
    wheelR: 0.46, axle: 1.7, track: 0.98, halfW: 1.08, halfL: 2.6, speedMul: 0.94,
    colors: ['#e8e8ea', '#c1543f', '#3f6fae', '#4a8f6f', '#d8b34a', '#d9d2c4'],
  },
  {
    key: 'sports', weight: 1, cabinColor: '#111417', cabinMode: 'roof',
    body: [1.96, 0.5, 4.1], cabin: [1.4, 0.4, 1.5], cabinZ: 0.2,
    wheelR: 0.44, axle: 1.5, track: 1.0, halfW: 1.0, halfL: 2.05, speedMul: 1.28,
    colors: ['#d81e2f', '#f2b90c', '#111417', '#e8e8ea', '#c0c4c8', '#2f6f9f'],
  },
  {
    key: 'bus', weight: 1, cabinColor: '#9fd0e6', cabinMode: 'band',
    body: [2.5, 1.95, 9.6], cabin: [2.54, 0.72, 8.6], cabinZ: 0.2,
    wheelR: 0.56, axle: 3.2, track: 1.15, halfW: 1.35, halfL: 4.8, speedMul: 0.82,
    colors: ['#2f6f9f', '#3f8f5f', '#b8402f', '#5a5f9f', '#c9a227'],
  },
]

export const VSPEC: Record<string, VehicleSpec> = Object.fromEntries(VEHICLE_SPECS.map((s) => [s.key, s]))

// deterministic 0..1 hash of an integer (no RNG → stable across replays)
function h01(n: number): number {
  const x = Math.sin(n * 91.73 + 13.11) * 43758.5453
  return x - Math.floor(x)
}
const _WEIGHT_TOTAL = VEHICLE_SPECS.reduce((a, s) => a + s.weight, 0)
function pickVehicle(n: number): VehicleSpec {
  let h = h01(n) * _WEIGHT_TOTAL
  for (const s of VEHICLE_SPECS) {
    if (h < s.weight) return s
    h -= s.weight
  }
  return VEHICLE_SPECS[0]
}

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
        const spec = pickVehicle(ci)
        const c: TrafficCar = {
          parked: false,
          road: r,
          dir,
          t: ((i + (dir === 1 ? 0 : 0.5)) / perDir) % 1,
          speed: (9 + ((ri + i) % 3) * 1.6) * spec.speedMul, // 9–12 m/s × type
          off: dir === 1 ? lane : -lane,
          colorIdx: Math.floor(h01(ci + 7) * spec.colors.length),
          vtype: spec.key,
          stall: 0,
          honkCd: 0,
          x: 0,
          z: 0,
          heading: 0,
        }
        placeMoving(c)
        // don't spawn a moving car inside the closed parade segment — it'd be
        // trapped among the floats. Cars approaching it queue (see updateTraffic).
        if (r.a.x === r.b.x && Math.abs(r.a.x - PARADE.x) < 1.5 && c.z > PARADE.z0 - 6 && c.z < PARADE.z1 + 6) continue
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
        // keep the objective frontages clear: no cars parked on the Alignly HQ
        // drop-off or in the drive-thru pull-ins (that read as blocking the door)
        if (Math.hypot(cx - DEST_POINTS.office.x, cz - DEST_POINTS.office.z) < 20) continue
        if (STOREFRONTS.some((s) => Math.hypot(cx - s.zx, cz - s.zz) < 13)) continue
        const pk = pickVehicle(ci * 3 + 1)
        const pspec = pk.key === 'bus' ? VSPEC.sedan : pk // buses don't street-park
        cars.push({
          parked: true,
          road: null,
          dir: 1,
          t: 0,
          speed: 0,
          off: 0,
          colorIdx: Math.floor(h01(ci + 19) * pspec.colors.length),
          vtype: pspec.key,
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
  tickSignals(dt)
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
    const carNS = c.road!.a.x === c.road!.b.x // travelling N–S vs E–W
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
    // stop at a RED (or yellow) light on our approach — treat the stop line as a
    // blocker. When our axis is green there's no blocker and we roll through.
    if (signalState(carNS ? 'ns' : 'ew') !== 'green') {
      for (const s of SIGNALS) {
        const fwdSig = (s.x - c.x) * fx + (s.z - c.z) * fz
        if (fwdSig <= 0.3) continue // signal is behind us / we're already in it
        const latSig = Math.abs((s.x - c.x) * -fz + (s.z - c.z) * fx)
        if (latSig > 3) continue // not the signal on our road
        const crossHalf = (carNS ? (s.z === -22 || s.z === 215 ? 18 : 12) : 18) / 2
        const stopDist = fwdSig - crossHalf - 3.5 // pull up at the stop bar, not in the box
        if (stopDist > 0.2 && stopDist < gap) gap = stopDist
      }
    }
    // the parade CLOSES this stretch of Synergy Ave — cars queue at the
    // barricade instead of driving through it. The player is walled out by the
    // solid PARADE_BARRIERS, so the traffic has to respect the closure too
    // (otherwise cars sail through a "closed" road the player can't).
    if (carNS && Math.abs(c.road!.a.x - PARADE.x) < 1.5) {
      const buf = 5
      if (c.z > PARADE.z0 - buf && c.z < PARADE.z1 + buf) {
        gap = 0 // somehow inside the closure — hold position
      } else {
        const stopZ = fz < 0 ? PARADE.z1 + buf : PARADE.z0 - buf
        const d = (stopZ - c.z) * fz // distance ahead to the near barricade line
        if (d > 0.2 && d < gap) gap = d
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
export function resolveTrafficCollision(px: number, pz: number, r: number) {
  let x = px
  let z = pz
  let hit = false
  let push = 0
  for (const c of traffic.cars) {
    // NOTE: rammed cars stay SOLID (no drive-through). They're paused via `stall`
    // in updateTraffic and shoved aside below, but they never go non-collidable.
    // Per-type collision box — a bus is a much bigger wall than a sports car.
    const spec = VSPEC[c.vtype] || VSPEC.sedan
    const HALF_W = spec.halfW
    const HALF_L = spec.halfL
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
    // moving car: pause briefly (a "shaken driver" beat) but stay solid, and
    // nudge it toward the curb so a bump visibly knocks it aside when it resumes
    if (!c.parked) {
      c.stall = Math.max(c.stall, 1.0)
      const laneSign = c.off >= 0 ? 1 : -1
      c.off = laneSign * Math.min(Math.abs(c.off) + 0.6, Math.abs(c.off) + 1.2)
    }
  }
  return { x, z, hit, push }
}

export function resetTraffic() {
  initTraffic()
}

initTraffic()
