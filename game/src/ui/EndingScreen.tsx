// Sprint Retrospective ending screen — light-mode Jira board with the 5
// stakeholder tickets placed in their final columns based on the choices
// the player actually made (see npcChoices in the store + ticketOutcome
// mapping in src/content/tickets.ts). Mirrors the intro Epic page's
// aesthetic so opening + closing of the sprint feel symmetric.
//
// Layout: light Jira nav strip + page header + 2-column body:
//   - Left: Kanban board (4 columns)
//   - Right: SPRINT RETRO panel — outcome title, sprint-goal-met banner,
//     metrics, performance rating, achievements grid, "Start new sprint" CTA.
//
// Page fits a single viewport like the intro; sidebar scrolls if needed.

import {
  useGameStore,
  selectFormattedTime,
  computeRating,
  STANDUP_TIME_MINUTES,
} from '../state/gameStore'
import { ACHIEVEMENTS } from '../content/achievements'
import { NPCS } from '../config/constants'
import {
  TICKETS,
  ticketOutcome,
  typeIcon,
  priorityChip,
  type Ticket,
  type TicketColumn,
} from '../content/tickets'

// ---- Per-ending narrative copy (kept from the previous EndingScreen) ----

type EndingKey =
  | 'standup-complete'
  | 'green-enough'
  | 'pyrrhic-alignment'
  | 'full-escalation'
  | 'calendar-apocalypse'

const ENDING_COPY: Record<EndingKey, { title: string; body: string; goalMet: boolean }> = {
  'standup-complete': {
    title: 'Pre-Standup Complete',
    body:
      'The team is aligned. No one is okay.\n\nIt is 10:15 AM. You survived the morning alignment sweep. The Customer Happiness Portal Refresh remains Green, pending clarification of the word "happiness."\n\nA calendar invite titled "Pre-Pre-Standup-Retro Sync" has appeared on your calendar for tomorrow at 8:45 AM. It is described as "informal."',
    goalMet: true,
  },
  'green-enough': {
    title: 'Green Enough',
    body:
      'The project is Yellow, but leadership has not noticed. This is functionally Green.\n\nSeveral risks are being actively monitored by people who cannot name them. A new dashboard has been requested.\n\nYou now own a slide titled "Path to Green" that nobody — including you — will look at again.',
    goalMet: true,
  },
  'pyrrhic-alignment': {
    // Won the standup by sheer artifact accumulation. Maximum alignment.
    // Maximum bad vibes. The cult-startup ideal.
    title: 'Aligned. Always.',
    body:
      'You did it. Everyone agreed.\n\nThree of them agreed while updating their LinkedIn. One agreed while quietly opening a new tab. Diane agreed in writing, which she then printed.\n\nThe Refresh remains Green. The team remains, technically, a team. You have demonstrated exceptional ownership across cross-functional surfaces — and you can hear someone crying in the wellness room.',
    // Counts as goal-met for the banner; the satire does the dark work.
    goalMet: true,
  },
  'full-escalation': {
    title: 'Full Escalation',
    body:
      'The office has reached Meltdown. This has been escalated to leadership.\n\nA mandatory 90-minute Alignment Reset has been scheduled for everyone, including the plant.',
    goalMet: false,
  },
  'calendar-apocalypse': {
    title: 'Calendar Apocalypse',
    body:
      'There are no empty slots. There are no decisions. There is only availability.\n\nWork cannot fail if no one has time to do it.',
    goalMet: false,
  },
}

// ---- Column display config ----

const COLUMN_DEFS: { key: TicketColumn; label: string }[] = [
  { key: 'todo', label: 'To Do' },
  { key: 'progress', label: 'In Progress' },
  { key: 'blocked', label: 'Blocked' },
  { key: 'done', label: 'Done' },
]

const COLUMN_STYLE: Record<TicketColumn, { header: string; pillBg: string; pillText: string }> = {
  todo: { header: '#5e6c84', pillBg: '#dfe1e6', pillText: '#42526e' },
  progress: { header: '#0052cc', pillBg: '#deebff', pillText: '#0747a6' },
  blocked: { header: '#bf2600', pillBg: '#ffebe6', pillText: '#bf2600' },
  done: { header: '#006644', pillBg: '#e3fcef', pillText: '#006644' },
}

// ---- Performance rating display config ----
const RATING_STYLE = {
  gold: { chip: 'bg-[#fff7d6] text-[#7f5f01] border-[#f5cd47]', icon: '★', label: 'Gold' },
  silver: { chip: 'bg-[#dfe1e6] text-[#42526e] border-[#c1c7d0]', icon: '☆', label: 'Silver' },
  bronze: { chip: 'bg-[#ffe6cc] text-[#974f0c] border-[#ffbf81]', icon: '·', label: 'Bronze' },
  none: { chip: 'bg-[#f4f5f7] text-[#5e6c84] border-[#dfe1e6]', icon: '—', label: 'No rating' },
} as const

export function EndingScreen() {
  const phase = useGameStore((s) => s.phase)
  const ending = useGameStore((s) => s.ending)
  const handledCount = useGameStore((s) => s.handledNPCs.size)
  const npcChoices = useGameStore((s) => s.npcChoices)
  const pissedOff = useGameStore((s) => s.pissedOff)
  const projectStatus = useGameStore((s) => s.projectStatus)
  const meetingLoad = useGameStore((s) => s.meetingLoad)
  const alignment = useGameStore((s) => s.alignment)
  const time = useGameStore(selectFormattedTime)
  const reset = useGameStore((s) => s.reset)
  const unlocked = useGameStore((s) => s.unlockedAchievements)
  const justUnlocked = useGameStore((s) => s.lastUnlockedAchievements)
  const timeMinutes = useGameStore((s) => s.timeMinutes)
  const rating = computeRating({
    ending,
    projectStatus,
    pissedOff,
    meetingLoad,
    alignment,
    timeMinutes,
    npcsHandled: handledCount,
  })

  if (phase !== 'ended' || !ending) return null
  const copy = ENDING_COPY[ending as EndingKey]
  if (!copy) return null

  // Sum of story points where the ticket ended in DONE — our "velocity".
  const ticketsByColumn = bucketTickets(TICKETS, npcChoices)
  const totalPoints = TICKETS.reduce((s, t) => s + t.storyPoints, 0)
  const completedPoints = ticketsByColumn.done.reduce(
    (s, { ticket }) => s + ticket.storyPoints,
    0
  )

  const justUnlockedSet = new Set(justUnlocked)
  const ratingStyle = RATING_STYLE[rating.tier]

  return (
    <div className="fixed inset-0 z-50 bg-[#f4f5f7] text-[#172b4d] flex flex-col overflow-hidden">
      <JiraNav />

      {/* Page header */}
      <div className="px-6 pt-3 pb-2 flex-shrink-0">
        <div className="text-[12px] text-[#5e6c84]">
          Projects › Customer Happiness Portal Refresh › Sprint 47 › Retrospective
        </div>
        <div className="flex items-baseline justify-between mt-0.5 gap-3 flex-wrap">
          <h1 className="text-[20px] font-semibold text-[#172b4d]">
            Sprint 47 retrospective —{' '}
            <span className={copy.goalMet ? 'text-[#006644]' : 'text-[#bf2600]'}>
              {copy.title}
            </span>
          </h1>
          <div className="text-[12px] text-[#5e6c84]">
            {handledCount}/{TICKETS.length} tickets handled · ended {time}
          </div>
        </div>
      </div>

      {/* Two-column body */}
      <div className="flex-1 min-h-0 px-6 pb-4">
        <div className="h-full grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-4">
          {/* Left: Kanban board with final ticket placement */}
          <div className="min-h-0 overflow-y-auto">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {COLUMN_DEFS.map((col) => (
                <RetroColumn
                  key={col.key}
                  title={col.label}
                  tone={col.key}
                  items={ticketsByColumn[col.key]}
                />
              ))}
            </div>
          </div>

          {/* Right: SPRINT RETRO sidebar */}
          <div className="min-h-0 overflow-y-auto flex flex-col gap-3">
            {/* Outcome banner */}
            <div
              className="rounded border px-3 py-2.5"
              style={{
                backgroundColor: copy.goalMet ? '#e3fcef' : '#ffebe6',
                borderColor: copy.goalMet ? '#abf5d1' : '#ffbdad',
              }}
            >
              <div
                className="text-[10px] uppercase tracking-widest font-semibold"
                style={{ color: copy.goalMet ? '#006644' : '#bf2600' }}
              >
                Sprint goal · {copy.goalMet ? '✓ Met' : '✗ Missed'}
              </div>
              <div className="text-[18px] font-semibold mt-0.5 text-[#172b4d]">
                {copy.title}
              </div>
              <div className="text-[12px] text-[#42526e] mt-1 whitespace-pre-line leading-snug">
                {copy.body}
              </div>
            </div>

            {/* Sprint metrics */}
            <div>
              <SectionHeader>Sprint metrics</SectionHeader>
              <div className="bg-white border border-[#dfe1e6] rounded px-2.5 py-1.5 text-[12px]">
                <MetricRow label="Velocity" value={`${completedPoints}/${totalPoints} pts`} />
                <MetricRow label="Project status" value={String(projectStatus)} />
                <MetricRow
                  label="Team sentiment"
                  value={`${pissedOff} pissed-off`}
                  bad={pissedOff >= 60}
                />
                <MetricRow
                  label="Meeting load"
                  value={String(meetingLoad)}
                  bad={meetingLoad >= 60}
                />
                <MetricRow label="Alignment" value={String(alignment)} />
                {/* Lateness row — only shown when over the deadline */}
                {timeMinutes > STANDUP_TIME_MINUTES && (
                  <MetricRow
                    label="Standup arrival"
                    value={`${timeMinutes - STANDUP_TIME_MINUTES}m late`}
                    bad
                  />
                )}
              </div>
            </div>

            {/* Performance rating */}
            <div>
              <SectionHeader>Performance review</SectionHeader>
              <div
                className={`rounded border px-3 py-2 text-[12px] ${ratingStyle.chip} flex items-start gap-2`}
              >
                <span className="text-base leading-none mt-0.5">{ratingStyle.icon}</span>
                <div className="flex-1">
                  <div className="font-semibold uppercase tracking-wide text-[11px]">
                    {ratingStyle.label}
                    {rating.tier !== 'none' && (
                      <span className="ml-2 font-mono opacity-70">Score {rating.score}</span>
                    )}
                  </div>
                  <div className="italic mt-0.5 leading-snug">{rating.critique}</div>
                </div>
              </div>
            </div>

            {/* Achievements — 3-column compact grid so all 12 fit without
                scrolling. Each cell shows icon + title; hover the cell to
                see the description via the native browser tooltip. */}
            <div>
              <SectionHeader>
                Achievements
                <span className="ml-2 font-normal text-[#5e6c84]">
                  {unlocked.size}/{ACHIEVEMENTS.length}
                </span>
              </SectionHeader>
              <div className="grid grid-cols-3 gap-1">
                {ACHIEVEMENTS.map((a) => {
                  const isUnlocked = unlocked.has(a.id)
                  const isNew = justUnlockedSet.has(a.id)
                  return (
                    <div
                      key={a.id}
                      title={`${a.title} — ${a.description}`}
                      className={[
                        'relative flex items-center gap-1 px-1.5 py-1 rounded border text-[10px] leading-tight',
                        isUnlocked
                          ? isNew
                            ? 'border-[#f5cd47] bg-[#fff7d6] text-[#172b4d]'
                            : 'border-[#dfe1e6] bg-white text-[#172b4d]'
                          : 'border-[#dfe1e6] bg-[#f4f5f7] text-[#5e6c84]',
                      ].join(' ')}
                    >
                      <span className="text-xs leading-none flex-shrink-0">
                        {isUnlocked ? (isNew ? '★' : '✓') : '○'}
                      </span>
                      <span className="font-medium truncate">{a.title}</span>
                      {isNew && (
                        <span className="absolute -top-1 -right-1 text-[7px] uppercase tracking-wider text-[#7f5f01] bg-[#f5cd47] px-1 rounded-sm font-bold">
                          New
                        </span>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Start new sprint CTA */}
            <div className="mt-auto flex-shrink-0">
              <button
                onClick={() => reset()}
                className="w-full px-4 py-2.5 rounded bg-[#0052cc] text-white text-[14px] font-medium hover:bg-[#0747a6] transition shadow-sm"
              >
                Start new sprint →
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ---- Helpers ----

function bucketTickets(
  tickets: Ticket[],
  npcChoices: Record<string, string>
): Record<TicketColumn, { ticket: Ticket; comment: string }[]> {
  const buckets: Record<TicketColumn, { ticket: Ticket; comment: string }[]> = {
    todo: [],
    progress: [],
    blocked: [],
    done: [],
  }
  for (const ticket of tickets) {
    const outcome = ticketOutcome(ticket.npcId, npcChoices[ticket.npcId])
    buckets[outcome.column].push({ ticket, comment: outcome.comment })
  }
  return buckets
}

function RetroColumn({
  title,
  tone,
  items,
}: {
  title: string
  tone: TicketColumn
  items: { ticket: Ticket; comment: string }[]
}) {
  const style = COLUMN_STYLE[tone]
  return (
    <div className="bg-[#ebecf0] rounded-md p-2 flex flex-col">
      <div className="flex items-center justify-between px-1 pb-2 flex-shrink-0">
        <div
          className="text-[11px] font-semibold uppercase tracking-widest"
          style={{ color: style.header }}
        >
          {title}
        </div>
        <div
          className="text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded"
          style={{ backgroundColor: style.pillBg, color: style.pillText }}
        >
          {items.length}
        </div>
      </div>
      <div className="flex flex-col gap-2">
        {items.map(({ ticket, comment }) => (
          <RetroCard key={ticket.key} ticket={ticket} comment={comment} tone={tone} />
        ))}
      </div>
    </div>
  )
}

function RetroCard({
  ticket,
  comment,
  tone,
}: {
  ticket: Ticket
  comment: string
  tone: TicketColumn
}) {
  const npc = NPCS.find((n) => n.id === ticket.npcId)
  const prio = priorityChip(ticket.priority)
  // Top accent border for visual scanability of column status.
  const accent = COLUMN_STYLE[tone].header
  return (
    <div
      className="bg-white border border-[#dfe1e6] rounded-[3px] shadow-sm overflow-hidden"
      style={{ borderTop: `3px solid ${accent}` }}
    >
      <div className="px-3 py-2.5">
        <div className="text-[12px] text-[#172b4d] font-medium leading-snug mb-1">
          {ticket.title}
        </div>
        <div className="text-[11px] text-[#5e6c84] italic leading-snug mb-2">
          {comment}
        </div>
        <div className="flex items-center gap-1.5 text-[11px]">
          <span className="leading-none">{typeIcon(ticket.type)}</span>
          <span className="text-[#5e6c84] font-mono">{ticket.key}</span>
          <span className="ml-auto flex items-center gap-1.5">
            <span
              className="text-[10px] font-semibold"
              style={{ color: prio.color }}
              title={prio.label}
            >
              {prio.icon}
            </span>
            <span className="w-4 h-4 rounded-full bg-[#dfe1e6] text-[#42526e] text-[9px] font-bold flex items-center justify-center">
              {ticket.storyPoints}
            </span>
            <span
              className="w-5 h-5 rounded-full text-white text-[9px] font-bold flex items-center justify-center"
              style={{ backgroundColor: npc?.color ?? '#5e6c84' }}
              title={ticket.reporter}
            >
              {ticket.reporter.slice(0, 1)}
            </span>
          </span>
        </div>
      </div>
    </div>
  )
}

function JiraNav() {
  return (
    <div className="flex items-center gap-4 px-4 h-10 bg-white border-b border-[#dfe1e6] flex-shrink-0">
      <div className="flex items-center gap-2">
        <div className="w-6 h-6 rounded bg-[#0052cc] text-white flex items-center justify-center text-xs font-bold">
          A
        </div>
        <span className="text-[#172b4d] text-sm font-semibold">Alignly</span>
      </div>
      <div className="hidden md:flex items-center gap-4 text-[13px] text-[#42526e]">
        <span className="hover:text-[#172b4d] cursor-default">Your work</span>
        <span className="hover:text-[#172b4d] cursor-default">Projects</span>
        <span className="hover:text-[#172b4d] cursor-default">Filters</span>
        <span className="hover:text-[#172b4d] cursor-default">Dashboards</span>
      </div>
      <div className="ml-auto flex items-center gap-3">
        <div className="hidden sm:block px-3 py-1 rounded border border-[#dfe1e6] text-[13px] text-[#5e6c84] bg-white">
          Search
        </div>
        <div className="w-7 h-7 rounded-full bg-[#0052cc] text-white flex items-center justify-center text-[11px] font-bold">
          LC
        </div>
      </div>
    </div>
  )
}

function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-[10px] uppercase tracking-widest font-semibold text-[#5e6c84] mb-1">
      {children}
    </div>
  )
}

function MetricRow({
  label,
  value,
  bad,
}: {
  label: string
  value: string
  bad?: boolean
}) {
  return (
    <div className="flex items-center py-1 border-b border-[#f4f5f7] last:border-b-0">
      <div className="flex-1 text-[#5e6c84] text-[12px]">{label}</div>
      <div
        className={`font-mono text-[12px] font-semibold ${
          bad ? 'text-[#bf2600]' : 'text-[#172b4d]'
        }`}
      >
        {value}
      </div>
    </div>
  )
}
