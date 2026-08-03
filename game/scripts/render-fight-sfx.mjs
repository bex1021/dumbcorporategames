// Render the Performance Review fight's impact + vocal SFX to audio files.
//
// The fight originally synthesized these in Web Audio (see fightAudio.ts). No
// amount of layering made a synthesized punch sound like a punch, or a formant
// stack sound like a person — same lesson the radio lines learned with macOS
// `say`. So: ElevenLabs SOUND GENERATION (not TTS — the /v1/sound-generation
// endpoint takes a plain description and returns the effect), then ffmpeg to
// trim, normalise and tighten each one.
//
// Output lands in public/sounds/fight/<id>.mp3, loaded at runtime by
// fightAudio.ts.
//
// VARIANTS: impacts and grunts get TWO takes each. A fight replays these
// constantly and one identical sample per event is the single most obvious
// "this is a game asset" tell — the engine picks between them at random.
//
// PITCH: only two vocal casts are generated (male / female). Per-character
// registers (Leonard 1.0, Brent 0.94, Priya 1.24, Exec 0.82) come from
// playbackRate at runtime, so four characters cost two sets of takes.
//
// Usage:
//   node scripts/render-fight-sfx.mjs            # everything missing
//   node scripts/render-fight-sfx.mjs --force    # re-render all (burns credits)
//   node scripts/render-fight-sfx.mjs punch      # only ids containing "punch"
//
// Requirements: `ffmpeg`, plus ELEVENLABS_API_KEY in game/.env (never committed).

import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const root = join(here, '..')
const OUT_DIR = join(root, 'public', 'sounds', 'fight')

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

// ── the cue list ─────────────────────────────────────────────────────────────
// `dur` is the requested generation length; ffmpeg trims leading silence and
// hard-caps the tail, because a fighting game needs these to land INSTANTLY —
// any pre-roll reads as input lag.
const CUES = [
  // impacts
  { id: 'punch-light-1', dur: 1.0, cap: 0.35, prompt: 'a single sharp punch impact on a human body, close-mic, dry, no music, no reverb' },
  { id: 'punch-light-2', dur: 1.0, cap: 0.35, prompt: 'one quick boxing jab landing on a torso, dry thud with a slap, no music' },
  { id: 'punch-heavy-1', dur: 1.2, cap: 0.5, prompt: 'a heavy powerful punch landing hard on a body, deep thud with impact crack, dry, no music' },
  { id: 'punch-heavy-2', dur: 1.2, cap: 0.5, prompt: 'a brutal heavy body blow, low thump and flesh slap, close-mic, dry, no music' },
  { id: 'whiff-1', dur: 0.9, cap: 0.3, prompt: 'a fast arm swing whooshing through air, missing, short whoosh, dry, no music' },
  { id: 'block-1', dur: 1.0, cap: 0.35, prompt: 'a punch blocked by forearms, dull muffled thud, dry, no music' },
  { id: 'throw-1', dur: 1.2, cap: 0.55, prompt: 'grabbing someone by the shirt, cloth grab and shove, fabric rustle, dry, no music' },
  { id: 'ko-1', dur: 1.6, cap: 0.9, prompt: 'a body falling and hitting the floor hard, heavy collapse thud, dry, no music' },
  // male vocal cast — Leonard, Brent, the Exec (pitched at runtime)
  { id: 'grunt-hurt-m-1', dur: 1.0, cap: 0.45, prompt: 'a man grunting in pain from being punched in the stomach, short involuntary "unh", dry, no music' },
  { id: 'grunt-hurt-m-2', dur: 1.0, cap: 0.45, prompt: 'a man letting out a short winded "oof" after taking a body blow, dry, no music' },
  { id: 'grunt-effort-m-1', dur: 1.0, cap: 0.5, prompt: 'a man exhaling sharply with effort while throwing a heavy punch, short exertion grunt, dry, no music' },
  { id: 'grunt-effort-m-2', dur: 1.0, cap: 0.5, prompt: 'a man grunting with effort as he swings hard, short forceful exhale, dry, no music' },
  // female vocal cast — Priya
  { id: 'grunt-hurt-f-1', dur: 1.0, cap: 0.45, prompt: 'a woman grunting in pain from a body blow, short involuntary "unh", dry, no music' },
  { id: 'grunt-hurt-f-2', dur: 1.0, cap: 0.45, prompt: 'a woman letting out a short winded gasp after being hit, dry, no music' },
  { id: 'grunt-effort-f-1', dur: 1.0, cap: 0.5, prompt: 'a woman exhaling sharply with effort while throwing a hard punch, short exertion grunt, dry, no music' },
  { id: 'grunt-effort-f-2', dur: 1.0, cap: 0.5, prompt: 'a woman grunting with effort as she swings hard, short forceful exhale, dry, no music' },
]

const argv = process.argv.slice(2)
const force = argv.includes('--force')
const filter = argv.find((a) => !a.startsWith('--'))

async function generate(cue, outRaw) {
  const res = await fetch('https://api.elevenlabs.io/v1/sound-generation', {
    method: 'POST',
    headers: { 'xi-api-key': KEY, 'Content-Type': 'application/json', Accept: 'audio/mpeg' },
    body: JSON.stringify({
      text: cue.prompt,
      duration_seconds: cue.dur,
      // High influence: these are literal descriptions, not creative prompts —
      // we want the punch, not an interpretation of one.
      prompt_influence: 0.75,
    }),
  })
  if (!res.ok) {
    const body = await res.text().catch(() => '')
    if (res.status === 401) throw new Error('key rejected (401)')
    if (res.status === 429) throw new Error('out of credits / rate limited (429)')
    throw new Error(`API ${res.status}: ${body.slice(0, 200)}`)
  }
  writeFileSync(outRaw, Buffer.from(await res.arrayBuffer()))
}

/** Trim silence off the front, cap the length, normalise, fade the tail so it
 *  never clicks. The front-trim is the important one — latency here reads as
 *  the game being unresponsive. */
function polish(raw, out, cap) {
  execFileSync(
    'ffmpeg',
    [
      '-y', '-loglevel', 'error',
      '-i', raw,
      '-af',
      [
        'silenceremove=start_periods=1:start_duration=0:start_threshold=-50dB',
        `atrim=0:${cap}`,
        'afade=t=out:st=' + Math.max(0, cap - 0.06) + ':d=0.06',
        'loudnorm=I=-16:TP=-1.5:LRA=11',
      ].join(','),
      '-ac', '1', '-ar', '44100', '-b:a', '128k',
      out,
    ],
    { stdio: ['ignore', 'ignore', 'pipe'] },
  )
}

mkdirSync(OUT_DIR, { recursive: true })
const todo = CUES.filter((c) => (filter ? c.id.includes(filter) : true)).filter(
  (c) => force || !existsSync(join(OUT_DIR, `${c.id}.mp3`)),
)

if (todo.length === 0) {
  console.log('Nothing to render — all cues already exist. Use --force to re-render.')
  process.exit(0)
}
console.log(`Rendering ${todo.length} cue(s) → public/sounds/fight/\n`)

let ok = 0
for (const cue of todo) {
  const raw = join(OUT_DIR, `${cue.id}.raw.mp3`)
  const out = join(OUT_DIR, `${cue.id}.mp3`)
  process.stdout.write(`  ${cue.id.padEnd(20)} `)
  try {
    await generate(cue, raw)
    polish(raw, out, cue.cap)
    rmSync(raw, { force: true })
    ok++
    console.log('ok')
  } catch (err) {
    rmSync(raw, { force: true })
    console.log(`✗ ${err.message}`)
  }
}
console.log(`\n${ok}/${todo.length} rendered.`)
