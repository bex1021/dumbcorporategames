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
import { RunnerWorld, type HudState, type Checkpoint } from './RunnerWorld'
import { TOTAL_UPDATES, PAL } from './runnerConfig'
import { DesktopBoot } from './DesktopBoot'
import { markBeaten } from '../state/progress'

// Phase 2 opens on Leonard's desktop (the "lock in at your desk" beat), then
// the runner. 'desktop' replaces the old standalone intro screen.
type Phase = 'desktop' | 'running' | 'dead' | 'won'
// What a finished run hands back to the screens: the story-point haul + how
// many updates made it in. Feeds the "$0.00 Productivity Receipt" punchline.
export type RunResult = { score: number; updates: number }
const FRESH: Checkpoint = { level: 1, updates: 0, score: 0 }

export default function JiraRun() {
  const [phase, setPhase] = useState<Phase>('desktop')
  const [hud, setHud] = useState<HudState>({ updates: 0, level: 1, distance: 0, score: 0, mult: 1 })
  const [fading, setFading] = useState(false)
  const [runnerKey, setRunnerKey] = useState(0)
  // Current sprint checkpoint — where a retry resumes. Reset on a fresh game,
  // advanced by RunnerWorld each time an update is deposited.
  const [checkpoint, setCheckpoint] = useState<Checkpoint>(FRESH)
  // The haul from the run that just ended — drives the receipt on dead/won.
  const [result, setResult] = useState<RunResult>({ score: 0, updates: 0 })
  // Once you've entered the run at least once, returning to the desktop skips
  // the "you survived standup" boot card.
  const [bootedOnce, setBootedOnce] = useState(false)

  const start = useCallback(() => {
    // entering the run from the desktop → wipe the checkpoint, fade in
    setFading(true)
    setBootedOnce(true)
    sfx.warp()
    setCheckpoint(FRESH)
    window.setTimeout(() => {
      setHud({ updates: 0, level: 1, distance: 0, score: 0, mult: 1 })
      setRunnerKey((k) => k + 1)
      setPhase('running')
      setFading(false)
    }, 850)
  }, [])

  const retry = useCallback(() => {
    // resume from the banked sprint checkpoint (do NOT reset it)
    setFading(true)
    window.setTimeout(() => {
      setHud({ updates: checkpoint.updates, level: checkpoint.level, distance: 0, score: checkpoint.score, mult: 1 })
      setRunnerKey((k) => k + 1)
      setPhase('running')
      setFading(false)
    }, 450)
  }, [checkpoint])

  // Bail out of the run back to Leonard's desktop.
  const backToDesktop = useCallback(() => {
    setFading(false)
    setPhase('desktop')
  }, [])

  // SPACE drives intro-start and retry (RunnerWorld owns in-run input)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== ' ' && e.key !== 'Enter') return
      // Desktop start is click-driven (inside DesktopBoot); SPACE only retries a death.
      if (phase === 'dead') { e.preventDefault(); retry() }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [phase, start, retry])

  return (
    <div className="fixed inset-0 overflow-hidden" style={{ background: PAL.skyTop }}>
      {/* The 3D world stays mounted through dead/won so the freeze-frame shows */}
      {phase !== 'desktop' && (
        <Canvas
          key={runnerKey}
          dpr={[1, 1.5]}
          gl={{ antialias: false, preserveDrawingBuffer: true }}
          camera={{ position: [0, 3.4, -6.6], fov: 70 }}
        >
          <RunnerWorld
            running={phase === 'running'}
            start={checkpoint}
            onHud={setHud}
            onDeposit={(n) => { sfx.deposit(); if (n >= TOTAL_UPDATES) sfx.win() }}
            onToken={() => sfx.token()}
            onCheckpoint={setCheckpoint}
            onDeath={(r) => { sfx.crash(); setResult(r); setPhase('dead') }}
            onWin={(r) => { markBeaten('phase2'); setResult(r); setPhase('won') }}
          />
        </Canvas>
      )}

      {/* CRT/scanline/vignette overlay — sells the "inside a monitor" feel
          whenever the 3D world is showing (not on the desktop boot). */}
      {phase !== 'desktop' && <CRTOverlay />}

      {phase === 'running' && <HUD hud={hud} />}
      {phase === 'running' && (
        <button
          onClick={backToDesktop}
          className="pointer-events-auto fixed bottom-3 left-3 z-40 px-3 py-1.5 rounded-md text-[11px] font-mono uppercase tracking-wide bg-black/40 text-white/80 hover:bg-black/60 backdrop-blur transition"
        >
          ⎋ Back to desk
        </button>
      )}
      {phase === 'desktop' && <DesktopBoot onEnter={start} skipBoot={bootedOnce} />}
      {phase === 'dead' && <DeadScreen result={result} sprint={checkpoint.level} onRetry={retry} onDesktop={backToDesktop} />}
      {phase === 'won' && <WinScreen result={result} onDesktop={backToDesktop} />}

      {/* fade-to-black overlay */}
      <div
        className="pointer-events-none fixed inset-0 z-50 bg-black transition-opacity duration-700"
        style={{ opacity: fading ? 1 : 0 }}
      />
    </div>
  )
}

// ---- CRT / "inside a monitor" overlay ----
// Pure CSS (no post-processing dependency): a vignette, fine scanlines, and a
// faint screen-glow tint layered over the canvas. Cheap + always works.
function CRTOverlay() {
  return (
    <div
      className="pointer-events-none fixed inset-0 z-30"
      style={{ background: 'radial-gradient(ellipse 82% 72% at 50% 45%, transparent 58%, rgba(2,8,20,0.58) 100%)' }}
    >
      <div
        className="absolute inset-0"
        style={{
          backgroundImage:
            'repeating-linear-gradient(0deg, rgba(0,0,0,0.16) 0px, rgba(0,0,0,0.16) 1.5px, transparent 1.5px, transparent 4px)',
        }}
      />
      <div
        className="absolute inset-0"
        style={{
          background: 'linear-gradient(rgba(90,150,255,0.05), rgba(90,150,255,0) 32%)',
          mixBlendMode: 'screen',
        }}
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

// ---- Death ----
function DeadScreen({ result, sprint, onRetry, onDesktop }: { result: RunResult; sprint: number; onRetry: () => void; onDesktop: () => void }) {
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center p-6 bg-black/70">
      <div className="max-w-md w-full text-center font-mono text-white">
        <div className="text-5xl mb-3">💥</div>
        <h1 className="text-2xl font-black mb-2" style={{ color: PAL.gap, fontFamily: 'sans-serif' }}>
          BLOCKED.
        </h1>
        <p className="text-white/70 text-sm mb-4">You hit a blocker and dropped your updates.</p>
        <Receipt result={result} />
        <button
          onClick={onRetry}
          className="px-6 py-3 rounded font-bold text-sm uppercase tracking-widest transition hover:brightness-110"
          style={{ background: PAL.update, color: '#3a2a00' }}
        >
          ↻ Press SPACE to restart Sprint {sprint}
        </button>
        <div className="mt-3 flex items-center justify-center gap-4">
          <button
            onClick={onDesktop}
            className="text-white/55 text-[11px] uppercase tracking-widest hover:text-white/85 transition"
          >
            ⎋ Back to desk
          </button>
          <Link
            to="/play"
            className="text-white/55 text-[11px] uppercase tracking-widest hover:text-white/85 transition"
          >
            ☰ Level select
          </Link>
        </div>
      </div>
    </div>
  )
}

// ---- Win ----
function WinScreen({ result, onDesktop }: { result: RunResult; onDesktop: () => void }) {
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center p-6"
      style={{ background: 'radial-gradient(circle at 50% 40%, #1f7a4d, #06291b)' }}>
      <div className="max-w-md w-full text-center font-mono text-white">
        <div className="text-5xl mb-3">📋✅</div>
        <h1 className="text-2xl font-black mb-2" style={{ color: PAL.boardEdge, fontFamily: 'sans-serif' }}>
          ALL TICKETS UPDATED
        </h1>
        <p className="text-white/75 text-sm mb-4">
          Four updates deposited. The board is, briefly, Green.
        </p>
        <Receipt result={result} />
        <p className="text-white/55 text-xs mb-6">
          It is 11:00 AM. Then your phone buzzes: the SteerCo lunch order just fell through.
        </p>
        <div className="flex flex-col gap-2 items-center">
          <div className="px-4 py-2 rounded text-[11px] uppercase tracking-widest opacity-70"
            style={{ background: '#ffffff22' }}>
            Phase 3 · coming soon
          </div>
          <div className="flex flex-wrap gap-2 justify-center">
            <button
              onClick={onDesktop}
              className="px-5 py-3 rounded font-bold text-sm uppercase tracking-widest transition hover:brightness-110 bg-white/15 text-white"
            >
              ⎋ Back to desk
            </button>
            <Link
              to="/play"
              className="px-6 py-3 rounded font-bold text-sm uppercase tracking-widest transition hover:brightness-110"
              style={{ background: PAL.board, color: '#06291b' }}
            >
              ☰ Level select
            </Link>
            <Link
              to="/"
              className="px-5 py-3 rounded font-bold text-sm uppercase tracking-widest transition hover:brightness-110 bg-white/15 text-white"
            >
              ← Studio
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

// ---- The $0.00 Productivity Receipt ----
// The punchline payoff for all those story-point tokens: itemize the haul like
// a corporate expense report, then stamp the bottom line at exactly $0.00.
// Cosmetic + meta only — the points never buy an in-run advantage. The joke IS
// the reward: you grinded the sprint, the org assigns it zero dollars of value.
function Receipt({ result }: { result: RunResult }) {
  return (
    <div className="mx-auto mb-6 w-full max-w-[18rem] rounded-md border border-white/15 bg-black/30 p-4 text-left text-[12px] font-mono">
      <div className="mb-3 text-center text-[9px] uppercase tracking-[0.25em] text-white/55">
        Productivity Receipt
      </div>
      <ReceiptRow label="Story points collected" value={result.score.toLocaleString()} />
      <ReceiptRow label="Sprints cleared" value={`${result.updates} / ${TOTAL_UPDATES}`} />
      <div className="my-2.5 border-t border-dashed border-white/20" />
      <div className="flex items-baseline justify-between">
        <span className="text-[11px] uppercase tracking-wide text-white/85">Actual business value</span>
        <span className="text-xl font-black tabular-nums" style={{ color: PAL.gap }}>$0.00</span>
      </div>
      <div className="mt-2 text-center text-[9px] italic text-white/35">
        Submitted for reimbursement. Pending approval.
      </div>
    </div>
  )
}

function ReceiptRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between py-0.5 text-white/70">
      <span>{label}</span>
      <span className="tabular-nums text-white/90">{value}</span>
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
