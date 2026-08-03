// Terrain elevation for Lunch Dash. Most of the city is flat (height 0); a
// cluster of smooth hills fills the empty northern area (SF/LA-style). The car,
// camera, ground mesh, buildings, trees and beacons all sample this so they sit
// on the terrain. Gaussian bumps = gentle, continuous slopes that taper to flat
// away from the hill district, so the dense flat downtown stays flat.

type Hill = { x: number; z: number; r: number; h: number }

// Hill centers live in the empty north band (z < -120), clear of downtown,
// the park, brownstones, and the river.
//
// HEIGHTS ARE 30% OF THEIR ORIGINAL VALUES (30/26/18/16/23/15). Six Gaussians
// this close together SUM, so nominally "30 m" hills stacked into a 76 m massif
// and the streets crossing it hit a 98% grade — for scale, the steepest street
// in San Francisco is 31.5%, and motorways cap around 10%. The long Gaussian
// tails also reached far enough south to tilt downtown streets sideways by up
// to 51% across their own width.
//
// At 30% the measured profile is: steepest street 29% (Synergy Ave climbing the
// north hill — just under SF's steepest), worst cross-slope 15%, and downtown
// tilt 1.6%, which is about the crown a real road is built with. Relief peaks
// near 23 m. Note the map is only ~600 m across, so metre-for-metre this is a
// realistic slice of a hilly city — a bigger massif would need kilometres of
// run-out to stay drivable.
//
// Widening the hills instead was measured and is WORSE: broader Gaussians
// overlap more, so the summed peak and the cross-slopes both go up. A flat
// "downtown basin" mask was also tried and rejected — it puts an escarpment
// exactly where Switchback Rd runs (96% cross-slope).
const HILLS: Hill[] = [
  { x: -40, z: -205, r: 88, h: 9 },
  { x: 60, z: -180, r: 78, h: 7.8 },
  { x: 135, z: -160, r: 60, h: 5.4 },
  { x: 5, z: -160, r: 58, h: 4.8 },
  { x: 100, z: -230, r: 72, h: 6.9 },
  { x: -80, z: -165, r: 56, h: 4.5 },
]

// The raw hill field — Gaussian bumps summed. Pads (below) then flatten benches
// into this so hillside buildings sit on level lots instead of being swallowed.
function baseHeight(x: number, z: number): number {
  let h = 0
  for (const k of HILLS) {
    const dx = x - k.x
    const dz = z - k.z
    h += k.h * Math.exp(-(dx * dx + dz * dz) / (2 * k.r * k.r))
  }
  return h
}

// Level building benches cut into the hillside. Within `r` of the center the
// ground is dead flat at the pad's own height; from `r` to `r + blend` it eases
// (smoothstep) back to the natural hill grade — a gentle graded lot the car can
// still drive onto, instead of a cliff. Fixes Corporate Slop Bowlz being "eaten
// into the hill": its NW-downtown stop sits ~25 m up a slope with a 6 m drop
// across its own footprint, so the hillface rose right up its back wall.
type Pad = { x: number; z: number; r: number; blend: number; y: number }
const PADS: Pad[] = [
  // Corporate Slop Bowlz lot — covers the building (x≈-66) + drive-thru window
  // (x≈-58) + canopy lane with margin, on the far-NW hillside.
  //
  // The blend is deliberately LONG. This lot sits ~11 m from the west kerb of
  // Synergy Ave, so the pad unavoidably regrades part of an 18 m arterial; with
  // a short 16 m shoulder it clamped the west kerb flat while the east kerb
  // stayed on the hillside — an 11.9 m step across the roadway. Spreading the
  // shoulder over 56 m halves that to 6.2 m (measured), against a natural
  // cross-fall of 3.7 m there, while keeping the building's bench dead level.
  // Combined with the road ribbons now being tessellated across their width
  // (ribbonGeo in DriveWorld), the residual float of the asphalt over the
  // driven surface drops from 12 cm to 2 cm.
  { x: -63, z: -88, r: 16, blend: 56, y: 0 },
]
// Bench height = the natural grade at each pad's center (so it ties smoothly
// into the surrounding slope at the blend edge). Computed once at load.
for (const p of PADS) p.y = baseHeight(p.x, p.z)

// ── Authored jump ramps ─────────────────────────────────────────────────────
// The city's abandoned roadworks, and the only place the catch-air mechanic
// really pays off. The natural hill crests build so little climb rate that a
// launch off them lasts a fraction of a second; these are shaped deliberately
// so a committed run produces a proper second of air.
//
// Each ramp is a symmetric hump — it works driven from either direction, and
// unlike a kicker with a lip it leaves no cliff to fall off at low speed. The
// profile is a raised cosine: zero at both toes, `rise` at the crest, and
// steepest a quarter of the way in, which is what feeds carAir.climb. Grade at
// the steepest point is rise·π/len, so at 22 m/s a 2.6 m rise over 20 m gives a
// ~9 m/s climb → roughly 1 s of flight and 2.4 m of height (see AIR in
// driveConfig.ts).
//
// INVARIANT: ramps must not overlap PADS (whose bench heights are baked from
// baseHeight at import) or any building footprint — both bake their heights
// once at module load and would silently disagree with the driven surface.
// Both live on Switchback Rd, the hill road, deliberately OFF the delivery
// route: hitting a jump while carrying the exec's bowl should be a choice.
export type Ramp = {
  x: number
  z: number
  ry: number // heading of the ramp's long axis (0 = +z, π/2 = +x)
  len: number // toe-to-toe length along that axis
  halfW: number // half-width across it
  rise: number // crest height above the natural grade
  // Per-ramp launch gate (m/s). Below it the ramp does NOT throw you. Without
  // it every ramp shares AIR.rampMinSpeed (13 m/s ≈ 29 mph), low enough that an
  // amble popped the car ~2 m into the air — floaty, and it handed you an
  // obstacle you hadn't earned.
  minSpeed?: number
  // Scenery that EXPLAINS the ramp. 'roadworks' (default) = graded earth,
  // hazard barrels, a works notice. 'truck' = a recovery truck with its bed
  // tilted down. 'float' = a stranded parade float with its back ramp down.
  dressing?: 'roadworks' | 'truck' | 'float'
  // ONE-WAY kicker: a straight incline climbing to a LIP that simply ends, and
  // running off that lip is what throws the car. Driven the other way it is the
  // back of a lorry — a wall — which is correct. Climbs from +z toward -z.
  kicker?: boolean
}

// halfW spans the FULL right-of-way (12 m roadway + both 4 m sidewalks ≈ 13 m
// each side), not just the lane. At halfW 7 the hump was a narrow ridge running
// down the middle of a wider road: the asphalt's kerb samples barely saw it, so
// the road sliced through the mound while the narrow centreline paint — which
// does follow the crest — hung metres up in the air. Carrying the grade right
// out to the pavement edge makes it read as a built-up earthwork.
// Crest x values are multiples of 3.5 offset from -560 (the ground mesh's
// vertex grid), so a mesh row lands exactly on the crest instead of straddling
// it and rendering the mound short.
export const RAMPS: Ramp[] = [
  { x: 10.5, z: -180, ry: Math.PI / 2, len: 20, halfW: 13, rise: 2.6 },
  { x: 84, z: -180, ry: Math.PI / 2, len: 20, halfW: 13, rise: 2.9 },

  // ── The parade jump: a recovery truck, then a float ───────────────────────
  // These are NOT road humps. The raised surface IS the vehicle — halfW is a
  // truck bed (3.2 m), not the carriageway — so the road either side stays dead
  // flat and you have to aim at it. Both are one-way kickers (see `kicker`).
  //
  //   TRUCK  parked hard against the south barricade, bed tilted to the road.
  //          Lip at z = 32, a few metres short of the barricade at z = 25.
  //   FLOAT  stranded mid-route with its back ramp down. Lip at z = -30, which
  //          is what clears the north barricade at z = -45.
  //
  // Both gate on minSpeed 20 (~45 mph). UNDER it there is no launch at all: you
  // drive up the bed, run off a 4 m lip with no impulse, drop, and hit the
  // barricade. Over it you clear, land in the parade, and run to the float.
  { x: -43, z: 36.5, ry: 0, len: 9, halfW: 2.4, rise: 4.4, minSpeed: 20, dressing: 'truck', kicker: true },
  { x: -43, z: -25.5, ry: 0, len: 9, halfW: 2.4, rise: 3.6, minSpeed: 20, dressing: 'float', kicker: true },
]

/** The authored ramp containing this point, if any — lets the car read a
 *  ramp's own launch gate instead of one global threshold. */
export function rampAt(x: number, z: number): Ramp | null {
  for (const r of RAMPS) {
    const s = Math.sin(r.ry)
    const c = Math.cos(r.ry)
    const dx = x - r.x
    const dz = z - r.z
    const along = dx * s + dz * c
    const across = dx * c - dz * s
    if (along <= -r.len / 2 || along >= r.len / 2) continue
    if (Math.abs(across) >= r.halfW) continue
    return r
  }
  return null
}

// Ramp contribution at a point — 0 everywhere outside the footprints, so the
// flat downtown, the roads and every baked prop elsewhere are untouched.
export function rampHeight(x: number, z: number): number {
  let add = 0
  for (const r of RAMPS) {
    const s = Math.sin(r.ry)
    const c = Math.cos(r.ry)
    const dx = x - r.x
    const dz = z - r.z
    const along = dx * s + dz * c
    const across = dx * c - dz * s
    const half = r.len / 2
    if (along <= -half || along >= half) continue
    if (Math.abs(across) >= r.halfW) continue
    const t = (along + half) / r.len // 0 at the -z end → 1 at the +z end
    // Kicker = a straight incline at CONSTANT grade up to the lip. That matters:
    // the launch fires when the climb rate collapses, and on a straight bed the
    // rate holds all the way up then vanishes at the lip — a ramp jump. A
    // raised-cosine hump flattens at its crest, so the car eases over instead.
    const prof = r.kicker ? 1 - t : (1 - Math.cos(2 * Math.PI * t)) / 2
    // Feather the shoulders so the ramp eases into the road surface sideways
    // instead of presenting a wall to a car crossing it at an angle.
    const u = Math.abs(across) / r.halfW
    const edge = 1 - u * u * (3 - 2 * u)
    add += r.rise * prof * edge
  }
  return add
}

export function terrainHeight(x: number, z: number): number {
  let h = baseHeight(x, z) + rampHeight(x, z)
  for (const p of PADS) {
    const d = Math.hypot(x - p.x, z - p.z)
    if (d >= p.r + p.blend) continue // outside the pad's reach — natural grade
    if (d <= p.r) {
      h = p.y // on the flat bench
    } else {
      const t = (d - p.r) / p.blend // 0 at bench edge → 1 at natural grade
      const s = t * t * (3 - 2 * t) // smoothstep for a soft graded shoulder
      h = p.y * (1 - s) + h * s
    }
  }
  return h
}
