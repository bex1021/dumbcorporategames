// Lunch Dash (Phase 3) — driving + camera + world tunables for the first
// playable slice.
//
// Mirrors the jirarun phase's local `runnerConfig.ts` convention: a whole new
// phase keeps its own config rather than crowding the office values in
// src/config/constants.ts.
//
// Feel target: arcade-loose "with weight". Generous turning, no drift or
// spinout, but a real momentum ramp so the car feels heavy enough that the
// salmon bowl (next slice) will have something to react to. Reference vibe in
// the blueprint: Crazy Taxi / GTA 1-2 / Mario Kart minus items.

export const DRIVE = {
  maxSpeed: 25, // m/s forward top speed (~56 mph) — arcade-brisk for a city
  reverseMaxSpeed: 7, // m/s
  // Approach rates for `1 - exp(-rate*dt)` velocity smoothing (units 1/s).
  // Lower = more momentum / weight. Throttle is soft, brakes firmer.
  throttleRate: 2.0, // slightly quicker ramp now that the top end is higher
  brakeRate: 4.0,
  coastRate: 0.55, // engine-braking when nothing is held
  // Steering
  turnRate: 1.9, // rad/s at full authority (~109 deg/s)
  fullSteerSpeed: 7, // m/s where steering reaches full authority; below this it
  // ramps down so you can't pivot a parked car in place
  highSteerTaper: 0.35, // at top speed, cut authority by up to this much so
  // high-speed turns aren't twitchy
  stopEps: 0.05, // m/s — snap to 0 when coasting below this
  carRadius: 1.6, // collision circle radius (m) — slightly generous so the car
  // never visibly clips into a building
} as const

export const DRIVE_CAMERA = {
  distance: 7.5, // m behind the car (further back than the office cam)
  height: 3.6, // m above ground
  lookHeight: 1.3, // look at roughly roof height
  lookAhead: 14, // aim this far up the road ahead — pitches the view up hills
  fov: 62,
  followRate: 11, // position smoothing for `1 - exp(-rate*dt)` — a little lag
} as const

export const DRIVE_WORLD = {
  half: 560, // ground plane half-extent (m) — city + countryside ring
  warnRadius: 380, // past this (from center) the "turn back" warning shows
  returnRadius: 520, // past this you're snapped back to Alignly HQ
} as const

// Catching air over hill crests — the cheap, high-joy "fun" mechanic. Drive fast
// over a convex rise and the car launches, arcs under gravity, and thuds on
// landing. Tuned snappier than real gravity so jumps land quickly, not floaty.
export const AIR = {
  gravity: 22, // m/s² downward — punchy but not floaty
  minSpeed: 16, // you must be going this fast (m/s, ~36 mph) before a hill will launch you — no slow pops
  launchMin: 4, // and the climb up the hill must be genuinely steep
  crestRatio: 0.15, // only pop near the actual crest (climb rate fallen to this fraction of its peak), not mid-slope
  crestBoost: 0.8, // launch a touch gentler than your climb so the car LIFTS off the top, never leaps
  hardLanding: 6, // descent speed (m/s) above which a landing thuds: camera shake + bowl jostle
} as const

// Salmon-bowl slosh tuning (the Lunch Dash core mechanic). Drains bowl.integrity
// 100→0. Tuned so that lifting off and slowing for corners stays Composed, a
// normal brisk drive lands Functional, and flooring every corner + bumping ends
// Disheveled. All eminently tweakable once it's been felt in-seat.
export const BOWL = {
  // Hard-corner slosh: lateral accel (speed × yaw-rate, m/s²) ABOVE this spills
  // the bowl. ~20 means turns taken below ~10 m/s (≈23 mph) stay clean; faster
  // cornering sloshes, harder the faster you go.
  latThreshold: 20,
  latRate: 1.3, // integrity lost per (m/s² over threshold) per second of cornering
  // Crash slosh: any crash severity gained in a single frame is a sharp jolt. A
  // solid head-on (~0.8 severity) costs ~20% of the bowl.
  crashRate: 26,
  pulseMin: 0.5, // a single-frame slosh above this fires the HUD flash pulse
} as const
