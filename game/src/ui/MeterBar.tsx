// Threshold-tiered meter bar with color-coded named tier label.
// Used by the HUD for Project Status, Pissed-Off, Meeting Load, Alignment.
//
// Layout (vertical stack so long tier labels like "Performative Flailing"
// don't collide with the meter name):
//   ALIGNMENT
//   Performative Flailing
//   [████░░░░░░░░░░░░░░░]

type Tier = { min: number; label: string; color: string }

type Props = {
  label: string // HUD label (e.g. "Pissed-Off")
  value: number // current numeric value
  max: number // max value for the bar fill
  tiers: readonly Tier[]
  // Optional preview: shows where the value WILL be after a pending choice
  preview?: number
  // Inverted means lower is better (Project Status: high=Green, low=Red)
  inverted?: boolean
}

export function MeterBar({ label, value, max, tiers, preview, inverted }: Props) {
  const tier = findTier(tiers, value)
  const previewTier = preview !== undefined ? findTier(tiers, preview) : null
  const pct = Math.max(0, Math.min(100, (value / max) * 100))
  const previewPct =
    preview !== undefined ? Math.max(0, Math.min(100, (preview / max) * 100)) : null

  return (
    <div className="flex flex-col gap-1 min-w-[150px]">
      <div className="text-[10px] uppercase tracking-widest text-beige-300 leading-tight">
        {label}
      </div>
      <div
        className="text-beige-100 text-[11px] font-medium leading-tight whitespace-nowrap"
        style={{ color: tier.color }}
      >
        {tier.label}
      </div>
      <div className="relative h-2 bg-ink-900/70 rounded-sm overflow-hidden mt-0.5">
        {/* Tier zone markers — thin vertical lines at each threshold */}
        {tiers
          .filter((t) => t.min > 0)
          .map((t) => (
            <div
              key={t.label}
              className="absolute top-0 bottom-0 w-px bg-beige-300/30"
              style={{
                left: `${(t.min / max) * 100}%`,
              }}
            />
          ))}
        {/* Current value fill */}
        <div
          className="absolute inset-y-0 left-0 transition-all duration-300"
          style={{
            width: `${inverted ? 100 - pct : pct}%`,
            backgroundColor: tier.color,
          }}
        />
        {/* Preview marker — where the value will land after a click */}
        {previewPct !== null && previewTier && (
          <div
            className="absolute inset-y-0 w-0.5 bg-beige-50 shadow-[0_0_4px_rgba(246,242,231,0.8)]"
            style={{
              left: `${inverted ? 100 - previewPct : previewPct}%`,
            }}
          />
        )}
      </div>
    </div>
  )
}

function findTier(tiers: readonly Tier[], value: number): Tier {
  for (const t of tiers) {
    if (value >= t.min) return t
  }
  return tiers[tiers.length - 1]
}
