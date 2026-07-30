// Performance Review — Phase 4 route shell (Build C2: the three-bout gauntlet).
//
// Brent (Architecture Sync) → Priya (Product Review) → the Exec (The Ask).
// Fight cards punctuate the bouts, each result CHAINS into the next opener
// (score → starting Credibility), losses advance with a handicap (Mercy:
// never a wall), and the gauntlet ends in a graybox rating screen. Full
// endings/stat-sheet/The Stare are Build H.

import { Suspense, useEffect, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import * as THREE from 'three'
import { PerformanceMonitor } from '@react-three/drei'
import { EffectComposer, Bloom, Vignette, ToneMapping } from '@react-three/postprocessing'
import { ToneMappingMode } from 'postprocessing'

// Per-stage bloom. The Grid is dark neon and WANTS glow; the Product studio is
// pale, so anything but a near-1 threshold blooms the whole frame into white
// fog; the boardroom sits between (its city windows and sun should glow, the
// room shouldn't). Vignette is lighter on the bright stage too.
// Thresholds are HIGH on purpose: a low threshold bleeds midtones and produces
// a milky haze that reads as flat. High threshold + real HDR emissives (see the
// stage light bars) means only genuine emitters glow — which is what makes neon
// read as light rather than as bright paint.
const BLOOM: Record<string, { intensity: number; threshold: number; vignette: number }> = {
  brent: { intensity: 1.2, threshold: 0.86, vignette: 0.6 },
  priya: { intensity: 0.25, threshold: 0.97, vignette: 0.32 },
  exec: { intensity: 0.9, threshold: 0.82, vignette: 0.45 },
}
import { FightWorld } from './FightWorld'
import { FightCamera } from './FightCamera'
import { FightHud } from './FightHud'
import { CalendarScreen, MeetingLobby } from './CalendarScreen'
import { CAMERA } from './fightConfig'
import { fight, leonard, opponent, resetFight, stepFight } from './fighterState'
import { readLeonardIntent } from './fightInput'
import {
  BOUTS,
  currentBout,
  gauntlet,
  gauntletOver,
  recordBout,
  resetGauntlet,
  leonardStartHP,
  finalRating,
  type BoutConfig,
} from './boutState'
import {
  resetDummy,
  readDummyIntent,
  setOpponentProfile,
  EXEC_AI,
  BRENT_AI,
  PRIYA_AI,
  type AIProfile,
} from './dummyAI'

type Phase = 'calendar' | 'briefing' | 'fighting' | 'boutEnd' | 'over'

const PROFILES: Record<BoutConfig['ai'], AIProfile> = {
  turtle: BRENT_AI,
  rushdown: PRIYA_AI,
  boss: EXEC_AI,
}

// Photomode doors (press-kit capture, DEV-only): read once at module scope so
// the door decides the INITIAL phase instead of set-state-ing after mount.
//   ?photomode=brent|priya|exec — skip calendar+lobby, fight starts live
//   &hp=NN / &ohp=NN            — starting bars (1-100); low bars unlock the
//                                 tier-3/4 desperation dialogue
//   ?photomode=lobby            — hold on the Meet green room for stills
const DOOR_Q = import.meta.env.DEV ? new URLSearchParams(window.location.search) : null
const DOOR = DOOR_Q?.get('photomode') ?? null
const DOOR_BOUT = DOOR ? ['brent', 'priya', 'exec'].indexOf(DOOR) : -1
// Set before first render so the Canvas key + stage dressing match the door's
// bout (the mount effect re-asserts this after resetGauntlet()).
if (DOOR_BOUT >= 0) gauntlet.index = DOOR_BOUT

export default function PerformanceReview() {
  const [phase, setPhase] = useState<Phase>(
    DOOR_BOUT >= 0 ? 'fighting' : DOOR === 'lobby' ? 'briefing' : 'calendar'
  )
  const [joining, setJoining] = useState(false) // shell fading out into the room
  const [, bump] = useState(0) // re-render after gauntlet index changes
  // The 3D scene's dressing, LATCHED. recordBout() advances gauntlet.index
  // before we switch to 'boutEnd', so currentBout() — and therefore the Canvas
  // key — used to flip on the very render that paints the result card: React
  // destroyed and rebuilt the entire WebGL context (renderer, both bodies, every
  // clip, the shadow map) under a 72%-opaque overlay. That is the multi-hundred-
  // millisecond stall at the transition. Latching means the remount happens
  // later, while the fully opaque calendar shell covers the screen — which is
  // exactly what that shell exists for.
  const [stage, setStage] = useState<BoutConfig>(() => currentBout())
  // ADAPTIVE RESOLUTION. The stages now carry a reflective floor, a bloom
  // chain and three canvas layers each — comfortably fine on this machine, but
  // the blueprint's constraint is "browser-playable on a midrange laptop" and
  // that is a machine we cannot test here. PerformanceMonitor watches real
  // frame pacing and drops render resolution before the fight starts dropping
  // frames, then restores it when there's headroom again. Gameplay is a fixed
  // 60Hz sim, so this only ever costs sharpness, never feel.
  const [dpr, setDpr] = useState(1.5)

  useEffect(() => {
    resetGauntlet()
    resetFight()
    resetDummy()
    if (import.meta.env.DEV) {
      ;(window as unknown as { __fight?: unknown }).__fight = {
        fight, leonard, opponent, resetFight, stepFight, resetDummy, readDummyIntent, gauntlet,
        readLeonardIntent,
      }
      // Photomode door entry: phase already started at 'fighting' (see DOOR_*
      // above); here we prime the actual bout state to match.
      if (DOOR_BOUT >= 0 && DOOR_Q) {
        gauntlet.index = DOOR_BOUT
        const bout = BOUTS[DOOR_BOUT]
        setOpponentProfile(PROFILES[bout.ai])
        const hp = Number(DOOR_Q.get('hp'))
        const ohp = Number(DOOR_Q.get('ohp'))
        resetFight({
          oppMoves: bout.moves,
          leoHP: hp >= 1 && hp <= 100 ? hp : 100,
          oppHP: ohp >= 1 && ohp <= 100 ? ohp : bout.startHP,
          regenPerSec: bout.regenPerSec,
          voice: bout.voice,
          oppScale: bout.oppScale,
        })
        resetDummy()
        fight.started = true
      }
    }
    // Photomode doors move gauntlet.index above; re-assert the latched stage.
    setStage(currentBout())
  }, [])

  // Watch for the bout ending (KO freeze drains first so the impact holds).
  useEffect(() => {
    if (phase !== 'fighting') return
    let raf = 0
    let alive = true
    const loop = () => {
      if (!alive) return
      if (fight.over && fight.hitstop <= 0) {
        const won = fight.winner === 'leonard'
        recordBout(won, won ? leonard.health / leonard.maxHealth : 0)
        setPhase('boutEnd')
      } else raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => {
      alive = false
      cancelAnimationFrame(raf)
    }
  }, [phase])

  const beginBout = () => {
    const bout = currentBout()
    setOpponentProfile(PROFILES[bout.ai])
    resetFight({
      oppMoves: bout.moves,
      leoHP: leonardStartHP(), // THE CHAIN: last bout's score writes this opener
      oppHP: bout.startHP, // the ramp up the org chart
      regenPerSec: bout.regenPerSec,
      voice: bout.voice,
      oppScale: bout.oppScale, // the Exec's size is a gameplay fact, not just art
    })
    resetDummy()
    fight.started = true
    setPhase('fighting')
  }

  // Fade the whole shell out over the room, THEN start the bout — so the last
  // thing you see is the meeting UI dissolving into the arena, not a cut.
  const startFight = () => {
    if (joining) return
    setJoining(true)
    window.setTimeout(() => {
      beginBout()
      setJoining(false)
    }, 420)
  }

  const rematch = () => {
    resetGauntlet()
    setStage(currentBout()) // remount the arena behind the opaque calendar
    bump((n) => n + 1)
    setPhase('calendar')
  }

  const continueFromBoutEnd = () => {
    // Clear the last bout's floating lines so they don't haunt the calendar.
    leonard.callout = opponent.callout = ''
    leonard.calloutT = opponent.calloutT = 0
    // NOW re-dress the room: the opaque calendar shell is about to cover the
    // screen, so the WebGL remount happens out of sight instead of under the
    // result card (see the `stage` latch above).
    setStage(currentBout())
    bump((n) => n + 1)
    setPhase(gauntletOver() ? 'over' : 'calendar')
  }

  const bout = currentBout()

  return (
    <div style={{ position: 'fixed', inset: 0, background: '#1a1712' }}>
      {/* keyed on the LATCHED stage, not currentBout(): the room re-dresses
          itself between agenda items, but only once the opaque calendar shell
          is covering the screen — never under the result card. */}
      <Canvas
        key={stage.key}
        shadows
        dpr={dpr}
        camera={{ position: [0, CAMERA.height + 0.6, CAMERA.zoomWide], fov: CAMERA.fov }}
        // NoToneMapping + an AgX pass at the END of the composer. R3F defaults
        // to ACESFilmic, which desaturates and hue-skews bright saturated
        // colour — actively fighting a stage whose whole identity is saturated
        // cyan-blue neon. Tone mapping must also come LAST or colours are
        // clamped to 0–1 before Bloom ever sees true HDR.
        gl={{ antialias: true, toneMapping: THREE.NoToneMapping }}
        // DEV: expose the renderer so draw calls / triangles can be MEASURED
        // during a perf audit rather than estimated.
        onCreated={({ gl }) => {
          if (import.meta.env.DEV) (window as unknown as { __gl?: unknown }).__gl = gl
        }}
      >
        <PerformanceMonitor
          onDecline={() => setDpr(1)}
          onIncline={() => setDpr(1.5)}
          flipflops={3}
          onFallback={() => setDpr(1)}
        />
        <color attach="background" args={[stage.stage.bg]} />
        <fog attach="fog" args={[stage.stage.fog, stage.stage.fogNear, stage.stage.fogFar]} />
        <Suspense fallback={null}>
          <FightWorld keyLight={stage.stage.light} boutKey={stage.key} oppScale={stage.oppScale} />
        </Suspense>
        <FightCamera />
        {/* Bloom is what makes emissive neon read as LIGHT rather than as a
            bright-coloured surface. It must be tuned PER STAGE: a single global
            setting that flatters the dark neon Grid turns the pale Product
            studio into white haze, because on a light set most pixels clear the
            luminance threshold and bloom the entire image. Static intensity —
            no pulsing — per the photosensitivity rule. */}
        <EffectComposer enableNormalPass={false}>
          <Bloom
            mipmapBlur
            intensity={BLOOM[stage.key]?.intensity ?? 0.85}
            luminanceThreshold={BLOOM[stage.key]?.threshold ?? 0.62}
            luminanceSmoothing={0.25}
          />
          <Vignette eskil={false} offset={0.3} darkness={BLOOM[stage.key]?.vignette ?? 0.6} />
          <ToneMapping mode={ToneMappingMode.AGX} />
        </EffectComposer>
      </Canvas>

      {(phase === 'fighting' || phase === 'boutEnd') && <FightHud />}

      {/* ── PRE-FIGHT SHELL ────────────────────────────────────────────────
          One opaque layer that spans BOTH the calendar and the lobby. The 3D
          arena is always live underneath, so anything that lets light through
          between those screens shows a frame of the two fighters standing
          there — which is exactly the flash that used to happen on Join. The
          shell never unmounts during the handover; it only fades once, at the
          end, which is what "entering the meeting" should feel like. */}
      {(phase === 'calendar' || phase === 'briefing') && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 30,
            // white desktop → Meet's dark room, eased rather than cut
            background: phase === 'briefing' ? '#202124' : '#ffffff',
            transition: 'background-color 320ms ease, opacity 420ms ease',
            opacity: joining ? 0 : 1,
            pointerEvents: joining ? 'none' : 'auto',
          }}
        >
          {phase === 'calendar' && (
            // First meeting of the day detours through the lobby (the controls
            // live there); later joins go straight in — you know the drill.
            <CalendarScreen onJoin={() => (gauntlet.index === 0 ? setPhase('briefing') : startFight())} />
          )}
          {phase === 'briefing' && (
            <MeetingLobby title={bout.cal.title} organizer={bout.name} onEnter={startFight} />
          )}
        </div>
      )}
      {phase === 'boutEnd' && <BoutEndCard onContinue={continueFromBoutEnd} />}
      {phase === 'over' && <GauntletResult onRematch={rematch} />}
    </div>
  )
}

function BoutEndCard({ onContinue }: { onContinue: () => void }) {
  const last = gauntlet.results[gauntlet.results.length - 1]
  const bout = BOUTS.find((b) => b.key === last.opponent)!
  const more = !gauntletOver()
  return (
    <Overlay>
      <div style={{ ...kicker, color: last.won ? '#7bbf7b' : '#c8492f' }}>
        {last.won ? 'AGENDA ITEM CLOSED' : 'JUDGED AGAINST YOU'}
      </div>
      <h1 style={{ fontSize: 26, margin: '10px 0 6px', fontWeight: 700 }}>
        {last.won ? `“${bout.koLine}”` : bout.lossLine}
      </h1>
      {last.won && (
        <div style={{ fontSize: 13, color: '#b9b2a0', marginBottom: 4 }}>
          Walked out at {Math.round(last.scorePct * 100)}% credibility.
        </div>
      )}
      <div style={{ fontSize: 12, color: '#8f887a', marginBottom: 18 }}>
        {more ? 'Your calendar is already pinging.' : 'The building is quiet. Reception prints your rating.'}
      </div>
      <button style={btn} onClick={onContinue}>{more ? 'BACK TO CALENDAR →' : 'SEE THE REVIEW →'}</button>
    </Overlay>
  )
}

function GauntletResult({ onRematch }: { onRematch: () => void }) {
  const rating = finalRating()
  const color = rating === 'PIP' ? '#c8492f' : rating === 'EXCEEDS EXPECTATIONS' ? '#e8c15a' : '#7bbf7b'
  const sub =
    rating === 'PIP'
      ? '“We’re really investing in your growth.” The form is signed with the same handshake as victory.'
      : rating === 'EXCEEDS EXPECTATIONS'
        ? 'The project is greenlit for Phase 2 of the Portal Refresh. Nothing was ever built in Phase 1.'
        : 'Sign-off achieved. The cycle begins again.'
  return (
    <Overlay>
      <div style={kicker}>3:30 PM · ANNUAL REVIEW — FINAL</div>
      <h1 style={{ fontSize: 30, margin: '10px 0 6px', fontWeight: 700, color }}>{rating}</h1>
      <div style={{ fontSize: 13, color: '#b9b2a0', maxWidth: 480, marginBottom: 16 }}>{sub}</div>
      <div style={{ ...controls, textAlign: 'left' }}>
        {gauntlet.results.map((r) => {
          const b = BOUTS.find((x) => x.key === r.opponent)!
          return (
            <div key={r.opponent}>
              <b>{b.cardTitle}</b> — {r.won ? `convinced at ${Math.round(r.scorePct * 100)}% credibility` : 'unconvinced'}
            </div>
          )
        })}
        <div style={{ marginTop: 10, color: '#e8c15a', fontWeight: 700 }}>
          Actual Business Value Generated: $0.00
        </div>
      </div>
      <button style={btn} onClick={onRematch}>REQUEST A FOLLOW-UP REVIEW ↻</button>
    </Overlay>
  )
}

function Overlay({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        // Defence in depth for the transition-flicker fix: anything still moving
        // behind the card reaches the eye at 10% contrast instead of 28%.
        background: 'rgba(20,17,12,0.9)',
        color: '#e8e2d2',
        fontFamily: '"IBM Plex Mono", ui-monospace, Menlo, monospace',
        zIndex: 20,
      }}
    >
      {children}
    </div>
  )
}

const kicker: React.CSSProperties = { fontSize: 11, letterSpacing: '0.3em', color: '#b9976a' }
const controls: React.CSSProperties = {
  fontSize: 12,
  lineHeight: 1.9,
  color: '#cfc8b6',
  background: 'rgba(0,0,0,0.35)',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: 4,
  padding: '14px 18px',
  marginBottom: 20,
}
const btn: React.CSSProperties = {
  fontFamily: 'inherit',
  fontSize: 13,
  letterSpacing: '0.12em',
  color: '#1a1712',
  background: '#e8c15a',
  border: 'none',
  borderRadius: 3,
  padding: '12px 22px',
  cursor: 'pointer',
  fontWeight: 700,
}
