// KeyboardGate — deadpan IT-department notice for touch-only devices.
//
// All three games are keyboard-driven (WASD/arrows + E/Space) with zero
// touch controls. Before this gate, the site's primary CTA ("▶ PLAY — FREE")
// dead-ended phone visitors in an unplayable 3D canvas with no explanation —
// a silently missing state on the highest-traffic path into the product.
//
// Detection: `(any-pointer: fine)` is false only when NO precise pointer
// (mouse/trackpad) exists — i.e. genuinely touch-only hardware. iPads with
// trackpads, laptops with touchscreens, and desktops all pass. Because some
// touch-only devices still have paired Bluetooth keyboards, the gate is an
// escape-hatchable notice, not a wall.
//
// Tone: in-fiction, per the blueprint ("deadpan, not wacky") — the studio's
// IT department politely declines to support your phone.

import { useState } from 'react'
import type { ReactNode } from 'react'

const BR = {
  bg: '#f1f0ec',
  ink: '#000',
  accent: '#FF4500',
  muted: '#5a5a5a',
} as const
const font = '"Helvetica Neue", Helvetica, Inter, Arial, sans-serif'
const mono = '"IBM Plex Mono", "SF Mono", ui-monospace, Menlo, monospace'

function isTouchOnly(): boolean {
  if (typeof window === 'undefined') return false
  // ?kbgate forces the notice on any device — lets you preview/test the
  // gated branch from a desktop (pointer emulation is hard to fake).
  if (new URLSearchParams(window.location.search).has('kbgate')) return true
  if (!window.matchMedia) return false
  return !window.matchMedia('(any-pointer: fine)').matches
}

export function KeyboardGate({ children }: { children: ReactNode }) {
  // Evaluated once per mount — pointer hardware doesn't change mid-session
  // often enough to justify a listener, and the escape hatch covers the rest.
  const [gated, setGated] = useState(isTouchOnly)

  if (!gated) return <>{children}</>

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 100,
      background: BR.bg, color: BR.ink,
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      padding: 24, textAlign: 'center', fontFamily: font,
      overflowY: 'auto',
    }}>
      <div style={{ maxWidth: 560, width: '100%' }}>
        <div style={{
          fontFamily: mono, fontSize: 11, fontWeight: 700, color: BR.muted,
          textTransform: 'uppercase', letterSpacing: '0.16em', marginBottom: 14,
        }}>
          <span style={{ color: BR.accent, marginRight: 8 }}>●</span>
          IT DEPARTMENT · TICKET #00-KBD · AUTO-CLOSED
        </div>
        <h1 style={{
          margin: 0, fontWeight: 900, textTransform: 'uppercase',
          fontSize: 'clamp(34px, 9vw, 56px)', lineHeight: 0.95, letterSpacing: '-0.03em',
        }}>
          THIS WORKSTATION REQUIRES A KEYBOARD<span style={{ color: BR.accent }}>.</span>
        </h1>
        <p style={{
          margin: '18px auto 0', fontSize: 16, lineHeight: 1.5,
          maxWidth: 440, color: '#222',
        }}>
          THE GAMES ARE PLAYED WITH WASD, ARROWS, AND THE E KEY.
          PHONES ARE FOR SLACK. PLEASE RETURN FROM A DESKTOP OR
          LAPTOP — THE OFFICE WILL STILL BE HERE. IT ALWAYS IS.
        </p>

        <div style={{
          marginTop: 28, display: 'flex', flexDirection: 'column', gap: 0,
          border: `2px solid ${BR.ink}`,
        }}>
          <a href="/" style={{
            display: 'block', padding: '18px 20px',
            background: BR.ink, color: BR.bg, textDecoration: 'none',
            fontWeight: 900, fontSize: 16, textTransform: 'uppercase', letterSpacing: '0.04em',
          }}>← BACK TO THE STUDIO SITE</a>
          {/* Escape hatch: touch-only per media query, but a Bluetooth
              keyboard may be paired. Never hard-block. */}
          <button
            onClick={() => setGated(false)}
            style={{
              appearance: 'none', border: 'none', borderTop: `2px solid ${BR.ink}`,
              background: BR.bg, color: BR.muted, cursor: 'pointer',
              padding: '14px 20px', fontFamily: mono, fontSize: 11, fontWeight: 700,
              textTransform: 'uppercase', letterSpacing: '0.12em',
            }}
          >
            I HAVE A KEYBOARD, ACTUALLY → PROCEED
          </button>
        </div>

        <div style={{
          marginTop: 16, fontFamily: mono, fontSize: 10, color: BR.muted,
          textTransform: 'uppercase', letterSpacing: '0.1em', lineHeight: 1.6,
        }}>
          THIS INCIDENT HAS BEEN LOGGED · SEVERITY: LOW · MOOD: UNDERSTANDING
        </div>
      </div>
    </div>
  )
}
