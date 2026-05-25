// Top-center toast that surfaces when a delayed effect fires from the
// pendingDelayedEffects queue. Auto-clears via gameStore (markHandled
// schedules a setTimeout to null out recentDelayedToast).
//
// Style: like a Slack/Gmail notification — small, off to the corner,
// auto-dismisses. We also play the slack ping the moment it appears so the
// arrival feels like an actual incoming message.

import { useEffect } from 'react'
import { useGameStore } from '../state/gameStore'
import { audio } from '../audio/AudioManager'

export function DelayedToast() {
  const toast = useGameStore((s) => s.recentDelayedToast)
  const clearDelayedToast = useGameStore((s) => s.clearDelayedToast)

  // Audio cue when a new toast appears. Keyed off the toast string so it
  // re-fires for sequential delayed effects (rare but possible).
  useEffect(() => {
    if (toast) audio.play('slack')
  }, [toast])

  if (!toast) return null

  return (
    <div className="pointer-events-none fixed top-4 left-1/2 -translate-x-1/2 z-30 max-w-md">
      <div
        className="pointer-events-auto bg-ink-900/95 backdrop-blur-md border border-amber-700/50 rounded-lg shadow-2xl px-4 py-3 text-beige-100"
        onClick={clearDelayedToast}
      >
        <div className="flex items-start gap-2">
          <span className="text-amber-300 text-lg leading-none mt-0.5">!</span>
          <div className="flex-1">
            <div className="text-amber-300 text-[10px] uppercase tracking-widest mb-1">
              Reality clears its throat
            </div>
            <div className="text-sm whitespace-pre-line leading-snug">{toast}</div>
          </div>
          <button
            className="text-beige-300 hover:text-beige-100 text-xs leading-none mt-1"
            onClick={(e) => {
              e.stopPropagation()
              clearDelayedToast()
            }}
            aria-label="Dismiss"
          >
            ✕
          </button>
        </div>
      </div>
    </div>
  )
}
