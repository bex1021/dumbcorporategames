// src/routes/About.tsx — the long-form about page (/about)
//
// The landing page's <AboutTheStudio> section is the JOKE version of this
// ("BUILT BY A CORPORATE SLAVE", four dead contact rows). This page is the
// version where the bit relaxes for a while and the actual reason the
// studio exists gets said out loud, then the bit resumes at the end.
//
// LAYOUT — two alternating modes, deliberately:
//   · Prose sections (<Section>) run in a SHELL-wide column centered in the
//     viewport. Section borders and backgrounds still go full-bleed, so the
//     brutalist rules stay edge-to-edge; only the *reading* is centered.
//   · Graphic sections (TheFacts, TheWeek, TheFile, Figures, WhatIPlayed,
//     TermsOfAnonymity, ReadNext) stay full-bleed. The alternation is the
//     page's rhythm — a wall of type is never more than one screen away
//     from something to look at.
//
// TONE — the site's usual register is deadpan corporate parody. Here the
// SECTION FURNITURE stays in that register (eyebrows, meta, the personnel-
// file framing) while the BODY PROSE is plain, sentence-case, and
// contracted. The contrast is the point: a redacted HR form with a real
// person inside it. Do NOT uppercase the narrative paragraphs — at this
// length caps stop being a style and start being a barrier.
//
// HUMOR IS LOAD-BEARING. An earlier draft was honest and unrelieved, and
// read as bleak rather than dry — a wall of grievance nobody finishes. The
// jokes are what make the sad parts land, so every prose section carries at
// least one. Rules for them:
//   · Indict the LANGUAGE, not the people. "De-layer, which manages to make
//     a person sound like a cake" is fair game; a joke at a laid-off
//     colleague's expense never is.
//   · The heavier the subject, the drier the delivery. Section 02 gets the
//     euphemism jokes precisely because it is the section about layoffs.
//   · Never undercut a confession in the same breath. The burnout paragraph
//     stays straight; the joke lands in the paragraph AFTER it ("my calendar
//     remained excellent"), which is how people actually tell it.
//   · Specificity is the engine. "Version eleven", "one of them had a logo",
//     "the physics thingy" — the funny thing is always a real detail, never
//     a general observation about how offices are bad.
//
// ANONYMITY CONTRACT — enforced here and in content/posts.ts:
//   No name. No employer, past or present. No job titles, industry, city,
//   or team size. Company-count and years-of-experience only at the coarse
//   granularity below. Nothing that could be correlated with a specific
//   public layoff, reorg, or team.

import { Link } from 'react-router-dom'
import {
  PageScroll, BR, brFont, brMono,
  Nav, Ticker, Signup, Closer, Footer, ScreenshotSlot, useIsMobile,
  type NavLink,
} from '../brutalist'
import { CAMPAIGN } from '../state/progress'

// Never hard-code the number of games in prose — Phase 4 lands and every
// "three" on the page silently becomes a lie. Read it from the campaign.
const GAME_COUNT = CAMPAIGN.length
const GAME_WORD = ['zero', 'one', 'two', 'three', 'four', 'five', 'six'][GAME_COUNT] ?? String(GAME_COUNT)

// The reading measure. ~72 characters at the body size below, which is the
// band where line-length stops fighting the reader. Section titles are sized
// to fit inside it (see Section) rather than the other way around.
const SHELL = 720

// Cross-page hash targets use a plain <a href> rather than <Link to>, because
// the router will navigate to "/" without honouring the #games scroll. A full
// load is the correct trade here — it is the only link on the page that needs
// the browser's own fragment handling.
const NAV_LINKS: NavLink[] = [
  { label: 'GAMES',   href: '/#games' },
  { label: 'DEV LOG', to: '/blog' },
  { label: 'ABOUT',   href: '#top', active: true },
  { label: 'CONTACT', href: 'mailto:hello@dumbcorporategames.com' },
]

export default function About() {
  return (
    <PageScroll>
      <Nav links={NAV_LINKS} badge={<>● PERSONNEL FILE</>} />
      <Hero />
      <Ticker accent items={[
        'NAME · WITHHELD',
        'EMPLOYER · WITHHELD',
        'TITLE · WITHHELD',
        'STILL EMPLOYED · YES',
        'GAME DEVELOPMENT EXPERIENCE · NONE',
        'REASON FOR FILING · SEE BELOW',
      ]} />
      <TheFacts />
      <WhatHappened />
      <TheWeek />
      <TheOtherSide />
      <TheFile />
      <WhyAGame />
      <Figures />
      <NotAGameDeveloper />
      <WhatIPlayed />
      <TermsOfAnonymity />
      <ReadNext />
      <Closer />
      <Signup />
      <Footer />
    </PageScroll>
  )
}

// ─── Hero ─────────────────────────────────────────────────────────────────
function Hero() {
  const isMobile = useIsMobile()
  return (
    <section id="top" style={{ borderBottom: `4px solid ${BR.ink}` }}>
      <div style={{
        padding: '16px 28px',
        borderBottom: `1px solid ${BR.ink}`,
        display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16,
        flexWrap: 'wrap',
        fontFamily: brMono, fontSize: 11,
        textTransform: 'uppercase', letterSpacing: '0.14em', color: BR.muted,
      }}>
        <span><b style={{ color: BR.ink }}>FORM 1-A</b> · PERSONAL STATEMENT · UNSOLICITED</span>
        <span>CLASSIFICATION · <b style={{ color: BR.ink }}>REDACTED BY AUTHOR</b></span>
        <span>DISTRIBUTION · <b style={{ color: BR.accent }}>DO NOT FORWARD TO HR</b></span>
      </div>

      <div style={{ padding: isMobile ? '18px 20px 4px' : '20px 28px 4px' }}>
        <div style={{
          fontFamily: brMono, fontSize: 11, color: BR.muted,
          textTransform: 'uppercase', letterSpacing: '0.16em',
          marginBottom: 10, display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap',
        }}>
          <Link to="/" style={{ color: BR.muted, textDecoration: 'none' }}>
            ← DUMB CORPORATE GAMES
          </Link>
          <span>·</span>
          <span>ABOUT</span>
        </div>
        <h1 style={{
          margin: 0, fontFamily: brFont, fontWeight: 900,
          fontSize: 'clamp(52px, 13vw, 190px)',
          lineHeight: 0.86, letterSpacing: '-0.055em',
          textTransform: 'uppercase',
        }}>
          ABOUT<span style={{ color: BR.accent }}>.</span>
        </h1>
      </div>

      <div style={{
        padding: isMobile ? '14px 20px 22px' : '16px 28px 26px',
        display: 'grid',
        gridTemplateColumns: isMobile ? 'minmax(0, 1fr)' : 'minmax(0, 1.5fr) minmax(280px, 1fr)',
        gap: isMobile ? 20 : 36, alignItems: 'end',
      }}>
        <p style={{
          margin: 0, fontFamily: brFont,
          fontSize: 'clamp(19px, 2vw, 30px)', lineHeight: 1.3, fontWeight: 500,
          maxWidth: 860, color: BR.ink,
        }}>
          Eight years. Four companies. Different titles, different logos, different
          all-hands. Somewhere around year five they stopped being distinguishable
          from each other.
        </p>
        <div style={{
          borderTop: `2px solid ${BR.ink}`, borderBottom: `2px solid ${BR.ink}`,
          padding: '10px 0',
          fontFamily: brMono, fontSize: 11, lineHeight: 1.7, color: BR.ink,
          textTransform: 'uppercase', letterSpacing: '0.06em',
        }}>
          <Row k="WHO WROTE THIS" v="WITHHELD" />
          <Row k="WHERE THEY WORK" v="WITHHELD" />
          <Row k="WHAT THEY DO" v="WITHHELD" />
          <Row k="WHY ANONYMOUS" v={<b style={{ color: BR.accent }}>STILL EMPLOYED</b>} />
        </div>
      </div>
    </section>
  )
}

function Row({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
      <span style={{ color: BR.muted }}>{k}</span>
      <b style={{ textAlign: 'right' }}>{v}</b>
    </div>
  )
}

// ─── Prose section furniture ─────────────────────────────────────────────
// Header strip and body share one SHELL-wide centered column, so the section
// title's left edge and the paragraph's left edge line up exactly. The
// section's own borders/background stay full-bleed.

function Section({
  id, eyebrow, title, meta, dark = false, children,
}: {
  id?: string
  eyebrow: string
  title: React.ReactNode
  meta?: React.ReactNode
  dark?: boolean
  children: React.ReactNode
}) {
  const isMobile = useIsMobile()
  const shell: React.CSSProperties = { maxWidth: SHELL, margin: '0 auto' }
  return (
    <section id={id} style={{
      borderBottom: `4px solid ${BR.ink}`,
      background: dark ? BR.ink : BR.bg,
      color: dark ? BR.bg : BR.ink,
    }}>
      <div style={{
        borderBottom: dark ? '1px solid #333' : `1px solid ${BR.ink}`,
        padding: isMobile ? '26px 20px 20px' : '38px 32px 26px',
      }}>
        <div style={shell}>
          <div style={{
            fontFamily: brMono, fontSize: 11, color: dark ? '#aaa' : BR.muted,
            textTransform: 'uppercase', letterSpacing: '0.16em', marginBottom: 12,
          }}>
            <span style={{ color: BR.accent, marginRight: 8 }}>●</span>{eyebrow}
          </div>
          {/* Sized to fit the SHELL, not the viewport — a clamp keyed to vw
              would overflow this column on wide screens. */}
          <h2 style={{
            margin: 0, fontFamily: brFont, fontWeight: 900,
            fontSize: 'clamp(30px, 5vw, 54px)', lineHeight: 0.98,
            letterSpacing: '-0.03em', textTransform: 'uppercase',
            overflowWrap: 'anywhere', hyphens: 'auto',
          }}>{title}</h2>
          {meta && (
            <div style={{
              marginTop: 14,
              fontFamily: brMono, fontSize: 11, color: dark ? '#aaa' : BR.muted,
              textTransform: 'uppercase', letterSpacing: '0.1em', lineHeight: 1.55,
            }}>{meta}</div>
          )}
        </div>
      </div>
      <div style={{ padding: isMobile ? '26px 20px 32px' : '38px 32px 46px' }}>
        <div style={shell}>{children}</div>
      </div>
    </section>
  )
}

function P({ children, dark = false }: { children: React.ReactNode; dark?: boolean }) {
  return (
    <p style={{
      margin: '0 0 20px', fontFamily: brFont,
      fontSize: 'clamp(17px, 1.3vw, 19px)', lineHeight: 1.62,
      color: dark ? '#ddd' : '#222', fontWeight: 400,
    }}>{children}</p>
  )
}

function Pull({ children, dark = false }: { children: React.ReactNode; dark?: boolean }) {
  return (
    <div style={{
      margin: '32px 0', paddingLeft: 20,
      borderLeft: `4px solid ${BR.accent}`,
      fontFamily: brFont, fontWeight: 700,
      fontSize: 'clamp(21px, 2.4vw, 29px)', lineHeight: 1.24,
      letterSpacing: '-0.015em',
      color: dark ? BR.bg : BR.ink,
    }}>{children}</div>
  )
}

// Shared header for the full-bleed graphic sections, so they don't each
// reinvent the eyebrow + title strip.
function GraphicHeader({
  eyebrow, title, meta, dark = false,
}: { eyebrow: string; title: string; meta?: string; dark?: boolean }) {
  const isMobile = useIsMobile()
  return (
    <div style={{
      padding: isMobile ? '24px 20px 18px' : '32px 32px 24px',
      borderBottom: dark ? '1px solid #333' : `1px solid ${BR.ink}`,
      display: 'grid',
      gridTemplateColumns: isMobile ? 'minmax(0, 1fr)' : 'minmax(0, 1fr) auto',
      gap: isMobile ? 14 : 32, alignItems: 'end',
    }}>
      <div>
        <div style={{
          fontFamily: brMono, fontSize: 11, color: dark ? '#aaa' : BR.muted,
          textTransform: 'uppercase', letterSpacing: '0.16em', marginBottom: 10,
        }}>
          <span style={{ color: BR.accent, marginRight: 8 }}>●</span>{eyebrow}
        </div>
        <h2 style={{
          margin: 0, fontFamily: brFont, fontWeight: 900,
          fontSize: 'clamp(32px, 6vw, 64px)', lineHeight: 0.95,
          letterSpacing: '-0.03em', textTransform: 'uppercase',
        }}>{title}</h2>
      </div>
      {meta && (
        <div style={{
          fontFamily: brMono, fontSize: 11, color: dark ? '#aaa' : BR.muted,
          textTransform: 'uppercase', letterSpacing: '0.1em',
          textAlign: isMobile ? 'left' : 'right',
          maxWidth: isMobile ? 'none' : 300, lineHeight: 1.55,
        }}>{meta}</div>
      )}
    </div>
  )
}

// ─── 01 · The facts ──────────────────────────────────────────────────────
function TheFacts() {
  const isMobile = useIsMobile()
  const FACTS: [string, string, string][] = [
    ['08', 'YEARS', 'IN OFFICES'],
    ['04', 'COMPANIES', 'ALL BLENDED TOGETHER'],
    ['00', 'GAMES', 'MADE BEFORE THIS ONE'],
    ['00', 'CS CLASSES', 'NOT ONE'],
  ]
  const cols = isMobile ? 2 : 4
  return (
    <section style={{ borderBottom: `4px solid ${BR.ink}`, background: BR.paper }}>
      <div style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
      }}>
        {FACTS.map(([n, k, sub], i) => (
          <div key={k} style={{
            padding: isMobile ? '20px' : '26px 26px 28px',
            borderLeft: i % cols === 0 ? 'none' : `1px solid ${BR.ink}`,
            borderTop: i >= cols ? `1px solid ${BR.ink}` : 'none',
          }}>
            <div style={{
              fontFamily: brFont, fontWeight: 900,
              fontSize: 'clamp(48px, 7vw, 84px)', lineHeight: 0.8,
              letterSpacing: '-0.06em', fontVariantNumeric: 'tabular-nums',
              color: i >= 2 ? BR.accent : BR.ink,
            }}>{n}</div>
            <div style={{
              marginTop: 12, fontFamily: brFont, fontWeight: 900,
              fontSize: 17, textTransform: 'uppercase', letterSpacing: '0.02em',
            }}>{k}</div>
            <div style={{
              marginTop: 4, fontFamily: brMono, fontSize: 11, color: BR.muted,
              textTransform: 'uppercase', letterSpacing: '0.1em', lineHeight: 1.5,
            }}>{sub}</div>
          </div>
        ))}
      </div>
    </section>
  )
}

// ─── 02 · What happened ──────────────────────────────────────────────────
function WhatHappened() {
  return (
    <Section
      eyebrow="SECTION 01 · EMPLOYMENT HISTORY"
      title={<>WHAT HAPPENED.</>}
      meta="EIGHT YEARS · FOUR COMPANIES · ONE FEELING"
    >
      <P>
        I wasn't bad at it. That's the part that took longest to work out. I was fine.
        Good reviews, hit my goals, could turn a genuinely terrible quarter into a
        deck where the word "learnings" appeared twice and nobody blinked.
      </P>
      <P>
        I just couldn't have told you what any of it was for.
      </P>
      <P>
        Four companies in eight years, in roles different enough that my resume reads
        like three careers stapled together, and by the end they'd merged in my memory
        into one composite job. I'd leave somewhere because it felt hollow, then turn
        up at the new place and find the hollowness had already been onboarded ahead
        of me. Same all-hands. Same slide about focus. Same senior person explaining
        that we needed to be more data-driven, to a room that had been data-driven for
        a decade and had the dashboards to prove it.
      </P>
      <P>
        I've been through six reorgs. I couldn't tell you what a single one of them
        changed. I could tell you all six names, because they all had names, and one
        of them had a logo.
      </P>
      <P>
        Other things I watched: projects funded with enormous ceremony and then killed
        quietly about eleven months later, with no announcement, ever — and everyone
        involved putting the dead thing on their promo packet anyway. Managers who
        were unkind in ways that would never survive being written down, which was
        precisely the skill. Promotions going to people whose main contribution was
        volume.
      </P>
      <Pull>
        The loudest people got promoted. The people doing the work got asked to write
        it up for them.
      </Pull>
      <P>
        Then there was the burnout, which I'm still not good at describing. It wasn't
        dramatic. No breakdown, no exit interview, no story worth telling at a party.
        I'd open my laptop, look at forty-one unread messages, and close it again.
        Then sit there. Completely capable of doing the work and completely unable to
        begin.
      </P>
      <P>
        My calendar, throughout this period, remained excellent. Fully booked. Green
        across the board. Nobody noticed a thing, which I've since decided says more
        about the calendar than it does about me.
      </P>
    </Section>
  )
}

// ─── Graphic interlude · the week ────────────────────────────────────────
// A calendar with no room in it. Static and hand-authored rather than
// generated, so the joke lands in the same place every time and press
// screenshots are reproducible.
function TheWeek() {
  const isMobile = useIsMobile()
  const DAYS = ['MON', 'TUE', 'WED', 'THU', 'FRI']
  const TIMES = ['9', '10', '11', '12', '1', '2', '3', '4']
  // null = empty slot. `hold` renders in accent as the one thing that keeps
  // getting booked over.
  type Slot = { t: string; hold?: boolean } | null
  const GRID: Slot[][] = [
    [{ t: 'STANDUP' }, { t: 'STANDUP' }, { t: 'STANDUP' }, { t: 'STANDUP' }, { t: 'STANDUP' }],
    [{ t: 'PRE-SYNC' }, { t: 'ALIGNMENT' }, { t: 'QUICK SYNC' }, { t: 'ALIGNMENT' }, { t: 'RETRO' }],
    [{ t: 'FOCUS TIME', hold: true }, { t: 'STAKEHOLDER' }, { t: 'FOCUS TIME', hold: true }, { t: 'OKR REVIEW' }, { t: 'DEEP DIVE' }],
    [{ t: 'LUNCH (WORKING)' }, { t: 'LUNCH (WORKING)' }, null, { t: 'LUNCH (WORKING)' }, { t: 'LUNCH (WORKING)' }],
    [{ t: '1:1' }, { t: 'WORKING SESSION' }, { t: '1:1' }, { t: 'PRE-READ REVIEW' }, { t: '1:1' }],
    [{ t: 'TOUCHBASE' }, { t: 'TOUCHBASE' }, { t: 'OFFSITE PREP' }, { t: 'TOUCHBASE' }, { t: 'SYNC' }],
    [{ t: 'SYNC (RECURRING)' }, null, { t: 'SYNC (RECURRING)' }, { t: 'DEBRIEF' }, { t: 'SYNC (RECURRING)' }],
    [{ t: 'HOLD' }, { t: 'READOUT' }, { t: 'HOLD' }, { t: 'READOUT' }, { t: 'HOLD' }],
  ]

  return (
    <section style={{ borderBottom: `4px solid ${BR.ink}`, background: BR.paper }}>
      <GraphicHeader
        eyebrow="FIG. A · TYPICAL WEEK · NOT EXAGGERATED"
        title="WHERE IT WENT."
        meta="TWO OPEN SLOTS · BOTH WILL BE FILLED BY TUESDAY"
      />
      <div style={{ padding: isMobile ? '16px 14px 22px' : '24px 32px 32px', overflowX: 'auto' }}>
        <div style={{ minWidth: isMobile ? 520 : 0 }}>
          {/* Day header row */}
          <div style={{
            display: 'grid', gridTemplateColumns: `36px repeat(5, minmax(0, 1fr))`, gap: 3,
            marginBottom: 3,
          }}>
            <div />
            {DAYS.map((d) => (
              <div key={d} style={{
                fontFamily: brMono, fontSize: 10, fontWeight: 700,
                letterSpacing: '0.14em', color: BR.muted, padding: '0 0 4px 2px',
              }}>{d}</div>
            ))}
          </div>
          {GRID.map((row, r) => (
            <div key={r} style={{
              display: 'grid', gridTemplateColumns: `36px repeat(5, minmax(0, 1fr))`, gap: 3,
              marginBottom: 3,
            }}>
              <div style={{
                fontFamily: brMono, fontSize: 10, color: BR.dim,
                display: 'flex', alignItems: 'center', justifyContent: 'flex-end',
                paddingRight: 6, fontVariantNumeric: 'tabular-nums',
              }}>{TIMES[r]}</div>
              {row.map((slot, c) => (
                <div key={c} style={{
                  height: isMobile ? 30 : 34,
                  background: slot ? (slot.hold ? BR.accent : BR.ink) : 'transparent',
                  border: slot ? 'none' : `1px dashed ${BR.dim}`,
                  color: slot?.hold ? '#000' : BR.bg,
                  fontFamily: brMono, fontSize: 9, fontWeight: 700,
                  letterSpacing: '0.06em',
                  display: 'flex', alignItems: 'center',
                  padding: '0 7px', overflow: 'hidden', whiteSpace: 'nowrap',
                }}>
                  {slot?.t ?? ''}
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
      <div style={{
        borderTop: `1px solid ${BR.ink}`,
        padding: isMobile ? '14px 20px' : '14px 32px',
        fontFamily: brMono, fontSize: 11, color: BR.muted,
        textTransform: 'uppercase', letterSpacing: '0.1em', lineHeight: 1.6,
      }}>
        <span style={{ color: BR.accent }}>■</span> FOCUS TIME · BOOKED OVER TWICE THIS WEEK ·
        {' '}NO WORK WAS PRODUCED IN ANY OF THE ABOVE
      </div>
    </section>
  )
}

// ─── 03 · The other side of the table ────────────────────────────────────
// The heaviest section on the page. Dark, and given the graphic that follows
// it, so it is not skimmed past inside the previous section's flow.
function TheOtherSide() {
  return (
    <Section
      dark
      eyebrow="SECTION 02 · THE PART I DON'T ENJOY WRITING"
      title={<>THE OTHER SIDE<br />OF THE TABLE.</>}
      meta="NO NAMES · NO COMPANY · NO DATES"
    >
      <P dark>
        I've seen a lot of people get laid off. Almost everyone my age has at this
        point, so that part isn't special. What sits with me is that for a while I was
        on the other side of it — one of the people helping work out who should be on
        the list.
      </P>
      <P dark>
        Not with any real power. Nobody hands you that. I was the person who produced
        the analysis that made a decision someone else had already made look
        defensible.
      </P>
      <P dark>
        You build a file. The file has names in it. Next to the names are columns, and
        the columns say things like scope and criticality and coverage, and every one
        of those words is working very hard not to say what it means. Nobody ever says
        "fire." The verbs on offer are impact, transition, right-size, and — my
        personal favorite — <i>de-layer</i>, which manages to make a person sound like
        a cake.
      </P>
      <P dark>
        The file I keep thinking about was called something like Org Health — Working
        Draft. It was version eleven.
      </P>
      <P dark>
        Everyone in the room is polite. Everyone's professional. There's no villain,
        which honestly made it worse, because I kept looking for one so I'd have
        somewhere to put it.
      </P>
      <Pull dark>
        I've watched competent people lose hope in real time. It isn't dramatic. It
        looks like someone who used to push back just not doing that anymore.
      </Pull>
      <P dark>
        A few years later I watched people who'd done nothing wrong leave with a box,
        and people who'd done almost nothing at all get promoted for being visible,
        and something I'd been circling for years finally landed.
      </P>
      <P dark>
        It's a game. It's always been a game. There are rules and they're not the ones
        in the handbook, and the people who go up are the ones who figured out the
        real ones early. The work was never the win condition. The work is the board.
      </P>
    </Section>
  )
}

// ─── Graphic interlude · the file ────────────────────────────────────────
// A paper document floating on the dark section that precedes it. The
// redaction bars are black because the artifact is a printout — which is
// also why this block is paper-colored rather than inked.
function TheFile() {
  const isMobile = useIsMobile()
  const COLS = ['SCOPE', 'CRITICALITY', 'COVERAGE']
  // Bar widths vary so the redactions read as different-length names.
  const ROWS: [number, string, string, string][] = [
    [0.82, 'BROAD', 'MEDIUM', 'DUPLICATED'],
    [0.61, 'NARROW', 'LOW', 'DUPLICATED'],
    [0.93, 'BROAD', 'HIGH', 'SINGLE POINT'],
    [0.55, 'NARROW', 'LOW', 'DUPLICATED'],
    [0.74, 'MEDIUM', 'MEDIUM', 'DUPLICATED'],
    [0.68, 'NARROW', 'LOW', 'DUPLICATED'],
  ]
  return (
    <section style={{ borderBottom: `4px solid ${BR.ink}`, background: BR.ink }}>
      <div style={{ padding: isMobile ? '28px 20px 32px' : '44px 32px 52px' }}>
        <div style={{ maxWidth: 860, margin: '0 auto' }}>
          <div style={{
            background: BR.paper, color: BR.ink,
            border: `2px solid ${BR.ink}`,
            boxShadow: '10px 10px 0 rgba(0,0,0,0.35)',
          }}>
            <div style={{
              borderBottom: `1px solid ${BR.ink}`,
              padding: isMobile ? '14px 16px' : '16px 22px',
              display: 'flex', justifyContent: 'space-between', gap: 14, flexWrap: 'wrap',
              fontFamily: brMono, fontSize: 10, fontWeight: 700,
              textTransform: 'uppercase', letterSpacing: '0.14em',
            }}>
              <span>PRELIMINARY IMPACT ANALYSIS · DRAFT 4</span>
              <span style={{ color: BR.accent }}>DO NOT DISTRIBUTE</span>
            </div>

            <div style={{ padding: isMobile ? '14px 16px 18px' : '20px 22px 24px', overflowX: 'auto' }}>
              <div style={{ minWidth: isMobile ? 460 : 0 }}>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'minmax(0, 1.6fr) repeat(3, minmax(0, 1fr))',
                  gap: 12, paddingBottom: 8, borderBottom: `1px solid ${BR.ink}`,
                  fontFamily: brMono, fontSize: 10, fontWeight: 700,
                  textTransform: 'uppercase', letterSpacing: '0.12em', color: BR.muted,
                }}>
                  <div>NAME</div>
                  {COLS.map((c) => <div key={c}>{c}</div>)}
                </div>
                {ROWS.map(([w, a, b, c], i) => (
                  <div key={i} style={{
                    display: 'grid',
                    gridTemplateColumns: 'minmax(0, 1.6fr) repeat(3, minmax(0, 1fr))',
                    gap: 12, alignItems: 'center',
                    padding: '11px 0',
                    borderBottom: i < ROWS.length - 1 ? `1px dashed ${BR.dim}` : 'none',
                  }}>
                    {/* The redaction. aria-label so this isn't a mystery to
                        a screen reader. */}
                    <div
                      role="img"
                      aria-label="Name redacted"
                      style={{ height: 13, width: `${w * 100}%`, background: BR.ink }}
                    />
                    {[a, b, c].map((v, k) => (
                      <div key={k} style={{
                        fontFamily: brMono, fontSize: 11, letterSpacing: '0.08em',
                        textTransform: 'uppercase', color: '#333',
                      }}>{v}</div>
                    ))}
                  </div>
                ))}
              </div>
            </div>

            <div style={{
              borderTop: `1px solid ${BR.ink}`,
              padding: isMobile ? '13px 16px' : '14px 22px',
              display: 'flex', justifyContent: 'space-between', gap: 14, flexWrap: 'wrap',
              alignItems: 'center',
              fontFamily: brMono, fontSize: 10,
              textTransform: 'uppercase', letterSpacing: '0.12em', color: BR.muted,
            }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                PREPARED BY
                <span
                  role="img"
                  aria-label="Name redacted"
                  style={{ display: 'inline-block', height: 11, width: 96, background: BR.ink }}
                />
              </span>
              <span>NOT A REAL DOCUMENT · NO REAL NAMES WERE EVER IN IT</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

// ─── 04 · Why a game ─────────────────────────────────────────────────────
function WhyAGame() {
  return (
    <Section
      eyebrow="SECTION 03 · JUSTIFICATION FOR SPEND"
      title={<>SO I MADE IT<br />LITERAL.</>}
      meta="COPING MECHANISM · CAPITALIZED AS AN ASSET"
    >
      <P>
        So make it a game. Actually literally. Give it meters, give it a win
        condition, put the scoring system everyone pretends doesn't exist right there
        on screen, and let the player watch Alignment climb while every other number
        quietly drops.
      </P>
      <P>
        That's it. That's the whole design. There's nothing clever underneath it.
      </P>
      <P>
        You play someone earnest with seventy-five minutes to get five colleagues
        through the morning before standup. Nobody's hiding anything. Every one of
        them opens with "no blockers," because that's the phrase, and then immediately
        describes the blocker — because they're not liars, they're just employees.
      </P>
      <P>
        So the game isn't working out who's telling the truth. It's deciding what to
        do about it, and that's the part that turned out to be a game. Every problem
        has three or four available responses and all of them work. You can go clarify
        the requirement, which genuinely fixes it and costs you twenty minutes you
        don't have. You can open a ticket, which converts despair into governance. You
        can schedule a quick sync, which spawns a sub-sync — that's a real mechanic,
        because it's a real thing that happens. Or you can say "great, sounds like no
        blockers," keep the status GREEN, and let reality file a complaint two
        conversations later.
      </P>
      <Pull>
        Every option is technically correct. Every option helps the project on paper.
        The costs are all somewhere else — on the humans, on the calendar, on next
        week.
      </Pull>
      <P>
        And the game shows you the price before you pay it. Each choice lists exactly
        what it'll do to Project Status, to Team Pissed-Off, to Meeting Load, to the
        clock. You are never tricked. You just watch yourself pick the cheap answer
        anyway, because standup is in forty minutes — and then sit with that for a
        second, because you've done it in real life too.
      </P>
      <P>
        I didn't invent any of this. I wrote down eight years of observation and it
        turned out to already be a game design, difficulty curve included. The
        stakeholder whose
        sign-off you need before you're allowed to start. The errand you run for
        someone three levels up because that's faster than explaining why you
        shouldn't. Managing upward on a deadline that isn't physically possible, when
        saying so out loud is career-limiting. Everyone's done all of these. Nobody
        gets credit for any of them, and they're most of the job.
      </P>
      <Pull>
        Who hasn't spent a year on something they knew was pointless? That's not a
        confession. That's the median career.
      </Pull>
      <P>
        Turning it into something you play is the first time any of it has felt
        useful. I can't fix how offices work — I've read enough books by people
        confident they can. I can make a small free five-minute thing that says yes,
        that happened, and it was as absurd as you thought it was at the time. Turns
        out that's worth a lot on a Sunday night.
      </P>
    </Section>
  )
}

// ─── Graphic interlude · figures ─────────────────────────────────────────
// Two real captures from the game, chosen because they *are* the argument
// the section above just made: the calendar that eats you, and a
// retrospective that scores you on the wrong thing.
function Figures() {
  const isMobile = useIsMobile()
  const FIGS = [
    {
      code: 'FIG. B',
      src: '/screenshots/04-calendar.png',
      pos: 'center',
      title: 'THE SCORING SYSTEM, ON SCREEN',
      cap: 'Every option costs something. The game just tells you what, which is the only difference between this and a Tuesday.',
    },
    {
      code: 'FIG. C',
      src: '/screenshots/05-standup.png',
      // Tall capture with everything meaningful at the top — crop upward.
      pos: 'top',
      title: 'THE TEAM IS ALIGNED. NO ONE IS OKAY.',
      cap: 'The end-of-run retrospective. Project status 80. Team sentiment: 10 pissed-off. Both numbers are going in the same report.',
    },
  ]
  return (
    <section style={{ borderBottom: `4px solid ${BR.ink}`, background: BR.ink, color: BR.bg }}>
      <div style={{
        display: 'grid',
        gridTemplateColumns: isMobile ? 'minmax(0, 1fr)' : 'repeat(2, minmax(0, 1fr))',
      }}>
        {FIGS.map((f, i) => (
          <div key={f.code} style={{
            borderLeft: !isMobile && i ? `1px solid #333` : 'none',
            borderTop: isMobile && i ? `1px solid #333` : 'none',
            display: 'flex', flexDirection: 'column',
          }}>
            <div style={{
              padding: isMobile ? '18px 20px 12px' : '22px 26px 14px',
              borderBottom: `2px solid ${BR.accent}`,
            }}>
              <div style={{
                fontFamily: brMono, fontSize: 11, fontWeight: 700,
                letterSpacing: '0.16em', textTransform: 'uppercase', color: BR.accent,
              }}>{f.code}</div>
              <div style={{
                marginTop: 8, fontFamily: brFont, fontWeight: 900,
                fontSize: 'clamp(19px, 2.2vw, 27px)', lineHeight: 1.02,
                letterSpacing: '-0.025em', textTransform: 'uppercase',
                overflowWrap: 'anywhere',
              }}>{f.title}</div>
            </div>
            <div style={{ position: 'relative' }}>
              <ScreenshotSlot
                src={f.src}
                alt={f.title}
                height={isMobile ? 220 : 300}
                objectPosition={f.pos}
              />
            </div>
            <div style={{
              padding: isMobile ? '14px 20px 20px' : '16px 26px 24px',
              fontFamily: brFont, fontSize: 14, lineHeight: 1.55, color: '#bbb',
            }}>{f.cap}</div>
          </div>
        ))}
      </div>
    </section>
  )
}

// ─── 05 · Not a game developer ───────────────────────────────────────────
function NotAGameDeveloper() {
  const isMobile = useIsMobile()
  return (
    <Section
      eyebrow="SECTION 04 · SCOPE LIMITATION · READ THIS ONE"
      title={<>I AM NOT AN<br />INDIE DEVELOPER.</>}
      meta="NOT A CLAIM I'M MAKING · NOT A TITLE I WANT"
    >
      <P>
        I'd rather say this myself than have it said about me.
      </P>
      <P>
        These games were built with AI. Most of the code is generated. I've never
        written a line of engine code, I didn't know what a draw call was six months
        ago, and there are terms sitting in my own project files I'd have to look up
        before using one out loud. I have written the phrase "the physics thingy" in
        my own commit messages. More than once.
      </P>
      <P>
        I know how a lot of the games community feels about that, and I'm not going to
        argue with it. The objection is mostly about generated work getting passed off
        as craft, and about competing for the same attention and shelf space and
        festival slots as people who spent ten years learning this properly. That's
        fair. I'm not going to pretend it isn't.
      </P>
      <P>
        So — I'm not competing with you. Nothing here is for sale. Nothing's being
        submitted anywhere. I haven't called myself a developer on this site and I'm
        not going to start. There's no studio; the mission statement on the front page
        is a joke and the LLC is, as advertised, pending.
      </P>
      <Pull>
        Treat this as an art project rather than a game. That's what it is, and it's
        the frame I'd ask you to use.
      </Pull>
      <P>
        What I actually am is someone with a corporate job messing around with an idea
        on evenings and weekends under a fake studio name, because the idea wouldn't
        leave me alone. Making it has taught me more about how games work than twenty
        years of playing them did. Everything I got wrong is going in the dev log,
        which is currently the most honest performance review I've ever taken part in.
      </P>
      <div style={{
        marginTop: 34,
        border: `2px solid ${BR.ink}`, background: BR.paper,
        padding: isMobile ? '18px' : '22px 26px',
      }}>
        <div style={{
          fontFamily: brMono, fontSize: 11, fontWeight: 700,
          textTransform: 'uppercase', letterSpacing: '0.16em', color: BR.accent,
          marginBottom: 10,
        }}>
          IF YOU MAKE GAMES FOR REAL
        </div>
        <div style={{
          fontFamily: brFont, fontSize: 17, lineHeight: 1.55, color: '#222',
        }}>
          I'd rather hear from you than not. If something here is wrong, badly made,
          or uses a word incorrectly, tell me and I'll fix it and credit the
          correction in the dev log.{' '}
          <a href="mailto:hello@dumbcorporategames.com" style={{ color: BR.ink }}>
            hello@dumbcorporategames.com
          </a>.
        </div>
      </div>
    </Section>
  )
}

// ─── 06 · What I played ──────────────────────────────────────────────────
function WhatIPlayed() {
  const isMobile = useIsMobile()
  // Deliberately genre-mixed and unpretentious — the point of the section is
  // that this is a player's résumé, not a developer's.
  const PLAYED = [
    'STREET FIGHTER', 'MORTAL KOMBAT', 'GTA', 'SUPER SMASH BROS',
    'TEMPLE RUN', 'EVERY RPG WITH A SAVE FILE',
  ]
  const cols = isMobile ? 2 : 3
  return (
    <section style={{ borderBottom: `4px solid ${BR.ink}`, background: BR.bg }}>
      <GraphicHeader
        eyebrow="SECTION 05 · RELEVANT EXPERIENCE · SUCH AS IT IS"
        title="THE ONLY TRAINING I HAVE."
        meta="NO CREDENTIALS · TWENTY YEARS OF PLAYING"
      />
      <div style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
        borderBottom: `1px solid ${BR.ink}`,
      }}>
        {PLAYED.map((g, i) => (
          <div key={g} style={{
            padding: isMobile ? '18px 16px' : '22px 24px',
            borderLeft: i % cols === 0 ? 'none' : `1px solid ${BR.ink}`,
            borderTop: i >= cols ? `1px solid ${BR.ink}` : 'none',
            minHeight: 96, display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
          }}>
            <div style={{
              fontFamily: brMono, fontSize: 10, color: BR.muted,
              letterSpacing: '0.14em',
            }}>·0{i + 1}</div>
            <div style={{
              marginTop: 12,
              fontFamily: brFont, fontWeight: 900,
              fontSize: 'clamp(17px, 2vw, 24px)', lineHeight: 1.0,
              letterSpacing: '-0.02em', textTransform: 'uppercase',
              overflowWrap: 'anywhere', hyphens: 'auto',
            }}>{g}</div>
          </div>
        ))}
      </div>
      <div style={{ padding: isMobile ? '26px 20px 32px' : '38px 32px 44px' }}>
        <div style={{ maxWidth: SHELL, margin: '0 auto' }}>
          <P>
            That's the list. Fighting games, an endless runner, an open-world driving
            game, and a lot of RPGs — which, next to what I ended up making, is less
            "inspiration" and more "the receipts." I didn't plan a tribute. I planned
            a few short games about a morning at work and they came out looking
            exactly like my childhood.
          </P>
          <P>
            No computer science. Not one class, not one tutorial finished all the way
            through. Just someone who's loved games for a long time and finally had
            something specific to say — and a day job that kept supplying material
            whether I asked for it or not.
          </P>
        </div>
      </div>
    </section>
  )
}

// ─── 07 · Terms of anonymity ─────────────────────────────────────────────
// Back in full deadpan. The mask going back on, deliberately, as the last
// thing on the page before the CTAs.
function TermsOfAnonymity() {
  const isMobile = useIsMobile()
  const TERMS: [string, string][] = [
    ['NAME', 'WILL NOT BE PROVIDED. NOT A BIT — AN EMPLOYMENT CONTRACT.'],
    ['EMPLOYER', 'CURRENT AND PAST, WITHHELD. INDEFINITELY.'],
    ['THE COWORKERS', 'COMPOSITES. IF YOU RECOGNIZE ONE, THAT IS A STATEMENT ABOUT OFFICES, NOT ABOUT MINE.'],
    ['THE STANDUPS', 'NOT NECESSARILY THE STANDUPS ON THIS WEEK’S CALENDAR. FOR HOPEFULLY OBVIOUS REASONS.'],
    ['CONTACT', 'ONE EMAIL ADDRESS. ANONYMOUS TIPS AND BUG REPORTS WELCOME.'],
    ['IF WE HAVE MET', 'WE HAVE NOT.'],
  ]
  return (
    <section style={{ borderBottom: `4px solid ${BR.ink}`, background: BR.ink, color: BR.bg }}>
      <GraphicHeader
        dark
        eyebrow="SECTION 06 · TERMS · NON-NEGOTIABLE"
        title="TERMS OF ANONYMITY."
        meta="NDA WITH SELF · REVIEWED NEVER"
      />
      <div style={{ padding: isMobile ? '20px 20px 28px' : '26px 32px 36px' }}>
        {TERMS.map(([k, v], i) => (
          <div key={k} style={{
            display: 'grid',
            gridTemplateColumns: isMobile ? 'minmax(0, 1fr)' : '190px minmax(0, 1fr)',
            gap: isMobile ? 4 : 24,
            padding: '14px 0',
            borderTop: i ? '1px dashed #444' : 'none',
          }}>
            <div style={{
              fontFamily: brMono, fontSize: 11, fontWeight: 700,
              textTransform: 'uppercase', letterSpacing: '0.14em', color: BR.accent,
            }}>{k}</div>
            <div style={{
              fontFamily: brFont, fontSize: 15, lineHeight: 1.5, color: '#ddd',
              textTransform: 'uppercase', letterSpacing: '0.01em',
            }}>{v}</div>
          </div>
        ))}
      </div>
    </section>
  )
}

// ─── 08 · Read next ──────────────────────────────────────────────────────
// Two destinations, one orange (design rule 2 — orange marks THE focal
// element of a section, so the dev log gets it and PLAY does not; this page
// is read by people who just finished a personal essay, and the log is the
// closer match for what they want next).
function ReadNext() {
  const isMobile = useIsMobile()
  return (
    <section style={{ borderBottom: `4px solid ${BR.ink}` }}>
      <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row' }}>
        <Link to="/blog" style={{
          flex: 1, textDecoration: 'none',
          background: BR.accent, color: '#000',
          padding: isMobile ? '24px 20px' : '30px 32px',
          display: 'flex', flexDirection: 'column', gap: 8,
        }}>
          <span style={{
            fontFamily: brMono, fontSize: 11, fontWeight: 700,
            textTransform: 'uppercase', letterSpacing: '0.16em',
          }}>NEXT · THE DEV LOG</span>
          <span style={{
            fontFamily: brFont, fontWeight: 900,
            fontSize: 'clamp(24px, 3.2vw, 38px)', lineHeight: 1.0,
            letterSpacing: '-0.03em', textTransform: 'uppercase',
          }}>HOW I LEARNED TO<br />MAKE GAMES →</span>
          <span style={{
            fontFamily: brFont, fontSize: 15, lineHeight: 1.45, marginTop: 4, maxWidth: 420,
          }}>
            Build notes from someone with no business doing this. Everything that
            broke, and why.
          </span>
        </Link>
        <Link to="/play" style={{
          flex: 1, textDecoration: 'none',
          background: BR.ink, color: BR.bg,
          borderLeft: isMobile ? 'none' : `1px solid ${BR.ink}`,
          padding: isMobile ? '24px 20px' : '30px 32px',
          display: 'flex', flexDirection: 'column', gap: 8,
        }}>
          <span style={{
            fontFamily: brMono, fontSize: 11, fontWeight: 700,
            textTransform: 'uppercase', letterSpacing: '0.16em', color: '#aaa',
          }}>OR · THE GAMES THEMSELVES</span>
          <span style={{
            fontFamily: brFont, fontWeight: 900,
            fontSize: 'clamp(24px, 3.2vw, 38px)', lineHeight: 1.0,
            letterSpacing: '-0.03em', textTransform: 'uppercase',
          }}>PLAY THE<br />MORNING ▶</span>
          <span style={{
            fontFamily: brFont, fontSize: 15, lineHeight: 1.45, marginTop: 4,
            color: '#ccc', maxWidth: 420,
          }}>
            {GAME_WORD.charAt(0).toUpperCase() + GAME_WORD.slice(1)} short browser
            games, 9:00 AM to noon. Free, no install, no account.
          </span>
        </Link>
      </div>
    </section>
  )
}
