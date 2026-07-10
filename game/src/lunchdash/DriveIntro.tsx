// Lunch Dash intro card — the bridge beat into Phase 3.
//
// Mirrors Jira Run's "You survived standup" boot modal: a short full-screen
// card that lands the player in the fiction before the car scene, so Lunch
// Dash no longer cold-starts in a vehicle with a salmon bowl and no context.
// It picks up the exact thread the Phase 2 → Phase 3 Exec segue set ("grab my
// salmon bowl, back by noon for the Architecture Sync") and restates the
// stakes + controls. Dismiss with click / Enter / Space.

import { useEffect, useState } from 'react'

const MONO = '"IBM Plex Mono", "SF Mono", ui-monospace, Menlo, monospace'
const FONT = 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif'

export function DriveIntro({ onStart }: { onStart: () => void }) {
  const [leaving, setLeaving] = useState(false)

  const go = () => {
    if (leaving) return
    setLeaving(true)
    // let the fade play, then hand control to the car
    window.setTimeout(onStart, 380)
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'Spacebar') {
        e.preventDefault()
        go()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [leaving])

  return (
    <button
      onClick={go}
      aria-label="Start the drive"
      style={{
        position: 'fixed', inset: 0, zIndex: 60,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 24, cursor: 'pointer', border: 'none',
        background: 'radial-gradient(120% 120% at 50% 30%, #1b1e23 0%, #0c0d10 100%)',
        transition: 'opacity 0.36s ease',
        opacity: leaving ? 0 : 1,
        fontFamily: FONT,
      }}
    >
      <div style={{ maxWidth: 460, width: '100%', textAlign: 'center', color: '#e9e3d4' }}>
        <div style={{ fontFamily: MONO, fontSize: 11, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#c9a24a', marginBottom: 16 }}>
          ● Alignly · Lunch Break · 11:00 AM
        </div>
        <div style={{ fontSize: 52, lineHeight: 1 }}>🥗</div>
        <h1 style={{ fontSize: 30, fontWeight: 800, letterSpacing: '-0.02em', margin: '14px 0 0' }}>
          One hour. One salmon bowl.
        </h1>
        <p style={{ fontSize: 14.5, lineHeight: 1.55, color: 'rgba(233,227,212,0.75)', margin: '14px auto 0', maxWidth: 400 }}>
          You told the Exec you'd grab his Corporate Slop Bowlz order. Pick it up
          downtown, grab your own lunch, and be back at HQ before the noon
          Architecture Sync. The bowl does not travel well.
        </p>
        <div style={{ fontFamily: MONO, fontSize: 12, letterSpacing: '0.08em', color: 'rgba(233,227,212,0.5)', marginTop: 20 }}>
          WASD / arrows to drive · E to interact
        </div>
        <div style={{
          display: 'inline-block', marginTop: 22,
          background: '#e9e3d4', color: '#15171a',
          borderRadius: 8, padding: '13px 24px',
          fontWeight: 800, fontSize: 15, letterSpacing: '0.02em',
        }}>
          Start the car →
        </div>
        <div style={{ fontFamily: MONO, fontSize: 11, color: 'rgba(233,227,212,0.4)', marginTop: 12 }}>
          (click anywhere or press Enter)
        </div>
      </div>
    </button>
  )
}
