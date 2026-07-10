// Choice-aware Slack pings — the Receipts, rendered.
//
// While the player dawdles on the Phase 2 desktop, coworkers ping "is the
// board updated?" Until now those pings were generic. This module rewrites
// them to quote what the player ACTUALLY did to each person in Phase 1 —
// read from campaignState.phase1Final.npcChoices — so the standup you just
// played visibly follows you to your desk. Brent's ping depends on whether
// you clarified his requirement or lied "no blockers"; Priya's depends on
// whether you accepted her "small" change.
//
// Each coworker owns one of the four Phase 2 Jira tickets, so a ping about
// "the board" from that person lands on a ticket they're actually on:
//   Brent → ALN-1842 · Tasha → ALN-1850 · Priya → ALN-1847 · Chad → ALN-1851
//
// Falls back to the generic pressure pings if there's no Phase 1 on record
// (someone deep-linked into Jira Run).

import { readPhase1Final } from '../state/campaignState'

export type Ping = { from: string; text: string; color: string }

const COLOR = {
  brent: '#6b7a8f',
  tasha: '#8a6b8f',
  priya: '#5f8f77',
  chad: '#3a4f7a',
  diane: '#a89876',
  exec: '#b08a3a',
} as const

// [npcId][choiceId] → what they Slack you, keyed to the Phase 1 decision.
const CALLBACK: Record<string, Record<string, string>> = {
  brent: {
    a: 'morning — thanks for actually defining "premium" yesterday. updating ALN-1842 now. is the board current on your end?',
    b: "so there's now a ticket literally called 'Define Premium.' is it assigned to anyone? the board's confusing me",
    c: "still waiting on that 'quick sync' about the requirement. is ALN-1842 updated on the board in the meantime?",
    d: 'you said no blockers yesterday but ALN-1842 is still open and I never got the requirement. board looks stale?',
  },
  tasha: {
    a: 'appreciate you getting me specific feedback yesterday — ALN-1850 is moving. is the board reflecting that?',
    b: "still not sure how to make it 'pop' per your note. ALN-1850 is stuck. board updated?",
    c: 'socializing the design with stakeholders like we agreed — six opinions now. is any of this on the board?',
    d: "'brand tension' is in the ticket now and QA has questions. is ALN-1850 current on the board?",
  },
  priya: {
    a: 'you asked me to define the MVP yesterday — draft is in ALN-1847. is the board showing it?',
    b: "so we moved my 'small' requirement to Phase 2. it's… back. is the board current?",
    c: 'scope alignment meeting incoming, per yesterday. meanwhile — is ALN-1847 updated?',
    d: 'you accepted the small change 🙂 it now affects onboarding, mobile, and the footer. is the board updated?',
  },
  chad: {
    a: 'you asked what exactly I promised the client. it was a lot. does ALN-1851 reflect reality? board current?',
    b: "'target state Thursday' is what we're going with — but the client heard 'Thursday.' is the board updated??",
    c: "leadership's looped in now like you said, and they're looking at the board. is it updated?",
    d: "risk is 'being monitored' 👍 the client's going to pull up the board in standup. is it updated?",
  },
}

// Diane (HR, no ticket) and the Exec stay choice-agnostic — they're the
// ambient surveillance, not ticket owners. They close the escalation.
const DIANE_TAIL: Ping = { from: 'Diane', text: "another nudge — the board's still looking a little stale on my end 💚", color: COLOR.diane }
const EXEC_TAIL: Ping = { from: 'Exec', text: "circling back — board still isn't updated. can you refresh it today?", color: COLOR.exec }

const NAME = { brent: 'Brent', tasha: 'Tasha', priya: 'Priya', chad: 'Chad' } as const

// Generic fallback (no Phase 1 on record) — the original pressure pings.
const GENERIC: Ping[] = [
  { from: 'Diane', text: 'hey — are your tickets up to date? 👀', color: COLOR.diane },
  { from: 'Brent', text: "is the board current? can't tell what's actually in progress", color: COLOR.brent },
  { from: 'Exec', text: "looking at the board now… doesn't look updated?", color: COLOR.exec },
  { from: 'Diane', text: "another nudge — board's still looking a little stale on my end 💚", color: COLOR.diane },
  { from: 'Chad', text: "client's going to pull up the board in standup. is it updated?", color: COLOR.chad },
  { from: 'Exec', text: "circling back — board still isn't updated. can you refresh it today?", color: COLOR.exec },
]

/**
 * Build the escalating pressure-ping list for this run. If Phase 1 was played,
 * the four ticket-owners quote your actual choices (in ticket order), then
 * Diane + the Exec close it. Otherwise, the generic pressure pings.
 */
export function buildPressurePings(): Ping[] {
  const p1 = readPhase1Final()
  if (!p1) return GENERIC

  const order: Array<keyof typeof NAME> = ['brent', 'tasha', 'priya', 'chad']
  const pings: Ping[] = []
  for (const id of order) {
    const choice = p1.npcChoices[id]
    const text = choice && CALLBACK[id]?.[choice]
    if (text) pings.push({ from: NAME[id], text, color: COLOR[id] })
  }
  // Always end on the ambient-surveillance beat; if somehow no callbacks
  // resolved (unexpected choice ids), fall back to generic so the desk still
  // pressures the player.
  if (pings.length === 0) return GENERIC
  pings.push(DIANE_TAIL, EXEC_TAIL)
  return pings
}
