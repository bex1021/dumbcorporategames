// The Alignly motif — the campaign's 4-note melodic signature.
//
// A single hook heard at every phase boundary (played by ExecSegue). It is
// deliberately the same four notes that open Jira Run's heroic lead theme
// (jiraMusic.ts LEAD: A4 · C5 · B4 · … G4), so the little logo you hear when
// the Exec hands you to the next game IS the theme that later swells into
// Jira Run's anthem — a leitmotif that develops across the day, the way a
// film score reuses one phrase.
//
// Self-contained synth (its own lazy AudioContext, like honk.ts / the Jira
// desk blips) so it plays identically in every phase regardless of whether
// that phase booted the office AudioManager. Quiet by design: it sits just
// under the Slack knock, not over it.

// MIDI: A4 C5 B4 G4 — rise a minor third, step down, settle a step below home.
// Optimistic and slightly unresolved. Very corporate.
export const ALIGNLY_MOTIF = [69, 72, 71, 67] as const

const midi = (n: number) => 440 * Math.pow(2, (n - 69) / 12)

let ctx: AudioContext | null = null
function ac(): AudioContext | null {
  if (ctx) return ctx
  try {
    ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)()
  } catch {
    ctx = null
  }
  return ctx
}

/**
 * Play the motif once. `delay` seconds lets a caller tuck it just behind the
 * Slack knock so the two read as one "…and we're aligned 🙂" gesture.
 * Best-effort and silent if audio is blocked.
 */
export function playAlignlyMotif(delay = 0): void {
  const c = ac()
  if (!c) return
  try {
    if (c.state === 'suspended') void c.resume()
    const t0 = c.currentTime + delay
    const step = 0.16 // seconds between notes — unhurried, a little smug
    ALIGNLY_MOTIF.forEach((n, i) => {
      const t = t0 + i * step
      const dur = i === ALIGNLY_MOTIF.length - 1 ? 0.5 : 0.2 // let the last note ring
      const o = c.createOscillator()
      const g = c.createGain()
      o.type = 'triangle' // soft, mallet-ish
      o.frequency.setValueAtTime(midi(n), t)
      const peak = 0.05 // quiet — under the knock
      g.gain.setValueAtTime(0.0001, t)
      g.gain.exponentialRampToValueAtTime(peak, t + 0.02)
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
      o.connect(g).connect(c.destination)
      o.start(t)
      o.stop(t + dur + 0.05)
    })
  } catch {
    /* audio blocked / bad context state — never let a jingle crash a screen */
  }
}
