// The Phase 3 retrospective — a fake Jira ticket (LUNCH-471) that resolves the
// run. Same deadpan format as the Phase 2 Jira-board retro: status, resolution
// tier, subtask checklist, the stats the player didn't know were tracked, and
// the franchise punchline — Actual Business Value Generated: $0.00. Shows the
// instant the run ends (delivered, or a 12:30 no-show).

import { Link } from 'react-router-dom'
import { useLunchStore, type RunFinal } from './lunchStore'
import { resetRun } from './runReset'

const MONO = '"IBM Plex Mono", "SF Mono", ui-monospace, Menlo, monospace'

const TIER = {
  composed: { label: 'Composed', color: '#5cbb7a' },
  functional: { label: 'Functional', color: '#d9b24a' },
  disheveled: { label: 'Disheveled', color: '#d76a5a' },
} as const

function headline(f: RunFinal): { title: string; line: string } {
  if (!f.delivered) return { title: 'You missed the Architecture Sync.', line: 'The meeting started without you. Diane (HR) is already typing.' }
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
  if (!done || !final) return null

  const tier = TIER[final.returnTier]
  const h = headline(final)
  const row = (k: string, v: string, vColor?: string) => (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
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
        fontFamily: MONO,
        color: '#d9d3c4',
        pointerEvents: 'auto',
        padding: 16,
      }}
    >
      <div
        style={{
          width: 'min(560px, 94vw)',
          maxHeight: '92vh',
          overflowY: 'auto',
          background: '#16181c',
          border: '1px solid rgba(217,211,196,0.18)',
          borderRadius: 10,
          boxShadow: '0 24px 80px rgba(0,0,0,0.6)',
        }}
      >
        {/* breadcrumb header */}
        <div style={{ padding: '9px 16px', fontSize: 10.5, letterSpacing: '0.04em', opacity: 0.5, borderBottom: '1px solid rgba(255,255,255,0.07)', background: '#1b1e23' }}>
          Projects › Personal › Lunch Dash › Retrospective
        </div>

        <div style={{ padding: '16px 20px' }}>
          {/* ticket id + title */}
          <div style={{ fontSize: 11, letterSpacing: '0.14em', color: tier.color, opacity: 0.95 }}>
            LUNCH-471 · {final.delivered ? '✓ DONE' : '✗ FAILED'}
          </div>
          <div style={{ fontSize: 19, marginTop: 3, marginBottom: 2 }}>Pre-Sync Nourishment Acquisition</div>

          {/* resolution headline */}
          <div style={{ marginTop: 12, padding: '12px 14px', borderRadius: 8, background: 'rgba(255,255,255,0.03)', border: `1px solid ${tier.color}55` }}>
            <div style={{ fontSize: 10, letterSpacing: '0.18em', opacity: 0.55 }}>RESOLUTION</div>
            <div style={{ fontSize: 24, fontWeight: 600, color: tier.color, marginTop: 1 }}>{tier.label}</div>
            <div style={{ fontSize: 13, marginTop: 6, opacity: 0.92 }}>{h.title}</div>
            <div style={{ fontSize: 12, marginTop: 4, opacity: 0.62, fontStyle: 'italic' }}>{h.line}</div>
          </div>

          {/* subtasks */}
          <div style={{ marginTop: 16, fontSize: 10, letterSpacing: '0.16em', opacity: 0.5 }}>SUBTASKS</div>
          <div style={{ marginTop: 6, fontSize: 13 }}>
            {SUBTASKS.map((s, i) => {
              const ok = i < final.stopsCompleted
              return (
                <div key={i} style={{ display: 'flex', gap: 9, padding: '3px 0', opacity: ok ? 1 : 0.5 }}>
                  <span style={{ color: ok ? tier.color : '#777' }}>{ok ? '✓' : '☐'}</span>
                  <span style={{ opacity: 0.5 }}>LUNCH-471.{i + 1}</span>
                  <span style={{ textDecoration: ok ? 'none' : 'none' }}>{s}</span>
                </div>
              )
            })}
          </div>

          {/* comments / stats */}
          <div style={{ marginTop: 16, fontSize: 10, letterSpacing: '0.16em', opacity: 0.5 }}>COMMENTS</div>
          <div style={{ marginTop: 4, fontSize: 12.5 }}>
            {row('Time used', `${final.minutesUsed} of 60 min`, final.wasLate ? '#d76a5a' : undefined)}
            {final.wasLate && row('', `— late by ${final.latenessMin} min`, '#d76a5a')}
            {row('Pedestrians injured', String(final.pedestrianHits), final.pedestrianHits ? '#d99a5a' : undefined)}
            {row('Vehicle damage', final.damage[0].toUpperCase() + final.damage.slice(1))}
            {row('Bowl status at delivery', final.delivered ? `${TIER[final.bowlState].label} (${final.bowlIntegrity}%)` : 'Undelivered', TIER[final.bowlState].color)}
            {row('Vehicle', 'Personal')}
          </div>

          {/* the punchline */}
          <div style={{ marginTop: 16, paddingTop: 12, borderTop: '1px dashed rgba(255,255,255,0.14)', display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
            <span style={{ opacity: 0.7 }}>Actual Business Value Generated</span>
            <span style={{ fontWeight: 600 }}>$0.00</span>
          </div>

          {/* actions */}
          <div style={{ marginTop: 18, display: 'flex', gap: 10, alignItems: 'center' }}>
            <button
              onClick={() => resetRun()}
              style={{
                flex: 1,
                padding: '10px 14px',
                borderRadius: 7,
                border: '1px solid rgba(217,211,196,0.3)',
                background: tier.color,
                color: '#15171a',
                fontFamily: MONO,
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
                padding: '10px 14px',
                borderRadius: 7,
                border: '1px solid rgba(217,211,196,0.22)',
                color: '#d9d3c4',
                fontFamily: MONO,
                fontSize: 12,
                textDecoration: 'none',
                letterSpacing: '0.04em',
              }}
            >
              ✕ Exit
            </Link>
          </div>
          <div style={{ marginTop: 12, textAlign: 'center', fontSize: 11, letterSpacing: '0.14em', opacity: 0.4 }}>
            [ Phase 4 · Executive Review · coming soon ]
          </div>
        </div>
      </div>
    </div>
  )
}
