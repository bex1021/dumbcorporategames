// Lunch Dash intro — the bridge beat into Phase 3.
//
// You're at your desk when a Slack DM from the Exec lands: go grab his lunch,
// be back by 1:00 for the Architecture Sync. This mirrors Jira Run's boot modal
// and the Phase 2 → Phase 3 Exec segue, and picks up the Slack-knock leitmotif —
// so Lunch Dash starts in the fiction (a ping you can't say no to) instead of
// cold-starting in a car. Dismiss with click / Enter / Space.

import { useEffect, useState } from 'react'
import { CarriedMeters } from '../ui/CarriedMeters'

const MONO = '"IBM Plex Mono", "SF Mono", ui-monospace, Menlo, monospace'
const FONT = 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif'

// The Slack pinwheel mark, 2×2 rounded blocks (same colours as the in-world ping)
function SlackMark() {
  const c = ['#36C5F0', '#2EB67D', '#ECB22E', '#E01E5A']
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '9px 9px', gridTemplateRows: '9px 9px', gap: 2 }}>
      {c.map((col, i) => (
        <div key={i} style={{ width: 9, height: 9, background: col, borderRadius: 2 }} />
      ))}
    </div>
  )
}

export function DriveIntro({ onStart }: { onStart: () => void }) {
  const [leaving, setLeaving] = useState(false)
  const [pinged, setPinged] = useState(false)

  // let the desk sit for a beat, then the ping slides in — reads as "a message
  // just arrived" rather than a static card
  useEffect(() => {
    const t = window.setTimeout(() => setPinged(true), 550)
    return () => window.clearTimeout(t)
  }, [])

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
      aria-label="Head out for lunch"
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
        <div style={{ fontFamily: MONO, fontSize: 11, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#c9a24a', marginBottom: 6 }}>
          ● Alignly · Lunch Break · 12:00 PM
        </div>
        <div style={{ fontSize: 12.5, color: 'rgba(233,227,212,0.55)', marginBottom: 18 }}>
          You're at your desk, half-out the door for lunch, when —
        </div>

        {/* Slack DM from the Exec — the ping you can't say no to */}
        <div
          style={{
            textAlign: 'left',
            background: '#3F0E40',
            border: '1px solid #7a4d7c',
            borderRadius: 12,
            boxShadow: '0 18px 50px rgba(0,0,0,0.5)',
            padding: '14px 16px 16px',
            transform: pinged ? 'translateY(0)' : 'translateY(10px)',
            opacity: pinged ? 1 : 0,
            transition: 'opacity 0.4s ease, transform 0.4s ease',
          }}
        >
          {/* toast header */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <SlackMark />
            <span style={{ fontWeight: 700, fontSize: 14, color: '#fff' }}>Slack</span>
            <span style={{ fontSize: 12, color: '#b9a3ba' }}>· direct message · now</span>
          </div>
          {/* sender */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
            <div style={{ width: 34, height: 34, borderRadius: 7, background: '#b08a3a', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, color: '#fff', fontSize: 16 }}>
              E
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 14.5, color: '#fff' }}>
                Exec <span style={{ fontSize: 11, color: '#b9a3ba', fontWeight: 400 }}>12:00 PM</span>
              </div>
              <div style={{ fontSize: 11, color: '#8ec39a' }}>● active now</div>
            </div>
          </div>
          {/* the message, in the exec's exact voice */}
          <div style={{ fontSize: 15, lineHeight: 1.5, color: '#f3e9f4' }}>
            hey i have a meeting — can you go pick up my lunch from Corporate Slop Bowlz? be back by 1 for the architecture sync, that meeting is <span style={{ fontStyle: 'italic' }}>key</span> 🙏
          </div>
        </div>

        <p style={{ fontSize: 13.5, lineHeight: 1.55, color: 'rgba(233,227,212,0.7)', margin: '16px auto 0', maxWidth: 400 }}>
          Grab the exec's bowl downtown, grab your own lunch, and be back at HQ before the 1:00 sync. The bowl does not travel well.
        </p>
        <div style={{ fontFamily: MONO, fontSize: 12, letterSpacing: '0.06em', color: 'rgba(233,227,212,0.5)', marginTop: 18 }}>
          WASD / arrows to drive · H to honk · E to interact
        </div>
        <div style={{
          display: 'inline-block', marginTop: 20,
          background: '#e9e3d4', color: '#15171a',
          borderRadius: 8, padding: '13px 24px',
          fontWeight: 800, fontSize: 15, letterSpacing: '0.02em',
        }}>
          On it — head out →
        </div>
        <div style={{ fontFamily: MONO, fontSize: 11, color: 'rgba(233,227,212,0.4)', marginTop: 12 }}>
          (click anywhere or press Enter)
        </div>
        {/* The morning's dashboard, frozen — continuity from the standup you
            just came from. Renders nothing if there's no Phase 1 on record. */}
        <div style={{ marginTop: 24 }}>
          <CarriedMeters align="center" tone="dark" />
        </div>
      </div>
    </button>
  )
}
