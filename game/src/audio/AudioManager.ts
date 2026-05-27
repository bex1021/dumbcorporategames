// Hybrid Web Audio manager:
//   - HVAC drone: synth (continuous, parametric).
//   - Notification cues: prefer pre-loaded real audio files (e.g. the actual
//     Slack "knock_brush" sound, CC0 from Internet Archive). If the file
//     isn't loaded yet (cold start, slow network), fall back to the synth
//     two-blip so the player still hears *something*.
//
// Real-file pings are decoded once at start() and replayed via
// AudioBufferSourceNode — these are cheap and can overlap freely, so we
// don't rate-limit at the audio layer.

type SoundCue =
  | 'slack'
  | 'gmail'
  | 'calendar'
  | 'printer-ping'
  | 'printer-paper'
  | 'printer-gears'
  | 'none'

// Public-domain audio files served from /public/sounds. Each entry's
// presence is checked at runtime — if the file 404s, the matching
// play* method silently falls back to its synth version. So you can
// drop new MP3s into game/public/sounds/ without code changes.
//
// Suggested sources (CC0 / Pixabay license):
//   - https://pixabay.com/sound-effects/search/printer/
//   - https://pixabay.com/sound-effects/search/xerox/
//   - https://pixabay.com/sound-effects/search/photocopier/
// Recommended filenames so the loader picks them up automatically:
//   printer-ping.mp3   — warm-up / "ready" beep (~0.5–1s)
//   printer-paper.mp3  — paper feed / shuffle (~0.5–1s)
//   printer-gears.mp3  — long whirring / motor (~1–2s)
const SOUND_FILES: Partial<Record<SoundCue, string>> = {
  slack: '/sounds/slack-knock.mp3',
  'printer-ping': '/sounds/printer-ping.mp3',
  'printer-paper': '/sounds/printer-paper.mp3',
  'printer-gears': '/sounds/printer-gears.mp3',
}

class AudioManager {
  private ctx: AudioContext | null = null
  private hvacOsc: OscillatorNode | null = null
  private hvacGain: GainNode | null = null
  private hvacBaseFreq = 80 // Hz
  private muted = false
  private started = false
  // Loaded sample buffers. play() looks here first; falls back to synth if
  // the cue isn't here (either the file hasn't loaded yet, or we never had one).
  private buffers: Partial<Record<SoundCue, AudioBuffer>> = {}
  // Cached white-noise buffer for footstep synthesis. Generated once on first
  // playFootstep() call and reused — cheaper than creating a new buffer per step.
  private footstepBuffer: AudioBuffer | null = null

  /** Must be called from a user gesture (click, key) — browser autoplay rules. */
  start() {
    if (this.started) return
    try {
      this.ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)()
      this.startHvac()
      this.started = true
      // Kick off async sample loads. Don't await — first ping might fall
      // back to synth if it fires before the network completes, that's OK.
      void this.loadSamples()
    } catch (e) {
      // eslint-disable-next-line no-console
      console.warn('AudioContext init failed', e)
    }
  }

  private async loadSamples() {
    if (!this.ctx) return
    const ctx = this.ctx
    await Promise.all(
      (Object.entries(SOUND_FILES) as Array<[SoundCue, string]>).map(
        async ([cue, url]) => {
          try {
            const res = await fetch(url)
            if (!res.ok) throw new Error(`HTTP ${res.status}`)
            const arrayBuffer = await res.arrayBuffer()
            // Some browsers require the callback form; promise form is
            // widely supported in modern ones. Wrap defensively.
            const buf = await ctx.decodeAudioData(arrayBuffer.slice(0))
            this.buffers[cue] = buf
          } catch (e) {
            // eslint-disable-next-line no-console
            console.warn(`Failed to load sound "${cue}" (${url})`, e)
          }
        }
      )
    )
  }

  private startHvac() {
    if (!this.ctx) return
    const osc = this.ctx.createOscillator()
    osc.type = 'sawtooth'
    osc.frequency.value = this.hvacBaseFreq
    // Low-pass filter to soften the saw into more of a drone
    const filter = this.ctx.createBiquadFilter()
    filter.type = 'lowpass'
    filter.frequency.value = 250
    const gain = this.ctx.createGain()
    gain.gain.value = this.muted ? 0 : 0.018
    osc.connect(filter).connect(gain).connect(this.ctx.destination)
    osc.start()
    this.hvacOsc = osc
    this.hvacGain = gain
  }

  /** Pitch the HVAC drone down 0..1 based on pissedOff/100. */
  setPissedOffNorm(pissedOff: number) {
    if (!this.ctx || !this.hvacOsc) return
    const norm = Math.max(0, Math.min(1, pissedOff / 100))
    // 0 → 80Hz (clean), 1.0 → 60Hz (oppressive)
    const target = this.hvacBaseFreq - norm * 20
    this.hvacOsc.frequency.linearRampToValueAtTime(target, this.ctx.currentTime + 0.5)
  }

  play(cue: SoundCue) {
    if (cue === 'none' || cue === undefined) return
    // Prefer the real-audio sample if loaded; fall back to the synth pings.
    if (this.playSample(cue)) return
    if (cue === 'slack') this.playSlack()
    else if (cue === 'gmail') this.playGmail()
    else if (cue === 'calendar') this.playCalendar()
  }

  /**
   * Play a pre-loaded audio buffer for this cue. Returns true if a sample
   * was played, false if no sample is available (caller should fall back
   * to the synth tones). Each call creates a fresh BufferSourceNode so
   * overlapping plays work (e.g. two delayed effects firing in the same
   * markHandled).
   */
  private playSample(cue: SoundCue): boolean {
    if (!this.ctx || this.muted) return false
    const buf = this.buffers[cue]
    if (!buf) return false
    const ctx = this.ctx
    const src = ctx.createBufferSource()
    src.buffer = buf
    const gain = ctx.createGain()
    // Real-file samples are louder than our synth tones — knock the volume
    // down a bit so it sits well alongside the HVAC drone.
    gain.gain.value = 0.5
    src.connect(gain).connect(ctx.destination)
    src.start()
    return true
  }

  /**
   * Footstep — two-component synthesis so it's audible on laptop speakers
   * (which roll off everything under ~150Hz). Synth-only, no asset needed.
   *
   * Component 1: low-passed noise body (~400Hz cutoff) → the foot-on-wood thump.
   * Component 2: brief band-passed click around 1.2kHz → the shoe/floor contact
   *              that gives the step character on cheap speakers.
   *
   * Called by the Player on a step interval while moving; alternates `pitch`
   * ~1.0 / ~0.92 for L/R variety so it doesn't sound like a metronome.
   */
  playFootstep(opts: { pitch?: number; volume?: number } = {}) {
    if (!this.ctx || this.muted) return
    const ctx = this.ctx
    const now = ctx.currentTime
    const pitch = opts.pitch ?? 1.0
    const peak = opts.volume ?? 0.18 // louder than v1 (0.06) — barely audible before

    // Reusable noise buffer for the thump body.
    if (!this.footstepBuffer) {
      const dur = 0.1
      const len = Math.floor(ctx.sampleRate * dur)
      const buf = ctx.createBuffer(1, len, ctx.sampleRate)
      const data = buf.getChannelData(0)
      for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1
      this.footstepBuffer = buf
    }

    // ----- Component 1: low thump body -----
    const src = ctx.createBufferSource()
    src.buffer = this.footstepBuffer
    src.playbackRate.value = pitch
    const bodyFilter = ctx.createBiquadFilter()
    bodyFilter.type = 'lowpass'
    bodyFilter.frequency.value = 450
    bodyFilter.Q.value = 1.5
    const bodyGain = ctx.createGain()
    bodyGain.gain.setValueAtTime(0.0001, now)
    bodyGain.gain.exponentialRampToValueAtTime(peak, now + 0.005)
    bodyGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.1)
    src.connect(bodyFilter).connect(bodyGain).connect(ctx.destination)
    src.start(now)

    // ----- Component 2: short mid-frequency click -----
    // Helps the footstep punch through on laptop speakers / low-end audio.
    const clickLen = Math.floor(ctx.sampleRate * 0.025)
    const clickBuf = ctx.createBuffer(1, clickLen, ctx.sampleRate)
    const clickData = clickBuf.getChannelData(0)
    for (let i = 0; i < clickLen; i++) clickData[i] = Math.random() * 2 - 1
    const clickSrc = ctx.createBufferSource()
    clickSrc.buffer = clickBuf
    clickSrc.playbackRate.value = pitch
    const clickFilter = ctx.createBiquadFilter()
    clickFilter.type = 'bandpass'
    clickFilter.frequency.value = 1200
    clickFilter.Q.value = 2.5
    const clickGain = ctx.createGain()
    clickGain.gain.setValueAtTime(0.0001, now)
    clickGain.gain.exponentialRampToValueAtTime(peak * 0.45, now + 0.002)
    clickGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.025)
    clickSrc.connect(clickFilter).connect(clickGain).connect(ctx.destination)
    clickSrc.start(now)
  }

  /**
   * Plays a random printer noise — picks one of 5 variants per call. The
   * caller (PrinterProximityAudio) fires this on a random interval when
   * the player is nearby, so over time you hear the full vocabulary of
   * Xerox-era misery: warm-up pings, paper rustles, gears whirring,
   * mechanism clacks, and error beep sequences.
   */
  playPrinterNoise() {
    if (!this.ctx || this.muted) return
    // Weighted variety: clacks + gears are most common (mechanical body),
    // paper shifts mid, pings + errors least frequent (cleaner sounds).
    const r = Math.random()
    if (r < 0.28) this.playPrinterClack()
    else if (r < 0.55) this.playPrinterGears()
    else if (r < 0.78) this.playPrinterPaperShift()
    else if (r < 0.92) this.playPrinterPing()
    else this.playPrinterError()
  }

  /** Long warm-up "ready" ping — sine 800Hz with slow decay, ~0.55s.
   *  Prefers a real sample at /sounds/printer-ping.mp3 if loaded. */
  private playPrinterPing() {
    if (this.playSample('printer-ping')) return
    if (!this.ctx) return
    const ctx = this.ctx
    const now = ctx.currentTime
    const osc = ctx.createOscillator()
    osc.type = 'sine'
    osc.frequency.setValueAtTime(840, now)
    osc.frequency.linearRampToValueAtTime(820, now + 0.55)
    const gain = ctx.createGain()
    gain.gain.setValueAtTime(0.0001, now)
    gain.gain.exponentialRampToValueAtTime(0.09, now + 0.04)
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.55)
    osc.connect(gain).connect(ctx.destination)
    osc.start(now)
    osc.stop(now + 0.6)
  }

  /** Paper shifting / rustling — high-passed noise with tremolo amplitude
   *  modulation that sounds like sheets being fed through a roller.
   *  Prefers a real sample at /sounds/printer-paper.mp3 if loaded. */
  private playPrinterPaperShift() {
    if (this.playSample('printer-paper')) return
    if (!this.ctx) return
    const ctx = this.ctx
    const now = ctx.currentTime
    const dur = 0.7
    const len = Math.floor(ctx.sampleRate * dur)
    const buf = ctx.createBuffer(1, len, ctx.sampleRate)
    const data = buf.getChannelData(0)
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1
    const src = ctx.createBufferSource()
    src.buffer = buf
    const filter = ctx.createBiquadFilter()
    filter.type = 'highpass'
    filter.frequency.value = 2400 // crisp paper-scrape range
    filter.Q.value = 0.7
    // Tremolo: a slow LFO modulates the gain to read as "rustle ... rustle"
    const gain = ctx.createGain()
    const lfo = ctx.createOscillator()
    lfo.frequency.value = 9
    const lfoGain = ctx.createGain()
    lfoGain.gain.value = 0.025
    gain.gain.setValueAtTime(0.0001, now)
    gain.gain.exponentialRampToValueAtTime(0.06, now + 0.05)
    gain.gain.exponentialRampToValueAtTime(0.0001, now + dur)
    lfo.connect(lfoGain).connect(gain.gain)
    src.connect(filter).connect(gain).connect(ctx.destination)
    src.start(now)
    lfo.start(now)
    lfo.stop(now + dur)
  }

  /** Mechanical gears whirring — low band-passed noise with slow LFO
   *  modulation, ~1.2s. The dominant "old printer" sound.
   *  Prefers a real sample at /sounds/printer-gears.mp3 if loaded. */
  private playPrinterGears() {
    if (this.playSample('printer-gears')) return
    if (!this.ctx) return
    const ctx = this.ctx
    const now = ctx.currentTime
    const dur = 1.15
    const len = Math.floor(ctx.sampleRate * dur)
    const buf = ctx.createBuffer(1, len, ctx.sampleRate)
    const data = buf.getChannelData(0)
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * 0.5
    const src = ctx.createBufferSource()
    src.buffer = buf
    const filter = ctx.createBiquadFilter()
    filter.type = 'bandpass'
    filter.frequency.value = 180
    filter.Q.value = 5
    // LFO grinds the volume slightly — a struggling motor cycling on/off.
    const gain = ctx.createGain()
    gain.gain.setValueAtTime(0.0001, now)
    gain.gain.exponentialRampToValueAtTime(0.09, now + 0.06)
    gain.gain.exponentialRampToValueAtTime(0.0001, now + dur)
    const lfo = ctx.createOscillator()
    lfo.frequency.value = 7
    const lfoGain = ctx.createGain()
    lfoGain.gain.value = 0.04
    lfo.connect(lfoGain).connect(gain.gain)
    src.connect(filter).connect(gain).connect(ctx.destination)
    src.start(now)
    lfo.start(now)
    lfo.stop(now + dur)
  }

  /** Mechanism click-clack — the original jam sound. Short impact + clack. */
  private playPrinterClack() {
    if (!this.ctx) return
    const ctx = this.ctx
    const now = ctx.currentTime
    // Initial thunk — filtered noise pulse
    const dur = 0.35
    const buf = ctx.createBuffer(1, Math.floor(ctx.sampleRate * dur), ctx.sampleRate)
    const data = buf.getChannelData(0)
    for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * 0.4
    const src = ctx.createBufferSource()
    src.buffer = buf
    const filter = ctx.createBiquadFilter()
    filter.type = 'bandpass'
    filter.frequency.value = 130
    filter.Q.value = 6
    const gain = ctx.createGain()
    gain.gain.setValueAtTime(0.0001, now)
    gain.gain.exponentialRampToValueAtTime(0.1, now + 0.03)
    gain.gain.exponentialRampToValueAtTime(0.0001, now + dur)
    src.connect(filter).connect(gain).connect(ctx.destination)
    src.start(now)
    // Trailing clack — square wave thwack
    const clackOsc = ctx.createOscillator()
    clackOsc.type = 'square'
    clackOsc.frequency.value = 220
    const clackFilter = ctx.createBiquadFilter()
    clackFilter.type = 'lowpass'
    clackFilter.frequency.value = 700
    const clackGain = ctx.createGain()
    clackGain.gain.setValueAtTime(0.0001, now + dur - 0.05)
    clackGain.gain.exponentialRampToValueAtTime(0.14, now + dur - 0.045)
    clackGain.gain.exponentialRampToValueAtTime(0.0001, now + dur + 0.02)
    clackOsc.connect(clackFilter).connect(clackGain).connect(ctx.destination)
    clackOsc.start(now + dur - 0.05)
    clackOsc.stop(now + dur + 0.05)
  }

  /** Error beep sequence — 3 rapid square-wave beeps at 1200Hz. The "I
   *  can't believe this is happening again" sound. */
  private playPrinterError() {
    if (!this.ctx) return
    const ctx = this.ctx
    const now = ctx.currentTime
    for (let i = 0; i < 3; i++) {
      const t = now + i * 0.13
      const osc = ctx.createOscillator()
      osc.type = 'square'
      osc.frequency.value = 1200
      const gain = ctx.createGain()
      gain.gain.setValueAtTime(0.0001, t)
      gain.gain.exponentialRampToValueAtTime(0.06, t + 0.005)
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.08)
      osc.connect(gain).connect(ctx.destination)
      osc.start(t)
      osc.stop(t + 0.1)
    }
  }

  /** Satisfying slap impact — fires the moment Leonard's hand connects
   *  with the printer. Two-component synth:
   *
   *  Component 1 (transient): a 30ms burst of high-passed noise at 1.5kHz+
   *    → the sharp "smack" of palm on plastic, what gives the impact its
   *    perceived "crispness" and aggression.
   *
   *  Component 2 (body): a 150ms low-passed noise at 500Hz with slightly
   *    longer decay → the "thud" of the plastic housing deflecting under
   *    the slap. Together they read as a real impact, not a beep.
   *
   *  Volume is intentionally loud (0.35 peak) because this is a hit, not
   *  ambient flavor — it should feel like a punctuation moment.
   */
  playSlapImpact(opts: { volume?: number } = {}) {
    if (!this.ctx || this.muted) return
    const ctx = this.ctx
    const now = ctx.currentTime
    const peak = opts.volume ?? 0.35

    // Component 1: sharp transient (the smack)
    const dur1 = 0.035
    const buf1 = ctx.createBuffer(
      1,
      Math.floor(ctx.sampleRate * dur1),
      ctx.sampleRate
    )
    const d1 = buf1.getChannelData(0)
    for (let i = 0; i < d1.length; i++) d1[i] = Math.random() * 2 - 1
    const src1 = ctx.createBufferSource()
    src1.buffer = buf1
    const hp = ctx.createBiquadFilter()
    hp.type = 'highpass'
    hp.frequency.value = 1600
    hp.Q.value = 0.6
    const g1 = ctx.createGain()
    g1.gain.setValueAtTime(0.0001, now)
    g1.gain.exponentialRampToValueAtTime(peak, now + 0.002)
    g1.gain.exponentialRampToValueAtTime(0.0001, now + dur1)
    src1.connect(hp).connect(g1).connect(ctx.destination)
    src1.start(now)

    // Component 2: low-frequency body (the plastic deflection thud)
    const dur2 = 0.16
    const buf2 = ctx.createBuffer(
      1,
      Math.floor(ctx.sampleRate * dur2),
      ctx.sampleRate
    )
    const d2 = buf2.getChannelData(0)
    for (let i = 0; i < d2.length; i++) d2[i] = Math.random() * 2 - 1
    const src2 = ctx.createBufferSource()
    src2.buffer = buf2
    const lp = ctx.createBiquadFilter()
    lp.type = 'lowpass'
    lp.frequency.value = 480
    lp.Q.value = 1.6
    const g2 = ctx.createGain()
    g2.gain.setValueAtTime(0.0001, now)
    g2.gain.exponentialRampToValueAtTime(peak * 0.75, now + 0.004)
    g2.gain.exponentialRampToValueAtTime(0.0001, now + dur2)
    src2.connect(lp).connect(g2).connect(ctx.destination)
    src2.start(now)
  }

  /** A short high-frequency rustle — dry leaves brushing past each other.
   *  Used by PhyllisProximityAudio to fire occasional leaf sounds while
   *  the player is near the plant. The sound is intentionally subtle so
   *  it reads as "ambient nature" rather than an event.
   *
   *  Composition: very high-passed noise (>4kHz) with a fast attack and
   *  exponential decay, modulated by a quick LFO to give the "shsh-shsh"
   *  character of leaves moving.
   */
  playLeafRustle() {
    if (!this.ctx || this.muted) return
    const ctx = this.ctx
    const now = ctx.currentTime
    const dur = 0.35 + Math.random() * 0.2 // 0.35–0.55s
    const len = Math.floor(ctx.sampleRate * dur)
    const buf = ctx.createBuffer(1, len, ctx.sampleRate)
    const data = buf.getChannelData(0)
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1
    const src = ctx.createBufferSource()
    src.buffer = buf
    // Crisp high-pass for that dry-leaf "shhh" — kills the bass rumble
    // so it doesn't compete with the HVAC drone.
    const filter = ctx.createBiquadFilter()
    filter.type = 'highpass'
    filter.frequency.value = 3800
    filter.Q.value = 0.7
    // Gain envelope: fast attack, slow exponential decay
    const gain = ctx.createGain()
    gain.gain.setValueAtTime(0.0001, now)
    gain.gain.exponentialRampToValueAtTime(0.045, now + 0.04)
    gain.gain.exponentialRampToValueAtTime(0.0001, now + dur)
    // LFO modulates the gain slightly to give the rustle a natural irregularity.
    const lfo = ctx.createOscillator()
    lfo.frequency.value = 13 + Math.random() * 6
    const lfoGain = ctx.createGain()
    lfoGain.gain.value = 0.018
    lfo.connect(lfoGain).connect(gain.gain)
    src.connect(filter).connect(gain).connect(ctx.destination)
    src.start(now)
    lfo.start(now)
    lfo.stop(now + dur)
  }

  /** A single "bloop" — low-pitched sine with downward pitch glide. Used
   *  by CoffeeProximityAudio to fire a stream of bubble pops while the
   *  player is near the coffee station, like a percolator brewing. */
  playCoffeeBubble() {
    if (!this.ctx || this.muted) return
    const ctx = this.ctx
    const now = ctx.currentTime
    // Random start frequency 130-220Hz gives variety across pops.
    const startFreq = 130 + Math.random() * 90
    const osc = ctx.createOscillator()
    osc.type = 'sine'
    osc.frequency.setValueAtTime(startFreq, now)
    // Downward glide is what makes it sound like a bubble rising and popping
    // rather than a beep.
    osc.frequency.exponentialRampToValueAtTime(startFreq * 0.55, now + 0.13)
    const gain = ctx.createGain()
    gain.gain.setValueAtTime(0.0001, now)
    gain.gain.exponentialRampToValueAtTime(0.07, now + 0.008)
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.16)
    osc.connect(gain).connect(ctx.destination)
    osc.start(now)
    osc.stop(now + 0.2)
  }

  /** Short high blip — Slack ping (synth fallback). */
  private playSlack() {
    this.playTone({ freq: 880, dur: 0.12, vol: 0.18, type: 'sine' })
    setTimeout(() => this.playTone({ freq: 1320, dur: 0.1, vol: 0.12, type: 'sine' }), 90)
  }

  /** Softer two-tone — Gmail. */
  private playGmail() {
    this.playTone({ freq: 660, dur: 0.12, vol: 0.14, type: 'triangle' })
    setTimeout(() => this.playTone({ freq: 880, dur: 0.18, vol: 0.14, type: 'triangle' }), 120)
  }

  /** Low ding — Calendar reminder. */
  private playCalendar() {
    this.playTone({ freq: 523, dur: 0.32, vol: 0.16, type: 'sine' })
    setTimeout(() => this.playTone({ freq: 392, dur: 0.42, vol: 0.12, type: 'sine' }), 80)
  }

  private playTone({
    freq,
    dur,
    vol,
    type,
  }: {
    freq: number
    dur: number
    vol: number
    type: OscillatorType
  }) {
    if (!this.ctx || this.muted) return
    const ctx = this.ctx
    const osc = ctx.createOscillator()
    osc.type = type
    osc.frequency.value = freq
    const gain = ctx.createGain()
    // Quick attack, exponential decay envelope
    gain.gain.setValueAtTime(0.0001, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(vol, ctx.currentTime + 0.01)
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + dur)
    osc.connect(gain).connect(ctx.destination)
    osc.start()
    osc.stop(ctx.currentTime + dur + 0.05)
  }

  setMuted(muted: boolean) {
    this.muted = muted
    if (this.ctx && this.hvacGain) {
      this.hvacGain.gain.linearRampToValueAtTime(
        muted ? 0 : 0.018,
        this.ctx.currentTime + 0.1
      )
    }
  }

  isStarted() {
    return this.started
  }
}

export const audio = new AudioManager()
