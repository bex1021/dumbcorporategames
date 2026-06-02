// Phase 1 office music — a preset-driven "whimsical office lounge" engine.
//
// Pure Web Audio (no assets). Plays the easy-listening loop you'd hear in a
// hotel lobby / on hold with HR: a lead instrument noodling over soft off-beat
// comping, a light bass, and gentle percussion. The exact arrangement (tempo,
// chords, melody, timbres, feel) comes from a MusicPreset, so the same engine
// drives both the live game and the audition page (routes/MusicLab.tsx).
//
// Shares the AudioManager context so it mixes/mutes with the HVAC + pings.
// Scheduled with a lookahead clock so the groove stays steady off the frame rate.

import { DEFAULT_PRESET, type MusicPreset } from './officeMusicPresets'

const midi = (n: number) => 440 * Math.pow(2, (n - 69) / 12)
const STEPS_PER_BAR = 16

export class OfficeMusic {
  private ctx: AudioContext
  private out: GainNode
  private noiseBuf: AudioBuffer | null = null
  private timer: number | null = null
  private step = 0
  private nextTime = 0
  private playing = false
  private muted: boolean
  private preset: MusicPreset
  private stepDur: number
  private totalSteps: number

  private readonly LOOKAHEAD = 0.2
  private readonly TICK_MS = 25

  constructor(ctx: AudioContext, muted: boolean, preset: MusicPreset = DEFAULT_PRESET) {
    this.ctx = ctx
    this.muted = muted
    this.preset = preset
    this.stepDur = 60 / preset.bpm / 4
    this.totalSteps = preset.bars.length * STEPS_PER_BAR
    this.out = ctx.createGain()
    this.out.gain.value = muted ? 0 : preset.baseVol
    this.out.connect(ctx.destination)
    const len = Math.floor(ctx.sampleRate)
    const buf = ctx.createBuffer(1, len, ctx.sampleRate)
    const d = buf.getChannelData(0)
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1
    this.noiseBuf = buf
  }

  start() {
    if (this.playing) return
    if (this.ctx.state === 'suspended') void this.ctx.resume()
    this.playing = true
    this.out.gain.cancelScheduledValues(this.ctx.currentTime)
    this.out.gain.setValueAtTime(0.0001, this.ctx.currentTime)
    this.out.gain.linearRampToValueAtTime(this.muted ? 0 : this.preset.baseVol, this.ctx.currentTime + 1.2)
    this.step = 0
    this.nextTime = this.ctx.currentTime + 0.1
    this.timer = window.setInterval(() => this.scheduler(), this.TICK_MS)
  }

  stop() {
    if (this.timer != null) { clearInterval(this.timer); this.timer = null }
    this.playing = false
    this.out.gain.cancelScheduledValues(this.ctx.currentTime)
    this.out.gain.linearRampToValueAtTime(0.0001, this.ctx.currentTime + 1.0)
  }

  setMuted(muted: boolean) {
    this.muted = muted
    this.out.gain.cancelScheduledValues(this.ctx.currentTime)
    this.out.gain.linearRampToValueAtTime(
      muted ? 0.0001 : this.playing ? this.preset.baseVol : 0.0001,
      this.ctx.currentTime + 0.2,
    )
  }

  private scheduler() {
    while (this.nextTime < this.ctx.currentTime + this.LOOKAHEAD) {
      this.scheduleStep(this.step, this.nextTime)
      this.nextTime += this.stepDur
      this.step = (this.step + 1) % this.totalSteps
    }
  }

  private scheduleStep(s: number, t: number) {
    const p = this.preset
    const bar = Math.floor(s / STEPS_PER_BAR)
    const sib = s % STEPS_PER_BAR
    const { root, comp } = p.bars[bar]

    // ---- BASS ----
    if (p.bass === 'bossa') {
      if (sib === 0) this.bass(midi(root), t, 0.5)
      else if (sib === 6) this.bass(midi(root), t, 0.22)
      else if (sib === 8) this.bass(midi(root + 7), t, 0.42)
      else if (sib === 14) this.bass(midi(root + 7), t, 0.22)
    } else if (p.bass === 'walk') {
      // walking quarter notes: root · 5th · octave · 5th
      if (sib === 0) this.bass(midi(root), t, 0.28)
      else if (sib === 4) this.bass(midi(root + 7), t, 0.28)
      else if (sib === 8) this.bass(midi(root + 12), t, 0.28)
      else if (sib === 12) this.bass(midi(root + 7), t, 0.28)
    } else {
      // simple: root (long) + fifth on beat 3
      if (sib === 0) this.bass(midi(root), t, 0.8)
      else if (sib === 8) this.bass(midi(root + 7), t, 0.6)
    }

    // ---- COMP (soft off-beat stabs) ----
    if (sib === 2 || sib === 6 || sib === 10 || sib === 14) {
      for (const n of comp) this.comp(midi(n), t)
    }

    // ---- MELODY (lead) ----
    const m = p.melody[s]
    if (m !== undefined) {
      const f = midi(m)
      if (p.lead === 'vibe') this.vibe(f, t)
      else if (p.lead === 'marimba') this.marimba(f, t)
      else if (p.lead === 'rhodes') this.rhodes(f, t)
      else this.musicbox(f, t)
    }

    // ---- PERCUSSION ----
    if (p.perc === 'shaker' && sib % 2 === 0) this.shaker(t, sib % 4 === 0 ? 0.018 : 0.011, 7000)
    else if (p.perc === 'hat' && sib % 2 === 0) this.shaker(t, sib % 4 === 0 ? 0.02 : 0.012, 9500)
  }

  // ---- lead voices ----
  private vibe(freq: number, t: number) {
    const dur = 0.7
    const g = this.env(t, 0.08, 0.01, dur)
    const lfo = this.ctx.createOscillator()
    lfo.frequency.value = 5.5
    const lg = this.ctx.createGain(); lg.gain.value = 0.02
    lfo.connect(lg).connect(g.gain); lfo.start(t); lfo.stop(t + dur)
    this.osc('sine', freq, t, dur + 0.05, g)
    this.spark(freq * 2, t, 0.45, 0.03)
  }

  private marimba(freq: number, t: number) {
    const dur = 0.32
    const g = this.env(t, 0.1, 0.005, dur)
    this.osc('triangle', freq, t, dur + 0.03, g)
    this.spark(freq * 2, t, 0.12, 0.025) // bright mallet click
  }

  private rhodes(freq: number, t: number) {
    const dur = 0.95
    const filt = this.ctx.createBiquadFilter()
    filt.type = 'lowpass'; filt.frequency.value = 1900
    const g = this.ctx.createGain()
    g.gain.setValueAtTime(0.0001, t)
    g.gain.linearRampToValueAtTime(0.07, t + 0.05) // soft attack
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
    g.connect(filt).connect(this.out)
    for (const detune of [0, 6]) {
      const o = this.ctx.createOscillator()
      o.type = 'sine'; o.frequency.value = freq; o.detune.value = detune
      o.connect(g); o.start(t); o.stop(t + dur + 0.05)
    }
  }

  private musicbox(freq: number, t: number) {
    const dur = 1.1
    const g = this.env(t, 0.085, 0.004, dur)
    this.osc('sine', freq, t, dur + 0.05, g)
    this.osc('sine', freq * 1.004, t, dur + 0.05, g) // slight detune = music-box "plink"
    this.spark(freq * 2, t, 0.6, 0.03)
  }

  // ---- support voices ----
  private comp(freq: number, t: number) {
    const dur = 0.32
    const filt = this.ctx.createBiquadFilter()
    filt.type = 'lowpass'; filt.frequency.value = 2000
    const g = this.env(t, 0.035, 0.02, dur)
    const o = this.ctx.createOscillator()
    o.type = 'triangle'; o.frequency.value = freq
    o.connect(filt).connect(g); o.start(t); o.stop(t + dur + 0.03)
  }

  private bass(freq: number, t: number, dur: number) {
    const g = this.env(t, 0.09, 0.02, dur)
    this.osc('triangle', freq, t, dur + 0.03, g)
  }

  private shaker(t: number, vol: number, hz: number) {
    if (!this.noiseBuf) return
    const src = this.ctx.createBufferSource()
    src.buffer = this.noiseBuf
    const f = this.ctx.createBiquadFilter()
    f.type = 'highpass'; f.frequency.value = hz
    const g = this.ctx.createGain()
    g.gain.setValueAtTime(0.0001, t)
    g.gain.exponentialRampToValueAtTime(vol, t + 0.004)
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.05)
    src.connect(f).connect(g).connect(this.out)
    src.start(t); src.stop(t + 0.07)
  }

  // ---- helpers ----
  private env(t: number, peak: number, attack: number, dur: number): GainNode {
    const g = this.ctx.createGain()
    g.gain.setValueAtTime(0.0001, t)
    g.gain.exponentialRampToValueAtTime(peak, t + attack)
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
    g.connect(this.out)
    return g
  }

  private osc(type: OscillatorType, freq: number, t: number, stopAt: number, dest: GainNode) {
    const o = this.ctx.createOscillator()
    o.type = type; o.frequency.value = freq
    o.connect(dest); o.start(t); o.stop(t + stopAt)
  }

  private spark(freq: number, t: number, dur: number, peak: number) {
    const g = this.ctx.createGain()
    g.gain.setValueAtTime(0.0001, t)
    g.gain.exponentialRampToValueAtTime(peak, t + 0.006)
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
    g.connect(this.out)
    const o = this.ctx.createOscillator()
    o.type = 'sine'; o.frequency.value = freq
    o.connect(g); o.start(t); o.stop(t + dur + 0.03)
  }
}
