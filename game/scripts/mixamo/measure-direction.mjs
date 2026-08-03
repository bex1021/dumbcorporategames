// Which WAY does a fall clip go? Heights can't tell you — this can:
//  · the hip's horizontal travel in the RAW (pre-strip) track = stagger direction
//  · head position relative to hips at the settled pose = which way the body lies
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
const stub=()=>({addEventListener(){},removeEventListener(){},style:{},setAttribute(){},set src(_){}} )
globalThis.self??=globalThis; globalThis.window??=globalThis
globalThis.document??={createElementNS:()=>({style:{},...stub()}),createElement:()=>({getContext:()=>null,...stub()})}
const here=dirname(fileURLToPath(import.meta.url))
const dir=join(here,'..','..','public','models','_mixamo_glb')
const loader=new GLTFLoader()
const parse=(b)=>new Promise((res,rej)=>loader.parse(b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength),'',res,rej))
for (const slot of process.argv.slice(2)) {
  const g=await parse(readFileSync(join(dir,`${slot}.glb`)))
  const clip=g.animations.find(a=>a.tracks.length)
  const mixer=new THREE.AnimationMixer(g.scene); mixer.clipAction(clip).play()
  let hips=null,head=null
  g.scene.traverse(o=>{const n=o.name.replace(/^mixamorig\d*/,'').toLowerCase()
    if(n==='hips')hips=o; if(n==='head')head=o})
  const at=(f)=>{mixer.setTime(Math.min(f/30,clip.duration-1e-4));g.scene.updateMatrixWorld(true)
    const h=new THREE.Vector3(),d=new THREE.Vector3();hips.getWorldPosition(h);head.getWorldPosition(d);return {h,d}}
  // facing: in Mixamo rigs the character faces +Z at frame 0
  const F=Math.round(clip.duration*30)
  const early=at(2), late=at(F-2)
  console.log(`${slot}:`)
  console.log(`  head-vs-hips Z at start ${ (early.d.z-early.h.z).toFixed(1) }u   at end ${ (late.d.z-late.h.z).toFixed(1) }u`)
  console.log(`  → body ends lying ${ (late.d.z-late.h.z) > 5 ? 'head FORWARD (fell forward)' : (late.d.z-late.h.z) < -5 ? 'head BACKWARD (fell backward)' : 'compact/unclear' }`)
}
