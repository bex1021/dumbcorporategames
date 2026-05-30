// Jira Run — Phase 2 of Blocked.
//
// Leonard goes to update his Jira tickets, gets sucked INTO the board, and
// has to run an 8-bit Atlassian gauntlet carrying 4 "updates." Each update
// is deposited at a Kanban BOARD gate; 4 deposits = phase complete (→ lunch).
//
// This file holds all the tuning + the obstacle pattern generator. The live
// game loop is in RunnerWorld.tsx; the shell/HUD/screens are in JiraRun.tsx.
//
// Coordinate system: forward = +Z (Leonard's z increases over time). Camera
// sits behind at smaller z looking toward +Z. Three lanes along X.

// ---- Lanes ----
export const LANES = [-2.3, 0, 2.3] as const // world-X of left / center / right
export const LANE_LERP = 14 // higher = snappier lane switching

// ---- Vertical (jump / slide) ----
export const GRAVITY = -26 // units/s²
export const JUMP_V = 11 // initial up velocity → apex ~2.3, airtime ~0.85s
export const GROUND_Y = 0
export const SLIDE_DUR = 0.62 // seconds a slide lasts
// Clearance thresholds — how high/low Leonard must be to clear a hazard.
export const CLEAR_JUMP_Y = 0.9 // must be at least this high to clear a jumpable
export const HIT_Z = 0.7 // |obstacle.z - leonard.z| within this = contact

// ---- Speed + level structure ----
export const BASE_SPEED = 13 // units/s on level 1
export const SPEED_PER_LEVEL = 2.6 // each board deposit speeds things up
export const TOTAL_UPDATES = 4 // 4 boards to clear the phase
export const LEVEL_DISTANCE = 340 // forward units of obstacles per level before its board
export const SPAWN_AHEAD = 90 // spawn obstacles this far ahead of Leonard
export const CULL_BEHIND = 14 // remove obstacles this far behind Leonard

// ---- Obstacle gaps (random per spawn; tighten with level) ----
export const GAP_MIN = 17
export const GAP_MAX = 26
export const GAP_TIGHTEN_PER_LEVEL = 1.5 // shave this off min+max each level

// ---- Types ----
// 'block'    — stack of tickets in a lane; JUMP over it.
// 'overhang' — sprint-banner bar at head height; SLIDE under it.
// 'gap'      — red BLOCKED trap tile on the floor; JUMP over it.
// 'board'    — full-width Kanban gate; run through it to DEPOSIT an update.
export type ObstacleKind = 'block' | 'overhang' | 'gap' | 'board'

export type Obstacle = {
  id: number
  kind: ObstacleKind
  z: number
  // Which lanes it occupies. 'full' spans all three. Otherwise a subset of
  // 0|1|2. A board is always 'full'.
  lanes: 'full' | number[]
}

// How you clear each kind:
//   block / gap → must be airborne (y >= CLEAR_JUMP_Y)
//   overhang    → must be sliding
export function isJumpable(k: ObstacleKind) {
  return k === 'block' || k === 'gap'
}
export function isSlideable(k: ObstacleKind) {
  return k === 'overhang'
}

// ---- Pattern generation ----
// Returns one spawn "event": a list of obstacles sharing (roughly) the same z.
// Guarantees at least one lane is passable WITHOUT an action, OR the whole
// row is a single jump/slide (always clearable by the right input). Difficulty
// rises with level: more doubles, tighter mix.
//
// `rand` is an injected 0..1 RNG so callers stay deterministic if they want.
export function makeRow(level: number, rand: () => number): Omit<Obstacle, 'id' | 'z'>[] {
  const r = rand()

  // Level 1 leans on single-lane, dodgeable hazards. Later levels add
  // full-width forced jumps/slides and two-lane squeezes.
  if (level <= 1) {
    if (r < 0.34) return [{ kind: 'block', lanes: [pickLane(rand)] }]
    if (r < 0.62) return [{ kind: 'gap', lanes: [pickLane(rand)] }]
    if (r < 0.85) return [{ kind: 'overhang', lanes: [pickLane(rand)] }]
    return [{ kind: 'block', lanes: twoLanes(rand) }] // dodge to the open lane
  }

  if (level === 2) {
    if (r < 0.22) return [{ kind: 'block', lanes: 'full' }] // forced jump
    if (r < 0.42) return [{ kind: 'overhang', lanes: 'full' }] // forced slide
    if (r < 0.6) return [{ kind: 'gap', lanes: twoLanes(rand) }]
    if (r < 0.8) return [{ kind: 'overhang', lanes: [pickLane(rand)] }]
    return [{ kind: 'block', lanes: [pickLane(rand)] }]
  }

  // Level 3+ — meanest mix.
  if (r < 0.26) return [{ kind: 'block', lanes: 'full' }]
  if (r < 0.5) return [{ kind: 'overhang', lanes: 'full' }]
  if (r < 0.68) return [{ kind: 'gap', lanes: twoLanes(rand) }]
  if (r < 0.84) return [{ kind: 'block', lanes: twoLanes(rand) }]
  return [{ kind: 'overhang', lanes: [pickLane(rand)] }]
}

function pickLane(rand: () => number): number {
  return Math.floor(rand() * 3) // 0,1,2
}

// Two distinct lanes occupied → exactly one lane left open to dodge into.
function twoLanes(rand: () => number): number[] {
  const open = Math.floor(rand() * 3)
  return [0, 1, 2].filter((l) => l !== open)
}

export function gapRange(level: number): [number, number] {
  const shave = (level - 1) * GAP_TIGHTEN_PER_LEVEL
  return [Math.max(11, GAP_MIN - shave), Math.max(15, GAP_MAX - shave)]
}

export function speedForLevel(level: number): number {
  return BASE_SPEED + (level - 1) * SPEED_PER_LEVEL
}

// ---- 8-bit Atlassian palette ----
export const PAL = {
  sky: '#0747a6', // deep Atlassian blue
  skyTop: '#091e42', // navy void up top
  floor: '#172b4d', // dark slate track
  grid: '#2684ff', // neon blue grid lines
  block: '#0052cc', // ticket-stack blue
  blockEdge: '#4c9aff',
  overhang: '#ff5630', // sprint-banner red-orange
  gap: '#de350b', // BLOCKED trap red
  board: '#36b37e', // Kanban green gate
  boardEdge: '#abf5d1',
  update: '#ffab00', // the carried "update" cards — Jira yellow
  leonardClash: '#ffffff',
} as const
