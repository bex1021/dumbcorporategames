import { Suspense, useEffect, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import { Office } from '../scene/Office'
import { OfficeDecor } from '../scene/OfficeDecor'
import { Player } from '../scene/Player'
import { FollowCamera } from '../scene/FollowCamera'
import { NPCs } from '../scene/NPCs'
import { Lights } from '../scene/Lights'
import { ProximityDetector } from '../scene/ProximityDetector'
import { CAMERA, PLAYER } from '../config/constants'
import { useGameStore } from '../state/gameStore'
import { useInteractKey } from '../hooks/useInteractKey'
import { useSlackTicker } from '../hooks/useSlackTicker'
import { HUD } from '../ui/HUD'
import { IntroScreen } from '../ui/IntroScreen'
import { InteractPrompt } from '../ui/InteractPrompt'
import { DialoguePanel } from '../ui/DialoguePanel'
import { RecoveryPanel } from '../ui/RecoveryPanel'
import { DelayedToast } from '../ui/DelayedToast'
import { CopingBar } from '../ui/CopingBar'
import { SlackPanel } from '../ui/SlackPanel'
import { LoadingScreen } from '../ui/LoadingScreen'
import { EndingScreen } from '../ui/EndingScreen'
import { ExitButton } from '../ui/ExitButton'

export default function Game() {
  const phase = useGameStore((s) => s.phase)
  useInteractKey()
  useSlackTicker()

  // Fresh entry into this route: the game store is a module-level singleton,
  // so SPA navigation keeps it alive between visits. If we arrive here with
  // the store still in a finished state from a prior run this session (e.g.
  // replaying Phase 1 from the level-select hub, or coming back after winning),
  // snap it back to the intro so the phase starts clean instead of dropping
  // straight onto the ending screen. Runs once on mount only.
  useEffect(() => {
    if (useGameStore.getState().phase === 'ended') useGameStore.getState().reset()
    // Dev-only: expose the store so playtests can force endings / inspect
    // state (mirrors the window.__JIRARUN__ hook in RunnerWorld). Stripped
    // from production builds via the import.meta.env.DEV guard.
    if (import.meta.env.DEV) {
      const w = window as unknown as { __BLOCKED__?: unknown }
      w.__BLOCKED__ = useGameStore
    }
  }, [])

  // WebGL context-lost recovery: when the underlying GL context dies (driver
  // crash, GPU resource exhaustion, OS sleep, tab backgrounding), Three.js
  // does not auto-restore — the canvas stays permanently white. We listen
  // for the `webglcontextlost` event and bump a key so React fully remounts
  // <Canvas>, which creates a fresh context and re-uploads all GPU resources.
  // The 250ms delay gives the browser a moment to release the old context
  // before we ask for a new one.
  const [canvasKey, setCanvasKey] = useState(0)

  // Pause rendering when the tab is hidden. R3F's `frameloop="never"` halts
  // its rAF loop entirely, so we stop burning GPU/battery while the user
  // is on another tab. We don't unmount — keeping the scene alive means
  // resume is instant when they come back.
  const [frameloop, setFrameloop] = useState<'always' | 'never'>(
    typeof document !== 'undefined' && document.hidden ? 'never' : 'always'
  )
  useEffect(() => {
    const onVis = () => setFrameloop(document.hidden ? 'never' : 'always')
    document.addEventListener('visibilitychange', onVis)
    return () => document.removeEventListener('visibilitychange', onVis)
  }, [])

  // Cap device pixel ratio. On a 4K Retina display devicePixelRatio is 2,
  // which makes WebGL render at 4× the pixel count — most of which the
  // user can't see at normal viewing distance. Capping at 1.5 cuts
  // fragment-shader work roughly in half on those displays with no visible
  // quality loss. Lower bound 1 covers low-DPI laptops.
  //
  // We also disable MSAA on high-DPI displays — at dpr >= 2 the
  // resolution itself is enough that MSAA's smoothing is mostly invisible
  // anyway, and skipping it is a significant fragment-shader win.
  const isHighDPI =
    typeof window !== 'undefined' && window.devicePixelRatio >= 1.5

  return (
    <div className="relative w-full h-full">
      <Canvas
        key={canvasKey}
        shadows
        dpr={[1, 1.5]}
        frameloop={frameloop}
        camera={{
          position: [PLAYER.spawnX, CAMERA.height, PLAYER.spawnZ + CAMERA.distance],
          fov: CAMERA.fov,
        }}
        gl={{ antialias: !isHighDPI, preserveDrawingBuffer: true }}
        onCreated={({ gl }) => {
          gl.domElement.addEventListener(
            'webglcontextlost',
            (e) => {
              // preventDefault tells the browser we WANT to try to restore.
              // Without it, the context stays lost permanently.
              e.preventDefault()
              // eslint-disable-next-line no-console
              console.warn('[Blocked] WebGL context lost — remounting Canvas')
              setTimeout(() => setCanvasKey((k) => k + 1), 250)
            },
            { once: true }
          )
        }}
      >
        <color attach="background" args={['#181818']} />
        <fog attach="fog" args={['#181818', 30, 60]} />
        <Lights />
        <Office />
        <OfficeDecor />
        <NPCs />
        <Suspense fallback={null}>
          <Player />
        </Suspense>
        <FollowCamera />
        {phase === 'playing' && <ProximityDetector />}
      </Canvas>

      {/* In-game HUD (hidden during intro) */}
      {phase !== 'intro' && <HUD />}

      {/* Bottom: interact prompt when near an NPC, else controls hint */}
      {phase === 'playing' && <InteractPrompt />}

      {/* Dialogue panel — only when activeDialogue is set */}
      {phase === 'playing' && <DialoguePanel />}

      {/* Calendar Apocalypse recovery — only when pendingRecovery is set */}
      {phase === 'playing' && <RecoveryPanel />}

      {/* Delayed-effect toast (top-center) when a queued punishment fires */}
      {phase === 'playing' && <DelayedToast />}

      {/* Coping action bar (bottom-left) — always visible during play */}
      {phase === 'playing' && <CopingBar />}

      {/* Slack panel (right edge) — collapsible feed of pings */}
      <SlackPanel />

      {/* Exit run button (top-center) — visible only during playing */}
      <ExitButton />

      {/* Ending screen overlay */}
      <EndingScreen />

      {/* Intro overlay */}
      {phase === 'intro' && <IntroScreen />}

      {/* Loading screen — shows on top of everything while GLBs download.
          Hides itself once useProgress reports 100%. */}
      <LoadingScreen />
    </div>
  )
}
