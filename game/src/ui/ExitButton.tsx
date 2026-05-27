// Small "exit run" button that returns the player to the landing page.
// Visible during the playing phase only — intro/ending screens have their
// own navigation paths.
//
// Confirms before exiting so a misclick doesn't nuke the run.

import { useGameStore } from '../state/gameStore'

export function ExitButton() {
  const phase = useGameStore((s) => s.phase)
  // Hide during intro (player hasn't started the run yet) and during the
  // ending screen (which has its own restart/back buttons).
  if (phase !== 'playing') return null

  const handleClick = () => {
    const confirmed = window.confirm(
      'Exit this standup? Your progress will be lost.'
    )
    if (confirmed) {
      // BrowserRouter is mounted at "/" — going to root takes you back to
      // the portfolio landing page. Hard-navigation also tears down the
      // current WebGL context, which is the cleanest possible exit.
      window.location.href = '/'
    }
  }

  return (
    <button
      onClick={handleClick}
      title="Exit run — return to landing page"
      className="pointer-events-auto fixed top-2 left-1/2 -translate-x-1/2 z-30 px-3 py-1 bg-ink-900/85 hover:bg-rose-900/70 border border-beige-300/30 hover:border-rose-400/60 text-beige-300 hover:text-beige-50 text-[10px] uppercase tracking-widest rounded transition backdrop-blur-sm"
    >
      ✕ Exit
    </button>
  )
}
