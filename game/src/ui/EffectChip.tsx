// Small colored pill showing a single meter effect ("Time +15m",
// "Pissed-Off −4", etc.). Color encodes whether the effect helps (green)
// or hurts (red) the player. Time and zero-value effects are neutral.

type MeterKey = 'time' | 'projectStatus' | 'pissedOff' | 'meetingLoad' | 'alignment'

const LABELS: Record<MeterKey, string> = {
  time: 'Time',
  projectStatus: 'Project',
  pissedOff: 'Pissed-Off',
  meetingLoad: 'Meeting Load',
  alignment: 'Alignment',
}

// Direction: +1 means "positive value is good", -1 means "positive value is bad"
const DIRECTION: Record<MeterKey, 0 | 1 | -1> = {
  time: 0, // always neutral
  projectStatus: 1,
  pissedOff: -1,
  meetingLoad: -1,
  alignment: 1,
}

function classify(meter: MeterKey, value: number): 'good' | 'bad' | 'neutral' {
  if (value === 0) return 'neutral'
  const dir = DIRECTION[meter]
  if (dir === 0) return 'neutral'
  return value * dir > 0 ? 'good' : 'bad'
}

function format(meter: MeterKey, value: number): string {
  if (meter === 'time') {
    return value === 0 ? '0m' : `${value > 0 ? '+' : ''}${value}m`
  }
  return value === 0 ? '0' : `${value > 0 ? '+' : ''}${value}`
}

const STYLES = {
  good: 'bg-emerald-900/60 text-emerald-200 border-emerald-700/50',
  bad: 'bg-rose-900/60 text-rose-200 border-rose-700/50',
  neutral: 'bg-ink-900/60 text-beige-300 border-beige-300/30',
} as const

export function EffectChip({ meter, value }: { meter: MeterKey; value: number }) {
  const variant = classify(meter, value)
  return (
    <span
      className={`inline-block text-[10px] font-mono tracking-wider px-1.5 py-0.5 rounded border ${STYLES[variant]}`}
    >
      {LABELS[meter]} {format(meter, value)}
    </span>
  )
}
