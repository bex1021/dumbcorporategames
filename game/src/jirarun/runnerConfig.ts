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
export const SPEED_PER_LEVEL = 3.2 // each board deposit speeds things up (L1 13 → L4 ~22.6)
export const TOTAL_UPDATES = 4 // 4 boards to clear the phase (also the natural difficulty cap)
export const LEVEL_DISTANCE = 340 // forward units of obstacles per level before its board
export const SPAWN_AHEAD = 90 // spawn obstacles this far ahead of Leonard
export const CULL_BEHIND = 14 // remove obstacles this far behind Leonard

// ---- Collectibles ----
export const TOKEN_VALUE = 25 // base story points per token (× combo multiplier)
export const TOKEN_Y = 1.15 // float height — grabbable while grounded or low-jumping
export type Token = { id: number; z: number; lane: number }

// ---- Obstacle gaps (random per spawn; tighten with level) ----
export const GAP_MIN = 17
export const GAP_MAX = 26
export const GAP_TIGHTEN_PER_LEVEL = 1.5 // shave this off min+max each level

// ---- Types ----
// 'block'    — stack of tickets in a lane; JUMP over it.
// 'overhang' — sprint-banner bar at head height; SLIDE under it.
// 'gap'      — red BLOCKED trap tile on the floor; JUMP over it.
// 'wall'     — tall purple "dependency wall"; CANNOT jump or slide it — the
//              only way past is to be in a different lane. This is what makes
//              lane-camping fatal (you can't jump/slide your way through).
// 'board'    — full-width Kanban gate; run through it to DEPOSIT an update.
export type ObstacleKind = 'block' | 'overhang' | 'gap' | 'wall' | 'board'

export type Obstacle = {
  id: number
  kind: ObstacleKind
  z: number
  // Which lanes it occupies. 'full' spans all three. Otherwise a subset of
  // 0|1|2. A board is always 'full'.
  lanes: 'full' | number[]
  // Cosmetic only (boards): which update # this gate deposits (1..4), so the
  // gate can read "TICKET N UPDATED". Has no effect on collision/difficulty.
  updateNo?: number
  // Cosmetic: the sprint this obstacle spawned in. The renderer shows tutorial
  // action prompts (JUMP / SLIDE / DODGE) over Sprint-1 obstacles only.
  level?: number
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

// ---- Moving "calendar invite" banners ----
// A single-lane overhang banner SWEEPS laterally across the track as Leonard
// runs toward it, so you must dodge whichever lane it's currently over — or
// SLIDE under it (a slide clears any overhang no matter where it is, so a
// moving banner can never become unbeatable). The sweep is a PURE function of
// the obstacle + Leonard's z, so the headless sim, the autopilot, and the
// renderer all compute the exact same position every frame — what you see is
// what hits you. Driving it off leonardZ (which only ever increases) instead of
// a wall-clock keeps it deterministic, so playtests stay reproducible. It adds
// NO new RNG draws, so the seeded obstacle layout is byte-identical.
export const SWEEP_AMP = 2.3 // swing reaches the outer lane centres (LANES = ±2.3)
export const SWEEP_FREQ = 0.085 // radians of sweep per world-unit of leonardZ (~one L→R→L per ~74u)
export const BANNER_HALF_W = 1.4 // half collision width; a hair over half a lane gap so a banner mid-transit briefly covers two lanes (never all three → always an escape lane)

// Only SINGLE-lane overhangs sweep. Full-width and two-lane forced slides stay
// put (no lateral room to dodge into anyway — you just slide).
export function isMovingOverhang(o: { kind: ObstacleKind; lanes: 'full' | number[] }): boolean {
  return o.kind === 'overhang' && Array.isArray(o.lanes) && o.lanes.length === 1
}
// Current world-X centre of a sweeping banner. o.id offsets the phase so
// neighbouring banners don't swing in lockstep.
export function bannerSweepX(o: { id: number }, leonardZ: number): number {
  return Math.sin(leonardZ * SWEEP_FREQ + o.id * 1.7) * SWEEP_AMP
}
// Which lane indices a sweeping banner currently blocks (1, or 2 mid-transit).
export function bannerLanesAt(o: { id: number }, leonardZ: number): number[] {
  const bx = bannerSweepX(o, leonardZ)
  return [0, 1, 2].filter((l) => Math.abs(LANES[l] - bx) < BANNER_HALF_W)
}

// ---- Pattern generation ----
// Returns one spawn "event": a list of obstacles sharing (roughly) the same z.
// Guarantees at least one lane is passable WITHOUT an action, OR the whole
// row is a single jump/slide (always clearable by the right input). Difficulty
// rises with level: more doubles, tighter mix.
//
// `rand` is an injected 0..1 RNG so callers stay deterministic if they want.
export function makeRow(level: number, rand: () => number, prevForcedFull = false): Omit<Obstacle, 'id' | 'z'>[] {
  const r = rand()

  // A FULL-WIDTH forced row (jump-the-whole-track or slide-the-whole-track)
  // immediately after another one can be UNBEATABLE at high speed: the jump's
  // above-clearance window is shorter than the inter-row gap, so a single jump
  // can't cover both rows and you can't land-and-recover between them. (The
  // playtest harness found exactly this — two full blocks 17u apart at sprint
  // 4.) So if the previous row was a full-width forced action, downgrade this
  // one to a two-lane version that always leaves an open lane to dodge into.
  const forced = (kind: ObstacleKind): Omit<Obstacle, 'id' | 'z'>[] =>
    prevForcedFull ? [{ kind, lanes: twoLanes(rand) }] : [{ kind, lanes: 'full' }]

  // Every level includes WALLS (must-dodge, can't jump/slide) so lane-camping
  // is fatal from the start. Level 1 stays gentle otherwise; later levels add
  // full-width forced jumps/slides, two-lane squeezes, and more walls.
  if (level <= 1) {
    if (r < 0.22) return [{ kind: 'block', lanes: [pickLane(rand)] }]
    if (r < 0.40) return [{ kind: 'gap', lanes: [pickLane(rand)] }]
    if (r < 0.56) return [{ kind: 'overhang', lanes: [pickLane(rand)] }] // single-lane banner — sweeps; dodge OR slide
    if (r < 0.70) return forced('overhang') // the BIG full-width banner — can't dodge, you MUST slide (teaches the slide)
    if (r < 0.88) return [{ kind: 'wall', lanes: wallLanes(rand) }] // MUST switch lanes
    return [{ kind: 'block', lanes: twoLanes(rand) }] // dodge to the open lane
  }

  if (level === 2) {
    if (r < 0.18) return forced('block') // forced jump (downgraded if it follows one)
    if (r < 0.34) return forced('overhang') // forced slide
    if (r < 0.56) return [{ kind: 'wall', lanes: wallLanes(rand) }]
    if (r < 0.72) return [{ kind: 'gap', lanes: twoLanes(rand) }]
    return [{ kind: 'overhang', lanes: [pickLane(rand)] }]
  }

  // Level 3+ — meanest mix, walls common.
  if (r < 0.16) return forced('block')
  if (r < 0.3) return forced('overhang')
  if (r < 0.56) return [{ kind: 'wall', lanes: wallLanes(rand) }]
  if (r < 0.74) return [{ kind: 'gap', lanes: twoLanes(rand) }]
  return [{ kind: 'wall', lanes: [pickLane(rand)] }]
}

// Walls occupy 1 or 2 lanes — NEVER all three (that'd be unavoidable). A
// 2-lane wall leaves exactly one safe lane to weave into.
function wallLanes(rand: () => number): 'full' | number[] {
  return rand() < 0.5 ? [pickLane(rand)] : twoLanes(rand)
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

// Clear "runway" at the start of every sprint: a few seconds of EMPTY track
// right after each speed-up, so players can re-settle into the new (faster)
// pace before obstacles resume. Measured in seconds, then converted to world
// units at that level's speed — so the breather is a constant ~3.6s of
// reaction time at every level, not a constant distance that shrinks as you
// get faster. (Without this, the first obstacle of a new sprint can land <1s
// after the gate, which felt like an instant forced jump.)
export const SPRINT_GRACE_SECONDS = 3.6
// Sprint 1 gets a longer empty opening (the tutorial breather) so the player
// can read the controls + the first action prompt before any hazard arrives.
// Pure runway (initial nextSpawnZ) — no RNG draws, so the obstacle layout is
// unchanged, just pushed further down the track.
export const INTRO_GRACE_SECONDS = 7
export function runwayForLevel(level: number): number {
  return speedForLevel(level) * (level === 1 ? INTRO_GRACE_SECONDS : SPRINT_GRACE_SECONDS)
}

// ---- 8-bit Atlassian palette ----
export const PAL = {
  sky: '#0747a6', // deep Atlassian blue
  skyTop: '#091e42', // navy void up top
  floor: '#46598a', // mid slate-blue track — light enough that dark-suited Leonard reads against it
  grid: '#2684ff', // neon blue grid lines
  block: '#0052cc', // ticket-stack blue
  blockEdge: '#4c9aff',
  overhang: '#ff5630', // sprint-banner red-orange
  gap: '#de350b', // BLOCKED trap red
  wall: '#8777d9', // Atlassian purple — the unjumpable "dependency wall"
  board: '#36b37e', // Kanban green gate
  boardEdge: '#abf5d1',
  update: '#ffab00', // the carried "update" cards — Jira yellow
  leonardClash: '#ffffff',
} as const
