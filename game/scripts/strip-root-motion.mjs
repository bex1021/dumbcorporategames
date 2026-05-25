// Strip root-motion translation channels from Mixamo Walking GLBs.
//
// Mixamo's "Walking" animation has the Hips bone translating forward over the
// cycle, which makes the character "walk forward, snap back" loop when the
// game drives world position separately. We remove the translation channel
// targeting the Hips bone so the animation plays in-place.
//
// Run: node scripts/strip-root-motion.mjs

import { NodeIO } from '@gltf-transform/core'

const io = new NodeIO()

async function stripHipTranslation(path) {
  const doc = await io.read(path)
  let removed = 0
  for (const anim of doc.getRoot().listAnimations()) {
    for (const ch of anim.listChannels()) {
      const node = ch.getTargetNode()
      const cpath = ch.getTargetPath()
      const nodeName = node?.getName() ?? ''
      if (cpath === 'translation' && /hips?$/i.test(nodeName)) {
        ch.dispose()
        removed++
        console.log(`  ${anim.getName()}: removed translation channel on ${nodeName}`)
      }
    }
  }
  await io.write(path, doc)
  console.log(`${path}: removed ${removed} hip translation channel(s)`)
}

await stripHipTranslation('public/models/Player_Walking.glb')
