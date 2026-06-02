// Phase 2 (Jira Run) achievement CATALOG + persistence.
//
// Deliberately lightweight — just the badge metadata (no RunResult predicates,
// no Three.js / runner imports) — so the level-select menu can list "all
// achievements collected" WITHOUT pulling the heavy lazy-loaded Jira Run chunk
// into the eagerly-loaded menu bundle. JiraRun.tsx imports this catalog, keeps
// the earned() predicates next to its run logic, and writes the earned ids here
// on a win. Mirrors content/achievements.ts (Phase 1) + state/progress.ts.

export type JRAchievementMeta = { id: string; emoji: string; title: string; desc: string }

export const JR_ACHIEVEMENTS_CATALOG: JRAchievementMeta[] = [
  { id: 'shipped', emoji: '🏁', title: 'Technically Shipped', desc: 'All four tickets updated. The board is, briefly, green.' },
  { id: 'novalue', emoji: '💸', title: '$0.00 of Value', desc: 'Maximum velocity, zero business value. Textbook.' },
  { id: 'flow', emoji: '🌊', title: 'Sixty Minutes of Flow', desc: 'One full hour, uninterrupted. A workplace miracle.' },
  { id: 'dnd', emoji: '🔕', title: 'Do Not Disturb', desc: 'Dodged 12+ Slack pings. “Got a sec?” — no.' },
  { id: 'lurker', emoji: '🧘', title: 'Inbox Zero (Spiritually)', desc: 'Ignored 16+ pings into the void. Near-total Slack denial.' },
  { id: 'worms', emoji: '🪱', title: 'Worms Stay Canned', desc: 'Left 16+ cans of worms sealed. Scope uncrept, against the odds.' },
  { id: 'declined', emoji: '📅', title: 'Declined With Body', desc: 'Slid under 17+ meeting invites. The calendar bows to you.' },
  { id: 'unblock', emoji: '🚧', title: 'Unblockable', desc: 'Weaved past 24+ dependency walls. Still technically blocked.' },
  { id: 'ninja', emoji: '🥷', title: 'Untouchable', desc: 'Survived 75+ distractions in one hour — a maximally cursed day, cleared.' },
  { id: 'hoarder', emoji: '⭐', title: 'Story-Point Hoarder', desc: 'Banked 10,000+ story points. Worth, as ever, $0.00.' },
]

const STORAGE_KEY = 'blocked.jr-achievements.v1'

export function loadJRUnlocked(): Set<string> {
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
// on every win.
export function saveJRUnlocked(ids: Iterable<string>): void {
  try {
    const set = loadJRUnlocked()
    let changed = false
    for (const id of ids) if (!set.has(id)) { set.add(id); changed = true }
    if (changed) localStorage.setItem(STORAGE_KEY, JSON.stringify([...set]))
  } catch {
    // ignore
  }
}
