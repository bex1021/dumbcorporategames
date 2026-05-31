// Jira Run — the pure rules engine (no React, no Three.js).
//
// This is the single source of truth for HOW THE GAME PLAYS: forward motion,
// lane/jump/slide physics, obstacle spawning, collision + Kanban-gate deposits,
// token scoring, and the per-sprint speed-up + runway. It is deliberately
// headless so TWO things can run the exact same rules:
//   1. RunnerWorld.tsx — feeds step() each animation frame and draws the result
//   2. scripts/playtest — runs step() thousands of times with a robot "player"
//      to stress-test fairness, difficulty, and balance.
//
// Because both consumers share THIS file, the robot tests the real game, not a
// lookalike. All tuning still lives in runnerConfig.ts.
//
// Coordinate system: forward = +Z. Three lanes along X (index 0,1,2). The
// camera-behind input inversion is a RENDERING concern and lives in
// RunnerWorld — here lanes are plain absolute indices.

import {
  LANES, LANE_LERP, GRAVITY, JUMP_V, SLIDE_DUR, CLEAR_JUMP_Y, HIT_Z,
  SPAWN_AHEAD, CULL_BEHIND, LEVEL_DISTANCE, TOTAL_UPDATES, TOKEN_VALUE,
  makeRow, gapRange, speedForLevel, runwayForLevel, isJumpable, isSlideable,
  type Obstacle, type ObstacleKind, type Token,
} from './runnerConfig'
import { makeRng } from './rng'

export type StartState = { level: number; updates: number; score: number }

// Combo multiplier from tokens collected this run: x1, then +1 every 8 tokens,
// capped at x4. (Lives here so RunnerWorld's HUD and the scoring use one copy.)
export function multForCombo(combo: number): number {
  return Math.min(4, 1 + Math.floor(combo / 8))
}

// Everything the renderer or a bot needs to read. Mutated in place by step();
// obsVersion/tokVersion bump whenever the arrays change so React can cheaply
// decide when to re-sync its rendered lists.
export type SimState = {
  z: number; lane: number; x: number; y: number; vy: number
  grounded: boolean; sliding: boolean; slideT: number
  speed: number; level: number; levelDist: number; updates: number
  alive: boolean; won: boolean; boardActive: boolean
  nextSpawnZ: number; score: number; combo: number
  obstacles: Obstacle[]; tokens: Token[]; nextId: number
  obsVersion: number; tokVersion: number
}

export type DeathCause = ObstacleKind // 'block' | 'overhang' | 'gap' | 'wall' | 'board'

// Events surfaced by step() so the renderer can fire SFX / callbacks and the
// harness can tally outcomes — without either reaching into internals.
export type SimEvent =
  | { type: 'token'; count: number }
  | { type: 'deposit'; updates: number }
  | { type: 'checkpoint'; level: number; updates: number; score: number }
  | { type: 'win' }
  | { type: 'death'; cause: DeathCause; sprint: number; z: number; lane: number }

export class Sim {
  state: SimState
  private rng: () => number
  // Was the most recently spawned row a full-width forced action? Used to stop
  // two un-dodgeable forced rows landing back-to-back (an unbeatable chain).
  private lastForcedFull = false

  constructor(seed: number, start: StartState) {
    this.rng = makeRng(seed)
    this.state = {
      z: 0, lane: 1, x: 0, y: 0, vy: 0,
      grounded: true, sliding: false, slideT: 0,
      speed: speedForLevel(start.level), level: start.level, levelDist: 0, updates: start.updates,
      alive: true, won: false, boardActive: false,
      // First obstacle sits a full sprint-grace runway ahead — eases you into
      // the speed before the first hazard (fresh game OR a resumed sprint).
      nextSpawnZ: runwayForLevel(start.level), score: start.score, combo: 0,
      obstacles: [], tokens: [], nextId: 1,
      obsVersion: 0, tokVersion: 0,
    }
  }

  // ---- inputs (mirror the keydown handlers; no-ops once dead/won) ----
  setLane(lane: number) {
    const s = this.state
    if (!s.alive || s.won) return
    s.lane = Math.max(0, Math.min(2, lane))
  }
  nudgeLane(delta: number) {
    this.setLane(this.state.lane + delta)
  }
  jump() {
    const s = this.state
    if (!s.alive || s.won) return
    if (s.grounded && !s.sliding) { s.vy = JUMP_V; s.grounded = false }
  }
  slide() {
    const s = this.state
    if (!s.alive || s.won) return
    if (s.grounded) { s.sliding = true; s.slideT = SLIDE_DUR }
  }

  // ---- spawning (seeded) ----
  private spawnRow(): 'full' | number[] {
    const s = this.state
    const row = makeRow(s.level, this.rng, this.lastForcedFull)
    // Remember whether THIS row is a full-width forced action, so the next row
    // won't also be one — preventing the unbeatable double-forced chain.
    this.lastForcedFull = row.some(
      (o) => o.lanes === 'full' && (o.kind === 'block' || o.kind === 'overhang' || o.kind === 'gap'),
    )
    let occupied: number[] = []
    for (const o of row) {
      s.obstacles.push({ id: s.nextId++, z: s.nextSpawnZ, kind: o.kind, lanes: o.lanes })
      if (o.lanes === 'full') occupied = [0, 1, 2]
      else occupied = occupied.concat(o.lanes)
    }
    s.obsVersion++
    return occupied
  }

  private spawnTokens(rowZ: number, occupied: 'full' | number[]) {
    const s = this.state
    const occ = occupied === 'full' ? [0, 1, 2] : occupied
    const open = [0, 1, 2].filter((l) => !occ.includes(l))
    const startLane = open.length
      ? open[Math.floor(this.rng() * open.length)]
      : Math.floor(this.rng() * 3)
    const diagonal = this.rng() < 0.3
    const baseZ = rowZ + 3.5
    for (let i = 0; i < 3; i++) {
      const lane = diagonal ? Math.max(0, Math.min(2, startLane - 1 + i)) : startLane
      s.tokens.push({ id: s.nextId++, z: baseZ + i * 2.2, lane })
    }
    s.tokVersion++
  }

  private spawnBoard() {
    const s = this.state
    // updateNo is cosmetic metadata only (renders "TICKET N UPDATED" on the
    // gate) — it doesn't affect collision, RNG, or difficulty.
    s.obstacles.push({ id: s.nextId++, z: s.nextSpawnZ + 8, kind: 'board', lanes: 'full', updateNo: s.level })
    s.boardActive = true
    s.obsVersion++
  }

  // ---- one tick of the world ----
  step(dt: number): SimEvent[] {
    const s = this.state
    const events: SimEvent[] = []
    if (!s.alive || s.won) return events

    // forward motion
    s.z += s.speed * dt

    // lane smoothing
    const targetX = LANES[s.lane]
    s.x += (targetX - s.x) * (1 - Math.exp(-LANE_LERP * dt))

    // vertical (jump arc)
    if (!s.grounded || s.vy !== 0) {
      s.y += s.vy * dt
      s.vy += GRAVITY * dt
      if (s.y <= 0) { s.y = 0; s.vy = 0; s.grounded = true }
    }
    // slide timer
    if (s.sliding) { s.slideT -= dt; if (s.slideT <= 0) s.sliding = false }

    // ---- spawning ----
    if (!s.boardActive) {
      while (s.nextSpawnZ < s.z + SPAWN_AHEAD) {
        const rowZ = s.nextSpawnZ
        const occ = this.spawnRow()
        if (this.rng() < 0.78) this.spawnTokens(rowZ, occ) // most gaps get tokens
        const [gmin, gmax] = gapRange(s.level)
        const gap = gmin + this.rng() * (gmax - gmin)
        s.nextSpawnZ += gap
        s.levelDist += gap
        if (s.levelDist >= LEVEL_DISTANCE) { this.spawnBoard(); break }
      }
    }

    // ---- cull behind ----
    const obsBefore = s.obstacles.length
    s.obstacles = s.obstacles.filter((o) => o.z > s.z - CULL_BEHIND)
    if (s.obstacles.length !== obsBefore) s.obsVersion++
    const tokBefore = s.tokens.length
    s.tokens = s.tokens.filter((t) => t.z > s.z - CULL_BEHIND)
    if (s.tokens.length !== tokBefore) s.tokVersion++

    // ---- collision / deposit ----
    for (const o of s.obstacles) {
      if (Math.abs(o.z - s.z) > HIT_Z) continue
      const inLane = o.lanes === 'full' || o.lanes.includes(s.lane)
      if (!inLane) continue
      if (o.kind === 'board') {
        if (o.z <= s.z) {
          s.updates += 1
          events.push({ type: 'deposit', updates: s.updates })
          s.obstacles = s.obstacles.filter((x) => x.id !== o.id)
          s.obsVersion++
          if (s.updates >= TOTAL_UPDATES) {
            s.won = true
            events.push({ type: 'win' })
          } else {
            s.level += 1
            s.speed = speedForLevel(s.level)
            s.levelDist = 0
            s.boardActive = false
            this.lastForcedFull = false // fresh sprint starts behind a long runway
            // Fresh runway ahead of where Leonard is NOW (just past the gate).
            s.nextSpawnZ = s.z + runwayForLevel(s.level)
            events.push({ type: 'checkpoint', level: s.level, updates: s.updates, score: s.score })
          }
        }
        continue
      }
      // hazard. 'wall' is neither jumpable nor slideable → only a lane change
      // (handled by inLane above) saves you.
      const cleared =
        (isJumpable(o.kind) && s.y >= CLEAR_JUMP_Y) ||
        (isSlideable(o.kind) && s.sliding)
      if (!cleared) {
        s.alive = false
        events.push({ type: 'death', cause: o.kind, sprint: s.level, z: s.z, lane: s.lane })
        return events
      }
    }

    // ---- token pickup (only reached if still alive this frame) ----
    {
      let collected = 0
      const survivors: Token[] = []
      for (const t of s.tokens) {
        if (Math.abs(t.z - s.z) <= HIT_Z && t.lane === s.lane) collected++
        else survivors.push(t)
      }
      if (collected > 0) {
        for (let i = 0; i < collected; i++) {
          s.combo += 1
          s.score += TOKEN_VALUE * multForCombo(s.combo)
        }
        s.tokens = survivors
        s.tokVersion++
        events.push({ type: 'token', count: collected })
      }
    }

    return events
  }
}
