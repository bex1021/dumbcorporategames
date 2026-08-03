// Phase 4 (Performance Review) balance harness — autopilot-playtest skill.
//
// Drives the REAL fight sim (src/perfreview/fighterState.stepFight) headlessly
// in Node against the REAL sandbag AI (dummyAI), so there's no rAF throttling
// and every run is seed-reproducible. Bots supply Leonard's intent; we measure
// win rate, health margins, match length, and whether any one strategy
// dominates. One brain (the sim), two bodies (game + this harness).

import { makeRng } from '../../src/jirarun/rng'
import {
  leonard,
  opponent,
  fight,
  stepFight,
  resetFight,
  NO_INTENT,
  type Intent,
  type ResetOpts,
} from '../../src/perfreview/fighterState'
import {
  readDummyIntent,
  resetDummy,
  setDummyRng,
  setOpponentProfile,
  EXEC_AI,
  BRENT_AI,
  PRIYA_AI,
  type AIProfile,
} from '../../src/perfreview/dummyAI'
import { BOUTS } from '../../src/perfreview/boutState'

const HARD_STOP = 99 * 60 // frames
const walk = (dir: -1 | 1): Intent => ({ walk: dir, dash: 0, block: false, move: null })
const act = (move: string): Intent => ({ walk: 0, dash: 0, block: false, move })
const block = (): Intent => ({ walk: 0, dash: 0, block: true, move: null })
const toward = (): -1 | 1 => (opponent.x > leonard.x ? 1 : -1)
const dist = () => Math.abs(opponent.x - leonard.x)
const actionable = () => leonard.state === 'idle' || leonard.state === 'walk'

type Bot = (rng: () => number) => Intent

// ── Personalities ───────────────────────────────────────────────────────────

const masher = (move: string): (() => Bot) => () => () =>
  dist() <= 0.93 ? act(move) : walk(toward())

const mixMasher = (): Bot => {
  let t = 0
  return () => (dist() <= 0.93 ? act(t++ % 2 ? 'clarify' : 'pushback') : walk(toward()))
}

const thrower = (): Bot => () => (dist() <= 0.9 ? act('offline') : walk(toward())) // spam throw

const randomBot = (): Bot => (rng) => {
  if (dist() > 0.96) return walk(toward())
  const r = rng()
  if (r < 0.3) return act('clarify')
  if (r < 0.45) return act('pushback')
  if (r < 0.6) return act('offline')
  if (r < 0.8) return block()
  return NO_INTENT
}

// The triangle DECISION (perfect reads). Shared by the perfect bot and the
// human bot below.
function triangleDecide(rng: () => number, jabReady: boolean): Intent {
  const o = opponent
  const d = dist()
  const dir = toward()
  const threat = o.state === 'startup' || o.state === 'active'
  const kind = o.move?.kind
  // Downed/stunned/invulnerable opponents can't be thrown (audit rules) — wait
  // out the wakeup at spacing instead of whiffing into their rise.
  if (o.state === 'hitstun' || o.state === 'knockdown' || o.invuln > 0)
    return d > 1.08 ? walk(dir) : NO_INTENT
  if ((kind === 'counter' && threat) || o.blocking) return d <= 0.9 ? act('offline') : walk(dir)
  if (kind === 'throw' && threat && d < 1.2) return act('clarify')
  if (threat && (kind === 'strike' || kind === 'special') && d < 1.32) return block()
  if (o.state === 'recovery' && d <= 1.14) return act('pushback')
  if (d > 0.96) return walk(dir)
  if (rng() < 0.4) return act('offline')
  if (jabReady) return act('clarify')
  return NO_INTENT
}

// Competent bot with PERFECT, instant reads and frame-tight punishes. Proves
// the game is winnable in principle (fairness), NOT what a human can do.
const triangle = (): Bot => {
  let jabCd = 0
  return (rng) => {
    if (!actionable()) return NO_INTENT
    if (jabCd > 0) jabCd--
    const i = triangleDecide(rng, jabCd === 0)
    if (i.move === 'clarify') jabCd = 40
    return i
  }
}

// HUMAN-LIKE bot: same strategy, but capped reaction speed (can only change its
// mind every `reactFrames` — a real ~200-300ms reaction) and an `errorRate` of
// wrong reads. This is the honest model of a person playing. If THIS loses, the
// game is too hard for humans even though `triangle` wins 100%.
const human = (reactFrames: number, errorRate: number): (() => Bot) => () => {
  let cd = 0
  let jabCd = 0
  let committed: Intent = NO_INTENT
  return (rng) => {
    if (!actionable()) return NO_INTENT
    if (jabCd > 0) jabCd--
    if (cd > 0) {
      cd--
      return committed // hold the last reaction (can't re-react instantly)
    }
    cd = reactFrames
    if (rng() < errorRate) {
      const r = rng() // a misread: wrong answer
      committed = r < 0.4 ? act('clarify') : r < 0.7 ? block() : act('offline')
    } else {
      committed = triangleDecide(rng, jabCd === 0)
      if (committed.move === 'clarify') jabCd = 40
    }
    return committed
  }
}

// ── Runner ────────────────────────────────────────────────────────────────

type Result = { win: boolean; draw: boolean; leo: number; exec: number; frames: number; timeout: boolean }

type BoutSetup = { profile: AIProfile; reset: ResetOpts }

function playMatch(makeBot: () => Bot, seed: number, setup?: BoutSetup): Result {
  const rng = makeRng(seed)
  setDummyRng(rng)
  setOpponentProfile(setup?.profile ?? EXEC_AI)
  resetFight(setup?.reset ?? {})
  resetDummy()
  fight.started = true
  const bot = makeBot()
  let frames = 0
  while (!fight.over && frames < HARD_STOP) {
    stepFight(bot(rng), readDummyIntent())
    frames++
  }
  const timeout = !fight.over
  if (timeout) {
    // judge like the sim does
    fight.winner = leonard.health >= opponent.health ? 'leonard' : 'opponent'
  }
  return {
    win: fight.winner === 'leonard',
    draw: fight.winner === 'draw',
    leo: leonard.health,
    exec: opponent.health,
    frames,
    timeout,
  }
}

function run(name: string, makeBot: () => Bot, setup?: BoutSetup, n = 300) {
  let wins = 0, draws = 0, timeouts = 0, leoSum = 0, execSum = 0, frameSum = 0
  for (let s = 1; s <= n; s++) {
    const r = playMatch(makeBot, s * 7919, setup)
    if (r.win) wins++
    if (r.draw) draws++
    if (r.timeout) timeouts++
    leoSum += r.leo
    execSum += r.exec
    frameSum += r.frames
  }
  const pct = (x: number) => ((x / n) * 100).toFixed(0) + '%'
  console.log(
    `${name.padEnd(16)} win ${pct(wins).padStart(4)}  ` +
      `avgLeoHP ${(leoSum / n).toFixed(0).padStart(3)}  avgExecHP ${(execSum / n).toFixed(0).padStart(3)}  ` +
      `timeouts ${pct(timeouts).padStart(4)}  avgSecs ${(frameSum / n / 60).toFixed(1)}`,
  )
}

// ── Per-bout battery (Build C2/D validation) ─────────────────────────────────
// Targets (blueprint THE THREE BOUTS, human-model rows):
//   Brent ~85% · Priya ~60–70% · Exec ~40–50% first-try.
// NOTE: Priya's Derail swaps KEYBOARD keys; bots issue intents directly, so
// bots slightly under-rate her difficulty vs a real player.

const PROFILE_FOR = { turtle: BRENT_AI, rushdown: PRIYA_AI, boss: EXEC_AI } as const

console.log('\n=== PHASE 4 — the gauntlet · per-bout balance battery (300 seeds/row) ===')
for (const bout of BOUTS) {
  const setup: BoutSetup = {
    profile: PROFILE_FOR[bout.ai],
    // oppScale was MISSING here for the battery's whole life — every Exec row
    // tested a phantom 1.0× opponent with none of his size mechanics (arm
    // reach, hurtbox, AI spacing). Single-source-of-truth means passing ALL of
    // the bout's parameters, not most of them.
    reset: {
      oppMoves: bout.moves,
      oppHP: bout.startHP,
      oppScale: bout.oppScale,
      regenPerSec: bout.regenPerSec,
      voice: bout.voice,
    },
  }
  console.log(`\n── ${bout.cardTitle} · vs ${bout.name} ──`)
  run('mash Jab', masher('clarify'), setup)
  run('spam Throw', thrower, setup)
  run('random', randomBot, setup)
  run('TRIANGLE perfect', triangle, setup)
  run('human good', human(12, 0.15), setup)
  run('human avg', human(18, 0.3), setup)
  run('human rusty', human(26, 0.45), setup)
}
console.log('\nRead: human rows vs targets — Brent ~85% · Priya ~60–70% · Exec ~40–50%.')
console.log('TRIANGLE should stay high everywhere (fairness floor).\n')
