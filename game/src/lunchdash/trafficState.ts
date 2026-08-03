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

import { ROADS, paintGaps, roadWidth, SIGNALS, PARADE, DEST_POINTS, STOREFRONTS, resolveCarCollision, type Road } from './cityLayout'
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
  laneOff: number // the lane it BELONGS in — off eases back here after a shove
  colorIdx: number
  vtype: string // vehicle archetype key (see VEHICLE_SPECS)
  stall: number // seconds left knocked-out after a ram (moving cars only)
  honkCd: number // cooldown (s) before this car can honk again
  // U-turn at the end of the road (see updateTraffic) — seconds remaining, plus
  // the headings/lane offsets to sweep between while it happens
  turn: number
  turnFrom: number
  turnTo: number
  offFrom: number
  // KNOCKED FREE. A car that takes a real hit leaves its rail and moves as a
  // free body for a moment: shoved along the impact direction, spinning from
  // the off-centre load. `free` is seconds of free motion left; when it settles
  // the car either rejoins its lane or, if `wreck` reached 1, stays put as a
  // totalled hulk and becomes permanent scenery.
  vx: number
  vz: number
  spin: number
  free: number
  wreck: number // 0 = mint, >= 1 = totalled
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

// the heading a car WOULD have travelling `dir` along its road
function headingFor(c: TrafficCar, dir: 1 | -1): number {
  const r = c.road!
  const L = roadLen(r)
  return Math.atan2((-dir * (r.b.x - r.a.x)) / L, (-dir * (r.b.z - r.a.z)) / L)
}

// shortest signed angular distance a→b
function angDelta(a: number, b: number): number {
  let d = (b - a) % (Math.PI * 2)
  if (d > Math.PI) d -= Math.PI * 2
  if (d < -Math.PI) d += Math.PI * 2
  return d
}

// ── getting hit ─────────────────────────────────────────────────────────────
// Tunables for the knocked-free state. A car used to behave like a bollard: it
// stalled for a second and stayed exactly on its rail, so ramming one at 50 mph
// felt like hitting masonry. Now the impact transfers momentum — the struck car
// is shoved along your travel direction, spinning from the off-centre load, and
// carries real damage.
const KNOCK_TRANSFER = 0.62 // fraction of your speed handed to the car you hit
const KNOCK_DRAG = 1.25 // 1/s — how fast a shoved car scrubs off its speed
const SPIN_DRAG = 1.9
// m/s of transferred momentum that totals a car outright. Sized against the
// player's actual top speed: DRIVE.maxSpeed is 25 m/s and KNOCK_TRANSFER is
// 0.62, so the hardest possible dead-on hit delivers ~15.5. At 15 that means a
// flat-out square hit writes a car off (1.03), a 22 m/s hit leaves it wounded
// but driveable (0.91), and glancing blows accumulate over several hits. Set
// any higher and totalling becomes unreachable in one collision.
const WRECK_AT = 15
const FREE_MAX = 4.0 // seconds a car can stay off its rail
const PARK_BUDGE = 11 // m/s below which a PARKED car won't move at all

// Put a car back on its lane after it settles: recover `t` by projecting its
// world position onto the road, and set `off` from the actual lateral error so
// the existing lane-easing walks it back rather than snapping.
function rejoinRail(c: TrafficCar) {
  const r = c.road
  if (!r) return
  const dx = r.b.x - r.a.x
  const dz = r.b.z - r.a.z
  const L2 = dx * dx + dz * dz || 1
  const L = Math.sqrt(L2)
  c.t = Math.max(0, Math.min(1, ((c.x - r.a.x) * dx + (c.z - r.a.z) * dz) / L2))
  const onX = r.a.x + dx * c.t
  const onZ = r.a.z + dz * c.t
  const px = -dz / L
  const pz = dx / L
  c.off = (c.x - onX) * px + (c.z - onZ) * pz
  c.heading = headingFor(c, c.dir)
  c.vx = 0
  c.vz = 0
  c.spin = 0
  c.free = 0
}

// One frame of free-body motion for a knocked car. Returns true if it is still
// airborne-ish (i.e. the caller should skip the normal rail logic).
function stepKnocked(c: TrafficCar, dt: number): boolean {
  if (c.free <= 0) return false
  c.free = Math.max(0, c.free - dt)
  const spec = VSPEC[c.vtype] || VSPEC.sedan

  c.x += c.vx * dt
  c.z += c.vz * dt
  c.heading += c.spin * dt
  const k = Math.exp(-KNOCK_DRAG * dt)
  c.vx *= k
  c.vz *= k
  c.spin *= Math.exp(-SPIN_DRAG * dt)

  // a shoved car still can't go through buildings — it crumples against them
  const col = resolveCarCollision(c.x, c.z, spec.halfW)
  if (col.hit) {
    c.x = col.x
    c.z = col.z
    const sp = Math.hypot(c.vx, c.vz)
    c.wreck += sp / (WRECK_AT * 1.6) // hitting scenery hurts too
    c.vx *= -0.22
    c.vz *= -0.22
    c.spin *= 0.5
  }

  // CHAIN REACTION: barge anything we plough into, so a hard hit can start a
  // pile-up rather than passing through the car in front.
  const speed = Math.hypot(c.vx, c.vz)
  if (speed > 2.5) {
    for (const o of traffic.cars) {
      if (o === c) continue
      const d = Math.hypot(o.x - c.x, o.z - c.z)
      if (d > spec.halfL + (VSPEC[o.vtype] || VSPEC.sedan).halfL) continue
      if (o.parked && speed < PARK_BUDGE) continue
      const inv = 1 / (d || 1)
      const nx = (o.x - c.x) * inv
      const nz = (o.z - c.z) * inv
      const give = speed * 0.5
      o.vx += nx * give
      o.vz += nz * give
      o.spin += 0.4 * (nx * c.vz - nz * c.vx) * 0.05
      o.wreck += give / (WRECK_AT * 2)
      o.free = Math.max(o.free, 2.2)
      o.parked = false // even a parked car is loose once something hits it
      c.vx *= 0.55
      c.vz *= 0.55
      break
    }
  }

  if (c.free <= 0 || speed < 0.7) {
    if (c.wreck >= 1 || !c.road) {
      // totalled: it stops here for good and becomes part of the scenery
      c.parked = true
      c.free = 0
      c.vx = 0
      c.vz = 0
      c.spin = 0
    } else {
      rejoinRail(c)
      c.stall = Math.max(c.stall, 0.6) // a beat to gather itself before driving on
    }
  }
  return true
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
          laneOff: dir === 1 ? lane : -lane,
          colorIdx: Math.floor(h01(ci + 7) * spec.colors.length),
          vtype: spec.key,
          stall: 0,
          honkCd: 0,
          turn: 0,
          turnFrom: 0,
          turnTo: 0,
          offFrom: 0,
          vx: 0,
          vz: 0,
          spin: 0,
          free: 0,
          wreck: 0,
          x: 0,
          z: 0,
          heading: 0,
        }
        placeMoving(c)
        // don't spawn a moving car inside the closed parade segment — it'd be
        // trapped among the floats. Cars approaching it queue (see updateTraffic).
        if (r.a.x === r.b.x && Math.abs(r.a.x - PARADE.x) < 1.5 && c.z > PARADE.z0 - 24 && c.z < PARADE.z1 + 40) continue
        // same for the E–W cross-streets: don't spawn one standing in the crowd.
        if (r.a.z === r.b.z && r.a.z > PARADE.z0 - 2 && r.a.z < PARADE.z1 + 2 && c.x > -78 && c.x < -10) continue
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
          laneOff: 0,
          colorIdx: Math.floor(h01(ci + 19) * pspec.colors.length),
          vtype: pspec.key,
          stall: 0,
          honkCd: 0,
          turn: 0,
          turnFrom: 0,
          turnTo: 0,
          offFrom: 0,
          vx: 0,
          vz: 0,
          spin: 0,
          free: 0,
          wreck: 0,
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
// How long a car takes to swing around at the end of its road (seconds).
const TURN_TIME = 1.7
const STOP_GAP = 6.5 // come to a full stop at this gap
const PATH_HALF = 3.0 // lateral half-width of the lane a car "watches" ahead of it
let globalHonkCd = 0 // throttle so honks don't pile into a wall of noise

export function updateTraffic(dt: number) {
  const cars = traffic.cars
  globalHonkCd = Math.max(0, globalHonkCd - dt)
  tickSignals(dt)
  // knocked-free cars move before anything else, and can be shoved even while
  // "parked" (a parked car that gets hit comes loose)
  for (const c of cars) {
    if (c.free > 0) stepKnocked(c, dt)
  }
  for (const c of cars) {
    if (c.parked || c.free > 0) continue
    c.honkCd = Math.max(0, c.honkCd - dt)
    if (c.stall > 0) {
      c.stall = Math.max(0, c.stall - dt)
      // keep placing it while knocked out — a ram's shove must be VISIBLE as it
      // happens, not banked up and released as a teleport when the stall ends
      placeMoving(c)
      continue
    }
    // Mid-U-turn at the end of the road: hold station, sweep the nose around and
    // slide across into the opposite lane. placeMoving derives heading from
    // `dir` (already flipped), so the eased heading is applied after it.
    if (c.turn > 0) {
      c.turn = Math.max(0, c.turn - dt)
      const p = 1 - c.turn / TURN_TIME
      const s = p * p * (3 - 2 * p)
      c.off = c.offFrom + (c.laneOff - c.offFrom) * s
      placeMoving(c)
      c.heading = c.turnFrom + angDelta(c.turnFrom, c.turnTo) * s
      continue
    }
    // ease back into the proper lane after a shove (placeMoving reads `off`)
    if (c.off !== c.laneOff) {
      c.off += (c.laneOff - c.off) * (1 - Math.exp(-0.9 * dt))
      if (Math.abs(c.off - c.laneOff) < 0.02) c.off = c.laneOff
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
      // buf 5 stopped cars right at the barricade — 20 m INSIDE the southern
      // carrier truck's ramp (crest z = 52, footprint 44→60), so traffic queued
      // up and over the kicker. 38 m clears BOTH ramps (closure now spans
      // z -83 → 63). The queue that forms south of that sits in the northbound
      // lane only; the opposite lane is empty all the way through the closure,
      // so there is still a clean line at the ramp for anyone committing to it.
      const buf = 38
      if (c.z > PARADE.z0 - buf && c.z < PARADE.z1 + buf) {
        gap = 0 // somehow inside the closure — hold position
      } else {
        const stopZ = fz < 0 ? PARADE.z1 + buf : PARADE.z0 - buf
        const d = (stopZ - c.z) * fz // distance ahead to the near barricade line
        if (d > 0.2 && d < gap) gap = d
      }
    }
    // …and the CROSS-STREETS are closed too. The block above only ever stopped
    // N–S cars driving ALONG Synergy Ave, so traffic on the E–W arterial that
    // cuts through at z = -22 had no idea the parade existed and drove straight
    // through the spectators — the "cars driving through the crowd" bug. The
    // crowd is not in the solids list (they're people, not walls), so nothing
    // else was stopping them.
    //
    // Same treatment, other axis: queue at the edge of the crowd corridor.
    // Bounds cover the spectator rows (x -56.3 and -29.7) plus a margin, and we
    // only apply it on cross-streets that actually run through the parade's z
    // span, so traffic elsewhere in the city is untouched.
    if (!carNS && c.road!.a.z > PARADE.z0 - 2 && c.road!.a.z < PARADE.z1 + 2) {
      // Bounds cover the RAMPS as well as the crowd (west ramp spans x -72→-56,
      // east -32→-16). Stopping only at the crowd edge left cars parked on the
      // ramps themselves — both an obstacle in the middle of the run-up and a
      // car sitting at a 20° angle. Closed road means closed: queue before the
      // roadworks start, leaving the approach clear for a committed run.
      const CROWD_X0 = -78
      const CROWD_X1 = -10
      if (c.x > CROWD_X0 && c.x < CROWD_X1) {
        gap = 0 // already inside the corridor — hold rather than plough on
      } else {
        const stopX = fx < 0 ? CROWD_X1 : CROWD_X0
        const d = (stopX - c.x) * fx // distance ahead to the near crowd edge
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
    // End of the road: the car makes a U-TURN and drives back the other way in
    // the opposite lane.
    //
    // It used to teleport to the far end instead, hidden behind a "is the seam
    // far away and behind the camera" test. That could never be reliable — you
    // swing the camera constantly while driving, so a car 250 m out (where fog
    // hides almost nothing) would wrap the instant you glanced away and be gone
    // when you looked back. Turning around is diegetic, needs no camera
    // bookkeeping at all, and makes a car vanishing structurally impossible.
    const tNext = c.t + (c.dir * v * dt) / L
    if (tNext > 1 || tNext < 0) {
      c.t = tNext > 1 ? 1 : 0
      c.turn = TURN_TIME
      c.turnFrom = c.heading
      c.offFrom = c.off
      c.dir = c.dir === 1 ? -1 : 1
      c.turnTo = headingFor(c, c.dir)
      c.laneOff = -c.laneOff // the opposite lane is now "its" lane
    } else {
      c.t = tNext
    }
    placeMoving(c)
  }
}

// Player-vs-car collision as an ORIENTED BOX (cars are long, not round), so a
// "hit" only registers on real contact — not when you're a car-width to the side.
// Moving cars get knocked ("stalled") on contact; parked cars are immovable walls.
export function resolveTrafficCollision(px: number, pz: number, r: number, pvx = 0, pvz = 0) {
  let x = px
  let z = pz
  let hit = false
  let push = 0
  const pSpeed = Math.hypot(pvx, pvz)
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
    // MOMENTUM TRANSFER. How hard the hit was, and how squarely it landed:
    // glancing contact barely moves the car, a square hit sends it.
    const movable = !c.parked || pSpeed > PARK_BUDGE
    if (pSpeed > 3.5 && movable) {
      const inv = 1 / pSpeed
      const dirX = pvx * inv
      const dirZ = pvz * inv
      const toX = c.x - px
      const toZ = c.z - pz
      const tl = Math.hypot(toX, toZ) || 1
      const square = Math.max(0, (dirX * toX + dirZ * toZ) / tl) // 1 = dead-on
      if (square > 0.15) {
        const give = pSpeed * KNOCK_TRANSFER * square
        c.vx += dirX * give
        c.vz += dirZ * give
        // an off-centre hit spins it — lx is the contact's lateral offset in
        // the car's own frame, so clipping a corner twirls it realistically
        c.spin += -(lx / HALF_W) * give * 0.055
        c.wreck += give / WRECK_AT
        c.free = Math.min(FREE_MAX, Math.max(c.free, 1.2 + give * 0.12))
        c.parked = false // knocked loose, whatever it was doing before
        c.stall = 0
      }
    }
    if (!c.parked) c.stall = Math.max(c.stall, 0.5)
  }
  return { x, z, hit, push }
}

export function resetTraffic() {
  initTraffic()
}

initTraffic()
