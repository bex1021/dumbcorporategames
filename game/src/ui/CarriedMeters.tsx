// CarriedMeters — the morning's dashboard, dimmed, following you into the
// afternoon.
//
// Reads the Phase 1 final meters from the campaign receipts (campaignState)
// and renders them as small read-only pills. The whole point is continuity:
// the Project Status / Pissed-Off / Alignment numbers that ruled your 9 AM
// standup don't vanish at 10:45 — they ride along, greyed and frozen, a
// reminder that it's all still the same day and the same project. Renders
// nothing if there's no Phase 1 run on record (e.g. someone deep-linked into
// a later phase), so it degrades cleanly.

import { readPhase1Final } from '../state/campaignState'

const MONO = '"IBM Plex Mono", "SF Mono", ui-monospace, Menlo, monospace'

// Same tier language as the Phase 1 HUD, condensed to a color per band.
function projColor(v: number) { return v >= 70 ? '#5cbb7a' : v >= 40 ? '#d9b24a' : '#d76a5a' }
function pissColor(v: number) { return v >= 75 ? '#d76a5a' : v >= 40 ? '#d9b24a' : '#8a8f98' }

export function CarriedMeters({
  align = 'center',
  tone = 'dark',
}: {
  align?: 'center' | 'start'
  /** 'dark' = light text on dark bg (game HUDs) · 'light' = dark text (light screens) */
  tone?: 'dark' | 'light'
}) {
  const p1 = readPhase1Final()
  if (!p1) return null

  const base = tone === 'dark' ? 'rgba(233,227,212,0.5)' : '#6b7280'
  const chipBg = tone === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)'
  const chipBorder = tone === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'

  const pill = (label: string, value: string, color: string) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 9px', borderRadius: 6, background: chipBg, border: `1px solid ${chipBorder}` }}>
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: color, opacity: 0.8 }} />
      <span style={{ fontSize: 9.5, letterSpacing: '0.1em', textTransform: 'uppercase', color: base }}>{label}</span>
      <span style={{ fontSize: 11, fontWeight: 700, color: tone === 'dark' ? 'rgba(233,227,212,0.75)' : '#374151', fontVariantNumeric: 'tabular-nums' }}>{value}</span>
    </div>
  )

  return (
    <div style={{ fontFamily: MONO, opacity: 0.85 }}>
      <div style={{ fontSize: 9, letterSpacing: '0.16em', textTransform: 'uppercase', color: base, marginBottom: 6, textAlign: align === 'center' ? 'center' : 'left' }}>
        Carried from this morning · frozen
      </div>
      <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap', justifyContent: align === 'center' ? 'center' : 'flex-start' }}>
        {pill('Project', String(p1.projectStatus), projColor(p1.projectStatus))}
        {pill('Pissed-off', String(p1.pissedOff), pissColor(p1.pissedOff))}
        {pill('Alignment', String(p1.alignment), '#6f9bd8')}
      </div>
    </div>
  )
}
