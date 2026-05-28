// Achievement definitions for Pre-Standup Alignment.
//
// Five achievements that map to distinct play styles, so a single playthrough
// only naturally hits one or two. Collecting them all forces variety on
// replay — that's the replay loop.
//
// Each achievement has a `condition` evaluated against a RunSnapshot at the
// moment the game ends. The snapshot includes both final meter values and
// run-scoped flags (recoveryTriggered, delayedFireCount).

import type { Ending } from '../state/gameStore'

export type RunSnapshot = {
  ending: Ending
  projectStatus: number
  pissedOff: number
  meetingLoad: number
  alignment: number
  // Minutes since 9:00 AM at end. Used by the On Time achievement.
  timeMinutes: number
  // Per-action use counts (coping bar + Printer + Phyllis interactions).
  // Keyed by action id ('vent', 'coffee', 'bathroom', 'meme', 'printer',
  // 'phyllis'). Used by completionist achievements like Printer Prophet.
  copingUseCounts: Record<string, number>
  // Run-scoped event counters (reset on each run, not persisted).
  recoveryTriggered: boolean
  delayedFireCount: number
  // Slack engagement during the run — used by Permanent Lurker (false)
  // and Inbox Zero (true + low unread).
  slackOpenedAtAll: boolean
  finalUnreadSlack: number
}

export type Achievement = {
  id: string
  title: string
  description: string
  // True if this run earned the achievement.
  condition: (s: RunSnapshot) => boolean
  // Optional sentence shown on the ending screen — corporate satire flavor.
  flavor: string
  // Emoji rendered as the badge on the ending screen achievement card.
  // Picked per-achievement to telegraph the win (clock for On Time,
  // printer for Printer Prophet, etc).
  emoji: string
}

export const ACHIEVEMENTS: Achievement[] = [
  {
    id: 'survived-the-sweep',
    title: 'Survived the Sweep',
    description: 'Completed Pre-Standup Alignment without escalation.',
    emoji: '🎯',
    condition: (s) =>
      s.ending === 'standup-complete' ||
      s.ending === 'green-enough' ||
      s.ending === 'pyrrhic-alignment',
    flavor: 'You will be ready for the actual standup in approximately 6 hours.',
  },
  {
    id: 'on-time',
    title: 'On Time',
    description: 'Handled all 5 stakeholders before the 10:15 standup.',
    emoji: '⏰',
    // Won the run AND timeMinutes never exceeded the deadline.
    condition: (s) =>
      (s.ending === 'standup-complete' ||
        s.ending === 'green-enough' ||
        s.ending === 'pyrrhic-alignment') &&
      s.timeMinutes <= 75,
    flavor: 'You arrived 90 seconds early and made eye contact with no one.',
  },
  {
    id: 'aggressively-aligned',
    title: 'Aggressively Aligned',
    description: 'Ended a run with Alignment 8 or higher.',
    emoji: '🏆',
    condition: (s) => s.alignment >= 8,
    flavor: 'You have collected enough artifacts to summon a Strategy Doc.',
  },
  {
    id: 'performative-flailing',
    title: 'Performative Flailing',
    description: 'Won a run with Alignment 2 or lower.',
    emoji: '🎭',
    // You completed the standup but produced almost no alignment "value".
    // The play-style achievement for going through the motions.
    condition: (s) =>
      (s.ending === 'standup-complete' ||
        s.ending === 'green-enough') &&
      s.alignment <= 2,
    flavor: 'You did the standup. You said the words. Nothing materially happened.',
  },
  {
    id: 'aligned-but-hated',
    title: 'Aligned but Hated',
    description: 'Won with Alignment ≥ 7 and Team Pissed-Off ≥ 45.',
    emoji: '😤',
    // Thresholds lowered 8→7 / 60→45 after playtest: the original combo was
    // mathematically unreachable. High-alignment choices are low-pissed, and
    // the high-pissed paths spike Meeting Load into calendar-apocalypse
    // before you can finish. 7/45 is hittable by a deliberately
    // aggravating-but-aligned run. Matches the pyrrhic-alignment ending gate.
    condition: (s) => s.alignment >= 7 && s.pissedOff >= 45,
    flavor:
      'Everyone agreed with you. Everyone is also drafting an exit interview question they will ask each other.',
  },
  {
    id: 'glassdoor-draft',
    title: 'Glassdoor Draft',
    description: 'Pissed-Off reached the Glassdoor tier (≥ 75).',
    emoji: '💼',
    // Bumped 60 → 75 to match the actual GLASSDOOR_DRAFT meter tier.
    condition: (s) => s.pissedOff >= 75,
    flavor: 'Three of your reports have suspiciously updated LinkedIn headlines.',
  },
  {
    id: 'calendar-apocalypse',
    title: 'Calendar Apocalypse',
    description: 'Triggered the calendar recovery panel in a run.',
    emoji: '📅',
    condition: (s) => s.recoveryTriggered,
    flavor: 'You said "I have a hard stop" so many times you forgot which one.',
  },
  {
    id: 'reality-caught-up',
    title: 'Reality Caught Up',
    description: 'A delayed consequence fired during a run.',
    emoji: '⚡',
    condition: (s) => s.delayedFireCount >= 1,
    flavor: 'The phrase "as I flagged earlier" was used against you.',
  },
  {
    id: 'printer-prophet',
    title: 'Printer Prophet',
    description: 'Interacted with the printer 5 times in a single run.',
    emoji: '🖨️',
    // The printer has 5 escalating bark lines — this rewards finding all of them.
    condition: (s) => (s.copingUseCounts.printer ?? 0) >= 5,
    flavor: 'PC LOAD LETTER. PC LOAD MEANING.',
  },
  {
    id: 'plant-friend',
    title: 'Plant Friend',
    description: 'Vented to Phyllis 5 times in a single run.',
    emoji: '🌿',
    condition: (s) => (s.copingUseCounts.phyllis ?? 0) >= 5,
    flavor:
      'You and Phyllis have decided to take this 1:1 outside the formal evaluation cycle.',
  },
  {
    id: 'permanent-lurker',
    title: 'Permanent Lurker',
    description: 'Completed the standup without opening the Slack panel once.',
    emoji: '👁️',
    // Only counts as 'won' if you actually finished the day — failing the
    // standup AND ignoring Slack is just regular failure, not avoidance art.
    condition: (s) =>
      (s.ending === 'standup-complete' ||
        s.ending === 'green-enough' ||
        s.ending === 'pyrrhic-alignment') &&
      !s.slackOpenedAtAll,
    flavor: 'You saw the red dot. You said nothing.',
  },
  {
    id: 'inbox-zero',
    title: 'Inbox Zero',
    description: 'Opened Slack and finished the run with fewer than 8 unread.',
    emoji: '📭',
    // Bumped threshold 5 → 8 after the audit: with ambient pings landing
    // throughout the run, <5 unread required a very specific "open Slack
    // right before the last NPC" maneuver. <8 lets the player open Slack
    // somewhere in the middle of the run and still qualify if they're
    // reasonably attentive.
    condition: (s) => s.slackOpenedAtAll && s.finalUnreadSlack < 8,
    flavor:
      'You read every message that came in. We are obligated to consider whether this was a good use of your time.',
  },
]

// Compute which achievements this run earned. Returns IDs.
export function evaluateAchievements(snap: RunSnapshot): string[] {
  return ACHIEVEMENTS.filter((a) => a.condition(snap)).map((a) => a.id)
}

// ---- localStorage persistence ----
const STORAGE_KEY = 'blocked.achievements.v1'

export function loadUnlocked(): Set<string> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return new Set()
    const arr = JSON.parse(raw)
    return new Set(Array.isArray(arr) ? arr.filter((x): x is string => typeof x === 'string') : [])
  } catch {
    // localStorage unavailable, corrupted JSON, etc — fail silent, start fresh.
    return new Set()
  }
}

export function saveUnlocked(ids: Set<string>): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...ids]))
  } catch {
    // ignore
  }
}
