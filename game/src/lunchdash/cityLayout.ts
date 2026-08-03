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

// Stops sit at OPPOSITE corners so the route crosses most of the city (a short,
// clustered route is why noon had no teeth — see the balance harness): exec's
// bowl in the far-NW downtown, your lunch in the far-SE sprawl, HQ in the middle.
export const DEST_POINTS = {
  bowlz: { x: -61, z: -88 }, // far-NW Manhattan core, set back from Synergy Ave
  lunch: { x: 200, z: 234 }, // far-SE LA sprawl, set back from Sepulveda
  office: { x: 0, z: 90 }, // Alignly HQ
} as const

export const HQ_BUILDING: Building = { x: DEST_POINTS.office.x, z: DEST_POINTS.office.z, w: 16, d: 16, h: 46, color: '#3b4a66' }

// Drive-through storefronts at the pickup stops. The building sits beside the
// stop's cleared hub; `zx,zz` is the pull-in WINDOW the car stops at (set toward
// the nearest road so you can actually drive in). The HQ stop reuses HQ_BUILDING
// and only needs a drop-off zone (see destinations).
export type Storefront = {
  id: 'bowlz' | 'lunch'
  x: number
  z: number
  w: number
  d: number
  h: number
  zx: number
  zz: number
  color: string
  sign: string
}
export const STOREFRONTS: Storefront[] = [
  // Corporate Slop Bowlz — far-NW downtown. Building + window pulled WEST off
  // Synergy Ave (x=-43, west edge x=-52) so the canopy lot clears the road.
  // zx sits 4.5 m off the building's east wall (was 0.5 m — the pull-in marker
  // was effectively inside the wall, so every pickup ended nose-first in the
  // building; GreenWrap's zone has 6 m). Canopy + window visuals follow zx.
  { id: 'bowlz', x: -66, z: -88, w: 15, d: 8, h: 7, zx: -54, zz: -88, color: '#3f7d4f', sign: 'CORPORATE SLOP BOWLZ' },
  // Your Lunch — far-SE sprawl, pulled SOUTH off wide Sepulveda (z=215, south
  // edge z=224) so the drive-thru lot clears the road.
  { id: 'lunch', x: 200, z: 240, w: 13, d: 8, h: 6, zx: 200, zz: 230, color: '#b5603a', sign: 'GreenWrap — DRIVE THRU' },
]

// The corporate parade — a Macy's-grade civic event that walls off a downtown
// segment of Synergy Ave (x=-43), forcing a reroute. Cross-road barricades are
// solid; the blimps + floats + crowd are set-dressing (see Parade.tsx).
export const PARADE = { x: -43, z0: -45, z1: 25 }
// Two barricades, not three. The pair at the ENDS is what actually closes the
// 70 m of Synergy Ave; the one that used to sit at z = -10 only cut the interior
// in half — and it sat exactly where a car jumping the closure has to come down
// between the two carrier trucks (see RAMPS in terrain.ts). Removing it opens a
// continuous landing strip without weakening the closure at all.
export const PARADE_BARRIERS: Rect[] = [
  rect(-43, -45, 22, 2.4),
  rect(-43, 25, 22, 2.4),
]

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
// The river spans the FULL ground plane (DRIVE_WORLD.half = 560), not just the
// ±300 city grid — it used to stop in a straight line at the map edge and you
// could drive around the end of it across dry riverbed, skipping the bridges
// (and the dunk) entirely.
const RIVER: Rect = { minX: -560, maxX: 560, minZ: 120, maxZ: 176 }
// east edge pulled to -158 so it clears Backlog Ln's west asphalt edge (x-156);
// otherwise the road's west half ran through the water = an invisible wall where
// the car gets shoved off the pond mid-lane.
const POND: Rect = { minX: -206, maxX: -158, minZ: 14, maxZ: 56 }
export const WATER: Rect[] = [RIVER, POND]
export const BRIDGES: Rect[] = [
  { minX: -58, maxX: -28, minZ: 112, maxZ: 184 },
  { minX: 96, maxX: 126, minZ: 112, maxZ: 184 },
]
const APPROACHES: Rect[] = BRIDGES.flatMap((b) => [
  { minX: b.minX - 4, maxX: b.maxX + 4, minZ: 86, maxZ: 120 },
  { minX: b.minX - 4, maxX: b.maxX + 4, minZ: 176, maxZ: 210 },
])

export function onBridge(x: number, z: number): boolean {
  return BRIDGES.some((b) => inRect(x, z, b))
}

// The river/pond hazard predicate: you're over water and NOT on a bridge deck.
// The car is no longer walled out of the water (it used to be shoved back by
// resolveCarCollision, which read as an invisible wall) — driving in now dunks
// you, and the Car's river sequence tows you out. See riverState.ts.
export function inWater(x: number, z: number): boolean {
  return WATER.some((w) => inRect(x, z, w)) && !onBridge(x, z)
}

// Solid railings down each side of the bridge roadway — keeps you on the deck.
// Half-thickness 0.3 matches the drawn 0.6 m box exactly (it was 0.4, so the
// wall you felt was 20 cm wider than the wall you saw).
export const BRIDGE_RAILS: Rect[] = BRIDGES.flatMap((b) => {
  const cx = (b.minX + b.maxX) / 2
  const h = 9.6 // just outside the 18 m roadway
  return [
    { minX: cx - h - 0.3, maxX: cx - h + 0.3, minZ: 118, maxZ: 178 },
    { minX: cx + h - 0.3, maxX: cx + h + 0.3, minZ: 118, maxZ: 178 },
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
export function onRoad(x: number, z: number, rad = 0): boolean {
  for (const r of ROADS) {
    if (pointToSeg(x, z, r.a.x, r.a.z, r.b.x, r.b.z) < roadWidth(r.type) / 2 + rad + 1.5) return true
  }
  return false
}

// Pavement surface height. Sidewalks are ribbons drawn 0.20 m proud of the
// ground in the band from the kerb out to kerb+4 m; anything STANDING on one
// (pedestrians, lamp posts, hydrants, stop signs, the parade crowd) must be
// lifted to match or it stands shin-deep in the concrete. Returns the plain
// ground height everywhere else, so it is safe to use unconditionally.
export const SIDEWALK_LIFT = 0.2
export function onSidewalk(x: number, z: number): boolean {
  for (const r of ROADS) {
    const d = pointToSeg(x, z, r.a.x, r.a.z, r.b.x, r.b.z)
    const kerb = roadWidth(r.type) / 2
    if (d >= kerb && d <= kerb + 4) return true
  }
  return false
}

// Where the tow truck drops you after a river dunk: the closest point of dry
// roadway, plus that road's direction so we can face the car along the lane
// instead of at a random heading. Candidates that project onto a stretch of road
// still over water (the bridge roads span the river) are REJECTED, so being
// fished out never dumps you straight back in.
export function nearestRoadPoint(
  x: number,
  z: number,
): { x: number; z: number; dirX: number; dirZ: number } {
  let best = { x: SPAWN.x, z: SPAWN.z, dirX: 0, dirZ: -1 }
  let bestD = Infinity
  for (const r of ROADS) {
    const dx = r.b.x - r.a.x
    const dz = r.b.z - r.a.z
    const len2 = dx * dx + dz * dz || 1
    const t = Math.max(0, Math.min(1, ((x - r.a.x) * dx + (z - r.a.z) * dz) / len2))
    const px = r.a.x + t * dx
    const pz = r.a.z + t * dz
    if (inWater(px, pz)) continue // that stretch is mid-river — no good as a drop-off
    const d = Math.hypot(x - px, z - pz)
    if (d < bestD) {
      bestD = d
      const len = Math.sqrt(len2)
      best = { x: px, z: pz, dirX: dx / len, dirZ: dz / len }
    }
  }
  return best
}

// Any DRIVABLE / paved surface — roads, the diagonal avenues, bridge decks,
// alleys, and parking lots. Used to keep scenery (trees, palms) off pavement:
// onRoad alone misses avenues, bridges, and lots, which is how trees ended up
// standing in the middle of the road. (Hoisted; only called after cityLayout's
// consts finish initialising.)
export function onPaved(x: number, z: number, rad = 0): boolean {
  if (onRoad(x, z, rad)) return true
  if (onAlley(x, z, rad)) return true
  if (distToAvenues(x, z) < 6 + rad) return true
  for (const p of PARKING) if (inRect(x, z, p, rad)) return true
  for (const b of BRIDGES) if (inRect(x, z, b, rad)) return true
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
// An alley laid parallel to a street and close enough to sit INSIDE its
// roadway. The grid is generated blind, so ~20 segments landed in a road — one
// ran dead down Alignment Blvd's centreline for 112 m — which on any cross-slope
// pushed a 5 m strip of near-black alley asphalt up through the road surface.
// (Alleys CROSSING a road are fine and stay; that's a normal junction.)
function alleyInsideRoad(s: AlleySeg): boolean {
  const vert = s.a.x === s.b.x
  for (const r of ROADS) {
    const rVert = r.a.x === r.b.x
    if (rVert !== vert) continue // crossing, not running inside
    const clear = roadWidth(r.type) / 2 + ALLEY_W / 2
    if (vert) {
      if (Math.abs(s.a.x - r.a.x) >= clear) continue
      if (Math.max(s.a.z, s.b.z) <= Math.min(r.a.z, r.b.z) || Math.min(s.a.z, s.b.z) >= Math.max(r.a.z, r.b.z)) continue
    } else {
      if (Math.abs(s.a.z - r.a.z) >= clear) continue
      if (Math.max(s.a.x, s.b.x) <= Math.min(r.a.x, r.b.x) || Math.min(s.a.x, s.b.x) >= Math.max(r.a.x, r.b.x)) continue
    }
    return true
  }
  return false
}

function genAlleys(): { segs: AlleySeg[]; fences: Rect[] } {
  const all: AlleySeg[] = []
  for (const d of DISTRICTS) {
    const r = d.region
    for (let x = r.minX + d.step / 2; x < r.maxX - 1; x += d.step) all.push({ a: { x, z: r.minZ }, b: { x, z: r.maxZ } })
    for (let z = r.minZ + d.step / 2; z < r.maxZ - 1; z += d.step) all.push({ a: { x: r.minX, z }, b: { x: r.maxX, z } })
  }
  const segs = all.filter((s) => !alleyInsideRoad(s))
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

  // ── Don't drive service lanes through solid buildings ─────────────────────
  // The alley grammar lays lanes down the middle of each block, which is right
  // for the district blocks (genDistricts already keeps its footprints off
  // them). It knows nothing, though, about the hand-placed structures — and it
  // was running THREE lanes straight through Alignly HQ, a 46 m tower, plus two
  // through a storefront. In game that reads as a road passing through a
  // building, because that is exactly what it was.
  //
  // Filtered here rather than by deleting segments by index, so the same thing
  // can't quietly come back if the HQ or a storefront is ever moved or resized.
  // Only structures declared ABOVE this point can be consulted (module init
  // order) — which is all of the hand-placed ones; the generated district
  // buildings are already alley-aware.
  const keepOut: Rect[] = [
    rect(HQ_BUILDING.x, HQ_BUILDING.z, HQ_BUILDING.w, HQ_BUILDING.d),
    ...STOREFRONTS.map((s) => rect(s.x, s.z, s.w, s.d)),
  ]
  const half = ALLEY_W / 2
  const segHitsBuilding = (s: AlleySeg) => {
    const sx0 = Math.min(s.a.x, s.b.x) - half
    const sx1 = Math.max(s.a.x, s.b.x) + half
    const sz0 = Math.min(s.a.z, s.b.z) - half
    const sz1 = Math.max(s.a.z, s.b.z) + half
    return keepOut.some((r) => r.maxX > sx0 && r.minX < sx1 && r.maxZ > sz0 && r.minZ < sz1)
  }
  const kept = segs.filter((s) => !segHitsBuilding(s))
  // …and drop any end-cap fence left stranded inside one of those footprints.
  const keptFences = fences.filter(
    (f) => !keepOut.some((r) => r.maxX > f.minX && r.minX < f.maxX && r.maxZ > f.minZ && r.minZ < f.maxZ),
  )
  return { segs: kept, fences: keptFences }
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
  for (const p of Object.values(DEST_POINTS)) if (Math.hypot(x - p.x, z - p.z) < 20) return false // room for storefront + lane
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
  // Palms were scattered across the LA quarter with NO placement checks at all
  // — unlike TREES below, which has always guarded against roads — so ten of
  // them stood in the middle of Sepulveda and Deliverable Dr. Same guards now:
  // off the carriageway, off the avenues, and out of building footprints.
  for (let i = 0; i < 34; i++) {
    const x = 55 + h2(i, 41) * 235
    const z = 188 + h2(i, 42) * 108
    if (onRoad(x, z, 2.5)) continue
    if (distToAvenues(x, z) < 9) continue
    if (onAlley(x, z, 1.5)) continue
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
    const f = rect(c.x, c.z, w, d)
    // the river now runs the full plane width — no crop fields floating on it
    if (WATER.some((wr) => f.minX < wr.maxX && f.maxX > wr.minX && f.minZ < wr.maxZ && f.maxZ > wr.minZ)) continue
    out.push(f)
  }
  return out
})()
export const COUNTRY_TREES: Tree[] = (() => {
  const out: Tree[] = []
  for (let i = 0; i < 70; i++) {
    const c = ringPoint(i, 21, 22, 330, 500)
    if (onRoad(c.x, c.z, 2)) continue // keep the country roads clear too
    if (inWater(c.x, c.z)) continue // …and no trees standing in the river
    out.push({ x: c.x, z: c.z, h: 3 + h2(i, 23) * 3.5 })
  }
  return out
})()
export const BARNS: Building[] = (() => {
  const reds = ['#8a3b32', '#6e3029', '#9a463a']
  const out: Building[] = []
  for (let i = 0; i < 7; i++) {
    const c = ringPoint(i + 3, 31, 32, 340, 480)
    if (inWater(c.x, c.z)) continue // no barns in the extended river either
    out.push({ x: c.x, z: c.z, w: 9 + h2(i, 33) * 4, d: 6 + h2(i, 34) * 4, h: 5 + h2(i, 35) * 3, color: pick(reds, h2(i, 36)) })
  }
  return out
})()

// ---------- collision ----------
// Solids carry a HEIGHT. Collision used to be purely 2-D — every obstacle was an
// infinitely tall wall — which is invisible until something asks the car to
// leave the ground: a car five metres in the air over a one-metre barricade was
// still shoved back by it, reading as an invisible wall in mid-flight. Anything
// the player can be ABOVE needs to know how tall it is.
//
// Infinity = you can never clear it (buildings, landmarks, trees). Everything
// else is measured from what's actually drawn.
type Solid = Rect & { h: number }
const withH = (r: Rect, h: number): Solid => ({ ...r, h })

const SOLIDS: Solid[] = [
  ...[...BUILDINGS, HQ_BUILDING, ...BARNS].map((b) => withH(rect(b.x, b.z, b.w, b.d), Infinity)),
  ...STOREFRONTS.map((s) => withH(rect(s.x, s.z, s.w, s.d), Infinity)),
  // barricades are waist-high crowd barriers — jumpable, and that is the point
  ...PARADE_BARRIERS.map((r) => withH(r, 1.2)),
  ...LANDMARK_SOLIDS.map((r) => withH(r, Infinity)),
  // bridge rails are low, but clearing one means landing in the river, which the
  // dunk sequence already handles
  ...BRIDGE_RAILS.map((r) => withH(r, 1.1)),
  ...TREES.map((t) => withH(rect(t.x, t.z, 1.4, 1.4), Infinity)),
  // dumpsters are real obstacles (cans stay knock-through)
  ...ALLEY_PROPS.filter((p) => p.kind === 'dumpster').map((p) => withH(rect(p.x, p.z, 2.2, 1.6), 1.7)),
  // back-lot fences capping dead-end alleys
  ...ALLEY_FENCES.map((r) => withH(r, 1.8)),
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

// Cheap "is this point inside/near a solid structure" test — used by the chase
// camera to keep its boom out of buildings (water/bridges don't obstruct the
// high camera, so we only check SOLIDS here, not WATER).
export function pointInBuilding(x: number, z: number, r: number): boolean {
  for (const s of SOLIDS) {
    const qx = Math.max(s.minX, Math.min(x, s.maxX))
    const qz = Math.max(s.minZ, Math.min(z, s.maxZ))
    const dx = x - qx
    const dz = z - qz
    if (dx * dx + dz * dz < r * r) return true
  }
  return false
}

/** `aboveGround` is the car's height over the terrain. Obstacles shorter than
 *  that are flown OVER rather than collided with — without it the game has no
 *  vertical dimension and any jump lands you in an invisible wall. */
export function resolveCarCollision(
  x: number,
  z: number,
  r: number,
  aboveGround = 0,
): { x: number; z: number; hit: boolean } {
  let cx = x
  let cz = z
  let hit = false
  for (const s of SOLIDS) {
    if (aboveGround > s.h) continue // clearing it
    const res = pushOutOfRect(cx, cz, s, r)
    if (res.hit) {
      cx = res.x
      cz = res.z
      hit = true
    }
  }
  // NOTE: water is deliberately NOT a collider. It used to push the car back
  // out, which felt like an invisible wall along the bank. The river is now
  // enterable and driving in triggers the dunk sequence (see riverState.ts).
  return { x: cx, z: cz, hit }
}
