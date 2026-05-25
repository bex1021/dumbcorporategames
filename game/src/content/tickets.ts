// Jira tickets for the Pre-Standup Alignment sprint. Each stakeholder NPC
// has exactly one ticket — handling that NPC in dialogue moves their ticket
// from TO DO → DONE on the Sprint Retrospective board at game end.
//
// Reused by both the IntroScreen (Kanban board view: all TO DO) and the
// EndingScreen (Sprint Retrospective: tickets placed in final columns based
// on game state). NPC.id ↔ Ticket.npcId is the join key.
//
// Ticket numbers and titles are written for corporate-satire effect — these
// are the *real* underlying problems each stakeholder is going to surface
// in dialogue. Reading the board before the day starts is roughly the same
// information you'd extract by talking to all 5 stakeholders.

export type TicketType = 'bug' | 'story' | 'task' | 'epic'
export type TicketPriority = 'highest' | 'high' | 'medium' | 'low' | 'lowest'

export type Ticket = {
  key: string // 'ALN-1842'
  npcId: string // matches NPCS ids
  title: string
  type: TicketType
  priority: TicketPriority
  storyPoints: number
  reporter: string // NPC name (display only)
  // Short label appended when shown in the BLOCKED column on the retro board.
  blockedReason?: string
}

export const EPIC = {
  key: 'CHP-200',
  title: 'Customer Happiness Portal Refresh',
  status: 'In Progress',
  description:
    'Strategic enabler for the Customer Happiness vertical. Mission-critical, paradigm-shifting, approximately 80% defined. Status must remain GREEN.',
} as const

export const TICKETS: Ticket[] = [
  {
    key: 'ALN-1842',
    npcId: 'brent',
    title: 'Define "Premium" (vs "Premium but frictionless")',
    type: 'bug',
    priority: 'high',
    storyPoints: 3,
    reporter: 'Brent',
    blockedReason: 'Awaiting requirements clarification',
  },
  {
    key: 'ALN-1843',
    npcId: 'tasha',
    title: 'Reconcile "enterprise but not B2B" design direction',
    type: 'story',
    priority: 'medium',
    storyPoints: 5,
    reporter: 'Tasha',
    blockedReason: 'Stakeholder feedback unclear',
  },
  {
    key: 'ALN-1844',
    npcId: 'priya',
    title: 'Triage new "small but cross-cutting" requirement',
    type: 'story',
    priority: 'high',
    storyPoints: 8,
    reporter: 'Priya',
    blockedReason: 'Scope under review',
  },
  {
    key: 'ALN-1845',
    npcId: 'chad',
    title: 'Realign Thursday demo with actual ship date',
    type: 'task',
    priority: 'highest',
    storyPoints: 2,
    reporter: 'Chad',
    blockedReason: 'Client expects committed Thursday',
  },
  {
    key: 'ALN-1846',
    npcId: 'diane',
    title: 'Address surfaced themes from skip-level 1:1s',
    type: 'task',
    priority: 'low',
    storyPoints: 1,
    reporter: 'Diane',
    blockedReason: 'HR follow-up needed',
  },
]

// Display helpers for the board — kept in this file so intro/ending share
// a single source of truth on icon + color choices.

export function typeIcon(t: TicketType): string {
  switch (t) {
    case 'bug':
      return '🐛'
    case 'story':
      return '📖'
    case 'task':
      return '✓'
    case 'epic':
      return '⚡'
  }
}

// Priority icons mimic Jira's red/orange/yellow/blue arrow indicators.
// We use colored unicode triangles + a label for clarity.
export function priorityChip(p: TicketPriority): { icon: string; label: string; color: string } {
  switch (p) {
    case 'highest':
      return { icon: '⏶', label: 'Highest', color: '#cd1316' }
    case 'high':
      return { icon: '▲', label: 'High', color: '#cd1316' }
    case 'medium':
      return { icon: '▶', label: 'Medium', color: '#e97f33' }
    case 'low':
      return { icon: '▼', label: 'Low', color: '#2684ff' }
    case 'lowest':
      return { icon: '⏷', label: 'Lowest', color: '#2684ff' }
  }
}

// ---- Story-based ticket outcomes (Sprint Retrospective) ----
//
// Each (npcId, choiceId) maps to where the ticket lands on the retro board
// AND a short resolution comment that appears on the card. Unhandled NPCs
// (no choice recorded) → 'todo'. Used by the EndingScreen retro view.

export type TicketColumn = 'todo' | 'progress' | 'blocked' | 'done'

export type TicketOutcome = {
  column: TicketColumn
  comment: string // brief Jira-comment-style line shown on the retro card
}

// Map of npcId → choiceId → outcome. The 'a/b/c/d' ids match DialogueChoice.id
// in src/content/dialogue.ts. Outcomes were designed alongside the dialogue
// effects to feel cohesive: a "dismissive" choice that hurts meters in-game
// ends up Blocked on the board with a corporate-flavored excuse.
const TICKET_OUTCOMES: Record<string, Record<string, TicketOutcome>> = {
  brent: {
    a: { column: 'done', comment: 'Requirements clarified. PR unblocked.' },
    b: { column: 'progress', comment: 'Sub-ticket ALN-1849 opened for definition.' },
    c: { column: 'progress', comment: 'Sync scheduled for 1:30 PM.' },
    d: { column: 'blocked', comment: '"Sounds like no blockers." Awaiting reality.' },
  },
  tasha: {
    a: { column: 'done', comment: 'Specific feedback captured. Iterating.' },
    b: { column: 'blocked', comment: '"Make it pop" said aloud. Designer reviewing options.' },
    c: { column: 'progress', comment: 'Stakeholder map circulating. 4 of 7 responses pending.' },
    d: { column: 'done', comment: 'Reframed as "brand tension." Phrase locked in.' },
  },
  priya: {
    a: { column: 'progress', comment: 'MVP definition still being negotiated.' },
    b: { column: 'done', comment: 'Requirement moved to Phase 2. Scope held.' },
    c: { column: 'progress', comment: 'Scope alignment meeting on calendar.' },
    d: { column: 'blocked', comment: 'Accepted "small" change. Onboarding regressed.' },
  },
  chad: {
    a: { column: 'progress', comment: 'Reviewing exact client commitments.' },
    b: { column: 'done', comment: 'Thursday reframed as "target state." Sales aligned.' },
    c: { column: 'progress', comment: 'Looped in leadership. Awaiting executive lens.' },
    d: { column: 'blocked', comment: 'Risk "being monitored." Reality clearing its throat.' },
  },
  diane: {
    a: { column: 'done', comment: 'Approved HR language acquired. Themes addressable.' },
    b: { column: 'done', comment: 'Reframed as "growth moment." Temperature dropped.' },
    c: { column: 'progress', comment: 'Feedback calibration meeting scheduled.' },
    d: { column: 'blocked', comment: '"Gentle" non-response. HR added a follow-up flag.' },
  },
}

export function ticketOutcome(
  npcId: string,
  choiceId: string | undefined
): TicketOutcome {
  if (!choiceId) {
    return { column: 'todo', comment: 'Unhandled. Stakeholder did not get their slot.' }
  }
  const outcome = TICKET_OUTCOMES[npcId]?.[choiceId]
  if (outcome) return outcome
  // Fallback for any unexpected choice id
  return { column: 'progress', comment: 'Conversation incomplete.' }
}
