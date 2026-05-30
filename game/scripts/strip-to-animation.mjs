// Strip a Mixamo GLB down to animation-only.
//
// The Jira Run reuses the Player_Idle mesh and only needs the *animation
// clips* from the run/jump GLBs (drei's useAnimations retargets clip tracks
// onto the idle skeleton by bone name). So the heavy mesh + textures in
// those 71 MB exports are dead weight — drop them, keep the keyframe
// accessors + nodes, and the file shrinks to a few KB.
//
// Usage: node scripts/strip-to-animation.mjs <in.glb> <out.glb>

import { NodeIO } from '@gltf-transform/core'

const [, , inPath, outPath] = process.argv
if (!inPath || !outPath) {
  console.error('usage: node strip-to-animation.mjs <in.glb> <out.glb>')
  process.exit(1)
}

const io = new NodeIO()
const doc = await io.read(inPath)
const root = doc.getRoot()

// Dispose everything that isn't needed to play the animation: meshes, the
// materials/textures they reference, and skins (skin only binds mesh→bones).
// Bone nodes + animation accessors (keyframe data) are left intact.
for (const skin of root.listSkins()) skin.dispose()
for (const mesh of root.listMeshes()) mesh.dispose()
for (const mat of root.listMaterials()) mat.dispose()
for (const tex of root.listTextures()) tex.dispose()

await io.write(outPath, doc)
console.log(`stripped ${inPath} → ${outPath}`)
