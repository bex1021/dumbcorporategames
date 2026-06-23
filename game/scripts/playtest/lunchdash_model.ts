// Headless balance model for Phase 3 "Lunch Dash".
//
// Single source of truth: this imports the GAME's real rule code — the bowl
// slosh model (bowlState.sloshBowl), the tier scoring (scoring.scoreTier), the
// clock constants, the destination hold/time costs, and the driving tunables.
// Only the NAVIGATION is modelled here (a grid Manhattan distance with the
// river-bridge constraint) — exactly the "hybrid" approach: model positions ×
// move-speed for time/resource cost, feed everything else through real rules.

import { DRIVE } from '../../src/lunchdash/driveConfig.ts'
import { START_MIN, END_MIN, HARDCAP_MIN } from '../../src/lunchdash/clockState.ts'
import { DESTINATIONS } from '../../src/lunchdash/destinations.ts'
import { SPAWN } from '../../src/lunchdash/cityLayout.ts'
import { bowl, sloshBowl, bowlTier, resetBowl } from '../../src/lunchdash/bowlState.ts'
import { scoreTier } from '../../src/lunchdash/scoring.ts'

// mirrors pedState.HR_TIME_PENALTY (kept literal to avoid pulling three's chain)
const HR_TIME_PENALTY = 3

// ---- navigation: Manhattan road distance with the river-crossing constraint ----
const RIVER = { z0: 120, z1: 176 }
const BRIDGES_X = [-43, 111]
const sideOf = (z: number) => (z < RIVER.z0 ? 'N' : z > RIVER.z1 ? 'S' : 'mid')

type Pt = { x: number; z: number }
function leg(a: Pt, b: Pt): { dist: number; corners: number } {
  if (sideOf(a.z) === sideOf(b.z) || sideOf(a.z) === 'mid' || sideOf(b.z) === 'mid') {
    return { dist: Math.abs(a.x - b.x) + Math.abs(a.z - b.z), corners: 2 }
  }
  // opposite banks: must thread a bridge — pick the cheaper of the two
  let best = Infinity
  for (const bx of BRIDGES_X) best = Math.min(best, Math.abs(a.x - bx) + Math.abs(a.z - b.z) + Math.abs(bx - b.x))
  return { dist: best, corners: 4 }
}

const ROUTE: Pt[] = [
  { x: SPAWN.x, z: SPAWN.z },
  { x: DESTINATIONS[0].x, z: DESTINATIONS[0].z },
  { x: DESTINATIONS[1].x, z: DESTINATIONS[1].z },
  { x: DESTINATIONS[2].x, z: DESTINATIONS[2].z },
]
export const LEGS = [leg(ROUTE[0], ROUTE[1]), leg(ROUTE[1], ROUTE[2]), leg(ROUTE[2], ROUTE[3])]
export const ROUTE_DIST = LEGS.reduce((s, l) => s + l.dist, 0)
export { START_MIN, END_MIN, HARDCAP_MIN }

export type Bot = {
  name: string
  cruise: number // straight-line speed (m/s)
  corner: number // speed taken through a corner (m/s)
  cornerSharp: number // fraction of full turnRate used in a corner
  pedPerKm: number // expected pedestrian clips per km
  crashPerKm: number // expected crashes per km
  navWaste: number // distance multiplier for sloppy navigation
  ditherSec: number // wasted real seconds (indecision / wrong turns)
}

// crude inverse-CDF Poisson sample from one uniform draw (fine for modelling)
function poisson(lambda: number, u: number): number {
  let p = Math.exp(-lambda)
  let cum = p
  let k = 0
  while (u > cum && k < 30) {
    k++
    p *= lambda / k
    cum += p
  }
  return k
}

const CORNER_M = 6 // metres a corner "consumes" at corner speed

export type RunResult = {
  delivered: boolean
  wasLate: boolean
  latenessMin: number
  pedestrianHits: number
  crashes: number
  bowlState: 'composed' | 'functional' | 'disheveled'
  bowlIntegrity: number
  arrivedMin: number
  minutesUsed: number
  realSec: number
  tier: 'composed' | 'functional' | 'disheveled'
}

// minPerSec lets us SWEEP the clock budget (= 60 / REAL_SECONDS_PER_HOUR).
export function simulate(bot: Bot, minPerSec: number, rng: () => number): RunResult {
  resetBowl()
  let realSec = bot.ditherSec
  let igPenalty = 0 // in-game minutes from time costs + HR penalties
  let hits = 0
  let crashes = 0

  for (let i = 0; i < 3; i++) {
    const carrying = i >= 1 // the bowl rides from the Bowlz pickup (stop 0) onward
    const D = LEGS[i].dist * bot.navWaste
    const C = LEGS[i].corners
    const dtCorner = CORNER_M / bot.corner

    // driving time: corners at corner speed, the rest at cruise
    realSec += C * dtCorner + Math.max(0, D - C * CORNER_M) / bot.cruise

    // cornering slosh (real model), only while carrying
    if (carrying) {
      const latAccel = bot.corner * DRIVE.turnRate * bot.cornerSharp
      for (let c = 0; c < C; c++) sloshBowl(latAccel, 0, dtCorner)
    }

    // pedestrian clips
    const h = poisson(bot.pedPerKm * (D / 1000), rng())
    hits += h
    igPenalty += h * HR_TIME_PENALTY
    realSec += h * 1.5 // each "exchange info" pause
    if (carrying) for (let k = 0; k < h; k++) sloshBowl(0, 0.12, 0.1) // the jostle

    // crashes
    const cr = poisson(bot.crashPerKm * (D / 1000), rng())
    crashes += cr
    realSec += cr * 2 // recoil + recovery
    if (carrying) for (let k = 0; k < cr; k++) sloshBowl(0, 0.3 + rng() * 0.5, 0.1)

    // the pickup at this leg's destination (hold time + the wait's clock cost)
    realSec += DESTINATIONS[i].holdSeconds
    igPenalty += DESTINATIONS[i].timeCost
  }

  const arrivedMin = START_MIN + realSec * minPerSec + igPenalty
  const delivered = arrivedMin <= HARDCAP_MIN
  const wasLate = arrivedMin > END_MIN
  const base = {
    delivered,
    wasLate,
    latenessMin: Math.max(0, Math.round(arrivedMin - END_MIN)),
    pedestrianHits: hits,
    bowlState: bowlTier(bowl.integrity),
  }
  return {
    ...base,
    crashes,
    bowlIntegrity: bowl.integrity,
    arrivedMin,
    minutesUsed: arrivedMin - START_MIN,
    realSec,
    tier: scoreTier(base),
  }
}
