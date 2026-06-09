// Traffic-signal cycle. One global, synchronized cycle: the N–S streets get a
// green while the E–W streets hold red, then they swap — with a yellow and a
// brief all-red between, like a real intersection. NPC traffic reads this to
// stop at reds (see trafficState); the signal heads render the current colour.
// Plain mutable module state, ticked once per frame by updateTraffic.

export const signalClock = { t: 0 }

const GREEN = 8 // seconds of green per axis
const YELLOW = 2.5
const ALL_RED = 1.5 // both red — lets the box clear
const HALF = GREEN + YELLOW + ALL_RED // one axis's full turn = 12s
const PERIOD = HALF * 2 // 24s full cycle

export function tickSignals(dt: number) {
  signalClock.t = (signalClock.t + dt) % PERIOD
}

export type Light = 'green' | 'yellow' | 'red'

// Light shown to traffic travelling along the given axis at any intersection.
export function signalState(axis: 'ns' | 'ew'): Light {
  const nsActive = signalClock.t < HALF
  const activeAxis: 'ns' | 'ew' = nsActive ? 'ns' : 'ew'
  if (axis !== activeAxis) return 'red' // the cross axis is red while this one runs
  const local = nsActive ? signalClock.t : signalClock.t - HALF
  if (local < GREEN) return 'green'
  if (local < GREEN + YELLOW) return 'yellow'
  return 'red'
}
