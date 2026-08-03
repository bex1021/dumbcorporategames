// src/routes/Landing.tsx — main studio landing (/)
//
// REFRAMED 2026-08: this page used to sell a PORTFOLIO OF SEPARATE GAMES
// ("OUR GAMES", three cards, a parking-lot slot for a fourth). That was
// wrong about the product. Blocked is ONE game about ONE day, played in
// four stages that each borrow a different genre. The page now says so.
//
// Section order and what each one is for:
//   Hero        · what the studio is, one game, one day
//   TheStory    · WHO Leonard is, the 08:58 message that starts it, the arc
//   TheStages   · the four stages as a timeline of playable cards
//   CareerStats · lifetime achievements (unchanged)
//   Mission     · the in-fiction studio bit (shared kit)
//   About/etc   · shared kit
//
// The old <MorningArc> section is GONE — it was a timeline of the same three
// games TheStages now lists, which under the reframe became a straight
// duplicate. Its job (the day is continuous, played in order, one save file)
// is carried by TheStages' rail and header.
//
// Narrative source of truth: /Blocked_Story.md. Copy here should be a
// compression of that doc, never a new invention. If they disagree, the doc
// wins — and the doc is itself subordinate to the blueprints.

import { Link } from 'react-router-dom'
import { useEffect, useState } from 'react'
import {
  PageScroll, BR, brFont, brMono,
  Nav, Ticker, Mission, AboutTheStudio, Signup, Closer, Footer,
  ctaPrimary, ctaSecondary, useIsMobile,
  type NavLink,
} from '../brutalist'
import { CareerStats } from '../components/CareerStats'

export default function Landing() {
  return (
    <PageScroll>
      <Nav links={NAV_LINKS} badge={<>● ONE GAME · FOUR STAGES</>} />
      <Hero />
      <Ticker
        accent
        items={[
          'ONE DAY · 9:00 AM TO 4:30 PM',
          'FOUR STAGES · FOUR GENRES',
          'PLAY IN YOUR BROWSER',
          'NO INSTALL · NO ACCOUNT',
          'FREE',
          'BUILT BY ONE PERSON',
          'ACTUAL BUSINESS VALUE GENERATED · $0.00',
        ]}
      />
      <TheStory />
      <TheStages />
      <CareerStats />
      <Ticker
        items={[
          'DO WHATEVER IT TAKES',
          'PER MY LAST EMAIL',
          'CIRCLING BACK',
          'LET’S TAKE THIS OFFLINE',
          'I HEAR YOU',
          'CIRCLING BACK',
          'PINGING THE THREAD',
          'JUST FLAGGING THIS',
        ]}
        dir="right"
        speed={50}
      />
      <Mission />
      <AboutTheStudio />
      <Closer />
      <Signup />
      <Footer />
    </PageScroll>
  )
}

const NAV_LINKS: NavLink[] = [
  { label: 'THE GAME', href: '#game' },
  { label: 'STORY',    href: '#story' },
  { label: 'DEV LOG',  to: '/blog' },
  { label: 'ABOUT',    to: '/about' },
  { label: 'CONTACT',  href: 'mailto:hello@dumbcorporategames.com' },
]

// ─── Hero ─────────────────────────────────────────────────────────────────
function Hero() {
  const isMobile = useIsMobile()
  const cramped = useIsMobile(1080)
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
        <span><b style={{ color: BR.ink }}>STUDIO INDEX</b> · ONE TITLE · IN PRODUCTION</span>
        <span>HQ · <b style={{ color: BR.ink }}>WHEREVER · ANYWHERE WITH WIFI</b></span>
        <span>STATUS · <b style={{ color: BR.green }}>● OPERATING</b></span>
      </div>

      <div style={{
        padding: isMobile ? '18px 20px 4px' : '20px 28px 4px',
        display: 'grid',
        gridTemplateColumns: isMobile ? '1fr' : 'minmax(0, 1.6fr) minmax(300px, 1fr)',
        gap: isMobile ? 20 : 36, alignItems: 'flex-start',
      }}>
        <h1 style={{
          margin: 0, fontFamily: brFont, fontWeight: 900,
          fontSize: 'clamp(40px, 7vw, 104px)',
          lineHeight: 0.86, letterSpacing: '-0.055em',
          textTransform: 'uppercase',
        }}>
          DUMB<br />
          CORPORATE<br />
          GAMES<span style={{ color: BR.accent }}>.</span>
        </h1>
        <StudioOps />
      </div>

      <div style={{
        padding: isMobile ? '10px 20px 20px' : '10px 28px 20px',
        display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'minmax(0, 1.6fr) minmax(280px, 1fr)',
        gap: isMobile ? 20 : 36, alignItems: 'flex-end',
      }}>
        <p style={{
          margin: 0,
          fontFamily: brFont, fontSize: 'clamp(18px, 1.9vw, 28px)',
          lineHeight: 1.25, fontWeight: 500,
          maxWidth: 820, color: BR.ink,
        }}>
          A SATIRICAL STUDIO OF ONE, MAKING <u style={{ background: BR.accent, padding: '0 2px' }}>ONE GAME</u>{' '}
          ABOUT ONE DAY AT ONE COMPANY. IT IS CALLED <b>BLOCKED</b>. IT RUNS 9:00 AM
          TO 4:30 PM, IT IS PLAYED IN FOUR STAGES, AND EACH STAGE IS A DIFFERENT
          GENRE — BECAUSE THAT IS WHAT THE DAY ACTUALLY FEELS LIKE.
        </p>

        <div style={{
          borderTop: `2px solid ${BR.ink}`,
          borderBottom: `2px solid ${BR.ink}`,
          padding: '10px 0',
          fontFamily: brMono, fontSize: 11, lineHeight: 1.7, color: BR.ink,
          textTransform: 'uppercase', letterSpacing: '0.06em',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: BR.muted }}>TITLES</span><b>1</b></div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: BR.muted }}>STAGES</span><b>{STAGES.length}</b></div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: BR.muted }}>HEADCOUNT</span><b>1</b></div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: BR.muted }}>FUNDING</span><b>FEELINGS</b></div>
        </div>
      </div>

      <div style={{
        display: 'flex', borderTop: `4px solid ${BR.ink}`, flexWrap: 'wrap',
        flexDirection: isMobile ? 'column' : 'row',
      }}>
        <Link to="/play" style={{ ...ctaPrimary, background: BR.accent, color: '#000' }}>
          ▶ PLAY — FREE
        </Link>
        <a href="#story" style={ctaSecondary}>▼ READ THE STORY</a>
        <a href="#game"  style={ctaSecondary}>THE FOUR STAGES</a>
        {!cramped && (
          <div style={{
            marginLeft: 'auto', alignSelf: 'center', padding: '0 20px',
            fontFamily: brMono, fontSize: 11,
            textTransform: 'uppercase', color: BR.muted, letterSpacing: '0.08em',
          }}>
            <span style={{ color: BR.accent, fontWeight: 700 }}>▼ KEEP SCROLLING</span> · FREE · BROWSER · NO INSTALL
          </div>
        )}
      </div>
    </section>
  )
}

// ─── Studio Ops — live corporate-style dashboard panel for the hero ──────
function StudioOps() {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(id)
  }, [])
  const pad = (n: number) => String(n).padStart(2, '0')
  const time = `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`
  const offsetH = -now.getTimezoneOffset() / 60
  const tz = `UTC${offsetH >= 0 ? '+' : ''}${offsetH}`

  const metrics = [
    { k: 'SYSTEM',    v: <span style={{ color: BR.green }}>● GREEN</span> },
    { k: 'DEPLOY',    v: <b>STABLE</b> },
    { k: 'INCIDENTS', v: <b>0 / 0</b> },
    { k: 'RUNWAY',    v: <b>INDEFINITE</b> },
    { k: 'MORALE',    v: <b style={{ color: BR.accent }}>● HOLDING</b> },
    { k: 'VIBE',      v: <b>OPERATING</b> },
  ]
  const logLines = [
    ['09:14', 'PM ENTERED BULLPEN'],
    ['09:14', 'ENGINEER: "NO BLOCKERS"'],
    ['09:14', 'CLAIM FILED · WITH CAVEAT'],
  ] as const

  return (
    <div style={{
      border: `2px solid ${BR.ink}`,
      background: BR.paper,
      fontFamily: brMono,
      fontSize: 11,
      color: BR.ink,
      textTransform: 'uppercase',
      letterSpacing: '0.08em',
    }}>
      <div style={{
        background: BR.ink, color: BR.bg,
        padding: '10px 14px',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        fontWeight: 700, letterSpacing: '0.14em',
      }}>
        <span><span style={{ color: BR.accent }}>●</span> STUDIO OPS · LIVE</span>
        <span style={{
          color: '#aaa', display: 'flex', gap: 8, alignItems: 'center', whiteSpace: 'nowrap',
        }}>
          <span>{tz}</span>
          <span style={{ color: BR.accent, fontVariantNumeric: 'tabular-nums' }}>{time}</span>
        </span>
      </div>

      <div style={{ padding: '10px 14px' }}>
        {metrics.map((m, i) => (
          <div key={m.k} style={{
            display: 'flex', justifyContent: 'space-between',
            padding: '5px 0',
            borderBottom: i < metrics.length - 1 ? `1px dashed ${BR.dim}` : 'none',
          }}>
            <span style={{ color: BR.muted, fontWeight: 700 }}>{m.k}</span>
            <span>{m.v}</span>
          </div>
        ))}
      </div>

      <div style={{
        borderTop: `2px solid ${BR.ink}`,
        background: BR.bg,
        padding: '10px 14px',
      }}>
        <div style={{
          color: BR.accent, fontWeight: 700,
          letterSpacing: '0.16em', marginBottom: 8,
        }}>OPS LOG · LATEST</div>
        {logLines.map(([t, msg], i) => (
          <div key={i} style={{
            display: 'flex', gap: 10, padding: '3px 0', color: BR.ink,
          }}>
            <span style={{ color: BR.muted, fontVariantNumeric: 'tabular-nums' }}>{t}</span>
            <span>{msg}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── The story ───────────────────────────────────────────────────────────
// The section this page was missing. People decide whether they care about a
// game from its premise, not its feature list, and the premise was nowhere on
// the site. Compressed from /Blocked_Story.md — see that doc before editing.
//
// Three beats: who Leonard is · the 08:58 message that starts the day · the
// four-beat arc (quoted from the blueprint's "Player character" section).
function TheStory() {
  const isMobile = useIsMobile()
  return (
    <section id="story" style={{
      borderBottom: `4px solid ${BR.ink}`, background: BR.ink, color: BR.bg,
    }}>
      <div style={{
        padding: isMobile ? '24px 20px 18px' : '32px 32px 24px',
        borderBottom: '1px solid #333',
        display: 'grid',
        gridTemplateColumns: isMobile ? 'minmax(0, 1fr)' : 'minmax(0, 1fr) auto',
        gap: isMobile ? 14 : 32, alignItems: 'end',
      }}>
        <div>
          <div style={{
            fontFamily: brMono, fontSize: 11, color: '#aaa',
            textTransform: 'uppercase', letterSpacing: '0.16em', marginBottom: 10,
          }}>
            <span style={{ color: BR.accent, marginRight: 8 }}>●</span>
            THE STORY · ONE DAY · ONE PROJECT NOBODY UNDERSTANDS
          </div>
          <h2 style={{
            margin: 0, fontFamily: brFont, fontWeight: 900,
            fontSize: 'clamp(40px, 7vw, 88px)',
            lineHeight: 0.92, letterSpacing: '-0.035em', textTransform: 'uppercase',
          }}>
            MEET LEONARD<span style={{ color: BR.accent }}>.</span>
          </h2>
        </div>
        <div style={{
          fontFamily: brMono, fontSize: 11, color: '#aaa',
          textTransform: 'uppercase', letterSpacing: '0.1em',
          textAlign: isMobile ? 'left' : 'right', maxWidth: 280, lineHeight: 1.55,
        }}>
          HE IS NOT A HERO · HE IS RESPONSIVE
        </div>
      </div>

      {/* Prose + personnel card */}
      <div style={{
        padding: isMobile ? '24px 20px 8px' : '34px 32px 14px',
        display: 'grid',
        gridTemplateColumns: isMobile ? 'minmax(0, 1fr)' : 'minmax(0, 1.5fr) minmax(260px, 1fr)',
        gap: isMobile ? 24 : 40, alignItems: 'start',
      }}>
        <div style={{ maxWidth: 680 }}>
          <p style={{
            margin: '0 0 20px', fontFamily: brFont,
            fontSize: 'clamp(17px, 1.35vw, 20px)', lineHeight: 1.6, color: '#ddd',
          }}>
            Leonard P. is a project manager at Alignly, a company whose mission is to
            help teams align on alignment. He is good at his job in the only way the
            job allows: he's responsive, he's agreeable, and he writes a clean status
            update.
          </p>
          <p style={{
            margin: '0 0 20px', fontFamily: brFont,
            fontSize: 'clamp(17px, 1.35vw, 20px)', lineHeight: 1.6, color: '#ddd',
          }}>
            At 9:00 AM he still believes that helping the five people who report to him
            and protecting the project are the same activity. They are not. The whole
            game is him finding that out.
          </p>
          <p style={{
            margin: 0, fontFamily: brFont,
            fontSize: 'clamp(17px, 1.35vw, 20px)', lineHeight: 1.6, color: '#ddd',
          }}>
            Nobody corrupts him. He's just handed the same menu over and over — one
            where the kind option is expensive and the corporate option is free — and
            a clock that doesn't care which he picks.
          </p>
        </div>

        {/* Leonard's personnel card. LP is canonical everywhere (design rule 1). */}
        <div style={{ border: `2px solid ${BR.bg}`, minWidth: 0 }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 12,
            padding: '16px 18px', borderBottom: `1px solid ${BR.bg}`,
          }}>
            <span style={{
              width: 42, height: 42, flexShrink: 0,
              background: BR.accent, color: '#000',
              display: 'grid', placeItems: 'center',
              fontFamily: brFont, fontWeight: 900, fontSize: 17,
            }}>LP</span>
            <div style={{ minWidth: 0 }}>
              <div style={{
                fontFamily: brFont, fontWeight: 900, fontSize: 19,
                textTransform: 'uppercase', letterSpacing: '-0.01em',
              }}>LEONARD P.</div>
              <div style={{
                fontFamily: brMono, fontSize: 10, color: '#aaa',
                textTransform: 'uppercase', letterSpacing: '0.12em', marginTop: 2,
              }}>PROJECT MANAGER</div>
            </div>
          </div>
          {([
            ['EMPLOYER', 'ALIGNLY'],
            ['PROJECT', 'CUSTOMER HAPPINESS PORTAL REFRESH'],
            ['UNDERSTANDS IT', 'NO'],
            ['SO DOES NOBODY', 'CORRECT'],
            ['REPORTS TO', '"THE EXEC"'],
            ['DEADLINE', '4:30 PM'],
          ] as [string, string][]).map(([k, v], i) => (
            <div key={k} style={{
              display: 'flex', justifyContent: 'space-between', gap: 12,
              padding: '10px 18px',
              borderTop: i ? '1px dashed #444' : 'none',
              fontFamily: brMono, fontSize: 10,
              textTransform: 'uppercase', letterSpacing: '0.1em',
            }}>
              <span style={{ color: '#888', flexShrink: 0 }}>{k}</span>
              <span style={{ textAlign: 'right', minWidth: 0, overflowWrap: 'anywhere' }}>{v}</span>
            </div>
          ))}
        </div>
      </div>

      {/* The inciting incident, as the artifact it actually is. */}
      <div style={{ padding: isMobile ? '16px 20px 28px' : '22px 32px 36px' }}>
        <div style={{
          fontFamily: brMono, fontSize: 11, color: BR.accent, fontWeight: 700,
          textTransform: 'uppercase', letterSpacing: '0.16em', marginBottom: 14,
        }}>
          08:58 AM · TWO MINUTES BEFORE THE GAME STARTS
        </div>
        <div style={{
          background: BR.paper, color: BR.ink,
          border: `2px solid ${BR.bg}`,
          maxWidth: 720,
        }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '11px 16px', borderBottom: `1px solid ${BR.ink}`,
            fontFamily: brMono, fontSize: 10, fontWeight: 700,
            textTransform: 'uppercase', letterSpacing: '0.14em', color: BR.muted,
          }}>
            <span style={{
              width: 18, height: 18, background: '#5e4db2', color: '#fff',
              display: 'grid', placeItems: 'center', fontSize: 10, fontWeight: 700,
            }}>A</span>
            <span>EXEC → YOU</span>
            <span style={{ marginLeft: 'auto', color: BR.dim }}>DIRECT MESSAGE</span>
          </div>
          <div style={{ padding: isMobile ? '16px' : '20px 22px' }}>
            <p style={{
              margin: 0, fontFamily: brFont, fontSize: 'clamp(19px, 2.1vw, 25px)',
              lineHeight: 1.35, fontWeight: 700, color: BR.ink,
            }}>
              need CHP green by EOD. do whatever it takes.
            </p>
            <p style={{
              margin: '14px 0 0', fontFamily: brFont,
              fontSize: 'clamp(17px, 1.8vw, 21px)', lineHeight: 1.35,
              fontWeight: 500, color: '#444',
            }}>
              ↑ this is between us
            </p>
          </div>
        </div>
        <p style={{
          margin: '18px 0 0', maxWidth: 720,
          fontFamily: brFont, fontSize: 'clamp(16px, 1.3vw, 19px)',
          lineHeight: 1.55, color: '#bbb',
        }}>
          An impossible instruction and a request for deniability, in lowercase,
          before Leonard has taken his coat off. That's the whole setup. Everything
          after it is him trying to make those two sentences true.
        </p>
      </div>

      {/* The arc — four beats, one per stage. Quoted from the blueprint. */}
      <div style={{ borderTop: '1px solid #333' }}>
        <div style={{
          padding: isMobile ? '20px 20px 6px' : '24px 32px 8px',
          fontFamily: brMono, fontSize: 11, color: '#aaa',
          textTransform: 'uppercase', letterSpacing: '0.16em',
        }}>
          <span style={{ color: BR.accent, marginRight: 8 }}>●</span>
          THE ARC · AN EARNEST PM SLOWLY BECOMING DEAD-INSIDE
        </div>
        <div style={{
          display: 'grid',
          gridTemplateColumns: isMobile ? 'minmax(0, 1fr)' : 'repeat(4, minmax(0, 1fr))',
          padding: isMobile ? '10px 20px 28px' : '14px 32px 34px',
          gap: isMobile ? 0 : 24,
        }}>
          {ARC.map((a) => (
            <div key={a.beat} style={{
              paddingTop: 18,
              paddingBottom: isMobile ? 18 : 0,
              borderTop: isMobile ? 'none' : `2px solid ${BR.accent}`,
              borderLeft: isMobile ? `2px solid ${BR.accent}` : 'none',
              paddingLeft: isMobile ? 18 : 0,
            }}>
              <div style={{
                fontFamily: brMono, fontSize: 11, fontWeight: 700,
                letterSpacing: '0.16em', color: BR.accent,
              }}>{a.stage}</div>
              <div style={{
                marginTop: 8, fontFamily: brFont, fontWeight: 700,
                fontSize: 'clamp(16px, 1.5vw, 19px)', lineHeight: 1.35, color: BR.bg,
              }}>{a.beat}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

const ARC = [
  { stage: 'STAGE I',   beat: 'He starts the day genuinely trying to help.' },
  { stage: 'STAGE II',  beat: 'He learns that every solution creates another meeting.' },
  { stage: 'STAGE III', beat: 'He starts using corporate language defensively.' },
  { stage: 'STAGE IV',  beat: 'By 4:30 he either survives the review, or he doesn’t.' },
] as const

// ─── The four stages ─────────────────────────────────────────────────────
// Was <Portfolio> — "OUR GAMES", three sibling products. Now one game's
// stages, in clock order, with the genre shift stated because the genre
// shift IS the pitch.
//
// `route: null` means built-but-not-shipped-here, and renders as the locked
// finale rather than a playable card. Do NOT hard-code a stage count in
// prose anywhere — read STAGES.length (see Design_Language.md rule 11).

type Stage = {
  n: string
  title: string
  time: string
  genre: string
  logline: string
  detail: string
  tags: string[]
  route: string | null
}

const STAGES: Stage[] = [
  {
    n: 'I',
    title: 'PRE-STANDUP ALIGNMENT',
    time: '9:00 – 10:15 AM',
    genre: 'THIRD-PERSON WALKING SIM',
    logline: 'Walk the floor. Answer five people. Watch what it costs.',
    detail:
      'Everyone has already posted "no blockers," and then described the blocker in the same message. Nobody is lying — that’s just the format. Each problem has three or four responses and all of them work: clarify it, ticket it, book a sync, or wave it through. The game shows you the price before you pay it. You are never tricked. You just watch yourself take the cheap answer, because standup is in forty minutes.',
    tags: ['5–10 MIN', 'WASD + E', 'FREE'],
    route: '/play/blocked',
  },
  {
    n: 'II',
    title: 'JIRA RUN',
    time: '10:45 – 11:00 AM',
    genre: '8-BIT ENDLESS RUNNER',
    logline: 'Log four updates. Fall into your own monitor.',
    detail:
      'Standup survived. Leonard sits down to update the board, looks into the backlog, and the backlog looks back. The Kanban columns become a side-scrolling gauntlet — unjumpable dependency walls, gates that only open for the right ticket. The Slack pings chasing him down the track quote, word for word, what he told each person an hour ago. The day has started keeping receipts.',
    tags: ['~5 MIN', 'WASD', 'FREE'],
    route: '/play/jira-run',
  },
  {
    n: 'III',
    title: 'LUNCH DASH',
    time: '11:00 AM – 12:00 PM',
    genre: 'OPEN-WORLD DRIVING',
    logline: 'One free hour. It already has an owner.',
    detail:
      'The first time all day he’s alone. Out through the lobby, into a beige Camry, and for about nine seconds it feels like escape — then the errand: his lunch, the exec’s salmon bowl, back by noon. The bowl rides in the cupholder, on camera, judging his driving. How he arrives back is graded composed, functional, or disheveled, and that grade is not cosmetic. It carries into the finale.',
    tags: ['~5 MIN', 'WASD / ARROWS', 'FREE'],
    route: '/play/lunch-dash',
  },
  {
    n: 'IV',
    title: 'PERFORMANCE REVIEW',
    time: '4:30 PM',
    genre: 'ONE-ON-ONE FIGHTING GAME',
    logline: 'The meeting every stage has dreaded. Finally, literally, a fight.',
    detail:
      'A normal conference room. The Exec sits, then stands, and the camera drops to a side-on fighting framing while he calmly asks where we are on the portal refresh. Nobody acknowledges the genre. Your health bar is CREDIBILITY; his is SKEPTICISM — you aren’t hurting him, you’re wearing down his objections. "Pushback:" is a heavy. Blocking is called Active Listening. Every corporate conversation was always a fighting game; this is the one where the HUD admits it.',
    tags: ['THE FINALE', 'KEYBOARD', 'PLAYABLE'],
    route: '/play/performance-review',
  },
]

function TheStages() {
  const isMobile = useIsMobile()
  const live = STAGES.filter((s) => s.route).length
  return (
    <section id="game" style={{ borderBottom: `4px solid ${BR.ink}` }}>
      <div style={{
        borderTop: `4px solid ${BR.ink}`,
        borderBottom: `1px solid ${BR.ink}`,
        background: BR.bg, padding: isMobile ? '24px 20px 18px' : '32px 32px 24px',
        display: 'grid',
        gridTemplateColumns: isMobile ? 'minmax(0, 1fr)' : 'minmax(0, 1fr) auto',
        gap: isMobile ? 14 : 32, alignItems: 'end',
      }}>
        <div>
          <div style={{
            fontFamily: brMono, fontSize: 11, color: BR.muted,
            textTransform: 'uppercase', letterSpacing: '0.16em', marginBottom: 10,
          }}>
            <span style={{ color: BR.accent, marginRight: 8 }}>●</span>
            ONE GAME · {STAGES.length} STAGES · {live} PLAYABLE NOW
          </div>
          <h2 style={{
            margin: 0, fontFamily: brFont, fontWeight: 900,
            fontSize: 'clamp(44px, 7vw, 92px)',
            lineHeight: 0.92, letterSpacing: '-0.035em', textTransform: 'uppercase',
          }}>
            BLOCKED<span style={{ color: BR.accent }}>.</span>
          </h2>
        </div>
        <div style={{
          fontFamily: brMono, fontSize: 11, color: BR.muted,
          textTransform: 'uppercase', letterSpacing: '0.1em',
          textAlign: isMobile ? 'left' : 'right',
          maxWidth: 340, lineHeight: 1.55,
        }}>
          PLAYED IN ORDER · ONE SAVE FILE · WHAT YOU DID AT 9 AM IS STILL IN THE ROOM AT 4:30
        </div>
      </div>

      {STAGES.map((s, i) => <StageRow key={s.n} s={s} i={i} />)}

      <div style={{
        borderTop: `1px solid ${BR.ink}`,
        padding: isMobile ? '18px 20px' : '18px 28px', background: BR.paper,
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        gap: 24, flexWrap: 'wrap',
      }}>
        <div style={{
          fontFamily: brFont, fontWeight: 900, fontSize: 20,
          textTransform: 'uppercase', letterSpacing: '-0.005em',
        }}>
          ☐ EVERY ENDING · ACTUAL BUSINESS VALUE GENERATED: $0.00
        </div>
        <Link to="/play" style={{
          background: BR.ink, color: BR.bg, border: 'none',
          padding: '12px 18px', cursor: 'pointer', textDecoration: 'none',
          fontFamily: brMono, fontWeight: 700, fontSize: 12,
          letterSpacing: '0.16em', textTransform: 'uppercase',
        }}>START AT 9:00 AM →</Link>
      </div>
    </section>
  )
}

// One stage. Alternates ink/paper down the page so the four read as a
// sequence rather than a grid of products.
function StageRow({ s, i }: { s: Stage; i: number }) {
  const isMobile = useIsMobile()
  const locked = !s.route
  const dark = i % 2 === 0 && !locked
  const bg = locked ? '#e6e3da' : dark ? BR.ink : BR.bg
  const fg = locked ? BR.muted : dark ? BR.bg : BR.ink
  const strong = locked ? BR.dim : dark ? BR.bg : BR.ink

  return (
    <div style={{
      background: bg, color: fg,
      borderTop: i ? `1px solid ${BR.ink}` : 'none',
      display: 'grid',
      // 172px, not 150: "11:00 AM – 12:00 PM" at the tracking below needs
      // ~160px and was orphaning "PM" onto its own line.
      gridTemplateColumns: isMobile ? 'minmax(0, 1fr)' : '172px minmax(0, 1fr)',
      gap: isMobile ? 0 : 28,
      padding: isMobile ? '24px 20px 26px' : '30px 32px 34px',
    }}>
      {/* Stage numeral + clock */}
      <div>
        <div style={{
          fontFamily: brFont, fontWeight: 900,
          fontSize: isMobile ? 56 : 78, lineHeight: 0.8,
          letterSpacing: '-0.05em',
          color: locked ? BR.dim : BR.accent,
        }}>{s.n}</div>
        <div style={{
          marginTop: 10, fontFamily: brMono, fontSize: 11, fontWeight: 700,
          textTransform: 'uppercase', letterSpacing: '0.06em',
          color: locked ? BR.dim : (dark ? '#aaa' : BR.muted),
          fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap',
        }}>{s.time}</div>
      </div>

      <div style={{ minWidth: 0, marginTop: isMobile ? 16 : 0 }}>
        <div style={{
          fontFamily: brMono, fontSize: 10, fontWeight: 700,
          textTransform: 'uppercase', letterSpacing: '0.16em',
          color: locked ? BR.dim : BR.accent, marginBottom: 8,
        }}>{s.genre}</div>

        <h3 style={{
          margin: 0, fontFamily: brFont, fontWeight: 900,
          fontSize: 'clamp(28px, 4vw, 50px)', lineHeight: 0.95,
          letterSpacing: '-0.035em', textTransform: 'uppercase',
          color: strong, overflowWrap: 'anywhere', hyphens: 'auto',
        }}>{s.title}</h3>

        <p style={{
          margin: '12px 0 0', fontFamily: brFont, fontWeight: 700,
          fontSize: 'clamp(17px, 1.7vw, 21px)', lineHeight: 1.35,
          color: locked ? BR.muted : (dark ? '#ddd' : '#111'),
          maxWidth: 620,
        }}>{s.logline}</p>

        <p style={{
          margin: '14px 0 0', fontFamily: brFont,
          fontSize: 15, lineHeight: 1.6,
          color: locked ? BR.muted : (dark ? '#bbb' : '#333'),
          maxWidth: 760,
        }}>{s.detail}</p>

        <div style={{
          marginTop: 18, display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center',
        }}>
          {s.tags.map((t) => (
            <span key={t} style={{
              fontFamily: brMono, fontSize: 10, fontWeight: 700,
              padding: '4px 8px', letterSpacing: '0.1em', textTransform: 'uppercase',
              border: `1px solid ${locked ? BR.dim : (dark ? BR.bg : BR.ink)}`,
              color: locked ? BR.muted : (dark ? BR.bg : BR.ink),
            }}>{t}</span>
          ))}

          {s.route ? (
            <Link to={s.route} style={{
              marginLeft: isMobile ? 0 : 8,
              background: dark ? BR.accent : BR.ink,
              color: dark ? '#000' : BR.bg,
              padding: '11px 18px', textDecoration: 'none',
              fontFamily: brFont, fontWeight: 900, fontSize: 15,
              textTransform: 'uppercase', letterSpacing: '0.03em',
            }}>▶ PLAY STAGE {s.n}</Link>
          ) : (
            // Genuinely dead, not a link that goes nowhere (design rule 4).
            <span style={{
              marginLeft: isMobile ? 0 : 8,
              border: `1px dashed ${BR.dim}`, color: BR.muted,
              padding: '10px 17px',
              fontFamily: brMono, fontWeight: 700, fontSize: 11,
              textTransform: 'uppercase', letterSpacing: '0.14em',
            }}>▓ NOT YET · THE FINALE IS BEING BUILT</span>
          )}
        </div>
      </div>
    </div>
  )
}
