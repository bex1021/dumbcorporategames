// src/routes/Landing.tsx — main studio landing (/)
//
// The brutalist studio site for Dumb Corporate Games. The Blocked page
// (routes/Blocked.tsx) is the deep-dive product page; this is the top-level
// site visitors land on, focused on:
//   · who the studio is
//   · what games the studio makes (portfolio of titles)
//   · the mission
//   · contact / signup

import { Link } from 'react-router-dom'
import {
  PageScroll, BR, brFont, brMono,
  Nav, Ticker, Mission, AboutRebecca, Signup, Closer, Footer,
  ctaPrimary, ctaSecondary,
  type NavLink,
} from '../brutalist'

export default function Landing() {
  return (
    <PageScroll>
      <Nav
        links={NAV_LINKS}
        badge={<>● 1 GAME · NOW LIVE</>}
      />
      <Hero />
      <Ticker
        accent
        items={[
          '1 GAME LIVE',
          '2 IN THE PARKING LOT',
          'PLAY IN YOUR BROWSER',
          'NO INSTALL · NO ACCOUNT',
          'ALL TITLES FREE',
          'BUILT BY ONE PERSON',
          'STATUS · GREEN',
          'NEW TITLE WHEN PHASE 2 SHIPS',
        ]}
      />
      <Portfolio />
      <Ticker
        items={[
          'DO WHATEVER IT TAKES',
          'PER MY LAST EMAIL',
          'CIRCLING BACK',
          'LET\u2019S TAKE THIS OFFLINE',
          'I HEAR YOU',
          'CIRCLING BACK',
          'PINGING THE THREAD',
          'JUST FLAGGING THIS',
        ]}
        dir="right"
        speed={50}
      />
      <Mission />
      <AboutRebecca />
      <Closer />
      <Signup />
      <Footer />
    </PageScroll>
  )
}

const NAV_LINKS: NavLink[] = [
  { label: 'GAMES',   href: '#games' },
  { label: 'MISSION', href: '#mission' },
  { label: 'ABOUT',   href: '#about' },
  { label: 'PRESS',   href: '#press' },
  { label: 'CONTACT', href: 'mailto:hello@dumbcorporategames.com' },
]

// ─── Hero ─────────────────────────────────────────────────────────────────
function Hero() {
  return (
    <section style={{ borderBottom: `4px solid ${BR.ink}` }}>
      <div style={{
        padding: '16px 28px',
        borderBottom: `1px solid ${BR.ink}`,
        display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16,
        flexWrap: 'wrap',
        fontFamily: brMono, fontSize: 11,
        textTransform: 'uppercase', letterSpacing: '0.14em', color: BR.muted,
      }}>
        <span><b style={{ color: BR.ink }}>STUDIO INDEX</b> · Q2 · ONE GAME · MORE PENDING</span>
        <span>HQ · <b style={{ color: BR.ink }}>WHEREVER · ANYWHERE WITH WIFI</b></span>
        <span>STATUS · <b style={{ color: BR.green }}>● OPERATING</b></span>
      </div>

      {/* Mega headline */}
      <div style={{ padding: '36px 28px 8px' }}>
        <h1 style={{
          margin: 0, fontFamily: brFont, fontWeight: 900,
          fontSize: 'clamp(64px, 16vw, 232px)',
          lineHeight: 0.84, letterSpacing: '-0.055em',
          textTransform: 'uppercase',
        }}>
          DUMB<br />
          CORPORATE<br />
          GAMES<span style={{ color: BR.accent }}>.</span>
        </h1>
      </div>

      {/* Tagline + studio facts */}
      <div style={{
        padding: '12px 28px 32px',
        display: 'grid', gridTemplateColumns: 'minmax(0, 1.6fr) minmax(280px, 1fr)',
        gap: 36, alignItems: 'flex-end',
      }}>
        <p style={{
          margin: 0,
          fontFamily: brFont, fontSize: 'clamp(18px, 1.9vw, 28px)',
          lineHeight: 1.25, fontWeight: 500,
          maxWidth: 820, color: BR.ink,
        }}>
          A SATIRICAL STUDIO OF ONE, MAKING SHORT BROWSER GAMES ABOUT YOUR JOB.
          EACH RUNS APPROXIMATELY THE LENGTH OF A STATUS MEETING AND IS, PER
          INTERNAL BENCHMARKS WE WILL NOT BE DISCLOSING,{' '}
          <u style={{ background: BR.accent, padding: '0 2px' }}>TWICE AS PRODUCTIVE</u>.
        </p>

        <div style={{
          borderTop: `2px solid ${BR.ink}`,
          borderBottom: `2px solid ${BR.ink}`,
          padding: '10px 0',
          fontFamily: brMono, fontSize: 11, lineHeight: 1.7, color: BR.ink,
          textTransform: 'uppercase', letterSpacing: '0.06em',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: BR.muted }}>GAMES SHIPPED</span><b>1</b></div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: BR.muted }}>HEADCOUNT</span><b>1</b></div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: BR.muted }}>FUNDING</span><b>FEELINGS</b></div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: BR.muted }}>STATUS</span><b style={{ color: BR.green }}>● GREEN</b></div>
        </div>
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', borderTop: `4px solid ${BR.ink}`, flexWrap: 'wrap' }}>
        <a href="#games" style={ctaPrimary}>▼ SEE OUR GAMES</a>
        <a href="#mission" style={ctaSecondary}>READ THE MISSION</a>
        <a href="mailto:hello@dumbcorporategames.com" style={ctaSecondary}>HELLO@DUMBCORPORATEGAMES.COM</a>
        <div style={{
          marginLeft: 'auto', alignSelf: 'center', padding: '0 20px',
          fontFamily: brMono, fontSize: 11,
          textTransform: 'uppercase', color: BR.muted, letterSpacing: '0.08em',
        }}>
          ALL GAMES FREE · BROWSER · NO INSTALL
        </div>
      </div>
    </section>
  )
}

// ─── Portfolio — the main event ───────────────────────────────────────────
type StatusKind = 'live' | 'wip' | 'idea'

type Game = {
  n: string
  title: string
  sub: string
  blurb: string
  tags: string[]
  status: string
  statusKind: StatusKind
  cta: { label: string; to?: string; href?: string }[]
}

const GAMES: Game[] = [
  {
    n: '01',
    title: 'BLOCKED',
    sub: 'PRE-STANDUP ALIGNMENT',
    blurb:
      'An earnest PM at the fictional company ALIGNLY has 75 minutes to extract alignment from five blocked coworkers before the 10:15 standup. The exec wants the Customer Happiness Portal Refresh GREEN by EOD. The coworkers all say "no blockers." They are lying.',
    tags: ['CORPORATE SATIRE', '5–10 MIN', 'WASD + E', 'BROWSER', 'FREE'],
    status: 'LIVE',
    statusKind: 'live',
    cta: [
      { label: '▶ PLAY NOW',  to: '/play/blocked' },
      { label: 'VIEW PAGE →', to: '/blocked' },
    ],
  },
  {
    n: '02',
    title: '[UNANNOUNCED]',
    sub: 'CODENAME · 4:30 EXECUTIVE REVIEW',
    blurb:
      'The next title from the studio. A standup is one meeting. The next one is the meeting after the standup. Details when we have them. Probably involves an executive, a deck, and a question that should have been an email.',
    tags: ['IN DEVELOPMENT', 'PHASE 2 OF 3', 'BROWSER', 'FREE'],
    status: 'IN DEVELOPMENT',
    statusKind: 'wip',
    cta: [{ label: 'STAY TUNED →', href: '#signup' }],
  },
  {
    n: '03',
    title: '[REDACTED]',
    sub: 'CODENAME · PARKING LOT',
    blurb:
      'A third title is in the parking lot. The parking lot is itself a dependency we are actively managing. The Registrant has considered this enough; we are not yet shipping.',
    tags: ['CONCEPT', 'NO ETA', 'VIBE ONLY'],
    status: 'PARKING LOT',
    statusKind: 'idea',
    cta: [],
  },
]

function StatusBadge({ kind, children }: { kind: StatusKind; children: React.ReactNode }) {
  const map = {
    live: { bg: BR.accent, fg: '#000' },
    wip:  { bg: BR.ink,    fg: BR.accent },
    idea: { bg: '#e6e3da', fg: BR.muted },
  } as const
  const c = map[kind]
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 8,
      background: c.bg, color: c.fg,
      fontFamily: brMono, fontSize: 11, fontWeight: 700,
      padding: '5px 10px', letterSpacing: '0.12em', textTransform: 'uppercase',
      border: kind === 'idea' ? `1px solid ${BR.ink}` : 'none',
    }}>● {children}</span>
  )
}

function GameCard({ g, i }: { g: Game; i: number }) {
  const live = g.statusKind === 'live'
  const wip = g.statusKind === 'wip'
  const idea = g.statusKind === 'idea'

  const bg = live ? BR.ink : wip ? BR.paper : '#eeece7'
  const fg = live ? BR.bg : BR.ink
  const numColor = live ? BR.accent : wip ? BR.ink : BR.dim
  const titleColor = idea ? BR.dim : fg

  return (
    <div style={{
      background: bg, color: fg,
      borderLeft: i ? `1px solid ${BR.ink}` : 'none',
      display: 'flex', flexDirection: 'column',
      position: 'relative',
      minHeight: 620,
    }}>
      <div style={{
        height: 12,
        background: live ? BR.accent : wip ? BR.ink : '#cdc7b8',
        borderBottom: `1px solid ${BR.ink}`,
      }} />

      <div style={{
        padding: '24px 26px 8px',
        display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
      }}>
        <div style={{
          fontFamily: brFont, fontWeight: 900, fontSize: 96, lineHeight: 0.8,
          letterSpacing: '-0.06em', color: numColor,
          fontVariantNumeric: 'tabular-nums',
        }}>{g.n}</div>
        <StatusBadge kind={g.statusKind}>{g.status}</StatusBadge>
      </div>

      <div style={{ padding: '4px 26px 0' }}>
        <div style={{
          fontFamily: brMono, fontSize: 10, color: live ? '#aaa' : BR.muted,
          textTransform: 'uppercase', letterSpacing: '0.14em', marginTop: 14,
        }}>TITLE {g.n}</div>
        <h3 style={{
          margin: '6px 0 0',
          fontFamily: brFont, fontWeight: 900,
          fontSize: idea ? 56 : 64,
          lineHeight: 0.92, letterSpacing: '-0.04em',
          textTransform: 'uppercase', color: titleColor,
        }}>
          {g.title}{live && <span style={{ color: BR.accent }}>:</span>}
        </h3>
        <div style={{
          marginTop: 6,
          fontFamily: brFont, fontWeight: 700, fontSize: 16,
          letterSpacing: '0.04em', textTransform: 'uppercase',
          color: idea ? BR.dim : (live ? '#ccc' : BR.muted),
        }}>{g.sub}</div>
      </div>

      <div style={{ padding: '18px 26px 12px' }}>
        <p style={{
          margin: 0,
          fontFamily: brFont, fontSize: 14, lineHeight: 1.55,
          color: idea ? BR.muted : (live ? '#ddd' : '#333'),
        }}>{g.blurb}</p>
      </div>

      <div style={{ padding: '4px 26px 18px', display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {g.tags.map((t) => (
          <span key={t} style={{
            fontFamily: brMono, fontSize: 10, fontWeight: 700,
            padding: '4px 8px', letterSpacing: '0.1em', textTransform: 'uppercase',
            border: `1px solid ${live ? BR.bg : BR.ink}`,
            color: live ? BR.bg : BR.ink,
          }}>{t}</span>
        ))}
      </div>

      <div style={{ marginTop: 'auto', display: 'flex' }}>
        {g.cta.length === 0 ? (
          <div style={{
            flex: 1, padding: '20px 22px',
            borderTop: `2px solid ${BR.ink}`,
            background: '#dcd9d0', color: BR.muted,
            fontFamily: brMono, fontSize: 11, fontWeight: 700,
            letterSpacing: '0.16em', textTransform: 'uppercase',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            <span>NO PUBLIC INFORMATION YET</span><span>·{g.n}</span>
          </div>
        ) : (
          g.cta.map((c, k) => {
            const style: React.CSSProperties = {
              flex: 1,
              background: k === 0 ? (live ? BR.accent : BR.ink) : (live ? BR.ink : BR.bg),
              color: k === 0 ? '#000' : (live ? BR.accent : BR.ink),
              border: 'none',
              borderTop: `2px solid ${BR.ink}`,
              borderLeft: k ? `1px solid ${BR.ink}` : 'none',
              padding: '20px 22px',
              fontFamily: brFont, fontWeight: 900, fontSize: 16,
              textTransform: 'uppercase', letterSpacing: '0.04em',
              cursor: 'pointer',
              textDecoration: 'none',
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            }
            if (c.to) {
              return <Link key={c.label} to={c.to} style={style}>{c.label}</Link>
            }
            return <a key={c.label} href={c.href || '#'} style={style}>{c.label}</a>
          })
        )}
      </div>
    </div>
  )
}

function Portfolio() {
  return (
    <section id="games" style={{ borderBottom: `4px solid ${BR.ink}` }}>
      <div style={{
        borderTop: `4px solid ${BR.ink}`,
        borderBottom: `1px solid ${BR.ink}`,
        background: BR.bg, padding: '32px 32px 24px',
        display: 'grid', gridTemplateColumns: '1fr auto', gap: 32, alignItems: 'end',
      }}>
        <div>
          <div style={{
            fontFamily: brMono, fontSize: 11, color: BR.muted,
            textTransform: 'uppercase', letterSpacing: '0.16em', marginBottom: 10,
          }}>
            <span style={{ color: BR.accent, marginRight: 8 }}>●</span>
            PORTFOLIO · 1 SHIPPED · 2 PENDING
          </div>
          <h2 style={{
            margin: 0, fontFamily: brFont, fontWeight: 900,
            fontSize: 'clamp(48px, 7vw, 96px)',
            lineHeight: 0.92, letterSpacing: '-0.035em', textTransform: 'uppercase',
          }}>
            OUR GAMES<span style={{ color: BR.accent }}>.</span>
          </h2>
        </div>
        <div style={{
          fontFamily: brMono, fontSize: 11, color: BR.muted,
          textTransform: 'uppercase', letterSpacing: '0.1em', textAlign: 'right',
          maxWidth: 320, lineHeight: 1.55,
        }}>
          ALL TITLES ARE FREE TO PLAY · IN THE BROWSER · ROUGHLY THE LENGTH OF A MEETING THAT COULD HAVE BEEN AN EMAIL
        </div>
      </div>

      {/* 3-up grid, hard-cut, no rounded corners ever */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))' }}>
        {GAMES.map((g, i) => <GameCard key={g.n} g={g} i={i} />)}
      </div>

      {/* Slot for a 4th game (parking-lot style call-to-suggest) */}
      <div style={{
        borderTop: `1px solid ${BR.ink}`,
        padding: '18px 28px', background: BR.paper,
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        gap: 24, flexWrap: 'wrap',
      }}>
        <div style={{
          fontFamily: brFont, fontWeight: 900, fontSize: 22,
          textTransform: 'uppercase', letterSpacing: '-0.005em',
        }}>
          ☐ NEXT GAME · TBD · IDEAS WELCOME, ESPECIALLY ABOUT MEETINGS.
        </div>
        <a href="mailto:hello@dumbcorporategames.com" style={{
          background: BR.ink, color: BR.bg, border: 'none',
          padding: '12px 18px', cursor: 'pointer', textDecoration: 'none',
          fontFamily: brMono, fontWeight: 700, fontSize: 12,
          letterSpacing: '0.16em', textTransform: 'uppercase',
        }}>SUGGEST A GAME →</a>
      </div>
    </section>
  )
}
