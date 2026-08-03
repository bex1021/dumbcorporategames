import { scaleReach } from './fightConfig'
// GRAYBOX OPPONENT AI — one proven reactive core (human reaction delay,
// rise-blocking, mash gauge, whiff-punish) driving THREE personalities via
// profiles (blueprint: THE THREE BOUTS):
//
//   BRENT_AI  — The Wall: turtles, holds ground, punishes impatience; his real
//               weapon is Backlog Regen (bout-level, in fighterState).
//   PRIYA_AI  — The Storm: rushdown; short cooldowns chain Tiny Thoughts,
//               Quick Adds stack scope, Circle Back derails.
//   EXEC_AI   — The Exam: the patient counter-puncher, PHASE-GATED — adds
//               Threaten PIP below 66% Skepticism, the parry below 33%,
//               desperation (+10% tempo) below 20%. Adds moves, not speed.
//
// Still a placeholder for Build D's habit-reading intent tables — but the
// per-bout identity work lives here now, so Build D refines rather than
// replaces. Randomness is injectable for the seeded playtest harness.

import { leonard, opponent, NO_INTENT, type Intent } from './fighterState'

let rng: () => number = Math.random
export function setDummyRng(fn: () => number): void {
  rng = fn
}

export type AIProfile = {
  name: string
  // Which move id fills each role in this kit (absent = this fighter can't).
  moves: { jab: string; heavy: string; grab?: string; parry?: string; pip?: string; third?: string }
  cooldown: [number, number] // frames between offensive decisions (tempo)
  approach: number // chance to close distance while "thinking" (Brent holds ground)
  farDash: number // chance to dash in from way out
  riseBlock: [number, number] // guard frames after getting up / out of hitstun
  reactBlock: number // main defence vs fast strikes
  /** Chance a REACTED-TO heavy gets blocked. This used to be hardwired to 1.0 —
   *  every heavy the AI saw coming was guarded, no roll — which made the
   *  hurricane kick's whole payoff (the gut-fold) statistically invisible:
   *  measured over 200 trials it landed 19–25%, all of them only because she
   *  happened to be mid-attack. A wall blocks heavies; a rushdown would rather
   *  keep swinging. */
  heavyBlock: number
  reactCounter: number // parry chance vs fast strikes (needs parry)
  heavyCounter: number // parry chance vs a telegraphed heavy (needs parry)
  reactEvade: number // back-dash chance vs strikes
  throwStuff: number // jab-interrupt chance vs a throw read
  throwEvade: number // back-dash chance vs a throw read
  punish: number // chance to punish your recovery
  offense: { jab: number; heavy: number; third: number; pipMix: number } // weights; rest = turtle bait
  grabTurtle: number // chance to grab a blocking Leonard when close (needs grab/pip)
  antiAir: number // chance to poke Leonard out of a jump-in (vs blocking it)
  phaseGated: boolean // Exec only: gate pip/parry/desperation by remaining bar
}

// The tuned sandbag numbers, now the EXEC boss profile.
export const EXEC_AI: AIProfile = {
  name: 'exec',
  moves: { jab: 'jab', heavy: 'heavy', grab: 'grab', parry: 'parry', pip: 'pip' },
  cooldown: [22, 42], // the final boss presses harder than the sandbag did
  approach: 1,
  farDash: 0.2,
  riseBlock: [18, 28],
  reactBlock: 0.68,
  heavyBlock: 0.7,
  reactCounter: 0.2,
  heavyCounter: 0.72,
  reactEvade: 0.05,
  throwStuff: 0.15,
  throwEvade: 0.6,
  punish: 0.9,
  offense: { jab: 0.5, heavy: 0.2, third: 0, pipMix: 0.08 },
  grabTurtle: 0.7,
  antiAir: 0.6, // reads jump-ins well — the exam
  phaseGated: true,
}

export const BRENT_AI: AIProfile = {
  name: 'brent',
  moves: { jab: 'wellActually', heavy: 'scopeConcern', grab: 'hardStop' }, // no grab, no parry — a wall, not a hunter
  cooldown: [34, 58], // deliberate, but he answers
  approach: 0.3, // mostly holds ground — Backlog Regen makes YOU come to HIM
  farDash: 0,
  riseBlock: [16, 26],
  reactBlock: 0.6, // blocks plenty, but reads get through — he's the tutorial
  heavyBlock: 0.85, // The Wall: blocking the big obvious thing IS his identity
  reactCounter: 0,
  heavyCounter: 0,
  reactEvade: 0.06,
  throwStuff: 0.12,
  throwEvade: 0.3, // throws work on him — that's the lesson of Bout 1
  punish: 0.75,
  offense: { jab: 0.34, heavy: 0.26, third: 0, pipMix: 0 }, // rest = turtle: he'd rather block
  grabTurtle: 0.5, // the Wall now peels a turtle off its shell
  antiAir: 0.45, // solid but beatable — a jump-in is a fair opener on the wall
  phaseGated: false,
}

export const PRIYA_AI: AIProfile = {
  name: 'priya',
  moves: { jab: 'tinyThought', heavy: 'quickAdd', third: 'circleBack', grab: 'parkThat', parry: 'loveThatEnergy' },
  cooldown: [5, 12], // rushdown: decisions come FAST — the string is the danger
  approach: 1,
  farDash: 0.3,
  riseBlock: [8, 14], // barely guards — she'd rather keep talking
  reactBlock: 0.25,
  heavyBlock: 0.45, // the Storm would rather trade than guard
  reactCounter: 0.12, // Love That Energy — a spice, not a wall (0.26 made
  // her feel harder than the Exec: his parry is phase-gated to the endgame,
  // hers is on from the first exchange, so it must stay rare)
  heavyCounter: 0.22,
  reactEvade: 0.15, // slippery instead of sturdy
  throwStuff: 0.2,
  throwEvade: 0.35,
  punish: 0.9,
  offense: { jab: 0.6, heavy: 0.24, third: 0.13, pipMix: 0 }, // rest = a rare breath
  grabTurtle: 0.65,
  antiAir: 0.3, // heads-down rushdown — jump-ins are her weakness (variety!)
  phaseGated: false,
}

let profile: AIProfile = EXEC_AI
export function setOpponentProfile(p: AIProfile): void {
  profile = p
}

const STRIKE_RANGE = 0.96
const GRAB_RANGE = 0.9

let cooldown = 0
let blockFrames = 0
let walkRun = 0 // frames left in the current committed advance (anti-stutter)
const APPROACH_RUN = 14 // ~0.23s of continuous walking per decision
let prevSelfState = 'idle'
let prevLeoState = 'idle'
let reactedThisAttack = false
let leoStreak = 0
let sinceAttack = 0
let attackAge = 0
let reactBudget = 0
let recoveryAge = 0
let punishDelay = 0

const REACT_MIN = 11 // ~200ms human reaction window, shared by all profiles
const REACT_MAX = 19
const PUNISH_MIN = 9
const PUNISH_MAX = 16

export function resetDummy(): void {
  cooldown = 24
  blockFrames = 0
  walkRun = 0
  prevSelfState = 'idle'
  prevLeoState = 'idle'
  reactedThisAttack = false
  leoStreak = 0
  sinceAttack = 0
  attackAge = 0
  reactBudget = 0
  recoveryAge = 0
  punishDelay = 0
}

const block = (): Intent => ({ walk: 0, dash: 0, block: true, move: null })
const act = (move: string): Intent => ({ walk: 0, dash: 0, block: false, move })

// Exec phase gates (blueprint: adds moves, not speed).
function hpFrac(): number {
  return opponent.health / opponent.maxHealth
}
const pipAllowed = () => !!profile.moves.pip && (!profile.phaseGated || hpFrac() < 0.66)
const parryAllowed = () => !!profile.moves.parry && (!profile.phaseGated || hpFrac() < 0.5)
const desperate = () => profile.phaseGated && hpFrac() < 0.2

export function readDummyIntent(): Intent {
  // TRAINING SANDBAG: the capture harness needs the opponent to stand still
  // and take the hit, or every frame sequence is polluted by the AI fighting
  // back mid-measurement. Plain global check — an import.meta.env guard here
  // CRASHED the headless harness (tsx has no Vite env), and the flag is inert
  // unless something sets it anyway.
  if ((globalThis as { __sandbag?: boolean }).__sandbag) {
    return { walk: 0, dash: 0, block: false, move: null }
  }
  const o = opponent
  const dist = Math.abs(o.x - leonard.x)
  // A 1.28× body swings a 1.28× arm: the AI's spacing decisions scale with it,
  // or the giant walks IN to normal-body range and punches through the chest.
  const SR = STRIKE_RANGE * scaleReach(o.heightScale)
  const toward: -1 | 1 = leonard.x < o.x ? -1 : 1

  const leoAttacking = leonard.state === 'startup' || leonard.state === 'active'
  const leoNewAttack = leonard.state === 'startup' && prevLeoState !== 'startup'
  prevLeoState = leonard.state
  if (!leoAttacking) reactedThisAttack = false

  // Mash gauge + per-attack human reaction budget.
  if (leoNewAttack) {
    leoStreak = Math.min(leoStreak + 1, 5)
    sinceAttack = 0
    attackAge = 0
    reactBudget = randInt(REACT_MIN, REACT_MAX)
  } else if (++sinceAttack > 64) {
    leoStreak = 0
  }
  if (leoAttacking) attackAge++
  if (leonard.state === 'recovery') {
    if (recoveryAge === 0) punishDelay = randInt(PUNISH_MIN, PUNISH_MAX)
    recoveryAge++
  } else {
    recoveryAge = 0
  }

  // Busy — let the move/stun play out.
  if (o.state !== 'idle' && o.state !== 'walk') {
    prevSelfState = o.state
    return NO_INTENT
  }
  // BLOCK-PUNISH: a blocked jab leaves the ATTACKER at −4 — the whole point
  // of blocking is hitting back inside that window, and no profile ever did.
  // This is the readable, fair answer to mash pressure (measured: constant
  // jabs kept Brent at 4.4 attacks per round, 47% of them stuffed — the AI
  // never got a turn). A punished masher learns; a strobing AI would not be.
  if (prevSelfState === 'blockstun' && (o.state === 'idle' || o.state === 'walk')) {
    prevSelfState = o.state
    if (rng() < profile.punish && dist < STRIKE_RANGE * scaleReach(o.heightScale) * 1.1) {
      return act(profile.moves.jab)
    }
  }
  // Rise-blocking: come out of hitstun/knockdown guarding (kills stun-locks).
  if (prevSelfState === 'hitstun' || prevSelfState === 'knockdown') {
    prevSelfState = o.state
    blockFrames = randInt(profile.riseBlock[0], profile.riseBlock[1])
    return block()
  }
  prevSelfState = o.state

  if (blockFrames > 0) {
    blockFrames--
    return block()
  }

  // ── ANTI-AIR: Leonard is descending into range on a jump-in → poke him out
  // of the sky (a clean hit floors him) or, failing the read, block it. ──────
  if (leonard.airborne && leonard.y < 0.78 && leonard.vy < 1.2 && dist < 1.32) {
    if (rng() < profile.antiAir) return act(profile.moves.jab)
    blockFrames = randInt(10, 18)
    return block()
  }

  // ── REACTIVE DEFENSE (after the human delay) ──────────────────────────────
  if (leoAttacking && attackAge >= reactBudget && dist < 1.38 && !reactedThisAttack) {
    reactedThisAttack = true

    if (leonard.move?.kind === 'throw') {
      const rt = rng()
      if (rt < profile.throwStuff) return act(profile.moves.jab)
      if (rt < profile.throwStuff + profile.throwEvade) {
        return { walk: 0, dash: (toward === 1 ? -1 : 1) as -1 | 1, block: false, move: null }
      }
      return NO_INTENT // eats it
    }

    const r = rng()
    if (leonard.move?.heavy) {
      if (parryAllowed() && r < profile.heavyCounter) return act(profile.moves.parry!)
      if (r < profile.heavyCounter + profile.heavyBlock) {
        blockFrames = randInt(24, 34)
        return block()
      }
      return NO_INTENT // she committed to her own read — the heavy comes through
    }
    if (r < profile.reactBlock) {
      blockFrames = randInt(24, 36)
      return block()
    }
    if (parryAllowed() && r < profile.reactBlock + profile.reactCounter) return act(profile.moves.parry!)
    if (r < profile.reactBlock + profile.reactCounter + profile.reactEvade) {
      return { walk: 0, dash: (toward === 1 ? -1 : 1) as -1 | 1, block: false, move: null }
    }
    // else: eats it (a fresh read got through — fair)
  }

  // ── PUNISH your recovery (its damage engine; human-delayed) ───────────────
  if (
    leonard.state === 'recovery' &&
    recoveryAge >= punishDelay &&
    dist <= 1.14 &&
    rng() < profile.punish
  ) {
    cooldown = randInt(12, 22)
    if (profile.moves.grab && dist <= GRAB_RANGE && rng() < 0.3) return act(profile.moves.grab)
    return act(profile.moves.jab)
  }

  // ── MIX-UP: throw the turtle ──────────────────────────────────────────────
  // The human bots (and human players) answer everything with reactive block —
  // and blocking walled the whole roster to ~100% wins because no AI ever
  // threw a BLOCKING target. The triangle's third edge: guard up, in range,
  // grab available → grab often. Readable (grabs have 16–20f startup) and
  // counterable (dash the i-frames, or just don't hold block).
  if (
    leonard.blocking &&
    profile.moves.grab &&
    dist <= GRAB_RANGE * scaleReach(o.heightScale) &&
    cooldown <= 0 &&
    rng() < 0.55
  ) {
    cooldown = randInt(14, 26)
    return act(profile.moves.grab)
  }

  // ── OFFENSE cadence ────────────────────────────────────────────────────────
  if (cooldown > 0) {
    cooldown--
    // Advancing happens in COMMITTED RUNS, not a fresh coin-flip every frame.
    // Rolling per-frame made the AI stutter walk/idle/walk/idle at 60 Hz — on
    // capsules that read as "hesitant", but on a real body it reads as a
    // glitching character. The roll is divided by the run length, so the
    // expected share of time spent advancing (and therefore spacing, and
    // therefore balance) is unchanged — it's the same movement, in blocks.
    if (walkRun > 0 && dist > SR) {
      walkRun--
      return { walk: toward, dash: 0, block: false, move: null }
    }
    // Start-of-run probability that PRESERVES the old share of advancing time.
    // Naive `approach / RUN` is wrong: with runs of length L started at rate p,
    // the steady-state walking fraction is pL/(1+pL), not pL. Solving for the
    // target fraction f gives p = f / ((1-f)·L) — without this the AI advanced
    // ~33% of frames instead of ~50%, fights dragged, and Brent timed out.
    const f = Math.min(0.95, profile.approach)
    if (dist > SR && rng() < f / ((1 - f) * APPROACH_RUN)) {
      walkRun = APPROACH_RUN - 1
      return { walk: toward, dash: 0, block: false, move: null }
    }
    return NO_INTENT
  }

  const [cdMin, cdMax] = profile.cooldown
  const speed = desperate() ? 0.9 : 1 // Hard Stop desperation: +10% tempo
  cooldown = Math.round(randInt(cdMin, cdMax) * speed)
  const r = rng()

  if (dist > SR) {
    if (dist > 1.8 && r < profile.farDash) return { walk: 0, dash: toward, block: false, move: null }
    if (rng() < profile.approach) return { walk: toward, dash: 0, block: false, move: null }
    return NO_INTENT // Brent holds his ground and lets the backlog re-compile
  }

  // Never start a swing into your active hit.
  if (leonard.state === 'startup' || leonard.state === 'active') return NO_INTENT

  if (leonard.blocking) {
    // You're turtling. The Exec grabs (or PIPs); Brent/Priya keep poking chip.
    if (pipAllowed() && dist <= GRAB_RANGE && r < 0.3) return act(profile.moves.pip!)
    if (profile.moves.grab && dist <= GRAB_RANGE && r < profile.grabTurtle) return act(profile.moves.grab)
    if (profile.moves.grab && dist > GRAB_RANGE && r < 0.5) {
      return { walk: toward, dash: 0, block: false, move: null } // step into grab range
    }
    return act(profile.moves.jab)
  }

  const w = profile.offense
  if (r < w.jab) return act(profile.moves.jab)
  if (r < w.jab + w.heavy) return act(profile.moves.heavy)
  if (w.third > 0 && r < w.jab + w.heavy + w.third) return act(profile.moves.third!)
  if (pipAllowed() && r < w.jab + w.heavy + w.third + w.pipMix && dist <= GRAB_RANGE) {
    return act(profile.moves.pip!) // the raw steeple mixup
  }
  blockFrames = randInt(18, 32) // turtle bait — invites your throw
  return block()
}

function randInt(lo: number, hi: number): number {
  return lo + Math.floor(rng() * (hi - lo + 1))
}
