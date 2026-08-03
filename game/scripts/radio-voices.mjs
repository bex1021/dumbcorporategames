// KPI 101.1 — voice picker for the car radio.
//
// The radio anchor used to be macOS `say` (a screen-reader voice) behind an
// AM-radio filter; no filter rescues a robot underneath. This talks to
// ElevenLabs so we can pick a real broadcast voice BEFORE re-rendering all 24
// lines.
//
//   node scripts/radio-voices.mjs              # list voices, best candidates first
//   node scripts/radio-voices.mjs audition     # render samples through the RADIO filter
//   node scripts/radio-voices.mjs audition raw # …and also un-filtered, for comparison
//
// Auditions go to public/sounds/radio/_auditions/ (gitignored-by-name, safe to
// delete). They are rendered through the SAME ffmpeg chain as the real lines,
// so what you hear is what the game will sound like — not a studio preview.
//
// The API key is read from game/.env and is never printed.

import { execFileSync } from 'node:child_process'
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const root = join(here, '..')

// ── key (from .env, never logged) ────────────────────────────────────────────
function apiKey() {
  let raw = ''
  try {
    raw = readFileSync(join(root, '.env'), 'utf8')
  } catch {
    die('No game/.env found. Create it with:  ELEVENLABS_API_KEY=your-key')
  }
  const m = raw.match(/^\s*ELEVENLABS_API_KEY\s*=\s*(.+)\s*$/m)
  const key = m?.[1]?.trim().replace(/^["']|["']$/g, '')
  if (!key) die('ELEVENLABS_API_KEY missing from game/.env')
  if (key === 'paste-your-key-here') die('game/.env still has the placeholder — paste your real key in.')
  return key
}

function die(msg) {
  console.error(`\n✗ ${msg}\n`)
  process.exit(1)
}

async function api(path, key, init = {}) {
  const res = await fetch(`https://api.elevenlabs.io/v1${path}`, {
    ...init,
    headers: { 'xi-api-key': key, ...(init.headers ?? {}) },
  })
  if (!res.ok) {
    const body = await res.text().catch(() => '')
    if (res.status === 401) die('Key rejected (401). Check the key in game/.env.')
    // 403 on a restricted key = that endpoint wasn't granted when the key was made.
    if (res.status === 403)
      die(
        `Forbidden (403) on ${path}. If you restricted the key, make sure ` +
          `"Voices → Read" and "Text to Speech → Access" are enabled.\n  ${body.slice(0, 200)}`,
      )
    die(`API ${res.status} on ${path}: ${body.slice(0, 300)}`)
  }
  return res
}

// ── scoring: who sounds like a Bloomberg / CNBC markets anchor? ──────────────
// AMERICAN, authoritative and direct — a financial-news desk read, not a warm
// audiobook narrator and not a chirpy commercial voice. Score on the label
// metadata so the shortlist is reproducible rather than my personal guess.
function scoreAnchor(v) {
  const L = v.labels ?? {}
  const hay = `${v.name} ${L.accent ?? ''} ${L.description ?? ''} ${L.use_case ?? ''} ${L.age ?? ''} ${L.gender ?? ''} ${v.category ?? ''}`.toLowerCase()
  let s = 0
  if (/american|us english|\bus\b|transatlantic/.test(hay)) s += 40
  if (/british|australian|irish|scottish|indian/.test(hay)) s -= 25
  if (/news|broadcast|announc|report|informative|journalis/.test(hay)) s += 30
  // AUTHORITATIVE + DIRECT is the actual brief ("Bloomberg voice"), so weight
  // the words that mean command — not just "professional", which is generic
  // enough that it floated warm/bright voices above genuinely firm ones.
  if (/dominant|firm|assertive|commanding|authoritative|direct|strong|bold/.test(hay)) s += 30
  if (/deep|resonant|serious|confident|crisp|clear/.test(hay)) s += 18
  if (/professional|knowledg/.test(hay)) s += 8
  if (/middle|mature/.test(hay)) s += 12
  if (/narrat/.test(hay)) s += 6 // useful, but we want desk-read over storytelling
  if (/young|child|energetic|excited|cheerful|whisper|sexy|seductive|soothing|calm|warm|bright/.test(hay)) s -= 15
  if (/casual|conversational|laid.?back|relaxed/.test(hay)) s -= 12 // an anchor is not chatting
  if (/trickster|character|villain|quirky|animat/.test(hay)) s -= 25 // not a news desk
  return s
}

// The exec soundbite must sound like a DIFFERENT person to the anchor: older,
// heavier, more self-assured — a CEO on an earnings call.
function scoreExec(v) {
  const L = v.labels ?? {}
  const hay = `${v.name} ${L.accent ?? ''} ${L.description ?? ''} ${L.use_case ?? ''} ${L.age ?? ''} ${L.gender ?? ''}`.toLowerCase()
  let s = 0
  if (/deep|authoritative|confident|serious|mature|old|gravel|husky/.test(hay)) s += 30
  if (/american/.test(hay)) s += 12
  if (/narrat|announc|corporate|business/.test(hay)) s += 12
  if (/young|cheerful|excited|whisper/.test(hay)) s -= 20
  return s
}

const fmt = (v, s) => {
  const L = v.labels ?? {}
  const bits = [L.accent, L.gender, L.age, L.description].filter(Boolean).join(' · ')
  return `  ${String(s).padStart(3)}  ${v.name.padEnd(16)} ${v.voice_id}  ${bits}`
}

// ── audition ─────────────────────────────────────────────────────────────────
// Same AM-radio chain as scripts/render-radio.mjs, so the audition is honest.
const ANCHOR_FILTER =
  'highpass=f=380,lowpass=f=3000,' +
  'acompressor=threshold=-20dB:ratio=5:attack=5:release=90,' +
  'volume=4dB'
const LIMIT = 'alimiter=limit=0.95'

// A real line from the script — the tone test that matters.
const SAMPLE =
  'On Wall Street, stocks closed higher on news of mass layoffs across the tech sector. ' +
  'Investors called the cuts encouraging. The market, as always, loves nothing more than fewer of you.'

async function tts(key, voiceId, text, outMp3) {
  const res = await api(`/text-to-speech/${voiceId}`, key, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'audio/mpeg' },
    body: JSON.stringify({
      text,
      model_id: 'eleven_multilingual_v2',
      voice_settings: { stability: 0.5, similarity_boost: 0.75, style: 0.3, use_speaker_boost: true },
    }),
  })
  writeFileSync(outMp3, Buffer.from(await res.arrayBuffer()))
}

function radioFilter(inFile, outFile) {
  execFileSync('ffmpeg', [
    '-y', '-loglevel', 'error', '-i', inFile,
    '-af', `${ANCHOR_FILTER},${LIMIT}`,
    '-codec:a', 'libmp3lame', '-qscale:a', '5', outFile,
  ])
}

// ── main ─────────────────────────────────────────────────────────────────────
const mode = process.argv[2] ?? 'list'
const keepRaw = process.argv[3] === 'raw'
const key = apiKey()

const res = await api('/voices', key)
const { voices } = await res.json()
console.log(`\nFound ${voices.length} voices on this account.\n`)

const anchors = voices.map((v) => ({ v, s: scoreAnchor(v) })).sort((a, b) => b.s - a.s)
const execs = voices.map((v) => ({ v, s: scoreExec(v) })).sort((a, b) => b.s - a.s)

if (mode === 'list') {
  console.log('── BEST ANCHOR CANDIDATES (American markets anchor · Bloomberg-style) ──')
  anchors.slice(0, 8).forEach(({ v, s }) => console.log(fmt(v, s)))
  console.log('\n── BEST EXEC-SOUNDBITE CANDIDATES (the CEO on the earnings call) ──')
  execs.slice(0, 6).forEach(({ v, s }) => console.log(fmt(v, s)))
  console.log('\nNext:  node scripts/radio-voices.mjs audition')
  console.log('       → renders each top anchor saying a real KPI line, through the radio filter.\n')
  process.exit(0)
}

if (mode !== 'audition') die(`Unknown mode "${mode}". Use: list | audition`)

const outDir = join(root, 'public/sounds/radio/_auditions')
mkdirSync(outDir, { recursive: true })
const picks = anchors.slice(0, 5)
console.log(`Rendering ${picks.length} auditions (real KPI line, through the radio filter)…\n`)

for (const { v, s } of picks) {
  const safe = v.name.replace(/[^a-z0-9]+/gi, '-').toLowerCase()
  const rawFile = join(outDir, `${safe}.raw.mp3`)
  const outFile = join(outDir, `${safe}.mp3`)
  try {
    await tts(key, v.voice_id, SAMPLE, rawFile)
    radioFilter(rawFile, outFile)
    if (!keepRaw) rmSync(rawFile, { force: true })
    console.log(`  ✓ ${v.name.padEnd(16)} score ${String(s).padStart(3)}  →  _auditions/${safe}.mp3   [${v.voice_id}]`)
  } catch (err) {
    console.error(`  ✗ ${v.name}: ${err.message}`)
  }
}

console.log(`\nListen:  open ${outDir}`)
console.log('Then tell me which name you want as the anchor.\n')
