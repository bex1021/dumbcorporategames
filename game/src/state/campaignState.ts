// Campaign receipts — the thin spine that carries one day across four games.
//
// The blueprints spec a `phaseNFinal` handoff between phases; until now it
// didn't exist in code, so each game ran as a stranger — your Phase 1 meters,
// choices, and Phase 3 driving evaporated at every boundary. This module is
// the minimum viable version: each phase writes a small final-state record on
// win; the next phase reads it to make the day feel continuous (a dimmed
// carried-meter strip, Slack pings that quote what you actually said, the
// Exec opening Phase 4 with how lunch went).
//
// Same "one brain" pattern as state/progress.ts and content/achievements.ts:
// tiny, pure, fail-silent localStorage helpers. No React, no store dependency,
// so any phase can import it without pulling in another phase's engine.

const KEY = 'blocked.campaign.v1'

// ── Per-phase final-state payloads ──────────────────────────────────────────

export type Phase1Final = {
  projectStatus: number
  pissedOff: number
  meetingLoad: number
  alignment: number
  timeMinutes: number
  /** NPC id → the choice letter/key the player picked in Phase 1. The Receipts. */
  npcChoices: Record<string, string>
  ending: string
}

export type Phase2Final = {
  updatesDeposited: number
  storyPoints: number
  distractionsSurvived: number
}

export type Phase3Final = {
  returnTier: 'composed' | 'functional' | 'disheveled'
  delivered: boolean
  pedestrianHits: number
  bowlState: string
  minutesUsed: number
  wasLate: boolean
}

type Campaign = {
  phase1?: Phase1Final
  phase2?: Phase2Final
  phase3?: Phase3Final
}

// ── Storage ─────────────────────────────────────────────────────────────────

function read(): Campaign {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw)
    return parsed && typeof parsed === 'object' ? (parsed as Campaign) : {}
  } catch {
    return {}
  }
}

function write(c: Campaign): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(c))
  } catch {
    /* private mode / quota — fail silent, continuity just won't carry */
  }
}

export function writePhase1Final(f: Phase1Final): void {
  write({ ...read(), phase1: f })
}
export function writePhase2Final(f: Phase2Final): void {
  write({ ...read(), phase2: f })
}
export function writePhase3Final(f: Phase3Final): void {
  write({ ...read(), phase3: f })
}

export function readPhase1Final(): Phase1Final | null {
  return read().phase1 ?? null
}
export function readPhase2Final(): Phase2Final | null {
  return read().phase2 ?? null
}
export function readPhase3Final(): Phase3Final | null {
  return read().phase3 ?? null
}

/** Whole-day snapshot — for the Phase 4 opener and any cross-phase readout. */
export function readCampaign(): Campaign {
  return read()
}

/** Wipes the receipts (used by a future "start a new day" / New Game+). */
export function clearCampaign(): void {
  try {
    localStorage.removeItem(KEY)
  } catch {
    /* noop */
  }
}
