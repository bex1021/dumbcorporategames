import { Suspense } from 'react'
import { Canvas } from '@react-three/fiber'
import { Office } from './scene/Office'
import { OfficeDecor } from './scene/OfficeDecor'
import { Player } from './scene/Player'
import { FollowCamera } from './scene/FollowCamera'
import { NPCs } from './scene/NPCs'
import { Lights } from './scene/Lights'
import { ProximityDetector } from './scene/ProximityDetector'
import { CAMERA, PLAYER } from './config/constants'
import { useGameStore } from './state/gameStore'
import { useInteractKey } from './hooks/useInteractKey'
import { useSlackTicker } from './hooks/useSlackTicker'
import { HUD } from './ui/HUD'
import { IntroScreen } from './ui/IntroScreen'
import { InteractPrompt } from './ui/InteractPrompt'
import { DialoguePanel } from './ui/DialoguePanel'
import { RecoveryPanel } from './ui/RecoveryPanel'
import { DelayedToast } from './ui/DelayedToast'
import { CopingBar } from './ui/CopingBar'
import { SlackPanel } from './ui/SlackPanel'
import { LoadingScreen } from './ui/LoadingScreen'
import { EndingScreen } from './ui/EndingScreen'

export default function App() {
  const phase = useGameStore((s) => s.phase)
  useInteractKey()
  useSlackTicker()

  return (
    <div className="relative w-full h-full">
      <Canvas
        shadows
        camera={{
          position: [PLAYER.spawnX, CAMERA.height, PLAYER.spawnZ + CAMERA.distance],
          fov: CAMERA.fov,
        }}
        gl={{ antialias: true }}
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
