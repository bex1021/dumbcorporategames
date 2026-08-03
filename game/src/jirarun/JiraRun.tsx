// Jira Run — Phase 2 route shell.
//
// Leonard sits down to update his Jira tickets, presses SPACE, gets sucked
// INTO the board, and runs an 8-bit Atlassian gauntlet (RunnerWorld). Deposit
// 4 updates at 4 Kanban gates to finish → 11 AM, off to lunch (Phase 3).
//
// Phase state machine: intro → running → (dead → running) / won.
// All the real-time game state lives in RunnerWorld's refs; this shell owns
// only the phase, the HUD snapshot, and the screens.

import { useCallback, useEffect, useState, type CSSProperties } from 'react'
import { Canvas } from '@react-three/fiber'
import { Link } from 'react-router-dom'
import { writePhase2Final } from '../state/campaignState'
import { RunnerWorld, type HudState, type Checkpoint } from './RunnerWorld'
import { TOTAL_UPDATES, PAL } from './runnerConfig'
import type { DeathCause } from './simulation'
import { DesktopBoot } from './DesktopBoot'
import { markBeaten } from '../state/progress'
import { audio } from '../audio/AudioManager'
import { jiraMusic } from './jiraMusic'
import { JR_ACHIEVEMENTS_CATALOG, saveJRUnlocked, type JRAchievementMeta } from '../content/jrAchievements'

// Phase 2 opens on Leonard's desktop (the "lock in at your desk" beat), then
// the runner. 'desktop' replaces the old standalone intro screen.
type Phase = 'desktop' | 'running' | 'dead' | 'won'
// What a finished run hands back to the screens: the story-point haul + how
// many updates made it in. Feeds the "$0.00 Productivity Receipt" punchline.
export type RunResult = {
  score: number
  updates: number
  cause?: DeathCause
  dodged?: { slack: number; worms: number; invites: number; walls: number }
}
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
  // Mid-run pause. While paused, RunnerWorld gets running=false so the sim +
  // world freeze and in-run input is ignored; a Resume overlay takes over.
  const [paused, setPaused] = useState(false)
  // Sound on/off (music + SFX), persisted. The chiptune is the prominent new
  // layer, so the toggle rides in the HUD and survives reloads.
  const [muted, setMutedState] = useState(() => {
    try { return localStorage.getItem('jr-muted') === '1' } catch { return false }
  })
  useEffect(() => {
    jiraMusic.setMuted(muted)
    sfx.setMuted(muted)
    try { localStorage.setItem('jr-muted', muted ? '1' : '0') } catch { /* ignore */ }
  }, [muted])

  const start = useCallback(() => {
    // entering the run from the desktop → wipe the checkpoint, fade in
    setFading(true)
    setBootedOnce(true)
    setPaused(false)
    sfx.warp()
    jiraMusic.start(1) // kick the chiptune in on the gesture (loop swells in under the fade)
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
    setPaused(false)
    jiraMusic.start(checkpoint.level) // restart the loop at this sprint's intensity
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
    setPaused(false)
    jiraMusic.stop()
    setPhase('desktop')
  }, [])

  // DEV-only review shortcut: `/play/jira-run?sprint=3` drops straight into
  // Sprint N (skips the desktop opener + earlier gates) so a later biome can be
  // reviewed without grinding through two gates. Never ships (DEV-gated).
  useEffect(() => {
    if (!import.meta.env.DEV) return
    const n = Number(new URLSearchParams(window.location.search).get('sprint'))
    if (n >= 2 && n <= TOTAL_UPDATES) {
      setCheckpoint({ level: n, updates: n - 1, score: 0 })
      setHud({ updates: n - 1, level: n, distance: 0, score: 0, mult: 1 })
      setBootedOnce(true)
      setRunnerKey((k) => k + 1)
      setPhase('running')
    }
  }, [])

  // SPACE retries a death; ESC / P toggles the in-run pause. (RunnerWorld owns
  // the in-run movement keys; none of them collide with Esc/P.)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.key === 'Escape' || e.key === 'p' || e.key === 'P') && phase === 'running') {
        e.preventDefault(); setPaused((p) => !p); return
      }
      if (e.key !== ' ' && e.key !== 'Enter') return
      // Desktop start is click-driven (inside DesktopBoot); SPACE only retries a death.
      if (phase === 'dead') { e.preventDefault(); retry() }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [phase, start, retry])

  // ── Adaptive chiptune lifecycle ──
  // Backstop start (covers the dev ?sprint shortcut, which skips start()/retry);
  // no-ops if the loop is already grooving from the gesture handlers above.
  useEffect(() => { if (phase === 'running') jiraMusic.start(checkpoint.level) }, [phase, checkpoint.level])
  // Escalate layers + tempo as the live sprint advances.
  useEffect(() => { if (phase === 'running') jiraMusic.setLevel(hud.level) }, [hud.level, phase])
  // Freeze/unfreeze the loop with the pause overlay.
  useEffect(() => { if (phase === 'running') jiraMusic.setPaused(paused) }, [paused, phase])
  // Kill the music if Jira Run unmounts (navigating away mid-run).
  useEffect(() => () => jiraMusic.stop(), [])

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
            running={phase === 'running' && !paused}
            start={checkpoint}
            onHud={setHud}
            onDeposit={(n) => { sfx.deposit(); if (n >= TOTAL_UPDATES) { sfx.win(); jiraMusic.victory() } }}
            onToken={() => sfx.token()}
            onCheckpoint={setCheckpoint}
            onDeath={(r) => { sfx.crash(); jiraMusic.death(); setPaused(false); setResult(r); setPhase('dead') }}
            onWin={(r) => { markBeaten('phase2'); setPaused(false); setResult(r); setPhase('won') }}
          />
        </Canvas>
      )}

      {/* CRT/scanline/vignette overlay — sells the "inside a monitor" feel
          whenever the 3D world is showing (not on the desktop boot). */}
      {phase !== 'desktop' && <CRTOverlay />}

      {phase === 'running' && <HUD hud={hud} />}
      {/* Sprint-1 controls legend (the tutorial) — auto-hides once you reach Sprint 2 */}
      {phase === 'running' && !paused && hud.level === 1 && (
        <div className="pointer-events-none fixed bottom-3 left-1/2 -translate-x-1/2 z-40 px-4 py-1.5 rounded-md text-[12px] font-mono uppercase tracking-wide bg-black/45 text-white/85 backdrop-blur flex gap-4">
          <span><span className="text-[#36b37e]">W</span>/Space jump</span>
          <span><span className="text-[#ff7a45]">S</span> slide</span>
          <span><span className="text-[#a08bff]">A D</span> move</span>
        </div>
      )}
      {/* Sound toggle — always reachable during a run (even while paused) */}
      {phase === 'running' && (
        <button
          onClick={() => setMutedState((m) => !m)}
          title={muted ? 'Unmute sound' : 'Mute sound'}
          className="pointer-events-auto fixed bottom-3 right-3 z-40 px-3 py-1.5 rounded-md text-[13px] font-mono bg-black/40 text-white/80 hover:bg-black/60 backdrop-blur transition"
        >
          {muted ? '🔇' : '🔊'}
        </button>
      )}
      {phase === 'running' && !paused && (
        <>
          <button
            onClick={backToDesktop}
            className="pointer-events-auto fixed bottom-3 left-3 z-40 px-3 py-1.5 rounded-md text-[11px] font-mono uppercase tracking-wide bg-black/40 text-white/80 hover:bg-black/60 backdrop-blur transition"
          >
            ⎋ Back to desk
          </button>
          <button
            onClick={() => setPaused(true)}
            className="pointer-events-auto fixed bottom-14 right-3 z-40 px-3 py-1.5 rounded-md text-[11px] font-mono uppercase tracking-wide bg-black/40 text-white/80 hover:bg-black/60 backdrop-blur transition"
          >
            ⏸ Pause
          </button>
        </>
      )}
      {/* Mid-run pause overlay — world is frozen behind it */}
      {phase === 'running' && paused && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="text-center font-mono text-white">
            <div className="text-5xl mb-3">⏸</div>
            <h1 className="text-3xl font-black mb-2" style={{ fontFamily: 'sans-serif', color: PAL.update }}>PAUSED</h1>
            <p className="text-white/55 text-[11px] uppercase tracking-widest mb-6">
              Sprint {hud.level} · ⭐ {hud.score.toLocaleString()}
            </p>
            <button
              onClick={() => setPaused(false)}
              className="px-7 py-3 rounded font-bold text-sm uppercase tracking-widest transition hover:brightness-110"
              style={{ background: PAL.update, color: '#3a2a00' }}
            >
              ▶ Resume
            </button>
            <div className="mt-4 flex items-center justify-center gap-4">
              <button onClick={backToDesktop} className="text-white/55 text-[11px] uppercase tracking-widest hover:text-white/85 transition">
                ⎋ Back to desk
              </button>
              <Link to="/play" className="text-white/55 text-[11px] uppercase tracking-widest hover:text-white/85 transition">
                ☰ Level select
              </Link>
            </div>
            <p className="mt-6 text-white/35 text-[10px] uppercase tracking-widest">Esc or P to resume</p>
          </div>
        </div>
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
// Every hazard kills you its own way. Each kind gets a punchy headline + a pool
// of funny corporate post-mortems; one is picked at random per death.
const DEATH_COPY: Record<DeathCause, { emoji: string; title: string; lines: string[] }> = {
  // red floor holes — "scope holes / rabbit holes / cans of worms"
  gap: {
    emoji: '🪱',
    title: 'CAN OF WORMS',
    lines: [
      'You opened a can of worms. They’re out, they’re everywhere, and they’ve started a Slack channel. Updates dropped.',
      'You went down a rabbit hole "just to get the full context." Ninety minutes later, the context won. Updates dropped.',
      'Scope creep opened a hole in the floor. You said "sure, we can fit that in" and fell straight through.',
      'You asked one innocent clarifying question and the ground gave way. Updates lost to the backlog.',
    ],
  },
  // purple "BLOCKED — waiting on Legal/Approval" dependency walls
  wall: {
    emoji: '🚧',
    title: 'BLOCKED.',
    lines: [
      'Waiting on Legal, who are waiting on Procurement, who are waiting on you. Nobody moved. Updates dropped.',
      'You hit a hard dependency. It’ll be unblocked "by EOD" — they didn’t specify which day. Updates dropped.',
      'A wall of approvals you can’t jump or dodge. Someone promised to "circle back." Your updates did not survive the wait.',
      'You ran into a blocker that can only be escalated, never cleared. Welcome to the dependency. Updates dropped.',
    ],
  },
  // jump-blocks wearing Slack notifications / ticket stacks
  block: {
    emoji: '💬',
    title: '"GOT A SEC?"',
    lines: [
      'A Slack ping you "definitely saw" bodychecked you at full speed. Updates dropped.',
      '"Got a sec?" Narrator: you did not have a sec. Updates dropped.',
      'A surprise "quick sync" materialized at chest height. You did not survive the sync. Updates dropped.',
      'You ran face-first into a stack of tickets nobody groomed. Updates dropped.',
    ],
  },
  // slide-under banners: Outlook invites / cookie bars / [EXTERNAL] / town halls
  overhang: {
    emoji: '📅',
    title: 'YOU DIDN’T SLIDE',
    lines: [
      'You forgot to slide under a recurring invite. The recurring invite does not forget. Updates dropped.',
      'An [EXTERNAL] banner clotheslined you at neck height. IT did warn you. Updates dropped.',
      'A "Mandatory Training" bar caught you standing tall. Compliance always wins. Updates dropped.',
      'You walked straight into a town hall. There were no questions — only your dropped updates.',
    ],
  },
  // never actually fatal (gate), here for type-completeness
  board: { emoji: '💥', title: 'BLOCKED.', lines: ['Something corporate happened and your updates didn’t make it.'] },
}
function DeadScreen({ result, sprint, onRetry, onDesktop }: { result: RunResult; sprint: number; onRetry: () => void; onDesktop: () => void }) {
  const copy = DEATH_COPY[result.cause ?? 'wall'] ?? DEATH_COPY.wall
  // pick a line once, when this death screen mounts (stable until next death)
  const [line] = useState(() => copy.lines[Math.floor(Math.random() * copy.lines.length)])
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center p-6 bg-black/70">
      <div className="max-w-md w-full text-center font-mono text-white">
        <div className="text-5xl mb-3">{copy.emoji}</div>
        <h1 className="text-2xl font-black mb-2" style={{ color: PAL.gap, fontFamily: 'sans-serif' }}>
          {copy.title}
        </h1>
        <p className="text-white/70 text-sm mb-4">{line}</p>
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

// ---- Win: the Sprint-Run Retrospective (matches the Phase-1 ending) ----
// Crossing the final gate surfaces you out of the computer → this light-Jira
// retrospective. Thematic, witty achievements run down the right side; the ones
// you earned this run get the full golden treatment (pop + shimmer + sparkle +
// chord-ding fanfare), reusing the same CSS/audio as Phase 1.
const POP_STAGGER_MS = 150
const SPARKLE_DIRECTIONS = Array.from({ length: 8 }, (_, i) => {
  const angle = (i / 8) * Math.PI * 2 + Math.PI / 16
  const r = 38 + (i % 2 === 0 ? 0 : 6)
  return { dx: Math.cos(angle) * r, dy: Math.sin(angle) * r }
})
const totalDodged = (r: RunResult) => {
  const d = r.dodged
  return d ? d.slack + d.worms + d.invites + d.walls : 0
}
type JRAchv = JRAchievementMeta & { earned: (r: RunResult) => boolean }
// Earned-conditions keyed by id. The badge METADATA (emoji/title/desc) lives in
// the shared catalog (content/jrAchievements.ts) so the level-select menu can
// list these without importing the heavy runner; here we just attach the
// per-run predicate to each catalog entry.
const JR_EARNED: Record<string, (r: RunResult) => boolean> = {
  shipped: () => true,
  novalue: () => true,
  flow: () => true,
  dnd: (r) => (r.dodged?.slack ?? 0) >= 12,
  lurker: (r) => (r.dodged?.slack ?? 0) >= 16,
  worms: (r) => (r.dodged?.worms ?? 0) >= 16,
  declined: (r) => (r.dodged?.invites ?? 0) >= 17,
  unblock: (r) => (r.dodged?.walls ?? 0) >= 24,
  ninja: (r) => totalDodged(r) >= 75,
  hoarder: (r) => r.score >= 10000,
}
const JR_ACHIEVEMENTS: JRAchv[] = JR_ACHIEVEMENTS_CATALOG.map((a) => ({ ...a, earned: JR_EARNED[a.id] }))

function JiraRunNav() {
  return (
    <div className="flex items-center gap-4 px-4 h-10 bg-white border-b border-[#dfe1e6] flex-shrink-0">
      <div className="flex items-center gap-2">
        <div className="w-6 h-6 rounded bg-[#0052cc] text-white flex items-center justify-center text-xs font-bold">A</div>
        <span className="text-sm font-semibold">Alignly</span>
      </div>
      <div className="hidden md:flex items-center gap-4 text-[13px] text-[#42526e]">
        <span>Your work</span><span>Projects</span><span>Filters</span><span>Dashboards</span>
      </div>
      {/* LP = Leonard P. — the assignee name on his own tickets. (Was "LC",
          while /play said "LB": three initials for one Leonard.) */}
      <div className="ml-auto w-7 h-7 rounded-full bg-[#0052cc] text-white flex items-center justify-center text-[11px] font-bold">LP</div>
    </div>
  )
}
function JRMetric({ label, value, bad }: { label: string; value: string; bad?: boolean }) {
  return (
    <div className="flex items-center">
      <div className="flex-1 text-[#5e6c84]">{label}</div>
      <div className={`font-mono font-semibold ${bad ? 'text-[#bf2600]' : 'text-[#172b4d]'}`}>{value}</div>
    </div>
  )
}
function WinScreen({ result, onDesktop }: { result: RunResult; onDesktop: () => void }) {
  // burst-through-the-screen white flash that fades into the retrospective
  const [flash, setFlash] = useState(1)
  useEffect(() => {
    const id = requestAnimationFrame(() => setFlash(0))
    return () => cancelAnimationFrame(id)
  }, [])
  const total = totalDodged(result)
  const earned = JR_ACHIEVEMENTS.filter((a) => a.earned(result))
  const earnedSet = new Set(earned.map((a) => a.id))
  const popOrder = new Map(earned.map((a, i) => [a.id, i]))
  // achievement fanfare: a chord-ding per earned card, then a TA-DA finale
  useEffect(() => {
    // persist what was earned this win so the level-select menu can show it
    saveJRUnlocked(earned.map((a) => a.id))
    // Receipts: carry the run forward (Phase 3 radio / Phase 4 Exec can
    // reference how the ticket sprint went). See campaignState.ts.
    writePhase2Final({ updatesDeposited: 4, storyPoints: result.score, distractionsSurvived: total })
    const pops = earned.map((_, i) => setTimeout(() => audio.playAchievementPop(i), i * POP_STAGGER_MS))
    const fan = setTimeout(() => audio.playAchievementFanfare(), (earned.length - 1) * POP_STAGGER_MS + 550)
    return () => { pops.forEach(clearTimeout); clearTimeout(fan) }
    // run once on mount (result is fixed for this win)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="fixed inset-0 z-40 bg-[#f4f5f7] text-[#172b4d] flex flex-col overflow-hidden">
      <div className="pointer-events-none fixed inset-0 z-50 bg-white transition-opacity duration-700" style={{ opacity: flash }} />
      <JiraRunNav />
      <div className="px-6 pt-3 pb-2 flex-shrink-0">
        <div className="max-w-5xl mx-auto">
          <div className="text-[12px] text-[#5e6c84]">Projects › Customer Happiness Portal Refresh › Jira Run › Retrospective</div>
          <div className="flex items-baseline justify-between mt-0.5 gap-3 flex-wrap">
            <h1 className="text-[20px] font-semibold">
              Ticket-update run — <span className="text-[#006644]">Complete</span>
            </h1>
            <div className="text-[12px] text-[#5e6c84]">4/4 updates · {earned.length}/{JR_ACHIEVEMENTS.length} achievements</div>
          </div>
        </div>
      </div>
      <div className="flex-1 min-h-0 overflow-y-auto px-6 pb-4">
        <div className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-4 pt-1">
          {/* LEFT: outcome + metrics + CTAs */}
          <div className="max-w-2xl w-full mx-auto flex flex-col gap-3">
            <div className="rounded border px-4 py-3" style={{ backgroundColor: '#e3fcef', borderColor: '#abf5d1' }}>
              <div className="text-[10px] uppercase tracking-widest font-semibold" style={{ color: '#006644' }}>Sprint goal · ✓ Met</div>
              <div className="text-[20px] font-semibold mt-0.5">One (1) full hour, uninterrupted</div>
              <div className="text-[13px] text-[#42526e] mt-2 leading-relaxed">
                Congratulations — you worked one full hour uninterrupted by the constant barrage of
                Slack pings and calendar invites. You surfaced back out of the screen and blinked awake
                at your own desk. <span className="font-semibold text-[#172b4d]">You created zero business value.</span>
              </div>
            </div>
            <div className="bg-white border border-[#dfe1e6] rounded p-3">
              <div className="text-[10px] uppercase tracking-widest text-[#5e6c84] mb-1.5">Run metrics</div>
              <div className="grid grid-cols-2 gap-x-6 gap-y-0.5 text-[12px]">
                <JRMetric label="Updates deposited" value="4 / 4" />
                <JRMetric label="Story points" value={result.score.toLocaleString()} />
                <JRMetric label="Distractions survived" value={String(total)} />
                <JRMetric label="Actual business value" value="$0.00" bad />
              </div>
            </div>
            {/* Progression hand-off to the next phase. The Exec's ping — the
                reason the salmon bowl exists at all — now lives on Lunch Dash's
                OWN intro, which is itself a phone-notification screen, so it
                isn't shown twice back-to-back. Here we just offer the clean
                "next level" step; clicking it evolves into that phone screen. */}
            <div className="flex flex-col gap-2 items-start">
              <Link
                to="/play/lunch-dash"
                className="inline-block rounded px-6 py-3 text-white text-[15px] font-semibold hover:brightness-110 transition"
                style={{ background: '#00875a' }}
              >
                ▶ Next level: Lunch Dash →
              </Link>
              <div className="flex gap-2 flex-wrap">
                <button onClick={onDesktop} className="px-4 py-2.5 rounded border border-[#dfe1e6] bg-white text-[#42526e] text-[13px] font-medium hover:bg-[#f4f5f7] transition">⎋ Back to desk</button>
                <Link to="/play" className="px-5 py-2.5 rounded border border-[#dfe1e6] bg-white text-[#42526e] text-[13px] font-medium hover:bg-[#f4f5f7] transition text-center">☰ Level select</Link>
                <Link to="/" className="px-4 py-2.5 rounded border border-[#dfe1e6] bg-white text-[#42526e] text-[13px] font-medium hover:bg-[#f4f5f7] transition text-center">← Studio</Link>
              </div>
            </div>
          </div>
          {/* RIGHT: thematic achievements with golden effects */}
          <div className="grid grid-cols-2 gap-2 self-start">
            {JR_ACHIEVEMENTS.map((a) => {
              const got = earnedSet.has(a.id)
              const idx = popOrder.get(a.id)
              const delay = got && idx !== undefined ? `${idx * POP_STAGGER_MS}ms` : undefined
              return (
                <div
                  key={a.id}
                  className={['relative px-2.5 py-2 rounded border', got ? 'border-[#f5cd47] bg-[#fff7d6] text-[#172b4d] achievement-pop' : 'border-[#dfe1e6] bg-[#f4f5f7] text-[#5e6c84]'].join(' ')}
                  style={delay ? ({ '--pop-delay': delay } as CSSProperties) : undefined}
                >
                  {got && <span className="achievement-shimmer" />}
                  {got && SPARKLE_DIRECTIONS.map((dir, i) => (
                    <span key={i} className={`achievement-sparkle${i % 2 === 0 ? '' : ' cream'}`} style={{ '--dx': `${dir.dx}px`, '--dy': `${dir.dy}px` } as CSSProperties} />
                  ))}
                  <div className="relative z-10">
                    <div className="flex items-start gap-1.5">
                      <span className="text-sm leading-none flex-shrink-0 mt-0.5" style={!got ? { filter: 'grayscale(1)', opacity: 0.45 } : undefined}>{a.emoji}</span>
                      <span className="text-[11px] font-semibold leading-tight flex-1 min-w-0">{a.title}</span>
                    </div>
                    <div className="text-[10px] leading-snug mt-1 opacity-80">{a.desc}</div>
                  </div>
                </div>
              )
            })}
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
  let muted = false
  const ac = () => (ctx ??= new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)())
  function blip(freq: number, dur: number, type: OscillatorType = 'square', vol = 0.12, slideTo?: number) {
    if (muted) return
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
    setMuted: (m: boolean) => { muted = m },
    warp: () => { blip(180, 0.5, 'sawtooth', 0.1, 900) },
    token: () => { blip(880, 0.08, 'square', 0.09, 1320) },
    deposit: () => { [523, 659, 784, 1047].forEach((f, i) => setTimeout(() => blip(f, 0.12, 'square', 0.12), i * 70)) },
    crash: () => { blip(300, 0.4, 'sawtooth', 0.16, 60) },
    win: () => { [523, 659, 784, 1047, 1319].forEach((f, i) => setTimeout(() => blip(f, 0.18, 'triangle', 0.14), i * 110)) },
  }
})()
