// Phase 1 office-music PRESETS — a few distinct "whimsical office lounge" takes
// to audition (see routes/MusicLab.tsx). The live game uses whichever one is
// set as the default in AudioManager; these let Rebecca A/B the options before
// we lock it in. All play through the SAME engine (OfficeMusic), so what you
// hear in the audition is exactly what ships.

export type LeadVoice = 'vibe' | 'marimba' | 'rhodes' | 'musicbox'
export type BassStyle = 'bossa' | 'walk' | 'simple'
export type PercStyle = 'shaker' | 'hat' | 'none'

export type MusicPreset = {
  id: string
  name: string
  desc: string
  bpm: number
  bars: { root: number; comp: number[] }[] // one chord per bar: bass root + comp voicing (MIDI)
  melody: Record<number, number> // 16th-step index (0 .. bars*16-1) → MIDI note
  lead: LeadVoice
  bass: BassStyle
  perc: PercStyle
  baseVol: number
}

export const MUSIC_PRESETS: MusicPreset[] = [
  {
    id: 'lobby-bossa',
    name: 'Lobby Bossa',
    desc: 'Smooth vibraphone lounge over a soft bossa — current hotel-lobby vibe.',
    bpm: 104,
    lead: 'vibe',
    bass: 'bossa',
    perc: 'shaker',
    baseVol: 0.22,
    bars: [
      { root: 36, comp: [64, 67, 71] }, // Cmaj7
      { root: 45, comp: [60, 64, 67] }, // Am7
      { root: 38, comp: [65, 69, 72] }, // Dm7
      { root: 43, comp: [65, 71, 74] }, // G7
    ],
    melody: { 0: 76, 4: 79, 8: 83, 12: 81, 16: 79, 20: 76, 24: 72, 28: 74, 32: 77, 36: 81, 40: 79, 44: 77, 48: 74, 52: 77, 56: 79, 60: 71 },
  },
  {
    id: 'peppy-muzak',
    name: 'Peppy Muzak',
    desc: 'Brighter and bouncier — perky marimba over a walking bass. On-hold-but-weirdly-upbeat.',
    bpm: 124,
    lead: 'marimba',
    bass: 'walk',
    perc: 'hat',
    baseVol: 0.2,
    bars: [
      { root: 36, comp: [64, 67, 72] }, // C
      { root: 45, comp: [60, 64, 69] }, // Am
      { root: 41, comp: [65, 69, 72] }, // F
      { root: 43, comp: [62, 67, 71] }, // G
    ],
    melody: { 0: 72, 4: 79, 6: 76, 8: 84, 12: 79, 16: 81, 20: 76, 24: 72, 28: 69, 32: 77, 36: 81, 40: 84, 44: 81, 48: 79, 52: 83, 56: 86, 60: 79 },
  },
  {
    id: 'smooth-hold',
    name: 'Smooth Hold',
    desc: 'Slow, dreamy easy-listening — mellow Rhodes, sparse melody, no percussion. Pure hold music.',
    bpm: 84,
    lead: 'rhodes',
    bass: 'simple',
    perc: 'none',
    baseVol: 0.24,
    bars: [
      { root: 38, comp: [65, 69, 72] }, // Dm7
      { root: 43, comp: [65, 71, 74] }, // G7
      { root: 36, comp: [64, 67, 71] }, // Cmaj7
      { root: 45, comp: [60, 64, 67] }, // Am7
    ],
    melody: { 0: 74, 8: 77, 16: 74, 24: 71, 32: 72, 40: 76, 48: 72, 56: 69 },
  },
  {
    id: 'toy-box',
    name: 'Toy Box',
    desc: 'Quirky and storybook — a music-box melody with a light tick. Charming and a little childlike.',
    bpm: 108,
    lead: 'musicbox',
    bass: 'simple',
    perc: 'hat',
    baseVol: 0.22,
    bars: [
      { root: 36, comp: [64, 67, 72] }, // C
      { root: 43, comp: [62, 67, 71] }, // G
      { root: 45, comp: [60, 64, 69] }, // Am
      { root: 41, comp: [65, 69, 72] }, // F
    ],
    melody: { 0: 72, 4: 76, 8: 79, 12: 76, 16: 74, 20: 71, 24: 74, 28: 79, 32: 81, 36: 76, 40: 72, 44: 76, 48: 77, 52: 72, 56: 69, 60: 65 },
  },
]

// Phase 1 ships with Peppy Muzak (Rebecca's pick).
export const DEFAULT_PRESET = MUSIC_PRESETS.find((p) => p.id === 'peppy-muzak') ?? MUSIC_PRESETS[0]
