// Remove BAKED ROOT MOTION from a clip without flattening it.
//
// These four clips came out of Mixamo with "In Place" unticked, so the Hips
// bone translates through the world: walk +0.5m per cycle, the hurricane kick
// +3.3m. The sim already owns world position, so that translation is applied
// TWICE — the character skates, and the kick flies across the arena.
//
// The existing scripts/strip-root-motion.mjs removes the whole Hips translation
// channel, which also throws away the vertical bob and the standing hip height.
// This one pins X and Z to their first-frame value and leaves Y alone, so the
// walk still rises and falls and the pelvis stays at its proper height.
//
//   node scripts/mixamo/strip-horizontal.mjs walk walkback throw
import { NodeIO } from '@gltf-transform/core'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const dir = join(here, '..', '..', 'public', 'models', '_mixamo_glb')
const io = new NodeIO()
const slots = process.argv.slice(2)
if (!slots.length) { console.error('usage: strip-horizontal.mjs <slot> [slot...]'); process.exit(1) }

for (const slot of slots) {
  const path = join(dir, `${slot}.glb`)
  const doc = await io.read(path)
  let touched = 0
  for (const anim of doc.getRoot().listAnimations()) {
    for (const ch of anim.listChannels()) {
      const node = ch.getTargetNode()
      if (ch.getTargetPath() !== 'translation') continue
      if (!/hips?$/i.test(node?.getName() ?? '')) continue
      const acc = ch.getSampler()?.getOutput()
      if (!acc) continue
      const v = acc.getArray().slice()
      const x0 = v[0], z0 = v[2]
      let maxDrift = 0
      for (let i = 0; i < v.length; i += 3) {
        maxDrift = Math.max(maxDrift, Math.hypot(v[i] - x0, v[i + 2] - z0))
        v[i] = x0       // X pinned
        v[i + 2] = z0   // Z pinned
        // v[i+1] (Y) deliberately untouched — that is the bob
      }
      acc.setArray(v)
      touched++
      console.log(`  ${slot}: pinned Hips X/Z on "${anim.getName()}" (was drifting up to ${maxDrift.toFixed(1)}u)`)
    }
  }
  if (!touched) { console.log(`  ${slot}: no Hips translation channel — nothing to do`); continue }
  await io.write(path, doc)
  console.log(`✓ ${slot}.glb rewritten`)
}
