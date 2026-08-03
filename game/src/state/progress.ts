// Campaign progression — which phases the player has BEATEN (won), persisted
// across browser sessions in localStorage. Mirrors the achievements
// persistence pattern in content/achievements.ts ("one brain": small, pure,
// fail-silent localStorage helpers; no React, no store dependency).
//
// The campaign is a linear chain: each phase unlocks the next ONLY when the
// previous one is beaten (a winning ending). The level-select hub (routes/
// Play.tsx) reads this to gate locked phases; the two games write to it when
// the player wins.

export type PhaseId = 'phase1' | 'phase2' | 'phase3' | 'phase4'

export type CampaignPhase = {
  id: PhaseId
  n: number // display number
  label: string // "PHASE 1"
  title: string // "The Standup"
  sub: string // short uppercase tagline
  blurb: string // 1–2 line description for the hub card
  // Where to play it. `null` = not built yet (renders as "coming soon").
  route: string | null
  // Must be beaten before this unlocks. `null` = always unlocked (the opener).
  requires: PhaseId | null
  minutes: string // est. play length, e.g. "5–10 MIN"
  controls: string // e.g. "WASD + E"
}

// The single source of truth for the campaign order + copy. Adding Phase 4
// later is just another entry here (+ its route).
export const CAMPAIGN: CampaignPhase[] = [
  {
    id: 'phase1',
    n: 1,
    label: 'PHASE 1',
    title: 'The Standup',
    sub: 'PRE-STANDUP ALIGNMENT',
    blurb:
      'An earnest PM has 75 minutes to extract alignment from five blocked coworkers before the 10:15 standup. They all say "no blockers," then describe the blocker. Every fix works. Every fix costs something.',
    route: '/play/blocked',
    requires: null,
    minutes: '5–10 MIN',
    controls: 'WASD + E',
  },
  {
    id: 'phase2',
    n: 2,
    label: 'PHASE 2',
    title: 'Jira Run',
    sub: 'UPDATE YOUR TICKETS',
    blurb:
      'You survived standup. Now lock in, get sucked into the board, and sprint the Atlassian gauntlet to deposit four ticket updates before the next meeting eats you.',
    route: '/play/jira-run',
    requires: 'phase1',
    minutes: '2–4 MIN',
    controls: 'WASD',
  },
  {
    id: 'phase3',
    n: 3,
    label: 'PHASE 3',
    title: 'Lunch Dash',
    sub: 'BACK BY 1:00',
    blurb:
      "It's noon. The exec pings you: grab his Corporate Slop Bowlz order, get your own lunch, and be back by 1:00 for the Architecture Sync — the meeting that's key. The bowl does not travel well.",
    route: '/play/lunch-dash',
    requires: 'phase2',
    minutes: '2–4 MIN',
    controls: 'WASD',
  },
  {
    id: 'phase4',
    n: 4,
    label: 'PHASE 4',
    title: 'The Performance Review',
    sub: 'CONVINCE THE ORG CHART',
    blurb:
      "1:00 PM. Three meetings up the org chart — Engineering, Product, then the Exec himself — and every one of them is secretly a fighting game. Win the afternoon, or leave with a PIP and a handshake.",
    route: '/play/performance-review',
    requires: 'phase3',
    minutes: '5–10 MIN',
    controls: 'WASD + J/K/L',
  },
]

// ---- localStorage persistence ----
const STORAGE_KEY = 'blocked.progress.v1'

export function loadBeaten(): Set<PhaseId> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return new Set()
    const arr = JSON.parse(raw)
    return new Set(
      Array.isArray(arr)
        ? arr.filter((x): x is PhaseId => typeof x === 'string')
        : []
    )
  } catch {
    // localStorage unavailable, corrupted JSON, etc — fail silent, start fresh.
    return new Set()
  }
}

// Idempotent: marking an already-beaten phase is a no-op. Safe to call on
// every win without de-duping at the call site.
export function markBeaten(id: PhaseId): void {
  try {
    const beaten = loadBeaten()
    if (beaten.has(id)) return
    beaten.add(id)
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...beaten]))
  } catch {
    // ignore
  }
}

// A phase is unlocked if it has no prerequisite, or its prerequisite is beaten.
export function isUnlocked(phase: CampaignPhase, beaten: Set<PhaseId>): boolean {
  return phase.requires === null || beaten.has(phase.requires)
}

// Look up a phase's display label (for "Beat PHASE 1 to unlock" hints).
export function phaseLabel(id: PhaseId): string {
  return CAMPAIGN.find((p) => p.id === id)?.label ?? id
}
