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
  // the DAMAGE pool — occasional shouts on big hits
  { id: 'damage', text: 'DAMAGE!' },
  { id: 'pushback', text: 'PUSHBACK!' },
  { id: 'noted', text: 'NOTED!' },
  { id: 'escalated', text: 'ESCALATED!' },
  { id: 'synergy', text: 'SYNERGY!' },
  // the FINISH HIM — opponent's bar first drops under 25%
  { id: 'closetheloop', text: 'CLOSE THE LOOP!' },
  // the fatality card — opponent KO'd
  { id: 'aligned', text: 'ALIGNED.' },
]

// THE CHAIN: pitch down ~2 semitones (asetrate trick, atempo restores the
// duration) → arena slapback → bass weight → compression → hard limit.
// The pitch-down is what turns a narrator into a god-voice.
const RATE = 0.89
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

const outDir = join(root, 'public', 'sounds', 'fight', 'announcer')
mkdirSync(outDir, { recursive: true })

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
