// Temporary debug overlay: shows live game state + lets you force-open the
// Brent dialogue. Remove once Phase 4 is verified working.

import { useGameStore } from '../state/gameStore'

export function DebugPanel() {
  const phase = useGameStore((s) => s.phase)
  const nearbyNPC = useGameStore((s) => s.nearbyNPC)
  const activeDialogue = useGameStore((s) => s.activeDialogue)
  const handledCount = useGameStore((s) => s.handledNPCs.size)
  const openDialogue = useGameStore((s) => s.openDialogue)

  return (
    <div className="pointer-events-auto fixed top-32 left-2 z-50 bg-black/80 text-green-300 font-mono text-[11px] p-3 rounded border border-green-500/50 max-w-[220px]">
      <div className="font-bold text-green-100 mb-1">DEBUG</div>
      <div>phase: <span className="text-yellow-200">{phase}</span></div>
      <div>nearbyNPC: <span className="text-yellow-200">{nearbyNPC ?? 'null'}</span></div>
      <div>activeDialogue: <span className="text-yellow-200">{activeDialogue ?? 'null'}</span></div>
      <div>handled: <span className="text-yellow-200">{handledCount}/5</span></div>
      <button
        onClick={() => openDialogue('brent')}
        className="mt-2 w-full px-2 py-1 bg-green-900 hover:bg-green-800 rounded text-green-100 text-xs"
      >
        Force open Brent
      </button>
    </div>
  )
}
