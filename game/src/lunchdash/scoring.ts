// The return-tier truth table — Composed / Functional / Disheveled. Pulled into
// its own pure, dependency-free module so the balance harness can import the
// SAME scoring code the game uses (single source of truth — no drift).

export type ReturnTier = 'composed' | 'functional' | 'disheveled'

export type ScoreInput = {
  delivered: boolean
  wasLate: boolean
  latenessMin: number
  pedestrianHits: number
  bowlState: ReturnTier
}

export function scoreTier(f: ScoreInput): ReturnTier {
  if (!f.delivered) return 'disheveled' // never made it back = the worst receipt
  const bowlOk = f.bowlState !== 'disheveled'
  if (!f.wasLate && f.pedestrianHits === 0 && f.bowlState === 'composed') return 'composed'
  if (bowlOk && ((!f.wasLate && f.pedestrianHits <= 2) || (f.latenessMin <= 5 && f.pedestrianHits <= 1))) return 'functional'
  return 'disheveled'
}
