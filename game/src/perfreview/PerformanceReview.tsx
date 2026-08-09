// Performance Review — Phase 4 route shell (Build C2: the three-bout gauntlet).
//
// Brent (Architecture Sync) → Priya (Product Review) → the Exec (The Ask).
// Fight cards punctuate the bouts. MUST-WIN progression (playtest
// 2026-08-03): a lost bout regenerates — the invite reappears and you take
// the same room again; only wins advance the day, so the final rating
// screen is only ever reached with all three convinced. Full
// endings/stat-sheet/The Stare are Build H.

import { Suspense, useEffect, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import * as THREE from 'three'
import { PerformanceMonitor } from '@react-three/drei'
import { EffectComposer, Bloom, Vignette, ToneMapping } from '@react-three/postprocessing'
import { ToneMappingMode } from 'postprocessing'

// TONE MAPPING IS PER STAGE, and this is the single biggest reason Priya's set
// read dim no matter how much light went into it. AgX is a FILMIC curve: it
// deliberately compresses midtones and desaturates on the way to a soft
// highlight rolloff, which is exactly right for Brent's dark neon and the Exec's
// blown-out sunset, and exactly wrong for a bright pastel studio — it was
// eating the light faster than the rig could add it. Khronos PBR Neutral keeps
// midtone brightness and saturation and only rolls off the very top end.
const TONEMAP: Record<string, number> = {
  brent: ToneMappingMode.AGX,
  priya: ToneMappingMode.NEUTRAL,
  exec: ToneMappingMode.AGX,
}

// Per-stage bloom. The Grid is dark neon and WANTS glow; the Product studio is
// pale, so anything but a near-1 threshold blooms the whole frame into white
// fog; the boardroom sits between (its city windows and sun should glow, the
// room shouldn't). Vignette is lighter on the bright stage too.
// Thresholds are HIGH on purpose: a low threshold bleeds midtones and produces
// a milky haze that reads as flat. High threshold + real HDR emissives (see the
// stage light bars) means only genuine emitters glow — which is what makes neon
// read as light rather than as bright paint.
const BLOOM: Record<string, { intensity: number; threshold: number; vignette: number }> = {
  // 0.78 / 0.93 (was 1.2 / 0.86): at the higher intensity the floor light bars
  // bled into a milky wash over the whole arena — the "cloudiness". Raising the
  // threshold keeps the glow on genuine emitters only.
  brent: { intensity: 0.78, threshold: 0.93, vignette: 0.6 },
  // vignette 0.32 → 0.18: on a light stage the post vignette is a second
  // darkening on top of the floor texture's own, and the two stacked into the
  // dim, grey-cornered look. The floor's painted vignette is the one doing real
  // compositional work; this one only needs to seal the frame edge.
  priya: { intensity: 0.25, threshold: 0.97, vignette: 0.18 },
  exec: { intensity: 0.9, threshold: 0.82, vignette: 0.45 },
}
import { FightWorld } from './FightWorld'
import { FightCamera } from './FightCamera'
import { FightHud } from './FightHud'
import { CalendarScreen, MeetingLobby } from './CalendarScreen'
import { CAMERA, ROUND } from './fightConfig'
import { fight, leonard, opponent, resetFight, stepFight } from './fighterState'
import { readLeonardIntent } from './fightInput'
import {
  BOUTS,
  currentBout,
  gauntlet,
  gauntletOver,
  recordBout,
  retryBout,
  sprintCredit,
  resetGauntlet,
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
import { markBeaten } from '../state/progress'
import { FIGHT_ACHIEVEMENTS_CATALOG, loadFightUnlocked, saveFightUnlocked } from '../content/fightAchievements'
import { setAnnouncerGender, announce, primeAnnouncer } from './fightAudio'
import { fightMusic } from './fightMusic'
import { rigReady } from './AnimatedFighter'

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
// ?sandbag=1 — TRAINING MODE: the opponent stands passive (same switch the
// capture harness uses). For verifying a move's look with human eyes without
// the live AI blocking/stuffing it: land the move, watch the reaction, remove
// the param for the real fight.
if (DOOR_Q?.has('sandbag')) (globalThis as { __sandbag?: boolean }).__sandbag = true
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
    // Warm the announcer cache while the player reads the calendar — the
    // first "FIGHT!" must not race its own mp3 decode.
    primeAnnouncer()
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
          oppTech: bout.throwTech,
        })
        resetDummy()
        fight.started = true
        // the door skips beginBout, so start the score here too — captures
        // and probes should hear what the player hears
        setAnnouncerGender(bout.key === 'priya' ? 'her' : 'him')
        fightMusic.start(bout.key, 'kombat', 0)
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
        // ── Achievements: per-bout awards, judged on a WON room only ──────
        // (content/fightAchievements.ts holds the catalog; predicates live
        // here, next to the stats — same split as the other three games.)
        if (won) {
          const earned: string[] = []
          if (leonard.health >= leonard.maxHealth * 0.88) earned.push('flawless')
          if (fight.statMinHP <= leonard.maxHealth * 0.1) earned.push('comeback')
          if (fight.statThrowsLanded >= 5) earned.push('offline')
          if (fight.statThrowsAttempted === 0) earned.push('strictly')
          if (fight.statBlocks >= 12) earned.push('listener')
          if (ROUND.seconds - fight.time <= 30) earned.push('hardstop')
          if (fight.statTeched >= 3) earned.push('however')
          // day-level, judged when the Exec falls (must-win: that means 3/3)
          if (gauntletOver()) {
            earned.push('aligned')
            if (finalRating() === 'EXCEEDS EXPECTATIONS') earned.push('exceeds')
            if (gauntlet.retries === 0) earned.push('noresched')
          }
          if (earned.length) saveFightUnlocked(earned)
        }
        // CAMPAIGN: the day is BEATEN when the Exec is convinced. Under
        // must-win progression this only happens with all three rooms won —
        // losses regenerate the meeting instead of advancing (retryBout).
        if (gauntletOver() && won) markBeaten('phase4')
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
    // THE ANNOUNCER: Priya gets "FINISH HER!"; everyone gets "FIGHT!" as the
    // arena fades in (0.25s — the shout lands right as control is handed over).
    setAnnouncerGender(bout.key === 'priya' ? 'her' : 'him')
    primeAnnouncer()
    setOpponentProfile(PROFILES[bout.ai])
    resetFight({
      oppMoves: bout.moves,
      leoHP: 100, // every meeting is a fresh room (the mercy chain retired — boutState)
      oppHP: bout.startHP, // the ramp up the org chart
      regenPerSec: bout.regenPerSec,
      voice: bout.voice,
      oppScale: bout.oppScale, // the Exec's size is a gameplay fact, not just art
      oppTech: bout.throwTech,
      leoMeter: sprintCredit().bars, // the Jira Run coins, cashed in (B2)
    })
    resetDummy()
    setPhase('fighting')
    // THE GATE (playtest 2026-08-03): don't start the clock — or shout
    // "FIGHT!" — until both bodies are actually standing in the arena. On a
    // cold first load ~14MB of character GLBs can still be in flight when the
    // player clicks JOIN, and the bout opened with Brent punching the empty
    // spot where Leonard hadn't loaded yet. rigReady flips as each fighter's
    // Suspense resolves; the 8s ceiling means a stalled network degrades to
    // the old behavior instead of hanging the fight forever.
    const t0 = Date.now()
    const ignite = () => {
      if (fight.started || fight.over) return
      if ((rigReady.leonard && rigReady.opponent) || Date.now() - t0 > 8000) {
        announce('fight', 0.25)
        // THE SCORE — Corporate Kombat (Rebecca's pick, 2026-08-03): each
        // bout's own arrangement; FightWorld feeds it heat from the health
        // bars every frame and cuts it dead at the KO.
        fightMusic.start(bout.key, 'kombat', 0)
        fight.started = true
      } else {
        window.setTimeout(ignite, 100)
      }
    }
    ignite()
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
    resetFight() // same stale-pose wipe as continueFromBoutEnd
    resetDummy()
    setStage(currentBout()) // remount the arena behind the opaque calendar
    bump((n) => n + 1)
    setPhase('calendar')
  }

  // A LOSS is one keypress from the rematch (playtest: "too much clicking
  // after you get defeated"). No calendar round-trip: undo the recorded loss,
  // wipe the scene, and beginBout the SAME meeting directly — the stage never
  // changes on a retry, so there's no remount to hide.
  const retrySameBout = () => {
    leonard.callout = opponent.callout = ''
    leonard.calloutT = opponent.calloutT = 0
    retryBout()
    beginBout()
  }

  const continueFromBoutEnd = () => {
    // Clear the last bout's floating lines so they don't haunt the calendar.
    leonard.callout = opponent.callout = ''
    leonard.calloutT = opponent.calloutT = 0
    // WIPE THE POSE NOW, not at beginBout(). startFight() fades the opaque
    // shell out over 420ms BEFORE beginBout() runs, so for those 420ms the live
    // arena is visible — and it was still holding the LAST bout's state. You'd
    // see the NEW opponent (Priya) lying in the position the OLD one (Brent)
    // was knocked down in, then snap upright. Resetting here means the scene
    // under the shell is already neutral before it starts to fade.
    resetFight()
    resetDummy()
    // NOW re-dress the room: the opaque calendar shell is about to cover the
    // screen, so the WebGL remount happens out of sight instead of under the
    // result card (see the `stage` latch above). (Win path only — a LOSS goes
    // through retrySameBout above and never returns to the calendar.)
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
          <ToneMapping mode={TONEMAP[stage.key] ?? ToneMappingMode.AGX} />
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
            // EVERY meeting goes through the green room. It was first-bout-only
            // ("you know the drill"), but skipping it made later bouts start
            // abruptly — joining a call is the ritual this whole phase is built
            // on, and the controls recap is worth having each time.
            <CalendarScreen onJoin={() => setPhase('briefing')} />
          )}
          {phase === 'briefing' && (
            <MeetingLobby title={bout.cal.title} organizer={bout.name} onEnter={startFight} />
          )}
        </div>
      )}
      {phase === 'boutEnd' && <BoutEndCard onContinue={continueFromBoutEnd} onRetry={retrySameBout} />}
      {phase === 'over' && <GauntletResult onRematch={rematch} />}
    </div>
  )
}

// ── ROUND END ───────────────────────────────────────────────────────────────
// A fighting game does not fade up one centred paragraph. It STAGES the result:
// letterbox bars close, the verdict word slams in on an angled banner, then the
// numbers arrive under it, then the button. Each beat has a job — the slam is
// the punctuation on the KO, the stat strip is the "what just happened", the
// button is the only thing you can act on and so it lands last.
//
// PHOTOSENSITIVITY: every animation here runs ONCE, forward, and stops. Nothing
// loops, pulses or flashes — this stage already shipped one accidental strobe
// (see the KO fix in fighterState) and a result screen is exactly where a
// designer reaches for a flashing banner. Under prefers-reduced-motion every
// element is simply placed in its final state with no motion at all.
const SANS = '-apple-system, BlinkMacSystemFont, "Helvetica Neue", Helvetica, Arial, sans-serif'
const MONO = '"IBM Plex Mono", ui-monospace, Menlo, monospace'

const END_KEYFRAMES = `
@keyframes bo-bar-top   { from { transform: translateY(-100%) } to { transform: translateY(0) } }
@keyframes bo-bar-bot   { from { transform: translateY(100%) }  to { transform: translateY(0) } }
@keyframes bo-slam      { from { opacity: 0; transform: scale(1.5) } 60% { opacity: 1 } to { opacity: 1; transform: scale(1) } }
@keyframes bo-swipe     { from { transform: scaleX(0) } to { transform: scaleX(1) } }
@keyframes bo-rise      { from { opacity: 0; transform: translateY(10px) } to { opacity: 1; transform: translateY(0) } }
@media (prefers-reduced-motion: reduce) {
  [data-bo] { animation: none !important; opacity: 1 !important; transform: none !important }
}
`

function EndStyles() {
  return <style>{END_KEYFRAMES}</style>
}

/** One beat of the staged reveal. delay is in ms from the card appearing. */
function beat(name: string, dur: number, delay: number, extra = ''): React.CSSProperties {
  return {
    animation: `${name} ${dur}ms cubic-bezier(0.16, 0.84, 0.3, 1) ${delay}ms both${extra}`,
  }
}

function Letterbox() {
  const bar: React.CSSProperties = {
    position: 'absolute',
    left: 0,
    right: 0,
    height: '11vh',
    background: '#0b0a08',
    zIndex: 2,
  }
  return (
    <>
      <div data-bo style={{ ...bar, top: 0, ...beat('bo-bar-top', 380, 0) }} />
      <div data-bo style={{ ...bar, bottom: 0, ...beat('bo-bar-bot', 380, 0) }} />
    </>
  )
}

/** The verdict: a heavy word on a skewed banner that swipes open behind it.
 *  The skew is what reads as "fighting game" more than any other single
 *  choice — every result screen in the genre is built on a diagonal. */
function Verdict({ word, tint, ink }: { word: string; tint: string; ink: string }) {
  return (
    // The skew lives HERE, on a static wrapper, and nowhere else. It used to be
    // applied separately to the banner and to the word — with different
    // transform-origins — so the two sheared by different amounts and the last
    // letter of a long verdict ("UNCONVINCED") hung off the end of its own bar.
    <div
      style={{
        position: 'relative',
        display: 'inline-block',
        margin: '0 0 22px',
        zIndex: 3,
        transform: 'skewX(-9deg)',
        maxWidth: '86vw',
      }}
    >
      <div
        data-bo
        style={{
          position: 'absolute',
          inset: '-4px -30px',
          background: tint,
          transformOrigin: 'left center',
          ...beat('bo-swipe', 340, 120),
        }}
      />
      <div
        data-bo
        style={{
          position: 'relative',
          fontFamily: SANS,
          // Scales with the window the way a fighting game's result word does.
          // 5.6vw, not 6.4: at 6.4 the longest verdict spanned the whole frame.
          fontSize: 'clamp(30px, 5.6vw, 74px)',
          fontWeight: 800,
          letterSpacing: '-0.02em',
          lineHeight: 1.05,
          color: ink,
          padding: '2px 18px',
          whiteSpace: 'nowrap',
          ...beat('bo-slam', 300, 220),
        }}
      >
        {word}
      </div>
    </div>
  )
}

/** The corporate-terminal readout under the verdict. Mono belongs HERE — these
 *  are figures on a form — and nowhere near the verdict itself, which is the
 *  loudest thing on screen and needs a heavy sans to carry it. */
function StatStrip({ cells }: { cells: [string, string][] }) {
  return (
    <div
      data-bo
      style={{
        display: 'flex',
        gap: 1,
        background: 'rgba(255,255,255,0.1)',
        border: '1px solid rgba(255,255,255,0.1)',
        marginBottom: 22,
        zIndex: 3,
        ...beat('bo-rise', 320, 620),
      }}
    >
      {cells.map(([label, value]) => (
        <div key={label} style={{ background: '#141210', padding: '9px 20px', minWidth: 104 }}>
          <div style={{ fontFamily: MONO, fontSize: 9, letterSpacing: '0.18em', color: '#8f887a' }}>{label}</div>
          <div style={{ fontFamily: SANS, fontSize: 21, fontWeight: 700, color: '#e8e2d2', marginTop: 3 }}>{value}</div>
        </div>
      ))}
    </div>
  )
}

function BoutEndCard({ onContinue, onRetry }: { onContinue: () => void; onRetry: () => void }) {
  const last = gauntlet.results[gauntlet.results.length - 1]
  const bout = BOUTS.find((b) => b.key === last.opponent)!
  const more = !gauntletOver()
  const won = last.won
  // `fight` still holds the finished round — resetFight() does not run until
  // continueFromBoutEnd, so the numbers are live here.
  const secsLeft = Math.max(0, Math.ceil(fight.time))
  // ENTER advances (playtest: a defeat should be ONE keypress from the
  // rematch). Loss → straight back into the same room; win → the normal
  // continue. The handler mounts with the card, so a stray Enter mid-fight
  // can't skip anything.
  useEffect(() => {
    const act = won ? onContinue : onRetry
    const onKey = (e: KeyboardEvent) => {
      if (e.code === 'Enter' || e.code === 'NumpadEnter') {
        e.preventDefault()
        act()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [won, onContinue, onRetry])
  return (
    <Overlay>
      <EndStyles />
      <Letterbox />
      <div
        data-bo
        style={{
          fontFamily: MONO,
          fontSize: 10,
          letterSpacing: '0.34em',
          color: won ? '#7bbf7b' : '#c8492f',
          marginBottom: 14,
          zIndex: 3,
          ...beat('bo-rise', 280, 60),
        }}
      >
        {bout.name} · {won ? 'AGENDA ITEM CLOSED' : 'JUDGED AGAINST YOU'}
      </div>

      <Verdict
        word={won ? 'CONVINCED' : 'UNCONVINCED'}
        tint={won ? '#e8c15a' : '#c8492f'}
        ink={won ? '#1a1712' : '#fbeee9'}
      />

      {/* The line they actually say. Sans, and quoted only on a win — a loss is
          a verdict delivered ABOUT you, not a line spoken to you. */}
      <div
        data-bo
        style={{
          fontFamily: SANS,
          fontSize: 'clamp(14px, 1.5vw, 19px)',
          fontWeight: 500,
          lineHeight: 1.45,
          color: '#d8d2c2',
          maxWidth: 560,
          margin: '0 0 20px',
          zIndex: 3,
          ...beat('bo-rise', 320, 460),
        }}
      >
        {won ? `\u201C${bout.koLine}\u201D` : bout.lossLine}
      </div>

      <StatStrip
        cells={[
          ['CREDIBILITY', `${Math.round((won ? last.scorePct : 0) * 100)}%`],
          ['HITS LANDED', String(fight.leoHits)],
          ['HITS TAKEN', String(fight.oppHits)],
          ['HARD STOP', `${secsLeft}s`],
        ]}
      />

      <div data-bo style={{ zIndex: 3, ...beat('bo-rise', 300, 780) }}>
        <button style={btn} onClick={won ? onContinue : onRetry}>
          {/* MUST-WIN: a loss never advances — ENTER restarts the same room. */}
          {!won ? 'PRESS ENTER \u2014 REJOIN THE MEETING' : more ? 'BACK TO CALENDAR \u2192' : 'SEE THE REVIEW \u2192'}
        </button>
        <div style={{ fontFamily: MONO, fontSize: 11, color: '#8f887a', marginTop: 12 }}>
          {!won
            ? 'Same time. Same room. Attendance still required.'
            : more
              ? 'Your calendar is already pinging. (Enter works too.)'
              : 'The building is quiet. Reception prints your rating. (Enter works too.)'}
        </div>
      </div>
    </Overlay>
  )
}

function GauntletResult({ onRematch }: { onRematch: () => void }) {
  const rating = finalRating()
  const earnedSet = loadFightUnlocked()
  const tint = rating === 'PIP' ? '#c8492f' : rating === 'EXCEEDS EXPECTATIONS' ? '#e8c15a' : '#7bbf7b'
  const ink = rating === 'EXCEEDS EXPECTATIONS' ? '#1a1712' : '#fbeee9'
  const sub =
    rating === 'PIP'
      ? '\u201CWe\u2019re really investing in your growth.\u201D The form is signed with the same handshake as victory.'
      : rating === 'EXCEEDS EXPECTATIONS'
        ? 'The project is greenlit for Phase 2 of the Portal Refresh. Nothing was ever built in Phase 1.'
        : 'Sign-off achieved. The cycle begins again.'
  const wins = gauntlet.results.filter((r) => r.won).length
  return (
    <Overlay>
      <EndStyles />
      <Letterbox />
      <div
        data-bo
        style={{
          fontFamily: MONO,
          fontSize: 10,
          letterSpacing: '0.34em',
          color: '#b9976a',
          marginBottom: 14,
          zIndex: 3,
          ...beat('bo-rise', 280, 60),
        }}
      >
        3:30 PM · ANNUAL REVIEW — FINAL
      </div>

      <Verdict word={rating} tint={tint} ink={ink} />

      <div
        data-bo
        style={{
          fontFamily: SANS,
          fontSize: 'clamp(13px, 1.4vw, 17px)',
          lineHeight: 1.5,
          color: '#d8d2c2',
          maxWidth: 540,
          margin: '0 0 20px',
          zIndex: 3,
          ...beat('bo-rise', 320, 460),
        }}
      >
        {sub}
      </div>

      {/* THE CARD. A fighting game ends on a scorecard, and this one is also the
          joke: three bouts itemised like a performance review, footed with the
          only number that was ever real. */}
      <div
        data-bo
        style={{
          zIndex: 3,
          textAlign: 'left',
          minWidth: 'min(520px, 86vw)',
          border: '1px solid rgba(255,255,255,0.12)',
          background: 'rgba(0,0,0,0.42)',
          marginBottom: 22,
          ...beat('bo-rise', 340, 620),
        }}
      >
        {gauntlet.results.map((r, i) => {
          const b = BOUTS.find((x) => x.key === r.opponent)!
          return (
            <div
              key={r.opponent}
              style={{
                display: 'flex',
                alignItems: 'baseline',
                gap: 12,
                padding: '10px 16px',
                borderTop: i ? '1px solid rgba(255,255,255,0.07)' : 'none',
              }}
            >
              <span style={{ fontFamily: MONO, fontSize: 9, letterSpacing: '0.2em', color: '#8f887a', width: 46 }}>
                BOUT {i + 1}
              </span>
              <span style={{ fontFamily: SANS, fontSize: 14, fontWeight: 600, color: '#e8e2d2', flex: 1 }}>
                {b.name}
              </span>
              <span
                style={{
                  fontFamily: SANS,
                  fontSize: 12,
                  fontWeight: 700,
                  letterSpacing: '0.06em',
                  color: r.won ? '#7bbf7b' : '#c8492f',
                }}
              >
                {r.won ? `CONVINCED · ${Math.round(r.scorePct * 100)}%` : 'UNCONVINCED'}
              </span>
            </div>
          )
        })}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            padding: '11px 16px',
            borderTop: '1px solid rgba(255,255,255,0.14)',
            background: 'rgba(232,193,90,0.07)',
          }}
        >
          <span style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '0.16em', color: '#b9976a' }}>
            ACTUAL BUSINESS VALUE GENERATED
          </span>
          <span style={{ fontFamily: SANS, fontSize: 14, fontWeight: 800, color: '#e8c15a' }}>$0.00</span>
        </div>
      </div>

      {/* ── ACHIEVEMENTS — same collection the level-select hub shows.
          Earned badges at full strength, locked ones ghosted; the strip reads
          like the other games' end screens without breaking this card's
          cinematic layout. */}
      <div data-bo style={{ zIndex: 3, marginBottom: 20, ...beat('bo-rise', 300, 760) }}>
        <div style={{ fontFamily: MONO, fontSize: 9, letterSpacing: '0.3em', color: '#8f887a', marginBottom: 8 }}>
          ACHIEVEMENTS · {FIGHT_ACHIEVEMENTS_CATALOG.filter((a) => earnedSet.has(a.id)).length}/{FIGHT_ACHIEVEMENTS_CATALOG.length}
        </div>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
          {FIGHT_ACHIEVEMENTS_CATALOG.map((a) => (
            <span
              key={a.id}
              title={earnedSet.has(a.id) ? `${a.title} — ${a.desc}` : 'Locked'}
              style={{ fontSize: 20, opacity: earnedSet.has(a.id) ? 1 : 0.22, filter: earnedSet.has(a.id) ? 'none' : 'grayscale(1)' }}
            >
              {a.emoji}
            </span>
          ))}
        </div>
      </div>

      <div data-bo style={{ zIndex: 3, ...beat('bo-rise', 300, 820) }}>
        <button style={btn} onClick={onRematch}>
          {/* NOT "\u21bb" as bare JSX text \u2014 escapes only resolve inside JS
              strings, and the literal backslash-u rendered on screen (a
              playtester read it as "u2lbb"). */}
          REQUEST A FOLLOW-UP REVIEW {'\u21bb'}
        </button>
        <div style={{ fontFamily: MONO, fontSize: 11, color: '#8f887a', marginTop: 12 }}>
          {wins}/3 rooms convinced.
        </div>
      </div>
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

// `kicker` and `controls` retired with the old centred-paragraph result cards
// (see BoutEndCard / GauntletResult, which now stage their own type).
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
