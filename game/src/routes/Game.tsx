import { Suspense, useState } from 'react'
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

  // WebGL context-lost recovery: when the underlying GL context dies (driver
  // crash, GPU resource exhaustion, OS sleep, tab backgrounding), Three.js
  // does not auto-restore — the canvas stays permanently white. We listen
  // for the `webglcontextlost` event and bump a key so React fully remounts
  // <Canvas>, which creates a fresh context and re-uploads all GPU resources.
  // The 250ms delay gives the browser a moment to release the old context
  // before we ask for a new one.
  const [canvasKey, setCanvasKey] = useState(0)

  return (
    <div className="relative w-full h-full">
      <Canvas
        key={canvasKey}
        shadows
        camera={{
          position: [PLAYER.spawnX, CAMERA.height, PLAYER.spawnZ + CAMERA.distance],
          fov: CAMERA.fov,
        }}
        gl={{ antialias: true }}
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
