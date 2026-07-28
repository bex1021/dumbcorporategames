// Phase 3 (Lunch Dash) achievement CATALOG + persistence.
//
// Same shape as content/jrAchievements.ts (Phase 2): just the badge metadata
// (no RunFinal predicates, no R3F imports) so the level-select menu can list
// "all achievements collected" WITHOUT pulling the heavy Lunch Dash chunk into
// the eagerly-loaded menu bundle. Retrospective.tsx keeps the earned()
// predicates next to the run result and writes the earned ids here on finish.

export type LunchAchievementMeta = { id: string; emoji: string; title: string; desc: string }

export const LUNCH_ACHIEVEMENTS_CATALOG: LunchAchievementMeta[] = [
  { id: 'delivered', emoji: '🥗', title: 'Nourishment Acquired', desc: 'The bowl reached the exec. Business value generated: $0.00.' },
  { id: 'novalue', emoji: '💸', title: '$0.00 of Value', desc: 'Peak logistics, zero business value. Textbook.' },
  { id: 'ontime', emoji: '⏱️', title: 'Back Before the Sync', desc: 'Rolled in by 1:00. The Architecture Sync almost missed you.' },
  { id: 'composed', emoji: '🧘', title: 'Fully Composed', desc: 'Bowl intact, no incidents, unhurried. The exec barely looked up.' },
  { id: 'bowlintact', emoji: '🍱', title: 'The Salmon Survived', desc: 'Delivered presentable — not a leaf displaced.' },
  { id: 'cleanrecord', emoji: '🕊️', title: 'Clean HR Record', desc: 'Not one soul clipped. Diane has nothing to file.' },
  { id: 'pristine', emoji: '✨', title: 'Not a Scratch', desc: 'Personal vehicle returned pristine. Mileage reimbursement: pending, forever.' },
  { id: 'spare', emoji: '🏃', title: 'Time to Spare', desc: 'Back early — time you will immediately lose to another meeting.' },
  { id: 'menace', emoji: '🚨', title: 'Menace to the Commute', desc: 'Multiple HR incidents in one lunch run. A cursed errand, delivered.' },
]

const STORAGE_KEY = 'blocked.lunch-achievements.v1'

export function loadLunchUnlocked(): Set<string> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return new Set()
    const arr = JSON.parse(raw)
    return new Set(Array.isArray(arr) ? arr.filter((x): x is string => typeof x === 'string') : [])
  } catch {
    return new Set()
  }
}

// Merge newly-earned ids into the persisted set (never un-earns). Safe to call
// on every finish.
export function saveLunchUnlocked(ids: Iterable<string>): void {
  try {
    const set = loadLunchUnlocked()
    let changed = false
    for (const id of ids) if (!set.has(id)) { set.add(id); changed = true }
    if (changed) localStorage.setItem(STORAGE_KEY, JSON.stringify([...set]))
  } catch {
    // ignore
  }
}
