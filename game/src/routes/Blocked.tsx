// src/routes/Blocked.tsx — Blocked product/info page (/blocked)
//
// Deep dive on the studio's first title. Linked from the main Landing's
// portfolio card. The actual playable game lives at /play/blocked.
//
// Sections, top to bottom:
//   Nav · Hero · Ticker · Vital Signs · Portfolio · How It Plays ·
//   Screenshots · Raw Log · Ticker · Mission · Endorsements ·
//   About the studio · Closer · Signup · Footer

import { Link } from 'react-router-dom'
import { useEffect, useState } from 'react'
import {
  PageScroll, BR, brFont, brMono,
  Nav, Ticker, SectionStarter, Mission, AboutTheStudio, Signup, Closer, Footer,
  ScreenshotSlot, ctaPrimary, ctaSecondary, useIsMobile,
  type NavLink,
} from '../brutalist'

// "LOG" → "RAW LOG": with a DEV LOG entry now in the same nav, the in-fiction
// standup transcript and the studio's build notes needed distinct labels.
const NAV_LINKS: NavLink[] = [
  { label: 'BLOCKED',      href: '#top',     active: true },
  { label: 'HOW IT PLAYS', href: '#how' },
  { label: 'RAW LOG',      href: '#log' },
  { label: 'DEV LOG',      to: '/blog' },
  { label: 'ABOUT',        to: '/about' },
]

export default function Blocked() {
  return (
    <PageScroll>
      <Nav links={NAV_LINKS} badge={<>● PHASE 1 · LIVE</>} />
      <Hero />
      <Ticker accent items={[
        'PROJECT STATUS · GREEN',
        'STANDUP IN 75 MINUTES',
        'EVERYONE IS ALIGNED',
        'NO ONE IS OKAY',
        'BLOCKERS RECLASSIFIED AS DEPENDENCIES (5)',
        'CALENDAR APOCALYPSE · PENDING',
        'EXEC: "DO WHATEVER IT TAKES"',
        'OAT MILK CONFLICT · UNRESOLVED',
      ]} />
      <VitalSigns />
      <Portfolio />
      <HowItPlays />
      <Screenshots />
      <RawLog />
      <Ticker items={[
        'DO WHATEVER IT TAKES',
        'PER MY LAST EMAIL',
        'CIRCLING BACK',
        'LET\u2019S TAKE THIS OFFLINE',
        'I HEAR YOU',
        'CIRCLING BACK',
        'PINGING THE THREAD',
        'JUST FLAGGING THIS',
        'BUMPING THIS UP',
      ]} dir="right" speed={50} />
      <Mission />
      <Endorsements />
      <FAQ />
      <AboutTheStudio />
      <Closer />
      <Signup />
      <Footer />
      <StickyPlayCTA />
    </PageScroll>
  )
}

// ─── Hero ─────────────────────────────────────────────────────────────────
function Hero() {
  const isMobile = useIsMobile()
  return (
    <section id="top" style={{ borderBottom: `4px solid ${BR.ink}`, position: 'relative' }}>
      <div style={{
        padding: '16px 28px',
        borderBottom: `1px solid ${BR.ink}`,
        display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16,
        flexWrap: 'wrap',
        fontFamily: brMono, fontSize: 11,
        textTransform: 'uppercase', letterSpacing: '0.14em', color: BR.muted,
      }}>
        <span><b style={{ color: BR.ink }}>TITLE 001</b> · Q2 · DUMB CORPORATE GAMES</span>
        <span>STATUS: <b style={{ color: BR.green }}>● GREEN</b> · STANDUP IN <b style={{ color: BR.ink }}>75 MIN</b></span>
        <span>UPDATED <b style={{ color: BR.ink }}>0 SECONDS AGO</b></span>
      </div>

      <div style={{ padding: isMobile ? '18px 20px 4px' : '20px 28px 4px' }}>
        <div style={{
          fontFamily: brMono, fontSize: 11, color: BR.muted,
          textTransform: 'uppercase', letterSpacing: '0.16em',
          marginBottom: 10, display: 'flex', alignItems: 'center', gap: 10,
        }}>
          <Link to="/" style={{ color: BR.muted, textDecoration: 'none' }}>
            ← DUMB CORPORATE GAMES
          </Link>
          <span>·</span>
          <span>TITLE 001</span>
        </div>
        <h1 style={{
          margin: 0, fontFamily: brFont, fontWeight: 900,
          fontSize: 'clamp(56px, 14vw, 200px)',
          lineHeight: 0.86, letterSpacing: '-0.055em',
          textTransform: 'uppercase',
        }}>
          BLOCKED<span style={{ color: BR.accent }}>.</span>
        </h1>
        <div style={{
          marginTop: 6,
          fontFamily: brFont, fontWeight: 700,
          fontSize: 'clamp(16px, 1.6vw, 22px)', letterSpacing: '0.02em',
          textTransform: 'uppercase', color: BR.muted,
        }}>
          PRE-STANDUP ALIGNMENT · 5–10 MIN · BROWSER
        </div>
        <div style={{
          marginTop: 10,
          fontFamily: brMono, fontSize: 12,
          textTransform: 'uppercase', letterSpacing: '0.1em', color: BR.muted,
        }}>
          ADJACENT TO ·{' '}
          <b style={{ color: BR.ink }}>PAPERS PLEASE</b> ·{' '}
          <b style={{ color: BR.ink }}>THE STANLEY PARABLE</b> ·{' '}
          <b style={{ color: BR.ink }}>GOING UNDER</b>
        </div>
      </div>

      <div style={{
        padding: isMobile ? '10px 20px 20px' : '10px 28px 20px',
        display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'minmax(0, 1.6fr) minmax(280px, 1fr)',
        gap: isMobile ? 18 : 36, alignItems: 'flex-end',
      }}>
        <p style={{
          margin: 0,
          fontFamily: brFont, fontSize: 22, lineHeight: 1.32, fontWeight: 500,
          maxWidth: 760, color: BR.ink,
        }}>
          {/* Product pitch, not the studio pitch — the old paragraph here was
              the landing hero's copy verbatim, telling a visitor who already
              clicked into BLOCKED what the studio is instead of what the
              game is. */}
          YOU ARE LEONARD, AN EARNEST PM AT ALIGNLY. FIVE COWORKERS, 75 MINUTES,
          ONE STANDUP. EVERYONE SAYS{' '}
          <u style={{ background: BR.accent, padding: '0 2px' }}>"NO BLOCKERS."</u>{' '}
          EVERYONE HAS BLOCKERS.
        </p>

        <div style={{
          borderTop: `2px solid ${BR.ink}`, borderBottom: `2px solid ${BR.ink}`,
          padding: '10px 0',
          fontFamily: brMono, fontSize: 11, lineHeight: 1.7,
          color: BR.ink, textTransform: 'uppercase', letterSpacing: '0.06em',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: BR.muted }}>PORTFOLIO</span><b>1 OF 3</b></div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: BR.muted }}>HEADCOUNT</span><b>1</b></div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: BR.muted }}>FUNDING</span><b>FEELINGS</b></div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: BR.muted }}>PRICE</span><b style={{ color: BR.accent }}>$0.00</b></div>
        </div>
      </div>

      <div style={{
        display: 'flex', borderTop: `4px solid ${BR.ink}`, flexWrap: 'wrap',
        flexDirection: isMobile ? 'column' : 'row',
      }}>
        <Link to="/play/blocked" style={ctaPrimary}>▶ PLAY BLOCKED — PHASE 1</Link>
        <a href="#mission" style={ctaSecondary}>READ THE MISSION</a>
        <a href="#how"     style={ctaSecondary}>HOW IT PLAYS</a>
        <div style={{
          marginLeft: 'auto', alignSelf: 'center', padding: '0 20px',
          fontFamily: brMono, fontSize: 11, textTransform: 'uppercase',
          color: BR.muted, letterSpacing: '0.08em',
        }}>
          <span style={{ color: BR.accent, fontWeight: 700 }}>▼ KEEP SCROLLING</span> · NO INSTALL · NO ACCOUNT
        </div>
      </div>
    </section>
  )
}

// ─── Vital Signs — full-width inline HUD strip (static for now) ──────────
function VitalSigns() {
  const isMobile = useIsMobile()
  // Hardcoded "office is mildly stressed" snapshot. Wire this to scroll
  // position or to gameStore later if you want it to come alive.
  const proj = 90, p = 17, meet = 21, align = 1

  const Meter = ({
    label, val, max = 100, color, hot,
  }: { label: string; val: number; max?: number; color: string; hot: string }) => (
    <div style={{ flex: 1, padding: '14px 18px', borderRight: `1px solid ${BR.ink}`, minWidth: 0 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <span style={{
          fontFamily: brMono, fontSize: 10, color: BR.muted,
          textTransform: 'uppercase', letterSpacing: '0.14em', fontWeight: 700,
        }}>{label}</span>
        <span style={{
          fontFamily: brMono, fontSize: 11, color: BR.ink, fontWeight: 700,
          fontVariantNumeric: 'tabular-nums',
        }}>{Math.round(val)}/{max}</span>
      </div>
      <div style={{
        marginTop: 6, fontFamily: brFont, fontWeight: 900,
        fontSize: 'clamp(19px, 5vw, 34px)', lineHeight: 1, color: BR.ink, textTransform: 'uppercase',
        letterSpacing: '-0.01em', overflowWrap: 'anywhere',
      }}>{hot}</div>
      <div style={{
        marginTop: 8, height: 14, background: BR.bg,
        border: `1px solid ${BR.ink}`, position: 'relative',
      }}>
        <div style={{
          position: 'absolute', inset: 0, width: `${(val / max) * 100}%`,
          background: color,
        }} />
      </div>
    </div>
  )

  return (
    <section style={{
      borderBottom: `4px solid ${BR.ink}`, background: BR.paper,
    }}>
      <div style={{
        padding: '10px 18px',
        borderBottom: `1px solid ${BR.ink}`,
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        flexWrap: 'wrap', gap: 12,
        fontFamily: brMono, fontSize: 11, color: BR.ink,
        textTransform: 'uppercase', letterSpacing: '0.14em', fontWeight: 700,
      }}>
        <span>● LIVE · OFFICE VITAL SIGNS · ALIGNLY · 9:14 AM</span>
        <span style={{ color: BR.green }}>STATUS · TIGHT SMILE</span>
      </div>
      <div style={{
        display: isMobile ? 'grid' : 'flex',
        gridTemplateColumns: isMobile ? 'minmax(0, 1fr) minmax(0, 1fr)' : undefined,
        borderBottom: `1px solid ${BR.ink}`, flexWrap: 'wrap',
      }}>
        <Meter label="PROJECT STATUS" val={proj} color={BR.green} hot="GREEN" />
        <Meter label="PISSED-OFF"     val={p}    color={BR.ink}   hot="FINE" />
        <Meter label="MEETING LOAD"   val={meet} color={BR.ink}   hot="LOW" />
        <div style={{ flex: 1, padding: '14px 18px', minWidth: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <span style={{
              fontFamily: brMono, fontSize: 10, color: BR.muted,
              textTransform: 'uppercase', letterSpacing: '0.14em', fontWeight: 700,
            }}>ALIGNMENT</span>
            <span style={{
              fontFamily: brMono, fontSize: 11, color: BR.ink, fontWeight: 700,
              fontVariantNumeric: 'tabular-nums',
            }}>{align}/8</span>
          </div>
          <div style={{
            marginTop: 6, fontFamily: brFont, fontWeight: 900,
            fontSize: 'clamp(19px, 5vw, 34px)', lineHeight: 1, color: BR.ink, textTransform: 'uppercase',
            overflowWrap: 'anywhere',
          }}>
            INSUFFICIENT
          </div>
          <div style={{ marginTop: 10, display: 'flex', gap: 4 }}>
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} style={{
                flex: 1, height: 14,
                background: i < align ? BR.ink : 'transparent',
                border: `1px solid ${BR.ink}`,
              }} />
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

// ─── Portfolio ─ Blocked game spec slab ──────────────────────────────────
function Portfolio() {
  const isMobile = useIsMobile()
  return (
    <section>
      <SectionStarter
        eyebrow="TITLE 001 · A DUMB CORPORATE GAME"
        title={<>CURRENTLY IN<br />PRODUCTION.</>}
        meta="A SINGLE TITLE · PHASE 1 OF 3 · LIVE · STATUS GREEN"
      />

      <div style={{
        display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1.4fr 1fr',
        borderBottom: `4px solid ${BR.ink}`,
      }}>
        <div style={{
          background: BR.ink, color: BR.bg, padding: isMobile ? '24px 20px' : '36px 36px',
          position: 'relative', minHeight: isMobile ? 'auto' : 520,
          display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
        }}>
          <div>
            <div style={{
              fontFamily: brMono, fontSize: 11, color: BR.accent,
              textTransform: 'uppercase', letterSpacing: '0.16em', fontWeight: 700,
            }}>
              TITLE 001 · A DUMB CORPORATE GAME
            </div>
            <h3 style={{
              margin: '14px 0 0', fontFamily: brFont, fontWeight: 900,
              fontSize: 'clamp(60px, 13vw, 124px)', lineHeight: 0.92, letterSpacing: '-0.045em',
              textTransform: 'uppercase',
            }}>
              BLOCKED<span style={{ color: BR.accent }}>:</span><br />
              <span style={{ fontSize: 36, letterSpacing: '0.06em', fontWeight: 700 }}>
                PRE-STANDUP ALIGNMENT
              </span>
            </h3>
          </div>

          <div style={{ marginTop: 32, border: `2px solid ${BR.accent}`, padding: 4 }}>
            <ScreenshotSlot
              src="/screenshots/01-hero.png"
              alt="Bullpen · 9:14 AM · PM approaching engineer pod"
              height={320}
            />
            <div style={{
              borderTop: `2px solid ${BR.accent}`,
              display: 'grid', gridTemplateColumns: '60px 1fr 90px',
              fontFamily: brMono, color: BR.bg, fontSize: 10,
              textTransform: 'uppercase', letterSpacing: '0.1em',
            }}>
              <div style={{ padding: '8px 10px', borderRight: `1px solid ${BR.accent}`, color: BR.accent, fontWeight: 700 }}>REC ●</div>
              <div style={{ padding: '8px 10px', borderRight: `1px solid ${BR.accent}` }}>ALIGNLY · BULLPEN · 9:14 AM · PM APPROACHING ENGINEER POD</div>
              <div style={{ padding: '8px 10px', textAlign: 'right' }}>16:9</div>
            </div>
          </div>
        </div>

        <div style={{
          background: BR.paper, padding: 24,
          borderLeft: isMobile ? 'none' : `4px solid ${BR.ink}`,
          borderTop: isMobile ? `4px solid ${BR.ink}` : 'none',
          display: 'flex', flexDirection: 'column',
        }}>
          <div style={{
            fontFamily: brMono, fontSize: 11, color: BR.muted,
            textTransform: 'uppercase', letterSpacing: '0.16em',
          }}>
            THE BRIEF
          </div>
          <p style={{
            margin: '14px 0 0',
            fontFamily: brFont, fontSize: 17, lineHeight: 1.5, color: BR.ink,
          }}>
            You are Leonard, a PM at <b>ALIGNLY</b>. Standup is in <b>75 minutes</b>.
            The exec wants the Customer Happiness Portal Refresh{' '}
            <b style={{ color: BR.green }}>GREEN</b> by end of day. Five of your
            coworkers have just posted <i>"no blockers."</i> All five then tell
            you the blocker.
          </p>
          <p style={{
            margin: '14px 0 0',
            fontFamily: brFont, fontSize: 15, lineHeight: 1.55, color: '#222',
          }}>
            Walk the bullpen. Talk to each of them. Hear what's actually blocking
            each one, manage their stress without burning out, and figure out
            which corporate evasion will keep the project Green without shipping
            nothing. Every choice costs something — time, your team's patience,
            your meeting load, your alignment points. The game shows you the price
            before you pay it.
          </p>
          <p style={{
            margin: '14px 0 0',
            fontFamily: brFont, fontSize: 15, lineHeight: 1.55, color: '#222',
          }}>
            Pick wrong and the calendar swallows you, the project goes Red, or
            you arrive at standup having delivered exactly nothing.
          </p>
          <div style={{
            marginTop: 18, paddingTop: 14,
            borderTop: `2px solid ${BR.ink}`,
            display: 'flex', gap: 6, flexWrap: 'wrap',
          }}>
            {([
              ['5–10 MIN',            false],
              ['WASD + E',            false],
              ['BROWSER · NO INSTALL', false],
              ['$0.00',               true],
              ['12 ENDINGS',          false],
              ['12 ACHIEVEMENTS',     false],
            ] as const).map(([label, accent]) => (
              <span key={label} style={{
                fontFamily: brMono, fontSize: 10, fontWeight: 700,
                padding: '5px 8px', letterSpacing: '0.1em', textTransform: 'uppercase',
                border: `1px solid ${BR.ink}`,
                color: '#000',
                background: accent ? BR.accent : 'transparent',
              }}>{label}</span>
            ))}
          </div>

          <div style={{ marginTop: 'auto', paddingTop: 18, display: 'flex', flexDirection: 'column', gap: 0 }}>
            <Link to="/play/blocked" style={{
              ...ctaPrimary, padding: '20px 22px', fontSize: 16, border: `2px solid ${BR.ink}`,
            }}>▶ PLAY NOW</Link>
            <a href="#how" style={{
              ...ctaSecondary, padding: '20px 22px', fontSize: 16,
              border: `2px solid ${BR.ink}`, borderTop: 'none',
            }}>READ THE BRIEF</a>
          </div>
        </div>
      </div>
    </section>
  )
}

// ─── How It Plays ────────────────────────────────────────────────────────
function HowItPlays() {
  const steps: [string, string][] = [
    ['WALK',     'WASD MOVES PM. CROSSING THE OFFICE TAKES ~3 SECONDS.'],
    ['APPROACH', 'NPCs WITH A PULSING ! STILL OWE YOU ALIGNMENT. ✓ = HANDLED.'],
    ['PRESS E',  'OPENS DIALOGUE. EACH CHOICE PREVIEWS ITS COST: TIME +10m. PO −5.'],
    ['CHOOSE',   'HONEST ANSWERS ARE USUALLY WRONG. CORPORATE EVASIONS USUALLY OPTIMAL.'],
    ['SURVIVE',  'STANDUP AT 10:15 · STATUS G/Y · PO < 90 · ALIGNMENT ≥ 4.'],
  ]
  const isMobile = useIsMobile()
  return (
    <section id="how" style={{ borderBottom: `4px solid ${BR.ink}` }}>
      <SectionStarter
        eyebrow="MANUAL · OBLIGATORY · NOT REQUIRED"
        title={<>HOW IT<br />PLAYS.</>}
        meta="ESTIMATED READ TIME · 90 SECONDS · IGNORED ANYWAY"
      />
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(5, minmax(0, 1fr))' }}>
        {steps.map(([h, b], i) => (
          <div key={h} style={{
            padding: '24px 22px 30px',
            background: i === 0 ? BR.ink : BR.bg,
            color: i === 0 ? BR.bg : BR.ink,
            borderLeft: isMobile ? 'none' : (i ? `1px solid ${BR.ink}` : 'none'),
            borderBottom: `1px solid ${BR.ink}`,
            position: 'relative',
          }}>
            <div style={{
              position: 'absolute', top: 18, right: 18,
              fontFamily: brMono, fontSize: 11, fontWeight: 700, letterSpacing: '0.16em',
              color: i === 0 ? BR.accent : BR.muted, textTransform: 'uppercase',
            }}>·0{i + 1}</div>
            <div style={{
              fontFamily: brFont, fontWeight: 900,
              fontSize: 110, lineHeight: 0.82, letterSpacing: '-0.06em',
              color: i === 0 ? BR.accent : BR.ink,
              fontVariantNumeric: 'tabular-nums',
            }}>{String(i + 1).padStart(2, '0')}</div>
            <div style={{
              marginTop: 14, fontFamily: brFont, fontWeight: 900, fontSize: 28,
              lineHeight: 1.0, textTransform: 'uppercase', letterSpacing: '-0.01em',
            }}>{h}</div>
            <div style={{
              marginTop: 10, fontSize: 13, lineHeight: 1.55,
              color: i === 0 ? '#ccc' : '#333', fontFamily: brFont,
            }}>{b}</div>
          </div>
        ))}
      </div>
    </section>
  )
}

type Shot = { id: string; tag: string; code: string; src: string }
const SHOTS: Shot[] = [
  { id: 'hero',   tag: 'BULLPEN · 09:14 AM · PM AT ENGINEER POD',           code: 'F.01', src: '/screenshots/01-hero.png' },
  { id: 'brent',  tag: 'BRENT · ENG · "NO BLOCKERS." (HAS BLOCKERS)',        code: 'F.02', src: '/screenshots/07-brent.png' },
  { id: 'print',  tag: 'PRINTER · PC LOAD LETTER · MELTDOWN IMMINENT',      code: 'F.03', src: '/screenshots/03-printer.png' },
  { id: 'cal',    tag: 'CALENDAR · EVERY SLOT A "QUICK SYNC"',              code: 'F.04', src: '/screenshots/04-calendar.png' },
  { id: 'stand',  tag: 'STANDUP COMPLETE · NO ONE IS OKAY',                 code: 'F.05', src: '/screenshots/05-standup.png' },
  { id: 'plant',  tag: 'OFFICE PLANT · SILENT STAKEHOLDER · BOUNDARIES: YES', code: 'F.06', src: '/screenshots/06-plant.png' },
]

function Screenshots() {
  const isMobile = useIsMobile()
  return (
    <section style={{ borderBottom: `4px solid ${BR.ink}` }}>
      <SectionStarter
        eyebrow="EVIDENCE · UNRETOUCHED"
        title={<>FROM THE<br />BULLPEN.</>}
        meta="ASPECT 16:9 · CAPTURED 09:14 AM · NO POST"
      />

      <div style={{
        display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1.8fr 1fr',
        borderBottom: `1px solid ${BR.ink}`,
      }}>
        {/* Hero shot */}
        <div style={{
          background: BR.ink, color: BR.bg, position: 'relative',
          display: 'flex', flexDirection: 'column',
        }}>
          <div style={{ padding: '20px 28px 14px', borderBottom: `2px solid ${BR.accent}` }}>
            <div style={{
              fontFamily: brMono, fontSize: 11, color: BR.accent, fontWeight: 700,
              letterSpacing: '0.16em', textTransform: 'uppercase',
            }}>
              FIG. {SHOTS[0].code} · HERO
            </div>
            <div style={{
              marginTop: 6, fontFamily: brFont, fontWeight: 900,
              fontSize: 38, lineHeight: 0.98, letterSpacing: '-0.02em',
              textTransform: 'uppercase', maxWidth: 720,
            }}>{SHOTS[0].tag}</div>
          </div>
          <ScreenshotSlot src={SHOTS[0].src} alt={SHOTS[0].tag} height={420} />
        </div>

        {/* Side stack */}
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {SHOTS.slice(1, 4).map((s, i) => {
            const accentBg = i === 1
            return (
              <div key={s.id} style={{
                flex: 1, borderLeft: `1px solid ${BR.ink}`,
                borderBottom: i < 2 ? `1px solid ${BR.ink}` : 'none',
                background: accentBg ? BR.accent : BR.paper, color: accentBg ? '#000' : BR.ink,
                display: 'grid', gridTemplateRows: 'auto 1fr',
              }}>
                <div style={{
                  padding: '10px 14px',
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
                  borderBottom: `1px solid ${accentBg ? '#000' : BR.ink}`,
                }}>
                  <div style={{
                    fontFamily: brMono, fontSize: 10,
                    color: accentBg ? '#000' : BR.muted,
                    letterSpacing: '0.16em', textTransform: 'uppercase', fontWeight: 700,
                  }}>FIG. {s.code}</div>
                  <div style={{
                    fontFamily: brFont, fontWeight: 900, fontSize: 13,
                    lineHeight: 1.15, letterSpacing: '-0.005em',
                    textTransform: 'uppercase', textAlign: 'right',
                  }}>{s.tag}</div>
                </div>
                <ScreenshotSlot src={s.src} alt={s.tag} height={140} />
              </div>
            )
          })}
        </div>
      </div>

      {/* Bottom row */}
      <div style={{
        display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, 1fr)',
        borderBottom: `1px solid ${BR.ink}`,
      }}>
        {SHOTS.slice(4).map((s, i) => (
          <div key={s.id} style={{
            borderLeft: i ? `1px solid ${BR.ink}` : 'none',
            background: BR.paper,
            display: 'grid', gridTemplateRows: 'auto 1fr',
          }}>
            <div style={{
              padding: '14px 22px',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16,
              borderBottom: `1px solid ${BR.ink}`,
            }}>
              <div style={{
                fontFamily: brMono, fontSize: 11, color: BR.accent, fontWeight: 700,
                letterSpacing: '0.16em',
              }}>FIG. {s.code}</div>
              <div style={{
                fontFamily: brFont, fontWeight: 900, fontSize: 18,
                textTransform: 'uppercase', letterSpacing: '-0.005em', textAlign: 'right',
              }}>{s.tag}</div>
            </div>
            <ScreenshotSlot src={s.src} alt={s.tag} height={240} />
          </div>
        ))}
      </div>
    </section>
  )
}

// ─── Raw Log (the Slack thread) ──────────────────────────────────────────
type LogLine = { t: string; who: string; ch: string; body: string; alert?: boolean }
const LOG: LogLine[] = [
  { t: '08:58', who: 'EXEC',     ch: 'DM',                    body: 'need CHP green by EOD. do whatever it takes.', alert: true },
  { t: '08:58', who: 'EXEC',     ch: 'DM',                    body: '↑ this is between us' },
  { t: '08:59', who: 'PM',       ch: 'DM',                    body: 'on it' },
  { t: '09:00', who: 'PM',       ch: '#ch-customer-happiness', body: 'morning all! quick sync at 9:15 to align on CHP refresh before standup — just want to confirm everyone is unblocked' },
  { t: '09:00', who: 'ENG',      ch: '#ch-customer-happiness', body: 'no blockers!' },
  { t: '09:01', who: 'DESIGN',   ch: '#ch-customer-happiness', body: 'no blockers' },
  { t: '09:01', who: 'PRODUCT',  ch: '#ch-customer-happiness', body: 'no blockers (small ask coming separately)' },
  { t: '09:02', who: 'SALES',    ch: '#ch-customer-happiness', body: 'none here — told the client thursday btw, ping me' },
  { t: '09:02', who: 'HR',       ch: '#ch-customer-happiness', body: 'no blockers, just a kind reminder that feedback should be actionable, kind, and legally survivable.' },
  { t: '09:03', who: 'PM',       ch: '#ch-customer-happiness', body: 'great. circling back individually 🙏' },
]

function RawLog() {
  const isMobile = useIsMobile()
  return (
    <section id="log" style={{ borderBottom: `4px solid ${BR.ink}` }}>
      <SectionStarter
        eyebrow="RAW LOG · TRANSCRIPT · LOOSELY REDACTED"
        title={<>WHAT THEY SAID<br />BEFORE 9 AM.</>}
        meta="08:58 → 09:03 AM · 10 MESSAGES · EVERY ONE TECHNICALLY TRUE"
        dark
      />
      <div style={{ background: BR.paper, overflowX: isMobile ? 'auto' : undefined }}>
        <div style={{
          display: 'grid', gridTemplateColumns: '70px 140px 200px 1fr',
          minWidth: isMobile ? 620 : undefined,
          background: BR.ink, color: BR.bg,
          fontFamily: brMono, fontSize: 11, letterSpacing: '0.14em',
          textTransform: 'uppercase', fontWeight: 700,
        }}>
          {['TIME', 'AUTHOR', 'CHANNEL', 'MESSAGE'].map((h, i) => (
            <div key={i} style={{ padding: '12px 14px', borderLeft: i ? `1px solid #333` : 'none' }}>{h}</div>
          ))}
        </div>
        {LOG.map((m, i) => (
          <div key={i} style={{
            display: 'grid', gridTemplateColumns: '70px 140px 200px 1fr',
            minWidth: isMobile ? 620 : undefined,
            borderBottom: `1px solid ${BR.ink}`,
            background: m.alert ? BR.accent : (i % 2 ? BR.paper : BR.bg),
            color: BR.ink,
          }}>
            <div style={{
              padding: '12px 14px',
              fontFamily: brMono, fontSize: 12, fontWeight: 700,
              color: m.alert ? '#000' : BR.muted, letterSpacing: '0.04em',
            }}>{m.t}</div>
            <div style={{
              padding: '12px 14px', borderLeft: `1px solid ${BR.ink}`,
              fontFamily: brFont, fontWeight: 900, textTransform: 'uppercase',
              fontSize: 14, letterSpacing: '-0.005em',
            }}>{m.who}</div>
            <div style={{
              padding: '12px 14px', borderLeft: `1px solid ${BR.ink}`,
              fontFamily: brMono, fontSize: 11,
              color: m.alert ? '#000' : BR.muted, letterSpacing: '0.04em', textTransform: 'uppercase',
            }}>{m.ch}</div>
            <div style={{
              padding: '12px 14px', borderLeft: `1px solid ${BR.ink}`,
              fontFamily: brFont, fontSize: 15, lineHeight: 1.4,
            }}>
              {m.alert && (
                <span style={{
                  background: '#000', color: BR.accent, padding: '1px 6px', marginRight: 8,
                  fontFamily: brMono, fontSize: 10, letterSpacing: '0.16em', fontWeight: 700,
                }}>DM · EXEC</span>
              )}
              {m.body}
            </div>
          </div>
        ))}
        <div style={{
          padding: '12px 14px',
          fontFamily: brMono, fontSize: 11, color: BR.muted,
          textTransform: 'uppercase', letterSpacing: '0.1em',
          display: 'flex', justifyContent: 'space-between',
        }}>
          <span>END OF TRANSCRIPT · NOTHING FURTHER ON THE RECORD</span>
          <span>FILE · DCG-LOG-001</span>
        </div>
      </div>
    </section>
  )
}

// ─── Endorsements ────────────────────────────────────────────────────────
const ENDORSEMENTS: { q: string; who: string; where: string }[] = [
  { q: 'I closed Slack while playing this. The game continued anyway.',                         who: 'A SENIOR IC',           where: 'COMPANY THAT PIVOTED LAST WEEK' },
  { q: 'The first game my CEO has played that he describes as "strategic."',                   who: 'HEAD OF STRATEGY',      where: 'PRE-REVENUE, POST-VISION' },
  { q: 'It made me cry. I was also already crying.',                                            who: 'ENGINEERING MANAGER',   where: 'COMPANY ON ITS THIRD SERIES A' },
  { q: 'Finally, a workplace simulator that respects the work of pretending.',                  who: 'DIRECTOR, SPECIAL PROJECTS', where: 'PROJECT UNSPECIFIED' },
  { q: '10/10. Will circle back.',                                                              who: 'VP, CROSS-FUNCTIONAL',  where: 'FUNCTION UNCLEAR' },
  { q: 'Looped in my therapist. She has questions.',                                            who: 'PRODUCT MANAGER',       where: 'SERIES B SAAS' },
]

function Endorsements() {
  const isMobile = useIsMobile()
  const [featured, ...rest] = ENDORSEMENTS
  return (
    <section style={{ borderBottom: `4px solid ${BR.ink}` }}>
      <SectionStarter
        eyebrow="PULL-QUOTES · LOOSELY VERIFIED"
        title={<>ENDORSEMENTS.</>}
        meta="* SOURCES AVAILABLE NEVER"
      />

      {/* Featured pull-quote — gets the press-blurb treatment */}
      <div style={{
        background: BR.ink, color: BR.bg,
        padding: isMobile ? '28px 20px 24px' : '40px 32px 36px',
        borderBottom: `1px solid ${BR.ink}`,
        display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr auto', gap: isMobile ? 16 : 36, alignItems: 'end',
      }}>
        <div>
          <div style={{
            fontFamily: brFont, fontWeight: 900,
            fontSize: 'clamp(28px, 3.6vw, 52px)',
            lineHeight: 1.08, letterSpacing: '-0.02em',
            textTransform: 'uppercase',
          }}>
            <span style={{ color: BR.accent }}>"</span>
            {featured.q}
            <span style={{ color: BR.accent }}>"</span>
          </div>
          <div style={{
            marginTop: 18, fontFamily: brMono, fontSize: 12, color: '#aaa',
            textTransform: 'uppercase', letterSpacing: '0.14em',
          }}>
            — <b style={{ color: BR.bg }}>{featured.who}</b> · {featured.where}
          </div>
        </div>
        <div style={{
          fontFamily: brMono, fontSize: 11, color: BR.accent, fontWeight: 700,
          textTransform: 'uppercase', letterSpacing: '0.18em', textAlign: 'right',
          whiteSpace: 'nowrap',
        }}>
          FEATURED · 01 / {String(ENDORSEMENTS.length).padStart(2, '0')}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, 1fr)' }}>
        {rest.map((e, i) => (
          <div key={i} style={{
            padding: '28px 28px 24px',
            borderLeft: isMobile ? 'none' : (i % 2 ? `1px solid ${BR.ink}` : 'none'),
            borderBottom: `1px solid ${BR.ink}`,
            background: i === 0 || i === 3 ? BR.paper : BR.bg,
            display: 'grid', gridTemplateColumns: '90px 1fr', gap: 18,
          }}>
            <div style={{
              fontFamily: brFont, fontWeight: 900, fontSize: 88, lineHeight: 0.7,
              color: BR.accent, letterSpacing: '-0.04em',
            }}>{String(i + 2).padStart(2, '0')}</div>
            <div>
              <div style={{
                fontFamily: brFont, fontWeight: 900, fontSize: 24, lineHeight: 1.18,
                textTransform: 'uppercase', letterSpacing: '-0.015em', color: BR.ink,
              }}>"{e.q}"</div>
              <div style={{
                marginTop: 14, fontFamily: brMono, fontSize: 11, color: BR.muted,
                textTransform: 'uppercase', letterSpacing: '0.12em',
              }}>
                — <b style={{ color: BR.ink }}>{e.who}</b> · {e.where}
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}

// ─── FAQ ─────────────────────────────────────────────────────────────────
const FAQS: { q: string; a: string }[] = [
  {
    q: 'WILL THIS RUN ON A CHROMEBOOK OR OLD LAPTOP?',
    a: 'YES. IT IS A BROWSER GAME. IF YOUR LAPTOP CAN HOLD A GMAIL TAB, IT CAN HOLD A STANDUP.',
  },
  {
    q: 'HOW LONG IS ONE PLAYTHROUGH?',
    a: 'FIVE TO TEN MINUTES — ROUGHLY THE LENGTH OF THE STANDUP YOU ARE CURRENTLY IGNORING.',
  },
  {
    q: 'IS THERE A MOBILE VERSION?',
    a: 'NOT YET. THE GAME WAS BUILT FOR DESKTOP BECAUSE THE STANDUP IS A WORKPLACE PROBLEM, AND THE WORKPLACE IS WHERE THE KEYBOARDS ARE.',
  },
  {
    q: 'IS THIS SAFE FOR WORK?',
    a: 'AS SAFE AS THE WORK ITSELF. NO BLOOD, NO PROFANITY. EXTENSIVE PASSIVE-AGGRESSIVE EMAIL TONE.',
  },
  {
    q: 'CAN I PLAY OFFLINE?',
    a: 'THE FIRST LOAD FETCHES ~15 MB OF ASSETS. AFTER THAT, YOUR BROWSER CACHES IT — POOR WIFI IS FINE ONCE YOU’RE IN.',
  },
  {
    q: 'WILL FUTURE TITLES BE FREE?',
    a: 'YES. EVERY GAME FROM THIS STUDIO IS FREE. SUPPORT IS APPRECIATED VIA THE EMAIL SIGNUP AND BY SHARING THE LINK IN A SLACK CHANNEL WHERE IT WILL NOT BE READ.',
  },
]

function FAQ() {
  const isMobile = useIsMobile()
  return (
    <section id="faq" style={{ borderBottom: `4px solid ${BR.ink}` }}>
      <SectionStarter
        eyebrow="OBJECTION HANDLING · LEGALLY NON-BINDING"
        title={<>QUESTIONS<br />FROM THE FLOOR.</>}
        meta="SIX (6) ANSWERS · ZERO FOLLOWUPS BOOKED"
      />
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, 1fr)' }}>
        {FAQS.map((f, i) => (
          <div key={i} style={{
            padding: isMobile ? '20px' : '24px 28px 26px',
            borderLeft: isMobile ? 'none' : (i % 2 ? `1px solid ${BR.ink}` : 'none'),
            borderBottom: (isMobile ? i < FAQS.length - 1 : i < 4) ? `1px solid ${BR.ink}` : 'none',
            background: i % 2 ? BR.bg : BR.paper,
          }}>
            <div style={{
              fontFamily: brMono, fontSize: 11, color: BR.accent, fontWeight: 700,
              textTransform: 'uppercase', letterSpacing: '0.16em',
            }}>Q · {String(i + 1).padStart(2, '0')}</div>
            <div style={{
              marginTop: 8, fontFamily: brFont, fontWeight: 900,
              fontSize: 22, lineHeight: 1.15, letterSpacing: '-0.01em',
              textTransform: 'uppercase', color: BR.ink,
            }}>{f.q}</div>
            <div style={{
              marginTop: 10, fontFamily: brFont, fontSize: 15, lineHeight: 1.55,
              color: '#222',
            }}>{f.a}</div>
          </div>
        ))}
      </div>
    </section>
  )
}

// ─── Sticky bottom CTA — slides in once you scroll past the hero ─────────
function StickyPlayCTA() {
  const isMobile = useIsMobile()
  const [show, setShow] = useState(false)
  useEffect(() => {
    const hero = document.getElementById('top')
    if (!hero) return
    const obs = new IntersectionObserver(
      ([entry]) => setShow(!entry.isIntersecting),
      { threshold: 0.05 },
    )
    obs.observe(hero)
    return () => obs.disconnect()
  }, [])
  return (
    <div
      aria-hidden={!show}
      style={{
        position: 'sticky', bottom: 0, zIndex: 4,
        transform: show ? 'translateY(0)' : 'translateY(110%)',
        transition: 'transform 280ms cubic-bezier(0.2, 0.8, 0.2, 1)',
        background: BR.ink, color: BR.bg,
        borderTop: `2px solid ${BR.accent}`,
        display: 'flex', alignItems: 'stretch',
        fontFamily: brFont,
      }}
    >
      {!isMobile && (
        <div style={{
          padding: '12px 22px',
          display: 'flex', alignItems: 'center', gap: 14,
          fontFamily: brMono, fontSize: 11, color: '#aaa',
          textTransform: 'uppercase', letterSpacing: '0.12em',
          borderRight: `1px solid #333`, flex: 1,
        }}>
          <span style={{ color: BR.accent }}>●</span>
          <span>STILL READING.</span>
          <span style={{ color: BR.bg, fontWeight: 700 }}>YOU COULD JUST PLAY IT.</span>
        </div>
      )}
      <Link to="/play/blocked" style={{
        background: BR.accent, color: '#000',
        padding: '14px 28px',
        fontFamily: brFont, fontWeight: 900, fontSize: 16,
        textTransform: 'uppercase', letterSpacing: '0.04em',
        textDecoration: 'none',
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        flex: isMobile ? 1 : undefined,
      }}>▶ PLAY BLOCKED · FREE</Link>
    </div>
  )
}
