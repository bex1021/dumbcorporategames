// Merges multiple Mixamo single-animation GLBs into one Soldier-style GLB.
//
// Background: when you download a Mixamo character with a single animation,
// you get a GLB with one anim named "mixamo.com" plus an empty "Take 001".
// To use it like threejs.org's Soldier.glb (which is the gold-standard pattern
// for a rigged character with multiple named anims), we need to:
//   1. Combine animations from multiple files into one file
//   2. Rename "mixamo.com" → meaningful clip names ("Idle", "Walk")
//   3. Drop the empty "Take 001"
//   4. (Optional) bake a Mixamo→Three.js orientation correction into the root
//      node, matching Soldier's [-0.7071, 0, 0, 0.7071] rotation + 0.01 scale
//
// Usage:
//   node scripts/merge-mixamo-glb.mjs

import { NodeIO } from '@gltf-transform/core'

const io = new NodeIO()

// Mixamo characters from Three.js editor are already in Y-up orientation
// (the FBX import handled that), so we DON'T need Blender's -90° X rotation
// correction that Soldier.glb has. We only bake the cm→m scale.
const ROOT_SCALE = [0.01, 0.01, 0.01]

async function mergeMixamoGlbs({
  basePath,
  additionalAnimPaths, // [{ path, clipName }]
  baseClipName,
  outputPath,
  bakeScale = false,
}) {
  console.log(`\nMerging ${basePath} + ${additionalAnimPaths.length} other(s) → ${outputPath}`)

  const baseDoc = await io.read(basePath)
  const baseRoot = baseDoc.getRoot()

  // ----- Clean + rename base animations -----
  for (const anim of baseRoot.listAnimations()) {
    const name = anim.getName()
    if (anim.listChannels().length === 0) {
      anim.dispose()
      continue
    }
    if (name === 'mixamo.com') anim.setName(baseClipName)
  }

  // ----- Build a name → node lookup so we can rebind animation channels -----
  const baseNodesByName = new Map()
  for (const node of baseRoot.listNodes()) {
    const name = node.getName()
    if (name) baseNodesByName.set(name, node)
  }

  // ----- Copy each extra animation into the base doc -----
  for (const { path, clipName } of additionalAnimPaths) {
    const extraDoc = await io.read(path)
    const extraAnim = extraDoc
      .getRoot()
      .listAnimations()
      .find((a) => a.listChannels().length > 0)
    if (!extraAnim) {
      console.warn(`  skipping ${path}: no non-empty animation`)
      continue
    }

    const newAnim = baseDoc.createAnimation(clipName)

    let copied = 0
    let skipped = 0
    for (const channel of extraAnim.listChannels()) {
      const sourceNode = channel.getTargetNode()
      if (!sourceNode) continue
      const targetNode = baseNodesByName.get(sourceNode.getName())
      if (!targetNode) {
        skipped++
        continue
      }
      const sourceSampler = channel.getSampler()
      if (!sourceSampler) continue
      const sourceInput = sourceSampler.getInput()
      const sourceOutput = sourceSampler.getOutput()
      if (!sourceInput || !sourceOutput) continue

      const newInput = baseDoc
        .createAccessor()
        .setType(sourceInput.getType())
        .setArray(new Float32Array(sourceInput.getArray()))
      const newOutput = baseDoc
        .createAccessor()
        .setType(sourceOutput.getType())
        .setArray(new Float32Array(sourceOutput.getArray()))
      const newSampler = baseDoc
        .createAnimationSampler()
        .setInput(newInput)
        .setOutput(newOutput)
        .setInterpolation(sourceSampler.getInterpolation())
      const newChannel = baseDoc
        .createAnimationChannel()
        .setSampler(newSampler)
        .setTargetNode(targetNode)
        .setTargetPath(channel.getTargetPath())
      newAnim.addChannel(newChannel)
      newAnim.addSampler(newSampler)
      copied++
    }
    console.log(`  ${clipName}: copied ${copied} channels (skipped ${skipped})`)
  }

  // No transform baking. Skinned-mesh GLBs are fragile to root-node transform
  // changes (bind matrices live in skin accessors and don't auto-adjust).
  // Scale is applied in the R3F renderer instead via the wrapper group's scale.

  await io.write(outputPath, baseDoc)
  console.log(`Wrote ${outputPath}`)

  // Quick verification
  const verifyDoc = await io.read(outputPath)
  console.log('Animations in output:')
  for (const anim of verifyDoc.getRoot().listAnimations()) {
    console.log(`  - ${anim.getName()} (${anim.listChannels().length} channels)`)
  }
}

// Build PM combined GLB
await mergeMixamoGlbs({
  basePath: 'public/models/Player_Idle.glb',
  additionalAnimPaths: [{ path: 'public/models/Player_Walking.glb', clipName: 'Walk' }],
  baseClipName: 'Idle',
  outputPath: 'public/models/Player.glb',
  bakeScale: false,
})

// Build NPC base GLBs (each has only one animation but we still clean + bake)
const npcMerges = [
  { base: 'Male1_Sitting.glb', clip: 'Sitting', out: 'Male1.glb' },
  { base: 'Female1_Sitting.glb', clip: 'Sitting', out: 'Female1_sit.glb' },
  { base: 'Female1_idle.glb', clip: 'Idle', out: 'Female1_stand.glb' },
]
for (const m of npcMerges) {
  await mergeMixamoGlbs({
    basePath: `public/models/${m.base}`,
    additionalAnimPaths: [],
    baseClipName: m.clip,
    outputPath: `public/models/${m.out}`,
    bakeScale: false,
  })
}
