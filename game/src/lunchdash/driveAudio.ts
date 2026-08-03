// Lunch Dash audio — all SYNTHESIZED (Web Audio), no asset files:
//   · engine    — a rumble whose pitch/volume track speed + throttle
//   · screech   — a filtered-noise burst on hard cornering / braking
//   · honk      — the player horn (H key); traffic uses honk.ts separately
//   · radio     — KPI 101.1: pre-rendered, radio-filtered voice lines + original
//                 "top hit" songs over a muzak bed + station static, controlled
//                 by the on-screen dial / R key
//   · parade    — a crowd-cheer bed + a jaunty brass motif that swell as you
//                 approach the parade
//
// One lazy AudioContext, resumed on the first driving gesture (keys are already
// held before any of this runs). Everything degrades to silence if audio or TTS
// is unavailable.

let ctx: AudioContext | null = null
let master: GainNode | null = null

function ac(): AudioContext | null {
  try {
    if (!ctx) {
      const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
      ctx = new AC()
      master = ctx.createGain()
      master.gain.value = 0.9
      master.connect(ctx.destination)
    }
    if (ctx.state === 'suspended') void ctx.resume()
    return ctx
  } catch {
    return null
  }
}

// shared 1s white-noise buffer (screech + crowd)
let _noise: AudioBuffer | null = null
function noise(c: AudioContext): AudioBuffer {
  if (_noise) return _noise
  const len = Math.floor(c.sampleRate)
  const b = c.createBuffer(1, len, c.sampleRate)
  const d = b.getChannelData(0)
  for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1
  _noise = b
  return b
}

// ───────────────────────── engine ─────────────────────────
let engine: { o1: OscillatorNode; o2: OscillatorNode; filter: BiquadFilterNode; gain: GainNode } | null = null
function ensureEngine() {
  const c = ac()
  if (!c || engine || !master) return
  const o1 = c.createOscillator()
  o1.type = 'sawtooth'
  o1.frequency.value = 55
  const o2 = c.createOscillator()
  o2.type = 'square'
  o2.frequency.value = 82
  const filter = c.createBiquadFilter()
  filter.type = 'lowpass'
  filter.frequency.value = 600
  const gain = c.createGain()
  gain.gain.value = 0
  o1.connect(filter)
  o2.connect(filter)
  filter.connect(gain)
  gain.connect(master)
  o1.start()
  o2.start()
  engine = { o1, o2, filter, gain }
}

// speed in m/s (top ~25), throttle held?
export function updateEngine(speed: number, throttle: boolean) {
  ensureEngine()
  const c = ac()
  if (!c || !engine) return
  const t = c.currentTime
  const s = Math.min(1, Math.abs(speed) / 25)
  const base = 52 + s * 120 + (throttle ? 16 : 0) // idle → redline-ish
  engine.o1.frequency.setTargetAtTime(base, t, 0.08)
  engine.o2.frequency.setTargetAtTime(base * 1.5, t, 0.08)
  engine.filter.frequency.setTargetAtTime(430 + s * 1400, t, 0.1)
  // kept low so it's a background hum, not a lawnmower in your lap
  const vol = 0.014 + s * 0.045 + (throttle ? 0.012 : 0)
  engine.gain.gain.setTargetAtTime(vol, t, 0.1)
}

export function engineOff() {
  const c = ac()
  if (engine && c) engine.gain.gain.setTargetAtTime(0, c.currentTime, 0.25)
}

// ───────────────────────── tire screech ─────────────────────────
let screechCd = 0
export function screech(intensity: number) {
  const c = ac()
  if (!c || !master) return
  const now = performance.now()
  if (now < screechCd) return // rate-limit so it doesn't buzz continuously
  screechCd = now + 170
  const src = c.createBufferSource()
  src.buffer = noise(c)
  src.loop = true
  const bp = c.createBiquadFilter()
  bp.type = 'bandpass'
  bp.frequency.value = 1500
  bp.Q.value = 5.5
  const g = c.createGain()
  const vol = Math.min(0.13, 0.045 + intensity * 0.11)
  const t = c.currentTime
  g.gain.setValueAtTime(0.0001, t)
  g.gain.exponentialRampToValueAtTime(vol, t + 0.03)
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.5)
  src.connect(bp)
  bp.connect(g)
  g.connect(master)
  src.start(t)
  src.stop(t + 0.55)
}

// ───────────────────────── crash impact ─────────────────────────
// A real collision is not a click — it's a ~450 ms EVENT: sheet metal buckling,
// glass and trim rattling loose, then the body settling. The first version of
// this fired one 30 ms blip and read as a "pop". This builds it in stages:
//
//   1. CRUNCH   low-passed noise with a slow attack — metal folding, not a tick
//   2. IMPACT   a pitch-diving body thud you feel more than hear
//   3. DEBRIS   3-5 randomised high ticks scattered over 250 ms (glass + trim)
//   4. GROAN    a short detuned pair that sags — the shell flexing back
//
// `force` is 0..1 and scales length, brightness and how much debris there is.
let crashCd = 0
export function crashHit(force: number) {
  const c = ac()
  if (!c || !master) return
  const now = performance.now()
  if (now < crashCd) return // one event per contact, not a machine-gun
  crashCd = now + 220
  const f = Math.max(0.15, Math.min(1, force))
  const t = c.currentTime
  const dur = 0.30 + f * 0.34

  // 1. CRUNCH — the main body of the sound
  const src = c.createBufferSource()
  src.buffer = noise(c)
  src.loop = true
  src.playbackRate.value = 0.55 + f * 0.35
  const lp = c.createBiquadFilter()
  lp.type = 'lowpass'
  lp.frequency.setValueAtTime(900 + f * 2200, t)
  lp.frequency.exponentialRampToValueAtTime(240, t + dur)
  lp.Q.value = 3.2 // resonant, so it rings like a panel rather than hissing
  const dist = c.createWaveShaper()
  const curve = new Float32Array(257)
  for (let i = 0; i < 257; i++) {
    const x = (i / 128) - 1
    curve[i] = Math.tanh(x * (2 + f * 4))
  }
  dist.curve = curve
  const ng = c.createGain()
  ng.gain.setValueAtTime(0.0001, t)
  ng.gain.linearRampToValueAtTime(0.10 + f * 0.30, t + 0.022) // slow-ish attack = crunch
  ng.gain.exponentialRampToValueAtTime(0.0001, t + dur)
  src.connect(lp); lp.connect(dist); dist.connect(ng); ng.connect(master)
  src.start(t); src.stop(t + dur + 0.05)

  // 2. IMPACT — the mass arriving
  const o = c.createOscillator()
  o.type = 'sine'
  o.frequency.setValueAtTime(190 + f * 70, t)
  o.frequency.exponentialRampToValueAtTime(32, t + 0.22)
  const og = c.createGain()
  og.gain.setValueAtTime(0.0001, t)
  og.gain.exponentialRampToValueAtTime(0.10 + f * 0.30, t + 0.015)
  og.gain.exponentialRampToValueAtTime(0.0001, t + 0.34)
  o.connect(og); og.connect(master)
  o.start(t); o.stop(t + 0.36)

  // 3. DEBRIS — scattered ticks so the tail isn't a clean fade
  const bits = 2 + Math.round(f * 3)
  for (let i = 0; i < bits; i++) {
    const at = t + 0.05 + Math.random() * (0.1 + f * 0.2)
    const d = c.createBufferSource()
    d.buffer = noise(c)
    d.loop = true
    const bp = c.createBiquadFilter()
    bp.type = 'bandpass'
    bp.frequency.value = 2600 + Math.random() * 3200
    bp.Q.value = 7
    const dg = c.createGain()
    dg.gain.setValueAtTime(0.0001, at)
    dg.gain.exponentialRampToValueAtTime(0.02 + f * 0.05, at + 0.006)
    dg.gain.exponentialRampToValueAtTime(0.0001, at + 0.09)
    d.connect(bp); bp.connect(dg); dg.connect(master)
    d.start(at); d.stop(at + 0.12)
  }

  // 4. GROAN — the shell flexing back, only on solid hits
  if (f > 0.4) {
    const gg = c.createGain()
    gg.gain.setValueAtTime(0.0001, t + 0.04)
    gg.gain.exponentialRampToValueAtTime(0.03 * f, t + 0.1)
    gg.gain.exponentialRampToValueAtTime(0.0001, t + 0.55)
    gg.connect(master)
    for (const base of [232, 349]) {
      const g2 = c.createOscillator()
      g2.type = 'sawtooth'
      g2.frequency.setValueAtTime(base * (0.95 + f * 0.1), t + 0.04)
      g2.frequency.exponentialRampToValueAtTime(base * 0.62, t + 0.5)
      const lp2 = c.createBiquadFilter()
      lp2.type = 'lowpass'
      lp2.frequency.value = 1500
      g2.connect(lp2); lp2.connect(gg)
      g2.start(t + 0.04); g2.stop(t + 0.56)
    }
  }
}

// ───────────────────────── river splash ─────────────────────────
// The car going into the water: a broadband noise burst swept downward by a
// closing lowpass (the impact spray settling), plus a low sine that bends down
// underneath it (the body going under). Same throwaway-node idiom as screech.
export function splash() {
  const c = ac()
  if (!c || !master) return
  const t = c.currentTime

  const src = c.createBufferSource()
  src.buffer = noise(c)
  src.loop = true
  const lp = c.createBiquadFilter()
  lp.type = 'lowpass'
  lp.frequency.setValueAtTime(5200, t)
  lp.frequency.exponentialRampToValueAtTime(320, t + 1.1)
  lp.Q.value = 0.8
  const g = c.createGain()
  g.gain.setValueAtTime(0.0001, t)
  g.gain.exponentialRampToValueAtTime(0.19, t + 0.05)
  g.gain.exponentialRampToValueAtTime(0.0001, t + 1.3)
  src.connect(lp)
  lp.connect(g)
  g.connect(master)
  src.start(t)
  src.stop(t + 1.35)

  // the heavy "gloop" of the body submerging
  const o = c.createOscillator()
  o.type = 'sine'
  o.frequency.setValueAtTime(190, t)
  o.frequency.exponentialRampToValueAtTime(48, t + 0.65)
  const og = c.createGain()
  og.gain.setValueAtTime(0.0001, t)
  og.gain.exponentialRampToValueAtTime(0.16, t + 0.07)
  og.gain.exponentialRampToValueAtTime(0.0001, t + 0.8)
  o.connect(og)
  og.connect(master)
  o.start(t)
  o.stop(t + 0.85)
}

// ───────────────────────── player horn (H) ─────────────────────────
export function playerHonk() {
  const c = ac()
  if (!c || !master) return
  const t = c.currentTime
  const gain = c.createGain()
  gain.connect(master)
  gain.gain.setValueAtTime(0.0001, t)
  gain.gain.exponentialRampToValueAtTime(0.2, t + 0.02)
  gain.gain.setValueAtTime(0.2, t + 0.22)
  gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.36)
  for (const f of [370, 466]) {
    const o = c.createOscillator()
    o.type = 'sawtooth'
    o.frequency.value = f
    o.connect(gain)
    o.start(t)
    o.stop(t + 0.38)
  }
}

// ───────────────────────── parade (cheer + brass motif) ─────────────────────────
let parade: { cheerGain: GainNode; musicGain: GainNode; loop: number } | null = null
// a short, jaunty major motif (semitone steps from a base), looped as "band"
const MOTIF = [0, 4, 7, 12, 7, 4, 7, 9]
const BASE_HZ = 233.08 // ~Bb3
function ensureParade() {
  const c = ac()
  if (!c || parade || !master) return

  // ── crowd bed: a warm LOW murmur (not a mid hiss) that "breathes" via a slow
  //    LFO, so it reads as a chattering crowd rather than running water ──
  const cheerGain = c.createGain()
  cheerGain.gain.value = 0
  cheerGain.connect(master)
  const src = c.createBufferSource()
  src.buffer = noise(c)
  src.loop = true
  const bp = c.createBiquadFilter()
  bp.type = 'bandpass'
  bp.frequency.value = 440
  bp.Q.value = 0.5
  const lp = c.createBiquadFilter()
  lp.type = 'lowpass'
  lp.frequency.value = 1300
  const murmurMod = c.createGain()
  murmurMod.gain.value = 0.85
  src.connect(bp)
  bp.connect(lp)
  lp.connect(murmurMod)
  murmurMod.connect(cheerGain)
  src.start()
  // slow amplitude wobble on the murmur → the crowd "breathes"
  const lfo = c.createOscillator()
  lfo.type = 'sine'
  lfo.frequency.value = 0.55
  const lfoDepth = c.createGain()
  lfoDepth.gain.value = 0.4
  lfo.connect(lfoDepth)
  lfoDepth.connect(murmurMod.gain)
  lfo.start()

  const musicGain = c.createGain()
  musicGain.gain.value = 0
  musicGain.connect(master)

  // a single applause "clap" — a very short high-passed noise burst
  const clap = (when: number, level: number) => {
    const cc = ac()
    if (!cc) return
    const n = cc.createBufferSource()
    n.buffer = noise(cc)
    n.loop = true
    const hp = cc.createBiquadFilter()
    hp.type = 'highpass'
    hp.frequency.value = 1700
    const g = cc.createGain()
    g.gain.setValueAtTime(0.0001, when)
    g.gain.exponentialRampToValueAtTime(level, when + 0.004)
    g.gain.exponentialRampToValueAtTime(0.0001, when + 0.05)
    n.connect(hp)
    hp.connect(g)
    g.connect(cheerGain)
    n.start(when)
    n.stop(when + 0.06)
  }

  let step = 0
  const loop = window.setInterval(() => {
    const cc = ac()
    if (!cc || !parade) return
    const t = cc.currentTime
    // scattered applause — a handful of claps at random offsets each beat
    const claps = 2 + Math.floor(Math.random() * 4)
    for (let i = 0; i < claps; i++) clap(t + Math.random() * 0.28, 0.05 + Math.random() * 0.05)
    // every few beats, a crowd "whoo" swell (rising band of noise)
    if (step % 8 === 3) {
      const n = cc.createBufferSource()
      n.buffer = noise(cc)
      n.loop = true
      const bpw = cc.createBiquadFilter()
      bpw.type = 'bandpass'
      bpw.frequency.setValueAtTime(600, t)
      bpw.frequency.linearRampToValueAtTime(1400, t + 0.5)
      bpw.Q.value = 2.5
      const gw = cc.createGain()
      gw.gain.setValueAtTime(0.0001, t)
      gw.gain.exponentialRampToValueAtTime(0.13, t + 0.25)
      gw.gain.exponentialRampToValueAtTime(0.0001, t + 0.9)
      n.connect(bpw)
      bpw.connect(gw)
      gw.connect(cheerGain)
      n.start(t)
      n.stop(t + 1.0)
    }
    // brass motif — the "band"
    const semis = MOTIF[step % MOTIF.length]
    const f = BASE_HZ * Math.pow(2, semis / 12)
    const ng = cc.createGain()
    ng.connect(musicGain)
    ng.gain.setValueAtTime(0.0001, t)
    ng.gain.exponentialRampToValueAtTime(0.5, t + 0.03)
    ng.gain.exponentialRampToValueAtTime(0.0001, t + 0.42)
    for (const [mult, g] of [[1, 1], [2, 0.4], [3, 0.18]] as const) {
      const o = cc.createOscillator()
      o.type = 'sawtooth'
      o.frequency.value = f * mult
      const og = cc.createGain()
      og.gain.value = g
      o.connect(og)
      og.connect(ng)
      o.start(t)
      o.stop(t + 0.44)
    }
    step++
  }, 300)
  parade = { cheerGain, musicGain, loop }
}

// prox 0 (far) → 1 (at the parade). Call every frame from the car.
export function setParadeMix(prox: number) {
  const c = ac()
  if (prox <= 0.001) {
    if (parade && c) {
      parade.cheerGain.gain.setTargetAtTime(0, c.currentTime, 0.3)
      parade.musicGain.gain.setTargetAtTime(0, c.currentTime, 0.3)
    }
    return
  }
  ensureParade()
  if (!c || !parade) return
  const t = c.currentTime
  const p = Math.min(1, prox)
  // LEVELS: these were 0.09 / 0.05 — roughly a tenth of the radio (master 0.58,
  // song bus 0.6, voice 0.85). The bed was technically playing the whole time
  // and simply inaudible under the engine and the station, so the parade read as
  // a silent crowd. Raised to sit UNDER the radio but clearly present.
  //
  // The curve also matters: prox arrives linear in distance (1 - d/70), so at
  // 35 m out a linear gain is already down 6 dB and the crowd only "appears" in
  // the last few metres. Squaring it keeps the approach quiet and makes the
  // swell bloom as you actually reach the barricades.
  const swell = p * p
  parade.cheerGain.gain.setTargetAtTime(swell * 0.55, t, 0.25)
  parade.musicGain.gain.setTargetAtTime(swell * 0.3, t, 0.25)
}

// ───────────────────────── car radio (KPI 101.1 — broadcast) ─────────────────────────
// A real broadcast, not a screen reader: pre-rendered, radio-filtered voice
// files (deadpan "business radio", cut in scripts/render-radio.mjs) play in
// rotation over a quiet muzak bed and a bed of station static. The music ducks
// under the voice, like a real feed. If the voice files aren't rendered yet the
// bed still plays, so the radio is never a dead robot — just instrumental.
//
// Script + line order live in radioLines.json; audio in public/sounds/radio/.
import radioScript from './radioLines.json'

type RadioLine = { id: string; segment: string; text: string; exec?: string }
const RADIO_LINES: RadioLine[] = radioScript.lines

// "Top hits" — original satirical songs (generated in Suno; see radioSongs.md).
// Files live in public/sounds/radio/music/<id>.mp3. Add entries here as you
// render more; the rotation plays one song every few talk segments.
type Song = { id: string; title: string; artist: string; intro?: string }
const SONGS: Song[] = radioScript.songs ?? []

let radioOn = false
let radioIdx = 0
let radioTimer: number | null = null
let radioLoaded = false
let radioBuffers: (AudioBuffer | null)[] = []
let songBuffers: (AudioBuffer | null)[] = []
let introBuffers: (AudioBuffer | null)[] = []
let songIdx = 0
let segStep = 0 // rotation counter: talk, talk, song, repeat
let radioMaster: GainNode | null = null // everything radio routes through here (the volume dial)
let radioVoiceGain: GainNode | null = null
let currentVoice: AudioBufferSourceNode | null = null
let currentSong: AudioBufferSourceNode | null = null
let bed: { music: GainNode; stat: GainNode; statSrc: AudioBufferSourceNode; loop: number } | null = null

const MUSIC_ON = 0.05 // muzak bed level between segments
const MUSIC_DUCK = 0.018 // ducked under the voice
const STATIC_ON = 0.0035 // constant station hiss — barely there (just enough texture)

// ── observable radio state, so the on-screen dial (DriveHud) stays in sync
// whether you use the dial, the mute button, or the R key. useSyncExternalStore
// needs a STABLE snapshot object, so we only rebuild `radioSnap` on real change.
let radioVolume = 0.58 // starts moderate — the dial can push it louder
let radioSnap = { on: false, volume: radioVolume }
const radioListeners = new Set<() => void>()
function pushRadioState() {
  radioSnap = { on: radioOn, volume: radioVolume }
  radioListeners.forEach((l) => l())
}
export function subscribeRadio(cb: () => void) {
  radioListeners.add(cb)
  return () => {
    radioListeners.delete(cb)
  }
}
export function getRadioState() {
  return radioSnap
}

export function isRadioOn() {
  return radioOn
}

// A gentle soft-clip curve — a little speaker "grit" so the broadcast isn't
// clean studio audio. Cached; subtle (k small).
let _gritCurve: Float32Array<ArrayBuffer> | null = null
function gritCurve(): Float32Array<ArrayBuffer> {
  if (_gritCurve) return _gritCurve
  const n = 1024
  const curve = new Float32Array(n)
  const k = 2.2
  for (let i = 0; i < n; i++) {
    const x = (i * 2) / n - 1
    curve[i] = ((1 + k) * x) / (1 + k * Math.abs(x))
  }
  _gritCurve = curve
  return curve
}

// Lazily create the single gain the whole radio routes through — this is what
// the volume dial turns. Everything (voice, muzak, songs, static) then passes
// through a "car-radio coloring" chain on its way to the master: band-limit to a
// small dashboard-speaker band (~180 Hz–4.6 kHz), bump the presence, and add a
// touch of grit — so it reads as coming THROUGH a radio, not a studio feed.
function ensureRadioMaster(): GainNode | null {
  const c = ac()
  if (!c || !master) return null
  if (!radioMaster) {
    radioMaster = c.createGain()
    radioMaster.gain.value = radioVolume
    const hp = c.createBiquadFilter()
    hp.type = 'highpass'
    hp.frequency.value = 180
    const lp = c.createBiquadFilter()
    lp.type = 'lowpass'
    lp.frequency.value = 4600
    const presence = c.createBiquadFilter()
    presence.type = 'peaking'
    presence.frequency.value = 1900
    presence.Q.value = 0.8
    presence.gain.value = 4
    const shaper = c.createWaveShaper()
    shaper.curve = gritCurve()
    shaper.oversample = '2x'
    radioMaster.connect(hp)
    hp.connect(lp)
    lp.connect(presence)
    presence.connect(shaper)
    shaper.connect(master)
  }
  return radioMaster
}

// 0..1 — set from the dial. Persists across on/off.
export function setRadioVolume(v: number) {
  radioVolume = Math.min(1, Math.max(0, v))
  const c = ac()
  const rm = ensureRadioMaster()
  if (rm && c) rm.gain.setTargetAtTime(radioVolume, c.currentTime, 0.05)
  pushRadioState()
}

// Fetch + decode every voice file once. Missing files (not yet rendered) decode
// to null and are simply skipped in rotation.
async function loadRadio() {
  const c = ac()
  if (!c || radioLoaded) return
  radioLoaded = true
  const decode = async (url: string) => {
    try {
      const res = await fetch(url)
      if (!res.ok) throw new Error(String(res.status))
      const ab = await res.arrayBuffer()
      return await c.decodeAudioData(ab.slice(0))
    } catch {
      return null
    }
  }
  radioBuffers = await Promise.all(RADIO_LINES.map((l) => decode(`/sounds/radio/${l.id}.mp3`)))
  songBuffers = await Promise.all(SONGS.map((s) => decode(`/sounds/radio/music/${s.id}.mp3`)))
  introBuffers = await Promise.all(SONGS.map((s) => decode(`/sounds/radio/music/${s.id}-intro.mp3`)))
}

// Muzak bed (slow sine chord cycle — deadpan lobby hold-music) + station static.
function ensureBed() {
  const c = ac()
  const rm = ensureRadioMaster()
  if (!c || bed || !rm) return
  const music = c.createGain()
  music.gain.value = 0
  music.connect(rm)
  // static: quiet high-passed noise, always on while the radio's on
  const statSrc = c.createBufferSource()
  statSrc.buffer = noise(c)
  statSrc.loop = true
  const hp = c.createBiquadFilter()
  hp.type = 'highpass'
  hp.frequency.value = 2200
  const stat = c.createGain()
  stat.gain.value = 0
  statSrc.connect(hp)
  hp.connect(stat)
  stat.connect(rm)
  statSrc.start()
  // a lazy minor-ish chord cycle, each chord swelling and fading over ~2.2s
  const CHORDS = [
    [220, 277.18, 329.63],
    [196, 246.94, 293.66],
    [174.61, 220, 261.63],
    [196, 246.94, 329.63],
  ]
  let step = 0
  const loop = window.setInterval(() => {
    const cc = ac()
    if (!cc || !bed) return
    const chord = CHORDS[step % CHORDS.length]
    const t = cc.currentTime
    for (const f of chord) {
      const o = cc.createOscillator()
      o.type = 'sine'
      o.frequency.value = f
      const g = cc.createGain()
      g.gain.setValueAtTime(0.0001, t)
      g.gain.exponentialRampToValueAtTime(0.3, t + 0.6)
      g.gain.exponentialRampToValueAtTime(0.0001, t + 2.3)
      o.connect(g)
      g.connect(music)
      o.start(t)
      o.stop(t + 2.4)
    }
    step++
  }, 2200)
  bed = { music, stat, statSrc, loop }
}

// Rotation dispatcher: talk, talk, song, repeat. Falls back to talk-only until
// (or unless) song files are loaded.
function playNext() {
  if (!radioOn) return
  // Talk-heavy: N talk segments, then a song, repeat — so the satire gets heard
  // on a short (~2.5 min) run instead of one long song eating it. KPI is a
  // business TALK station; the songs are the interruption, not the main event.
  //
  // N was 4, tuned when the only track was 2.6 min. The current pair run 3.1 and
  // 3.6 min, which pushed the mix toward music and dropped the song-repeat gap to
  // 8.9 min — under the ~10 min a player needs for four 150 s attempts. Six talk
  // segments per song restores the original talk-heavy intent AND stretches the
  // repeat gap to ~9.4 min. (A third song is the real fix for a hard guarantee;
  // see radioSongs.md.)
  const TALK_PER_SONG = 6
  const haveSong = songBuffers.some(Boolean)
  const wantSong = haveSong && segStep % (TALK_PER_SONG + 1) === TALK_PER_SONG
  segStep++
  if (wantSong) playSong()
  else playLine()
}

// Play the next available voice line, duck the muzak under it, schedule the next.
function playLine() {
  const c = ac()
  if (!radioOn || !c || !master) return
  let buf: AudioBuffer | null = null
  for (let tries = 0; tries < RADIO_LINES.length; tries++) {
    buf = radioBuffers[radioIdx % RADIO_LINES.length]
    radioIdx++
    if (buf) break
  }
  if (!buf) {
    // files not loaded yet — keep the bed running, check back shortly
    radioTimer = window.setTimeout(playNext, 1500)
    return
  }
  if (bed) bed.music.gain.setTargetAtTime(MUSIC_DUCK, c.currentTime, 0.25)
  const src = c.createBufferSource()
  src.buffer = buf
  src.connect(radioVoiceGain!)
  currentVoice = src
  src.onended = () => {
    currentVoice = null
    const cc = ac()
    if (!radioOn || !cc) return
    if (bed) bed.music.gain.setTargetAtTime(MUSIC_ON, cc.currentTime, 0.5)
    radioTimer = window.setTimeout(playNext, 2600) // gap between segments
  }
  src.start()
}

// Play a "top hit": the DJ intro reads over the ducked bed, then the track
// itself takes over (the song IS the music, so the bed drops out fully). A light
// EQ keeps the song sitting on the same radio as the voice.
function playSong() {
  const c = ac()
  const rm = ensureRadioMaster()
  if (!radioOn || !c || !rm) {
    if (radioOn) radioTimer = window.setTimeout(playNext, 1500)
    return
  }
  let buf: AudioBuffer | null = null
  let chosen = -1
  for (let tries = 0; tries < SONGS.length; tries++) {
    const i = songIdx % SONGS.length
    buf = songBuffers[i]
    songIdx++
    if (buf) {
      chosen = i
      break
    }
  }
  if (!buf) {
    playLine() // no song ready — just talk
    return
  }
  const track = buf // captured non-null for the nested callback

  const startTrack = () => {
    const cc = ac()
    if (!radioOn || !cc) return
    if (bed) bed.music.gain.setTargetAtTime(0, cc.currentTime, 0.4) // song replaces the bed
    const src = cc.createBufferSource()
    src.buffer = track
    const hp = cc.createBiquadFilter()
    hp.type = 'highpass'
    hp.frequency.value = 70
    const lp = cc.createBiquadFilter()
    lp.type = 'lowpass'
    lp.frequency.value = 13000
    const g = cc.createGain()
    g.gain.value = 0.6 // songs carry more musical energy than the talk — keep them level with the voice
    src.connect(hp)
    hp.connect(lp)
    lp.connect(g)
    g.connect(rm)
    currentSong = src
    src.onended = () => {
      currentSong = null
      const c3 = ac()
      if (!radioOn || !c3) return
      if (bed) bed.music.gain.setTargetAtTime(MUSIC_ON, c3.currentTime, 0.6)
      radioTimer = window.setTimeout(playNext, 1800)
    }
    src.start()
  }

  const intro = chosen >= 0 ? introBuffers[chosen] : null
  if (intro && radioVoiceGain) {
    // duck the bed like a talk break, read the DJ intro, then drop into the song
    if (bed) bed.music.gain.setTargetAtTime(MUSIC_DUCK, c.currentTime, 0.25)
    const iv = c.createBufferSource()
    iv.buffer = intro
    iv.connect(radioVoiceGain)
    currentVoice = iv
    iv.onended = () => {
      currentVoice = null
      if (radioOn) startTrack()
    }
    iv.start()
  } else {
    startTrack()
  }
}

export function startRadio() {
  if (radioOn) return
  const c = ac()
  const rm = ensureRadioMaster()
  if (!c || !rm) return
  radioOn = true
  // Ease the radio up from silence rather than snapping to full volume — so the
  // moment the drive starts (radio auto-on) it fades in gently instead of a blast.
  rm.gain.cancelScheduledValues(c.currentTime)
  rm.gain.setValueAtTime(0.0001, c.currentTime)
  rm.gain.setTargetAtTime(radioVolume, c.currentTime, 0.9) // ~2.5s to settle
  if (!radioVoiceGain) {
    radioVoiceGain = c.createGain()
    radioVoiceGain.gain.value = 0.85
    radioVoiceGain.connect(rm)
  }
  ensureBed()
  if (bed) {
    bed.music.gain.setTargetAtTime(MUSIC_ON, c.currentTime, 0.6)
    bed.stat.gain.setTargetAtTime(STATIC_ON, c.currentTime, 0.6)
  }
  void loadRadio()
  radioTimer = window.setTimeout(playNext, 300) // start the broadcast promptly
  pushRadioState()
}

export function stopRadio() {
  radioOn = false
  if (radioTimer) {
    clearTimeout(radioTimer)
    radioTimer = null
  }
  const c = ac()
  try {
    currentVoice?.stop()
    currentSong?.stop()
  } catch {
    /* already stopped */
  }
  currentVoice = null
  currentSong = null
  if (bed && c) {
    bed.music.gain.setTargetAtTime(0, c.currentTime, 0.3)
    bed.stat.gain.setTargetAtTime(0, c.currentTime, 0.3)
  }
  pushRadioState()
}

export function toggleRadio() {
  if (radioOn) stopRadio()
  else startRadio()
}

// Tear everything down when the run ends / the scene unmounts.
export function stopAll() {
  stopRadio()
  engineOff()
  const c = ac()
  if (bed) {
    clearInterval(bed.loop)
    try {
      bed.statSrc.stop()
    } catch {
      /* already stopped */
    }
    bed = null
  }
  if (parade) {
    clearInterval(parade.loop)
    if (c) {
      parade.cheerGain.gain.setTargetAtTime(0, c.currentTime, 0.1)
      parade.musicGain.gain.setTargetAtTime(0, c.currentTime, 0.1)
    }
    parade = null
  }
}
