// Fight music — the Alignly motif grown up a console generation.
//
// Same architecture as jirarun/jiraMusic.ts (pure Web Audio, lookahead
// scheduler, own AudioContext so the office HVAC never bleeds in), but the
// 8-bit palette becomes 16-bit: detuned dual-square leads, orchestra-hit
// stabs (the SF2 signature), toms, and a per-BOUT arrangement instead of
// per-sprint.
//
// TWO STYLES ship in this file while Rebecca auditions (music-audition.html):
//   'arcade' — direction D: SNES fight-game energy, Jira Run's exact chord
//              language a generation later (Priya's bout IS the Jira Run
//              progression, faster — the leitmotif continuity is the point).
//   'kombat' — direction A: dark techno-industrial pump, static minor drone,
//              rave stabs, tom fills. The motif re-cast low and menacing.
// Delete the loser after the pick; the engine is style-agnostic.
//
// ADAPTIVE, two ways at once (the ask: "like the jira run track"):
//   1. Per bout — each opponent has its own key, tempo and progression,
//      escalating Brent → Priya → Exec.
//   2. Within the fight — setHeat(0..1) gates layers in at BAR boundaries
//      (never mid-bar: tier pops on the downbeat, like a real fight game).
//      The caller derives heat from the health bars; the music doesn't
//      import the sim, so this module stays trivially testable from a page.
//
// The LEAD is the Alignly motif (A4 C5 B4 G4 — audio/alignlyMotif.ts) in
// every bout; the harmony under it changes per opponent. That's leitmotif
// development: same four notes, friendlier or meaner rooms.

export type MusicStyle = 'arcade' | 'kombat'
export type MusicBout = 'brent' | 'priya' | 'exec'

const midi = (n: number) => 440 * Math.pow(2, (n - 69) / 12)

type BoutCfg = {
  bpm: number
  roots: [number, number, number, number] // bass root per bar (MIDI)
  triads: [number[], number[], number[], number[]] // chord tones per bar
}

// ── ARCADE (D): real progressions, brighter registers ───────────────────────
const ARCADE: Record<MusicBout, BoutCfg> = {
  // Brent, the Wall: A minor plod — i–VI–i–VII. Deliberate, readable, dark
  // Tron room. Slowest of the three.
  brent: { bpm: 118, roots: [45, 41, 45, 43], triads: [[57, 60, 64], [53, 57, 60], [57, 60, 64], [55, 59, 62]] },
  // Priya, the Storm: Jira Run's exact heroic loop (Am F C G) at rushdown
  // tempo — the Phase 2 anthem sprinting. Brightest bout, brightest track.
  priya: { bpm: 150, roots: [45, 41, 48, 43], triads: [[57, 60, 64], [53, 57, 60], [60, 64, 67], [55, 59, 62]] },
  // The Exec, the Exam: minor with a REAL dominant — Am F Dm E. That E major
  // under the motif's G natural is the boss-fight dissonance.
  exec: { bpm: 134, roots: [45, 41, 38, 40], triads: [[57, 60, 64], [53, 57, 60], [62, 65, 69], [64, 68, 71]] },
}

// ── KOMBAT (A): static minor drone, pump over progression ───────────────────
const KOMBAT: Record<MusicBout, BoutCfg> = {
  brent: { bpm: 124, roots: [45, 45, 41, 43], triads: [[57, 60, 64], [57, 60, 64], [53, 57, 60], [55, 59, 62]] },
  priya: { bpm: 138, roots: [45, 45, 41, 43], triads: [[57, 60, 64], [57, 60, 64], [53, 57, 60], [55, 59, 62]] },
  exec: { bpm: 130, roots: [45, 45, 41, 40], triads: [[57, 60, 64], [57, 60, 64], [53, 57, 60], [64, 68, 71]] },
}

const BARS = 4
const STEPS_PER_BAR = 16
const TOTAL_STEPS = BARS * STEPS_PER_BAR

// The Alignly motif as the 4-bar lead (same table as jiraMusic — keep the
// opening four notes in sync with ALIGNLY_MOTIF).
const LEAD: Record<number, { n: number; d: number }> = {
  0: { n: 69, d: 8 }, 8: { n: 72, d: 4 }, 12: { n: 71, d: 4 },
  16: { n: 69, d: 8 }, 24: { n: 67, d: 8 },
  32: { n: 67, d: 4 }, 36: { n: 69, d: 4 }, 40: { n: 67, d: 4 }, 44: { n: 64, d: 4 },
  48: { n: 62, d: 8 }, 56: { n: 67, d: 8 },
}

// Heat → tier, latched at bar boundaries only.
const tierFor = (heat: number) => (heat < 0.35 ? 0 : heat < 0.7 ? 1 : heat < 0.88 ? 2 : 3)

class FightMusic {
  private ctx: AudioContext | null = null
  private out: GainNode | null = null
  private noiseBuf: AudioBuffer | null = null
  private timer: number | null = null
  private step = 0
  private nextTime = 0
  private style: MusicStyle = 'arcade'
  private bout: MusicBout = 'brent'
  private heat = 0
  private tier = 0 // the LATCHED tier (updates on bar 0 of the loop step)
  private muted = false
  private playing = false
  // Music sits UNDER the fight SFX: impacts are the events, this is the floor.
  private baseVol = 0.34

  private readonly LOOKAHEAD = 0.1
  private readonly TICK_MS = 25

  private ac(): AudioContext | null {
    if (this.ctx) return this.ctx
    try {
      this.ctx = new (window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)()
      this.out = this.ctx.createGain()
      this.out.gain.value = this.muted ? 0 : this.baseVol
      const comp = this.ctx.createDynamicsCompressor()
      comp.threshold.value = -10
      comp.knee.value = 6
      comp.ratio.value = 12
      comp.attack.value = 0.003
      comp.release.value = 0.18
      this.out.connect(comp).connect(this.ctx.destination)
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

  private cfg(): BoutCfg {
    return (this.style === 'arcade' ? ARCADE : KOMBAT)[this.bout]
  }

  /** Start (or restyle) the loop. Call from a user gesture. */
  start(bout: MusicBout, style: MusicStyle = this.style, heat = 0) {
    const ctx = this.ac()
    if (!ctx || !this.out) return
    if (ctx.state === 'suspended') {
      void ctx.resume()
      const kick = () => { void ctx.resume(); window.removeEventListener('pointerdown', kick); window.removeEventListener('keydown', kick) }
      window.addEventListener('pointerdown', kick)
      window.addEventListener('keydown', kick)
    }
    this.bout = bout
    this.style = style
    this.heat = heat
    this.tier = tierFor(heat)
    if (this.playing) return
    this.playing = true
    this.out.gain.cancelScheduledValues(ctx.currentTime)
    this.out.gain.setValueAtTime(this.muted ? 0 : this.baseVol, ctx.currentTime)
    this.step = 0
    this.nextTime = ctx.currentTime + 0.06
    this.timer = window.setInterval(() => this.scheduler(), this.TICK_MS)
  }

  /** 0..1 — how hot the fight is. Layers change only at the next bar. */
  setHeat(heat: number) {
    this.heat = Math.max(0, Math.min(1, heat))
  }

  setMuted(muted: boolean) {
    this.muted = muted
    const ctx = this.ctx
    if (!ctx || !this.out) return
    this.out.gain.cancelScheduledValues(ctx.currentTime)
    this.out.gain.linearRampToValueAtTime(muted ? 0.0001 : this.baseVol, ctx.currentTime + 0.1)
  }

  stop() {
    if (this.timer != null) { clearInterval(this.timer); this.timer = null }
    this.playing = false
    const ctx = this.ctx
    if (ctx && this.out) this.out.gain.linearRampToValueAtTime(0.0001, ctx.currentTime + 0.14)
  }

  /** Bout won — quick 16-bit fanfare, then silence for the result card. */
  victory() {
    const ctx = this.ac()
    if (!ctx || !this.out) return
    if (this.timer != null) { clearInterval(this.timer); this.timer = null }
    this.playing = false
    const t0 = ctx.currentTime
    this.out.gain.cancelScheduledValues(t0)
    this.out.gain.setValueAtTime(this.muted ? 0 : this.baseVol, t0)
    const run = [69, 72, 71, 76] // the motif's shape, sprinting upward
    run.forEach((n, i) => this.duo(midi(n), t0 + i * 0.08, 0.11, 0.14))
    const chordT = t0 + run.length * 0.08
    for (const n of [69, 72, 76, 81]) this.tone(midi(n), chordT, 1.0, 'triangle', 0.12)
    for (const n of [45, 52]) this.tone(midi(n), chordT, 1.0, 'square', 0.11)
    this.orchHit(chordT, [57, 60, 64, 69], 0.16)
  }

  /** Bout lost — the motif sags a half-step and dies. */
  defeat() {
    const ctx = this.ac()
    if (!ctx || !this.out) return
    if (this.timer != null) { clearInterval(this.timer); this.timer = null }
    this.playing = false
    const t0 = ctx.currentTime
    this.out.gain.cancelScheduledValues(t0)
    this.out.gain.setValueAtTime(this.muted ? 0 : this.baseVol, t0)
    const sag = [69, 68, 64, 61] // A G# E C# — the motif deflating
    sag.forEach((n, i) => this.tone(midi(n - 12), t0 + i * 0.16, 0.22, 'square', 0.13, 0.03))
    this.noise(t0 + 0.5, 0.5, 'lowpass', 900, 0.8, 0.1)
  }

  // ---- scheduler ----
  private scheduler() {
    const ctx = this.ctx
    if (!ctx) return
    // tier 3 pushes tempo (+6) in arcade; kombat keeps the grid relentless
    const bpm = this.cfg().bpm + (this.style === 'arcade' && this.tier === 3 ? 6 : 0)
    const stepDur = 60 / bpm / 4
    while (this.nextTime < ctx.currentTime + this.LOOKAHEAD) {
      if (this.step % STEPS_PER_BAR === 0) this.tier = tierFor(this.heat) // bar-latch
      this.scheduleStep(this.step, this.nextTime, stepDur)
      this.nextTime += stepDur
      this.step = (this.step + 1) % TOTAL_STEPS
    }
  }

  private scheduleStep(s: number, t: number, stepDur: number) {
    if (this.style === 'arcade') this.arcadeStep(s, t, stepDur)
    else this.kombatStep(s, t, stepDur)
  }

  // ── ARCADE: Jira Run's bones, 16-bit muscle ──────────────────────────────
  private arcadeStep(s: number, t: number, stepDur: number) {
    const { roots, triads } = this.cfg()
    const bar = Math.floor(s / STEPS_PER_BAR)
    const sib = s % STEPS_PER_BAR
    const root = roots[bar]
    const triad = triads[bar]
    const tier = this.tier

    // BASS — octave bounce; doubles up (8ths) from tier 1
    if (sib % 8 === 0) this.tone(midi(root), t, 0.22, 'triangle', 0.17)
    else if (sib % 8 === 4) this.tone(midi(root + 12), t, 0.18, 'triangle', 0.14)
    else if (tier >= 1 && sib % 2 === 0) this.tone(midi(root), t, 0.1, 'square', 0.05)

    // ARP — sparse 8ths at tier 0, full 16ths after; octave sparkle at 3
    const ext = [triad[0], triad[1], triad[2], triad[0] + 12]
    if (tier >= 1) {
      this.tone(midi(ext[sib % 4]), t, 0.11, 'square', 0.055)
      if (tier >= 3) this.tone(midi(ext[sib % 4] + 12), t, 0.08, 'square', 0.02)
    } else if (sib % 2 === 0) {
      this.tone(midi(ext[(sib / 2) % 4]), t, 0.12, 'square', 0.05)
    }

    // LEAD — the Alignly motif, detuned dual-square (the 16-bit upgrade)
    if (tier >= 2) {
      const ld = LEAD[s]
      if (ld) this.duo(midi(ld.n), t, ld.d * stepDur * 0.95, 0.12)
    }

    // ORCHESTRA HIT — the SF2 signature, downbeat of bars 1 and 3, match point only
    if (tier >= 3 && sib === 0 && (bar === 0 || bar === 2)) {
      this.orchHit(t, [triad[0] - 12, ...triad, triad[0] + 12], 0.13)
    }

    // DRUMS — half-time kick grows to four-on-the-floor at tier 2
    const kickHit = tier >= 2 ? sib % 4 === 0 : sib === 0 || sib === 8
    if (kickHit) this.kick(t)
    if (tier >= 1 && (sib === 4 || sib === 12)) this.noise(t, 0.12, 'bandpass', 1800, 1.4, 0.13)
    if (tier >= 3 || (tier >= 1 && sib % 2 === 0)) {
      this.noise(t, 0.03, 'highpass', 8000, 0.7, sib % 4 === 0 ? 0.05 : 0.03)
    }
  }

  // ── KOMBAT: the pump — relentless 16th bass, stabs, toms ─────────────────
  private kombatStep(s: number, t: number, stepDur: number) {
    const { roots, triads } = this.cfg()
    const bar = Math.floor(s / STEPS_PER_BAR)
    const sib = s % STEPS_PER_BAR
    const root = roots[bar]
    const triad = triads[bar]
    const tier = this.tier

    // BASS PUMP — every 16th, accented on the classic techno grid (0, 6, 10)
    const accent = sib === 0 || sib === 6 || sib === 10
    this.tone(midi(root - 12), t, 0.09, 'square', accent ? 0.14 : 0.07)

    // RAVE STAB — saw chord on the off-beats from tier 1
    if (tier >= 1 && (sib === 3 || sib === 11)) this.stab(t, triad, 0.14, 0.07)
    if (tier >= 3 && (sib === 7 || sib === 15)) this.stab(t, triad.map((n) => n + 12), 0.1, 0.045)

    // LEAD — the motif an octave DOWN, gliding: same logo, bared teeth
    if (tier >= 2) {
      const ld = LEAD[s]
      if (ld) this.duo(midi(ld.n - 12), t, ld.d * stepDur * 0.9, 0.13, 0.05)
    }

    // ORCH HIT — every bar downbeat at match point (MK's slam)
    if (tier >= 3 && sib === 0) this.orchHit(t, [triad[0] - 12, ...triad], 0.14)

    // DRUMS — four-on-the-floor ALWAYS (the genre's law); snare from tier 1;
    // tom fill down the last half of bar 4 from tier 2
    if (sib % 4 === 0) this.kick(t)
    if (tier >= 1 && (sib === 4 || sib === 12)) this.noise(t, 0.16, 'bandpass', 1500, 1.1, 0.14)
    if (tier >= 2 && bar === 3 && sib >= 12) this.tom(t, 200 - (sib - 12) * 28)
    if (tier >= 1 && sib % 2 === 1) this.noise(t, 0.03, 'highpass', 9000, 0.7, 0.028)
    if (tier >= 3 && sib % 2 === 0) this.noise(t, 0.05, 'highpass', 7000, 0.7, 0.04)
  }

  // ---- voices ----
  private tone(freq: number, t: number, dur: number, type: OscillatorType, vol: number, glide = 0) {
    const ctx = this.ctx
    if (!ctx || !this.out) return
    const o = ctx.createOscillator()
    o.type = type
    o.frequency.setValueAtTime(glide ? freq * (1 - glide) : freq, t)
    if (glide) o.frequency.linearRampToValueAtTime(freq, t + 0.03)
    const g = ctx.createGain()
    g.gain.setValueAtTime(0.0001, t)
    g.gain.exponentialRampToValueAtTime(vol, t + 0.008)
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
    o.connect(g).connect(this.out)
    o.start(t)
    o.stop(t + dur + 0.03)
  }

  /** Detuned dual-square — the "16-bit" lead voice (chorus width, no FX). */
  private duo(freq: number, t: number, dur: number, vol: number, glide = 0.012) {
    this.tone(freq * 1.004, t, dur, 'square', vol * 0.6, glide)
    this.tone(freq * 0.996, t, dur, 'square', vol * 0.6, glide)
  }

  /** Saw-stack stab (the rave chord). */
  private stab(t: number, notes: number[], dur: number, vol: number) {
    for (const n of notes) this.tone(midi(n), t, dur, 'sawtooth', vol)
  }

  /** The orchestra hit: saw stack + snare-noise burst, gone in 150ms. */
  private orchHit(t: number, notes: number[], vol: number) {
    for (const n of notes) this.tone(midi(n), t, 0.15, 'sawtooth', vol * 0.55)
    this.noise(t, 0.12, 'bandpass', 900, 0.8, vol * 0.9)
  }

  private kick(t: number) {
    const ctx = this.ctx
    if (!ctx || !this.out) return
    const o = ctx.createOscillator()
    o.type = 'sine'
    o.frequency.setValueAtTime(150, t)
    o.frequency.exponentialRampToValueAtTime(46, t + 0.12)
    const g = ctx.createGain()
    g.gain.setValueAtTime(0.0001, t)
    g.gain.exponentialRampToValueAtTime(0.24, t + 0.005)
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.17)
    o.connect(g).connect(this.out)
    o.start(t)
    o.stop(t + 0.2)
  }

  private tom(t: number, f0: number) {
    const ctx = this.ctx
    if (!ctx || !this.out) return
    const o = ctx.createOscillator()
    o.type = 'sine'
    o.frequency.setValueAtTime(f0, t)
    o.frequency.exponentialRampToValueAtTime(f0 * 0.55, t + 0.14)
    const g = ctx.createGain()
    g.gain.setValueAtTime(0.0001, t)
    g.gain.exponentialRampToValueAtTime(0.16, t + 0.005)
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.18)
    o.connect(g).connect(this.out)
    o.start(t)
    o.stop(t + 0.22)
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

  isPlaying() { return this.playing }
}

export const fightMusic = new FightMusic()
