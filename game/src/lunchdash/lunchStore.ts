import { create } from 'zustand'
import { DESTINATIONS } from './destinations'

// Objective progress for the Lunch Dash drive. Tiny Zustand store (matches the
// project's state convention) — the active destination index advances as the
// car reaches each stop. Read by the HUD, the minimap, and the world beacons.
type LunchState = {
  stepIndex: number
  done: boolean
  advance: () => void
  reset: () => void
}

export const useLunchStore = create<LunchState>()((set, get) => ({
  stepIndex: 0,
  done: false,
  advance: () => {
    if (get().done) return
    const next = get().stepIndex + 1
    if (next >= DESTINATIONS.length) set({ done: true })
    else set({ stepIndex: next })
  },
  reset: () => set({ stepIndex: 0, done: false }),
}))
