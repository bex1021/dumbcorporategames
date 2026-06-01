// Autopilot "personalities" for the Jira Run playtest harness.
//
// Each policy reads the live Sim state and issues inputs (setLane/jump/slide),
// exactly like a human pressing keys — except it runs at full speed in Node.
// They drive the SAME simulation.ts the real game uses, so what they prove
// (beatable? fair? how punishing?) is true of the shipped game.
//
// Key fact that shapes the logic: collision is checked against the LOGICAL lane
// index (state.lane), which setLane changes instantly — the x-glide is purely
// visual. So a lane switch dodges a wall the instant it's issued. The hard part
// is only the jump/slide arcs, and NOT abandoning a currently-safe lane into a
// hazard while chasing a far-off one.
//
// Guiding principle of the "perfect" survivor:
//   1. If something is imminent in MY lane, handle it (jump/slide, or for a
//      wall, escape to a safe lane — jumping/sliding too if the escape lane has
//      its own imminent jumpable).
//   2. Otherwise, if a wall is coming in my lane, drift to a CLEAN lane — but
//      only a clean one. If the only escapes have their own imminent hazards,
//      WAIT in the (still-safe) current lane and re-decide next frame, after
//      those hazards slide past. (Leaving a safe lane early was the bug that
//      made an earlier bot run into walls/gaps it had no need to touch.)

import type { Sim, SimState } from '../../src/jirarun/simulation'
import { HIT_Z, LANES, BANNER_HALF_W, isMovingOverhang, bannerSweepX, type Obstacle } from '../../src/jirarun/runnerConfig'

const WALL_TTC = 0.85 // start looking to leave a lane when a wall is this close (s)
const LOOKAHEAD = 60 // only consider obstacles within this many units ahead

function occupies(o: Obstacle, lane: number): boolean {
  if (o.lanes === 'full') return true
  // A sweeping banner blocks whichever lane it's over at CONTACT (z ≈ o.z), not
  // its spawn lane. Add a small margin past the collision half-width so the bot
  // also reacts when it'd be grazed at the edge of the swing — otherwise a
  // sub-frame edge case reads as a phantom "unfair" death in the playtest.
  if (isMovingOverhang(o)) {
    return Math.abs(LANES[lane] - bannerSweepX(o, o.z)) < BANNER_HALF_W + 0.35
  }
  return Array.isArray(o.lanes) && o.lanes.includes(lane)
}

// "Commit distance": how far ahead counts as must-act-now. Tuned so a jump
// triggered here is still airborne (y ≥ clearance) at contact, and a slide is
// still active. Scales with speed; ~0.5s of travel.
function commitDist(s: SimState): number {
  return Math.max(2 * HIT_Z, s.speed * 0.5)
}

// Nearest obstacle in `lane` that is within the commit zone (about to hit).
function immediateHazard(s: SimState, lane: number): Obstacle | null {
  const commit = commitDist(s)
  let best: Obstacle | null = null
  for (const o of s.obstacles) {
    if (o.kind === 'board') continue
    if (!occupies(o, lane)) continue
    if (o.z <= s.z - HIT_Z) continue
    if (o.z > s.z + commit) continue
    if (!best || o.z < best.z) best = o
  }
  return best
}

// Nearest wall ahead in `lane` (the thing that eventually forces you to move).
function nearestWallInLane(s: SimState, lane: number): Obstacle | null {
  let best: Obstacle | null = null
  for (const o of s.obstacles) {
    if (o.kind !== 'wall') continue
    if (!occupies(o, lane)) continue
    if (o.z <= s.z) continue
    if (o.z - s.z > LOOKAHEAD) continue
    if (!best || o.z < best.z) best = o
  }
  return best
}

// Is there a wall in `lane` anywhere in the corridor from just-behind to just-
// past `toZ`? Switching into such a lane would run you into that wall.
function wallInCorridor(s: SimState, lane: number, toZ: number): boolean {
  return s.obstacles.some(
    (o) => o.kind === 'wall' && occupies(o, lane) && o.z > s.z - HIT_Z && o.z <= toZ + HIT_Z,
  )
}

// A lane you can switch into RIGHT NOW with no regret: no wall in the corridor
// up to `toZ`, and nothing imminent. Returns the closest such lane, or null.
function cleanLane(s: SimState, fromLane: number, toZ: number): number | null {
  let best: number | null = null
  let bestDist = Infinity
  for (const lane of [0, 1, 2]) {
    if (lane === fromLane) continue
    if (wallInCorridor(s, lane, toZ)) continue
    if (immediateHazard(s, lane)) continue
    const d = Math.abs(lane - fromLane)
    if (d < bestDist) { bestDist = d; best = lane }
  }
  return best
}

function jumpKind(k: Obstacle['kind']): boolean { return k === 'block' || k === 'gap' }

// Forced out of the current lane by a wall: go to a clean lane if one exists;
// otherwise accept a lane whose only issue is an imminent jumpable/overhang and
// jump/slide it on the way in. Returns true if it moved.
function escapeLane(sim: Sim, s: SimState, wallZ: number, noSlide: boolean): boolean {
  const clean = cleanLane(s, s.lane, wallZ)
  if (clean !== null) { sim.setLane(clean); return true }
  for (const lane of [1, 0, 2]) {
    if (lane === s.lane) continue
    if (wallInCorridor(s, lane, wallZ)) continue
    const imm = immediateHazard(s, lane)
    sim.setLane(lane)
    if (imm) {
      if (jumpKind(imm.kind) && s.grounded) sim.jump()
      else if (imm.kind === 'overhang' && s.grounded && !s.sliding && !noSlide) sim.slide()
    }
    return true
  }
  return false // boxed in — possibly an unfair layout
}

// The core survivor. Returns true if it was actively avoiding something (so the
// greedy policy knows whether it's free to detour for a token).
function survive(sim: Sim, noSlide = false): boolean {
  const s = sim.state

  // 1) Something imminent in my current lane?
  const imm = immediateHazard(s, s.lane)
  if (imm) {
    if (imm.kind === 'wall') { escapeLane(sim, s, imm.z, noSlide); return true }
    if (imm.kind === 'overhang') {
      if (noSlide) escapeLane(sim, s, imm.z, noSlide)
      // Edge-trigger: TAP slide once, don't hold. Re-calling slide() every
      // frame kept resetting the 0.62s timer, so the bot stayed locked in a
      // slide into the next obstacle — and you can't jump out of a slide.
      else if (s.grounded && !s.sliding) sim.slide()
      return true
    }
    // block / gap
    if (s.grounded) sim.jump()
    else {
      // airborne and won't clear it in time → bail to a clean lane if possible
      const clean = cleanLane(s, s.lane, imm.z)
      if (clean !== null) sim.setLane(clean)
    }
    return true
  }

  // 2) Current lane clear for now, but a wall is coming in it → drift to a
  //    clean lane while one exists; otherwise hold and wait.
  const wall = nearestWallInLane(s, s.lane)
  if (wall) {
    const ttc = (wall.z - s.z) / s.speed
    if (ttc < WALL_TTC) {
      const clean = cleanLane(s, s.lane, wall.z)
      if (clean !== null) sim.setLane(clean)
      return true
    }
  }
  return false
}

export type Policy = { name: string; act: (sim: Sim, frame: number) => void }

// Plays cleanly: dodge walls, jump blocks/gaps, slide overhangs. Should clear
// any FAIR layout — so when it dies, the seed is a candidate for unfairness.
export const perfect: Policy = { name: 'perfect', act: (sim) => { survive(sim) } }

// Like perfect, but when nothing is imminent it detours one lane to grab a
// nearby token. Measures whether chasing coins gets you killed (risk/reward).
export const greedy: Policy = {
  name: 'greedy',
  act: (sim) => {
    if (survive(sim)) return
    const s = sim.state
    let bestTok: { z: number; lane: number } | null = null
    for (const tk of s.tokens) {
      if (tk.z <= s.z || tk.z - s.z > 22) continue
      if (!bestTok || tk.z < bestTok.z) bestTok = tk
    }
    if (
      bestTok &&
      Math.abs(bestTok.lane - s.lane) === 1 &&
      !wallInCorridor(s, bestTok.lane, bestTok.z) &&
      !immediateHazard(s, bestTok.lane)
    ) {
      sim.setLane(bestTok.lane)
    }
  },
}

// Never slides — only jumps + lane-dodges. Quantifies how punishing overhangs
// are to a player who hasn't learned (or refuses) to slide.
export const reckless: Policy = { name: 'reckless(no-slide)', act: (sim) => { survive(sim, true) } }

// Near-clueless baseline: mostly runs straight, occasional twitchy inputs.
// Deterministic (hashes sim state, no Math.random) so runs stay reproducible.
export const naive: Policy = {
  name: 'naive',
  act: (sim) => {
    const s = sim.state
    const r = Math.abs(Math.sin(s.z * 12.9898 + s.combo * 78.233) * 43758.5453) % 1
    if (r < 0.05 && s.grounded) sim.jump()
    else if (r > 0.97 && s.grounded) sim.slide()
    else if (r > 0.487 && r < 0.5) sim.nudgeLane(1)
    else if (r >= 0.5 && r < 0.513) sim.nudgeLane(-1)
  },
}

export const policies: Policy[] = [perfect, greedy, reckless, naive]
