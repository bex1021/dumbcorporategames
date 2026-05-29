// CareerStats — landing-page section showing the player's lifetime
// achievement progress for Pre-Standup Alignment.
//
// Reads the persisted set from localStorage (via loadUnlocked, the same
// helper the game uses for its retrospective screen). Renders all 12
// achievements in a 4-col grid styled to match the brutalist BR system.
//
// Locked achievements show the emoji + a "—" placeholder + a "CLASSIFIED"
// description so the section also serves as a teaser for first-time
// visitors without spoiling how to unlock each one. As the player wins
// more, more fill in.
//
// Lives on Landing.tsx between Portfolio and WhatsNext. Self-contained —
// no props, no external state.

import { useEffect, useState } from 'react'
import { BR, brFont, brMono, useIsMobile } from '../brutalist'
import { ACHIEVEMENTS, loadUnlocked } from '../content/achievements'

export function CareerStats() {
  const isMobile = useIsMobile()
  const cols = isMobile ? 2 : 4
  // Hydrate from localStorage on mount. Initial paint is an empty set so
  // the section renders consistently even before localStorage is read
  // (no SSR / hydration mismatch hazard, but cheap insurance).
  const [unlocked, setUnlocked] = useState<Set<string>>(new Set())
  useEffect(() => {
    setUnlocked(loadUnlocked())
  }, [])

  const total = ACHIEVEMENTS.length
  const count = unlocked.size
  const pct = total > 0 ? Math.round((count / total) * 100) : 0
  const isMaxed = count === total
  const isEmpty = count === 0

  return (
    <section
      id="career"
      style={{
        background: BR.paper,
        borderBottom: `4px solid ${BR.ink}`,
      }}
    >
      {/* Section header — same shape as <SectionStarter> in brutalist.tsx,
          inlined here so we don't fight that helper's prop signature for
          our two-line meta. */}
      <div
        style={{
          borderTop: `4px solid ${BR.ink}`,
          borderBottom: `1px solid ${BR.ink}`,
          padding: isMobile ? '24px 20px 18px' : '32px 32px 24px',
          display: 'grid',
          gridTemplateColumns: isMobile ? '1fr' : '1fr auto',
          gap: isMobile ? 14 : 32,
          alignItems: 'end',
        }}
      >
        <div>
          <div
            style={{
              fontFamily: brMono,
              fontSize: 11,
              color: BR.muted,
              textTransform: 'uppercase',
              letterSpacing: '0.16em',
              marginBottom: 10,
            }}
          >
            <span style={{ color: BR.accent, marginRight: 8 }}>●</span>
            CONFIDENTIAL · YEAR-TO-DATE · DO NOT FORWARD
          </div>
          <h2
            style={{
              margin: 0,
              fontFamily: brFont,
              fontWeight: 900,
              fontSize: 'clamp(38px, 9vw, 72px)',
              lineHeight: 0.95,
              letterSpacing: '-0.03em',
              textTransform: 'uppercase',
            }}
          >
            YOUR HR FILE.
          </h2>
        </div>
        <div
          style={{
            fontFamily: brMono,
            fontSize: 11,
            color: BR.muted,
            textTransform: 'uppercase',
            letterSpacing: '0.1em',
            textAlign: isMobile ? 'left' : 'right',
            maxWidth: isMobile ? 'none' : 320,
            lineHeight: 1.55,
          }}
        >
          ACHIEVEMENTS COLLECTED IN PRE-STANDUP ALIGNMENT.
          <br />
          PERSISTS PER BROWSER · CLEAR CACHE TO START OVER.
        </div>
      </div>

      {/* Black header strip — big count + progress bar + verdict chip. */}
      <div
        style={{
          padding: isMobile ? '20px' : '22px 32px',
          background: BR.ink,
          color: BR.bg,
          display: 'grid',
          gridTemplateColumns: isMobile ? '1fr' : 'auto 1fr auto',
          gap: isMobile ? 16 : 28,
          alignItems: 'center',
          borderBottom: `1px solid ${BR.ink}`,
        }}
      >
        <div
          style={{
            fontFamily: brFont,
            fontWeight: 900,
            fontSize: 56,
            letterSpacing: '-0.02em',
            lineHeight: 1,
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          {count}
          <span style={{ color: BR.dim }}> / {total}</span>
        </div>
        <div>
          <div
            style={{
              fontFamily: brMono,
              fontSize: 11,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              color: '#aaa',
              marginBottom: 8,
            }}
          >
            PROMOTION PACKET COMPLETION
          </div>
          {/* Progress bar. Width animates when the value changes (it won't
              on this page, but the transition makes the initial hydration
              feel intentional rather than a snap). */}
          <div
            style={{
              height: 14,
              background: '#2a2a2a',
              position: 'relative',
              border: `1px solid ${BR.bg}`,
            }}
          >
            <div
              style={{
                position: 'absolute',
                inset: 0,
                width: `${pct}%`,
                background: isMaxed ? BR.green : BR.accent,
                transition: 'width 0.6s ease-out',
              }}
            />
          </div>
        </div>
        <div
          style={{
            fontFamily: brMono,
            fontSize: 11,
            letterSpacing: '0.16em',
            textTransform: 'uppercase',
            color: isMaxed ? BR.green : '#bbb',
            textAlign: 'right',
            lineHeight: 1.55,
          }}
        >
          {isEmpty
            ? 'NO RECORD ON FILE'
            : isMaxed
              ? '● PROMOTION RECOMMENDED'
              : `${pct}% COMPLETE`}
          {isEmpty && (
            <div style={{ marginTop: 4, color: '#888' }}>
              START YOUR FIRST SPRINT →
            </div>
          )}
        </div>
      </div>

      {/* 4-col grid of all 12 achievement cards. Locked cards show emoji
          + dashes + a "CLASSIFIED" tagline so the section doubles as a
          teaser for new visitors without spoiling unlock conditions. */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${cols}, 1fr)`,
          gap: 0,
        }}
      >
        {ACHIEVEMENTS.map((a, i) => {
          const isUnlocked = unlocked.has(a.id)
          const isLastCol = (i + 1) % cols === 0
          return (
            <div
              key={a.id}
              style={{
                padding: '18px 22px',
                borderRight: isLastCol ? 'none' : `1px solid ${BR.ink}`,
                borderBottom: `1px solid ${BR.ink}`,
                background: isUnlocked ? BR.paper : '#ececea',
                opacity: isUnlocked ? 1 : 0.7,
                display: 'flex',
                flexDirection: 'column',
                gap: 8,
                minHeight: 132,
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                }}
              >
                <span
                  style={{
                    fontSize: 22,
                    filter: isUnlocked ? 'none' : 'grayscale(1)',
                    opacity: isUnlocked ? 1 : 0.4,
                  }}
                >
                  {a.emoji}
                </span>
                <span
                  style={{
                    fontFamily: brFont,
                    fontSize: 14,
                    fontWeight: 900,
                    textTransform: 'uppercase',
                    letterSpacing: '-0.005em',
                    color: isUnlocked ? BR.ink : BR.dim,
                  }}
                >
                  {isUnlocked ? a.title : '— — —'}
                </span>
              </div>
              <div
                style={{
                  fontFamily: brMono,
                  fontSize: 11,
                  lineHeight: 1.5,
                  color: isUnlocked ? BR.muted : '#999',
                  textTransform: isUnlocked ? 'none' : 'uppercase',
                  letterSpacing: isUnlocked ? '0' : '0.08em',
                }}
              >
                {isUnlocked ? a.description : 'CLASSIFIED · UNLOCK TO REVEAL'}
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}
