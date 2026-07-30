// Batch Mixamo importer. Drop your Mixamo "Without Skin" FBX exports into
// scripts/mixamo/incoming/, named after the game's clip SLOT (idle.fbx,
// jab.fbx, heavy.fbx, block.fbx, land.fbx, …), then:
//
//     npm run mixamo:import
//
// Each <slot>.fbx is converted to public/models/_mixamo_glb/<slot>.glb — the
// filename IS the wiring (AnimatedFighter loads clips by slot name). Unknown
// slot names still convert, but we warn so a typo can't silently miss.
import { readdirSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import { dirname, join, basename, extname } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const incoming = join(here, 'incoming')
const outDir = join(here, '..', '..', 'public', 'models', '_mixamo_glb')
const converter = join(here, 'fbx2glb.mjs')

// Slots the fighter currently loads (AnimatedFighter CLIP_URLS) + 'land'
// (Pass 2 addition). Anything else just warns.
const KNOWN = new Set([
  'idle', 'jab', 'heavy', 'throw', 'block', 'hit', 'knockdown', 'getup',
  'dodge', 'victory', 'jump', 'jumpattack', 'falling', 'walk', 'walkback',
  'land',
])

const fbxFiles = readdirSync(incoming).filter((f) => extname(f).toLowerCase() === '.fbx')
if (fbxFiles.length === 0) {
  console.log(`No .fbx files in ${incoming}\nDrop your Mixamo exports there (named idle.fbx, heavy.fbx, …) and re-run.`)
  process.exit(0)
}

let ok = 0
for (const f of fbxFiles) {
  const slot = basename(f, extname(f)).toLowerCase().replace(/\s+/g, '')
  if (!KNOWN.has(slot)) {
    console.warn(`⚠  "${f}" → slot "${slot}" is not a known clip name — converting anyway, but check the spelling.`)
  }
  const inPath = join(incoming, f)
  const outPath = join(outDir, `${slot}.glb`)
  console.log(`▶ ${f}  →  _mixamo_glb/${slot}.glb`)
  const r = spawnSync('node', [converter, inPath, outPath], { stdio: 'inherit' })
  if (r.status === 0) ok++
  else console.error(`✗ failed to convert ${f}`)
}
console.log(`\nDone: ${ok}/${fbxFiles.length} clip(s) imported. Reload the game to see them.`)
