// Render the Lunch Dash car-radio lines to audio files.
//
// Reads the canonical script (src/lunchdash/radioLines.json), speaks each line
// with a NEURAL TTS voice (ElevenLabs), then runs it through an AM-radio filter
// chain (`ffmpeg`) — band-limited + compressed + a touch of drive — so it sounds
// like a real broadcast feed. Output lands in public/sounds/radio/<id>.mp3,
// which the game loads at runtime.
//
// VOICE (2026-07): this used to call macOS `say` with the "Daniel"/"Samantha"
// screen-reader voices. No amount of radio filtering rescues a robot underneath
// — it read as a text-to-speech demo, not a station. Now: ElevenLabs, styled as
// a US financial-news desk (think Bloomberg — authoritative and direct).
//   ANCHOR  Matilda — knowledgable, professional  (the KPI 101.1 host)
//   EXEC    Adam    — dominant, firm              (the CEO soundbites)
// Pick others with:  node scripts/radio-voices.mjs
//
// Two-voice items: a line with an `exec` field is rendered as ANCHOR (voice 1)
// then a CEO/founder SOUNDBITE (voice 2), spliced into one file with a short
// gap. The soundbite gets a narrower "conference-call" filter for contrast.
//
// Usage:
//   node scripts/render-radio.mjs                        # Matilda + Adam (defaults)
//   node scripts/render-radio.mjs <anchorId> <execId>    # any two ElevenLabs voice IDs
//
// Requirements: `ffmpeg`, plus ELEVENLABS_API_KEY in game/.env (never committed).

import { execFileSync } from 'node:child_process'
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const root = join(here, '..')

// Default cast — chosen by audition (scripts/radio-voices.mjs audition).
const args = process.argv.slice(2).filter((a) => !a.startsWith('--'))
const anchorVoice = args[0] || 'XrExE9yKIg1WjnnlVkGX' // Matilda
const execVoice = args[1] || 'pNInz6obpgDQGcFmaJgB' // Adam
// `--intros` re-renders ONLY the song intros. Adding or renaming a track means the
// DJ needs a new tee-up, but the 24 talk lines are unchanged — re-rendering those
// would burn ~5k TTS credits for nothing.
const introsOnly = process.argv.includes('--intros')

// ── API key: read from game/.env, never logged ───────────────────────────────
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

// Delivery settings. Lower stability = more expressive; for a news desk we want
// it steady and consistent across 27 files, so stability sits high-ish and the
// style push stays modest — an anchor reads, they don't perform.
const VOICE_SETTINGS = { stability: 0.55, similarity_boost: 0.8, style: 0.25, use_speaker_boost: true }

const script = JSON.parse(readFileSync(join(root, 'src/lunchdash/radioLines.json'), 'utf8'))
const outDir = join(root, 'public/sounds/radio')
mkdirSync(outDir, { recursive: true })

// The anchor "radio" sound: telephone/AM band (~380 Hz – 3 kHz), a broadcast
// compressor, make-up gain + a limiter so nothing clips.
const ANCHOR_FILTER =
  'highpass=f=380,lowpass=f=3000,' +
  'acompressor=threshold=-20dB:ratio=5:attack=5:release=90,' +
  'volume=4dB'
// The exec soundbite: narrower + more squashed, like a clip pulled off a
// conference call.
const EXEC_FILTER =
  'highpass=f=520,lowpass=f=2600,' +
  'acompressor=threshold=-18dB:ratio=6:attack=3:release=80,' +
  'volume=5dB'
const LIMIT = 'alimiter=limit=0.95'

// Speak `text` in `voiceId` and write the raw audio to `out`.
// (Was: execFileSync('say', ...). Everything downstream is unchanged — the
// neural audio lands in the same temp file the ffmpeg step already reads.)
async function say(voiceId, text, out) {
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

async function renderSingle(text, out) {
  const tmp = out.replace(/\.mp3$/, '.src.mp3')
  await say(anchorVoice, text, tmp)
  execFileSync('ffmpeg', [
    '-y', '-loglevel', 'error', '-i', tmp,
    '-af', `${ANCHOR_FILTER},${LIMIT}`,
    '-codec:a', 'libmp3lame', '-qscale:a', '5', out,
  ])
  rmSync(tmp, { force: true })
}

async function renderTwoVoice(text, exec, out) {
  const a = out.replace(/\.mp3$/, '.anchor.src.mp3')
  const e = out.replace(/\.mp3$/, '.exec.src.mp3')
  await say(anchorVoice, text, a)
  await say(execVoice, exec, e)
  // anchor (radio filter) + 0.35s gap, then exec (conference-call filter), concat
  execFileSync('ffmpeg', [
    '-y', '-loglevel', 'error', '-i', a, '-i', e,
    '-filter_complex',
    `[0:a]${ANCHOR_FILTER},apad=pad_dur=0.35[a];` +
      `[1:a]${EXEC_FILTER}[x];` +
      `[a][x]concat=n=2:v=0:a=1,${LIMIT}[out]`,
    '-map', '[out]',
    '-codec:a', 'libmp3lame', '-qscale:a', '5', out,
  ])
  rmSync(a, { force: true })
  rmSync(e, { force: true })
}

console.log(`Rendering ${introsOnly ? 'song intros only' : script.lines.length + ' lines'} — anchor ${anchorVoice}, exec ${execVoice}…\n`)

let ok = 0
for (const line of introsOnly ? [] : script.lines) {
  const out = join(outDir, `${line.id}.mp3`)
  try {
    if (line.exec) await renderTwoVoice(line.text, line.exec, out)
    else await renderSingle(line.text, out)
    ok++
    console.log(`  ✓ ${line.id.padEnd(26)} ${line.segment}${line.exec ? '  (anchor + exec)' : ''}`)
  } catch (err) {
    console.error(`  ✗ ${line.id}: ${err.message}`)
  }
}

// Song intros — the DJ teeing up each "top hit". Rendered in the anchor voice
// with the radio filter, saved next to the song as music/<id>-intro.mp3, and
// played over the bed just before the track starts.
const songs = script.songs || []
const musicDir = join(outDir, 'music')
mkdirSync(musicDir, { recursive: true })
let sok = 0
for (const song of songs) {
  if (!song.intro) continue
  const out = join(musicDir, `${song.id}-intro.mp3`)
  try {
    await renderSingle(song.intro, out)
    sok++
    console.log(`  ✓ ${(song.id + '-intro').padEnd(26)} song intro`)
  } catch (err) {
    console.error(`  ✗ ${song.id}-intro: ${err.message}`)
  }
}

const expected = introsOnly ? 0 : script.lines.length
console.log(`\nDone. ${ok}/${expected} lines, ${sok} song intros in public/sounds/radio/`)
if (ok < expected) {
  console.error('Some lines failed — list voices with:  node scripts/radio-voices.mjs')
  process.exit(1)
}
