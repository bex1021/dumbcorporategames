// FBX → GLB, in Node, using three's own loader/exporter (no external binary).
// Mixamo "Without Skin" FBX = skeleton + one animation clip; we export a GLB
// carrying that clip, ready for merge-mixamo-glb.mjs to combine + rename.
import { readFileSync, writeFileSync } from 'node:fs'
import * as THREE from 'three'
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js'
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js'

// minimal browser-shims the loaders/exporters poke at. The image object needs
// addEventListener so texture loading doesn't crash the FBX parse; we then
// strip all textures below (graybox bodies get a flat in-engine material).
const imageStub = () => ({ addEventListener() {}, removeEventListener() {}, style: {}, setAttribute() {}, set src(_) {} })
globalThis.self ??= globalThis
globalThis.window ??= globalThis
globalThis.document ??= {
  createElementNS: () => ({ style: {}, ...imageStub() }),
  createElement: () => ({ getContext: () => null, ...imageStub() }),
}
// GLTFExporter reads its own binary buffers via FileReader — shim it over Blob.
globalThis.FileReader ??= class {
  #done(result) { this.result = result; this.onload?.({ target: this }); this.onloadend?.({ target: this }) }
  readAsArrayBuffer(blob) { blob.arrayBuffer().then((ab) => this.#done(ab)) }
  readAsDataURL(blob) {
    blob.arrayBuffer().then((ab) =>
      this.#done('data:application/octet-stream;base64,' + Buffer.from(ab).toString('base64')),
    )
  }
}

const [, , inPath, outPath] = process.argv
const buf = readFileSync(inPath)
const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength)

const loader = new FBXLoader()
const group = loader.parse(ab, '')
console.log(`  loaded: ${group.animations.length} clip(s), ${countBones(group)} bones`)

// Drop all textures → a flat material. Images can't decode headlessly (the DOM
// shims above hand back a stub), so carrying them through here is impossible.
// We KEEP THE ORIGINAL MATERIAL NAME, which is what lets fbx-textures.mjs
// re-attach the real PNGs afterwards by matching name → texture.
let meshes = 0
group.traverse((o) => {
  if (o.isMesh || o.isSkinnedMesh) {
    meshes++
    const names = (Array.isArray(o.material) ? o.material : [o.material]).map((m) => m?.name).filter(Boolean)
    const mat = new THREE.MeshStandardMaterial({ color: 0x3b3b44, roughness: 0.85, metalness: 0 })
    mat.name = names[0] ?? ''
    o.material = mat
    if (mat.name) console.log(`    mesh "${o.name}" → material "${mat.name}"`)
  }
})
if (meshes) console.log(`  flattened ${meshes} mesh material(s)`)

const exporter = new GLTFExporter()
const result = await exporter.parseAsync(group, { binary: true, animations: group.animations })
writeFileSync(outPath, Buffer.from(result))
console.log(`  wrote ${outPath} (${(result.byteLength / 1024).toFixed(0)} KB)`)

function countBones(g) { let n = 0; g.traverse((o) => { if (o.isBone) n++ }); return n }
