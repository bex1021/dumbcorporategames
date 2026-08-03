// The Phase 3 retrospective — a fake Jira ticket (LUNCH-471) that resolves the
// run. Same deadpan format as the Phase 2 Jira-board retro: status, resolution
// tier, subtask checklist, the stats the player didn't know were tracked, and
// the franchise punchline — Actual Business Value Generated: $0.00. Shows the
// instant the run ends (delivered, or a 1:30 no-show).
//
// Laid out as ONE page (no scroll): the ticket on the left, and — on a
// delivered run — the Exec's follow-up rendered as an iPhone with Slack open to
// the conversation, on the right. Same cohesion thread as every phase's Exec
// segue (one more calendar drop, the 4:30 tease), just staged as a phone.

import { useEffect, useSyncExternalStore } from 'react'
import { Link } from 'react-router-dom'
import { useLunchStore, type RunFinal } from './lunchStore'
import { resetRun } from './runReset'
import { LUNCH_ACHIEVEMENTS_CATALOG, saveLunchUnlocked } from '../content/lunchAchievements'
import { subscribeRadio, getRadioState, toggleRadio } from './driveAudio'

// Earned-conditions keyed by id; the badge metadata (emoji/title/desc) lives in
// the shared catalog (content/lunchAchievements.ts) so the level-select menu can
// list them without importing this heavy chunk. Same split as Jira Run.
const LUNCH_EARNED: Record<string, (f: RunFinal) => boolean> = {
  delivered: (f) => f.delivered,
  novalue: (f) => f.delivered,
  ontime: (f) => f.delivered && !f.wasLate,
  composed: (f) => f.returnTier === 'composed',
  bowlintact: (f) => f.delivered && f.bowlState !== 'disheveled',
  cleanrecord: (f) => f.pedestrianHits === 0,
  pristine: (f) => f.damage === 'pristine',
  spare: (f) => f.delivered && f.minutesUsed <= 40,
  menace: (f) => f.pedestrianHits >= 3,
}

const MONO = '"IBM Plex Mono", "SF Mono", ui-monospace, Menlo, monospace'
const SANS = 'system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, sans-serif'

const TIER = {
  composed: { label: 'Composed', color: '#5cbb7a' },
  functional: { label: 'Functional', color: '#d9b24a' },
  disheveled: { label: 'Disheveled', color: '#d76a5a' },
} as const

function headline(f: RunFinal): { title: string; line: string } {
  if (!f.delivered) return { title: "Out of time — you didn't make it back for the sync.", line: 'The Architecture Sync started without you. Diane (HR) is already typing.' }
  if (f.returnTier === 'composed')
    return { title: 'Composed.', line: 'Back in one piece, bowl intact, not a soul harmed. The exec barely looks up — "Let’s get into it."' }
  if (f.returnTier === 'functional')
    return { title: 'Functional.', line: "You're here. The bowl's a little sloshed but presentable. “Let's begin.”" }
  if (f.wasLate) return { title: 'Disheveled — and late.', line: '“Glad you could join us.”' }
  if (f.bowlState === 'disheveled') return { title: 'Disheveled.', line: 'You hand over a salmon crime scene. “Did we… not get the salmon bowl?”' }
  return { title: 'Disheveled.', line: '“Item 4 — I understand there was an incident on Sepulveda.”' }
}

const SUBTASKS = ["Pick up the exec's salmon bowl", 'Pick up your lunch', 'Return to Alignly HQ']

export function Retrospective() {
  const done = useLunchStore((s) => s.done)
  const final = useLunchStore((s) => s.final)
  // radio state so the music toggle reflects on/off (hooks must run every render,
  // so this + the save-effect sit ABOVE the early return)
  const radio = useSyncExternalStore(subscribeRadio, getRadioState, getRadioState)
  // persist the achievement haul once the run resolves
  useEffect(() => {
    if (!final) return
    saveLunchUnlocked(LUNCH_ACHIEVEMENTS_CATALOG.filter((a) => LUNCH_EARNED[a.id]?.(final)).map((a) => a.id))
  }, [final])
  if (!done || !final) return null

  const tier = TIER[final.returnTier]
  const isTimeout = final.outcome === 'timeout'
  const resColor = isTimeout ? '#d76a5a' : tier.color
  const h = headline(final)
  const earnedIds = new Set(LUNCH_ACHIEVEMENTS_CATALOG.filter((a) => LUNCH_EARNED[a.id]?.(final)).map((a) => a.id))
  const row = (k: string, v: string, vColor?: string) => (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
      <span style={{ opacity: 0.55 }}>{k}</span>
      <span style={{ color: vColor ?? '#d9d3c4', textAlign: 'right' }}>{v}</span>
    </div>
  )

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 40,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(10,11,13,0.82)',
        backdropFilter: 'blur(6px)',
        fontFamily: SANS,
        color: '#d9d3c4',
        pointerEvents: 'auto',
        padding: 16,
      }}
    >
      {/* one row: ticket + (on a win) the phone. Wraps only if truly too narrow. */}
      <div style={{ display: 'flex', gap: 18, alignItems: 'stretch', maxHeight: '94vh', flexWrap: 'wrap', justifyContent: 'center' }}>
        {/* ─── left: the Jira retro ticket ─── */}
        <div
          style={{
            width: 'min(500px, 94vw)',
            maxHeight: '94vh',
            display: 'flex',
            flexDirection: 'column',
            background: '#16181c',
            border: '1px solid rgba(217,211,196,0.18)',
            borderRadius: 10,
            boxShadow: '0 24px 80px rgba(0,0,0,0.6)',
            overflow: 'hidden',
          }}
        >
          <div style={{ padding: '6px 10px 6px 16px', fontSize: 10.5, letterSpacing: '0.04em', borderBottom: '1px solid rgba(255,255,255,0.07)', background: '#1b1e23', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
            <span style={{ fontFamily: MONO, opacity: 0.5 }}>Projects › Personal › Lunch Dash › Retrospective</span>
            <button
              onClick={toggleRadio}
              title={radio.on ? 'Turn the radio off' : 'Turn the radio on'}
              style={{
                flexShrink: 0,
                cursor: 'pointer',
                background: radio.on ? 'rgba(230,193,90,0.14)' : 'rgba(255,255,255,0.04)',
                border: `1px solid ${radio.on ? 'rgba(230,193,90,0.4)' : 'rgba(217,211,196,0.22)'}`,
                borderRadius: 5,
                color: radio.on ? '#e6c15a' : '#8a8f96',
                fontFamily: SANS,
                fontSize: 11,
                padding: '3px 8px',
                letterSpacing: '0.04em',
              }}
            >
              {radio.on ? '🔊 Music on' : '🔇 Music off'}
            </button>
          </div>

          <div style={{ padding: '14px 18px', overflowY: 'auto' }}>
            {/* the ticket ID stays mono — it's a Jira reference, and that's the joke */}
            <div style={{ fontFamily: MONO, fontSize: 11, letterSpacing: '0.14em', color: tier.color, opacity: 0.95 }}>
              LUNCH-471 · {final.delivered ? '✓ DONE' : '✗ FAILED'}
            </div>
            <div style={{ fontSize: 18, marginTop: 3, marginBottom: 2 }}>Pre-Sync Nourishment Acquisition</div>

            <div style={{ marginTop: 10, padding: '10px 13px', borderRadius: 8, background: 'rgba(255,255,255,0.03)', border: `1px solid ${resColor}55` }}>
              <div style={{ fontSize: 10, letterSpacing: '0.18em', opacity: 0.55 }}>{isTimeout ? 'OUTCOME' : 'RESOLUTION'}</div>
              <div style={{ fontSize: 22, fontWeight: 600, color: resColor, marginTop: 1 }}>{isTimeout ? '⏱ Out of Time' : tier.label}</div>
              <div style={{ fontSize: 12.5, marginTop: 5, opacity: 0.92 }}>{h.title}</div>
              <div style={{ fontSize: 11.5, marginTop: 3, opacity: 0.62, fontStyle: 'italic' }}>{h.line}</div>
            </div>

            <div style={{ marginTop: 12, fontSize: 10, letterSpacing: '0.16em', opacity: 0.5 }}>SUBTASKS</div>
            <div style={{ marginTop: 5, fontSize: 12.5 }}>
              {SUBTASKS.map((s, i) => {
                const ok = i < final.stopsCompleted
                return (
                  <div key={i} style={{ display: 'flex', gap: 9, padding: '2px 0', opacity: ok ? 1 : 0.5 }}>
                    <span style={{ color: ok ? tier.color : '#777' }}>{ok ? '✓' : '☐'}</span>
                    <span style={{ opacity: 0.5 }}>LUNCH-471.{i + 1}</span>
                    <span>{s}</span>
                  </div>
                )
              })}
            </div>

            <div style={{ marginTop: 12, fontSize: 10, letterSpacing: '0.16em', opacity: 0.5 }}>COMMENTS</div>
            <div style={{ marginTop: 3, fontSize: 12 }}>
              {row('Time used', `${final.minutesUsed} of 60 min`, final.wasLate ? '#d76a5a' : undefined)}
              {final.wasLate && row('', `— late by ${final.latenessMin} min`, '#d76a5a')}
              {row('Pedestrians injured', String(final.pedestrianHits), final.pedestrianHits ? '#d99a5a' : undefined)}
              {final.riverDunks > 0 &&
                row(
                  'Vehicle recovered from water',
                  final.riverDunks === 1 ? 'Once' : `${final.riverDunks} times`,
                  '#d99a5a',
                )}
              {row('Vehicle damage', final.damage[0].toUpperCase() + final.damage.slice(1))}
              {row('Bowl status at delivery', final.delivered ? `${TIER[final.bowlState].label} (${final.bowlIntegrity}%)` : 'Undelivered', TIER[final.bowlState].color)}
              {row('Vehicle', 'Personal')}
            </div>

            <div style={{ marginTop: 12, paddingTop: 10, borderTop: '1px dashed rgba(255,255,255,0.14)', display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
              <span style={{ opacity: 0.7 }}>Actual Business Value Generated</span>
              <span style={{ fontWeight: 600 }}>$0.00</span>
            </div>

            <div style={{ marginTop: 16, display: 'flex', gap: 10, alignItems: 'center' }}>
              {/* Progression hand-off (same pattern as Jira Run's win screen):
                  a delivered run continues straight into the afternoon — the
                  1:00 Architecture Sync IS Phase 4's first calendar block. */}
              {final.delivered && (
                <Link
                  to="/play/performance-review"
                  style={{
                    flex: 1.4,
                    padding: '10px 14px',
                    borderRadius: 7,
                    border: '1px solid rgba(217,211,196,0.3)',
                    background: tier.color,
                    color: '#15171a',
                    fontFamily: SANS,
                    fontSize: 13,
                    fontWeight: 600,
                    letterSpacing: '0.04em',
                    textDecoration: 'none',
                    textAlign: 'center',
                    whiteSpace: 'nowrap',
                  }}
                >
                  1:00 PM — Architecture Sync →
                </Link>
              )}
              <button
                onClick={() => resetRun()}
                style={{
                  flex: 1,
                  padding: '10px 14px',
                  borderRadius: 7,
                  border: '1px solid rgba(217,211,196,0.3)',
                  background: final.delivered ? 'rgba(255,255,255,0.04)' : tier.color,
                  color: final.delivered ? '#d9d3c4' : '#15171a',
                  fontFamily: SANS,
                  fontSize: 13,
                  fontWeight: 600,
                  letterSpacing: '0.04em',
                  cursor: 'pointer',
                }}
              >
                ↻ Drive again
              </button>
              <Link
                to="/play"
                style={{
                  padding: '10px 16px',
                  borderRadius: 7,
                  border: '1px solid rgba(217,211,196,0.3)',
                  background: 'rgba(255,255,255,0.04)',
                  color: '#d9d3c4',
                  fontFamily: SANS,
                  fontSize: 12.5,
                  fontWeight: 600,
                  textDecoration: 'none',
                  letterSpacing: '0.04em',
                  whiteSpace: 'nowrap',
                }}
              >
                ← Back to levels
              </Link>
            </div>
          </div>
        </div>

        {/* ─── middle: Jira-board-themed achievements (earned = golden) ─── */}
        <div
          style={{
            width: 260,
            maxHeight: '94vh',
            display: 'flex',
            flexDirection: 'column',
            background: '#16181c',
            border: '1px solid rgba(217,211,196,0.18)',
            borderRadius: 10,
            boxShadow: '0 24px 80px rgba(0,0,0,0.6)',
            overflow: 'hidden',
          }}
        >
          <div style={{ padding: '8px 14px', fontSize: 10.5, letterSpacing: '0.08em', borderBottom: '1px solid rgba(255,255,255,0.07)', background: '#1b1e23', display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ opacity: 0.5 }}>ACHIEVEMENTS</span>
            <span style={{ color: tier.color, opacity: 0.9 }}>{earnedIds.size} / {LUNCH_ACHIEVEMENTS_CATALOG.length}</span>
          </div>
          <div style={{ padding: 10, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 7 }}>
            {LUNCH_ACHIEVEMENTS_CATALOG.map((a) => {
              const got = earnedIds.has(a.id)
              return (
                <div
                  key={a.id}
                  style={{
                    borderRadius: 7,
                    padding: '7px 9px',
                    border: `1px solid ${got ? '#f5cd47' : 'rgba(217,211,196,0.12)'}`,
                    background: got ? '#fff7d6' : 'rgba(255,255,255,0.02)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                    <span style={{ fontSize: 15, lineHeight: 1, filter: got ? 'none' : 'grayscale(1)', opacity: got ? 1 : 0.4 }}>{a.emoji}</span>
                    <span style={{ fontSize: 12, fontWeight: 700, color: got ? '#172b4d' : '#8a8f96', fontFamily: SANS }}>{got ? a.title : 'Locked'}</span>
                  </div>
                  {got && <div style={{ fontSize: 10.5, marginTop: 3, lineHeight: 1.35, color: '#42526e', fontFamily: SANS }}>{a.desc}</div>}
                </div>
              )
            })}
          </div>
        </div>

        {/* ─── right: the Exec's follow-up, as an iPhone with Slack open ─── */}
        {final.delivered && <ExecPhone />}
      </div>
    </div>
  )
}

// An iPhone showing Slack open to the DM with the Exec — the day's closing beat.
// Same thread as the other phases' Exec segue: a thank-you + one more "quick
// sync" dropped on your calendar, with the 4:30 Executive Review teased.
function ExecPhone() {
  return (
    <div
      style={{
        width: 250,
        maxHeight: '94vh',
        alignSelf: 'center',
        borderRadius: 44,
        background: '#0a0a0c',
        padding: 9,
        boxShadow: '0 24px 60px rgba(0,0,0,0.6), inset 0 0 0 2px #2b2b30',
        flexShrink: 0,
      }}
    >
      <div
        style={{
          position: 'relative',
          width: '100%',
          height: 512,
          borderRadius: 36,
          overflow: 'hidden',
          background: '#ffffff',
          fontFamily: SANS,
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* dynamic island */}
        <div style={{ position: 'absolute', top: 9, left: '50%', transform: 'translateX(-50%)', width: 78, height: 21, background: '#000', borderRadius: 12, zIndex: 5 }} />

        {/* status bar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 20px 3px', fontSize: 12, fontWeight: 600, color: '#000' }}>
          <span>12:01</span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            {/* signal bars */}
            <span style={{ display: 'flex', alignItems: 'flex-end', gap: 1.5, height: 10 }}>
              {[4, 6, 8, 10].map((hbar) => (
                <span key={hbar} style={{ width: 3, height: hbar, background: '#000', borderRadius: 1 }} />
              ))}
            </span>
            {/* battery */}
            <span style={{ width: 22, height: 11, border: '1.4px solid #000', borderRadius: 3, position: 'relative', display: 'inline-block' }}>
              <span style={{ position: 'absolute', inset: 1.4, right: 5, background: '#000', borderRadius: 1 }} />
              <span style={{ position: 'absolute', right: -3, top: 3.2, width: 2, height: 4, background: '#000', borderRadius: 1 }} />
            </span>
          </span>
        </div>

        {/* Slack conversation header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 12px 8px', borderBottom: '1px solid #e9e9e9' }}>
          <span style={{ color: '#1264a3', fontSize: 22, lineHeight: 1, marginTop: -2 }}>‹</span>
          <div style={{ width: 30, height: 30, borderRadius: 8, background: '#b08a3a', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 15 }}>E</div>
          <div style={{ lineHeight: 1.15 }}>
            <div style={{ fontWeight: 700, fontSize: 15, color: '#1d1c1d', display: 'flex', alignItems: 'center', gap: 5 }}>
              Exec <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#2eb67d', display: 'inline-block' }} />
            </div>
            <div style={{ fontSize: 11, color: '#616061' }}>Alignly</div>
          </div>
        </div>

        {/* chat body */}
        <div style={{ flex: 1, padding: '10px 12px 0', display: 'flex', flexDirection: 'column', gap: 4, overflow: 'hidden' }}>
          <div style={{ textAlign: 'center', fontSize: 10.5, color: '#9a9a9a', fontWeight: 600, margin: '2px 0 8px' }}>Today</div>
          <div style={{ display: 'flex', gap: 8 }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: '#b08a3a', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 15, flexShrink: 0 }}>E</div>
            <div style={{ minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                <span style={{ fontWeight: 700, fontSize: 13.5, color: '#1d1c1d' }}>Exec</span>
                <span style={{ fontSize: 10.5, color: '#8d8d8d' }}>12:01 PM</span>
              </div>
              <div style={{ fontSize: 13.5, lineHeight: 1.42, color: '#1d1c1d', marginTop: 2 }}>
                food received, thank you 🙂 last thing today — let's do a quick sync on the status of the portal refresh. popped an hour on your calendar later today.
              </div>
              {/* calendar event unfurl — the 4:30 tease */}
              <div style={{ marginTop: 8, border: '1px solid #e2e2e2', borderLeft: '3px solid #616061', borderRadius: 6, padding: '7px 9px', background: '#fafafa' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 700, color: '#1d1c1d' }}>
                  <span>📅</span> Executive Review
                </div>
                <div style={{ fontSize: 11, color: '#616061', marginTop: 2 }}>Today · 4:30 – 5:30 PM · accepted on your behalf</div>
              </div>
            </div>
          </div>
        </div>

        {/* Slack message input (inert) + home indicator */}
        <div style={{ padding: '7px 12px 4px', borderTop: '1px solid #ececec' }}>
          <div style={{ border: '1px solid #d9d9d9', borderRadius: 20, padding: '7px 12px', fontSize: 12.5, color: '#9a9a9a' }}>
            Message Exec
          </div>
        </div>
        <div style={{ padding: '5px 0 8px', display: 'flex', justifyContent: 'center' }}>
          <div style={{ width: 108, height: 4, borderRadius: 2, background: '#111' }} />
        </div>
      </div>
    </div>
  )
}
