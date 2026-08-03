// The fight simulation — two character state machines on one lateral axis,
// stepped at a FIXED 60 Hz (see FightWorld). This is the load-bearing wall of
// Build C: movement, the strike/throw/block triangle, block-chip, hitstop,
// stun, meter, KO and the round clock. No physics engine — a hit is three
// comparisons (attacker active + in range + defender not blocking/invuln).
//
// Module-global mutable state, read by FightWorld (rendering) and FightHud
// (bars) — NOT React state, so nothing here triggers a 60fps re-render.

import { ARENA, BODY, MOVE, JUMP, VITALS, FEEL, STUN, ROUND, FRAME } from './fightConfig'
import { LEONARD_MOVES, OPP_MOVES, type MoveDef } from './frameData'
import { tierFor, nextLine, resetScript, type Tier } from './fightScript'

// How long a spoken line floats above a fighter (frames).
const CALLOUT_FRAMES = 48
// Shove-ramp normaliser: step(t) = distance * t * PUSH_NORM for t = N…1. The
// weights t=N..1 sum to N(N+1)/2, so PUSH_NORM makes the ramp deliver the
// distance EXACTLY — no snap-to-target needed, unlike a geometric decay (which
// never terminates and front-loads 0.37m+ into the first frame).
const PUSH_N = ARENA.throwPushFrames
const PUSH_NORM = 2 / (PUSH_N * (PUSH_N + 1)) // = 1/406 at N = 28

// ── Event hook (audio/FX) ────────────────────────────────────────────────────
// The sim is headless (the playtest harness runs it in Node), so it never
// touches Web Audio directly — FightWorld registers a handler in the browser.
// 'swing' fires the moment an attack STARTS, before anyone knows whether it
// will land. Every arcade fighter does this: the swing is unconditional, only
// the impact is earned. Without it a kick that gets blocked — or that you throw
// at nothing — is completely silent, which reads as the input being dropped.
export type FightEvent = 'swing' | 'swingHeavy' | 'whiff' | 'block' | 'hit' | 'hitHeavy' | 'throw' | 'counter' | 'ko'
let onFightEvent: ((e: FightEvent, voice?: number) => void) | null = null
export function setFightEventHandler(fn: ((e: FightEvent, voice?: number) => void) | null): void {
  onFightEvent = fn
}
function emit(e: FightEvent, voice?: number): void {
  onFightEvent?.(e, voice)
}


// ── Conversation tier (ratchet-up only: meetings don't get friendlier) ──────
let maxTier: Tier = 1
// Alternates the "hurt" reaction so light hits don't produce a wall of talk.
let hurtBeat = 0
function currentTier(): Tier {
  const minFrac = Math.min(leonard.health / leonard.maxHealth, opponent.health / opponent.maxHealth)
  const t = tierFor(minFrac, fight.time)
  if (t > maxTier) maxTier = t
  return maxTier
}

// ── Per-bout modifiers (set via resetFight opts by the bout manager) ────────
// Defaults reproduce the standalone Exec sandbag fight (harness compatibility).
export const fightMods = {
  regenPerSec: 0, // Brent's Backlog Regen: opponent Resistance re-compiles when unhit
  voice: 'exec', // fightScript side for the opponent's lines
}
const REGEN_GRACE = 120 // frames unhit before objections start re-compiling (~2s)
const SCOPE_STARTUP_PENALTY = 3 // frames added per Scope stack (the ask grows)
const DERAIL_FRAMES = 180 // 3s of J/K swap on a landed Derail

export type FState =
  | 'idle'
  | 'walk'
  | 'dash'
  | 'startup'
  | 'active'
  | 'recovery'
  | 'blockstun'
  | 'hitstun'
  | 'knockdown'

export type Fighter = {
  id: 'leonard' | 'opponent'
  x: number
  facing: 1 | -1 // +1 faces right, -1 faces left (always toward the other)
  walkDir: 0 | 1 | -1 // 0 still · +1 advancing · -1 retreating (drives walk clip)
  heightScale: number // 1 = normal build; the Exec is bigger, and reaches further
  prevX: number // position at the previous sim tick — render interpolation only
  prevY: number
  state: FState
  timer: number // frames left in the current sub-phase
  move: MoveDef | null
  moveHit: boolean // current active move already connected?
  hitsDone: number // connects so far this activation (multi-hit flurries)
  reArmT: number // frames until a multi-hit move's box goes live again
  health: number
  maxHealth: number
  meter: number // Alignment (bars) — Leonard spends it; both can build it
  blocking: boolean // holding block this frame
  invuln: number // >0 = dodging (back-dash i-frames)
  flash: number // frames of hurt/telegraph flash, for rendering
  dashDir: -1 | 0 | 1 // world-x direction of the current dash
  callout: string // the line currently floating above them ('' = none)
  calloutT: number // frames left on the callout
  scopeStacks: number // Priya's Scope Creep (0–3): +startup per stack; throw to descope
  hurtHeavy: boolean // was the CURRENT hitstun caused by a heavy? (routes the reaction clip)
  hurtSeq: number // increments on EVERY connect — the renderer re-jolts the reaction clip on change
  armorLeft: number // super-armor hits remaining on the current move
  keySwapT: number // frames left on the Derail J/K swap (hostile UI, 🔀)
  sinceDamage: number // frames since last damage taken (drives Backlog Regen)
  y: number // height above the floor (0 = grounded)
  vy: number // vertical velocity (jump)
  airborne: boolean
  airVX: number // horizontal drift while airborne
  meterDeniedT: number // frames left on the 'not enough Alignment' HUD nudge
  pushDist: number // signed metres still owed by a shove ramp
  pushT: number // ticks left in the ramp (0 = not sliding)
  airAttackUsed: boolean // one Jumping-In per hop
  moves: Record<string, MoveDef>
}

export type Intent = {
  walk: -1 | 0 | 1 // world-x direction held
  dash: -1 | 0 | 1 // one-frame dash pulse (world-x)
  block: boolean
  move: string | null // one-frame buffered attack id (must exist in fighter.moves)
  jump?: boolean // one-frame jump pulse (tap W)
}

export const NO_INTENT: Intent = { walk: 0, dash: 0, block: false, move: null }

export const leonard: Fighter = makeFighter('leonard', -1, LEONARD_MOVES)
export const opponent: Fighter = makeFighter('opponent', 1, OPP_MOVES)

export const fight = {
  started: false,
  over: false,
  winner: null as null | 'leonard' | 'opponent' | 'draw',
  time: ROUND.seconds, // seconds remaining (HARD STOP)
  hitstop: 0, // frames of global freeze (the "crunch")
  shake: 0, // current screenshake amplitude (m)
  round: 1,
  // How far we are between the last sim tick and the next, 0..1. Set by the
  // render loop; used only to interpolate drawn positions (see stepFight).
  alpha: 0,
  // Clean connects this bout, per side. The round-end card is a fighting-game
  // result screen and needs something to actually REPORT — a verdict with no
  // numbers under it is the thing that reads as unfinished.
  leoHits: 0,
  oppHits: 0,
  // last connect, for the HUD announcer / debug ("CLARIFY  6")
  lastHit: null as null | { by: 'leonard' | 'opponent'; move: string; dmg: number; kind: string },
}

function makeFighter(
  id: 'leonard' | 'opponent',
  side: -1 | 1,
  moves: Record<string, MoveDef>,
): Fighter {
  return {
    id,
    x: side * ARENA.startGap,
    facing: side === -1 ? 1 : -1,
    walkDir: 0,
    heightScale: 1,
    prevX: side * ARENA.startGap,
    prevY: 0,
    state: 'idle',
    timer: 0,
    move: null,
    moveHit: false,
    hitsDone: 0,
    reArmT: 0,
    health: id === 'leonard' ? VITALS.leonardMaxCredibility : VITALS.oppMaxResistance,
    maxHealth: id === 'leonard' ? VITALS.leonardMaxCredibility : VITALS.oppMaxResistance,
    meter: 0,
    blocking: false,
    invuln: 0,
    flash: 0,
    dashDir: 0,
    callout: '',
    calloutT: 0,
    scopeStacks: 0,
    hurtHeavy: false,
    hurtSeq: 0,
    armorLeft: 0,
    keySwapT: 0,
    sinceDamage: 9999,
    y: 0,
    vy: 0,
    airborne: false,
    airVX: 0,
    meterDeniedT: 0,
    pushDist: 0,
    pushT: 0,
    airAttackUsed: false,
    moves,
  }
}

function setCallout(f: Fighter, text: string): void {
  f.callout = text
  f.calloutT = CALLOUT_FRAMES
}

/** Tiered, sequential line for a move or defensive beat; falls back to the
 *  move's own baked-in line if the script has no entry for this slot. The
 *  opponent speaks in the active bout's voice (brent / priya / exec). */
function say(f: Fighter, slot: string, fallback?: string): void {
  const voice = f.id === 'leonard' ? 'leonard' : fightMods.voice
  const line = nextLine(voice, slot, currentTier()) ?? fallback
  if (line) setCallout(f, line)
}

export type ResetOpts = {
  oppMoves?: Record<string, MoveDef> // the bout's kit (default: the Exec sandbag)
  leoHP?: number // chain-carried starting Credibility (default 100)
  oppHP?: number // opponent's starting bar (receipts adjust this in Build A/F)
  regenPerSec?: number // Brent's Backlog Regen
  voice?: string // fightScript side for the opponent
  oppScale?: number // body size (the Exec looms) — drives vertical reach too
}

/** Full reset — fresh bout / rematch. No opts = the standalone Exec sandbag
 *  fight (keeps the playtest harness and dev flows unchanged). */
export function resetFight(opts: ResetOpts = {}): void {
  Object.assign(leonard, makeFighter('leonard', -1, LEONARD_MOVES))
  Object.assign(opponent, makeFighter('opponent', 1, opts.oppMoves ?? OPP_MOVES))
  if (opts.leoHP !== undefined) leonard.health = Math.min(leonard.maxHealth, opts.leoHP)
  if (opts.oppHP !== undefined) {
    // Opponent bar SIZE (the difficulty ramp up the org chart) — full at start.
    opponent.maxHealth = opts.oppHP
    opponent.health = opts.oppHP
  }
  opponent.heightScale = opts.oppScale ?? 1
  fightMods.regenPerSec = opts.regenPerSec ?? 0
  fightMods.voice = opts.voice ?? 'exec'
  resetScript()
  maxTier = 1
  fight.started = false
  fight.over = false
  fight.winner = null
  fight.time = ROUND.seconds
  fight.hitstop = 0
  fight.leoHits = 0
  fight.oppHits = 0
  fight.shake = 0
  fight.round = 1
  fight.alpha = 0
  fight.lastHit = null
}

/** Drawn position: eased between the last two sim ticks so motion stays smooth
 *  on displays that don't refresh at exactly 60 Hz. */
export function renderX(f: Fighter): number {
  return f.prevX + (f.x - f.prevX) * fight.alpha
}
export function renderY(f: Fighter): number {
  return f.prevY + (f.y - f.prevY) * fight.alpha
}

const actionable = (f: Fighter) => f.state === 'idle' || f.state === 'walk'

/** Advance the whole fight exactly one 60 Hz frame. */
export function stepFight(pIntent: Intent, oIntent: Intent): void {
  // Screenshake always decays (it reads well even during the freeze).
  fight.shake *= FEEL.shakeDecay
  if (fight.shake < 0.001) fight.shake = 0

  // Snapshot for RENDER INTERPOLATION. The sim runs at a fixed 60 Hz but the
  // display often doesn't (a ProMotion Mac is 120 Hz), so drawing raw sim
  // positions means the body only moves on every other drawn frame — which
  // reads as judder while walking. The renderer eases between prev and current
  // using fight.alpha, so motion is smooth at any refresh rate.
  //
  // PHOTOSENSITIVITY — this MUST stay above the two early returns below. The KO
  // tick applies knockdownPushback (0.72m) / throwPushback (2.05m) AFTER the
  // snapshot, then sets fight.over + 30 frames of hitstop. If prev is left
  // behind while x has already been shoved, renderX keeps lerping between two
  // FIXED points as fight.alpha re-cycles on every drawn frame — so the fighter
  // and the camera that tracks them strobe across a 0.7–2m gap at refresh rate,
  // for the whole KO freeze and the result card. Re-syncing prev every tick
  // (even a frozen one) makes that oscillation amplitude exactly zero.
  leonard.prevX = leonard.x
  leonard.prevY = leonard.y
  opponent.prevX = opponent.x
  opponent.prevY = opponent.y

  // HITSTOP: the crunch. Everything freezes; only the freeze counter ticks.
  if (fight.hitstop > 0) {
    fight.hitstop--
    return
  }

  if (!fight.started || fight.over) return

  advanceFighter(leonard, pIntent)
  advanceFighter(opponent, oIntent)
  separate()
  resolveHits()

  // BACKLOG REGEN (Brent's signature): left unhit, his objections re-compile.
  // Any damage — including chip — pauses it for REGEN_GRACE. Forces pressure;
  // poke-and-retreat cannot win Bout 1.
  if (fightMods.regenPerSec > 0 && opponent.sinceDamage > REGEN_GRACE && opponent.health > 0) {
    opponent.health = Math.min(opponent.maxHealth, opponent.health + fightMods.regenPerSec * FRAME)
  }

  // Round clock (frozen during hitstop by the early return above).
  fight.time -= FRAME
  if (fight.time <= 0 && !fight.over) judgeOnTime()
}

function advanceFighter(f: Fighter, intent: Intent): void {
  if (f.flash > 0) f.flash--
  if (f.invuln > 0) f.invuln--
  if (f.keySwapT > 0) f.keySwapT--
  if (f.meterDeniedT > 0) f.meterDeniedT--
  if (f.reArmT > 0) {
    f.reArmT--
    // Flurry: the hitbox comes back for the next rebuttal.
    if (f.reArmT === 0 && f.state === 'active') f.moveHit = false
  }
  f.sinceDamage++
  if (f.calloutT > 0 && --f.calloutT === 0) f.callout = ''

  // ── Vertical physics: runs in EVERY state so an air attack keeps falling ──
  if (f.airborne) {
    f.y += f.vy * FRAME
    f.vy -= JUMP.gravity * FRAME
    f.x += f.airVX * FRAME
    if (f.y <= 0) landFighter(f) // grounds → landing recovery (may override state)
  }

  // ── Shove ramp: runs in EVERY state, like the vertical physics above ──────
  // A throw used to assign its whole 2.05m in ONE tick — a teleport, with no
  // horizontal velocity field to carry it. The ramp pays the distance out over
  // throwPushFrames with monotonically shrinking steps, so the victim visibly
  // travels while the knockdown clip plays. Weights sum to 1 by construction, so
  // the FINAL x is identical to the old single-assignment — every balance number
  // that depends on post-throw spacing is untouched.
  if (f.pushT > 0) {
    f.x = clamp(f.x + f.pushDist * f.pushT * PUSH_NORM, -ARENA.halfWidth, ARENA.halfWidth)
    f.pushT--
  }

  // ── Locked states: run down the timer, then transition ──────────────────
  if (!actionable(f)) {
    if (f.state === 'dash') {
      f.x += MOVE.dashSpeed * FRAME * f.dashDir
    }
    // THE DIVE (see JUMP.diveFall): for the last diveFrames of an air attack's
    // startup — exactly the frames the clip swings down from its arch — drive
    // the body down and toward the foe, so the slam arrives ON the opponent
    // instead of connecting from hop height a metre away. Clamped with min so a
    // fall already faster than the dive is left alone; re-applying per frame is
    // idempotent. A too-low press just lands early → landing lag (committal,
    // and landFighter cleanly cancels the move).
    // ── THE LUNGE ─────────────────────────────────────────────────────────
    // A travelling strike has to actually travel. Mixamo bakes that travel into
    // the clip's root motion; scripts/mixamo/strip-horizontal.mjs removes it so
    // the sim stays the single source of world position — which means the sim
    // owes the distance back, or the animation swings at a spot the body never
    // reaches. That is exactly why the hurricane kick was missing.
    //
    // Paid out evenly across startup+active (never recovery — you commit to the
    // approach, you don't drift during the whiff), clamped to the arena, and
    // stopped short of the opponent so a lunge can never push through them.
    if (f.move?.lunge && (f.state === 'startup' || f.state === 'active')) {
      const span = f.move.startup + f.move.active
      const step = (f.move.lunge / span) * f.facing
      const foe = f === leonard ? opponent : leonard
      const next = clamp(f.x + step, -ARENA.halfWidth, ARENA.halfWidth)
      // keep at least minGap between centres, same rule the walk uses
      if (Math.abs(next - foe.x) >= ARENA.minGap || Math.abs(next - foe.x) > Math.abs(f.x - foe.x)) {
        f.x = next
      }
    }
    if (f.state === 'startup' && f.move?.air && f.airborne && f.timer <= JUMP.diveFrames) {
      f.vy = Math.min(f.vy, -JUMP.diveFall)
      f.airVX = f.facing * JUMP.diveForward
    }
    f.timer--
    if (f.timer <= 0) {
      switch (f.state) {
        case 'startup':
          f.state = 'active'
          f.timer = f.move ? f.move.active : 1
          break
        case 'active':
          // The swing found only air → the whiff cue (counters have no hitbox).
          if (!f.moveHit && f.move && f.move.kind !== 'counter') emit('whiff')
          f.state = 'recovery'
          f.timer = f.move ? f.move.recovery : 1
          break
        case 'knockdown':
          f.state = 'idle'
          f.move = null
          f.moveHit = false
          f.invuln = MOVE.wakeupInvuln // rise with brief i-frames — no meaty re-throw loop
          // Getting up is the comeback beat — they pick the argument back up.
          if (!fight.over) say(f, 'up')
          break
        case 'recovery':
        case 'dash':
        case 'blockstun':
        case 'hitstun':
          f.state = 'idle'
          f.move = null
          f.moveHit = false
          break
      }
    }
    return
  }

  // ── Airborne & free: the only ground rules don't apply — one air attack ──
  if (f.airborne) {
    f.blocking = false
    if (intent.move && !f.airAttackUsed && f.moves.jumpIn) {
      startMove(f, f.moves.jumpIn) // J/K in the air → Jumping In
      f.airAttackUsed = true
      return
    }
    f.state = 'idle' // floating (the airborne flag distinguishes it from grounded)
    return
  }

  // ── Actionable & grounded: read intent ──────────────────────────────────
  // Block is a turtle: you can hold it but not walk/attack while blocking.
  if (intent.block) {
    f.blocking = true
    f.state = 'idle'
    return
  }
  f.blocking = false

  if (intent.jump) {
    startJump(f, intent.walk)
    return
  }

  if (intent.dash !== 0) {
    startDash(f, intent.dash)
    return
  }

  if (intent.move && f.moves[intent.move]) {
    const def = f.moves[intent.move]
    if (f.meter >= def.meterCost) {
      startMove(f, def)
      return
    }
    // NOT ENOUGH METER. This used to fail SILENTLY, which is why pressing I
    // read as "that key does nothing" — the special costs 3 bars of Alignment
    // and you have to land 3 hits first. Flag it so the HUD can say so.
    if (def.meterCost > 0) f.meterDeniedT = 48
  }

  if (intent.walk !== 0) {
    f.state = 'walk'
    // Advancing or retreating? Drives both the walk clip and the speed penalty —
    // fighters back off still facing their opponent, so this isn't just facing.
    f.walkDir = intent.walk === f.facing ? 1 : -1
    const speed = MOVE.walkSpeed * (f.walkDir === -1 ? MOVE.backSpeedMult : 1)
    f.x += speed * FRAME * intent.walk
  } else {
    f.state = 'idle'
    f.walkDir = 0
  }
}

function startMove(f: Fighter, def: MoveDef): void {
  f.meter -= def.meterCost
  f.state = 'startup'
  f.armorLeft = def.armor ?? 0
  // You hear the effort the moment it is committed, win or lose.
  emit(def.heavy ? 'swingHeavy' : 'swing')
  f.move = def
  // SCOPE CREEP: each stack slows your wind-up — the ask keeps growing.
  f.timer = def.startup + f.scopeStacks * SCOPE_STARTUP_PENALTY
  f.moveHit = false
  f.hitsDone = 0
  f.reArmT = 0
  say(f, def.id, def.line) // the move announces itself, at the meeting's temperature
}

function startJump(f: Fighter, dir: -1 | 0 | 1): void {
  f.airborne = true
  f.vy = JUMP.impulse
  f.airVX = dir * JUMP.moveSpeed // drift toward the held direction on takeoff
  f.airAttackUsed = false
  f.state = 'idle'
}

function landFighter(f: Fighter): void {
  const lag = f.airAttackUsed ? JUMP.attackLandingLag : JUMP.landingLag
  f.airborne = false
  f.y = 0
  f.vy = 0
  f.airVX = 0
  f.airAttackUsed = false
  f.blocking = false
  f.state = 'recovery' // landing lag — jump-ins are committal
  f.move = null
  f.moveHit = false
  f.timer = lag
}

function startDash(f: Fighter, dir: -1 | 1): void {
  f.state = 'dash'
  f.timer = MOVE.dashFrames
  f.dashDir = dir
  // A dash AWAY from the opponent is a back-dash → i-frames (the PIP answer).
  const away = f.id === 'leonard' ? dir < 0 : dir > 0
  f.invuln = away ? MOVE.dashInvulnFrames : 0
  if (away) say(f, 'dodge')
}

/** Keep both fighters inside the arena and never crossing over. */
function separate(): void {
  leonard.x = clamp(leonard.x, -ARENA.halfWidth, ARENA.halfWidth)
  opponent.x = clamp(opponent.x, -ARENA.halfWidth, ARENA.halfWidth)
  const minGap = ARENA.minGap * ((leonard.heightScale + opponent.heightScale) / 2)
  if (opponent.x - leonard.x < minGap) {
    const mid = (leonard.x + opponent.x) / 2
    leonard.x = mid - minGap / 2
    opponent.x = mid + minGap / 2
  }
}

/** The whole combat interaction: for each attacker in active frames, one hit. */
function resolveHits(): void {
  tryConnect(leonard, opponent)
  tryConnect(opponent, leonard)
}

function tryConnect(att: Fighter, def: Fighter): void {
  if (att.state !== 'active' || !att.move || att.moveHit) return
  const m = att.move
  if (m.kind === 'counter') return // a counter-stance has no offensive hitbox
  const dist = Math.abs(att.x - def.x)
  // A BIGGER BODY IS A BIGGER TARGET. The Exec at 1.28× has a visually wider
  // torso, but the connect check treated him as normal-sized — so at the range
  // where a jab LOOKS in range against his bulk (1.0–1.3m), it whiffed.
  // Measured: exec_sweep showed identical connect windows at both scales, which
  // is the bug, not a feature. Genre rule: giants trade power for hittability.
  const hurtBonus = (def.heightScale - 1) * BODY.radius
  // …and a bigger ATTACKER swings a longer arm. Without this the 1.28× Exec
  // closed to normal-body distance before his (scale-blind) reach connected —
  // and his oversized fist ended up INSIDE Leonard's chest. His strikes now
  // connect from proportionally further, where the fist visually lands ON the
  // target. Both rules together are the genre contract for giants: easier to
  // hit, and longer arms.
  const reachScaled = m.reach * att.heightScale
  if (dist > reachScaled + Math.max(0, hurtBonus)) return
  // ── Vertical reach: ASYMMETRIC, and it scales with the fighter ────────────
  // Striking DOWN out of a jump covers the whole arc; reaching UP from the
  // ground stops around head height. A big opponent (the Exec) both reaches
  // higher and is easier to land on, so both windows scale with body size.
  const dy = att.y - def.y
  const up = JUMP.vReach * att.heightScale // attacker swinging upward
  const down = JUMP.airStrikeReach * att.heightScale // attacker falling onto them
  if (dy > 0 ? dy > (m.air ? down : up) : -dy > up) return
  att.moveHit = true // one connect per active window…
  att.hitsDone++
  // …unless this is a MULTI-HIT flurry with rebuttals left, in which case the
  // box re-arms after reArm frames (see MoveDef.hits).
  const maxHits = m.hits ?? 1
  if (att.hitsDone < maxHits) att.reArmT = m.reArmSeq?.[att.hitsDone - 1] ?? m.reArm ?? 8

  // Defender dodged (dash i-frames) → clean whiff, no effect.
  if (def.invuln > 0) return

  // COUNTER: def is in an active counter-stance and the incoming move is a
  // grounded STRIKE/special → it reflects onto the attacker. Throws AND air
  // attacks are NOT reflected (you can't "yes-and" a grab or someone leaping
  // at you from above).
  if (m.kind !== 'throw' && !m.air && def.state === 'active' && def.move?.kind === 'counter') {
    applyCounter(def, att)
    return
  }

  if (m.kind === 'throw') {
    // You can't grab someone already floored, reeling, or AIRBORNE — throw
    // whiffs on a knocked-down / hit-stunned / mid-air target. (The airborne
    // rule is also what stops jump from being grab-immune-and-safe: you must
    // land, and landing lag is your risk.)
    if (def.state === 'knockdown' || def.state === 'hitstun' || def.y > JUMP.groundedY) return
    // A throw that reached `active` uninterrupted grabs — ignores block.
    // (STRIKE-beats-THROW is emergent: a strike landing during the throw's
    // startup would have put the thrower in hitstun and dropped it.)
    applyThrow(att, def, m)
    return
  }

  // Strike / special.
  const canBlock = def.blocking && (def.state === 'idle' || def.state === 'walk')
  if (canBlock && m.blockable) {
    applyBlock(att, def, m) // BLOCK beats STRIKE — chip only
  } else {
    applyHit(att, def, m) // clean connect
  }
}

// The mash punish: whoever attacked into the counter takes the reflect.
function applyCounter(counterer: Fighter, attacker: Fighter): void {
  const dmg = counterer.move ? counterer.move.damage : 12
  attacker.health = Math.max(0, attacker.health - dmg)
  attacker.sinceDamage = 0
  attacker.state = 'hitstun'
  attacker.timer = STUN.hitHeavy
  attacker.blocking = false
  attacker.move = null
  attacker.moveHit = false
  attacker.flash = 8
  counterer.state = 'recovery' // the stance resolves into its recovery
  counterer.timer = counterer.move ? counterer.move.recovery : 12
  say(counterer, 'parry', counterer.move?.line ?? 'Actually — great point.')
  gainMeter(counterer, VITALS.meterOnHit)
  fight.hitstop = FEEL.hitstopHeavy
  fight.shake = Math.max(fight.shake, FEEL.shakeHeavy)
  emit('counter')
  if (counterer.move) record(counterer, counterer.move)
  checkKO(counterer, attacker)
}

function applyHit(att: Fighter, def: Fighter, m: MoveDef): void {
  // SUPER ARMOR: a strike into an armored wind-up deals damage but does NOT
  // interrupt — the armored fighter powers through. Throws and counters ignore
  // armor (the triangle stays intact: throw beats armor beats strike).
  if (
    def.armorLeft > 0 &&
    def.move &&
    (def.state === 'startup' || def.state === 'active') &&
    m.kind === 'strike'
  ) {
    def.armorLeft--
    def.health = Math.max(0, def.health - m.damage)
    def.flash = 6
    def.sinceDamage = 0
    if (att.id === 'leonard') fight.leoHits++
    else fight.oppHits++
    fight.hitstop = Math.max(fight.hitstop, FEEL.hitstopLight)
    emit('hit')
    record(att, m)
    checkKO(att, def)
    return
  }
  def.health = Math.max(0, def.health - m.damage)
  if (att.id === 'leonard') fight.leoHits++
  else fight.oppHits++
  def.sinceDamage = 0
  def.blocking = false
  def.move = null
  def.moveHit = false
  def.flash = 6
  if (m.applyScope) def.scopeStacks = Math.min(3, def.scopeStacks + 1) // the ask grows
  if (m.derail) def.keySwapT = DERAIL_FRAMES // hostile UI: your keys stop meaning what they meant
  // Hit while AIRBORNE → slammed to the floor, knocked down (anti-air payoff).
  if (def.airborne) {
    def.airborne = false
    def.y = 0
    def.vy = 0
    def.airVX = 0
    def.airAttackUsed = false
    def.state = 'knockdown'
    def.timer = STUN.knockdown
    gainMeter(att, VITALS.meterOnHit)
    fight.hitstop = FEEL.hitstopHeavy
    fight.shake = Math.max(fight.shake, FEEL.shakeHeavy)
    emit('hitHeavy')
    record(att, m)
    checkKO(att, def)
    return
  }
  // MULTI-HIT: only the LAST rebuttal floors. Every hit of the 5-hit super was
  // treated as a clean heavy, so hit 1 knocked the victim down AND shoved them
  // 0.72m — out of range of hits 2-5, which then whiffed. Measured: the super
  // landed 1 of 5 at 1.9m and 4 of 5 point-blank, while flinging the opponent
  // 1.87m away. Standard genre rule: intermediate hits stagger, the finisher
  // knocks down.
  const finalHit = att.hitsDone >= (m.hits ?? 1)
  if ((m.floors ?? m.heavy) && finalHit) {
    // A clean heavy FLOORS them (audit P0-1) — the payoff for the hard read.
    // Knockdown + shove; wakeup i-frames prevent any loop.
    def.state = 'knockdown'
    def.timer = STUN.knockdown
    const dir = def.x < att.x ? -1 : 1
    // Paid out over PUSH_N ticks by the shove ramp in advanceFighter — same
    // final position, but the freeze-frame keeps the victim AT the point of
    // contact (hitstop early-returns before the ramp runs), then you SEE them
    // stumble away instead of blinking 0.72m in a single tick.
    def.pushDist = dir * ARENA.knockdownPushback
    def.pushT = PUSH_N
    att.scopeStacks = 0 // flooring them clears the pile of asks — a descope
    // Getting floored is a CONCESSION, and it should sound like one.
    say(def, 'floored')
  } else {
    // …including the non-final hits of a flurry, which stagger in place so the
    // rest of the combination can actually reach.
    def.state = 'hitstun'
    def.hurtHeavy = !!m.heavy
    def.hurtSeq++
    // Heavy-weight hits that don't floor (the hurricane kick, a flurry's
    // intermediate rebuttals) get the longer stagger — the body has to visibly
    // absorb it, or a 15-damage kick flinches no harder than a 3-damage jab.
    // Gut-hit staggers (heavy, non-flooring) hold longest — the doubled-over
    // pose IS the payoff, and it needs screen time to read.
    def.timer = m.heavy ? ((m.floors ?? true) === false ? STUN.gutHit : STUN.hitHeavy) : STUN.hitLight
    // COMBO-STRINGING: intermediate hits of a multi-hit hold the victim in
    // hitstun until the NEXT hit arrives. The flurry's measured gaps are
    // 14/50/35 frames against a 30-frame stagger — without this the victim
    // recovered inside the 50-frame gap and BLOCKED rebuttals 3 and 4, which is
    // why the 4-hit super produced two punch sounds and two thuds. Once hit 1
    // of a combo lands clean, the rest of the string connects; that is the
    // genre contract, and the meter/damage economy already assumes it.
    if ((m.hits ?? 1) > 1 && att.hitsDone < (m.hits ?? 1)) {
      const gapToNext = m.reArmSeq?.[att.hitsDone - 1] ?? m.reArm ?? 0
      def.timer = Math.max(def.timer, gapToNext + 6)
    }
    if (m.heavy && !(m.floors ?? m.heavy)) {
      // …and a SHOVE, through the same ramp a knockdown uses. Without it the
      // spinning leg sweeps through the exact space the victim's torso still
      // occupies — no physics stops the interpenetration, so the victim moving
      // OUT of the arc is what sells the contact.
      const dir = def.x < att.x ? -1 : 1
      def.pushDist = dir * 0.5
      def.pushT = PUSH_N
    }
    // NOTE: ARENA.hitPushback is 0 by design — the visible recoil is rendered,
    // not simulated (see fightConfig). Left wired so it can be dialled up if
    // the spacing maths ever changes.
    if (ARENA.hitPushback > 0) {
      const dir = def.x < att.x ? -1 : 1
      def.x = clamp(def.x + dir * ARENA.hitPushback, -ARENA.halfWidth, ARENA.halfWidth)
    }
    // A point landing on you gets a reaction. Every OTHER light hit, and only
    // when they aren't already mid-line — a fast exchange otherwise turns into
    // two people talking over each other without pause.
    hurtBeat++
    if (def.calloutT <= 0 && hurtBeat % 2 === 0) say(def, 'hurt')
  }
  // SPECIALS BUILD NO METER. Standard fighting-game rule, and load-bearing
  // here: the 5-hit super would otherwise refund 5 bars for a 3-bar cost and be
  // infinitely repeatable (measured — meter came back to full mid-super).
  if (m.kind !== 'special') gainMeter(att, VITALS.meterOnHit)
  fight.hitstop = m.heavy ? FEEL.hitstopHeavy : FEEL.hitstopLight
  fight.shake = Math.max(fight.shake, m.heavy ? FEEL.shakeHeavy : FEEL.shakeLight)
  emit(m.heavy ? 'hitHeavy' : 'hit')
  record(att, m)
  checkKO(att, def)
}

function applyBlock(att: Fighter, def: Fighter, m: MoveDef): void {
  const chip = Math.max(1, Math.round(m.damage * 0.08)) // "listening costs something"
  // Chip is NON-LETHAL — you can't be chipped to death through a block. This is
  // what stops mash-into-block from slowly winning; you must land clean / throw.
  def.health = Math.max(1, def.health - chip)
  def.sinceDamage = 0 // even chip pauses Backlog Regen — pressure is pressure
  def.state = 'blockstun'
  def.timer = m.heavy ? STUN.blockHeavy : STUN.block
  def.flash = 3
  // The blocked ATTACKER is pushed out (audit P1-4) — spacing resets, so close
  // range is an ebb and flow instead of a stationary blender.
  const dir = att.x < def.x ? -1 : 1
  att.x = clamp(att.x + dir * ARENA.blockPushback, -ARENA.halfWidth, ARENA.halfWidth)
  say(def, 'block') // "Mm-hm." → "…okay." → "Uh-huh." as the meeting sours
  gainMeter(def, VITALS.meterOnBlock) // blocking builds YOUR meter
  fight.hitstop = FEEL.blockHitstop
  emit('block')
  record(att, { ...m, name: m.name + ' (blocked)', damage: chip })
  checkKO(att, def)
}

function applyThrow(att: Fighter, def: Fighter, m: MoveDef): void {
  def.health = Math.max(0, def.health - m.damage)
  if (att.id === 'leonard') fight.leoHits++
  else fight.oppHits++
  def.sinceDamage = 0
  att.scopeStacks = 0 // taking it offline DESCOPES — the pile of asks clears
  def.state = 'knockdown'
  def.timer = STUN.knockdown
  def.blocking = false
  def.move = null
  def.moveHit = false
  def.flash = 8
  // A throw SHOVES them away (you hand off the invite and they stumble back).
  // The spacing is what prevents a throw loop — you can't immediately re-grab a
  // downed opponent; you have to re-approach, and they get up before you arrive.
  const dir = def.x < att.x ? -1 : 1
  // Paid out over PUSH_N ticks by the shove ramp in advanceFighter — same final
  // position, but you SEE them stumble instead of blinking backwards.
  def.pushDist = dir * ARENA.throwPushback
  def.pushT = PUSH_N
  gainMeter(att, VITALS.meterOnHit)
  fight.hitstop = FEEL.hitstopThrow
  fight.shake = Math.max(fight.shake, FEEL.shakeHeavy * 0.7)
  emit('throw')
  record(att, m)
  checkKO(att, def)
}

function gainMeter(f: Fighter, amount: number): void {
  f.meter = Math.min(VITALS.meterMax, f.meter + amount * VITALS.meterPerBar)
}

function record(att: Fighter, m: MoveDef): void {
  fight.lastHit = { by: att.id, move: m.name, dmg: m.damage, kind: m.kind }
}

function checkKO(att: Fighter, def: Fighter): void {
  if (def.health <= 0 && !fight.over) {
    fight.over = true
    fight.winner = att.id
    // KO freeze-frame (audit P1-6): hold the connect ~half a second before the
    // result card. stepFight still drains hitstop after `over`, so the route
    // waits for hitstop === 0 to raise the card.
    fight.hitstop = Math.max(fight.hitstop, FEEL.koFreeze)
    emit('ko')
  }
}

function judgeOnTime(): void {
  fight.over = true
  const lp = leonard.health / leonard.maxHealth
  const op = opponent.health / opponent.maxHealth
  fight.winner = lp === op ? 'draw' : lp > op ? 'leonard' : 'opponent'
}

function clamp(v: number, lo: number, hi: number): number {
  return v < lo ? lo : v > hi ? hi : v
}
