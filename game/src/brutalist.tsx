// src/brutalist.tsx — shared brutalist UI for the studio site.
//
// Lives in the production codebase, NOT the design canvas. Routes that
// import from here:
//   - routes/Landing.tsx (main studio landing — /)
//   - routes/Blocked.tsx (Blocked info page    — /blocked)
//
// Both pages share this kit so any visual change here (palette, type,
// nav, mission, signup, footer) flows through to both.
//
// Visual language:
//   Helvetica · Black on warm off-white · Safety-orange accent.
//   Hard 1–4px rules. All-caps headers. No rounded corners.
//   IBM Plex Mono for labels and supporting text.

import { useState, useEffect, useRef } from 'react'
import type { ReactNode, CSSProperties } from 'react'
import { Link } from 'react-router-dom'

// ─── Palette + fonts ──────────────────────────────────────────────────────
export const BR = {
  bg:     '#f1f0ec',
  paper:  '#faf8f3',
  ink:    '#000',
  rule:   '#000',
  muted:  '#5a5a5a',
  dim:    '#8a8a8a',
  accent: '#FF4500', // safety orange
  green:  '#0a7a3b',
} as const

export const brFont = '"Helvetica Neue", Helvetica, Inter, Arial, sans-serif'
export const brMono = '"IBM Plex Mono", "SF Mono", ui-monospace, Menlo, monospace'

// Load Inter (Helvetica substitute) + IBM Plex Mono via Google Fonts once.
// Cheap and avoids shipping woff2 in the repo.
let fontsInjected = false
export function useBrutalistFonts() {
  useEffect(() => {
    if (fontsInjected) return
    const l = document.createElement('link')
    l.rel = 'stylesheet'
    l.href =
      'https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;700&family=Inter:wght@500;700;900&display=swap'
    document.head.appendChild(l)
    fontsInjected = true
  }, [])
}

// ─── Responsive — single phone breakpoint for the marketing site ─────────
// Inline styles can't hold media queries, so layout components call this and
// switch their columns / font sizes when the viewport is phone-width.
export function useIsMobile(breakpoint = 760) {
  const [isMobile, setIsMobile] = useState(
    typeof window !== 'undefined' && window.innerWidth < breakpoint,
  )
  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${breakpoint - 1}px)`)
    const handler = () => setIsMobile(mq.matches)
    handler()
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [breakpoint])
  return isMobile
}

// ─── Accessibility floor for the marketing pages ─────────────────────────
// Inline styles can't express :focus-visible or media queries, so PageScroll
// injects one small global sheet:
//   · a visible safety-orange focus ring on every interactive element
//     (the Signup input previously set outline:none with no replacement —
//     keyboard users had NO focus indicator anywhere on the site)
//   · marquees (.br-marquee) freeze under prefers-reduced-motion; they are
//     decorative repetition, so a static first frame loses nothing
let a11yInjected = false
function useBrutalistA11y() {
  useEffect(() => {
    if (a11yInjected) return
    const s = document.createElement('style')
    s.textContent = `
      .br-page :is(a, button, input, [tabindex]):focus-visible {
        outline: 3px solid ${BR.accent};
        outline-offset: 2px;
      }
      @media (prefers-reduced-motion: reduce) {
        .br-marquee { animation: none !important; }
      }
    `
    document.head.appendChild(s)
    a11yInjected = true
  }, [])
}

// ─── Page scroll wrapper ──────────────────────────────────────────────────
// The app's index.css sets `overflow: hidden` on html/body/#root so the 3D
// game stays anchored. The marketing routes need to scroll — wrap them in
// this and they get their own scroll context inside the locked root.
export function PageScroll({ children }: { children: ReactNode }) {
  useBrutalistFonts()
  useBrutalistA11y()
  return (
    <div
      className="br-page"
      style={{
        position: 'fixed',
        inset: 0,
        overflowY: 'auto',
        background: BR.bg,
        color: BR.ink,
        fontFamily: brFont,
      }}
    >
      {children}
    </div>
  )
}

// ─── Atoms ────────────────────────────────────────────────────────────────
export function HR({ thick = 1 }: { thick?: number }) {
  return <div style={{ height: thick, background: BR.rule, width: '100%' }} />
}

export const ctaPrimary: CSSProperties = {
  appearance: 'none', border: 'none', background: BR.ink, color: BR.bg,
  padding: '22px 26px', fontFamily: brFont, fontWeight: 900, fontSize: 18,
  textTransform: 'uppercase', letterSpacing: '0.04em', cursor: 'pointer',
  textDecoration: 'none', display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
}
export const ctaSecondary: CSSProperties = {
  appearance: 'none', border: 'none', borderLeft: `1px solid ${BR.ink}`,
  background: BR.bg, color: BR.ink,
  padding: '22px 26px', fontFamily: brFont, fontWeight: 900, fontSize: 18,
  textTransform: 'uppercase', letterSpacing: '0.04em', cursor: 'pointer',
  textDecoration: 'none', display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
}

// Section starter strip — orange-dotted eyebrow + giant title + meta on right.
export function SectionStarter({
  eyebrow, title, meta, dark = false,
}: {
  eyebrow: string
  title: ReactNode
  meta?: ReactNode
  dark?: boolean
}) {
  const isMobile = useIsMobile()
  return (
    <div style={{
      borderTop: `4px solid ${BR.ink}`,
      borderBottom: `1px solid ${BR.ink}`,
      background: dark ? BR.ink : BR.bg,
      color: dark ? BR.bg : BR.ink,
      padding: isMobile ? '24px 20px 18px' : '32px 32px 24px',
      display: 'grid',
      gridTemplateColumns: isMobile ? '1fr' : '1fr auto',
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
          fontSize: 'clamp(38px, 9vw, 72px)', lineHeight: 0.95, letterSpacing: '-0.03em', textTransform: 'uppercase',
        }}>{title}</h2>
      </div>
      {meta && (
        <div style={{
          fontFamily: brMono, fontSize: 11, color: dark ? '#aaa' : BR.muted,
          textTransform: 'uppercase', letterSpacing: '0.1em',
          textAlign: isMobile ? 'left' : 'right',
          maxWidth: isMobile ? 'none' : 280, lineHeight: 1.55,
        }}>{meta}</div>
      )}
    </div>
  )
}

// ─── Ticker — scrolling marquee strip ────────────────────────────────────
export function Ticker({
  items, accent = false, dir = 'left', speed = 40,
}: {
  items: string[]
  accent?: boolean
  dir?: 'left' | 'right'
  speed?: number
}) {
  const full = [...items, ...items]
  const anim = dir === 'right' ? 'br-ticker-right' : 'br-ticker-left'
  return (
    <div style={{
      borderTop: `1px solid ${BR.rule}`,
      borderBottom: `1px solid ${BR.rule}`,
      background: accent ? BR.accent : BR.bg,
      color: accent ? '#000' : BR.ink,
      overflow: 'hidden', whiteSpace: 'nowrap',
      fontFamily: brMono, fontSize: 12, fontWeight: 700,
      letterSpacing: '0.1em', textTransform: 'uppercase',
      padding: '9px 0',
    }}>
      <style>{`
        @keyframes br-ticker-left  { from{transform:translateX(0)}      to{transform:translateX(-50%)} }
        @keyframes br-ticker-right { from{transform:translateX(-50%)}   to{transform:translateX(0)}    }
      `}</style>
      <div className="br-marquee" style={{
        display: 'inline-flex', gap: 28,
        animation: `${anim} ${speed}s linear infinite`,
        willChange: 'transform',
      }}>
        {full.map((x, i) => (
          <span key={i}>{x} <span style={{ opacity: 0.4, margin: '0 4px' }}>◆</span></span>
        ))}
      </div>
    </div>
  )
}

// ─── Nav — used by both pages, with optional link highlight ──────────────
// `links` accepts either `{label, href}` (internal) or `{label, to}` (router).
export type NavLink = { label: string; href?: string; to?: string; active?: boolean }

export function Nav({ links, badge }: { links: NavLink[]; badge?: ReactNode }) {
  const isMobile = useIsMobile()
  return (
    <header style={{
      position: 'sticky', top: 0, zIndex: 5,
      borderBottom: `1px solid ${BR.rule}`,
      background: BR.bg,
      padding: isMobile ? '12px 18px' : '14px 28px',
      display: 'flex', alignItems: 'center', gap: isMobile ? 10 : 24,
      flexWrap: 'wrap',
      fontFamily: brFont,
    }}>
      <a href="/" style={{
        order: 0,
        fontFamily: brFont, fontWeight: 900, fontSize: 14, letterSpacing: '0.04em',
        textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: 10,
        color: BR.ink, textDecoration: 'none',
      }}>
        <div style={{ width: 22, height: 22, background: BR.ink, position: 'relative', flexShrink: 0 }}>
          <div style={{ position: 'absolute', inset: 4, background: BR.accent }} />
        </div>
        DUMB CORPORATE GAMES
        {!isMobile && (
          <span style={{
            fontFamily: brMono, fontWeight: 400, fontSize: 10, color: BR.muted, letterSpacing: '0.1em',
            borderLeft: `1px solid ${BR.rule}`, paddingLeft: 10, marginLeft: 6,
          }}>EST. WHENEVER · LLC PENDING</span>
        )}
      </a>
      <nav style={{
        order: isMobile ? 2 : 1,
        marginLeft: isMobile ? 0 : 'auto',
        width: isMobile ? '100%' : 'auto',
        display: 'flex', gap: isMobile ? 16 : 22, flexWrap: 'wrap',
        fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700,
      }}>
        {links.map((l) => {
          // Padding + negative margin: grows the tap target to ~40px without
          // moving the rendered text — the 18px-tall bare links failed the
          // mobile touch-target floor.
          const linkStyle: CSSProperties = {
            color: l.active ? BR.accent : BR.ink, textDecoration: 'none', cursor: 'pointer',
            padding: '12px 6px', margin: '-12px -6px',
          }
          // Router destinations get <Link> — the old plain <a href> forced a
          // full page reload on every internal nav.
          return l.to ? (
            <Link key={l.label} to={l.to} style={linkStyle}>{l.label}</Link>
          ) : (
            <a key={l.label} href={l.href || '#'} style={linkStyle}>{l.label}</a>
          )
        })}
      </nav>
      {badge && (
        <div style={{
          order: isMobile ? 1 : 2,
          marginLeft: isMobile ? 'auto' : 16,
          padding: '4px 10px', border: `1px solid ${BR.rule}`,
          background: BR.accent, color: '#000', fontFamily: brMono, fontWeight: 700,
          fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase',
        }}>{badge}</div>
      )}
    </header>
  )
}

// ─── Mission ─────────────────────────────────────────────────────────────
export function Mission() {
  const isMobile = useIsMobile()
  return (
    <section id="mission" style={{ borderBottom: `4px solid ${BR.ink}`, background: BR.bg }}>
      <SectionStarter
        eyebrow="IN CHARACTER · REVIEWED ANNUALLY"
        title={<>OUR MISSION.</>}
        meta="EFFECTIVE IMMEDIATELY · NEVER REVOKED"
      />
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1.5fr 1fr', borderBottom: `1px solid ${BR.ink}` }}>
        <div style={{ padding: isMobile ? '24px 20px 28px' : '32px 32px 40px' }}>
          <p style={{
            margin: 0, fontFamily: brFont, fontWeight: 700,
            fontSize: 'clamp(22px, 5.5vw, 34px)', lineHeight: 1.18, letterSpacing: '-0.015em',
            textTransform: 'uppercase', color: BR.ink,
          }}>
            DUMB CORPORATE GAMES IS A WHOLLY-OWNED SUBSIDIARY OF NOTHING, WITH A PORTFOLIO OF
            ZERO SUBSIDIARIES. WE MAKE SMALL GAMES THAT TAKE WORKPLACE ABSURDITY{' '}
            <span style={{ background: BR.accent, padding: '0 4px' }}>SERIOUSLY</span>.
          </p>
          <p style={{
            marginTop: 22, fontFamily: brFont, fontSize: 18, lineHeight: 1.5,
            color: '#222', maxWidth: 720,
          }}>
            EVERY GAME IS ROUGHLY THE LENGTH OF A MEETING THAT COULD HAVE BEEN AN EMAIL —
            THE EMAIL ITSELF HAVING BEEN A MEETING EARLIER IN THE WEEK.
            STATUS: <b style={{ color: BR.green }}>GREEN</b>.
          </p>
        </div>
        <div style={{ borderLeft: isMobile ? 'none' : `1px solid ${BR.ink}`, borderTop: isMobile ? `1px solid ${BR.ink}` : 'none', display: 'flex', flexDirection: 'column' }}>
          {[
            ['OWNERSHIP', 'DO THE THING BEFORE SOMEONE TELLS YOU TO.'],
            ['ALIGNMENT', 'THE ACT OF PRODUCING ARTIFACTS THAT IMPLY PROGRESS.'],
            ['BIAS FOR ACTION', 'WE HAVE CONSIDERED THIS ENOUGH; WE ARE SHIPPING.'],
          ].map(([k, v], i) => (
            <div key={k} style={{
              padding: '20px 26px',
              borderBottom: i < 2 ? `1px solid ${BR.ink}` : 'none',
              background: i === 1 ? BR.ink : 'transparent',
              color: i === 1 ? BR.bg : BR.ink,
              flex: 1,
              display: 'flex', flexDirection: 'column', justifyContent: 'center',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ width: 12, height: 12, background: BR.accent, display: 'inline-block' }} />
                <span style={{
                  fontFamily: brFont, fontWeight: 900, fontSize: 22,
                  textTransform: 'uppercase', letterSpacing: '-0.005em',
                }}>{k}</span>
              </div>
              <div style={{
                marginTop: 6, fontSize: 14,
                color: i === 1 ? '#bbb' : '#333', fontFamily: brFont,
              }}>{v}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ─── About the studio ────────────────────────────────────────────────────
export function AboutTheStudio() {
  const isMobile = useIsMobile()
  return (
    <section id="about" style={{
      borderBottom: `4px solid ${BR.ink}`, background: BR.ink, color: BR.bg,
    }}>
      <div style={{
        padding: isMobile ? '24px 20px 18px' : '32px 32px 24px',
        borderBottom: `1px solid #333`,
        display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'minmax(0, 1fr) auto', gap: isMobile ? 14 : 32, alignItems: 'end',
      }}>
        <div>
          <div style={{
            fontFamily: brMono, fontSize: 11, color: '#aaa',
            textTransform: 'uppercase', letterSpacing: '0.16em', marginBottom: 10,
          }}>
            <span style={{ color: BR.accent, marginRight: 8 }}>●</span>ANONYMOUS · STILL EMPLOYED ELSEWHERE · DO NOT FORWARD TO HR
          </div>
          <h2 style={{
            margin: 0, fontFamily: brFont, fontWeight: 900,
            fontSize: 'clamp(36px, 8.5vw, 72px)', lineHeight: 0.95, letterSpacing: '-0.03em', textTransform: 'uppercase',
          }}>BUILT BY A CORPORATE SLAVE.</h2>
        </div>
        <div style={{
          fontFamily: brMono, fontSize: 11, color: '#aaa', textAlign: 'right',
          textTransform: 'uppercase', letterSpacing: '0.1em', maxWidth: 280, lineHeight: 1.55,
        }}>
          DAY JOB · WITHHELD · NDA WITH SELF
        </div>
      </div>

      <div style={{
        padding: isMobile ? '22px 20px 28px' : '28px 32px 36px',
        display: 'grid', gridTemplateColumns: isMobile ? 'minmax(0, 1fr)' : 'minmax(0, 1.4fr) minmax(0, 1fr)', gap: isMobile ? 22 : 36, alignItems: 'flex-start',
      }}>
        <p style={{
          margin: 0, fontFamily: brFont, fontSize: 22, lineHeight: 1.4,
          color: BR.bg, fontWeight: 500, maxWidth: 760,
          minWidth: 0, overflowWrap: 'anywhere',
        }}>
          I HAVE A REAL JOB. <i>THIS IS NOT IT.</i> THE STANDUPS THAT INSPIRED <i>BLOCKED</i> ARE
          NOT NECESSARILY THE STANDUPS I AM CURRENTLY ATTENDING — FOR HOPEFULLY OBVIOUS REASONS.
          ANY RESEMBLANCE TO YOUR COWORKERS IS A COINCIDENCE WE ARE ALL EXPERIENCING TOGETHER.
          ANONYMOUS TIPS, BUG REPORTS, AND HR COMPLAINTS WELCOME AT{' '}
          <a href="mailto:hello@dumbcorporategames.com" style={{ color: BR.accent, textDecoration: 'underline' }}>
            HELLO@DUMBCORPORATEGAMES.COM
          </a>.
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 0, minWidth: 0 }}>
          {/* Only EMAIL is a real destination. The other rows are jokes —
              they used to be href="#" links, which promised interactivity
              and delivered a scroll-jump to the top. Deadpan works better
              when the dead thing genuinely does nothing. */}
          {[
            { l: 'EMAIL → HELLO@DUMBCORPORATEGAMES.COM', href: 'mailto:hello@dumbcorporategames.com' },
            { l: 'LINKEDIN → ACCOUNT PENDING DELETION' },
            { l: 'GITHUB → COMMITS UNDER PSEUDONYM' },
            { l: 'DM → PLEASE DO NOT' },
          ].map((a, i) => {
            const rowStyle: CSSProperties = {
              color: BR.bg, border: `1px solid ${BR.bg}`, padding: '14px 18px',
              fontFamily: brMono, fontWeight: 700, fontSize: 12, letterSpacing: '0.12em',
              textTransform: 'uppercase', textDecoration: 'none',
              borderTop: i ? 'none' : `1px solid ${BR.bg}`,
              display: 'flex', justifyContent: 'space-between', gap: 12,
              minWidth: 0,
            }
            const inner = (
              <>
                <span style={{ minWidth: 0, overflowWrap: 'anywhere' }}>{a.l}</span>
                <span style={{ color: BR.accent, flexShrink: 0 }}>·0{i + 1}</span>
              </>
            )
            return a.href ? (
              <a key={a.l} href={a.href} style={rowStyle}>{inner}</a>
            ) : (
              <div key={a.l} style={rowStyle}>{inner}</div>
            )
          })}
        </div>
      </div>
    </section>
  )
}

// ─── Email signup ─ posts to the existing /api/subscribe endpoint ────────
type SignupState =
  | { kind: 'idle' }
  | { kind: 'submitting' }
  | { kind: 'success' }
  | { kind: 'error'; message: string }

export function Signup() {
  const isMobile = useIsMobile()
  const [email, setEmail] = useState('')
  const [state, setState] = useState<SignupState>({ kind: 'idle' })

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim() || state.kind === 'submitting') return
    setState({ kind: 'submitting' })
    try {
      const res = await fetch('/api/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      })
      if (!res.ok) {
        const err = await res.text().catch(() => 'unknown error')
        setState({ kind: 'error', message: err || `HTTP ${res.status}` })
        return
      }
      setState({ kind: 'success' })
      setEmail('')
    } catch (err) {
      setState({
        kind: 'error',
        message: err instanceof Error ? err.message : 'network error',
      })
    }
  }

  return (
    <section id="signup" style={{
      borderBottom: `4px solid ${BR.ink}`, background: BR.accent, color: '#000',
    }}>
      {/* minmax(0, ·) on BOTH tracks: without it the giant H2's min-content
          width squeezed the form column below the SUBSCRIBE button's width
          and pushed it past the viewport — 12px of horizontal scroll at
          tablet widths (caught at 768px). */}
      <div style={{
        padding: isMobile ? '28px 20px 28px' : '40px 32px 32px',
        display: 'grid', gridTemplateColumns: isMobile ? 'minmax(0, 1fr)' : 'minmax(0, 1.4fr) minmax(0, 1fr)', gap: isMobile ? 24 : 36, alignItems: 'center',
      }}>
        <div>
          <div style={{
            fontFamily: brMono, fontSize: 12,
            textTransform: 'uppercase', letterSpacing: '0.18em',
            fontWeight: 700, marginBottom: 10,
          }}>
            <span style={{ background: '#000', color: BR.accent, padding: '2px 8px', marginRight: 8 }}>NEW</span>
            STAKEHOLDER UPDATES · LIMITED RUN
          </div>
          <h2 style={{
            margin: 0, fontFamily: brFont, fontWeight: 900,
            fontSize: 'clamp(44px, 11vw, 96px)', lineHeight: 0.9, letterSpacing: '-0.045em',
            textTransform: 'uppercase',
          }}>
            ONE EMAIL.<br />PER RELEASE.<br />NO THOUGHT<br />LEADERSHIP.
          </h2>
        </div>
        <form onSubmit={submit} style={{ alignSelf: 'center', minWidth: 0 }}>
          <label style={{
            display: 'block',
            fontFamily: brMono, fontSize: 12,
            textTransform: 'uppercase', letterSpacing: '0.16em',
            fontWeight: 700, marginBottom: 8,
          }}>
            WORK EMAIL (PREFERRED)
          </label>
          <div style={{ display: 'flex', border: `3px solid #000`, background: '#fff' }}>
            {/* No outline:none here — the .br-page focus-visible ring is the
                only focus indicator this input gets. */}
            <input
              type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
              placeholder="you@bigco.example"
              disabled={state.kind === 'submitting'}
              style={{
                flex: 1, minWidth: 0, border: 'none', padding: '18px 18px',
                fontFamily: brMono, fontSize: 16,
                background: 'transparent',
              }}
            />
            <button type="submit" disabled={state.kind === 'submitting'} style={{
              border: 'none', borderLeft: `3px solid #000`,
              background: '#000', color: BR.accent,
              padding: '0 26px',
              fontFamily: brFont, fontWeight: 900, fontSize: 18,
              textTransform: 'uppercase', letterSpacing: '0.04em',
              cursor: state.kind === 'submitting' ? 'wait' : 'pointer',
              opacity: state.kind === 'submitting' ? 0.7 : 1,
            }}>
              {state.kind === 'submitting' ? 'ADDING …'
                : state.kind === 'success'  ? '✓ ONBOARDED'
                : 'SUBSCRIBE →'}
            </button>
          </div>
          {state.kind === 'error' && (
            <div style={{
              fontFamily: brMono, fontSize: 11, marginTop: 10,
              letterSpacing: '0.04em', textTransform: 'uppercase', color: '#000',
            }}>
              ERROR: {state.message}
            </div>
          )}
          {state.kind !== 'error' && (
            <div style={{
              fontFamily: brMono, fontSize: 11, marginTop: 10,
              letterSpacing: '0.04em', textTransform: 'uppercase',
            }}>
              BY SUBSCRIBING, YOU AGREE TO RECEIVE EMAIL FROM A FAKE STUDIO. UNSUBSCRIBE: REPLY "PER MY LAST EMAIL."
            </div>
          )}
        </form>
      </div>
    </section>
  )
}

// ─── Closer marquee ──────────────────────────────────────────────────────
export function Closer() {
  return (
    <section style={{
      background: BR.ink, color: BR.bg,
      padding: '48px 0', borderBottom: `1px solid ${BR.ink}`,
      overflow: 'hidden',
    }}>
      <style>{`
        @keyframes br-closer { from{transform:translateX(0)} to{transform:translateX(-50%)} }
      `}</style>
      <div style={{
        whiteSpace: 'nowrap',
        fontFamily: brFont, fontWeight: 900,
        fontSize: 'clamp(64px, 17vw, 184px)', lineHeight: 0.9, letterSpacing: '-0.05em',
        textTransform: 'uppercase',
      }}>
        <div className="br-marquee" style={{ display: 'inline-flex', gap: 36, animation: 'br-closer 60s linear infinite' }}>
          {Array.from({ length: 2 }).flatMap((_, i) => [
            <span key={`a${i}`}>BUILT BY ONE PERSON</span>,
            <span key={`b${i}`} style={{ color: BR.accent }}>★</span>,
            <span key={`c${i}`}>IN PURSUIT OF ALIGNMENT</span>,
            <span key={`d${i}`} style={{ color: BR.accent }}>★</span>,
          ])}
        </div>
      </div>
    </section>
  )
}

// ─── Footer ──────────────────────────────────────────────────────────────
export function Footer() {
  const year = new Date().getFullYear()
  return (
    <footer id="press" style={{
      padding: '24px 28px', background: BR.bg, color: BR.muted,
      fontFamily: brMono, fontSize: 11,
      textTransform: 'uppercase', letterSpacing: '0.1em',
    }}>
      <div style={{
        display: 'flex', justifyContent: 'space-between', gap: 24, flexWrap: 'wrap',
      }}>
        <div>© {year} DUMB CORPORATE GAMES · ALL ARTIFACTS PRODUCED IN PURSUIT OF ALIGNMENT.</div>
        <div style={{ display: 'flex', gap: 16 }}>
          {/* padding+negative margin = 40px tap targets, same visual */}
          <a href="mailto:press@dumbcorporategames.com" style={{ color: BR.muted, padding: '12px 6px', margin: '-12px -6px' }}>PRESS</a>
          <a href="mailto:hello@dumbcorporategames.com" style={{ color: BR.muted, padding: '12px 6px', margin: '-12px -6px' }}>CONTACT</a>
          {/* joke row, not a link — was href="#", a false affordance */}
          <span style={{ color: BR.muted }}>CIRCLE BACK</span>
        </div>
      </div>
    </footer>
  )
}

// Re-export the useRef so screen-specific code can avoid double React imports.
export { useRef, useState, useEffect }
