// Jira Run — adaptive "mock-epic" chiptune.
//
// Pure Web Audio (square / triangle / noise channels — the classic 4-channel
// 8-bit palette), zero asset files, loops forever. The joke is heroic 8-bit
// adventure music scoring the act of dragging tickets to Done; it's also the
// native music of "being inside an 8-bit computer," so it fits the world.
//
// It's ADAPTIVE. As Leonard clears each sprint the track tightens — instruments
// layer in and the tempo nudges up — so the score escalates with the gameplay:
//   Sprint 1  bass + sparse arp + half-time kick        (settling in)
//   Sprint 2  + four-on-the-floor kick + hats, full arp (momentum)
//   Sprint 3  + the heroic LEAD melody + snare backbeat  (the theme arrives)
//   Sprint 4  + 16th-note hats + octave sparkle, fastest (racing home)
// Win → a short triumphant cadence. Death → a glitchy power-down crash.
//
// Timing uses the standard Web Audio lookahead scheduler (a coarse setInterval
// that schedules precise note times against ctx.currentTime), so the groove is
// rock-steady regardless of frame rate or React renders. It lives on its OWN
// AudioContext — same pattern as the Jira Run `sfx` blips — so the office HVAC
// drone never bleeds in.

type LevelCfg = {
  bpm: number
  arp: 'eighths' | 'full'
  kick: 'half' | 'four'
  hat: 'none' | '8th' | '16th'
  snare: boolean
  lead: boolean
  sparkle: boolean
}

// Difficulty-matched intensity, indexed by sprint (1..4).
const LEVELS: Record<number, LevelCfg> = {
  1: { bpm: 138, arp: 'eighths', kick: 'half', hat: 'none', snare: false, lead: false, sparkle: false },
  2: { bpm: 146, arp: 'full', kick: 'four', hat: '8th', snare: false, lead: false, sparkle: false },
  3: { bpm: 154, arp: 'full', kick: 'four', hat: '8th', snare: true, lead: true, sparkle: false },
  4: { bpm: 164, arp: 'full', kick: 'four', hat: '16th', snare: true, lead: true, sparkle: true },
}

const midi = (n: number) => 440 * Math.pow(2, (n - 69) / 12)

// Heroic vi–IV–I–V loop in C major (Am · F · C · G) — anthemic and endless.
// One chord per bar; 4 bars = 64 sixteenth-note steps.
const BARS = 4
const STEPS_PER_BAR = 16
const TOTAL_STEPS = BARS * STEPS_PER_BAR
const BASS_ROOT = [45, 41, 48, 43] // A2, F2, C3, G2
// triads one register up, for the arpeggio
const CHORD = [
  [57, 60, 64], // Am  A3 C4 E4
  [53, 57, 60], // F   F3 A3 C4
  [60, 64, 67], // C   C4 E4 G4
  [55, 59, 62], // G   G3 B3 D4
]

// Hand-authored 4-bar lead — a singable, heroic phrase that resolves on the C.
// Keyed by absolute step (0..63) → { note (MIDI), dur in steps }.
const LEAD: Record<number, { n: number; d: number }> = {
  0: { n: 69, d: 8 }, 8: { n: 72, d: 4 }, 12: { n: 71, d: 4 }, // bar1 (Am): A4 — C5 B4
  16: { n: 69, d: 8 }, 24: { n: 67, d: 8 }, // bar2 (F):  A4 — G4
  32: { n: 67, d: 4 }, 36: { n: 69, d: 4 }, 40: { n: 67, d: 4 }, 44: { n: 64, d: 4 }, // bar3 (C): G A G E
  48: { n: 62, d: 8 }, 56: { n: 67, d: 8 }, // bar4 (G):  D4 — G4
}

class JiraMusic {
  private ctx: AudioContext | null = null
  private out: GainNode | null = null // music master (fade / pause / mute live here)
  private noiseBuf: AudioBuffer | null = null
  private timer: number | null = null
  private step = 0
  private nextTime = 0
  private level = 1
  private muted = false
  private playing = false
  private baseVol = 0.5 // master ceiling for the whole mix

  private readonly LOOKAHEAD = 0.1 // schedule this many seconds ahead
  private readonly TICK_MS = 25 // scheduler wake interval

  private ac(): AudioContext | null {
    if (this.ctx) return this.ctx
    try {
      this.ctx = new (window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)()
      this.out = this.ctx.createGain()
      this.out.gain.value = this.muted ? 0 : this.baseVol
      // Limiter on the music bus so the stacked channels (bass+arp+lead+drums at
      // Sprint 4) can't sum past 0dB into harsh clipping.
      const comp = this.ctx.createDynamicsCompressor()
      comp.threshold.value = -10
      comp.knee.value = 6
      comp.ratio.value = 12
      comp.attack.value = 0.003
      comp.release.value = 0.18
      this.out.connect(comp).connect(this.ctx.destination)
      // reusable 1s white-noise buffer for the percussion channel
      const len = Math.floor(this.ctx.sampleRate)
      const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate)
      const d = buf.getChannelData(0)
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1
      this.noiseBuf = buf
    } catch {
      this.ctx = null
    }
    return this.ctx
  }

  /** Begin the loop at a given sprint intensity (1..4). Call from a user gesture. */
  start(level = 1) {
    const ctx = this.ac()
    if (!ctx || !this.out) return
    // Resume now (works if we're in a user gesture); otherwise latch onto the
    // next interaction so audio reliably starts even via the dev ?sprint path.
    if (ctx.state === 'suspended') {
      void ctx.resume()
      const kick = () => { void ctx.resume(); window.removeEventListener('pointerdown', kick); window.removeEventListener('keydown', kick) }
      window.addEventListener('pointerdown', kick)
      window.addEventListener('keydown', kick)
    }
    this.level = Math.max(1, Math.min(4, level))
    if (this.playing) return // already grooving (e.g. retry mid-phase) — just keep level via setLevel
    this.playing = true
    this.out.gain.cancelScheduledValues(ctx.currentTime)
    this.out.gain.setValueAtTime(this.muted ? 0 : this.baseVol, ctx.currentTime)
    this.step = 0
    this.nextTime = ctx.currentTime + 0.06
    this.timer = window.setInterval(() => this.scheduler(), this.TICK_MS)
  }

  /** Escalate (or drop back) to a sprint's intensity — layers + tempo change. */
  setLevel(level: number) {
    this.level = Math.max(1, Math.min(4, level))
  }

  /** Freeze/unfreeze with the pause overlay. */
  setPaused(paused: boolean) {
    const ctx = this.ctx
    if (!ctx || !this.out) return
    if (paused) {
      if (this.timer != null) { clearInterval(this.timer); this.timer = null }
      this.out.gain.linearRampToValueAtTime(0.0001, ctx.currentTime + 0.08)
    } else if (this.playing) {
      this.out.gain.cancelScheduledValues(ctx.currentTime)
      this.out.gain.linearRampToValueAtTime(this.muted ? 0 : this.baseVol, ctx.currentTime + 0.12)
      if (this.timer == null) {
        this.nextTime = ctx.currentTime + 0.06
        this.timer = window.setInterval(() => this.scheduler(), this.TICK_MS)
      }
    }
  }

  setMuted(muted: boolean) {
    this.muted = muted
    const ctx = this.ctx
    if (!ctx || !this.out) return
    this.out.gain.cancelScheduledValues(ctx.currentTime)
    this.out.gain.linearRampToValueAtTime(muted ? 0.0001 : this.baseVol, ctx.currentTime + 0.1)
  }

  /** Stop the loop cold (back to desk / leaving the run). */
  stop() {
    if (this.timer != null) { clearInterval(this.timer); this.timer = null }
    this.playing = false
    const ctx = this.ctx
    if (ctx && this.out) this.out.gain.linearRampToValueAtTime(0.0001, ctx.currentTime + 0.12)
  }

  /** Triumphant resolve as Leonard leaps into the office — then silence so the
   *  win screen's achievement fanfare lands clean. */
  victory() {
    const ctx = this.ac()
    if (!ctx || !this.out) return
    if (this.timer != null) { clearInterval(this.timer); this.timer = null }
    this.playing = false
    const t0 = ctx.currentTime
    this.out.gain.cancelScheduledValues(t0)
    this.out.gain.setValueAtTime(this.muted ? 0 : this.baseVol, t0)
    // quick ascending run C5 D5 E5 G5 → big sustained C6 major chord
    const run = [72, 74, 76, 79]
    run.forEach((n, i) => this.tone(midi(n), t0 + i * 0.09, 0.12, 'square', 0.16))
    const chordT = t0 + run.length * 0.09
    for (const n of [72, 76, 79, 84]) this.tone(midi(n), chordT, 1.1, 'triangle', 0.13)
    for (const n of [48, 55]) this.tone(midi(n), chordT, 1.1, 'square', 0.12) // bass root+fifth
  }

  /** Glitchy power-down / "blue screen" crash on death. */
  death() {
    const ctx = this.ac()
    if (!ctx || !this.out) return
    if (this.timer != null) { clearInterval(this.timer); this.timer = null }
    this.playing = false
    const t0 = ctx.currentTime
    this.out.gain.cancelScheduledValues(t0)
    this.out.gain.setValueAtTime(this.muted ? 0 : this.baseVol, t0)
    // detuned square that bends downward — the classic "power off" sag
    const o = ctx.createOscillator()
    o.type = 'square'
    o.frequency.setValueAtTime(440, t0)
    o.frequency.exponentialRampToValueAtTime(55, t0 + 0.5)
    const g = ctx.createGain()
    g.gain.setValueAtTime(0.0001, t0)
    g.gain.exponentialRampToValueAtTime(0.18, t0 + 0.02)
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.55)
    o.connect(g).connect(this.out)
    o.start(t0); o.stop(t0 + 0.6)
    // a burst of filtered noise underneath — the "static" of the crash
    this.noise(t0, 0.5, 'lowpass', 1400, 0.6, 0.12)
  }

  // ---- the scheduler (lookahead pattern) ----
  private scheduler() {
    const ctx = this.ctx
    if (!ctx) return
    const stepDur = 60 / LEVELS[this.level].bpm / 4 // one 16th note
    while (this.nextTime < ctx.currentTime + this.LOOKAHEAD) {
      this.scheduleStep(this.step, this.nextTime)
      this.nextTime += stepDur
      this.step = (this.step + 1) % TOTAL_STEPS
    }
  }

  private scheduleStep(s: number, t: number) {
    const cfg = LEVELS[this.level]
    const bar = Math.floor(s / STEPS_PER_BAR)
    const sib = s % STEPS_PER_BAR // step-in-bar 0..15
    const root = BASS_ROOT[bar]
    const triad = CHORD[bar]

    // BASS — root/octave bounce on the quarters (drives the run)
    if (sib === 0 || sib === 8) this.tone(midi(root), t, 0.22, 'triangle', 0.16)
    else if (sib === 4 || sib === 12) this.tone(midi(root + 12), t, 0.18, 'triangle', 0.13)

    // ARP — fast cycling triad (root, 3rd, 5th, octave)
    const ext = [triad[0], triad[1], triad[2], triad[0] + 12]
    if (cfg.arp === 'full') {
      this.tone(midi(ext[sib % 4]), t, 0.11, 'square', 0.06)
      if (cfg.sparkle) this.tone(midi(ext[sib % 4] + 12), t, 0.08, 'square', 0.022) // octave-up sparkle (S4)
    } else if (sib % 2 === 0) {
      this.tone(midi(ext[(sib / 2) % 4]), t, 0.12, 'square', 0.05) // sparse 8th-note arp (S1)
    }

    // LEAD — the heroic theme (S3+)
    if (cfg.lead) {
      const ld = LEAD[s]
      if (ld) {
        const stepDur = 60 / cfg.bpm / 4
        this.tone(midi(ld.n), t, ld.d * stepDur * 0.95, 'square', 0.12, 0.012)
      }
    }

    // DRUMS
    const kickHit = cfg.kick === 'four' ? sib % 4 === 0 : sib === 0 || sib === 8
    if (kickHit) this.kick(t)
    if (cfg.snare && (sib === 4 || sib === 12)) this.noise(t, 0.12, 'bandpass', 1800, 1.4, 0.13)
    if (cfg.hat === '16th' || (cfg.hat === '8th' && sib % 2 === 0)) {
      this.noise(t, 0.03, 'highpass', 8000, 0.7, sib % 4 === 0 ? 0.05 : 0.03)
    }
  }

  // ---- voice helpers (all route through the music master `out`) ----
  private tone(freq: number, t: number, dur: number, type: OscillatorType, vol: number, glide = 0) {
    const ctx = this.ctx
    if (!ctx || !this.out) return
    const o = ctx.createOscillator()
    o.type = type
    // optional tiny pitch-scoop into the note for a little "vocal" lead feel
    o.frequency.setValueAtTime(glide ? freq * (1 - glide) : freq, t)
    if (glide) o.frequency.linearRampToValueAtTime(freq, t + 0.02)
    const g = ctx.createGain()
    g.gain.setValueAtTime(0.0001, t)
    g.gain.exponentialRampToValueAtTime(vol, t + 0.008)
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
    o.connect(g).connect(this.out)
    o.start(t)
    o.stop(t + dur + 0.03)
  }

  private kick(t: number) {
    const ctx = this.ctx
    if (!ctx || !this.out) return
    const o = ctx.createOscillator()
    o.type = 'sine'
    o.frequency.setValueAtTime(150, t)
    o.frequency.exponentialRampToValueAtTime(48, t + 0.12)
    const g = ctx.createGain()
    g.gain.setValueAtTime(0.0001, t)
    g.gain.exponentialRampToValueAtTime(0.22, t + 0.005)
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.16)
    o.connect(g).connect(this.out)
    o.start(t)
    o.stop(t + 0.2)
  }

  private noise(t: number, dur: number, filter: BiquadFilterType, freq: number, q: number, vol: number) {
    const ctx = this.ctx
    if (!ctx || !this.out || !this.noiseBuf) return
    const src = ctx.createBufferSource()
    src.buffer = this.noiseBuf
    const f = ctx.createBiquadFilter()
    f.type = filter
    f.frequency.value = freq
    f.Q.value = q
    const g = ctx.createGain()
    g.gain.setValueAtTime(0.0001, t)
    g.gain.exponentialRampToValueAtTime(vol, t + 0.004)
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
    src.connect(f).connect(g).connect(this.out)
    src.start(t)
    src.stop(t + dur + 0.02)
  }

  isMuted() { return this.muted }
}

export const jiraMusic = new JiraMusic()
