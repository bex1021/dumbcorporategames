import { create } from 'zustand'
import { DESTINATIONS } from './destinations'
import { driveClock, START_MIN, END_MIN } from './clockState'
import { bowl, bowlTier, type BowlTier } from './bowlState'
import { crash, damageTier, type DamageTier } from './crashState'
import { hr } from './pedState'
import { scoreTier, type ReturnTier } from './scoring'
import { markBeaten } from '../state/progress'
import { writePhase3Final } from '../state/campaignState'

// Objective progress + the RUN OUTCOME for the Lunch Dash drive. The active
// destination advances as the car reaches each stop; reaching the last stop
// (Alignly HQ) WITH both items ENDS the run as a win and writes `final` — the
// receipt the retrospective reads. Two ways to lose: the noon deadline passes
// (timeOut), or you can't deliver because the salmon went overboard and you ran
// out of time fetching another.

export type { ReturnTier }
export type RunOutcome = 'win' | 'timeout'

// The Phase 3 receipt — a snapshot captured the instant the run ends.
export type RunFinal = {
  delivered: boolean // made it back to HQ with everything before noon
  outcome: RunOutcome
  arrivedMin: number // in-game clock at the end
  minutesUsed: number // of the 60
  wasLate: boolean // past 12:00 (only meaningful pre-deadline; noon is now a hard fail)
  latenessMin: number
  pedestrianHits: number
  bowlIntegrity: number
  bowlState: BowlTier
  damage: DamageTier
  stopsCompleted: number
  returnTier: ReturnTier
}

function capture(delivered: boolean, outcome: RunOutcome, stopsCompleted: number): RunFinal {
  const arrivedMin = driveClock.minutes
  const base = {
    delivered,
    outcome,
    arrivedMin,
    minutesUsed: Math.round(arrivedMin - START_MIN),
    wasLate: arrivedMin > END_MIN,
    latenessMin: Math.max(0, Math.round(arrivedMin - END_MIN)),
    pedestrianHits: hr.incidents,
    bowlIntegrity: Math.round(bowl.integrity),
    bowlState: bowlTier(bowl.integrity),
    damage: damageTier(crash.severity),
    stopsCompleted,
  }
  return { ...base, returnTier: scoreTier(base) }
}

// The single source of truth for "which stop is the player actually heading to"
// — used by the HUD, minimap, beacons AND the detector so they never disagree.
// A salmon-overboard sends you back to stop 0 (Corporate Slop Bowlz) for a fresh
// bowl, whatever step you'd reached.
export function activeStop(stepIndex: number, mustRebowl: boolean): number {
  return mustRebowl ? 0 : stepIndex
}

export type StopState = 'active' | 'done' | 'future'
export function stopStateFor(i: number, stepIndex: number, mustRebowl: boolean, done: boolean): StopState {
  const activeIdx = activeStop(stepIndex, mustRebowl)
  if (!done && i === activeIdx) return 'active'
  if (i < stepIndex && i !== activeIdx) return 'done'
  return 'future'
}

type LunchState = {
  stepIndex: number
  mustRebowl: boolean // salmon overboard — must re-acquire a bowl before HQ counts
  done: boolean // the run is over (won or lost) — the retrospective is up
  outcome: RunOutcome | null
  final: RunFinal | null
  advance: () => void // complete the active normal stop; the last one wins the run
  flagRebowl: () => void // the salmon went overboard mid-run
  clearRebowl: () => void // picked up a fresh bowl
  timeOut: () => void // noon passed without delivering — lose
  reset: () => void
}

export const useLunchStore = create<LunchState>()((set, get) => ({
  stepIndex: 0,
  mustRebowl: false,
  done: false,
  outcome: null,
  final: null,
  advance: () => {
    if (get().done) return
    const next = get().stepIndex + 1
    if (next >= DESTINATIONS.length) {
      // Delivering everything back to HQ is the Phase 3 WIN — record it so the
      // campaign chain unlocks Phase 4. (This was previously never called, so a
      // Phase 4 gated on phase3 could never have unlocked.)
      markBeaten('phase3')
      const f = capture(true, 'win', DESTINATIONS.length)
      // Receipts: the return tier + driving crimes feed the Phase 4 Exec opener
      // (Composed → "glad you're back in one piece"; hits → "the Sepulveda
      // incident"). See campaignState.ts + the Phase 4 blueprint.
      writePhase3Final({
        returnTier: f.returnTier, delivered: f.delivered, pedestrianHits: f.pedestrianHits,
        bowlState: f.bowlState, minutesUsed: f.minutesUsed, wasLate: f.wasLate,
      })
      set({ stepIndex: next, done: true, outcome: 'win', final: f })
    } else {
      set({ stepIndex: next })
    }
  },
  flagRebowl: () => {
    if (get().done || get().mustRebowl) return
    set({ mustRebowl: true })
  },
  clearRebowl: () => set({ mustRebowl: false }),
  timeOut: () => {
    if (get().done) return
    set({ done: true, outcome: 'timeout', final: capture(false, 'timeout', get().stepIndex) })
  },
  reset: () => set({ stepIndex: 0, mustRebowl: false, done: false, outcome: null, final: null }),
}))
