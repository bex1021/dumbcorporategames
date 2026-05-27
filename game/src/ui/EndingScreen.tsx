// Sprint Retrospective ending screen — Jira-inspired styling but with a
// centered, single-column layout (matches the intro). Was previously a
// 2-column dashboard with the Kanban board taking ~70% of the screen,
// which pushed the actual results (achievements, metrics) into a narrow
// scrolling sidebar.
//
// Layout: Jira nav strip + page header + single max-w-2xl centered body
// with outcome banner, sprint metrics (incl. 1-line ticket summary),
// performance review, achievements grid (all 12 visible at once), and
// the "Start new sprint" CTA.

import { useEffect } from 'react'
import {
  useGameStore,
  selectFormattedTime,
  computeRating,
  STANDUP_TIME_MINUTES,
} from '../state/gameStore'
import { ACHIEVEMENTS } from '../content/achievements'
import { audio } from '../audio/AudioManager'
import {
  TICKETS,
  ticketOutcome,
  type Ticket,
  type TicketColumn,
} from '../content/tickets'

// Cascade timing for the just-unlocked achievement pop-in animation.
// Must match the inline animation-delay = index * POP_STAGGER_MS in the
// achievement card render below, and the matching audio.playAchievementPop
// scheduled inside the useEffect.
const POP_STAGGER_MS = 150

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

  // Schedule a rising-pitch ding for each just-unlocked achievement, one
  // every POP_STAGGER_MS so the audio cascade lines up with the CSS
  // scale-bounce on the cards. Runs once per ended run.
  // Effect must live above the conditional return — hooks can't be skipped.
  useEffect(() => {
    if (phase !== 'ended' || justUnlocked.length === 0) return
    const timers = justUnlocked.map((_, i) =>
      setTimeout(() => audio.playAchievementPop(i), i * POP_STAGGER_MS)
    )
    return () => timers.forEach(clearTimeout)
  }, [phase, justUnlocked])

  if (phase !== 'ended' || !ending) return null
  const copy = ENDING_COPY[ending as EndingKey]
  if (!copy) return null

  // Bucket tickets by their final column so we can show a 1-line ticket
  // summary in the sprint metrics (without rendering a full Kanban board).
  const ticketsByColumn = bucketTickets(TICKETS, npcChoices)
  const totalPoints = TICKETS.reduce((s, t) => s + t.storyPoints, 0)
  const completedPoints = ticketsByColumn.done.reduce(
    (s, { ticket }) => s + ticket.storyPoints,
    0
  )
  const ticketSummary = `${ticketsByColumn.done.length} done · ${ticketsByColumn.progress.length} in progress · ${ticketsByColumn.blocked.length} blocked · ${ticketsByColumn.todo.length} to do`

  const justUnlockedSet = new Set(justUnlocked)
  // Map id → its position in the just-unlocked list, so each card knows its
  // own cascade index for the animation-delay.
  const newOrderMap = new Map(justUnlocked.map((id, i) => [id, i]))
  const ratingStyle = RATING_STYLE[rating.tier]

  return (
    <div className="fixed inset-0 z-50 bg-[#f4f5f7] text-[#172b4d] flex flex-col overflow-hidden">
      <JiraNav />

      {/* Page header — same max-w as the body so it aligns visually */}
      <div className="px-6 pt-3 pb-2 flex-shrink-0">
        <div className="max-w-5xl mx-auto">
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
            <div className="text-[12px] text-[#5e6c84] flex items-center gap-3">
              <span>
                {handledCount}/{TICKETS.length} tickets · ended {time}
              </span>
              <span className="text-[#42526e]">
                · {unlocked.size}/{ACHIEVEMENTS.length} achievements
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Body: centered main content + dedicated right-side achievements
          panel. Center column stays max-w-2xl so it doesn't stretch when
          the achievements panel is visible. On screens narrower than lg,
          the panel falls below the main content. */}
      <div className="flex-1 min-h-0 overflow-y-auto px-6 pb-4">
        <div className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-4 pt-1">
          {/* Center: outcome + metrics + performance + CTA */}
          <div className="max-w-2xl w-full mx-auto flex flex-col gap-3">
            {/* Outcome banner — green/red based on goal met. Hero element. */}
            <div
              className="rounded border px-4 py-3"
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
              <div className="text-[20px] font-semibold mt-0.5 text-[#172b4d]">
                {copy.title}
              </div>
              <div className="text-[13px] text-[#42526e] mt-2 whitespace-pre-line leading-relaxed">
                {copy.body}
              </div>
            </div>

            {/* Sprint metrics — 2-col grid + ticket outcome summary line */}
            <div className="bg-white border border-[#dfe1e6] rounded p-3">
              <div className="text-[10px] uppercase tracking-widest text-[#5e6c84] mb-1.5">
                Sprint metrics
              </div>
              <div className="grid grid-cols-2 gap-x-6 gap-y-0.5 text-[12px]">
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
                {timeMinutes > STANDUP_TIME_MINUTES && (
                  <MetricRow
                    label="Standup arrival"
                    value={`${timeMinutes - STANDUP_TIME_MINUTES}m late`}
                    bad
                  />
                )}
              </div>
              {/* Ticket outcome summary — replaces the dropped Kanban board */}
              <div className="mt-2 pt-2 border-t border-[#f4f5f7] text-[11px] text-[#5e6c84]">
                <span className="uppercase tracking-widest font-semibold mr-2">
                  Tickets
                </span>
                <span>{ticketSummary}</span>
              </div>
            </div>

            {/* Performance review — color-tier chip */}
            <div
              className={`rounded border px-3 py-2 text-[12px] ${ratingStyle.chip} flex items-start gap-2`}
            >
              <span className="text-base leading-none mt-0.5">{ratingStyle.icon}</span>
              <div className="flex-1">
                <div className="font-semibold uppercase tracking-wide text-[11px]">
                  Performance review · {ratingStyle.label}
                  {rating.tier !== 'none' && (
                    <span className="ml-2 font-mono opacity-70">Score {rating.score}</span>
                  )}
                </div>
                <div className="italic mt-0.5 leading-snug">{rating.critique}</div>
              </div>
            </div>

            {/* Start new sprint CTA */}
            <button
              onClick={() => reset()}
              className="w-full px-4 py-3 rounded bg-[#0052cc] text-white text-[14px] font-medium hover:bg-[#0747a6] transition shadow-sm"
            >
              Start new sprint →
            </button>
          </div>

          {/* Right: 2-column grid of compact achievement cards. Each
              card stacks an emoji + title row on top and the full
              description below in a smaller font. Titles wrap, descriptions
              wrap — nothing is truncated, so the player sees the full text
              of what they won. Just-unlocked cards cascade in with the
              `achievement-pop` keyframes + an audio ding (see useEffect
              above). */}
          <div className="grid grid-cols-2 gap-2 self-start">
            {ACHIEVEMENTS.map((a) => {
              const isUnlocked = unlocked.has(a.id)
              const isNew = justUnlockedSet.has(a.id)
              const popIndex = newOrderMap.get(a.id)
              return (
                <div
                  key={a.id}
                  className={[
                    'relative px-2.5 py-2 rounded border',
                    isUnlocked
                      ? isNew
                        ? 'border-[#f5cd47] bg-[#fff7d6] text-[#172b4d]'
                        : 'border-[#dfe1e6] bg-white text-[#172b4d]'
                      : 'border-[#dfe1e6] bg-[#f4f5f7] text-[#5e6c84]',
                    isNew ? 'achievement-pop' : '',
                  ].join(' ')}
                  style={
                    isNew && popIndex !== undefined
                      ? { animationDelay: `${popIndex * POP_STAGGER_MS}ms` }
                      : undefined
                  }
                >
                  {/* Title row: emoji + name. Title wraps to 2 lines if needed. */}
                  <div className="flex items-start gap-1.5">
                    <span
                      className="text-sm leading-none flex-shrink-0 mt-0.5"
                      style={
                        !isUnlocked
                          ? { filter: 'grayscale(1)', opacity: 0.45 }
                          : undefined
                      }
                    >
                      {a.emoji}
                    </span>
                    <span className="text-[11px] font-semibold leading-tight flex-1 min-w-0">
                      {a.title}
                    </span>
                  </div>
                  {/* Description — full text, wraps freely so nothing
                      gets cut off. */}
                  <div className="text-[10px] leading-snug mt-1 opacity-80">
                    {a.description}
                  </div>
                  {isNew && (
                    <span className="absolute -top-1 -right-1 text-[8px] uppercase tracking-wider text-[#7f5f01] bg-[#f5cd47] px-1 rounded-sm font-bold">
                      New
                    </span>
                  )}
                </div>
              )
            })}
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

function MetricRow({
  label,
  value,
  bad,
}: {
  label: string
  value: string
  bad?: boolean
}) {
  // No border-b here — the surrounding 2-column grid uses gap-y for spacing,
  // and a separator line per row would feel too dense.
  return (
    <div className="flex items-center">
      <div className="flex-1 text-[#5e6c84]">{label}</div>
      <div
        className={`font-mono font-semibold ${
          bad ? 'text-[#bf2600]' : 'text-[#172b4d]'
        }`}
      >
        {value}
      </div>
    </div>
  )
}
