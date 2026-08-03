// The move table — designing this array IS designing the game (blueprint §"How
// a fighter actually works"). Every move is a timed trip through
// startup → active → recovery. Damage, reach and type here; the state machine
// in fighterState.ts just reads it. Tuning the fight = editing these numbers.

export type MoveKind = 'strike' | 'throw' | 'special' | 'counter'

export type MoveDef = {
  id: string
  name: string
  line: string // the deadpan line delivered as the technique
  kind: MoveKind
  damage: number
  startup: number // frames before the hitbox is live
  active: number // frames the hitbox is live
  recovery: number // frames locked after active (whiff punish window)
  reach: number // max center-to-center distance that connects
  blockable: boolean // throws are not
  meterCost: number // bars; 0 for normals
  heavy?: boolean // routes hitstop/shake to the heavy budget
  /** Does a clean hit put them on the floor? Defaults to `heavy`. Split out so a
   *  move can hit with heavy WEIGHT (hitstop, shake, the big impact sound)
   *  without also flooring — a kick that staggers the body reads very
   *  differently from one that dumps them on the ground, and having every heavy
   *  do the same knockdown made K and L interchangeable. */
  floors?: boolean
  applyScope?: boolean // Priya: clean hit adds a Scope Creep stack (the ask grows)
  derail?: boolean // hostile UI: clean hit swaps the victim's J/K keys for 3s
  air?: boolean // performed airborne — ignores the ground counter/throw, hits downward
  /** SUPER ARMOR: how many incoming STRIKES this move absorbs during its
   *  startup/active without being interrupted (damage still lands). The genre's
   *  standard answer for a slow heavy vs rushdown — measured live, Priya's
   *  7–17f attack cadence stuffed the kick's 20f wind-up on essentially every
   *  raw attempt, so its rib-fold payoff was never seen. Throws ignore armor. */
  armor?: number
  /** Metres carried FORWARD across startup+active. Travelling strikes (the
   *  hurricane kick) come out of Mixamo with that travel baked into the clip's
   *  root motion; we strip it so the sim stays authoritative, which means the
   *  sim has to put it back or the strike visibly swings short of the opponent. */
  lunge?: number
  /** MULTI-HIT: how many times this move's hitbox can connect in one activation
   *  (default 1). A flurry re-arms between hits — see reArm. */
  hits?: number
  reArm?: number // frames between hits of a multi-hit move
  /** Per-hit gaps, when a clip's strikes are NOT evenly spaced. A single reArm
   *  cannot follow a real combination — this clip's contacts sit 14, 42 and 35
   *  frames apart — and forcing one is how the damage ends up landing where no
   *  strike is happening. Falls back to `reArm` when absent. */
  reArmSeq?: number[]
}

// ── Leonard's v1 kit (deliberately small — blueprint) ───────────────────────
export const LEONARD_MOVES: Record<string, MoveDef> = {
  clarify: {
    id: 'clarify',
    name: 'Clarify',
    line: 'Quick clarification—',
    kind: 'strike',
    damage: 3, // a poke, not a win condition — you can't mash your way to a KO
    startup: 11, // reactable-ish, so a human-paced defender can answer it fairly
    active: 3,
    recovery: 13,
    reach: 1.02,
    blockable: true,
    meterCost: 0,
  },
  pushback: {
    id: 'pushback',
    name: 'Pushback',
    line: "I'm going to push back on that.",
    kind: 'strike',
    damage: 14,
    startup: 20,
    active: 4,
    recovery: 24,
    reach: 1.14,
    blockable: true,
    meterCost: 0,
    heavy: true,
  },
  // L — THE HURRICANE KICK. Was the throw; promoted to a real strike because a
  // grab that looks like a spinning kick breaks the genre's most basic
  // readability rule (throws are unblockable, so they must never read as
  // strikes). The throw moved to O and kept its own grab animation.
  hurricane: {
    id: 'hurricane',
    name: 'Circling Back Hard',
    line: 'Let me circle back on that — hard.',
    kind: 'strike',
    damage: 15,
    // Timed to the crescent clip's arc ([16,76] @2.2): the measured foot-speed
    // peak (clip f40) lands at game frame 22. 367ms — a readable heavy, but not
    // the 483ms that let the AI guard 70% of them.
    startup: 22,
    active: 6,
    recovery: 27, // the clip's own landing + rise fills it exactly
    // 1.28. It was 1.62, which combined with the 0.55m lunge registered hits
    // from 2.1m apart — the damage landed while the foot was still visibly short
    // of the opponent. A spinning leg reaches further than a grab (1.04) but not
    // half a body-length further; the lunge is what closes the gap, not the
    // hitbox.
    reach: 1.28,
    blockable: true,
    meterCost: 0,
    heavy: true,
    armor: 1, // spin THROUGH her Tiny Thought — the kick must function vs rushdown
    // STAGGERS, doesn't floor. A spinning kick into the midsection folds someone
    // forward — they take it in the stomach and stumble. K already floors, and
    // two knockdown buttons made the pair read as the same move.
    floors: false,
    lunge: 0.55, // the travel the clip used to carry itself, given back
  },
  offline: {
    id: 'offline',
    name: "Let's Take This Offline",
    line: "Let's take this offline.",
    kind: 'throw',
    damage: 10,
    startup: 12, // was 14 — snappier off the press; the throw is your anti-turtle
    active: 5, // was 2 — the grab stays "live" longer so it isn't a 33ms window
    recovery: 22,
    reach: 1.04, // was 0.93 — connects at the range you'd actually be blocking at
    blockable: false, // a calendar invite cannot be blocked
    meterCost: 0,
  },
  // JUMPING IN — the air attack. Tap W to hop, then J/K to strike downward.
  // Arcs over grounded pokes and the counter-stance; a good approach/opener,
  // but committal: block it or anti-air it and Leonard lands wide open.
  jumpIn: {
    id: 'jumpIn',
    name: 'Jumping In',
    line: 'Sorry — let me just jump in here.',
    kind: 'strike',
    damage: 11,
    // 11f = 185ms. Was 6f, but a 100ms startup left no room to SHOW the strike.
    // 11 fits the measured arch→slam swing (clip f40→f50, 0.333s) at the 1.8x
    // legibility ceiling so the hit frame lands exactly on the hand-down slam
    // pose. Still fast for an air move.
    startup: 11,
    active: 10, // long active window so it connects across the descent
    recovery: 4, // in-air recovery is short; the real cost is landing lag
    // 0.85 (was 1.02): the hit may only register at visible-touch range — the
    // DIVE closes the gap, so a bigger bubble just meant connecting from a
    // metre away with the hand nowhere near Brent ("no contact, he just flies
    // backward"). Sweep-verified: connects at 0.70–0.83m for every press
    // timing; the lone edge is a very early press from 1.4m+ out, which lands
    // mid-active and whiffs — a fair punish for jumping in from too far.
    reach: 0.85,
    blockable: true,
    meterCost: 0,
    heavy: true, // lands like a heavy → knockdown payoff
    air: true,
  },
  // Build-C stub for the meter economy: a fast, long-reach strike that costs
  // meter, so spending Alignment has feel before the real projectile (Build F).
  // THE SUPER. A five-hit flurry: four fast rebuttals then a finisher. Each
  // hit is small, but the sequence out-damages a heavy and — crucially — reads
  // as a COMBO rather than one more kick. active is long because the hitbox
  // must stay live across the whole flurry (see hits / reArm).
  phased: {
    id: 'phased',
    name: 'Phased Approach',
    line: 'We’re derisking via a phased approach.',
    kind: 'special',
    // SYNCED TO THE ANIMATION. Fitting the clip to the old 14/46/26 window left
    // the sim damaging 14–33 frames BEFORE the animation's contacts — Leonard
    // was still winding up, or mid-backflip, while the opponent took hits. That
    // is what read as "no contact".
    // Measured: at timeScale 1.22 the clip's four contacts land on game frames
    // 33, 52, 67 and 89, so startup IS the first contact and reArm is their mean
    // spacing. Every hit now coincides with a visible strike.
    damage: 9, // 4 × 9 = 36, holding the old 5 × 7 = 35 total
    startup: 14, // = the first strike's measured game-frame, exactly
    active: 104, // last contact is at frame 113 = startup + 99; +5 for its active window
    recovery: 26,
    // 1.15, was 2.16 — a relic of this move's projectile-stub past. As a fist
    // combination, 2.16 meant punches VISIBLY landed from across the arena
    // (Rebecca: "Leonard can be on the far left end and it still makes
    // contact"). Honest melee reach + the lunge below: he advances INTO the
    // combination, and bad spacing whiffs the early rebuttals instead of being
    // forgiven.
    reach: 1.15,
    lunge: 0.9, // carried across startup+active — he walks the combo forward
    blockable: true,
    meterCost: 3,
    heavy: true,
    hits: 4, // the clip has four strikes in it, not five
    reArm: 30, // fallback only
    // MEASURED contact frames of trim [24,145] @1.7×: 14, 28, 78, 113 — the two
    // uppercuts are the last two, and a uniform reArm cannot reach them.
    reArmSeq: [14, 50, 35],
  },
}

// ── Placeholder opponent kit (graybox sandbag → replaced by the real AI in
// Build D). Just enough of the triangle to prove reads are fun: a jab, a slow
// heavy you can whiff-punish, a throw that beats turtling, and a block.
// Audit P0-3: Exec startups slowed toward Punch-Out territory — the design
// pillar is "you lose because you read wrong, never because the game was
// faster than a human", and 10f (167ms) was physiologically unreactable. ─────
export const OPP_MOVES: Record<string, MoveDef> = {
  jab: {
    id: 'jab',
    name: 'Quick Question',
    line: 'Quick question.',
    kind: 'strike',
    damage: 7,
    startup: 15, // 250ms — still quick, no longer inhuman
    active: 3,
    recovery: 14,
    reach: 1.02,
    blockable: true,
    meterCost: 0,
  },
  heavy: {
    id: 'heavy',
    name: "Let's Double-Click",
    line: "Let's double-click on that.",
    kind: 'strike',
    damage: 16,
    startup: 30, // 500ms — a true Punch-Out telegraph; the read the game teaches
    active: 4,
    recovery: 26,
    reach: 1.2,
    blockable: true,
    meterCost: 0,
    heavy: true,
  },
  grab: {
    id: 'grab',
    name: 'Circle Back',
    line: "Let's circle back offline.",
    kind: 'throw',
    damage: 14,
    startup: 20, // 333ms — reactable if you're watching for it
    active: 2,
    recovery: 24,
    reach: 0.93,
    blockable: false,
    meterCost: 0,
  },
  // THREATEN PIP — the unblockable command grab (Bout 3, phase 2+). He
  // steeples his fingers; the wind-up is long and generous ON PURPOSE (the
  // blueprint's big tell). Cannot be blocked: back-dash the i-frames or
  // interrupt the startup with any strike.
  pip: {
    id: 'pip',
    name: 'Threaten PIP',
    line: 'Let’s talk about your growth areas.',
    kind: 'throw',
    damage: 28,
    startup: 40, // 667ms — the steeple. You are MEANT to see this coming.
    active: 2,
    recovery: 32, // interrupted or whiffed, he's wide open — the risk is real
    reach: 0.96,
    blockable: false,
    meterCost: 0,
    heavy: true,
  },
  // The anti-mash move. No hitbox of its own — if you STRIKE into its active
  // window, your attack reflects back onto you. Beaten by throws (grab the
  // poser). `damage` = the reflect dealt to the attacker. `reach` = catch range.
  parry: {
    id: 'parry',
    name: 'Actually, Great Point',
    line: 'Actually — great point.',
    kind: 'counter',
    damage: 16,
    startup: 7,
    active: 16,
    recovery: 15,
    reach: 1.26,
    blockable: false,
    meterCost: 0,
  },
}

// ── BOUT 1 — BRENT (The Wall). Light 3-"move" kit: two attacks + a turtle
// bias that lives in his AI profile. Startups are readable-slow; his real
// weapon is Backlog Regen (bout-level rule: unhit Resistance re-compiles). ───
export const BRENT_MOVES: Record<string, MoveDef> = {
  wellActually: {
    id: 'wellActually',
    name: 'Well, Actually',
    line: 'Well, actually—',
    kind: 'strike',
    damage: 10,
    startup: 16, // 267ms — deliberate, readable
    active: 3,
    recovery: 16,
    reach: 1.02,
    blockable: true,
    meterCost: 0,
  },
  scopeConcern: {
    id: 'scopeConcern',
    name: 'Scope Concern',
    line: 'That’s a bigger lift than it sounds.',
    kind: 'strike',
    damage: 20,
    startup: 34, // 567ms — crosses arms, inhales through teeth; a gift to read
    active: 4,
    recovery: 28,
    reach: 1.2,
    blockable: true,
    meterCost: 0,
    heavy: true,
  },
}

// Brent's grab — the Wall's answer to being rushed or turtled.
BRENT_MOVES.hardStop = {
  id: 'hardStop',
  name: 'Hard Stop',
  line: 'I’m going to stop you right there.',
  kind: 'throw',
  damage: 13,
  startup: 18,
  active: 3,
  recovery: 24,
  reach: 0.95,
  blockable: false,
  meterCost: 0,
}

// ── BOUT 2 — PRIYA (The Storm). Rushdown: chaining pokes, the Scope-stack
// debuff, and the campaign's first hostile-UI beat (Derail key-swap). ────────
export const PRIYA_MOVES: Record<string, MoveDef> = {
  tinyThought: {
    id: 'tinyThought',
    name: 'Tiny Thought',
    line: 'Tiny thought—',
    kind: 'strike',
    damage: 9,
    startup: 13, // 217ms — quick, meant to arrive in strings, not alone
    active: 3,
    recovery: 9, // short recovery = she can chain; block the STRING
    reach: 1.02,
    blockable: true,
    meterCost: 0,
  },
  quickAdd: {
    id: 'quickAdd',
    name: 'Quick Add',
    line: '…and while we’re in here—',
    kind: 'strike',
    damage: 12,
    startup: 19, // 317ms
    active: 3,
    recovery: 18,
    reach: 1.08,
    blockable: true,
    meterCost: 0,
    applyScope: true, // the ask grows: +1 Scope stack on clean hit
  },
  circleBack: {
    id: 'circleBack',
    name: 'Circle Back to This',
    line: 'Let’s zoom out.',
    kind: 'strike',
    damage: 14,
    startup: 26, // 433ms — the lazy hand-rotate; block it or your keys swap
    active: 3,
    recovery: 22,
    blockable: true,
    reach: 1.14,
    meterCost: 0,
    derail: true, // hostile UI: J/K swap 3s on clean hit (🔀 shown)
  },
}

// Priya's counter — the anti-mash tool. Mash jabs into the Storm and she
// turns your own momentum back on you (same kind:'counter' path as the
// Exec's parry; throws still beat it). Milder numbers: she's the mid-boss.
PRIYA_MOVES.loveThatEnergy = {
  id: 'loveThatEnergy',
  name: 'Love That Energy',
  line: 'Love that energy — however.',
  kind: 'counter',
  damage: 8, // was 11 — a slap on the wrist, not a combo-ender
  startup: 8,
  active: 22,
  recovery: 16,
  reach: 1.2,
  blockable: false,
  meterCost: 0,
}

// Priya's grab — parking the conversation, and your posture.
PRIYA_MOVES.parkThat = {
  id: 'parkThat',
  name: 'Let’s Park That',
  line: 'Let’s park that — permanently.',
  kind: 'throw',
  damage: 12,
  startup: 16,
  active: 3,
  recovery: 22,
  reach: 0.95,
  blockable: false,
  meterCost: 0,
}

// Dialogue lives in fightScript.ts (tiered, sequential — the conversation
// escalates with the fight). The `line` fields above are fallbacks for moves
// the script doesn't cover.
