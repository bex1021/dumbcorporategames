// The gauntlet spine (Build C2) — three bouts up the org chart, with each
// bout's result chaining into the next opener (blueprint: THE THREE BOUTS).
//
// Pure module state + configs: no React, no browser APIs, safe for the
// headless harness. The route (PerformanceReview) drives the flow; the sim
// (fighterState) stays bout-agnostic and just receives kits/mods via
// resetFight opts.

import { BRENT_MOVES, PRIYA_MOVES, OPP_MOVES, type MoveDef } from './frameData'

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
    regenPerSec: 1.3, // Backlog Regen — pauses ~2s after any damage; the tax on slow play
    throwTech: 0.5, // the Wall learns your grab habit — but throws still teach Bout 1
    startHP: 80, // the warm-up bar — Bout 1 is the tutorial, not the siege
    oppScale: 1.0,
    koLine: '…yeah, okay. That’ll work.',
    lossLine: 'ENG UNCONVINCED — the backlog wins. Product has heard.',
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
    startHP: 145,
    oppScale: 1.0,
    koLine: 'Okay. I’m aligned.',
    lossLine: 'PRODUCT UNCONVINCED — scope stands. The Exec has heard.',
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
    throwTech: 0.85, // the Exam: chain-throwing him was a measured free win (100%)
    // 85 (was 100): the throw tech extends every fight (throws now sometimes
    // break), which handed his offense ~10 extra seconds of exposure per run
    // and sank the human rows ~20pts below target. A smaller pool gives the
    // time back to mixing players; the spam bot's damage is tech-starved
    // either way, so this barely helps the cheese.
    startHP: 85,
    oppScale: 1.28, // larger-than-life — final-boss energy. Was 1.4, which put
    // his head through the top of the frame even after the camera learned to
    // fit the taller fighter. 1.28 still towers (a head and shoulders over
    // Leonard) while leaving the shot composable at close quarters.
    koLine: 'Great sync. Ship it.',
    lossLine: 'PLACED ON A PIP — “We’re really investing in your growth.”',
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

export type BoutResult = {
  opponent: OpponentKey
  won: boolean
  scorePct: number // Leonard's ending health fraction (0 on a KO loss) — THE score
}

export const gauntlet = {
  index: 0,
  results: [] as BoutResult[],
}

export function currentBout(): BoutConfig {
  return BOUTS[Math.min(gauntlet.index, BOUTS.length - 1)]
}

export function recordBout(won: boolean, scorePct: number): void {
  gauntlet.results.push({ opponent: currentBout().key, won, scorePct })
  gauntlet.index++
}

export function gauntletOver(): boolean {
  return gauntlet.index >= BOUTS.length
}

export function resetGauntlet(): void {
  gauntlet.index = 0
  gauntlet.results = []
}

// ── The chain (LOCKED): last bout's score sets the next opener ──────────────
// Dominate a bout → walk into the next with a buffer; get out-scored or KO'd →
// start on the back foot. Clamped so the worst case is a handicap (−25%),
// never a wall (Mercy). Bout 1 always starts clean.
export function leonardStartHP(): number {
  const prev = gauntlet.results[gauntlet.index - 1]
  if (!prev) return 100
  const score = prev.won ? prev.scorePct : 0
  return Math.round(100 * (0.75 + 0.25 * Math.max(0, Math.min(1, score))))
}

// One line of continuity for the fight card: how the last room reports you.
export function chainNote(): string | null {
  const prev = gauntlet.results[gauntlet.index - 1]
  if (!prev) return null
  const from = prev.opponent === 'brent' ? 'Eng' : 'Product'
  if (!prev.won) return `${from} was not convinced. Word travels. (Credibility ${leonardStartHP()}%)`
  if (prev.scorePct > 0.7) return `${from} signed off clean. Word travels. (Credibility ${leonardStartHP()}%)`
  return `${from} signed off — barely. Word travels. (Credibility ${leonardStartHP()}%)`
}

// ── Final rating (graybox endings; full ending suite is Build H) ────────────
export type Rating = 'EXCEEDS EXPECTATIONS' | 'MEETS EXPECTATIONS' | 'PIP'
export function finalRating(): Rating {
  const all = gauntlet.results
  const finalBout = all[all.length - 1]
  if (all.length === BOUTS.length && all.every((r) => r.won)) return 'EXCEEDS EXPECTATIONS'
  if (finalBout?.won) return 'MEETS EXPECTATIONS'
  return 'PIP'
}
