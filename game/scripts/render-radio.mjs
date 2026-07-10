// Render the Lunch Dash car-radio lines to audio files.
//
// Reads the canonical script (src/lunchdash/radioLines.json), speaks each line
// with a macOS voice (`say`), then runs it through an AM-radio filter chain
// (`ffmpeg`) — band-limited + compressed + a touch of drive — so it sounds like
// a real broadcast feed rather than a screen reader. Output lands in
// public/sounds/radio/<id>.mp3, which the game loads at runtime.
//
// Two-voice items: a line with an `exec` field is rendered as ANCHOR (voice 1)
// then a CEO/founder SOUNDBITE (voice 2), spliced into one file with a short
// gap. The soundbite gets a narrower "conference-call" filter for contrast.
//
// Usage:
//   node scripts/render-radio.mjs                       # Daniel + Samantha (defaults)
//   node scripts/render-radio.mjs "Daniel" "Samantha"   # anchor + exec voices
//   node scripts/render-radio.mjs "Ava (Premium)" "Tom (Enhanced)"
//
// Requirements (all already on this Mac): `say`, `ffmpeg`.
// List installed voices with:  say -v '?'

import { execFileSync } from 'node:child_process'
import { mkdirSync, readFileSync, rmSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const root = join(here, '..')

const anchorVoice = process.argv[2] || 'Daniel'
const execVoice = process.argv[3] || 'Samantha'

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

function say(voice, text, out) {
  execFileSync('say', ['-v', voice, '-o', out, text])
}

function renderSingle(text, out) {
  const tmp = out.replace(/\.mp3$/, '.aiff')
  say(anchorVoice, text, tmp)
  execFileSync('ffmpeg', [
    '-y', '-loglevel', 'error', '-i', tmp,
    '-af', `${ANCHOR_FILTER},${LIMIT}`,
    '-codec:a', 'libmp3lame', '-qscale:a', '5', out,
  ])
  rmSync(tmp, { force: true })
}

function renderTwoVoice(text, exec, out) {
  const a = out.replace(/\.mp3$/, '.anchor.aiff')
  const e = out.replace(/\.mp3$/, '.exec.aiff')
  say(anchorVoice, text, a)
  say(execVoice, exec, e)
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

console.log(`Rendering ${script.lines.length} lines — anchor "${anchorVoice}", exec "${execVoice}"…\n`)

let ok = 0
for (const line of script.lines) {
  const out = join(outDir, `${line.id}.mp3`)
  try {
    if (line.exec) renderTwoVoice(line.text, line.exec, out)
    else renderSingle(line.text, out)
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
    renderSingle(song.intro, out)
    sok++
    console.log(`  ✓ ${(song.id + '-intro').padEnd(26)} song intro`)
  } catch (err) {
    console.error(`  ✗ ${song.id}-intro: ${err.message}`)
  }
}

console.log(`\nDone. ${ok}/${script.lines.length} lines, ${sok} song intros in public/sounds/radio/`)
if (ok < script.lines.length) {
  console.error("Some lines failed — check voice names with:  say -v '?'")
  process.exit(1)
}
