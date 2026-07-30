// Fight audio — the blueprint's feel-floor item #4: "distinct audio per
// interaction: whiff (air), block (dull thud), hit (paper-stack slam), counter
// (record scratch)". All synthesized Web Audio (no assets), same no-asset
// discipline as the rest of the game's audio. Browser-only: FightWorld feeds
// this from the sim's event hook; the headless harness never imports it.

import type { FightEvent } from './fighterState'

let ctx: AudioContext | null = null
let master: GainNode | null = null

function ac(): AudioContext {
  if (!ctx) {
    ctx = new AudioContext()
    master = ctx.createGain()
    master.gain.value = 0.28
    master.connect(ctx.destination)
  }
  if (ctx.state === 'suspended') void ctx.resume()
  return ctx
}

export function disposeFightAudio(): void {
  if (ctx) void ctx.close()
  ctx = null
  master = null
}

// ── tiny synth helpers ───────────────────────────────────────────────────────

function tone(
  type: OscillatorType,
  f0: number,
  f1: number,
  dur: number,
  gain = 0.8,
  delay = 0,
): void {
  const c = ac()
  const t = c.currentTime + delay
  const osc = c.createOscillator()
  const g = c.createGain()
  osc.type = type
  osc.frequency.setValueAtTime(f0, t)
  osc.frequency.exponentialRampToValueAtTime(Math.max(1, f1), t + dur)
  g.gain.setValueAtTime(gain, t)
  g.gain.exponentialRampToValueAtTime(0.001, t + dur)
  osc.connect(g).connect(master!)
  osc.start(t)
  osc.stop(t + dur + 0.02)
}

function noise(dur: number, filterHz: number, gain = 0.5, delay = 0): void {
  const c = ac()
  const t = c.currentTime + delay
  const len = Math.max(1, Math.floor(c.sampleRate * dur))
  const buf = c.createBuffer(1, len, c.sampleRate)
  const data = buf.getChannelData(0)
  for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len)
  const src = c.createBufferSource()
  src.buffer = buf
  const filter = c.createBiquadFilter()
  filter.type = 'lowpass'
  filter.frequency.value = filterHz
  const g = c.createGain()
  g.gain.setValueAtTime(gain, t)
  g.gain.exponentialRampToValueAtTime(0.001, t + dur)
  src.connect(filter).connect(g).connect(master!)
  src.start(t)
}

// ── the cue set ──────────────────────────────────────────────────────────────

export function playFightCue(e: FightEvent): void {
  switch (e) {
    case 'whiff': // air — a short swish
      noise(0.09, 1800, 0.18)
      break
    case 'block': // dull thud — listening to this man costs something
      tone('sine', 130, 70, 0.09, 0.5)
      noise(0.06, 500, 0.2)
      break
    case 'hit': // paper-stack slam
      noise(0.07, 1200, 0.5)
      tone('sine', 190, 60, 0.1, 0.7)
      break
    case 'hitHeavy': // bigger slam, lower thump
      noise(0.12, 900, 0.7)
      tone('sine', 150, 40, 0.16, 0.9)
      break
    case 'throw': // the calendar invite lands — two-tone grab
      tone('square', 220, 330, 0.07, 0.3)
      tone('sine', 120, 50, 0.14, 0.7, 0.05)
      break
    case 'counter': // record scratch — "Actually, great point."
      tone('sawtooth', 900, 180, 0.12, 0.35)
      noise(0.08, 2400, 0.15)
      break
    case 'ko': // the sign-off / the PIP — one low boom under everything
      tone('sine', 90, 30, 0.5, 1.0)
      noise(0.3, 700, 0.5)
      break
  }
}
