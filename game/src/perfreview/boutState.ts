// The gauntlet spine (Build C2) — three bouts up the org chart, with each
// bout's result chaining into the next opener (blueprint: THE THREE BOUTS).
//
// Pure module state + configs: no React, no browser APIs, safe for the
// headless harness. The route (PerformanceReview) drives the flow; the sim
// (fighterState) stays bout-agnostic and just receives kits/mods via
// resetFight opts.

import { BRENT_MOVES, PRIYA_MOVES, OPP_MOVES, type MoveDef } from './frameData'
import { fight } from './fighterState'
import { ROUND } from './fightConfig'
import { readPhase2Final } from '../state/campaignState'

export type OpponentKey = 'brent' | 'priya' | 'exec'
export type AIStyle = 'turtle' | 'rushdown' | 'boss'

export type BoutConfig = {
  key: OpponentKey
  name: string // fight-card display name
  role: string
  cardTitle: string // "BOUT 1 — ARCHITECTURE SYNC"
  cardSub: string
  barLabel: string // RESISTANCE / SKEPTICISM
  voice: OpponentKey // fightScript side
  moves: Record<string, MoveDef>
  ai: AIStyle
  regenPerSec: number // Brent's Backlog Regen; 0 elsewhere
  throwTech: number // 0..1 — how well this opponent BREAKS repeated throws (fighterState tech)
  startHP: number // opponent bar size — the difficulty ramp up the org chart
  oppScale: number // body scale — the Exec looms larger-than-life (final-boss size)
  koLine: string // what they say when convinced (their bar hits 0)
  lossLine: string // the judged line when Leonard loses this bout
  // escalating room. fogNear/fogFar must bracket the ACTUAL scene depth (camera
  // sits ~4.8, backdrops reach ~-9), or the fog never engages and the stage
  // loses all atmospheric perspective — the cheapest depth cue there is.
  stage: { bg: string; fog: string; fogNear: number; fogFar: number; light: number }
  // Calendar-screen metadata (the title screen is the afternoon's calendar).
  cal: { title: string; time: string; organizer: string; color: string; startMin: number; endMin: number }
}

export const BOUTS: BoutConfig[] = [
  {
    key: 'brent',
    name: 'BRENT K.',
    role: 'ENGINEERING',
    cardTitle: 'BOUT 1 — ARCHITECTURE SYNC',
    cardSub: 'The Wall. His objections re-compile if you let him breathe.',
    barLabel: 'RESISTANCE',
    voice: 'brent',
    moves: BRENT_MOVES,
    ai: 'turtle',
    regenPerSec: 0.9, // Backlog Regen — eased with the O nerf: throws pay 30% less, so slow play is already taxed
    throwTech: 0.5, // the Wall learns your grab habit — but throws still teach Bout 1
    startHP: 72, // the warm-up bar — Bout 1 is the tutorial, not the siege (80 pre-O-nerf)
    oppScale: 1.0,
    koLine: '…yeah, okay. That’ll work.',
    lossLine: 'ENG UNCONVINCED — the backlog wins. The invite reappears: same time, same room.',
    // Deep Tron blue, not black — a near-black stage made Leonard's black
    // clothes vanish. fogNear pushed out so the backdrop's horizon glow (the
    // band his silhouette reads against) isn't hazed away.
    // Bracketed to the parallax stack: near layer ~13% hazed, mid ~35%, and the
    // floor's far edge fully swallowed. This IS the atmospheric separation
    // between the layers — too tight and the mid skyline simply vanishes.
    stage: { bg: '#04101d', fog: '#062036', fogNear: 8, fogFar: 26, light: 1.1 }, // the Grid
    // Grid minutes are relative to 12:00 PM (lunch ends at 1 — the meetings start right after).
    cal: { title: 'Architecture Sync', time: '1:00 – 2:00 PM', organizer: 'Brent K. · Engineering', color: '#7986cb', startMin: 60, endMin: 120 },
  },
  {
    key: 'priya',
    name: 'PRIYA S.',
    role: 'PRODUCT',
    cardTitle: 'BOUT 2 — PRODUCT REVIEW',
    cardSub: 'The Storm. Every tiny thought adds up. Throw to descope.',
    barLabel: 'RESISTANCE',
    voice: 'priya',
    moves: PRIYA_MOVES,
    ai: 'rushdown',
    regenPerSec: 0,
    throwTech: 0.2, // she'd rather jab you out of the grab — tech is a light touch (spam already loses to her jabs)
    // 145 (was 95): the smooth mid-boss difficulty lever. Humans were racing
    // her down in ~26s before her string pressure could accumulate — every
    // AI-side knob moved win rates ~3 points, the pool moves them ~15 per +25.
    startHP: 120, // was 145 — playtest: a real human called her brutal; the bots overrated us all
    oppScale: 1.0,
    koLine: 'Okay. I’m aligned.',
    lossLine: 'PRODUCT UNCONVINCED — scope stands. Priya has “found 30 minutes” to do this again.',
    // fogNear 20: on the light set the fog otherwise washes the kanban wall
    // into the haze before you can read it.
    // Light stage: fog stays FAR out. Haze on a pale set is exactly the white
    // cloudiness we just removed — depth here comes from value, not atmosphere.
    // Warm-graded to match the canvas (see ProductStage): the cool blue-white
    // bg was fighting the new cream/lilac grade at the frame edges.
    // light 1.35 → 1.9, and both bg and fog warmed off the lilac: the set read
    // dim and slightly cold. This key is the SHARED shadow-casting light in
    // FightWorld, so raising it lifts the fighters, not just the backdrop.
    stage: { bg: '#f6efe9', fog: '#f3eae6', fogNear: 18, fogFar: 52, light: 1.9 }, // product studio
    // fogFar 52 (was 34): the stage now has real geometry out to −34 and a
    // canvas floor running to −72. The fog IS the aerial perspective on those
    // ranges, so it has to bracket them — at 34 the far range simply vanished.
    cal: { title: 'Product Review', time: '2:00 – 3:00 PM', organizer: 'Priya S. · Product', color: '#33b679', startMin: 120, endMin: 180 },
  },
  {
    key: 'exec',
    name: '“THE EXEC”',
    role: 'THE ASK',
    cardTitle: 'FINAL — THE ASK',
    cardSub: 'The Exam. He has heard from the team.',
    barLabel: 'SKEPTICISM',
    voice: 'exec',
    moves: OPP_MOVES,
    ai: 'boss',
    regenPerSec: 0,
    throwTech: 0.7, // eased with the O nerf — a 7-damage throw doesn't need 0.85 armor
    // 85 (was 100): the throw tech extends every fight (throws now sometimes
    // break), which handed his offense ~10 extra seconds of exposure per run
    // and sank the human rows ~20pts below target. A smaller pool gives the
    // time back to mixing players; the spam bot's damage is tech-starved
    // either way, so this barely helps the cheese.
    startHP: 68, // 85 pre-O-nerf: throws lost 30% of their payout and his fight is BUILT on eating throws
    oppScale: 1.28, // larger-than-life — final-boss energy. Was 1.4, which put
    // his head through the top of the frame even after the camera learned to
    // fit the taller fighter. 1.28 still towers (a head and shoulders over
    // Leonard) while leaving the shot composable at close quarters.
    koLine: 'Great sync. Ship it.',
    lossLine: 'NOT ALIGNED — “Let’s regroup and run this back.” The room resets.',
    // light 1.4 (was 0.85): against a bright sunset window the fighters were
    // crushing to silhouettes. fogNear pushed out so the city keeps its detail.
    // Bracketed to the parallax stack (near city ~13 from camera, mid ~17):
    // near towers stay sharp, the far shore takes real haze on top of its
    // painted aerial perspective. The sky layer ignores fog entirely.
    stage: { bg: '#221129', fog: '#3a2145', fogNear: 9, fogFar: 30, light: 1.4 }, // dusk — golden hour
    // 4:30 PM: the slot Lunch Dash's Slack tease puts on your calendar, and
    // the time the marketing site has always advertised. The 3:00–4:30 gap is
    // "focus time" — the day's one attempt at real work — drawn in
    // CalendarScreen.
    cal: { title: 'Executive Review', time: '4:30 – 5:30 PM', organizer: '“The Exec”', color: '#d50000', startMin: 270, endMin: 330 },
  },
]

// ── Gauntlet state ───────────────────────────────────────────────────────────

export type BoutStats = {
  throwsAttempted: number
  throwsLanded: number
  teched: number // Leonard's grabs broken by the opponent
  blocks: number // hits Leonard blocked
  minHP: number // Leonard's lowest credibility during the bout
  secs: number // how long the room took
}

export type BoutResult = {
  opponent: OpponentKey
  won: boolean
  scorePct: number // Leonard's ending health fraction (0 on a KO loss) — THE score
  stats: BoutStats // achievement fuel — snapshotted from the sim at recordBout
}

export const gauntlet = {
  index: 0,
  results: [] as BoutResult[],
  retries: 0, // meetings regenerated this day (Zero Reschedules watches this)
}

export function currentBout(): BoutConfig {
  return BOUTS[Math.min(gauntlet.index, BOUTS.length - 1)]
}

export function recordBout(won: boolean, scorePct: number): void {
  gauntlet.results.push({
    opponent: currentBout().key,
    won,
    scorePct,
    stats: {
      throwsAttempted: fight.statThrowsAttempted,
      throwsLanded: fight.statThrowsLanded,
      teched: fight.statTeched,
      blocks: fight.statBlocks,
      minHP: fight.statMinHP,
      secs: ROUND.seconds - fight.time,
    },
  })
  gauntlet.index++
}

/** MUST-WIN PROGRESSION (playtest 2026-08-03): a lost bout is not a step
 *  forward with a handicap — the meeting regenerates and you take it again.
 *  The loss is recorded long enough to drive the UNCONVINCED card, then this
 *  undoes it so the calendar shows the same meeting as NOW and the final
 *  summary only ever contains wins. */
export function retryBout(): void {
  const last = gauntlet.results[gauntlet.results.length - 1]
  if (last && !last.won) {
    gauntlet.results.pop()
    gauntlet.index--
    gauntlet.retries++
  }
}

export function gauntletOver(): boolean {
  return gauntlet.index >= BOUTS.length
}

export function resetGauntlet(): void {
  gauntlet.index = 0
  gauntlet.results = []
  gauntlet.retries = 0
}

// ── SPRINT CREDIT — the Jira Run coins finally pay out (playtest B2) ────────
// Phase 2 banks storyPoints into the campaign receipts; until now nothing
// ever read them. Now every 400 story points = one bar of starting Alignment
// meter in EVERY afternoon bout (cap 4 — one full special of head start).
// The morning's sprint literally fuels the afternoon's pitch.
export function sprintCredit(): { bars: number; storyPoints: number } {
  const p2 = readPhase2Final()
  const sp = p2?.storyPoints ?? 0
  return { bars: Math.min(4, Math.floor(sp / 400)), storyPoints: sp }
}

// ── The chain, retired (playtest 2026-08-03) ────────────────────────────────
// The old rule carried your last score into the next opener (75–100%
// credibility). With must-win progression there are no losses to carry, and
// the reduced bar read as a BUG in playtesting ("why does the fight start
// with less HP?"). Every meeting is now a fresh room: 100.
export function leonardStartHP(): number {
  return 100
}

// One line of continuity for the fight card: how the last room reports you.
export function chainNote(): string | null {
  // Flavor only since the mercy chain retired — every room starts fresh, but
  // word still travels. (Results only ever contain WINS now; see retryBout.)
  const prev = gauntlet.results[gauntlet.index - 1]
  if (!prev) return null
  const from = prev.opponent === 'brent' ? 'Eng' : 'Product'
  if (prev.scorePct > 0.7) return `${from} signed off clean. Word travels.`
  return `${from} signed off — barely. Word travels.`
}

// ── Final rating (graybox endings; full ending suite is Build H) ────────────
export type Rating = 'EXCEEDS EXPECTATIONS' | 'MEETS EXPECTATIONS' | 'PIP'
export function finalRating(): Rating {
  // Must-win progression means the summary screen is only reachable with all
  // three rooms convinced — so the rating grades HOW you won: average ending
  // credibility across the day. (PIP is kept in the type for the copy, but is
  // unreachable through normal play now — losses regenerate the meeting.)
  const all = gauntlet.results
  if (all.length < BOUTS.length || !all.every((r) => r.won)) return 'PIP'
  const avg = all.reduce((sum, r) => sum + r.scorePct, 0) / all.length
  return avg >= 0.5 ? 'EXCEEDS EXPECTATIONS' : 'MEETS EXPECTATIONS'
}
