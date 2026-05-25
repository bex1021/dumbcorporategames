// Dumb Corporate Games — portfolio landing page.
//
// Tone: written in-universe. DCG is itself a fake "studio" in the same
// satirical world as Blocked / Alignly. The page reads like a corporate
// "About Us" site for a fake game studio. The actual human behind it
// gets one straight line at the very end.
//
// Layout:
//   1. Top nav strip — DCG mark + "PORTFOLIO" link
//   2. Hero — studio name + corporate-satire tagline
//   3. Portfolio — Blocked game card (only real game for now)
//   4. About / mission statement (in-character)
//   5. Email signup ("STAKEHOLDER UPDATES")
//   6. Footer — real human line + press contact
//
// All styled to match Blocked's Lumon-coded palette (pale gray / white /
// teal accents) so the portfolio and the game feel like one product.

import { useState } from 'react'
import { Link } from 'react-router-dom'

// ---- Same palette tokens as the Jira intro / ending screens ----
const C = {
  bg: '#f4f5f7',
  surface: '#ffffff',
  border: '#dfe1e6',
  text: '#172b4d',
  muted: '#5e6c84',
  teal: '#4fa9a3',
  tealDeep: '#2d6e6a',
  blue: '#0052cc',
  blueHover: '#0747a6',
  green: '#006644',
  greenBg: '#e3fcef',
}

export default function Landing() {
  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: C.bg, color: C.text }}>
      <Nav />
      <Hero />
      <Portfolio />
      <About />
      <Signup />
      <Footer />
    </div>
  )
}

// ============================================================
//  Nav
// ============================================================

function Nav() {
  return (
    <div
      className="flex items-center px-6 h-14 border-b sticky top-0 z-10 backdrop-blur"
      style={{
        borderColor: C.border,
        backgroundColor: 'rgba(255,255,255,0.85)',
      }}
    >
      <div className="flex items-center gap-2">
        <div
          className="w-7 h-7 rounded text-white flex items-center justify-center text-sm font-black"
          style={{ backgroundColor: C.blue }}
        >
          D
        </div>
        <span className="font-semibold text-[15px]">Dumb Corporate Games</span>
        <span
          className="ml-2 text-[10px] uppercase tracking-widest px-1.5 py-0.5 rounded"
          style={{ backgroundColor: C.greenBg, color: C.green }}
        >
          ● Hiring nobody
        </span>
      </div>
      <div className="ml-auto flex items-center gap-5 text-[13px]" style={{ color: C.muted }}>
        <a href="#portfolio" className="hover:text-[#172b4d] transition">
          Portfolio
        </a>
        <a href="#about" className="hover:text-[#172b4d] transition">
          About
        </a>
        <a href="#press" className="hover:text-[#172b4d] transition">
          Press
        </a>
      </div>
    </div>
  )
}

// ============================================================
//  Hero
// ============================================================

function Hero() {
  return (
    <section className="px-6 pt-16 pb-12 max-w-5xl mx-auto w-full">
      <div className="text-[11px] uppercase tracking-widest" style={{ color: C.tealDeep }}>
        A wholly-owned subsidiary of late-stage capitalism
      </div>
      <h1
        className="text-[56px] sm:text-[72px] font-bold leading-[1.05] mt-3"
        style={{ color: C.text, letterSpacing: '-0.02em' }}
      >
        Dumb Corporate Games
      </h1>
      <p
        className="text-[18px] sm:text-[20px] mt-5 max-w-2xl leading-relaxed"
        style={{ color: C.muted }}
      >
        We make satirical browser games about your job. Each title is roughly
        the length of a status meeting and approximately twice as productive.
      </p>
      <div className="mt-7 flex flex-wrap gap-3 items-center">
        <Link
          to="/blocked"
          className="inline-flex items-center gap-2 px-5 py-3 rounded text-white font-medium text-[15px] shadow-sm transition"
          style={{ backgroundColor: C.blue }}
          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = C.blueHover)}
          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = C.blue)}
        >
          Play Blocked → Phase 1
        </Link>
        <a
          href="#about"
          className="text-[14px] underline"
          style={{ color: C.muted }}
        >
          Or read our mission statement
        </a>
      </div>
    </section>
  )
}

// ============================================================
//  Portfolio
// ============================================================

function Portfolio() {
  return (
    <section
      id="portfolio"
      className="px-6 py-10 border-t"
      style={{ borderColor: C.border }}
    >
      <div className="max-w-5xl mx-auto w-full">
        <div className="text-[11px] uppercase tracking-widest mb-1" style={{ color: C.muted }}>
          Portfolio · Q2 releases
        </div>
        <h2 className="text-[28px] font-semibold" style={{ color: C.text }}>
          Currently in production
        </h2>

        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          <GameCard
            tag="Phase 1 of 3 · MVP"
            title="Blocked: Pre-Standup Alignment"
            blurb="Talk to five blocked coworkers before the 10:15 standup. Manage Project Status, Team Pissed-Off, Meeting Load, and Alignment. The team is aligned. No one is okay."
            cta="Play now"
            href="/blocked"
            status="live"
          />
        </div>
      </div>
    </section>
  )
}

function GameCard({
  tag,
  title,
  blurb,
  cta,
  href,
  status,
}: {
  tag: string
  title: string
  blurb: string
  cta: string
  href: string
  status: 'live' | 'soon'
}) {
  const isLive = status === 'live'
  return (
    <Link
      to={href}
      className="block rounded-lg border bg-white p-5 hover:border-[#0052cc]/60 transition shadow-sm hover:shadow"
      style={{ borderColor: C.border }}
    >
      <div className="flex items-center justify-between text-[10px] uppercase tracking-widest mb-2">
        <span style={{ color: C.muted }}>{tag}</span>
        <span
          className="px-1.5 py-0.5 rounded font-semibold"
          style={{
            backgroundColor: isLive ? C.greenBg : '#dfe1e6',
            color: isLive ? C.green : '#42526e',
          }}
        >
          {isLive ? '● Live' : '◌ In dev'}
        </span>
      </div>
      <div className="text-[18px] font-semibold leading-tight" style={{ color: C.text }}>
        {title}
      </div>
      <p className="text-[14px] mt-2 leading-relaxed" style={{ color: C.muted }}>
        {blurb}
      </p>
      <div
        className="mt-4 text-[13px] font-medium inline-flex items-center gap-1"
        style={{ color: C.blue }}
      >
        {cta} →
      </div>
    </Link>
  )
}

// ============================================================
//  About
// ============================================================

function About() {
  return (
    <section
      id="about"
      className="px-6 py-12 border-t"
      style={{ borderColor: C.border }}
    >
      <div className="max-w-3xl mx-auto w-full">
        <div className="text-[11px] uppercase tracking-widest mb-1" style={{ color: C.muted }}>
          About
        </div>
        <h2 className="text-[28px] font-semibold mb-5" style={{ color: C.text }}>
          Our mission
        </h2>
        <div className="space-y-4 text-[15px] leading-relaxed" style={{ color: C.text }}>
          <p>
            Dumb Corporate Games is a wholly-owned subsidiary of nothing, with
            a portfolio of zero subsidiaries. We make small games that take
            workplace absurdity seriously.
          </p>
          <p>
            Our values are <span style={{ color: C.green, fontWeight: 600 }}>Ownership</span>{' '}
            (do the thing before someone tells you to),{' '}
            <span style={{ color: C.green, fontWeight: 600 }}>Alignment</span>{' '}
            (the act of producing artifacts that imply progress), and{' '}
            <span style={{ color: C.green, fontWeight: 600 }}>Bias for Action</span>{' '}
            (we have considered this enough; we are shipping).
          </p>
          <p>
            Every game is roughly the length of a meeting that could have been
            an email — the email itself having been a meeting earlier in the
            week. Status: <span style={{ color: C.green, fontWeight: 600 }}>Green</span>.
          </p>
        </div>

        {/* The one real, non-satirical block */}
        <div
          className="mt-8 p-4 rounded border-l-4"
          style={{
            backgroundColor: '#fff',
            border: `1px solid ${C.border}`,
            borderLeftColor: C.teal,
          }}
        >
          <div className="text-[11px] uppercase tracking-widest mb-1" style={{ color: C.muted }}>
            Off the record
          </div>
          <p className="text-[14px] leading-relaxed" style={{ color: C.text }}>
            Built by Rebecca Leung. Reach me at{' '}
            <a
              href="mailto:hello@dumbcorporategames.com"
              className="underline"
              style={{ color: C.blue }}
            >
              hello@dumbcorporategames.com
            </a>
            .
          </p>
        </div>
      </div>
    </section>
  )
}

// ============================================================
//  Email signup
// ============================================================

type SignupState =
  | { kind: 'idle' }
  | { kind: 'submitting' }
  | { kind: 'success' }
  | { kind: 'error'; message: string }

function Signup() {
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
    <section
      className="px-6 py-12 border-t"
      style={{ borderColor: C.border, backgroundColor: C.surface }}
    >
      <div className="max-w-3xl mx-auto w-full">
        <div className="text-[11px] uppercase tracking-widest mb-1" style={{ color: C.muted }}>
          Stakeholder updates
        </div>
        <h2 className="text-[24px] font-semibold mb-3" style={{ color: C.text }}>
          Get notified when a new game ships
        </h2>
        <p className="text-[14px] mb-4" style={{ color: C.muted }}>
          One email per release. No newsletter. No "thought leadership."
        </p>
        <form onSubmit={submit} className="flex gap-2 flex-wrap">
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@work.example"
            className="flex-1 min-w-[240px] px-3 py-2 rounded border text-[14px] outline-none focus:border-[#0052cc]"
            style={{ borderColor: C.border }}
          />
          <button
            type="submit"
            disabled={state.kind === 'submitting'}
            className="px-5 py-2 rounded text-white text-[14px] font-medium disabled:opacity-60"
            style={{ backgroundColor: C.blue }}
          >
            {state.kind === 'submitting' ? 'Adding to CRM…' : 'Subscribe'}
          </button>
        </form>
        {state.kind === 'success' && (
          <div className="mt-3 text-[13px]" style={{ color: C.green }}>
            ✓ You have been onboarded.
          </div>
        )}
        {state.kind === 'error' && (
          <div className="mt-3 text-[13px]" style={{ color: '#bf2600' }}>
            Something went wrong: {state.message}
          </div>
        )}
      </div>
    </section>
  )
}

// ============================================================
//  Footer
// ============================================================

function Footer() {
  return (
    <footer
      id="press"
      className="px-6 py-8 mt-auto border-t text-[12px]"
      style={{ borderColor: C.border, color: C.muted }}
    >
      <div className="max-w-5xl mx-auto w-full flex flex-wrap justify-between gap-4">
        <div>
          © {new Date().getFullYear()} Dumb Corporate Games. All artifacts produced
          in pursuit of alignment.
        </div>
        <div className="flex gap-4">
          <a href="mailto:press@dumbcorporategames.com" className="hover:text-[#172b4d]">
            Press
          </a>
          <a href="mailto:hello@dumbcorporategames.com" className="hover:text-[#172b4d]">
            Contact
          </a>
        </div>
      </div>
    </footer>
  )
}
