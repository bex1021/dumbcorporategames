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

type SoundCue = 'slack' | 'gmail' | 'calendar' | 'none'

// Public-domain audio files served from /public/sounds. Add more as we
// source them — gmail/calendar still use the synth two-tone for now.
const SOUND_FILES: Partial<Record<SoundCue, string>> = {
  slack: '/sounds/slack-knock.mp3',
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
