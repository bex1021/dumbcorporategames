// Top overlay HUD showing the 5 visible meters per Blueprint v0.3.
// Also shows project name (top-left), time/countdown/progress (top-right).
//
// Countdown chip: shows minutes remaining until the 10:15 standup
// (STANDUP_TIME_MINUTES). Tinted by urgency, flips to "STARTED W/O YOU"
// once you've blown past the deadline — the run still continues, but the
// performance rating will take a hit at game end.

import {
  useGameStore,
  selectFormattedTime,
  PROJECT_TIERS,
  PISSED_OFF_TIERS,
  MEETING_LOAD_TIERS,
  ALIGNMENT_TIERS,
  STANDUP_TIME_MINUTES,
} from '../state/gameStore'
import { MeterBar } from './MeterBar'

export function HUD() {
  const projectStatus = useGameStore((s) => s.projectStatus)
  const pissedOff = useGameStore((s) => s.pissedOff)
  const meetingLoad = useGameStore((s) => s.meetingLoad)
  const alignment = useGameStore((s) => s.alignment)
  const handledCount = useGameStore((s) => s.handledNPCs.size)
  const timeMinutes = useGameStore((s) => s.timeMinutes)
  const time = useGameStore(selectFormattedTime)

  const remaining = STANDUP_TIME_MINUTES - timeMinutes
  const countdown = formatCountdown(remaining)
  const tone = countdownTone(remaining)
  // Fraction of the 75-minute pre-standup window consumed. Clamped so the
  // bar fills past the deadline (cosmetic over-fill at 100% looks bad).
  // Audit caught that players had no visual sense of "time is a resource I'm
  // spending" — the chip text alone reads as flavor, not cost.
  const timeUsedPct = Math.max(0, Math.min(100, (timeMinutes / STANDUP_TIME_MINUTES) * 100))

  // Meeting Load nears the Calendar Apocalypse threshold at 80; warn the
  // player with a pulsing meter at >= 70 so the modal doesn't feel
  // like it teleports in from nowhere.
  const meetingDanger = meetingLoad >= 70 && meetingLoad < 80

  return (
    <div className="pointer-events-none absolute inset-x-0 top-0 p-4 flex flex-col gap-3">
      {/* Top row: project context (left) + countdown + clock + progress (right) */}
      <div className="flex justify-between items-start gap-4 flex-wrap">
        <div className="bg-ink-900/75 backdrop-blur-sm px-3 py-2 rounded">
          <div className="text-beige-300 text-[10px] uppercase tracking-widest">Alignly</div>
          <div className="text-beige-100 text-sm font-medium">Customer Happiness Portal Refresh</div>
        </div>
        <div className="flex gap-2 flex-wrap justify-end">
          <div className="bg-ink-900/75 backdrop-blur-sm px-3 py-2 rounded text-right">
            <div className="text-beige-300 text-[10px] uppercase tracking-widest">Pre-Standup</div>
            <div className="text-beige-100 text-sm font-medium font-mono">{handledCount}/5 aligned</div>
          </div>
          <div
            className={`bg-ink-900/75 backdrop-blur-sm px-3 py-2 rounded text-right border ${tone.border} min-w-[110px]`}
          >
            <div className="text-beige-300 text-[10px] uppercase tracking-widest">Standup</div>
            <div className={`text-sm font-medium font-mono ${tone.text}`}>
              {countdown}
            </div>
            {/* Time-spent bar — shows the 75-minute budget being consumed.
                Same color family as the countdown text so the eye reads
                them as one signal. Pulses subtly when past the deadline. */}
            <div
              className="mt-1.5 h-1 bg-ink-700/80 rounded-sm overflow-hidden"
              aria-label={`Time used: ${timeMinutes} of ${STANDUP_TIME_MINUTES} minutes`}
              title={`${timeMinutes} / ${STANDUP_TIME_MINUTES} min used`}
            >
              <div
                className={`h-full transition-all duration-300 ${tone.bar} ${remaining <= 0 ? 'animate-pulse' : ''}`}
                style={{ width: `${timeUsedPct}%` }}
              />
            </div>
          </div>
          <div className="bg-ink-900/75 backdrop-blur-sm px-3 py-2 rounded text-right">
            <div className="text-beige-300 text-[10px] uppercase tracking-widest">Time</div>
            <div className="text-beige-100 text-sm font-medium font-mono">{time}</div>
          </div>
        </div>
      </div>

      {/* Meters row */}
      <div className="bg-ink-900/75 backdrop-blur-sm rounded px-4 py-3 flex gap-6 flex-wrap">
        <MeterBar
          label="Project Status"
          value={projectStatus}
          max={100}
          tiers={PROJECT_TIERS}
        />
        <MeterBar
          label="Team Pissed-Off"
          value={pissedOff}
          max={100}
          tiers={PISSED_OFF_TIERS}
        />
        {/* Meeting Load gets a pulsing red wrap at 70-79 — the Calendar
            Apocalypse modal triggers at 80, and the audit caught that
            players experienced it as a sudden interruption with no
            warning. This is the warning. */}
        <div className={meetingDanger ? 'animate-pulse rounded ring-2 ring-red-500/50' : ''}>
          <MeterBar
            label="Meeting Load"
            value={meetingLoad}
            max={100}
            tiers={MEETING_LOAD_TIERS}
          />
        </div>
        <MeterBar
          label="Alignment"
          value={alignment}
          max={12}
          tiers={ALIGNMENT_TIERS}
        />
      </div>
    </div>
  )
}

// ---- Countdown helpers ----

function formatCountdown(remainingMinutes: number): string {
  if (remainingMinutes <= 0) {
    const late = Math.abs(remainingMinutes)
    return late === 0 ? 'STARTING NOW' : `${late}m LATE`
  }
  return `IN ${remainingMinutes}m`
}

// Color graded by urgency. Past-deadline reuses the same red as <10m
// remaining, with a slightly stronger border. `bar` is the matching
// Tailwind bg-class for the time-used progress bar — kept in lockstep
// with `text` so the chip reads as one signal.
function countdownTone(remaining: number): { text: string; border: string; bar: string } {
  if (remaining <= 0) {
    return { text: 'text-rose-300', border: 'border-rose-500/60', bar: 'bg-rose-500' }
  }
  if (remaining < 10) {
    return { text: 'text-rose-300', border: 'border-rose-500/40', bar: 'bg-rose-400' }
  }
  if (remaining < 30) {
    return { text: 'text-amber-300', border: 'border-amber-500/40', bar: 'bg-amber-400' }
  }
  return { text: 'text-emerald-300', border: 'border-emerald-500/30', bar: 'bg-emerald-400' }
}
