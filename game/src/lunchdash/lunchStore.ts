import { create } from 'zustand'
import { DESTINATIONS } from './destinations'
import { driveClock, START_MIN, END_MIN } from './clockState'
import { bowl, bowlTier, type BowlTier } from './bowlState'
import { crash, damageTier, type DamageTier } from './crashState'
import { hr } from './pedState'

// Objective progress + the RUN OUTCOME for the Lunch Dash drive. The active
// destination advances as the car reaches each stop; reaching the last stop
// (Alignly HQ) ENDS the run and writes `final` — the receipt the retrospective
// screen reads (and, later, Phase 4). A 12:30 no-show also ends the run.

export type ReturnTier = 'composed' | 'functional' | 'disheveled'

// The Phase 3 receipt — a snapshot captured the instant the run ends.
export type RunFinal = {
  delivered: boolean // made it back to HQ with everything
  arrivedMin: number // in-game clock at the end
  minutesUsed: number // of the 60
  wasLate: boolean // past 12:00
  latenessMin: number // minutes past 12:00 (0 if on time)
  pedestrianHits: number
  bowlIntegrity: number
  bowlState: BowlTier
  damage: DamageTier
  stopsCompleted: number
  returnTier: ReturnTier
}

// Composed / Functional / Disheveled — the blueprint's tier truth table.
function scoreTier(f: Omit<RunFinal, 'returnTier'>): ReturnTier {
  if (!f.delivered) return 'disheveled' // never made it back = the worst receipt
  const bowlOk = f.bowlState !== 'disheveled'
  if (!f.wasLate && f.pedestrianHits === 0 && f.bowlState === 'composed') return 'composed'
  if (bowlOk && ((!f.wasLate && f.pedestrianHits <= 2) || (f.latenessMin <= 5 && f.pedestrianHits <= 1))) return 'functional'
  return 'disheveled'
}

function capture(delivered: boolean, stopsCompleted: number): RunFinal {
  const arrivedMin = driveClock.minutes
  const base = {
    delivered,
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

type LunchState = {
  stepIndex: number
  done: boolean // the run is over (won or failed) — the retrospective is up
  final: RunFinal | null
  advance: () => void // reach a stop; reaching the last one ends + scores the run
  finishLate: () => void // 12:30 no-show — auto-fail
  reset: () => void
}

export const useLunchStore = create<LunchState>()((set, get) => ({
  stepIndex: 0,
  done: false,
  final: null,
  advance: () => {
    if (get().done) return
    const next = get().stepIndex + 1
    if (next >= DESTINATIONS.length) {
      set({ stepIndex: next, done: true, final: capture(true, DESTINATIONS.length) })
    } else {
      set({ stepIndex: next })
    }
  },
  finishLate: () => {
    if (get().done) return
    set({ done: true, final: capture(false, get().stepIndex) })
  },
  reset: () => set({ stepIndex: 0, done: false, final: null }),
}))
