// The fighter HUD: Credibility (Leonard) vs Resistance (opponent) bars, the
// Alignment super meter, the HARD STOP round clock, and — in dev — a live
// frame-data readout so the state machine is legible while tuning feel.
//
// Samples the module-global sim via rAF (not React sim state), so the fight
// loop never triggers a re-render; only the ~30fps HUD does.

import { useEffect, useState } from 'react'
import { leonard, opponent, fight } from './fighterState'
import { currentBout } from './boutState'
import { VITALS, ROUND } from './fightConfig'

type Snap = {
  cred: number
  resist: number
  meter: number
  time: number
  leo: string
  opp: string
  last: string
  scope: number
  derailT: number
  meterDenied: number
  oppLabel: string
  ready: boolean // can Leonard act on this frame?
  commit: number // 0..1 through the current lockout
}

// The state read-out (LEO idle t=0 / EXEC …) is a DEBUGGING tool, not part of
// the game. It never shipped — it was dev-only — but it sat on top of the fight
// during ordinary play, so it is now OPT-IN: add ?debug=1 to the URL.
const DEBUG_HUD =
  import.meta.env.DEV &&
  typeof window !== 'undefined' &&
  new URLSearchParams(window.location.search).get('debug') === '1'

// ── DANGER STATE ────────────────────────────────────────────────────────────
// Instead of a separate stun gauge, the LIFE BAR carries it: below this
// fraction a word appears beside the meter and the bar pulses red.
const DANGER_AT = 0.25

// PHOTOSENSITIVITY: this is a 1.4s SINE PULSE, not a flash. The fight already
// shipped one strobe bug; a hard on/off blink on a health bar — exactly when a
// player is staring at it — is the same hazard in a smaller box. Slow, smooth,
// and fully frozen under the OS Reduce Motion setting.
const PULSE_PERIOD_MS = 1400
const REDUCED_MOTION =
  typeof window !== 'undefined' && typeof window.matchMedia === 'function'
    ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
    : false

/** 0→1→0 over PULSE_PERIOD_MS. Constant 0.55 under reduced motion, so the
 *  danger colour still reads without any motion at all. */
function pulse(nowMs: number): number {
  if (REDUCED_MOTION) return 0.55
  return 0.5 - 0.5 * Math.cos((nowMs / PULSE_PERIOD_MS) * Math.PI * 2)
}

// Leonard is always the same person; the opponent's initial comes from the bout.
function Portrait({ initials, tint, side }: { initials: string; tint: string; side: 'left' | 'right' }) {
  return (
    <div
      style={{
        width: 30,
        height: 30,
        flex: '0 0 auto',
        borderRadius: 7,
        background: tint,
        border: '1.5px solid rgba(255,255,255,0.28)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Helvetica Neue", Arial, sans-serif',
        fontSize: 13,
        fontWeight: 500,
        color: '#ffffff',
        letterSpacing: '0.02em',
        marginRight: side === 'left' ? 8 : 0,
        marginLeft: side === 'right' ? 8 : 0,
      }}
    >
      {initials}
    </div>
  )
}

export function FightHud() {
  const [s, setS] = useState<Snap>(snapshot())
  const [nowMs, setNowMs] = useState(0)

  useEffect(() => {
    let raf = 0
    let alive = true
    let acc = 0
    let prev = performance.now()
    const loop = (t: number) => {
      if (!alive) return
      acc += t - prev
      prev = t
      if (acc >= 33) {
        acc = 0
        setS(snapshot())
        setNowMs(t)
      }
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => {
      alive = false
      cancelAnimationFrame(raf)
    }
  }, [])

  const credPct = (s.cred / VITALS.leonardMaxCredibility) * 100
  const resistPct = (s.resist / VITALS.oppMaxResistance) * 100
  const bars = Math.floor(s.meter)
  const secs = Math.max(0, Math.ceil(s.time))
  const showNum = secs <= ROUND.hideTimerUntil

  // Danger read-out lives on the life bars themselves (no extra gauge).
  const leoDanger = credPct / 100 <= DANGER_AT && credPct > 0
  const oppDanger = resistPct / 100 <= DANGER_AT && resistPct > 0
  const p = pulse(nowMs)
  const leoP = leoDanger ? p : 0
  const oppP = oppDanger ? p : 0
  // Opponent initials for the portrait, from the bout label ("BRENT K. — …").
  const oppInitials = (() => {
    const name = s.oppLabel.split('—')[0].trim().replace(/[“”"]/g, '')
    const parts = name.split(/\s+/).filter(Boolean)
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase()
    return (parts[0]?.slice(0, 2) ?? '??').toUpperCase()
  })()

  return (
    <div style={wrap} className="select-none">
      {/* Top: the two health bars + the timer between them. The bar IS the stun
          gauge — see DANGER_AT: in danger it pulses and names the state. */}
      <div style={topRow}>
        <div style={{ flex: 1, display: 'flex', alignItems: 'flex-start' }}>
          <Portrait initials="LP" tint="#3b6ea5" side="left" />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
              <div style={label}>LEONARD P. — CREDIBILITY</div>
              {leoDanger && (
                <span style={{ ...dangerWord, color: `rgba(255,${90 - leoP * 40},${80 - leoP * 40},${0.65 + leoP * 0.35})` }}>
                  LOSING THE ROOM
                </span>
              )}
            </div>
            <div style={{ ...barOuter, boxShadow: leoDanger ? `0 0 ${6 + leoP * 10}px rgba(200,60,45,${0.25 + leoP * 0.4})` : 'none' }}>
              <div
                style={{
                  ...barFill,
                  width: `${credPct}%`,
                  background: leoDanger ? `rgb(${150 + leoP * 70}, ${52 - leoP * 12}, ${44 - leoP * 10})` : '#3b6ea5',
                  marginLeft: 'auto',
                }}
              />
            </div>
          </div>
        </div>

        <div style={timerBox}>
          <div style={{ fontSize: 9, letterSpacing: '0.18em', color: '#b9b2a0' }}>HARD STOP</div>
          <div style={{ fontSize: showNum ? 26 : 15, fontWeight: 700, color: showNum ? '#c8492f' : '#e8e2d2', lineHeight: 1 }}>
            {showNum ? secs : '· · ·'}
          </div>
        </div>

        <div style={{ flex: 1, display: 'flex', alignItems: 'flex-start' }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, justifyContent: 'flex-end' }}>
              {oppDanger && (
                <span style={{ ...dangerWord, color: `rgba(255,${210 - oppP * 40},${120 - oppP * 40},${0.65 + oppP * 0.35})` }}>
                  ALMOST CONVINCED
                </span>
              )}
              <div style={{ ...label, textAlign: 'right' }}>{s.oppLabel}</div>
            </div>
            <div style={{ ...barOuter, boxShadow: oppDanger ? `0 0 ${6 + oppP * 10}px rgba(232,193,90,${0.25 + oppP * 0.4})` : 'none' }}>
              <div
                style={{
                  ...barFill,
                  width: `${resistPct}%`,
                  background: oppDanger ? `rgb(${190 + oppP * 45}, ${120 + oppP * 40}, ${50 + oppP * 20})` : '#a5433b',
                }}
              />
            </div>
          </div>
          <Portrait initials={oppInitials} tint="#a5433b" side="right" />
        </div>
      </div>

      {/* ── COMMIT BAR ────────────────────────────────────────────────────
          Every move locks you out for its whole animation — 450 ms for a jab,
          800 ms for a heavy — and nothing on screen used to say so. First-time
          players read that silence as the game dropping their inputs ("is
          there a cooldown I'm not aware of?"). This is that cooldown, drawn:
          it empties while you're committed and snaps back to READY when your
          next input will actually come out. */}
      <div style={{ ...meterRow, marginTop: 3 }}>
        <span style={{ fontSize: 9, letterSpacing: '0.16em', color: s.ready ? '#7bbf7b' : '#b9976a' }}>
          {s.ready ? 'READY' : 'COMMITTED'}
        </span>
        <div style={{ width: 150, height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.12)', overflow: 'hidden' }}>
          <div
            style={{
              width: `${s.ready ? 100 : Math.round((1 - s.commit) * 100)}%`,
              height: '100%',
              background: s.ready ? '#7bbf7b' : '#b9976a',
              transition: 'width 60ms linear',
            }}
          />
        </div>
      </div>

      {/* Alignment meter */}
      <div style={meterRow}>
        <span style={{ fontSize: 9, letterSpacing: '0.16em', color: '#b9b2a0' }}>ALIGNMENT</span>
        <div style={{ display: 'flex', gap: 2 }}>
          {Array.from({ length: VITALS.meterMax }).map((_, i) => (
            <div
              key={i}
              style={{
                width: 12,
                height: 8,
                borderRadius: 1,
                background: i < bars ? '#e8c15a' : 'rgba(255,255,255,0.12)',
              }}
            />
          ))}
        </div>
        {bars >= 3 && <span style={{ fontSize: 9, color: '#e8c15a', letterSpacing: '0.1em' }}>SPECIAL READY (I)</span>}
        {/* Pressing I below 3 bars used to do NOTHING and say nothing, which
            reads as a dead key. Now it tells you what it wants. */}
        {bars < 3 && s.meterDenied > 0 && (
          <span style={{ fontSize: 9, color: '#e8956a', letterSpacing: '0.1em' }}>
            NEEDS 3 BARS — LAND HITS TO BUILD ALIGNMENT
          </span>
        )}
        {/* SCOPE CREEP stacks — Priya's sticky notes pile onto your moves */}
        {s.scope > 0 && (
          <span style={{ fontSize: 11, fontWeight: 600, color: '#d8a13a', letterSpacing: '0.02em' }}>
            {'🗒️'.repeat(s.scope)} SCOPE +{s.scope} (throw to descope)
          </span>
        )}
        {/* DERAIL — the honest cruelty indicator: your J/K are swapped */}
        {s.derailT > 0 && (
          <span style={{ fontSize: 11, color: '#e86a5a', fontWeight: 700, letterSpacing: '0.02em' }}>
            🔀 DERAILED — J/K SWAPPED ({Math.ceil(s.derailT / 60)}s)
          </span>
        )}
      </div>

      {DEBUG_HUD && (
        <pre style={debug}>
          {`LEO  ${s.leo}\nEXEC ${s.opp}\nlast ${s.last || '—'}`}
        </pre>
      )}
    </div>
  )
}

function snapshot(): Snap {
  const fmt = (f: typeof leonard) =>
    `${f.state.padEnd(9)} t=${String(f.timer).padStart(2)} ${f.move ? f.move.name : ''}${
      f.blocking ? ' [block]' : ''
    }${f.invuln > 0 ? ' [i-frames]' : ''}`
  const bout = currentBout()
  return {
    cred: leonard.health,
    resist: (opponent.health / opponent.maxHealth) * VITALS.oppMaxResistance, // bar-relative

    meter: leonard.meter,
    time: fight.time,
    leo: fmt(leonard),
    opp: fmt(opponent),
    last: fight.lastHit ? `${fight.lastHit.by} ${fight.lastHit.move} (${fight.lastHit.dmg})` : '',
    scope: leonard.scopeStacks,
    derailT: leonard.keySwapT,
    meterDenied: leonard.meterDeniedT,
    oppLabel: `${bout.name} — ${bout.barLabel}`,
    ...commitSnap(),
  }
}

/** How committed Leonard is right now: idle/walk = free, anything else is the
 *  tail of a move (or of being hit) that he has to sit through. */
function commitSnap(): { ready: boolean; commit: number } {
  const f = leonard
  const free = f.state === 'idle' || f.state === 'walk'
  if (free && !f.airborne) return { ready: true, commit: 0 }
  const total =
    f.move && (f.state === 'startup' || f.state === 'active' || f.state === 'recovery')
      ? f.move.startup + f.move.active + f.move.recovery
      : Math.max(1, f.timer)
  // timer counts DOWN within the current phase; approximate progress with what
  // is left of the whole action so the bar drains once, not once per phase.
  const left =
    f.state === 'startup' ? f.timer + (f.move?.active ?? 0) + (f.move?.recovery ?? 0)
    : f.state === 'active' ? f.timer + (f.move?.recovery ?? 0)
    : f.timer
  return { ready: false, commit: Math.max(0, Math.min(1, 1 - left / total)) }
}

const wrap: React.CSSProperties = {
  position: 'fixed',
  top: 0,
  left: 0,
  right: 0,
  padding: '14px 20px',
  // SANS, not mono. Monospace glyphs are already wide, and stacking 0.06–0.16em
  // tracking on top of them made the status banners read as literally stretched.
  // Mono stays where it earns its keep — the calendar and the result-card
  // readouts, where it is a figure on a form — never on live HUD text.
  fontFamily: '-apple-system, BlinkMacSystemFont, "Helvetica Neue", Helvetica, Arial, sans-serif',
  color: '#e8e2d2',
  pointerEvents: 'none',
  zIndex: 10,
  // The light Product stage made the pale HUD text vanish; a soft dark halo
  // keeps every label legible on ANY stage without restyling per bout.
  textShadow: '0 1px 2px rgba(10,12,16,0.75), 0 0 6px rgba(10,12,16,0.45)',
}
const topRow: React.CSSProperties = { display: 'flex', alignItems: 'flex-start', gap: 16 }
const label: React.CSSProperties = { fontSize: 10, letterSpacing: '0.12em', color: '#cfc8b6', marginBottom: 4 }
// The danger word beside the bar — this is the stun read-out, folded into the
// life meter rather than given a gauge of its own.
const dangerWord: React.CSSProperties = {
  fontSize: 10,
  fontWeight: 700,
  letterSpacing: '0.14em',
  whiteSpace: 'nowrap',
}
const barOuter: React.CSSProperties = {
  height: 16,
  background: 'rgba(0,0,0,0.45)',
  border: '1px solid rgba(255,255,255,0.18)',
  borderRadius: 2,
  overflow: 'hidden',
  display: 'flex',
}
const barFill: React.CSSProperties = { height: '100%', transition: 'width 90ms linear' }
const timerBox: React.CSSProperties = {
  width: 74,
  textAlign: 'center',
  paddingTop: 2,
  flexShrink: 0,
}
const meterRow: React.CSSProperties = {
  marginTop: 10,
  display: 'flex',
  alignItems: 'center',
  gap: 10,
}
const debug: React.CSSProperties = {
  marginTop: 12,
  fontSize: 11,
  lineHeight: 1.5,
  color: '#9fd7a0',
  background: 'rgba(0,0,0,0.4)',
  padding: '6px 10px',
  borderRadius: 3,
  width: 'fit-content',
  whiteSpace: 'pre',
}
