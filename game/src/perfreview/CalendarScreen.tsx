// The Phase 4 title screen: your afternoon, as a calendar.
//
// Same trick as Jira Run's fake desktop — the game's menus are office
// software. The day view shows the three meetings (the three bouts); the
// NEXT one pulses gold so the eye lands there, done ones grey out with a
// verdict, future ones sit locked ("back-to-backs"). Clicking the live
// meeting opens its invite; JOIN MEETING fades into the fight.

import { useEffect, useState } from 'react'
import { BOUTS, gauntlet, chainNote, type BoutConfig } from './boutState'

const PX_PER_MIN = 2 // grid: 12 PM top, 120px per hour
const GRID_HOURS = ['12 PM', '1 PM', '2 PM', '3 PM', '4 PM', '5 PM']

export function CalendarScreen({ onJoin }: { onJoin: () => void }) {
  const [invite, setInvite] = useState<BoutConfig | null>(null)
  const [leaving, setLeaving] = useState(false)

  // Hand straight over to the lobby. This used to fade the calendar to
  // opacity 0 *before* calling onJoin — which meant that for 380 ms the only
  // thing behind it was the live 3D arena, so you got a flash of both fighters
  // between clicking Join and reaching the lobby. The shell in
  // PerformanceReview is opaque and outlives both screens, so the handover
  // happens against a solid surface now.
  const join = () => {
    if (leaving) return
    setLeaving(true)
    onJoin()
  }

  const next = BOUTS[gauntlet.index]

  return (
    <div style={{ ...wrap, background: 'transparent', opacity: leaving ? 0 : 1 }}>
      {/* ── top chrome ── */}
      <div style={chrome}>
        <span style={{ fontSize: 18 }}>☰</span>
        <span style={logoDot} />
        <b style={{ fontSize: 16, color: '#3c4043' }}>Calendar</b>
        <span style={{ color: '#70757a', fontSize: 13, marginLeft: 10 }}>Today · the afternoon of the portal refresh</span>
        <span style={{ marginLeft: 'auto', color: '#70757a', fontSize: 12 }}>
          {next ? `Up next: ${next.cal.title}` : 'No more meetings. Ever?'}
        </span>
      </div>

      {/* ── day grid ── */}
      <div style={gridOuter}>
        <div style={gridInner}>
          {GRID_HOURS.map((h, i) => (
            <div key={h}>
              <div style={{ ...hourLine, top: i * 60 * PX_PER_MIN }} />
              <div style={{ ...hourLabel, top: i * 60 * PX_PER_MIN - 7 }}>{h}</div>
            </div>
          ))}

          {/* continuity block — the Lunch Dash you just survived (12:00–1:00) */}
          <div style={{ ...event, top: 0, height: 60 * PX_PER_MIN - 4, background: '#f1f3f4', borderLeft: '4px solid #dadce0', color: '#9aa0a6' }}>
            <div style={{ fontSize: 12 }}>Lunch — out of office ✓</div>
            <div style={{ fontSize: 10 }}>the salmon bowl made it. mostly.</div>
          </div>

          {/* flavor block — the day's one attempt at real work (3:00–4:30),
              and the hour the lunch you drove across town for at NOON finally
              gets eaten. The gap between the two back-to-backs and the Exec. */}
          <div style={{ ...event, top: 180 * PX_PER_MIN, height: 90 * PX_PER_MIN - 4, background: '#f1f3f4', borderLeft: '4px solid #dadce0', color: '#9aa0a6' }}>
            <div style={{ fontSize: 12, textDecoration: 'line-through' }}>Focus time</div>
            <div style={{ fontSize: 10 }}>declined by 6 people · you finally eat your own lunch</div>
          </div>

          {BOUTS.map((b, i) => {
            const state = i < gauntlet.index ? 'done' : i === gauntlet.index ? 'now' : 'future'
            const result = gauntlet.results[i]
            return (
              <div
                key={b.key}
                onClick={state === 'now' ? () => setInvite(b) : undefined}
                style={{
                  ...event,
                  top: b.cal.startMin * PX_PER_MIN,
                  height: (b.cal.endMin - b.cal.startMin) * PX_PER_MIN - 4,
                  background: state === 'done' ? '#f1f3f4' : `${b.cal.color}22`,
                  borderLeft: `4px solid ${state === 'done' ? '#dadce0' : b.cal.color}`,
                  color: state === 'done' ? '#9aa0a6' : '#3c4043',
                  cursor: state === 'now' ? 'pointer' : 'default',
                  ...(state === 'now' ? nowGlow : null),
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <b style={{ fontSize: 13 }}>{b.cal.title}</b>
                  {state === 'now' && <span style={nowChip}>STARTS NOW — CLICK TO OPEN</span>}
                  {state === 'done' && (
                    <span style={{ fontSize: 11 }}>{result?.won ? '✓ signed off' : '✗ unconvinced'}</span>
                  )}
                  {state === 'future' && (
                    <span style={{ fontSize: 11, color: '#9aa0a6' }}>
                      {/* "back-to-backs" is only true when the previous meeting
                          ends exactly as this one starts. The Exec sits after a
                          90-minute gap, so it gets its own line. */}
                      {i > 0 && BOUTS[i - 1].cal.endMin === b.cal.startMin ? '🔒 back-to-backs' : '🔒 later today'}
                    </span>
                  )}
                </div>
                <div style={{ fontSize: 11, marginTop: 2 }}>{b.cal.time} · {b.cal.organizer}</div>
              </div>
            )
          })}
        </div>
      </div>

      {/* ── the invite ── */}
      {invite && (
        <div style={modalScrim} onClick={() => setInvite(null)}>
          <div style={modal} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ width: 14, height: 14, borderRadius: 4, background: invite.cal.color }} />
              <b style={{ fontSize: 20, color: '#3c4043' }}>{invite.cal.title}</b>
              <span style={{ marginLeft: 'auto', color: '#9aa0a6', cursor: 'pointer', fontSize: 18 }} onClick={() => setInvite(null)}>✕</span>
            </div>
            <div style={inviteRow}>🕓 Today · {invite.cal.time}</div>
            <div style={inviteRow}>📍 Conference Room 4B</div>
            <div style={inviteRow}>👤 {invite.cal.organizer} — organizer</div>
            <div style={inviteRow}>👥 You — attendance required</div>
            {chainNote() && (
              <div style={{ ...inviteRow, fontStyle: 'italic', color: '#70757a', borderLeft: '3px solid #dadce0', paddingLeft: 10 }}>
                “{chainNote()}”
              </div>
            )}
            <button style={joinBtn} onClick={join}>▶ JOIN MEETING</button>
            <div style={{ fontSize: 11, color: '#9aa0a6', marginTop: 10, textAlign: 'center' }}>
              prep: A/D move · J jab · K heavy · L kick · O throw · hold S block · I special
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ── The meeting lobby (shown after JOIN MEETING, before the first fight) ────
// Every meeting app makes you sit in a "Ready to join?" room; ours is where
// you learn the controls. One click, corporate to the bone.

export function MeetingLobby({
  title,
  organizer,
  onEnter,
}: {
  title: string
  organizer: string
  onEnter: () => void
}) {
  const [shown, setShown] = useState(false)
  const [leaving, setLeaving] = useState(false)
  const [mic, setMic] = useState(false)
  const [cam, setCam] = useState(false)

  // Fade the panel up on arrival — the shell behind is already opaque, so this
  // reads as a Meet screen loading rather than a cut.
  useEffect(() => {
    const id = requestAnimationFrame(() => setShown(true))
    return () => cancelAnimationFrame(id)
  }, [])

  const enter = () => {
    if (leaving) return
    setLeaving(true)
    onEnter() // the shell owns the fade out to the room
  }

  return (
    <div
      style={{
        position: 'fixed', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontFamily: 'Roboto, "Helvetica Neue", Arial, sans-serif', padding: 24,
        opacity: shown && !leaving ? 1 : 0, transition: 'opacity 300ms ease',
      }}
    >
      {/* GOOGLE MEET's green room is ASYMMETRIC: a big camera preview on the
          left, a narrow join column on the right. Two equal columns read as a
          generic split screen, which is what looked wrong. The controls live
          under the preview because that whole left side is "your setup"; the
          right side does one job — join. */}
      <div
        style={{
          display: 'flex',
          gap: 44,
          alignItems: 'center',
          flexWrap: 'wrap',
          justifyContent: 'center',
          maxWidth: PREVIEW_W + JOIN_W + 44,
        }}
      >
        {/* ── LEFT: camera preview + everything about your setup ── */}
        <div style={{ width: PREVIEW_W, maxWidth: '92vw' }}>
          <div style={camBox}>
            <div style={camAvatar}>LP</div>
            <div style={{ color: '#e8eaed', fontSize: 15, marginTop: 14 }}>
              {cam ? 'Camera on. Bold.' : 'Camera is off'}
            </div>
            <div style={{ color: '#9aa0a6', fontSize: 12, marginTop: 2 }}>
              {cam ? 'They can see the lunch on your collar.' : 'Wise.'}
            </div>
            <div style={camPill}>Leonard P.</div>
            <div style={{ position: 'absolute', bottom: 14, display: 'flex', gap: 12 }}>
              <RoundToggle on={mic} onClick={() => setMic((v) => !v)} label={mic ? '🎙' : '🔇'} />
              <RoundToggle on={cam} onClick={() => setCam((v) => !v)} label={cam ? '📹' : '🚫'} />
            </div>
          </div>
          <div style={{ textAlign: 'center', color: '#9aa0a6', fontSize: 12, marginTop: 10 }}>
            {mic ? 'Your mic is live. Everything counts.' : 'Muted. Nobody will notice either way.'}
          </div>

          <div style={controlsPanel}>
            <div style={{ fontSize: 11, letterSpacing: '0.1em', color: '#9aa0a6', marginBottom: 12 }}>
              MEETING CONTROLS
            </div>
            {/* Two columns of keys — the list is wide now, and a single column
                left a lot of dead space beside it. */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'auto 1fr auto 1fr',
                gap: '9px 12px',
                fontSize: 13,
                textAlign: 'left',
                color: '#e8eaed',
                alignItems: 'center',
              }}
            >
              <Key>A / D</Key><span>move · <b>double-tap A</b> dodges</span>
              <Key>J</Key><span><b>Clarify</b> — quick jab</span>
              <Key>W</Key><span><b>Jumping In</b> — hop, then J/K</span>
              <Key>K</Key><span><b>Pushback</b> — heavy, floors them</span>
              <Key>S</Key><span><b>Active Listening</b> — hold to block</span>
              <Key>L</Key><span><b>Circling Back Hard</b> — spinning kick</span>
              <Key>O</Key><span><b>Take This Offline</b> — throw (unblockable)</span>
              <Key>I</Key><span><b>Phased Approach</b> — special</span>
              <span /><span />
            </div>
            {/* The colour-telegraph legend lived here. The tint itself is gone
                (too distracting), so this now describes the read that actually
                exists: the wind-up ANIMATION. */}
            <div style={readLegend}>
              Watch their wind-up — the bigger the swing, the longer it takes.
              Block a heavy, throw them out of a block.
            </div>
          </div>
        </div>

        {/* ── RIGHT: the join column. One job. ── */}
        <div style={{ width: JOIN_W, maxWidth: '92vw', textAlign: 'center', color: '#e8eaed' }}>
          <div style={{ fontSize: 28, fontWeight: 400, marginBottom: 10 }}>Ready to join?</div>
          <div style={{ fontSize: 15, color: '#e8eaed', marginBottom: 4 }}>{title}</div>
          <div style={{ fontSize: 14, color: '#9aa0a6' }}>{organizer} is already in this call</div>
          <button style={joinNowBtn} onClick={enter}>Join now</button>
        </div>
      </div>
    </div>
  )
}

function RoundToggle({ on, onClick, label }: { on: boolean; onClick: () => void; label: string }) {
  return (
    <button
      onClick={onClick}
      style={{
        width: 44, height: 44, borderRadius: '50%', cursor: 'pointer', fontSize: 16,
        border: on ? '1px solid #5f6368' : 'none',
        background: on ? 'transparent' : '#ea4335',
        color: '#e8eaed',
      }}
    >
      {label}
    </button>
  )
}

function Key({ children }: { children: React.ReactNode }) {
  return (
    <span style={{
      display: 'inline-block', minWidth: 34, textAlign: 'center', padding: '2px 8px',
      border: '1px solid #5f6368', borderBottom: '2px solid #5f6368', borderRadius: 6,
      background: 'rgba(255,255,255,0.06)', fontWeight: 700, fontSize: 12, color: '#e8eaed',
    }}>
      {children}
    </span>
  )
}

// Meet's green room is asymmetric — a wide preview, a narrow join column.
const PREVIEW_W = 620
const JOIN_W = 320
const camBox: React.CSSProperties = {
  position: 'relative', width: '100%', height: 336, background: '#3c4043',
  borderRadius: 12, display: 'flex', flexDirection: 'column', alignItems: 'center',
  justifyContent: 'center', overflow: 'hidden',
}
const camAvatar: React.CSSProperties = {
  width: 78, height: 78, borderRadius: '50%', background: '#5b6bb5', color: '#fff',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  fontSize: 30, fontWeight: 500, letterSpacing: '0.02em',
}
const camPill: React.CSSProperties = {
  position: 'absolute', left: 14, top: 12, color: '#e8eaed', fontSize: 13,
}
const readLegend: React.CSSProperties = {
  marginTop: 14, fontSize: 12, color: '#9aa0a6', background: 'rgba(255,255,255,0.04)',
  border: '1px solid #3c4043', borderRadius: 8, padding: '8px 12px', lineHeight: 1.6,
  textAlign: 'left',
}
const controlsPanel: React.CSSProperties = {
  marginTop: 22, background: 'rgba(255,255,255,0.03)', border: '1px solid #3c4043',
  borderRadius: 12, padding: '16px 18px',
}
const joinNowBtn: React.CSSProperties = {
  display: 'block', margin: '20px auto 0', padding: '12px 30px',
  fontSize: 15, fontWeight: 500, color: '#fff',
  background: '#1a73e8', border: 'none', borderRadius: 24, cursor: 'pointer',
}

// ── styles ───────────────────────────────────────────────────────────────────

const wrap: React.CSSProperties = {
  position: 'fixed',
  inset: 0,
  background: '#fff',
  zIndex: 30,
  fontFamily: 'Roboto, "Helvetica Neue", Arial, sans-serif',
  display: 'flex',
  flexDirection: 'column',
  transition: 'opacity 0.35s ease',
}
const chrome: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 10,
  padding: '12px 20px',
  borderBottom: '1px solid #dadce0',
  color: '#5f6368',
}
const logoDot: React.CSSProperties = {
  width: 18,
  height: 18,
  borderRadius: 4,
  background: 'conic-gradient(#4285f4 0 25%, #ea4335 0 50%, #fbbc04 0 75%, #34a853 0)',
}
const gridOuter: React.CSSProperties = { flex: 1, overflowY: 'auto', padding: '18px 0' }
const gridInner: React.CSSProperties = {
  position: 'relative',
  height: 5.7 * 60 * PX_PER_MIN, // 12 PM → past the 5:30 end of the Executive Review
  maxWidth: 760,
  margin: '0 auto',
}
const hourLine: React.CSSProperties = {
  position: 'absolute',
  left: 70,
  right: 16,
  borderTop: '1px solid #e8eaed',
}
const hourLabel: React.CSSProperties = {
  position: 'absolute',
  left: 14,
  fontSize: 11,
  color: '#70757a',
}
const event: React.CSSProperties = {
  position: 'absolute',
  left: 78,
  right: 24,
  borderRadius: 8,
  padding: '7px 12px',
  boxSizing: 'border-box',
  overflow: 'hidden',
  userSelect: 'none',
}
const nowGlow: React.CSSProperties = {
  boxShadow: '0 0 0 2px #e8c15a, 0 0 18px 4px rgba(232,193,90,0.65)',
  animation: 'pr-glow 1.4s ease-in-out infinite',
}
const nowChip: React.CSSProperties = {
  fontSize: 10,
  fontWeight: 700,
  letterSpacing: '0.06em',
  color: '#7a5c00',
  background: '#fdeeba',
  border: '1px solid #e8c15a',
  borderRadius: 10,
  padding: '2px 8px',
}
const modalScrim: React.CSSProperties = {
  position: 'fixed',
  inset: 0,
  background: 'rgba(32,33,36,0.5)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 40,
}
const modal: React.CSSProperties = {
  width: 420,
  maxWidth: '90vw',
  background: '#fff',
  borderRadius: 12,
  boxShadow: '0 12px 40px rgba(0,0,0,0.3)',
  padding: '20px 24px 18px',
}
const inviteRow: React.CSSProperties = { fontSize: 13, color: '#3c4043', marginTop: 10 }
const joinBtn: React.CSSProperties = {
  display: 'block',
  width: '100%',
  marginTop: 18,
  padding: '14px 0',
  fontSize: 15,
  fontWeight: 700,
  letterSpacing: '0.05em',
  color: '#fff',
  background: '#1a73e8',
  border: 'none',
  borderRadius: 8,
  cursor: 'pointer',
}

// keyframes for the gold pulse (injected once)
if (typeof document !== 'undefined' && !document.getElementById('pr-glow-style')) {
  const style = document.createElement('style')
  style.id = 'pr-glow-style'
  style.textContent = `@keyframes pr-glow {
    0%, 100% { box-shadow: 0 0 0 2px #e8c15a, 0 0 14px 2px rgba(232,193,90,0.45); }
    50% { box-shadow: 0 0 0 3px #e8c15a, 0 0 26px 8px rgba(232,193,90,0.8); }
  }`
  document.head.appendChild(style)
}
