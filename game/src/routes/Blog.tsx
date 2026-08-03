// src/routes/Blog.tsx — the dev log index (/blog)
//
// Two lists, deliberately:
//   SHIPPED — written posts, as cards.
//   BACKLOG — lessons learned but not yet written up, as a table.
//
// The public backlog is the whole conceit of the page. A satire site about
// a company that ships status updates instead of work should absolutely
// publish its own unfinished ticket queue. It is also the honest shape of
// a dev log by someone still in the middle of learning.
//
// Content lives in content/posts.ts. This file is presentation only.

import { Link } from 'react-router-dom'
import {
  PageScroll, BR, brFont, brMono,
  Nav, Ticker, Signup, Closer, Footer, useIsMobile,
  type NavLink,
} from '../brutalist'
import { POSTS, BACKLOG, type Post, type BacklogItem } from '../content/posts'

const NAV_LINKS: NavLink[] = [
  { label: 'GAMES',   href: '/#games' },
  { label: 'DEV LOG', href: '#top', active: true },
  { label: 'ABOUT',   to: '/about' },
  { label: 'CONTACT', href: 'mailto:hello@dumbcorporategames.com' },
]

export default function Blog() {
  return (
    <PageScroll>
      <Nav links={NAV_LINKS} badge={<>● {POSTS.length} SHIPPED</>} />
      <Hero />
      <Ticker accent items={[
        'NO COMPUTER SCIENCE BACKGROUND',
        'NO ENGINE EXPERIENCE',
        'BUILDING ANYWAY',
        'EVERY MISTAKE DOCUMENTED',
        'INCLUDING THE EMBARRASSING ONES',
      ]} />
      <Shipped />
      <Backlog />
      <Ticker items={[
        'WORKS ON MY MACHINE',
        'SHOULD BE A QUICK FIX',
        'I WILL DOCUMENT IT LATER',
        'IT WAS WORKING YESTERDAY',
        'ONE MORE PLAYTEST',
        'SHIP IT',
      ]} dir="right" speed={50} />
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
        <span><b style={{ color: BR.ink }}>DEV LOG</b> · BUILD NOTES · UNEDITED</span>
        <span>AUTHOR · <b style={{ color: BR.ink }}>ANONYMOUS</b></span>
        <span>QUALIFICATIONS · <b style={{ color: BR.accent }}>NONE</b></span>
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
          <span>DEV LOG</span>
        </div>
        <h1 style={{
          margin: 0, fontFamily: brFont, fontWeight: 900,
          fontSize: 'clamp(50px, 12vw, 178px)',
          lineHeight: 0.86, letterSpacing: '-0.055em',
          textTransform: 'uppercase',
        }}>
          DEV LOG<span style={{ color: BR.accent }}>.</span>
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
          fontSize: 'clamp(18px, 1.9vw, 28px)', lineHeight: 1.3, fontWeight: 500,
          maxWidth: 860, color: BR.ink,
        }}>
          I had never made a game, taken a computer science class, or written a line
          of engine code. Then I made several. These are the build notes — what broke,
          why it broke, and what you could do differently on your own first attempt.
          <br />
          <span style={{ fontSize: '0.7em', color: BR.muted }}>
            No technical background needed. Every jargon word gets explained where it
            appears, and every post ends with things you can actually try.
          </span>
        </p>
        <div style={{
          borderTop: `2px solid ${BR.ink}`, borderBottom: `2px solid ${BR.ink}`,
          padding: '10px 0',
          fontFamily: brMono, fontSize: 11, lineHeight: 1.7,
          textTransform: 'uppercase', letterSpacing: '0.06em',
        }}>
          <Stat k="POSTS" v={String(POSTS.length)} />
          <Stat k="JARGON EXPLAINED" v={<b style={{ color: BR.green }}>ALL OF IT</b>} />
          <Stat k="MISTAKES HIDDEN" v={<b style={{ color: BR.green }}>0</b>} />
          <Stat k="STATUS" v={<b style={{ color: BR.green }}>● LEARNING</b>} />
        </div>
      </div>
    </section>
  )
}

function Stat({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
      <span style={{ color: BR.muted }}>{k}</span>
      <b>{v}</b>
    </div>
  )
}

// ─── Shipped posts ───────────────────────────────────────────────────────
function Shipped() {
  const isMobile = useIsMobile()
  return (
    <section id="posts" style={{ borderBottom: `4px solid ${BR.ink}`, background: BR.bg }}>
      <div style={{
        borderBottom: `1px solid ${BR.ink}`,
        padding: isMobile ? '24px 20px 18px' : '32px 32px 24px',
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
            {/* The array runs LOG-001 → LOG-015 and the label used to claim
                "NEWEST FIRST", which was simply false. Oldest-first is the
                right order for this log — 001 introduces it and the last one
                summarizes — so the label was the thing to fix, not the sort. */}
            {POSTS.length} POSTS · IN ORDER · START AT THE TOP
          </div>
          <h2 style={{
            margin: 0, fontFamily: brFont, fontWeight: 900,
            fontSize: 'clamp(40px, 7vw, 84px)', lineHeight: 0.92,
            letterSpacing: '-0.035em', textTransform: 'uppercase',
          }}>THE POSTS<span style={{ color: BR.accent }}>.</span></h2>
        </div>
        <div style={{
          fontFamily: brMono, fontSize: 11, color: BR.muted,
          textTransform: 'uppercase', letterSpacing: '0.1em',
          textAlign: isMobile ? 'left' : 'right', maxWidth: 300, lineHeight: 1.55,
        }}>
          WRITTEN AFTER THE FACT · WITH THE BENEFIT OF HINDSIGHT AND NONE OF THE DIGNITY
        </div>
      </div>
      <div>
        {POSTS.map((p, i) => <PostRow key={p.slug} p={p} i={i} />)}
      </div>
    </section>
  )
}

function PostRow({ p, i }: { p: Post; i: number }) {
  const isMobile = useIsMobile()
  // The newest post gets the ink treatment — one focal item per section
  // (design rule 2: orange and heavy weight are a budget, not a default).
  const lead = i === 0
  return (
    <Link
      to={`/blog/${p.slug}`}
      style={{
        display: 'grid',
        gridTemplateColumns: isMobile ? 'minmax(0, 1fr)' : '120px minmax(0, 1fr) 190px',
        gap: isMobile ? 10 : 28,
        padding: isMobile ? '22px 20px 26px' : '28px 32px 32px',
        borderTop: i ? `1px solid ${BR.ink}` : 'none',
        background: lead ? BR.ink : BR.bg,
        color: lead ? BR.bg : BR.ink,
        textDecoration: 'none',
      }}
    >
      <div style={{
        fontFamily: brMono, fontSize: 11, fontWeight: 700,
        textTransform: 'uppercase', letterSpacing: '0.14em',
        color: BR.accent, paddingTop: isMobile ? 0 : 6,
      }}>
        {p.key}
      </div>

      <div style={{ minWidth: 0 }}>
        <h3 style={{
          margin: 0, fontFamily: brFont, fontWeight: 900,
          fontSize: lead ? 'clamp(26px, 4vw, 46px)' : 'clamp(22px, 3vw, 34px)',
          lineHeight: 0.98, letterSpacing: '-0.035em', textTransform: 'uppercase',
          overflowWrap: 'anywhere', hyphens: 'auto',
        }}>
          {p.title}
        </h3>
        <p style={{
          margin: '12px 0 0', fontFamily: brFont,
          fontSize: lead ? 17 : 16, lineHeight: 1.5,
          color: lead ? '#ccc' : '#333', maxWidth: 660,
        }}>
          {p.dek}
        </p>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 14 }}>
          {p.tags.map((t) => (
            <span key={t} style={{
              fontFamily: brMono, fontSize: 10, fontWeight: 700,
              padding: '4px 8px', letterSpacing: '0.1em', textTransform: 'uppercase',
              border: `1px solid ${lead ? BR.bg : BR.ink}`,
              color: lead ? BR.bg : BR.ink,
            }}>{t}</span>
          ))}
        </div>
      </div>

      <div style={{
        fontFamily: brMono, fontSize: 11,
        textTransform: 'uppercase', letterSpacing: '0.1em',
        color: lead ? '#aaa' : BR.muted, lineHeight: 1.8,
        textAlign: isMobile ? 'left' : 'right',
        marginTop: isMobile ? 6 : 6,
      }}>
        <div>{p.date}</div>
        <div>{p.readMin} MIN READ</div>
        <div style={{
          marginTop: 8, color: BR.accent, fontWeight: 700,
        }}>READ →</div>
      </div>
    </Link>
  )
}

// ─── Backlog ─────────────────────────────────────────────────────────────
function Backlog() {
  const isMobile = useIsMobile()
  // Everything queued here has been written. Render nothing rather than an
  // empty "0 ITEMS · GROOMED NEVER" header, which would read as a bug.
  if (BACKLOG.length === 0) return null
  const TONE: Record<BacklogItem['status'], { bg: string; fg: string }> = {
    'NEXT UP':  { bg: BR.accent,  fg: '#000' },
    'DRAFTING': { bg: BR.ink,     fg: BR.accent },
    'BACKLOG':  { bg: '#e6e3da',  fg: BR.muted },
    'ICEBOX':   { bg: 'transparent', fg: BR.dim },
  }
  return (
    <section id="backlog" style={{ borderBottom: `4px solid ${BR.ink}`, background: BR.paper }}>
      <div style={{
        borderBottom: `1px solid ${BR.ink}`,
        padding: isMobile ? '24px 20px 18px' : '32px 32px 24px',
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
            BACKLOG · {BACKLOG.length} ITEMS · GROOMED NEVER
          </div>
          <h2 style={{
            margin: 0, fontFamily: brFont, fontWeight: 900,
            fontSize: 'clamp(40px, 7vw, 84px)', lineHeight: 0.92,
            letterSpacing: '-0.035em', textTransform: 'uppercase',
          }}>NOT WRITTEN YET.</h2>
        </div>
        <div style={{
          fontFamily: brMono, fontSize: 11, color: BR.muted,
          textTransform: 'uppercase', letterSpacing: '0.1em',
          textAlign: isMobile ? 'left' : 'right', maxWidth: 300, lineHeight: 1.55,
        }}>
          EVERY ROW IS A MISTAKE I ALREADY MADE · PUBLISHING THE QUEUE SO I ACTUALLY WRITE THEM
        </div>
      </div>

      {BACKLOG.map((b, i) => {
        const t = TONE[b.status]
        return (
          <div key={b.key} style={{
            display: 'grid',
            gridTemplateColumns: isMobile ? 'minmax(0, 1fr)' : '110px minmax(0, 1fr) 130px',
            gap: isMobile ? 8 : 24,
            padding: isMobile ? '18px 20px' : '20px 32px',
            borderTop: i ? `1px solid #d8d4c8` : 'none',
            alignItems: 'start',
          }}>
            <div style={{
              fontFamily: brMono, fontSize: 11, fontWeight: 700,
              textTransform: 'uppercase', letterSpacing: '0.14em', color: BR.muted,
              paddingTop: 3,
            }}>{b.key}</div>

            <div style={{ minWidth: 0 }}>
              <div style={{
                fontFamily: brFont, fontWeight: 900,
                fontSize: 'clamp(17px, 2.1vw, 23px)', lineHeight: 1.08,
                letterSpacing: '-0.02em', textTransform: 'uppercase',
                overflowWrap: 'anywhere',
              }}>{b.title}</div>
              <p style={{
                margin: '9px 0 0', fontFamily: brFont, fontSize: 15,
                lineHeight: 1.5, color: '#444', maxWidth: 640,
              }}>{b.note}</p>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 10 }}>
                {b.tags.map((tag) => (
                  <span key={tag} style={{
                    fontFamily: brMono, fontSize: 10, fontWeight: 700,
                    padding: '3px 7px', letterSpacing: '0.1em',
                    border: `1px solid ${BR.dim}`, color: BR.muted,
                  }}>{tag}</span>
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: isMobile ? 'flex-start' : 'flex-end', marginTop: isMobile ? 4 : 2 }}>
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                background: t.bg, color: t.fg,
                border: b.status === 'ICEBOX' ? `1px solid ${BR.dim}` : 'none',
                fontFamily: brMono, fontSize: 10, fontWeight: 700,
                padding: '5px 9px', letterSpacing: '0.12em', textTransform: 'uppercase',
                whiteSpace: 'nowrap',
              }}>● {b.status}</span>
            </div>
          </div>
        )
      })}

      {/* Not a link — an in-fiction dead end renders as a plain row, never
          href="#" (design rule 4). */}
      <div style={{
        borderTop: `1px solid ${BR.ink}`,
        padding: isMobile ? '18px 20px' : '18px 32px',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        gap: 20, flexWrap: 'wrap', background: BR.bg,
      }}>
        <div style={{
          fontFamily: brFont, fontWeight: 900, fontSize: 20,
          textTransform: 'uppercase', letterSpacing: '-0.005em',
        }}>
          ☐ GOT A QUESTION ABOUT ANY OF THIS? I WILL WRITE THAT ONE NEXT.
        </div>
        <a href="mailto:hello@dumbcorporategames.com" style={{
          background: BR.ink, color: BR.bg, border: 'none',
          padding: '12px 18px', textDecoration: 'none',
          fontFamily: brMono, fontWeight: 700, fontSize: 12,
          letterSpacing: '0.16em', textTransform: 'uppercase',
        }}>ASK →</a>
      </div>
    </section>
  )
}
