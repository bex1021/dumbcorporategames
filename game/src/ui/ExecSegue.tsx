// ExecSegue — the cross-phase connective tissue.
//
// A single Slack/calendar card, styled IDENTICALLY no matter which phase's
// ending screen drops it in, that hands the player to the next game as a
// message from the Exec. It is the campaign's leitmotif: the same purple
// Alignly avatar, the same knock sound, the same voice ("…should be quick 🙂")
// chaining 9 AM → noon → 4:30 into one continuous day instead of four
// separate games.
//
// Why a shared component and not per-phase copy: the office (Phase 1) and
// Jira Run (Phase 2) endings are a light Jira theme; Lunch Dash (Phase 3) is
// dark mono. A crisp white Exec card sitting in ALL of them — the same in
// each — is the visual signal "this is the thread between the games." The
// card owns its own look so it survives whatever screen hosts it.
//
// The knock fires through audio.notify() (see AudioManager) so it sounds the
// same on every ending screen without booting the office ambient.

import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import type { ReactNode } from 'react'
import { audio } from '../audio/AudioManager'
import { playAlignlyMotif } from '../audio/alignlyMotif'

type Kind = 'slack' | 'calendar'

export type ExecSegueProps = {
  /** 'slack' = an Exec DM · 'calendar' = an Alignly invite. Same chrome, different accent + sound. */
  kind?: Kind
  /** Timestamp shown in the header, e.g. "10:46 AM". Keeps the day's clock legible across phases. */
  time: string
  /** The Exec's message — the reason the next phase exists. */
  message: ReactNode
  /** Where the card sends the player. Omit for a not-yet-built phase (renders a disabled tease). */
  to?: string
  /** CTA label. Defaults per kind. */
  ctaLabel?: string
  /** Shown instead of the CTA when `to` is omitted. */
  comingSoonLabel?: string
}

const PURPLE = '#4a154b' // Slack aubergine — the Alignly workspace color
const SLACK_GREEN = '#007a5a'
const CAL_BLUE = '#0b6bcb'

export function ExecSegue({
  kind = 'slack',
  time,
  message,
  to,
  ctaLabel,
  comingSoonLabel = 'Coming soon',
}: ExecSegueProps) {
  // The knock + the Alignly motif — the day's recurring sound AND melody, at
  // every phase boundary. The motif tucks in just behind the knock so they
  // read as one "…and we're aligned 🙂" gesture. Both best-effort.
  useEffect(() => {
    audio.notify(kind === 'calendar' ? 'calendar' : 'slack')
    playAlignlyMotif(0.18)
  }, [kind])

  const accent = kind === 'calendar' ? CAL_BLUE : SLACK_GREEN
  const label = ctaLabel ?? (kind === 'calendar' ? 'Add to calendar →' : 'Reply →')
  const channel = kind === 'calendar' ? 'Alignly Calendar' : 'Slack'

  return (
    <div
      style={{
        width: '100%',
        maxWidth: 380,
        margin: '0 auto',
        borderRadius: 10,
        background: '#fff',
        border: '1px solid #e2e2e4',
        boxShadow: '0 10px 30px rgba(0,0,0,0.18)',
        overflow: 'hidden',
        fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
        color: '#1d1c1d',
        textAlign: 'left',
        animation: 'execping 0.28s ease-out',
      }}
    >
      <style>{`@keyframes execping{from{opacity:0;transform:translateY(-6px)}to{opacity:1;transform:translateY(0)}}`}</style>

      {/* header: avatar + sender + channel + time */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '11px 14px 7px' }}>
        <div
          aria-hidden
          style={{
            width: 30, height: 30, borderRadius: 7, flexShrink: 0,
            background: PURPLE, color: '#fff',
            display: 'grid', placeItems: 'center',
            fontWeight: 800, fontSize: 15, letterSpacing: '-0.02em',
          }}
        >
          {kind === 'calendar' ? '📅' : 'A'}
        </div>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ fontSize: 13, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            Exec
            <span style={{ fontWeight: 400, color: '#8d8d8d', fontSize: 11 }}>· {channel}</span>
          </div>
          <div style={{ fontSize: 10.5, color: '#8d8d8d', fontFamily: '"IBM Plex Mono", ui-monospace, monospace' }}>{time}</div>
        </div>
      </div>

      {/* the message */}
      <div style={{ padding: '0 14px 12px', fontSize: 13.5, lineHeight: 1.5, color: '#1d1c1d' }}>
        {message}
      </div>

      {/* CTA — a real handoff, or a disabled tease for an unbuilt phase */}
      <div style={{ borderTop: '1px solid #ececed', padding: 10 }}>
        {to ? (
          <Link
            to={to}
            style={{
              display: 'block', textAlign: 'center', textDecoration: 'none',
              background: accent, color: '#fff',
              borderRadius: 7, padding: '11px 14px',
              fontSize: 14, fontWeight: 700, letterSpacing: '0.01em',
            }}
          >
            {label}
          </Link>
        ) : (
          <div
            style={{
              display: 'block', textAlign: 'center',
              background: '#f1f1f2', color: '#8d8d8d',
              borderRadius: 7, padding: '11px 14px',
              fontSize: 13, fontWeight: 700, letterSpacing: '0.04em',
              textTransform: 'uppercase',
            }}
          >
            {comingSoonLabel}
          </div>
        )}
      </div>
    </div>
  )
}
