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
import { Link } from 'react-router-dom'
import { markBeaten } from '../state/progress'
import {
  useGameStore,
  selectFormattedTime,
  computeRating,
  STANDUP_TIME_MINUTES,
} from '../state/gameStore'
import { ACHIEVEMENTS } from '../content/achievements'
import { audio } from '../audio/AudioManager'
import { ExecSegue } from './ExecSegue'
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

// Sparkle directions — 8 dots distributed evenly around 360° at a
// moderate radius. Each becomes (--dx, --dy) on its card. Kept under
// ~45px so the dots stay roughly inside the grid cell and don't smear
// across into neighboring cards' airspace. Computed once at module load.
const SPARKLE_DIRECTIONS = Array.from({ length: 8 }, (_, i) => {
  const angle = (i / 8) * Math.PI * 2 + Math.PI / 16 // small offset so dots don't sit on horizontal/vertical axes
  // Slight radius variance so sparkles don't look like a perfect ring.
  const r = 38 + (i % 2 === 0 ? 0 : 6)
  return { dx: Math.cos(angle) * r, dy: Math.sin(angle) * r }
})

// ---- Per-ending narrative copy (kept from the previous EndingScreen) ----

type EndingKey =
  | 'standup-complete'
  | 'green-enough'
  | 'pyrrhic-alignment'
  | 'full-escalation'
  | 'calendar-apocalypse'
  | 'missed-standup'

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
  'missed-standup': {
    title: 'Missed the Standup',
    body:
      "It is 10:30 AM. The standup started fifteen minutes ago. It started without you.\n\nThe meeting invite says \"optional,\" which is how you know it was not. Someone has already typed \"will follow up with PM async\" into the thread.\n\nYou were still in the bullpen, aligning. The aligning was, in the end, the thing that made you late to be aligned.",
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
  // First-time-ever unlocks this run — drives the small yellow "NEW" badge
  // on the card.
  const justUnlocked = useGameStore((s) => s.lastUnlockedAchievements)
  // Every achievement the player actually earned this run (regardless of
  // whether they had it before). Drives the pop-in animation so the
  // celebration fires even on replays.
  const earnedThisRun = useGameStore((s) => s.earnedThisRun)
  const timeMinutes = useGameStore((s) => s.timeMinutes)
  // Run-scoped counters used to pick a "defining move" line so the
  // ending feels like THIS run, not the generic-rating run.
  const copingUseCounts = useGameStore((s) => s.copingUseCounts)
  const runRecoveryTriggered = useGameStore((s) => s.runRecoveryTriggered)
  const runDelayedFireCount = useGameStore((s) => s.runDelayedFireCount)
  const runSlackOpened = useGameStore((s) => s.runSlackOpened)
  const rating = computeRating({
    ending,
    projectStatus,
    pissedOff,
    meetingLoad,
    alignment,
    timeMinutes,
    npcsHandled: handledCount,
  })

  // Schedule the achievement fanfare:
  //   1. A rising-pitch chord-ding for each card earned this run, fired
  //      at i * POP_STAGGER_MS so the audio cascade lines up with the CSS
  //      scale-bounce on the cards.
  //   2. A "TA-DA" brass fanfare a beat after the last card pops, as
  //      the curtain-call moment.
  // Uses earnedThisRun (not lastUnlocked) so the celebration still fires
  // on replays after every achievement has been first-time-unlocked.
  // Effect must live above the conditional return — hooks can't be skipped.
  useEffect(() => {
    if (phase !== 'ended' || earnedThisRun.length === 0) return
    const popTimers = earnedThisRun.map((_, i) =>
      setTimeout(() => audio.playAchievementPop(i), i * POP_STAGGER_MS)
    )
    // Fanfare fires shortly after the last chord-ding lands so it reads
    // as a finale, not a 5th note in the cascade.
    const fanfareDelay =
      (earnedThisRun.length - 1) * POP_STAGGER_MS + 550 // last pop start + pop duration
    const fanfareTimer = setTimeout(
      () => audio.playAchievementFanfare(),
      fanfareDelay
    )
    return () => {
      popTimers.forEach(clearTimeout)
      clearTimeout(fanfareTimer)
    }
  }, [phase, earnedThisRun])

  // Campaign progression: a WINNING ending beats Phase 1, which unlocks
  // Phase 2 (Jira Run) in the level-select hub. Idempotent + fail-silent
  // (see state/progress.ts) so it's safe to fire on every win and replay.
  useEffect(() => {
    if (phase !== 'ended' || !ending) return
    if (ENDING_COPY[ending as EndingKey]?.goalMet) markBeaten('phase1')
  }, [phase, ending])

  if (phase !== 'ended' || !ending) return null
  const copy = ENDING_COPY[ending as EndingKey]
  if (!copy) return null

  // For losses (full-escalation, calendar-apocalypse), inject a 1-line
  // diagnosis identifying the meter that actually tripped — otherwise the
  // ending feels arbitrary compared to the multi-paragraph win endings.
  // Returns null for wins (where the body copy carries its own meaning).
  const failureDiagnosis = diagnoseFailure(
    ending,
    pissedOff,
    projectStatus,
    meetingLoad
  )

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
  const earnedThisRunSet = new Set(earnedThisRun)
  // One personalized line identifying the player's defining move this run.
  // Falls back to a generic line if nothing stood out.
  const definingMove = pickDefiningMove({
    copingUseCounts,
    runRecoveryTriggered,
    runDelayedFireCount,
    runSlackOpened,
    npcChoices,
    alignment,
    pissedOff,
  })
  // Map id → its position in the earned-this-run list, so each card knows
  // its own cascade index for the animation-delay.
  const popOrderMap = new Map(earnedThisRun.map((id, i) => [id, i]))
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
              {failureDiagnosis && (
                <div
                  className="mt-3 px-3 py-2 rounded border text-[12px] font-mono"
                  style={{
                    backgroundColor: '#fff5f2',
                    borderColor: '#ffbdad',
                    color: '#8a1b00',
                  }}
                >
                  <span className="uppercase tracking-widest font-semibold mr-2">
                    Diagnosis
                  </span>
                  {failureDiagnosis}
                </div>
              )}
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
              {/* The franchise punchline — the same immovable line that closes
                  every Jira Run and Lunch Dash retrospective. Phase 1 was the
                  only ending missing it; now all four games end on the same
                  thesis, win or lose. */}
              <div className="mt-2 pt-2 border-t border-dashed border-[#dfe1e6] flex justify-between text-[12px]">
                <span className="text-[#5e6c84]">Actual Business Value Generated</span>
                <span className="font-semibold font-mono text-[#172b4d]">$0.00</span>
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
                {definingMove && (
                  <div className="text-[11px] mt-1.5 opacity-80 leading-snug not-italic">
                    <span className="font-semibold mr-1.5">Defining move:</span>
                    {definingMove}
                  </div>
                )}
              </div>
            </div>

            {/* Next-step CTAs. On a WIN, the primary action advances the
                campaign to Phase 2 (Jira Run) — which this win just unlocked
                in the level-select hub. On a LOSS, the primary action retries
                this sprint (Phase 2 stays locked until you win). Level select
                is always available. */}
            {copy.goalMet ? (
              <div className="flex flex-col gap-2">
                {/* The Exec hands you to Jira Run in his own voice — the same
                    card that recurs at every phase boundary (see ExecSegue). */}
                <ExecSegue
                  kind="slack"
                  time="10:16 AM"
                  message={<>Standup survived — whole team's "aligned" now 🙂 The board still shows yesterday, though. Update your Jira tickets before the notes go out? Should be quick.</>}
                  to="/play/jira-run"
                  ctaLabel="Back to your desk →"
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => reset()}
                    className="flex-1 px-4 py-2.5 rounded border border-[#dfe1e6] bg-white text-[#42526e] text-[13px] font-medium hover:bg-[#f4f5f7] transition"
                  >
                    ↻ Replay this sprint
                  </button>
                  <Link
                    to="/play"
                    className="flex-1 px-4 py-2.5 rounded border border-[#dfe1e6] bg-white text-[#42526e] text-[13px] font-medium hover:bg-[#f4f5f7] transition text-center"
                  >
                    ☰ Level select
                  </Link>
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                <button
                  onClick={() => reset()}
                  className="w-full px-4 py-3 rounded bg-[#0052cc] text-white text-[14px] font-semibold hover:bg-[#0747a6] transition shadow-sm"
                >
                  ↻ Try this sprint again
                </button>
                <Link
                  to="/play"
                  className="w-full px-4 py-2.5 rounded border border-[#dfe1e6] bg-white text-[#42526e] text-[13px] font-medium hover:bg-[#f4f5f7] transition text-center"
                >
                  ☰ Level select
                </Link>
                <p className="text-[11px] text-[#5e6c84] text-center mt-0.5">
                  Phase 2 unlocks once you survive the standup — reach a winning outcome.
                </p>
              </div>
            )}
          </div>

          {/* Right: 2-column grid of compact achievement cards. Cards
              earned this run get the full fanfare treatment: scale
              overshoot + wiggle pop-in, a diagonal gold shimmer sweep,
              a breathing gold glow, sparkle dots flying outward, and
              chord-ding audio (see useEffect above). */}
          <div className="grid grid-cols-2 gap-2 self-start">
            {ACHIEVEMENTS.map((a) => {
              const isUnlocked = unlocked.has(a.id)
              const isNew = justUnlockedSet.has(a.id)
              const earnedNow = earnedThisRunSet.has(a.id)
              const popIndex = popOrderMap.get(a.id)
              const popDelay =
                earnedNow && popIndex !== undefined
                  ? `${popIndex * POP_STAGGER_MS}ms`
                  : undefined
              return (
                <div
                  key={a.id}
                  className={[
                    'relative px-2.5 py-2 rounded border',
                    earnedNow
                      ? 'border-[#f5cd47] bg-[#fff7d6] text-[#172b4d]'
                      : isUnlocked
                        ? 'border-[#dfe1e6] bg-white text-[#172b4d]'
                        : 'border-[#dfe1e6] bg-[#f4f5f7] text-[#5e6c84]',
                    earnedNow ? 'achievement-pop' : '',
                  ].join(' ')}
                  // CSS variable feeds the same delay into pop, glow,
                  // shimmer, and sparkle animations defined in index.css.
                  style={
                    popDelay
                      ? ({ '--pop-delay': popDelay } as React.CSSProperties)
                      : undefined
                  }
                >
                  {/* Shimmer wrapper — gold gradient sweeps across the card
                      once on entry. Clipped to rounded corners via the
                      wrapper's own overflow:hidden. */}
                  {earnedNow && <span className="achievement-shimmer" />}

                  {/* Sparkle burst — 8 dots fan out from card center. */}
                  {earnedNow &&
                    SPARKLE_DIRECTIONS.map((dir, i) => (
                      <span
                        key={i}
                        className={`achievement-sparkle${
                          i % 2 === 0 ? '' : ' cream'
                        }`}
                        style={
                          {
                            '--dx': `${dir.dx}px`,
                            '--dy': `${dir.dy}px`,
                          } as React.CSSProperties
                        }
                      />
                    ))}

                  {/* Content sits above the shimmer/sparkles via z-index. */}
                  <div className="relative z-10">
                    {/* Title row: emoji + name. Title wraps if needed. */}
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
                    {/* Description — full text, wraps freely. */}
                    <div className="text-[10px] leading-snug mt-1 opacity-80">
                      {a.description}
                    </div>
                  </div>

                  {isNew && (
                    <span className="absolute -top-1 -right-1 z-20 text-[8px] uppercase tracking-wider text-[#7f5f01] bg-[#f5cd47] px-1 rounded-sm font-bold">
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

// Pick a one-line "defining move" sentence that calls out something
// specific to THIS run — what they did a lot of, or the most distinctive
// thing about their decision pattern. Priority order is roughly: rare
// events first (recovery panel, delayed effects), then habitual
// coping patterns, then dialogue dominance, with a fallback so the
// sentence always renders. Keeps the ending personal without needing
// per-permutation copy.
function pickDefiningMove(s: {
  copingUseCounts: Record<string, number>
  runRecoveryTriggered: boolean
  runDelayedFireCount: number
  runSlackOpened: boolean
  npcChoices: Record<string, string>
  alignment: number
  pissedOff: number
}): string | null {
  const c = s.copingUseCounts
  // Rare events first — these are the most "specific" things that
  // happened, so they earn the call-out when present.
  if (s.runRecoveryTriggered) {
    return 'You triggered the Calendar Apocalypse panel and made it out the other side.'
  }
  if (s.runDelayedFireCount >= 2) {
    return `${s.runDelayedFireCount} of your earlier decisions came back during the run. The phrase "as I flagged earlier" is now haunted.`
  }
  if (s.runDelayedFireCount === 1) {
    return 'One of your earlier choices fired a follow-up during the run. Reputation: developing.'
  }
  // Heavy coping patterns.
  if ((c.printer ?? 0) >= 5) {
    return 'You hit the printer 5 times. It now ranks third on your team.'
  }
  if ((c.phyllis ?? 0) >= 5) {
    return 'You held five separate 1:1s with a plant. Phyllis remains professional about it.'
  }
  if ((c.bathroom ?? 0) >= 3) {
    return 'You cried in the bathroom 3+ times. HR has the timestamps.'
  }
  if ((c.coffee ?? 0) >= 4) {
    return 'You went on four coffee runs. The kettle now refers to you by first name.'
  }
  // Dialogue dominance — count how often "C" / "D" choices came up.
  // These are the high-cost choices.
  const choices = Object.values(s.npcChoices)
  const cCount = choices.filter((c) => c === 'C').length
  const dCount = choices.filter((c) => c === 'D').length
  if (dCount >= 3) {
    return 'You picked the worst available option on three or more stakeholders. A bold read of "doing the standup."'
  }
  if (cCount >= 3) {
    return 'You took the path of least resistance with most of your team. They noticed.'
  }
  // Engagement extremes.
  if (!s.runSlackOpened) {
    return 'You never opened Slack. The red dot remains, in solidarity.'
  }
  if (s.alignment >= 8) {
    return 'You produced an aggressive volume of artifacts. The Strategy Doc may be summoned.'
  }
  if (s.pissedOff >= 60) {
    return 'You finished with the team this close to drafting Glassdoor reviews. Choices were made.'
  }
  return null
}

// Generate a 1-line diagnosis for the player when they hit a failure
// ending. Picks the meter that actually tripped the failure condition and
// names it with the actual final value — so "Full Escalation" stops
// feeling arbitrary and reads as "the team's pissed-off climbed to 78".
// Returns null for win endings (their multi-paragraph body copy carries
// its own meaning).
function diagnoseFailure(
  ending: string,
  pissedOff: number,
  projectStatus: number,
  meetingLoad: number
): string | null {
  if (ending === 'full-escalation') {
    // Two trigger meters: pissedOff >= 75 OR projectStatus < 45.
    // Whichever crossed harder wins the call-out.
    if (pissedOff >= 75) {
      return `Team Pissed-Off hit ${pissedOff} — past the Glassdoor tier (75). Three of your reports have updated their LinkedIn headlines.`
    }
    if (projectStatus < 45) {
      return `Project Status dropped to ${projectStatus}. The Refresh has slipped past Yellow into a color leadership doesn't have a chip for.`
    }
    return 'Multiple meters cratered simultaneously. Impressive, in a way.'
  }
  if (ending === 'calendar-apocalypse') {
    return `Meeting Load reached ${meetingLoad}. Your calendar consumed itself. No one can find an available 15-minute slot to discuss why.`
  }
  return null
}

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
