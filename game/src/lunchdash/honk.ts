// A short synthesized car horn — no audio asset, lazy AudioContext. The player
// is always driving (keys held) before any car needs to honk, so the autoplay
// gesture requirement is already satisfied and resume() succeeds. If audio is
// unavailable for any reason we just stay silent.
let ctx: AudioContext | null = null

export function honk() {
  try {
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    if (!ctx) ctx = new AC()
    if (ctx.state === 'suspended') void ctx.resume()
    const t = ctx.currentTime
    const gain = ctx.createGain()
    gain.connect(ctx.destination)
    gain.gain.setValueAtTime(0.0001, t)
    gain.gain.exponentialRampToValueAtTime(0.16, t + 0.02)
    gain.gain.setValueAtTime(0.16, t + 0.18)
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.32)
    // two slightly-detuned tones read as a beepy little car horn
    for (const f of [400, 505]) {
      const o = ctx.createOscillator()
      o.type = 'sawtooth'
      o.frequency.value = f
      o.connect(gain)
      o.start(t)
      o.stop(t + 0.34)
    }
  } catch {
    /* no audio — stay silent */
  }
}
