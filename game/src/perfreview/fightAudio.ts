// Fight audio — the blueprint's feel-floor item #4: "distinct audio per
// interaction: whiff (air), block (dull thud), hit (paper-stack slam), counter
// (record scratch)". All synthesized Web Audio (no assets), same no-asset
// discipline as the rest of the game's audio. Browser-only: FightWorld feeds
// this from the sim's event hook; the headless harness never imports it.

import type { FightEvent } from './fighterState'

let ctx: AudioContext | null = null
let master: GainNode | null = null
let outTap: AudioNode | null = null // post-limiter, so the meter reads what you HEAR

function ac(): AudioContext {
  if (!ctx) {
    ctx = new AudioContext()
    master = ctx.createGain()
    master.gain.value = 0.45 // measured: 0.5 left hitHeavy/throw peaking +0.6 dBFS over the limiter
    // LIMITER. Measured at the master bus: 'ko' peaked at +0.3 dBFS and 'throw'
    // at −0.0 — both clipping, which is audible as crunch on every KO. A hard
    // knee just under 0 means the loud cues can be raised for punch without the
    // top of the range distorting.
    const limiter = ctx.createDynamicsCompressor()
    limiter.threshold.value = -2
    limiter.knee.value = 0
    limiter.ratio.value = 20
    limiter.attack.value = 0.002
    limiter.release.value = 0.12
    master.connect(limiter).connect(ctx.destination)
    outTap = limiter
  }
  if (ctx.state === 'suspended') void ctx.resume()
  return ctx
}

/** DEV probe: audio is the hardest part of this game to verify by looking at it,
 *  so expose the context alongside __fight / __cam / __gl. */
export function audioDebug(): { state: string; master: number } | null {
  return ctx ? { state: ctx.state, master: master?.gain.value ?? -1 } : null
}

/** DEV: fire a cue and report its actual peak amplitude at the master bus.
 *  "Is it wired up" and "can you hear it" are different questions and only a
 *  number answers the second one. */
export function measurePeak(fire: () => void, ms = 700): Promise<number> {
  const c = ac()
  const an = c.createAnalyser()
  an.fftSize = 2048
  ;(outTap ?? master!).connect(an)
  const buf = new Float32Array(an.fftSize)
  let peak = 0
  fire()
  return new Promise((res) => {
    const t0 = performance.now()
    const tick = () => {
      an.getFloatTimeDomainData(buf)
      for (let i = 0; i < buf.length; i++) peak = Math.max(peak, Math.abs(buf[i]))
      if (performance.now() - t0 < ms) setTimeout(tick, 8)
      else {
        ;(outTap ?? master!).disconnect(an)
        res(peak)
      }
    }
    tick()
  })
}

export function disposeFightAudio(): void {
  if (ctx) void ctx.close()
  ctx = null
  master = null
  outTap = null
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

function noise(dur: number, filterHz: number, gain = 0.5, delay = 0, attack = 0): void {
  const c = ac()
  const t = c.currentTime + delay
  const len = Math.max(1, Math.floor(c.sampleRate * dur))
  const buf = c.createBuffer(1, len, c.sampleRate)
  const data = buf.getChannelData(0)
  // attack = fraction of the burst spent FADING IN. 0 keeps the instant
  // transient (impacts). Without a ramp, any gain over ~0.5 is heard as a CLICK
  // — which is exactly what the swing cues were: instant-attack noise at 1.5–2.2
  // gain. A whoosh is a bell, not a step.
  const aLen = Math.floor(len * attack)
  for (let i = 0; i < len; i++) {
    const env = i < aLen ? i / Math.max(1, aLen) : (len - i) / Math.max(1, len - aLen)
    data[i] = (Math.random() * 2 - 1) * env
  }
  const src = c.createBufferSource()
  src.buffer = buf
  const filter = c.createBiquadFilter()
  filter.type = 'lowpass'
  filter.frequency.value = filterHz
  const g = c.createGain()
  g.gain.setValueAtTime(gain, t)
  // Only the INSTANT-attack bursts get the gain-node decay. A ramped burst
  // already carries its whole envelope in the buffer — running the exponential
  // decay on top of it crushed the bell's peak to ~6% of its gain (measured:
  // a 0.9-gain swell came out at 0.053 peak, −26 dBFS, inaudible again).
  if (attack === 0) g.gain.exponentialRampToValueAtTime(0.001, t + dur)
  src.connect(filter).connect(g).connect(master!)
  src.start(t)
}

/** Band-limited noise burst — the "slap" layer of an impact. A lowpass alone
 *  sounds like static; a bandpass around 800–1500 Hz is what reads as flesh. */
function band(dur: number, centerHz: number, q: number, gain = 0.5, delay = 0): void {
  const c = ac()
  const t = c.currentTime + delay
  const len = Math.max(1, Math.floor(c.sampleRate * dur))
  const buf = c.createBuffer(1, len, c.sampleRate)
  const data = buf.getChannelData(0)
  for (let i = 0; i < len; i++) {
    // squared decay — impacts die fast, that's the whole character
    const k = 1 - i / len
    data[i] = (Math.random() * 2 - 1) * k * k
  }
  const src = c.createBufferSource()
  src.buffer = buf
  const f = c.createBiquadFilter()
  f.type = 'bandpass'
  f.frequency.value = centerHz
  f.Q.value = q
  const g = c.createGain()
  g.gain.setValueAtTime(gain, t)
  g.gain.exponentialRampToValueAtTime(0.001, t + dur)
  src.connect(f).connect(g).connect(master!)
  src.start(t)
}

/** A PUNCH, built the way arcade fighters build them.
 *
 *  The key insight from that genre: a fighting-game punch is a CRACK, not a
 *  thud. It's very short (~90–160ms total), the transient dominates, and the
 *  low end is a fast SUB DROP rather than a lingering boom — a long tail makes
 *  every hit muddy the next, and in a combo you need each one to read
 *  separately. Four layers, all tight:
 *
 *    1. CRACK  — a near-instant burst of highpassed noise. This is the sound.
 *    2. SNAP   — a fast downward pitch sweep, the "whipcrack" of the impact.
 *    3. SUB    — a short low sine drop for weight, gone in <150ms.
 *    4. BODY   — a bandpassed knock so it reads as hitting a person.
 *
 *  Every layer is pitch-randomised ±8%, so two jabs in a row are never the
 *  identical sample — that repetition is the loudest "this is synthesized" tell.
 */
export function punch(big: boolean, delay = 0): void {
  const c = ac()
  const t = c.currentTime + delay
  const vary = 0.92 + Math.random() * 0.16 // ±8% per hit

  // 1. CRACK — the transient carries the punch. Short and bright.
  const len = Math.max(1, Math.floor(c.sampleRate * (big ? 0.05 : 0.035)))
  const buf = c.createBuffer(1, len, c.sampleRate)
  const d = buf.getChannelData(0)
  for (let i = 0; i < len; i++) {
    const k = 1 - i / len
    d[i] = (Math.random() * 2 - 1) * k * k * k // cubic decay = very fast
  }
  const src = c.createBufferSource()
  src.buffer = buf
  const hp = c.createBiquadFilter()
  hp.type = 'highpass'
  hp.frequency.value = (big ? 1500 : 2100) * vary
  const shelf = c.createBiquadFilter() // presence lift — cuts through the mix
  shelf.type = 'peaking'
  shelf.frequency.value = 3200 * vary
  shelf.Q.value = 0.8
  shelf.gain.value = 6
  const tg = c.createGain()
  // big crack up 0.95 → 1.35 and longer: the heavy's impact read as a SOFT THUD
  // because the 1.0-gain sub outweighed the crack and the limiter then pumped
  // the crack down another few dB. The crack is the "hard hit" signifier; the
  // sub is only the weight underneath it.
  tg.gain.setValueAtTime(big ? 1.35 : 0.8, t)
  tg.gain.exponentialRampToValueAtTime(0.001, t + (big ? 0.09 : 0.05))
  src.connect(hp).connect(shelf).connect(tg).connect(master!)
  src.start(t)

  // 2. SNAP — the whipcrack. A fast sweep is what makes it read as a STRIKE
  //    rather than an object being dropped.
  tone('triangle', (big ? 1200 : 1700) * vary, (big ? 150 : 260) * vary, big ? 0.07 : 0.04, big ? 0.8 : 0.5, delay)

  // 3. SUB — weight, then gone. Short on purpose: a long boom smears combos.
  tone('sine', (big ? 150 : 190) * vary, 40, big ? 0.11 : 0.08, big ? 0.8 : 0.62, delay + 0.002)

  // 4. BODY — the flesh knock.
  band(big ? 0.07 : 0.045, (big ? 700 : 1150) * vary, 1.4, big ? 0.5 : 0.36, delay + 0.003)
}

// ── the cue set ──────────────────────────────────────────────────────────────

export function playFightCue(e: FightEvent): void {
  switch (e) {
    case 'swing': // a jab leaving the shoulder — a short whoosh, not a click
      // The bell envelope (40% attack) is the fix for "loud clicking": the old
      // instant-attack burst at gain 1.5 was a transient CLICK on every press.
      noise(0.11, 2400, 0.22, 0, 0.4)
      break
    case 'swingHeavy':
      // A kick: a longer, lower whoosh that swells and releases — air being
      // displaced, not a click (bell envelope, 45% attack).
      noise(0.22, 1100, 0.4, 0, 0.45)
      noise(0.14, 500, 0.16, 0.04, 0.5) // low body under the swish
      break
    case 'whiff': // air — the swing you threw and missed with
      // Was 0.18 gain and easy to miss entirely. In every arcade fighter the
      // SWING is audible on its own; only the impact is conditional. A whiffed
      // punch that makes no sound reads as the input being dropped.
      noise(0.15, 1600, 0.3, 0, 0.35)
      break
    case 'block': // dull thud — listening to this man costs something
      tone('sine', 130, 70, 0.11, 0.7)
      noise(0.07, 600, 0.55)
      break
    case 'hit': // a clean jab landing
      punch(false)
      break
    case 'hitHeavy': // the heavy — lower crack, more sub
      punch(true)
      break
    case 'throw':
      // L is a HURRICANE KICK now, not a grab, so it needs a real impact under
      // it — a two-tone calendar blip alone read as a UI sound, not a strike.
      // Order matters: the whoosh of the spin, then the connect, then the blip
      // that keeps the joke (the invite lands).
      noise(0.16, 900, 0.5) // the spin
      punch(true, 0.05) // the foot connects
      tone('square', 220, 330, 0.06, 0.28, 0.09)
      tone('sine', 120, 50, 0.12, 0.6, 0.13)
      break
    case 'tech': // throw BROKEN — a shove-off: two hands slapping apart
      noise(0.06, 1800, 0.5) // the grip slap
      tone('sine', 200, 120, 0.09, 0.5, 0.02) // bodies shoving apart
      noise(0.1, 700, 0.3, 0.05) // the disengage scuff
      break
    case 'counter': // record scratch — "Actually, great point."
      // The reflect DAMAGES the attacker, so it gets an impact too — a scratch
      // with nothing under it read as a UI error, not as being hit.
      tone('sawtooth', 900, 180, 0.12, 0.35)
      noise(0.08, 2400, 0.15)
      punch(false, 0.06)
      break
    case 'ko': // the sign-off / the PIP — the final blow, then the boom
      punch(true)
      tone('sine', 90, 30, 0.5, 1.0, 0.04)
      noise(0.3, 700, 0.5, 0.04)
      announce('ko', 0.35) // "K.O.!" — after the crunch, over the freeze-frame
      break
    // ── the announcer (see below) ──
    case 'annBigHit': {
      // OCCASIONAL, like MK: a shout on every heavy would become wallpaper.
      const now = Date.now()
      if (now - lastShoutAt < SHOUT_COOLDOWN_MS || Math.random() > 0.45) break
      lastShoutAt = now
      announce(DAMAGE_POOL[Math.floor(Math.random() * DAMAGE_POOL.length)])
      break
    }
    case 'annNearKO': // the opponent's bar first drops under 25% — the classic
      lastShoutAt = Date.now() // suppress a DAMAGE shout stepping on it
      announce(annGender === 'her' ? 'finishher' : 'finishhim')
      break
    case 'annWin': // opponent KO'd: K.O. already played on 'ko'; the verdict
      announce('aligned', 1.4) // lands as the result card does
      break
  }
}

// ── THE ANNOUNCER — pre-rendered ElevenLabs voice (the MK god-voice) ────────
// Files from scripts/render-fight-announcer.mjs. Decoded once, cached; play
// through the same master/limiter as the cues so the mix stays one system.
type AnnName =
  | 'fight' | 'ko' | 'finishhim' | 'finishher' | 'aligned'
  | 'damage' | 'pushback' | 'noted' | 'escalated' | 'synergy' | 'closetheloop'
const DAMAGE_POOL: AnnName[] = ['damage', 'pushback', 'noted', 'escalated', 'synergy']
const SHOUT_COOLDOWN_MS = 7000
let lastShoutAt = 0
let annGender: 'him' | 'her' = 'him'
const annBuffers = new Map<AnnName, AudioBuffer>()
const annLoading = new Set<AnnName>()

/** Per-bout: Priya gets "FINISH HER!". Called by PerformanceReview.beginBout. */
export function setAnnouncerGender(g: 'him' | 'her'): void {
  annGender = g
}

function loadAnn(name: AnnName): void {
  if (annBuffers.has(name) || annLoading.has(name)) return
  annLoading.add(name)
  fetch(`/sounds/fight/announcer/${name}.mp3`)
    .then((r) => (r.ok ? r.arrayBuffer() : Promise.reject(new Error(String(r.status)))))
    .then((ab) => ac().decodeAudioData(ab))
    .then((buf) => annBuffers.set(name, buf))
    .catch(() => {}) // missing file = silent announcer, never a broken fight
    .finally(() => annLoading.delete(name))
}

/** Warm the cache at fight mount so the first shout isn't late. */
export function primeAnnouncer(): void {
  const all: AnnName[] = ['fight', 'ko', 'finishhim', 'finishher', 'aligned', ...DAMAGE_POOL]
  for (const n of all) loadAnn(n)
}

/** Play a line (delay in seconds). Loud and proud — the voice IS the event.
 *  A cold cache retries briefly (4 × 250ms) — enough to cover the very first
 *  "FIGHT!" while its decode is in flight, short enough that a hit shout
 *  never arrives absurdly after its hit. */
export function announce(name: AnnName, delay = 0, retries = 4): void {
  const c = ac()
  const buf = annBuffers.get(name)
  if (!buf) {
    loadAnn(name)
    if (retries > 0) window.setTimeout(() => announce(name, 0, retries - 1), 250)
    return
  }
  const src = c.createBufferSource()
  src.buffer = buf
  const g = c.createGain()
  g.gain.value = 1.0 // files are pre-limited at −0.7 dBFS; master scales them
  src.connect(g).connect(master!)
  src.start(c.currentTime + delay)
}
