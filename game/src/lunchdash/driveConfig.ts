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
  // Degrees added at top speed. 7 was imperceptible in play; 16 is a clear
  // stretch at speed that still stops short of fisheye.
  fovGain: 16,
  distanceGain: 1.6, // m the camera eases back at top speed

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
  crestRatio: 0.15, // only pop near the actual crest (climb rate fallen to this fraction of its peak), not mid-slope
  hardLanding: 6, // descent speed (m/s) above which a landing thuds: camera shake + bowl jostle

  // NATURAL terrain (the hill roads). Deliberately conservative, and unchanged
  // from the values the autopilot balance harness was tuned against: loosening
  // these made the ordinary delivery route pop 1.3 m off incidental hill grade,
  // and every one of those landings sloshed ~7% off the bowl through terrain
  // the player can't reasonably avoid. Big air is the authored ramps' job.
  minSpeed: 16, // m/s (~36 mph) before a rise will launch you at all
  launchMin: 4, // and the climb must be genuinely steep
  crestBoost: 0.8, // lift off the crest rather than leap

  // AUTHORED RAMPS (see RAMPS in terrain.ts). These are the payoff: a committed
  // run over a kicker gives a real multi-second flight, without touching how
  // the rest of the city drives.
  rampMinSpeed: 13,
  rampLaunchMin: 3,
  rampBoost: 1.15,
} as const

// Driving into the river. Deadpan consequence, not a game-over: you sink, the
// city fishes the car out, and the paperwork eats your lunch hour. If the
// exec's bowl was aboard it is unambiguously gone — the existing salmon-
// overboard flow then sends you back to Corporate Slop Bowlz for a fresh one.
export const RIVER = {
  sinkSeconds: 1.7, // how long you're going under before the screen is fully murky
  recoverSeconds: 0.9, // towed-out beat: the murk clears and control comes back
  sinkDepth: 2.6, // metres the body drops below the waterline at full submersion
  drag: 2.6, // how hard the water scrubs your momentum (1/s, exponential)
  timePenalty: 5, // in-game minutes lost to the tow — bigger than an HR clip (3)
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
