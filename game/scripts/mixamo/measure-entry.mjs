// Which knockdown-clip frame best matches the HELD FOLD pose (guthit f24)?
// The finisher of the super knocks her down FROM the fold — if the knockdown
// clip enters at its standing frames, she pops upright before falling.
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
async function rig(slot){
  const g=await parse(readFileSync(join(dir,`${slot}.glb`)))
  const clip=g.animations.find(a=>a.tracks.length)
  const mixer=new THREE.AnimationMixer(g.scene)
  mixer.clipAction(clip).play()
  return {scene:g.scene,mixer,clip}
}
const pose=(r,f)=>{r.mixer.setTime(Math.min(f/30,r.clip.duration-1e-4));r.scene.updateMatrixWorld(true)
  const o={};r.scene.traverse(n=>{if(n.name.startsWith('mixamorig'))o[n.name.replace(/^mixamorig\d*/,'')]=n.quaternion.clone()});return o}
const delta=(a,b)=>{let s=0,n=0;for(const k of Object.keys(a)){if(!b[k])continue;s+=2*Math.acos(Math.min(1,Math.abs(a[k].dot(b[k]))))*180/Math.PI;n++}return s/n}
const gut=await rig('guthit'), kd=await rig('guthitfall')
const fold=pose(gut,24)
console.log('pose delta from the held fold (guthit f24) to KNOCKED OUT clip at frame N:')
for(let f=36;f<=72;f+=4) console.log(`  kd f${String(f).padStart(2)}  ${delta(fold,pose(kd,f)).toFixed(1)}°`)
