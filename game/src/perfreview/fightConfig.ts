// Performance Review (Phase 4) — Build C tunables.
//
// One place for every number the capsule graybox trades on. Frame data lives
// in frameData.ts; this is the arena, movement, camera and feel budget. The
// sim runs a FIXED 60 Hz step (see FightWorld), so "frames" everywhere means
// 1/60 s ticks — the currency a real fighter is tuned in.

export const FPS = 60
export const FRAME = 1 / FPS // seconds per sim tick

// ── Arena (single lateral axis: the conference table's long edge) ───────────
// SPATIAL SCALE (2026-07-23): all distances were rescaled ×0.6 when the real
// human models replaced the capsules — a 1.8m person's arm reaches ~0.7m, so
// the old capsule-era reaches left them punching air. Speeds scaled by the
// same factor, so frames-to-close-distance (and therefore balance) is
// unchanged; it's a pure visual re-proportioning to real close quarters.
export const ARENA = {
  halfWidth: 3.7, // fighters clamp to ±halfWidth on x
  minGap: 0.7, // closest the two bodies may stand (no crossing over)
  startGap: 1.8, // half-distance between fighters at round start (gap = 3.6)
  throwPushback: 2.05, // how far a throw shoves the victim (breaks throw loops)
  // A shove is spread over frames so it reads as a STUMBLE, not a teleport.
  // Linear ramp-down: step(t) = distance * t * PUSH_NORM for t = N…1, where
  // PUSH_NORM = 2/(N*(N+1)). The weights sum to N(N+1)/2, so the ramp delivers
  // the distance EXACTLY — final spacing (the throw-loop guard) is unchanged.
  throwPushFrames: 28,
  blockPushback: 0.24, // blocked hit pushes the ATTACKER out — spacing resets (P1-4)
  hitPushback: 0, // deliberately ZERO — see AnimatedFighter's RECOIL. Real
  // pushback on light hits was tried and measured: even 0.12 m sent Brent's
  // timeout rate from 9% to 24%, because every jab reset the spacing a turtle
  // with regen then profits from. The visible flinch-recoil is done in the
  // RENDERER instead: it looks identical and costs the sim nothing.
  knockdownPushback: 0.72, // clean heavy floors AND shoves — no standing on a downed foe
  floorZ: 0,
}

// ── Fighter body + movement ─────────────────────────────────────────────────
export const BODY = {
  radius: 0.42,
  height: 1.75,
}

export const MOVE = {
  walkSpeed: 2.05, // m/s (×0.6 with the spatial rescale — same frames to close)
  backSpeedMult: 0.72, // retreating is SLOWER than advancing — genre-standard
  // (SF/Tekken): backing out of range must cost something, or spacing pressure
  // never builds. Bots always walk toward, so this doesn't move balance.
  dashSpeed: 5.7, // m/s during a dash
  dashFrames: 14, // dash duration
  dashInvulnFrames: 8, // back-dash i-frames cover startup 1..8 (the PIP answer)
  wakeupInvuln: 14, // i-frames on rising from knockdown — no "meaty" re-throw/okizeme loops
  doubleTapWindow: 0.26, // s — second tap must land within this to dash
}

// ── Jump ("Let me jump in—"): the one vertical option. Tap W. Genre-standard:
// jump is a DIRECTION, not a button; an attack in the air = the air version.
export const JUMP = {
  impulse: 4.6, // ×0.6 → ~0.8m apex (human-scale hop), same ~0.7s air time
  gravity: 13.2, // m/s² (scaled with impulse so air TIME is unchanged)
  moveSpeed: 1.92, // horizontal drift while airborne (hold A/D on takeoff)
  landingLag: 7, // frames of recovery on landing a plain hop
  attackLandingLag: 13, // more if you threw an air attack — jump-ins are committal
  vReach: 0.75, // how high a GROUNDED fighter can swing (anti-air ceiling)
  airStrikeReach: 1.35, // how far a LEAPING fighter strikes DOWNWARD.
  // Asymmetric on purpose. The old symmetric ±0.75 band was shorter than the
  // 0.80 m jump apex, so a jump-in passed clean through the opponent at the top
  // of the arc — and since the arc is slowest at its apex, that dead zone is
  // where the jump spends most of its time. It read as "he floats up there and
  // nothing happens". Falling onto someone should connect through the descent.
  groundedY: 0.18, // below this height counts as "grounded" for throw/anti-air checks
  // THE DIVE: an air attack is a plunge, not a hover. For the last diveFrames of
  // its startup — the exact frames the clip swings down from the arch — the body
  // drives down (vy clamped to -diveFall) and forward (airVX = diveForward
  // toward the foe). Without this, the hitbox connected while the body hung at
  // hop height a metre away: the opponent "flew backward with no contact".
  // Tuned by sweep: harder than 3.0/3.4 and an early press (rising, frame ~4)
  // lands BEFORE the hit frame — the attack silently whiffs into landing lag.
  // This is the hardest dive that keeps every press timing connectable.
  diveFall: 3.3, // m/s downward, applied as -diveFall
  // 5.0, was 3.4. MEASURED (air_sweep.ts): at 3.4 the strike connected only at
  // 0.8–1.4m — but a jump-in is a RANGED approach; players leap from 1.5–2.2m,
  // where every press whiffed. "Noise but no contact" was the swing/whiff cues
  // doing their job on a strike whose plunge couldn't reach.
  diveForward: 5.0, // m/s toward the opponent during the plunge
  diveFrames: 7, // how many end-of-startup frames the plunge covers (the swing)
}

// A giant's arm advantage, as a REACH MULTIPLIER from body scale. 0.6 blend:
// full 1.28× arms gave the Exec a 0.17m dead zone where he could poke humans
// who could not answer at all — measured 0–10% human win rates against a
// 40–50% target while the perfect bot stayed at 100% (fair, but hopeless).
// At 0.6 the zone shrinks to a manageable edge. USED BY BOTH the sim's connect
// check and the AI's spacing — they must agree, or the AI stands outside its
// own fists.
// 0.78, found by iteration (0.75 ↔ 0.8 brackets the target): 1.0 → a 0.17m no-answer zone, humans 0–10%;
// 0.6 → zone gone, humans back to 100%. The Exec's difficulty IS this zone's
// width; 0.8 leaves ~0.10m — poking range he must work, humans can contest.
export const scaleReach = (bodyScale: number): number => 1 + (bodyScale - 1) * 0.79

// ── Health / meter ──────────────────────────────────────────────────────────
export const VITALS = {
  leonardMaxCredibility: 100,
  oppMaxResistance: 100,
  meterMax: 12, // Alignment meter, in "bars"; specials cost whole bars
  meterPerBar: 1, // gained per landed strike / absorbed block-hit (×below)
  meterOnHit: 1.0,
  meterOnBlock: 0.5,
}

// ── Feel budget (these four ARE the game per the blueprint) ─────────────────
export const FEEL = {
  hitstopLight: 5, // frames both fighters freeze on a light connect
  hitstopHeavy: 11, // SF6-class crunch on the big hits
  hitstopThrow: 7,
  blockHitstop: 4,
  koFreeze: 30, // freeze-frame on the KO connect before the result card
  shakeHeavy: 0.06, // world-space shake amplitude (m) on heavy / special
  shakeLight: 0.0, // lights don't shake (reserve it so heavies read)
  shakeDecay: 0.82, // per-frame multiplier
  inputBufferFrames: 14, // ~233 ms. Genre-standard forgiveness, and still
  // comfortably under the shortest action (a jab is 27 frames).
  // History worth keeping: this was briefly raised to 28 (~460 ms) chasing a
  // "K/L do nothing" report whose real cause was an animation-timing bug. A
  // window that long outlasts a jab, which breaks the no-double-fire invariant
  // in fightInput — one press could come out twice, and inputs surfaced long
  // after they were pressed. Playtest read: "attacks don't feel connected".
  // Keep this UNDER the shortest action (~25 frames).
}

// ── Stun timing (frames) ────────────────────────────────────────────────────
// Audit fix (P0-1): clean hits must leave the ATTACKER free first ("plus"), or
// correct reads never pay. Light hitstun 22 makes a landed jab +7; a clean
// heavy now causes KNOCKDOWN (see applyHit) — the payoff for the big read.
export const STUN = {
  block: 9, // blockstun vs lights — pinned briefly but safe
  blockHeavy: 14, // blockstun vs heavies — blocked heavy is punishable (−13), not −18
  hitLight: 22,
  hitHeavy: 30, // (kept for non-heavy "heavy-class" hits, e.g. specials)
  // The non-flooring heavy (the hurricane kick): longer than hitHeavy because
  // its whole payoff is SEEING the victim doubled over — 11 of these frames are
  // spent frozen in hitstop before the reaction even plays. The kick is a
  // 333ms-telegraph hard read; a fat stagger is the reward that justifies it.
  gutHit: 42,
  knockdown: 34, // throws & clean heavies put you on the floor
}

// ── Round ────────────────────────────────────────────────────────────────────
export const ROUND = {
  seconds: 99, // HARD STOP
  hideTimerUntil: 10, // only show the number in the last N seconds
}

// ── Camera (the one sanctioned side-on break from the follow-cam rule) ──────
// Close-quarters framing: the fight is two people at conversational distance,
// so the camera sits near and tight — you should read faces and contact.
export const CAMERA = {
  height: 1.0,
  distance: 4.2, // back along +Z, looking at the table's long axis
  fov: 40,
  followLerp: 0.08, // eases toward the fighters' midpoint
  zoomTight: 3.4, // pulls in when they're close (the round-3 dolly, previewed)
  zoomWide: 4.8,
}

// ── Graybox palette (capsules; art is Build E) ──────────────────────────────
export const COLORS = {
  leonard: '#3b6ea5', // corporate blue
  opponent: '#a5433b', // exec red
  startup: '#e8c15a', // strike telegraph flash (wind-up)
  active: '#ffffff', // the hitting frames (strikes)
  throw: '#9b6ad0', // grabs read purple — distinct from any strike
  special: '#e0a030', // specials read gold
  counter: '#3fb6c4', // counter-stance reads cyan (mash into it = you eat it)
  block: '#5aa06e', // green while absorbing
  hurt: '#ff5a5a', // hitstun flash
  floor: '#c9c3b4',
  wall: '#d7d1c2',
}
