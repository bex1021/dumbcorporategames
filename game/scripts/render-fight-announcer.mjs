// Render the Phase 4 fight ANNOUNCER — the Mortal Kombat voice, corporate.
//
// Same ElevenLabs pipeline as render-radio.mjs (neural voice → ffmpeg
// character chain → public/sounds/), different character: where the radio is
// a Bloomberg desk, this is the arena god-voice that shouts "FINISH HIM" —
// except everything it shouts is meeting language. The chain pitches the
// voice DOWN and adds arena slapback, so even a calm read lands like a
// verdict from the ceiling.
//
// Triggers (wired in fighterState → fightAudio):
//   big hit on the opponent  → one of the DAMAGE pool, occasional + cooldown
//   opponent first under 25% → "CLOSE THE LOOP!"  (the FINISH HIM moment)
//   opponent KO'd            → "ALIGNED."         (the fatality card)
//
// Usage:
//   node scripts/render-fight-announcer.mjs             # Clyde (default)
//   node scripts/render-fight-announcer.mjs <voiceId>   # audition another
//
// Requirements: `ffmpeg`, ELEVENLABS_API_KEY in game/.env (never committed).

import { execFileSync } from 'node:child_process'
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const root = join(here, '..')

// Clyde — ElevenLabs' gravelly "war veteran" premade. The radio already owns
// Adam (the exec) and Matilda (the anchor); the announcer must be a THIRD
// person, not the exec moonlighting.
const voiceId = process.argv[2] || '2EiwWnXFnvU5JabPnv8n'

function apiKey() {
  let raw = ''
  try {
    raw = readFileSync(join(root, '.env'), 'utf8')
  } catch {
    console.error('\n✗ No game/.env found. Add:  ELEVENLABS_API_KEY=your-key\n')
    process.exit(1)
  }
  const key = raw.match(/^\s*ELEVENLABS_API_KEY\s*=\s*(.+)\s*$/m)?.[1]?.trim().replace(/^["']|["']$/g, '')
  if (!key || key === 'paste-your-key-here') {
    console.error('\n✗ ELEVENLABS_API_KEY missing or still a placeholder in game/.env\n')
    process.exit(1)
  }
  return key
}
const KEY = apiKey()

// Dramatic reads: lower stability than the radio (let it BOOM), high style.
const VOICE_SETTINGS = { stability: 0.35, similarity_boost: 0.8, style: 0.6, use_speaker_boost: true }

// The lines. Exclamation marks drive ElevenLabs' delivery hard; "ALIGNED."
// keeps the period on purpose — the KO verdict is deadpan, not excited.
const LINES = [
  // the classics — every fighting game since 1992
  { id: 'fight', text: 'FIGHT!' },
  { id: 'finishhim', text: 'FINISH HIM!' },
  { id: 'finishher', text: 'FINISH HER!' },
  { id: 'ko', text: 'K.O.!' },
  // the DAMAGE pool — occasional shouts on big hits. Pure fight language
  // (Rebecca 2026-08-03: the corporate words came out of the shout pool;
  // the joke lives in ALIGNED and the dialogue, not the announcer).
  { id: 'damage', text: 'DAMAGE!' },
  { id: 'brutal', text: 'BRUTAL!' },
  { id: 'savage', text: 'SAVAGE!' },
  { id: 'devastating', text: 'DEVASTATING!' },
  { id: 'crushing', text: 'CRUSHING BLOW!' },
  // moment calls
  { id: 'firsthit', text: 'FIRST HIT!' }, // the bout's first clean connect
  { id: 'countered', text: 'COUNTERED!' }, // your throw got teched
  { id: 'flawless', text: 'FLAWLESS VICTORY.' }, // win at 88%+ health
  // the fatality card — the opponent is convinced. Deadpan on purpose.
  { id: 'aligned', text: 'ALIGNED.' },
]

// THE CHAIN: pitch down ~2 semitones (asetrate trick, atempo restores the
// duration) → arena slapback → bass weight → compression → hard limit.
// The pitch-down is what turns a narrator into a god-voice.
const RATE = 0.86 // was 0.89 — deeper still; the god-voice gets more god
const ANNOUNCER_FILTER =
  `asetrate=44100*${RATE},aresample=44100,atempo=${(1 / RATE).toFixed(6)},` +
  'aecho=0.7:0.72:70|115:0.22|0.13,' +
  'bass=g=5:f=140,' +
  'acompressor=threshold=-16dB:ratio=4:attack=4:release=140:makeup=7dB,' +
  'alimiter=limit=0.92'

async function say(text, out) {
  const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
    method: 'POST',
    headers: { 'xi-api-key': KEY, 'Content-Type': 'application/json', Accept: 'audio/mpeg' },
    body: JSON.stringify({ text, model_id: 'eleven_multilingual_v2', voice_settings: VOICE_SETTINGS }),
  })
  if (!res.ok) {
    const body = await res.text().catch(() => '')
    if (res.status === 401) throw new Error('key rejected (401)')
    if (res.status === 429) throw new Error('out of credits / rate limited (429)')
    throw new Error(`API ${res.status}: ${body.slice(0, 160)}`)
  }
  writeFileSync(out, Buffer.from(await res.arrayBuffer()))
}

// ── AUDITION MODE: --audition renders two signature lines in each deep/
// menacing candidate on this account, into voice-audition/ for A-B listening.
const AUDITION = process.argv.includes('--audition')
const CANDIDATES = [
  { name: 'clyde', id: '2EiwWnXFnvU5JabPnv8n' }, // war-vet gravel (current)
  { name: 'callum', id: 'N2lVS1w4EtoT3dr4eOWO' }, // "Husky Trickster" — villain energy
  { name: 'brian', id: 'nPczCjzI2devNBz1zQrb' }, // "Deep, Resonant"
  { name: 'adam', id: 'pNInz6obpgDQGcFmaJgB' }, // "Dominant, Firm" (the radio exec)
]

const outDir = join(root, 'public', 'sounds', 'fight', AUDITION ? 'voice-audition' : 'announcer')
mkdirSync(outDir, { recursive: true })

if (AUDITION) {
  console.log('Rendering voice audition — FIGHT! + FINISH HIM! per candidate…\n')
  for (const v of CANDIDATES) {
    for (const line of [{ id: 'fight', text: 'FIGHT!' }, { id: 'finishhim', text: 'FINISH HIM!' }]) {
      const out = join(outDir, `${v.name}-${line.id}.mp3`)
      const tmp = join(outDir, `${v.name}-${line.id}.src.mp3`)
      process.stdout.write(`  ${v.name.padEnd(8)} "${line.text}" … `)
      try {
        const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${v.id}`, {
          method: 'POST',
          headers: { 'xi-api-key': KEY, 'Content-Type': 'application/json', Accept: 'audio/mpeg' },
          body: JSON.stringify({ text: line.text, model_id: 'eleven_multilingual_v2', voice_settings: VOICE_SETTINGS }),
        })
        if (!res.ok) throw new Error(`API ${res.status}`)
        writeFileSync(tmp, Buffer.from(await res.arrayBuffer()))
        execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', tmp, '-af', ANNOUNCER_FILTER, '-codec:a', 'libmp3lame', '-qscale:a', '4', out])
        rmSync(tmp, { force: true })
        console.log('✓')
      } catch (err) {
        rmSync(tmp, { force: true })
        console.log(`✗ ${err.message}`)
      }
    }
  }
  console.log(`\n📁 ${outDir}`)
  process.exit(0)
}

console.log(`Rendering ${LINES.length} announcer lines — voice ${voiceId}…\n`)
for (const line of LINES) {
  const out = join(outDir, `${line.id}.mp3`)
  const tmp = join(outDir, `${line.id}.src.mp3`)
  process.stdout.write(`  ${line.id.padEnd(14)} "${line.text}" … `)
  try {
    await say(line.text, tmp)
    execFileSync('ffmpeg', [
      '-y', '-loglevel', 'error', '-i', tmp,
      '-af', ANNOUNCER_FILTER,
      '-codec:a', 'libmp3lame', '-qscale:a', '4', out,
    ])
    rmSync(tmp, { force: true })
    console.log('✓')
  } catch (err) {
    rmSync(tmp, { force: true })
    console.log(`✗ ${err.message}`)
    process.exit(1)
  }
}
console.log(`\n📁 ${outDir}`)
