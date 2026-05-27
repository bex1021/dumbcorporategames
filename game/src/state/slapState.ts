// Shared mutable state for cross-component animation triggers — same
// pattern as playerState (mutated in place, read each frame, no React
// re-renders).
//
// `printerSlapTrigger` is incremented by PrinterProximityAudio whenever
// the printer fires a sound AND Leonard is close enough that a slap
// motion would make narrative sense (~2.5m). Player.tsx watches it
// each frame and, on observing an increment, starts a slap animation
// on Leonard's right arm.

export const slapState = {
  printerSlapTrigger: 0,
}
