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

  return (
    <div className="pointer-events-none absolute inset-x-0 top-0 p-4 flex flex-col gap-3">
      {/* Top row: project context (left) + countdown + clock + progress (right) */}
      <div className="flex justify-between items-start gap-4">
        <div className="bg-ink-900/75 backdrop-blur-sm px-3 py-2 rounded">
          <div className="text-beige-300 text-[10px] uppercase tracking-widest">Alignly</div>
          <div className="text-beige-100 text-sm font-medium">Customer Happiness Portal Refresh</div>
        </div>
        <div className="flex gap-2">
          <div className="bg-ink-900/75 backdrop-blur-sm px-3 py-2 rounded text-right">
            <div className="text-beige-300 text-[10px] uppercase tracking-widest">Pre-Standup</div>
            <div className="text-beige-100 text-sm font-medium font-mono">{handledCount}/5 aligned</div>
          </div>
          <div
            className={`bg-ink-900/75 backdrop-blur-sm px-3 py-2 rounded text-right border ${tone.border}`}
          >
            <div className="text-beige-300 text-[10px] uppercase tracking-widest">Standup</div>
            <div className={`text-sm font-medium font-mono ${tone.text}`}>
              {countdown}
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
        <MeterBar
          label="Meeting Load"
          value={meetingLoad}
          max={100}
          tiers={MEETING_LOAD_TIERS}
        />
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
// remaining, with a slightly stronger border.
function countdownTone(remaining: number): { text: string; border: string } {
  if (remaining <= 0) {
    return { text: 'text-rose-300', border: 'border-rose-500/60' }
  }
  if (remaining < 10) {
    return { text: 'text-rose-300', border: 'border-rose-500/40' }
  }
  if (remaining < 30) {
    return { text: 'text-amber-300', border: 'border-amber-500/40' }
  }
  return { text: 'text-emerald-300', border: 'border-emerald-500/30' }
}
