// Shared city layout for Lunch Dash — a research-informed mash-up where each
// district evokes a real place (NYC / SF / Boston / Austin / LA), with office
// parks + landmarks filling the gaps so there are no dead voids. One source of
// truth for DriveWorld, Car, and Minimap.
//
// Recognizable zones (the goal: "this part feels like SF... that's LA"):
//   - Manhattan core + Central Park (NYC): super-tall tight towers, big green
//   - Brownstones NW (NYC/Brooklyn): uniform brown low-rise rows
//   - Chinatown + painted-lady rowhouses (SF): dense warm + pastel rows, marina
//   - Historic brick + a Common (Boston): crooked brick blocks, small green
//   - Riverfront + tech campus + capitol (Austin): low/green sprawl
//   - Strip-mall sprawl + palms + freeway + mini-downtown (LA): big lots
//   - Office parks (gap-filler) + landmarks (stadium, mall, golf, capitol, cemetery)
//
// STREET RULE: every district leaves >=10 m gaps (two-way streets, no one-ways).
// Everything is axis-aligned boxes so collision stays cheap AABB.

export type Building = { x: number; z: number; w: number; d: number; h: number; color: string }
export type Rect = { minX: number; maxX: number; minZ: number; maxZ: number }
export type Tree = { x: number; z: number; h: number }
export type RoadStrip = { x: number; z: number; len: number; width: number; rotY: number }
export type Landmark =
  | { kind: 'stadium'; x: number; z: number; r: number; label: string }
  | { kind: 'mall'; x: number; z: number; w: number; d: number; label: string }
  | { kind: 'golf'; x: number; z: number; w: number; d: number; label: string }
  | { kind: 'capitol'; x: number; z: number; label: string }
  | { kind: 'cemetery'; x: number; z: number; w: number; d: number; label: string }

export const WORLD_HALF = 300
export const SPAWN = { x: 24, z: 100 }

export const DEST_POINTS = {
  bowlz: { x: -22, z: -10 }, // Manhattan core
  lunch: { x: 40, z: 215 }, // across the river (Austin side)
  office: { x: 0, z: 90 }, // Alignly HQ
} as const

export const HQ_BUILDING: Building = { x: DEST_POINTS.office.x, z: DEST_POINTS.office.z, w: 16, d: 16, h: 46, color: '#3b4a66' }

function h2(i: number, j: number): number {
  const n = Math.sin(i * 127.1 + j * 311.7) * 43758.5453
  return n - Math.floor(n)
}
function pick<T>(arr: readonly T[], r: number): T {
  return arr[Math.floor(r * arr.length) % arr.length]
}
function inRect(x: number, z: number, r: Rect, pad = 0): boolean {
  return x >= r.minX - pad && x <= r.maxX + pad && z >= r.minZ - pad && z <= r.maxZ + pad
}
function rect(x: number, z: number, w: number, d: number): Rect {
  return { minX: x - w / 2, maxX: x + w / 2, minZ: z - d / 2, maxZ: z + d / 2 }
}

// ---------- water, bridges, approaches ----------
const RIVER: Rect = { minX: -WORLD_HALF, maxX: WORLD_HALF, minZ: 120, maxZ: 176 }
const POND: Rect = { minX: -206, maxX: -150, minZ: 14, maxZ: 56 }
export const WATER: Rect[] = [RIVER, POND]
export const BRIDGES: Rect[] = [
  { minX: -58, maxX: -28, minZ: 112, maxZ: 184 },
  { minX: 96, maxX: 126, minZ: 112, maxZ: 184 },
]
const APPROACHES: Rect[] = BRIDGES.flatMap((b) => [
  { minX: b.minX - 4, maxX: b.maxX + 4, minZ: 86, maxZ: 120 },
  { minX: b.minX - 4, maxX: b.maxX + 4, minZ: 176, maxZ: 210 },
])

// Solid railings down each side of the bridge roadway — keeps you on the deck.
export const BRIDGE_RAILS: Rect[] = BRIDGES.flatMap((b) => {
  const cx = (b.minX + b.maxX) / 2
  const h = 9.6 // just outside the 18 m roadway
  return [
    { minX: cx - h - 0.4, maxX: cx - h + 0.4, minZ: 118, maxZ: 178 },
    { minX: cx + h - 0.4, maxX: cx + h + 0.4, minZ: 118, maxZ: 178 },
  ]
})

// Major signalized intersections (arterial × arterial / riverbank).
export const SIGNALS: { x: number; z: number }[] = [
  { x: -43, z: -22 },
  { x: 111, z: -22 },
  { x: -43, z: 215 },
  { x: 111, z: 215 },
  { x: -43, z: 108 },
  { x: 111, z: 108 },
  { x: -43, z: 186 },
  { x: 111, z: 186 },
]

// ---------- parks / greens ----------
const CENTRAL_PARK: Rect = { minX: -256, maxX: -120, minZ: -30, maxZ: 100 }
const BOSTON_COMMON: Rect = { minX: 196, maxX: 244, minZ: -28, maxZ: 14 }
export const PARKS: Rect[] = [CENTRAL_PARK, BOSTON_COMMON]

// ---------- diagonal avenues ----------
// Diagonal avenues — each end SNAPS to a real junction now (the old NE avenue
// literally dead-ended into the river).
const AVE_SEGMENTS = [
  { a: { x: 40, z: -22 }, b: { x: 168, z: 108 } }, // Alignment Blvd ↔ Riverbank Rd
  { a: { x: -150, z: -22 }, b: { x: -43, z: 108 } }, // Backlog Ln ↔ Riverbank Rd (clips the park corner — parks have transverse roads)
]
export const AVENUE_LINES = AVE_SEGMENTS
export const AVENUES: RoadStrip[] = AVE_SEGMENTS.map(({ a, b }) => {
  const dx = b.x - a.x
  const dz = b.z - a.z
  return { x: (a.x + b.x) / 2, z: (a.z + b.z) / 2, len: Math.hypot(dx, dz), width: 12, rotY: Math.atan2(dx, dz) }
})
function distToAvenues(px: number, pz: number): number {
  let best = Infinity
  for (const { a, b } of AVE_SEGMENTS) {
    const dx = b.x - a.x
    const dz = b.z - a.z
    const len2 = dx * dx + dz * dz
    let t = ((px - a.x) * dx + (pz - a.z) * dz) / len2
    t = Math.max(0, Math.min(1, t))
    best = Math.min(best, Math.hypot(px - (a.x + t * dx), pz - (a.z + t * dz)))
  }
  return best
}

export const TUNNEL: Rect = { minX: -100, maxX: -76, minZ: 4, maxZ: 38 }

// LA freeway overpass (elevated road box)
export const OVERPASS = { minX: 70, maxX: 226, z: 234, width: 12, y: 11 }

// ---------- landmarks ----------
export const LANDMARKS: Landmark[] = [
  { kind: 'stadium', x: 250, z: 285, r: 30, label: 'Alignly Field' },
  { kind: 'mall', x: 150, z: 250, w: 46, d: 34, label: 'ShipMart Mall' },
  { kind: 'golf', x: -250, z: 235, w: 90, d: 80, label: 'Synergy Links' },
  { kind: 'capitol', x: -120, z: 250, label: 'The Capitol' },
  { kind: 'cemetery', x: 268, z: -120, w: 70, d: 80, label: 'Deprecated Memorial' },
]
const LANDMARK_SOLIDS: Rect[] = [
  rect(250, 285, 60, 60), // stadium footprint
  rect(150, 250, 46, 34), // mall
  rect(-120, 250, 22, 22), // capitol
]
const LANDMARK_CLEAR: Rect[] = [
  rect(250, 285, 80, 80),
  rect(150, 250, 90, 70), // mall + its lot
  rect(-250, 235, 110, 100), // golf
  rect(-120, 250, 40, 40),
  rect(268, -120, 80, 90), // cemetery
]

// Green areas painted into the TERRAIN (vertex colors), not floating flat
// planes — so the car always sits on them correctly, even over hills.
export const GREEN_AREAS: Rect[] = [
  ...PARKS,
  ...LANDMARKS.flatMap((l) => (l.kind === 'golf' || l.kind === 'cemetery' ? [rect(l.x, l.z, l.w, l.d)] : [])),
]

// ---------- road network (research-informed: arterials + collectors) ----------
// Yellow center = opposing traffic; white = same direction. Arterials are the
// wide double-yellow spines that each cross the river on a bridge; collectors
// (single yellow) parallel them and feed the bridges; the leftover building
// gaps are the unmarked local streets.
export type Road = { a: { x: number; z: number }; b: { x: number; z: number }; type: 'arterial' | 'collector'; name?: string }
export function roadWidth(type: Road['type']): number {
  return type === 'arterial' ? 18 : 12
}
// Every road ends ONLY at the map edge or where it meets another road — never
// dead-ending mid-map. Arterials span full edge-to-edge; collectors each run
// BETWEEN two other roads.
// Every road is NAMED (the minimap labels the majors — and the radio /
// HR receipts can name-check streets later: "the incident on Sepulveda").
export const ROADS: Road[] = [
  // N–S arterials — full height: up over the hills and across the bridges
  { a: { x: -43, z: -295 }, b: { x: -43, z: 295 }, type: 'arterial', name: 'Synergy Ave' }, // Bridge A
  { a: { x: 111, z: -295 }, b: { x: 111, z: 295 }, type: 'arterial', name: 'Deliverable Dr' }, // Bridge B
  // E–W arterials
  { a: { x: -295, z: -22 }, b: { x: 295, z: -22 }, type: 'arterial', name: 'Alignment Blvd' },
  // south arterial ends at Fairway Ct (the golf course owns the SW corner — no
  // third bridge over the river, so the south loop closes via the Fairway link)
  { a: { x: -188, z: 215 }, b: { x: 295, z: 215 }, type: 'arterial', name: 'Sepulveda Blvd' },
  // riverbank collectors
  { a: { x: -295, z: 108 }, b: { x: 295, z: 108 }, type: 'collector', name: 'Riverbank Rd' },
  { a: { x: -188, z: 186 }, b: { x: 295, z: 186 }, type: 'collector', name: 'Esplanade' },
  // connecting collectors (each runs arterial↔arterial or arterial↔riverbank)
  { a: { x: -43, z: -180 }, b: { x: 111, z: -180 }, type: 'collector', name: 'Switchback Rd' }, // through the hills
  { a: { x: -43, z: -75 }, b: { x: 111, z: -75 }, type: 'collector', name: 'Standup St' }, // downtown cross-street
  { a: { x: 30, z: -22 }, b: { x: 30, z: 108 }, type: 'collector', name: 'KPI Way' },
  { a: { x: -150, z: -22 }, b: { x: -150, z: 108 }, type: 'collector', name: 'Backlog Ln' },
  // perimeter connectors — close the loops so roads don't dead-end at the edge
  { a: { x: -43, z: -295 }, b: { x: 111, z: -295 }, type: 'arterial', name: 'Beltline N' },
  { a: { x: -43, z: 295 }, b: { x: 111, z: 295 }, type: 'arterial', name: 'Beltline S' },
  { a: { x: -295, z: -22 }, b: { x: -295, z: 108 }, type: 'collector', name: 'Beltline W' },
  { a: { x: 295, z: -22 }, b: { x: 295, z: 108 }, type: 'collector', name: 'Beltline E' },
  { a: { x: 295, z: 186 }, b: { x: 295, z: 215 }, type: 'collector', name: 'Beltline E' },
  // the SW loop closure: Esplanade ↔ Sepulveda just east of the golf course
  { a: { x: -188, z: 186 }, b: { x: -188, z: 215 }, type: 'collector', name: 'Fairway Ct' },
]
function pointToSeg(px: number, pz: number, ax: number, az: number, bx: number, bz: number): number {
  const dx = bx - ax
  const dz = bz - az
  const len2 = dx * dx + dz * dz || 1
  let t = ((px - ax) * dx + (pz - az) * dz) / len2
  t = Math.max(0, Math.min(1, t))
  return Math.hypot(px - (ax + t * dx), pz - (az + t * dz))
}
function onRoad(x: number, z: number, rad = 0): boolean {
  for (const r of ROADS) {
    if (pointToSeg(x, z, r.a.x, r.a.z, r.b.x, r.b.z) < roadWidth(r.type) / 2 + rad + 1.5) return true
  }
  return false
}

// Lane-PAINT clipping: real lane lines stop at the intersection — they don't run
// through the box. Every road here is axis-aligned, so a crossing happens where
// a perpendicular road's centerline passes through this one. Returns the spans
// (as 0..1 fractions along this road) to LEAVE BARE so paint stops `setback`
// before each crossing road's edge and resumes after — bare asphalt in between.
export function paintGaps(road: Road, setback = 2.5): [number, number][] {
  const horiz = road.a.z === road.b.z // z constant → road runs in x
  const ax = road.a.x
  const az = road.a.z
  const bx = road.b.x
  const bz = road.b.z
  const len = Math.hypot(bx - ax, bz - az) || 1
  const gaps: [number, number][] = []
  for (const s of ROADS) {
    if (s === road) continue
    const sHoriz = s.a.z === s.b.z
    if (sHoriz === horiz) continue // parallel roads don't cross
    const vert = horiz ? s : road // the vertical one (constant x)
    const hor = horiz ? road : s // the horizontal one (constant z)
    const cx = vert.a.x
    const cz = hor.a.z
    // the crossing must actually fall on BOTH segments
    if (cz < Math.min(vert.a.z, vert.b.z) || cz > Math.max(vert.a.z, vert.b.z)) continue
    if (cx < Math.min(hor.a.x, hor.b.x) || cx > Math.max(hor.a.x, hor.b.x)) continue
    const half = roadWidth(s.type) / 2 + setback
    const posAlong = horiz ? cx : cz // where the crossing sits along THIS road
    const start = horiz ? ax : az
    const end = horiz ? bx : bz
    const tc = (posAlong - start) / (end - start)
    const tHalf = half / len
    gaps.push([tc - tHalf, tc + tHalf])
  }
  return gaps
}

// ---------- palettes ----------
const TOWER = ['#737f8c', '#7e8a97', '#697480', '#828d9a', '#5f6a76']
const BROWN = ['#7a5a44', '#8a6650', '#6e5040', '#946f56', '#82624c']
const CHINA = ['#9e3b32', '#b5503f', '#c9803a', '#8a4a2f', '#b9794a']
const PASTEL = ['#c98ba0', '#cdab6e', '#9bb0c4', '#c4a3c0', '#a9c4a0'] // SF painted ladies
const BRICK = ['#9c6b50', '#86503c', '#b07a5c', '#7a4a38', '#a06848']
const WHARF = ['#7d8a86', '#8f8f86', '#6f7d80', '#86918c', '#73807c']
const AUSTIN = ['#c9b48a', '#b89a6a', '#d2c098', '#caa97a', '#bfa882']
const LASTUCCO = ['#d8c9a8', '#cdb89a', '#dcc6a0', '#c9b48f', '#cf9f7a']
const GLASS = ['#8a93a0', '#7d8893', '#94a0ad']
const MIDTOWN = ['#8a8f96', '#9aa0a6', '#7e858c', '#94918a', '#a0a4a9']

// ---------- districts (each evokes a city) ----------
type DistrictSpec = { region: Rect; step: number; fw: [number, number]; hgt: [number, number]; jitter: number; skip: number; palette: readonly string[] }
const DISTRICTS: DistrictSpec[] = [
  // NORTH
  { region: { minX: -92, maxX: 20, minZ: -120, maxZ: 46 }, step: 28, fw: [14, 18], hgt: [34, 72], jitter: 1.5, skip: 0.05, palette: TOWER }, // Manhattan core
  { region: { minX: -116, maxX: 40, minZ: 48, maxZ: 94 }, step: 24, fw: [9, 12], hgt: [12, 28], jitter: 2, skip: 0.16, palette: MIDTOWN }, // Midtown infill (the HQ band)
  { region: { minX: -90, maxX: 150, minZ: -245, maxZ: -125 }, step: 28, fw: [8, 11], hgt: [6, 13], jitter: 2.5, skip: 0.22, palette: PASTEL }, // The Hills — SF/LA hill houses (sit on the terrain)
  { region: { minX: -300, maxX: -120, minZ: -188, maxZ: -48 }, step: 22, fw: [9, 12], hgt: [6, 11], jitter: 1, skip: 0.1, palette: BROWN }, // Brownstones (NW)
  { region: { minX: 34, maxX: 110, minZ: -50, maxZ: 30 }, step: 20, fw: [6, 8], hgt: [10, 19], jitter: 1, skip: 0.03, palette: CHINA }, // Chinatown
  { region: { minX: 120, maxX: 210, minZ: -52, maxZ: 40 }, step: 22, fw: [7, 9], hgt: [8, 14], jitter: 1, skip: 0.07, palette: PASTEL }, // SF rowhouses
  { region: { minX: 150, maxX: 300, minZ: -188, maxZ: -34 }, step: 26, fw: [8, 11], hgt: [8, 16], jitter: 2.5, skip: 0.28, palette: BRICK }, // Boston historic
  { region: { minX: -96, maxX: 200, minZ: 96, maxZ: 116 }, step: 22, fw: [10, 14], hgt: [5, 11], jitter: 1, skip: 0.16, palette: WHARF }, // Waterfront/Marina
  // SOUTH
  { region: { minX: -206, maxX: 35, minZ: 186, maxZ: 296 }, step: 26, fw: [8, 12], hgt: [6, 14], jitter: 2, skip: 0.2, palette: AUSTIN }, // Austin riverfront
  { region: { minX: 50, maxX: 300, minZ: 186, maxZ: 300 }, step: 32, fw: [8, 12], hgt: [4, 10], jitter: 2.5, skip: 0.34, palette: LASTUCCO }, // LA sprawl
  { region: { minX: 232, maxX: 296, minZ: 200, maxZ: 256 }, step: 26, fw: [12, 16], hgt: [26, 48], jitter: 1.5, skip: 0.1, palette: GLASS }, // downtown-LA mini-cluster
]

// District footprints, exported so the ground can read as paved city blocks
// (not grass) between buildings — even where a neighborhood sits on a hill.
export const DISTRICT_REGIONS: Rect[] = DISTRICTS.map((d) => d.region)

// ---------- alleyways (narrow service streets threading between buildings) ----------
// A grid of skinny streets running BETWEEN the building rows (offset half a block
// off the building grid). Buildings avoid them (see clearOf), so they're clean,
// drivable gaps — the connective tissue that makes the city read as a real grid
// instead of buildings on a field. Unmarked (local streets get no lane paint).
export type AlleySeg = { a: { x: number; z: number }; b: { x: number; z: number } }
export const ALLEY_W = 5
function genAlleys(): { segs: AlleySeg[]; fences: Rect[] } {
  const segs: AlleySeg[] = []
  for (const d of DISTRICTS) {
    const r = d.region
    for (let x = r.minX + d.step / 2; x < r.maxX - 1; x += d.step) segs.push({ a: { x, z: r.minZ }, b: { x, z: r.maxZ } })
    for (let z = r.minZ + d.step / 2; z < r.maxZ - 1; z += d.step) segs.push({ a: { x: r.minX, z }, b: { x: r.maxX, z } })
  }
  // Connect or cap every alley end: if a street is within reach, EXTEND the
  // alley to meet it (real through-alleys); otherwise CAP it with a back-lot
  // fence so dead ends end at something instead of petering into grass.
  const fences: Rect[] = []
  for (const s of segs) {
    const vert = s.a.x === s.b.x
    for (const key of ['a', 'b'] as const) {
      const e = s[key]
      const o = key === 'a' ? s.b : s.a
      const dx = Math.sign(e.x - o.x)
      const dz = Math.sign(e.z - o.z)
      if (onRoad(e.x, e.z, 1)) continue // already meets a street
      let connected = false
      for (let ext = 3; ext <= 18; ext += 3) {
        if (onRoad(e.x + dx * ext, e.z + dz * ext, 1)) {
          e.x += dx * (ext + 2) // overshoot into the roadway so the surfaces merge
          e.z += dz * (ext + 2)
          connected = true
          break
        }
      }
      if (!connected) fences.push(vert ? rect(e.x, e.z, ALLEY_W + 0.8, 0.5) : rect(e.x, e.z, 0.5, ALLEY_W + 0.8))
    }
  }
  return { segs, fences }
}
const ALLEY_GEN = genAlleys()
export const ALLEYS: AlleySeg[] = ALLEY_GEN.segs
export const ALLEY_FENCES: Rect[] = ALLEY_GEN.fences
function onAlley(x: number, z: number, rad = 0): boolean {
  for (const s of ALLEYS) {
    if (pointToSeg(x, z, s.a.x, s.a.z, s.b.x, s.b.z) < ALLEY_W / 2 + rad + 0.5) return true
  }
  return false
}

// Alley clutter — placed with a GRAMMAR, not a scatter: a dumpster cluster
// (dumpster + 0–2 cans huddled beside it) sits against an alley wall, only deep
// in the block where you'd actually find one — never within eyeshot of a real
// road. Dumpsters are SOLID (see SOLIDS); cans stay knock-through cosmetic.
export type AlleyProp = { x: number; z: number; rot: number; kind: 'can' | 'dumpster' }
function genAlleyProps(): AlleyProp[] {
  const out: AlleyProp[] = []
  ALLEYS.forEach((s, si) => {
    const dx = s.b.x - s.a.x
    const dz = s.b.z - s.a.z
    const len = Math.hypot(dx, dz) || 1
    const ux = dx / len
    const uz = dz / len
    const px = -uz // perpendicular (toward an alley side)
    const pz = ux
    for (let d = 26; d < len - 26; d += 44) {
      if (h2(si * 9 + d, 17) < 0.62) continue // most candidate spots stay empty
      const cx = s.a.x + ux * d
      const cz = s.a.z + uz * d
      if (onRoad(cx, cz, 12)) continue // keep clutter out of sight of real streets
      const side = h2(si, d) < 0.5 ? 1 : -1
      const off = (ALLEY_W / 2 - 0.7) * side
      const ax = cx + px * off
      const az = cz + pz * off
      const rot = Math.atan2(px * side, pz * side) // back against the alley wall
      out.push({ x: ax, z: az, rot, kind: 'dumpster' })
      const cans = Math.floor(h2(si + d, 23) * 3) // 0–2 cans huddled next to it
      for (let k = 1; k <= cans; k++) out.push({ x: ax + ux * 1.6 * k, z: az + uz * 1.6 * k, rot, kind: 'can' })
    }
  })
  return out
}
export const ALLEY_PROPS: AlleyProp[] = genAlleyProps()

// ---------- office parks (gap-filler: cluster of mid-rise around a lot) ----------
const OFFICE_PARK_CENTERS = [
  { x: 150, z: 78 },
  { x: 230, z: 70 },
  { x: 60, z: 80 },
  { x: 200, z: 58 },
  { x: -70, z: 72 },
  { x: -130, z: 72 },
]
function genOfficeParks(): { buildings: Building[]; lots: Rect[] } {
  const buildings: Building[] = []
  const lots: Rect[] = []
  const greys = ['#9aa0a6', '#8e949b', '#a4a9af']
  OFFICE_PARK_CENTERS.forEach((c, i) => {
    lots.push(rect(c.x, c.z, 40, 30))
    const offs = [
      [-16, -11],
      [16, -11],
      [-16, 11],
      [16, 11],
    ]
    offs.forEach(([ox, oz], j) => {
      const bx = c.x + ox
      const bz = c.z + oz
      if (onRoad(bx, bz, 5) || onAlley(bx, bz, 5)) return // keep office buildings off roads AND alleys
      buildings.push({ x: bx, z: bz, w: 10, d: 8, h: 12 + h2(i, j) * 8, color: pick(greys, h2(i + j, 1)) })
    })
  })
  return { buildings, lots }
}
const OFFICE = genOfficeParks()

const BLOCKED = [...WATER, ...PARKS, ...APPROACHES, ...LANDMARK_CLEAR, ...OFFICE.lots]
function clearOf(x: number, z: number, rad = 0): boolean {
  for (const r of BLOCKED) if (inRect(x, z, r, 4 + rad)) return false
  if (distToAvenues(x, z) < 9 + rad) return false
  if (onRoad(x, z, rad)) return false
  if (onAlley(x, z, rad)) return false // keep the alley grid clear of buildings
  if (Math.hypot(x - SPAWN.x, z - SPAWN.z) < 18) return false
  for (const p of Object.values(DEST_POINTS)) if (Math.hypot(x - p.x, z - p.z) < 16) return false
  return true
}

function genDistricts(): Building[] {
  const out: Building[] = []
  DISTRICTS.forEach((s, di) => {
    const [fwa, fwb] = s.fw
    const [ha, hb] = s.hgt
    for (let gx = s.region.minX; gx <= s.region.maxX; gx += s.step) {
      for (let gz = s.region.minZ; gz <= s.region.maxZ; gz += s.step) {
        if (h2(gx + di * 13, gz - di * 7) < s.skip) continue
        const x = gx + (h2(gx + 1, gz) - 0.5) * 2 * s.jitter
        const z = gz + (h2(gx, gz + 1) - 0.5) * 2 * s.jitter
        const w = fwa + h2(gx + 3, gz) * (fwb - fwa)
        const d = fwa + h2(gx, gz + 3) * (fwb - fwa)
        if (!clearOf(x, z, Math.max(w, d) / 2)) continue // keep the whole footprint off roads
        out.push({ x, z, w, d, h: ha + h2(gx + 5, gz + 5) * (hb - ha), color: pick(s.palette, h2(gx + 7, gz + 7)) })
      }
    }
  })
  return out
}

export const BUILDINGS: Building[] = [...genDistricts(), ...OFFICE.buildings]

// ---------- parking lots ----------
export const PARKING: Rect[] = [
  ...OFFICE.lots,
  rect(150, 285, 46, 30), // mall lot
  rect(250, 248, 40, 36), // stadium lot
  rect(120, 280, 34, 22), // LA strip-mall lots
  rect(200, 270, 30, 22),
  rect(85, 265, 28, 20),
]

// ---------- palms (LA) + park trees ----------
export const PALMS: Tree[] = (() => {
  const out: Tree[] = []
  for (let i = 0; i < 34; i++) {
    const x = 55 + h2(i, 41) * 235
    const z = 188 + h2(i, 42) * 108
    out.push({ x, z, h: 7 + h2(i, 43) * 4 })
  }
  return out
})()
export const TREES: Tree[] = (() => {
  const out: Tree[] = []
  const parks = [CENTRAL_PARK, BOSTON_COMMON]
  parks.forEach((p, pi) => {
    for (let i = 0; i < 90; i++) {
      const x = p.minX + h2(i + pi * 50, 1) * (p.maxX - p.minX)
      const z = p.minZ + h2(i + pi * 50, 2) * (p.maxZ - p.minZ)
      if (inRect(x, z, POND, 3)) continue
      if (onRoad(x, z, 2)) continue // never drop a tree on a road that crosses the park
      if (distToAvenues(x, z) < 9) continue // ...or on the diagonal avenue through the park corner
      if (h2(i + pi * 50, 3) < 0.45) continue
      out.push({ x, z, h: 3.5 + h2(i, 4) * 3 })
    }
  })
  return out
})()

// ---------- marina docks (SF) ----------
export const DOCKS = [
  { x: -10, z: 122, len: 14 },
  { x: 30, z: 122, len: 18 },
  { x: 70, z: 122, len: 14 },
]

// ---------- countryside ----------
function ringPoint(i: number, sa: number, sb: number, rMin: number, rMax: number) {
  const ang = h2(i, sa) * Math.PI * 2
  const rad = rMin + h2(i, sb) * (rMax - rMin)
  return { x: Math.cos(ang) * rad, z: Math.sin(ang) * rad }
}
export const COUNTRY_FIELDS: Rect[] = (() => {
  const out: Rect[] = []
  for (let i = 0; i < 10; i++) {
    const c = ringPoint(i, 11, 12, 340, 480)
    const w = 50 + h2(i, 13) * 60
    const d = 50 + h2(i, 14) * 60
    out.push(rect(c.x, c.z, w, d))
  }
  return out
})()
export const COUNTRY_TREES: Tree[] = (() => {
  const out: Tree[] = []
  for (let i = 0; i < 70; i++) {
    const c = ringPoint(i, 21, 22, 330, 500)
    if (onRoad(c.x, c.z, 2)) continue // keep the country roads clear too
    out.push({ x: c.x, z: c.z, h: 3 + h2(i, 23) * 3.5 })
  }
  return out
})()
export const BARNS: Building[] = (() => {
  const reds = ['#8a3b32', '#6e3029', '#9a463a']
  const out: Building[] = []
  for (let i = 0; i < 7; i++) {
    const c = ringPoint(i + 3, 31, 32, 340, 480)
    out.push({ x: c.x, z: c.z, w: 9 + h2(i, 33) * 4, d: 6 + h2(i, 34) * 4, h: 5 + h2(i, 35) * 3, color: pick(reds, h2(i, 36)) })
  }
  return out
})()

// ---------- collision ----------
const SOLIDS: Rect[] = [
  ...[...BUILDINGS, HQ_BUILDING, ...BARNS].map((b) => rect(b.x, b.z, b.w, b.d)),
  ...LANDMARK_SOLIDS,
  ...BRIDGE_RAILS,
  ...TREES.map((t) => rect(t.x, t.z, 1.4, 1.4)),
  // dumpsters are real obstacles (cans stay knock-through)
  ...ALLEY_PROPS.filter((p) => p.kind === 'dumpster').map((p) => rect(p.x, p.z, 2.2, 1.6)),
  // back-lot fences capping dead-end alleys
  ...ALLEY_FENCES,
]

function pushOutOfRect(cx: number, cz: number, r: Rect, rad: number): { x: number; z: number; hit: boolean } {
  const qx = Math.max(r.minX, Math.min(cx, r.maxX))
  const qz = Math.max(r.minZ, Math.min(cz, r.maxZ))
  const dx = cx - qx
  const dz = cz - qz
  const d2 = dx * dx + dz * dz
  if (d2 >= rad * rad) return { x: cx, z: cz, hit: false }
  if (d2 > 1e-6) {
    const dist = Math.sqrt(d2)
    const push = rad - dist
    return { x: cx + (dx / dist) * push, z: cz + (dz / dist) * push, hit: true }
  }
  const penL = cx - r.minX
  const penR = r.maxX - cx
  const penD = cz - r.minZ
  const penU = r.maxZ - cz
  const m = Math.min(penL, penR, penD, penU)
  if (m === penL) return { x: r.minX - rad, z: cz, hit: true }
  if (m === penR) return { x: r.maxX + rad, z: cz, hit: true }
  if (m === penD) return { x: cx, z: r.minZ - rad, hit: true }
  return { x: cx, z: r.maxZ + rad, hit: true }
}

export function resolveCarCollision(x: number, z: number, r: number): { x: number; z: number; hit: boolean } {
  let cx = x
  let cz = z
  let hit = false
  for (const s of SOLIDS) {
    const res = pushOutOfRect(cx, cz, s, r)
    if (res.hit) {
      cx = res.x
      cz = res.z
      hit = true
    }
  }
  const onBridge = BRIDGES.some((b) => cx >= b.minX && cx <= b.maxX && cz >= b.minZ && cz <= b.maxZ)
  if (!onBridge) {
    for (const w of WATER) {
      const res = pushOutOfRect(cx, cz, w, r)
      if (res.hit) {
        cx = res.x
        cz = res.z
        hit = true
      }
    }
  }
  return { x: cx, z: cz, hit }
}
