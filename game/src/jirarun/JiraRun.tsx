// Jira Run — Phase 2 route shell.
//
// Leonard sits down to update his Jira tickets, presses SPACE, gets sucked
// INTO the board, and runs an 8-bit Atlassian gauntlet (RunnerWorld). Deposit
// 4 updates at 4 Kanban gates to finish → 11 AM, off to lunch (Phase 3).
//
// Phase state machine: intro → running → (dead → running) / won.
// All the real-time game state lives in RunnerWorld's refs; this shell owns
// only the phase, the HUD snapshot, and the screens.

import { useCallback, useEffect, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import { Link } from 'react-router-dom'
import { RunnerWorld, type HudState } from './RunnerWorld'
import { TOTAL_UPDATES, PAL } from './runnerConfig'

type Phase = 'intro' | 'running' | 'dead' | 'won'

export default function JiraRun() {
  const [phase, setPhase] = useState<Phase>('intro')
  const [hud, setHud] = useState<HudState>({ updates: 0, level: 1, distance: 0, score: 0, mult: 1 })
  const [fading, setFading] = useState(false)
  const [runnerKey, setRunnerKey] = useState(0)

  const start = useCallback(() => {
    // dramatic fade-to-black, then drop into the board
    setFading(true)
    sfx.warp()
    window.setTimeout(() => {
      setHud({ updates: 0, level: 1, distance: 0, score: 0, mult: 1 })
      setRunnerKey((k) => k + 1)
      setPhase('running')
      setFading(false)
    }, 850)
  }, [])

  const retry = useCallback(() => {
    setFading(true)
    window.setTimeout(() => {
      setHud({ updates: 0, level: 1, distance: 0, score: 0, mult: 1 })
      setRunnerKey((k) => k + 1)
      setPhase('running')
      setFading(false)
    }, 450)
  }, [])

  // SPACE drives intro-start and retry (RunnerWorld owns in-run input)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== ' ' && e.key !== 'Enter') return
      if (phase === 'intro') { e.preventDefault(); start() }
      else if (phase === 'dead') { e.preventDefault(); retry() }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [phase, start, retry])

  return (
    <div className="fixed inset-0 overflow-hidden" style={{ background: PAL.skyTop }}>
      {/* The 3D world stays mounted through dead/won so the freeze-frame shows */}
      {phase !== 'intro' && (
        <Canvas
          key={runnerKey}
          dpr={[1, 1.5]}
          gl={{ antialias: false }}
          camera={{ position: [0, 3.4, -6.6], fov: 70 }}
        >
          <RunnerWorld
            running={phase === 'running'}
            onHud={setHud}
            onDeposit={(n) => { sfx.deposit(); if (n >= TOTAL_UPDATES) sfx.win() }}
            onToken={() => sfx.token()}
            onDeath={() => { sfx.crash(); setPhase('dead') }}
            onWin={() => setPhase('won')}
          />
        </Canvas>
      )}

      {phase === 'running' && <HUD hud={hud} />}
      {phase === 'intro' && <IntroScreen onStart={start} />}
      {phase === 'dead' && <DeadScreen score={hud.score} updates={hud.updates} onRetry={retry} />}
      {phase === 'won' && <WinScreen score={hud.score} />}

      {/* fade-to-black overlay */}
      <div
        className="pointer-events-none fixed inset-0 z-50 bg-black transition-opacity duration-700"
        style={{ opacity: fading ? 1 : 0 }}
      />
    </div>
  )
}

// ---- HUD ----
function HUD({ hud }: { hud: HudState }) {
  return (
    <div className="pointer-events-none fixed inset-x-0 top-0 z-40 p-4 flex items-start justify-between font-mono">
      {/* carried updates */}
      <div className="flex flex-col gap-1">
        <div className="text-[10px] uppercase tracking-widest text-white/70">Updates to deposit</div>
        <div className="flex gap-1.5">
          {Array.from({ length: TOTAL_UPDATES }).map((_, i) => (
            <div
              key={i}
              className="w-7 h-9 rounded-sm border-2 flex items-center justify-center text-[10px] font-bold"
              style={{
                borderColor: i < hud.updates ? PAL.board : '#ffffff55',
                background: i < hud.updates ? PAL.board : 'transparent',
                color: i < hud.updates ? '#06291b' : '#ffffff66',
              }}
            >
              {i < hud.updates ? '✓' : 'JIRA'}
            </div>
          ))}
        </div>
      </div>
      {/* sprint + story-point score + combo */}
      <div className="text-right">
        <div
          className="text-[11px] uppercase tracking-widest font-bold px-2 py-1 rounded inline-block"
          style={{ background: PAL.update, color: '#3a2a00' }}
        >
          Sprint {hud.level}
        </div>
        <div className="text-white font-bold text-lg mt-1 tabular-nums">⭐ {hud.score}</div>
        {hud.mult > 1 && (
          <div className="text-[12px] font-bold tabular-nums" style={{ color: PAL.update }}>
            ×{hud.mult} combo
          </div>
        )}
      </div>
    </div>
  )
}

// ---- Intro: Leonard at his Jira board ----
function IntroScreen({ onStart }: { onStart: () => void }) {
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center p-6"
      style={{ background: 'radial-gradient(circle at 50% 40%, #0747a6, #091e42)' }}>
      <div className="max-w-lg w-full text-center font-mono text-white">
        <div className="inline-block mb-5 px-3 py-1 rounded text-[11px] uppercase tracking-widest"
          style={{ background: PAL.update, color: '#3a2a00' }}>
          Phase 2 · 10:45 AM
        </div>
        <h1 className="text-3xl font-black mb-3 tracking-tight" style={{ fontFamily: 'sans-serif' }}>
          UPDATE YOUR TICKETS
        </h1>
        <p className="text-white/75 text-sm leading-relaxed mb-2">
          Standup's over. Leonard opens the Jira board to log his four updates.
          He stares into the backlog. The backlog stares back.
        </p>
        <p className="text-white/55 text-xs leading-relaxed mb-6">
          Carry all 4 updates through the board and deposit each at a Kanban gate.
          Dodge the blockers. Don't fall behind.
        </p>
        <div className="rounded-lg border border-white/15 bg-black/30 p-4 mb-6 text-left text-xs space-y-1">
          <div className="text-white/60 uppercase tracking-widest text-[10px] mb-2">Controls</div>
          <div>← → &nbsp; / &nbsp; A D &nbsp;—&nbsp; switch lane</div>
          <div>↑ &nbsp; / &nbsp; W &nbsp; / &nbsp; SPACE &nbsp;—&nbsp; jump (blocks & red traps)</div>
          <div>↓ &nbsp; / &nbsp; S &nbsp;—&nbsp; slide (red banners overhead)</div>
          <div style={{ color: PAL.wall }}>⬛ purple walls — can't jump, <b>switch lanes!</b></div>
          <div style={{ color: PAL.update }}>⭐ grab story-point tokens for combo points</div>
        </div>
        <button
          onClick={onStart}
          className="px-6 py-3 rounded font-bold text-sm uppercase tracking-widest transition hover:brightness-110"
          style={{ background: PAL.update, color: '#3a2a00' }}
        >
          ▶ Press SPACE to enter the board
        </button>
      </div>
    </div>
  )
}

// ---- Death ----
function DeadScreen({ score, updates, onRetry }: { score: number; updates: number; onRetry: () => void }) {
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center p-6 bg-black/70">
      <div className="max-w-md w-full text-center font-mono text-white">
        <div className="text-5xl mb-3">💥</div>
        <h1 className="text-2xl font-black mb-2" style={{ color: PAL.gap, fontFamily: 'sans-serif' }}>
          BLOCKED.
        </h1>
        <p className="text-white/70 text-sm mb-1">You hit a blocker and dropped your updates.</p>
        <p className="text-white/50 text-xs mb-6">
          {updates}/{TOTAL_UPDATES} deposited · ⭐ {score} story points
        </p>
        <button
          onClick={onRetry}
          className="px-6 py-3 rounded font-bold text-sm uppercase tracking-widest transition hover:brightness-110"
          style={{ background: PAL.update, color: '#3a2a00' }}
        >
          ↻ Press SPACE to re-open the ticket
        </button>
      </div>
    </div>
  )
}

// ---- Win ----
function WinScreen({ score }: { score: number }) {
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center p-6"
      style={{ background: 'radial-gradient(circle at 50% 40%, #1f7a4d, #06291b)' }}>
      <div className="max-w-md w-full text-center font-mono text-white">
        <div className="text-5xl mb-3">📋✅</div>
        <h1 className="text-2xl font-black mb-2" style={{ color: PAL.boardEdge, fontFamily: 'sans-serif' }}>
          ALL TICKETS UPDATED
        </h1>
        <p className="text-white/75 text-sm mb-1">
          Four updates deposited. The board is, briefly, Green.
        </p>
        <p className="text-white/55 text-xs mb-6">
          ⭐ {score} story points banked. It is 11:00 AM. Then your phone buzzes:
          the SteerCo lunch order just fell through.
        </p>
        <div className="flex flex-col gap-2 items-center">
          <div className="px-4 py-2 rounded text-[11px] uppercase tracking-widest opacity-70"
            style={{ background: '#ffffff22' }}>
            Phase 3 · Lunch Run · coming soon
          </div>
          <Link
            to="/"
            className="px-6 py-3 rounded font-bold text-sm uppercase tracking-widest transition hover:brightness-110"
            style={{ background: PAL.board, color: '#06291b' }}
          >
            ← Back to studio
          </Link>
        </div>
      </div>
    </div>
  )
}

// ---- tiny chiptune SFX (self-contained Web Audio, no assets) ----
const sfx = (() => {
  let ctx: AudioContext | null = null
  const ac = () => (ctx ??= new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)())
  function blip(freq: number, dur: number, type: OscillatorType = 'square', vol = 0.12, slideTo?: number) {
    try {
      const c = ac(); const t = c.currentTime
      const o = c.createOscillator(); const g = c.createGain()
      o.type = type; o.frequency.setValueAtTime(freq, t)
      if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur)
      g.gain.setValueAtTime(0.0001, t)
      g.gain.exponentialRampToValueAtTime(vol, t + 0.01)
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
      o.connect(g).connect(c.destination); o.start(t); o.stop(t + dur + 0.02)
    } catch { /* ignore */ }
  }
  return {
    warp: () => { blip(180, 0.5, 'sawtooth', 0.1, 900) },
    token: () => { blip(880, 0.08, 'square', 0.09, 1320) },
    deposit: () => { [523, 659, 784, 1047].forEach((f, i) => setTimeout(() => blip(f, 0.12, 'square', 0.12), i * 70)) },
    crash: () => { blip(300, 0.4, 'sawtooth', 0.16, 60) },
    win: () => { [523, 659, 784, 1047, 1319].forEach((f, i) => setTimeout(() => blip(f, 0.18, 'triangle', 0.14), i * 110)) },
  }
})()
