// Full-screen loading overlay shown while GLBs are downloading.
//
// Reads Drei's global loading progress via useProgress — covers the WHOLE
// asset graph (Player.glb + all the NPC GLBs). Sits at the React level
// outside the Canvas, so it can be plain HTML.
//
// The first cold load currently downloads ~70MB of uncompressed Mixamo GLBs,
// which can take a few seconds even on a fast connection.

import { useEffect, useState } from 'react'
import { useProgress } from '@react-three/drei'

export function LoadingScreen() {
  const { progress, active } = useProgress()

  // Tiny "still loading…" tick so the user knows time is passing even before
  // the progress bar starts advancing.
  const [dots, setDots] = useState('')
  useEffect(() => {
    const id = setInterval(() => {
      setDots((d) => (d.length >= 3 ? '' : d + '.'))
    }, 400)
    return () => clearInterval(id)
  }, [])

  // Hide once everything is loaded. `active` is true while any loader is
  // still working. We also check progress === 100 as a belt-and-suspenders
  // signal for the final paint.
  if (!active && progress >= 100) return null

  // Clamp progress to [0, 100] for display; useProgress can briefly report
  // values outside that range during the very first tick.
  const pct = Math.max(0, Math.min(100, Math.round(progress)))

  return (
    <div className="fixed inset-0 z-50 bg-[#f4f5f7] flex items-center justify-center">
      <div className="text-center">
        {/* Atlassian-style "A" mark — matches the Jira intro page */}
        <div className="w-12 h-12 rounded-lg bg-[#0052cc] text-white flex items-center justify-center text-xl font-bold mx-auto mb-4 shadow">
          A
        </div>
        <div className="text-[#5e6c84] text-[11px] uppercase tracking-widest mb-1">
          Alignly
        </div>
        <div className="text-[#172b4d] text-base font-semibold">
          Loading workspace{dots}
        </div>
        <div className="text-[#5e6c84] text-[12px] mt-2">
          Syncing Customer Happiness Portal Refresh
        </div>
        {/* Real progress bar driven by Drei's useProgress */}
        <div className="mt-4 w-48 h-1 mx-auto rounded-full bg-[#dfe1e6] overflow-hidden">
          <div
            className="h-full bg-[#0052cc] rounded-full transition-[width] duration-200 ease-out"
            style={{ width: `${pct}%` }}
          />
        </div>
        <div className="text-[#5e6c84] text-[10px] font-mono mt-1.5">
          {pct}%
        </div>
      </div>
    </div>
  )
}
