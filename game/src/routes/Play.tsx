// src/routes/Play.tsx — the campaign hub / level select (/play)
//
// Framed as a corporate "onboarding path": a linear ladder of phases the
// player works through. Each phase unlocks only when the previous one is
// beaten (a winning ending) — gating read from state/progress.ts, which the
// two games write to on a win. Cleared phases can be replayed freely.
//
// Reached from the studio site's primary PLAY button and from each game's
// win/lose screen ("← Level select").

import { Link } from 'react-router-dom'
import { PageScroll, Nav, Footer, BR, brFont, brMono, useIsMobile, type NavLink } from '../brutalist'
import {
  CAMPAIGN,
  loadBeaten,
  isUnlocked,
  phaseLabel,
  type CampaignPhase,
  type PhaseId,
} from '../state/progress'

const NAV_LINKS: NavLink[] = [
  { label: 'STUDIO', href: '/' },
  { label: 'BLOCKED', href: '/blocked' },
  { label: 'CONTACT', href: 'mailto:hello@dumbcorporategames.com' },
]

export default function Play() {
  // Client-only SPA — no SSR — so reading localStorage at first render is
  // safe and avoids a locked→unlocked flash. Fresh read on every mount means
  // arriving here right after a win shows the newly-unlocked phase.
  const beaten = loadBeaten()
  const clearedCount = CAMPAIGN.filter((p) => beaten.has(p.id)).length
  const isMobile = useIsMobile()

  return (
    <PageScroll>
      <Nav links={NAV_LINKS} badge={<>● {clearedCount}/{CAMPAIGN.length} PHASES CLEARED</>} />

      {/* Header */}
      <section style={{ borderBottom: `4px solid ${BR.ink}` }}>
        <div
          style={{
            padding: isMobile ? '24px 20px 18px' : '34px 32px 26px',
            display: 'grid',
            gridTemplateColumns: isMobile ? '1fr' : '1fr auto',
            gap: isMobile ? 14 : 32,
            alignItems: 'end',
          }}
        >
          <div>
            <div
              style={{
                fontFamily: brMono, fontSize: 11, color: BR.muted,
                textTransform: 'uppercase', letterSpacing: '0.16em', marginBottom: 10,
              }}
            >
              <span style={{ color: BR.accent, marginRight: 8 }}>●</span>
              CAMPAIGN · ONBOARDING PATH · COMPLETE IN ORDER
            </div>
            <h1
              style={{
                margin: 0, fontFamily: brFont, fontWeight: 900,
                fontSize: 'clamp(44px, 7vw, 96px)',
                lineHeight: 0.9, letterSpacing: '-0.04em', textTransform: 'uppercase',
              }}
            >
              SELECT YOUR PHASE<span style={{ color: BR.accent }}>.</span>
            </h1>
          </div>
          <div
            style={{
              fontFamily: brMono, fontSize: 11, color: BR.muted,
              textTransform: 'uppercase', letterSpacing: '0.1em', textAlign: isMobile ? 'left' : 'right',
              maxWidth: 320, lineHeight: 1.6,
            }}
          >
            EACH PHASE IS ROUGHLY ONE MEETING LONG. CLEAR ONE TO UNLOCK THE NEXT. CLEARED PHASES CAN BE REPLAYED ANY TIME.
          </div>
        </div>
      </section>

      {/* Phase ladder */}
      <section>
        {CAMPAIGN.map((p) => (
          <PhaseRow key={p.id} phase={p} beaten={beaten} isMobile={isMobile} />
        ))}
      </section>

      {/* Footer note */}
      <div
        style={{
          borderTop: `1px solid ${BR.ink}`,
          padding: '18px 28px', background: BR.paper,
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          gap: 24, flexWrap: 'wrap',
          fontFamily: brMono, fontSize: 11, color: BR.muted,
          textTransform: 'uppercase', letterSpacing: '0.1em',
        }}
      >
        <span>PROGRESS SAVES TO THIS BROWSER · NO ACCOUNT · CLEARING COOKIES RESETS THE LADDER</span>
        <Link
          to="/"
          style={{
            color: BR.ink, fontWeight: 700, textDecoration: 'none',
            borderBottom: `2px solid ${BR.accent}`,
          }}
        >
          ← BACK TO STUDIO
        </Link>
      </div>

      <Footer />
    </PageScroll>
  )
}

// ─── A single rung on the ladder ────────────────────────────────────────────
function PhaseRow({
  phase, beaten, isMobile,
}: {
  phase: CampaignPhase
  beaten: Set<PhaseId>
  isMobile: boolean
}) {
  const unlocked = isUnlocked(phase, beaten)
  const built = phase.route !== null
  const cleared = beaten.has(phase.id)
  const playable = unlocked && built

  // Keep what's coming a surprise. Reveal a phase's real name, tagline,
  // blurb and stats only once the player has CLEARED it — or for the
  // always-open entry phase (the known front door, requires === null).
  // Everything else shows a "classified" placeholder even after it unlocks,
  // so the actual reveal happens when you step into the level.
  const reveal = cleared || phase.requires === null
  const displayTitle = reveal ? phase.title : '???'
  const displaySub = reveal ? phase.sub : 'NEED-TO-KNOW BASIS'
  const displayBlurb = reveal
    ? phase.blurb
    : "The studio does not pre-announce roadmap items. Clear the current phase to find out what's next."
  const displayTags = reveal
    ? [phase.minutes, phase.controls, 'BROWSER', 'FREE']
    : ['BROWSER', 'FREE']

  // Four visual tones. The "current" tone (unlocked, built, not yet cleared)
  // is the orange-highlighted one drawing the eye to what to play next.
  const tone: 'cleared' | 'current' | 'locked' | 'soon' = cleared
    ? 'cleared'
    : !unlocked
      ? 'locked'
      : !built
        ? 'soon'
        : 'current'

  const C = {
    cleared: { bg: BR.bg, fg: BR.ink, num: BR.green, badgeBg: BR.green, badgeFg: '#fff', badge: '✓ CLEARED' },
    current: { bg: BR.ink, fg: BR.bg, num: BR.accent, badgeBg: BR.accent, badgeFg: '#000', badge: '● UNLOCKED' },
    locked:  { bg: '#eeece7', fg: BR.dim, num: '#cdc7b8', badgeBg: '#dcd9d0', badgeFg: BR.muted, badge: '🔒 LOCKED' },
    soon:    { bg: '#eeece7', fg: BR.dim, num: '#cdc7b8', badgeBg: '#dcd9d0', badgeFg: BR.muted, badge: '● IN DEVELOPMENT' },
  }[tone]

  return (
    <div
      style={{
        borderBottom: `1px solid ${BR.ink}`,
        background: C.bg, color: C.fg,
        display: 'grid',
        gridTemplateColumns: isMobile ? '1fr' : 'auto 1fr auto',
        gap: isMobile ? 12 : 28,
        alignItems: 'center',
        padding: isMobile ? '22px 20px' : '26px 32px',
      }}
    >
      {/* Big phase number */}
      <div
        style={{
          fontFamily: brFont, fontWeight: 900,
          fontSize: isMobile ? 56 : 86, lineHeight: 0.8,
          letterSpacing: '-0.06em', color: C.num,
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        {String(phase.n).padStart(2, '0')}
      </div>

      {/* Middle: label, title, blurb, tags */}
      <div style={{ minWidth: 0 }}>
        <div
          style={{
            display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap',
            fontFamily: brMono, fontSize: 11, fontWeight: 700,
            textTransform: 'uppercase', letterSpacing: '0.14em',
            color: tone === 'current' ? BR.accent : tone === 'cleared' ? BR.green : BR.muted,
          }}
        >
          <span>{phase.label}</span>
          <StatusBadge bg={C.badgeBg} fg={C.badgeFg}>{C.badge}</StatusBadge>
        </div>
        <h2
          style={{
            margin: '8px 0 0', fontFamily: brFont, fontWeight: 900,
            fontSize: isMobile ? 30 : 'clamp(30px, 3.4vw, 46px)',
            lineHeight: 0.95, letterSpacing: '-0.03em', textTransform: 'uppercase',
            color: tone === 'locked' || tone === 'soon' ? BR.dim : C.fg,
          }}
        >
          {displayTitle}
        </h2>
        <div
          style={{
            marginTop: 6, fontFamily: brFont, fontWeight: 700, fontSize: 14,
            letterSpacing: '0.04em', textTransform: 'uppercase',
            color: tone === 'current' ? '#bbb' : BR.muted,
          }}
        >
          {displaySub}
        </div>
        <p
          style={{
            margin: '12px 0 0', maxWidth: 640,
            fontFamily: brFont, fontSize: 14, lineHeight: 1.55,
            color: tone === 'current' ? '#ddd' : tone === 'cleared' ? '#333' : BR.muted,
          }}
        >
          {displayBlurb}
        </p>
        <div style={{ marginTop: 12, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {displayTags.map((t) => (
            <span
              key={t}
              style={{
                fontFamily: brMono, fontSize: 10, fontWeight: 700,
                padding: '4px 8px', letterSpacing: '0.1em', textTransform: 'uppercase',
                border: `1px solid ${tone === 'current' ? BR.bg : BR.ink}`,
                color: tone === 'current' ? BR.bg : tone === 'locked' || tone === 'soon' ? BR.dim : BR.ink,
                opacity: tone === 'locked' || tone === 'soon' ? 0.7 : 1,
              }}
            >
              {t}
            </span>
          ))}
        </div>
      </div>

      {/* Right: action */}
      <div style={{ justifySelf: isMobile ? 'start' : 'end' }}>
        {playable ? (
          <Link
            to={phase.route!}
            style={{
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              minWidth: isMobile ? 0 : 168,
              background: cleared ? BR.ink : BR.accent,
              color: cleared ? BR.bg : '#000',
              border: 'none', padding: '18px 28px',
              fontFamily: brFont, fontWeight: 900, fontSize: 16,
              textTransform: 'uppercase', letterSpacing: '0.04em',
              textDecoration: 'none', cursor: 'pointer',
            }}
          >
            {cleared ? '↻ REPLAY' : reveal ? '▶ PLAY' : '▶ PROCEED'}
          </Link>
        ) : (
          <div
            style={{
              display: 'inline-flex', flexDirection: 'column', alignItems: isMobile ? 'flex-start' : 'flex-end',
              gap: 4, color: BR.muted,
              fontFamily: brMono, fontSize: 11, fontWeight: 700,
              textTransform: 'uppercase', letterSpacing: '0.12em',
            }}
          >
            <span style={{ fontSize: 22 }}>{tone === 'locked' ? '🔒' : '🛠'}</span>
            <span style={{ maxWidth: 168, textAlign: isMobile ? 'left' : 'right', lineHeight: 1.4 }}>
              {tone === 'locked' && phase.requires
                ? `BEAT ${phaseLabel(phase.requires)} TO UNLOCK`
                : 'COMING SOON'}
            </span>
          </div>
        )}
      </div>
    </div>
  )
}

function StatusBadge({ bg, fg, children }: { bg: string; fg: string; children: React.ReactNode }) {
  return (
    <span
      style={{
        display: 'inline-flex', alignItems: 'center',
        background: bg, color: fg,
        fontFamily: brMono, fontSize: 10, fontWeight: 700,
        padding: '4px 9px', letterSpacing: '0.1em', textTransform: 'uppercase',
      }}
    >
      {children}
    </span>
  )
}
