// Per-frame anatomy of a clip: where the hands and feet are, how fast, and how
// high. Peak SPEED alone told me where contacts were but not WHAT they were —
// which is how I kept the backflip and trimmed the uppercut off the end.
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
const stub=()=>({addEventListener(){},removeEventListener(){},style:{},setAttribute(){},set src(_){}} )
globalThis.self??=globalThis; globalThis.window??=globalThis
globalThis.document??={createElementNS:()=>({style:{},...stub()}),createElement:()=>({getContext:()=>null,...stub()})}
const here=dirname(fileURLToPath(import.meta.url))
const loader=new GLTFLoader()
const find=(r,n)=>{let h=null;r.traverse(o=>{if(o.name.replace(/^mixamorig\d*/,'').toLowerCase()===n.toLowerCase())h=o});return h}
const slot=process.argv[2], step=+(process.argv[3]||4)
const b=readFileSync(join(here,'..','..','public','models','_mixamo_glb',`${slot}.glb`))
const g=await new Promise((res,rej)=>loader.parse(b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength),'',res,rej))
const clip=g.animations.find(a=>a.tracks.length)
const mixer=new THREE.AnimationMixer(g.scene); mixer.clipAction(clip).play()
const hips=find(g.scene,'Hips'), lh=find(g.scene,'LeftHand'), rh=find(g.scene,'RightHand')
const lf=find(g.scene,'LeftFoot'), rf=find(g.scene,'RightFoot')
const F=Math.round(clip.duration*30)
const P=(o)=>{const v=new THREE.Vector3();o.getWorldPosition(v);return v}
let prev=null
console.log(`${slot}: ${F} frames @30fps (${clip.duration.toFixed(2)}s)\n`)
console.log('  f   hipY  handY(max)  footY(min)  handSpd  footSpd   read')
for(let f=0;f<=F;f+=step){
  mixer.setTime(Math.min(f/30,clip.duration-1e-4)); g.scene.updateMatrixWorld(true)
  const h=P(hips), a=P(lh), b2=P(rh), c=P(lf), d=P(rf)
  const handY=Math.max(a.y,b2.y), footY=Math.min(c.y,d.y)
  let hs=0, fs=0
  if(prev){hs=Math.max(a.distanceTo(prev.a),b2.distanceTo(prev.b))*30/step; fs=Math.max(c.distanceTo(prev.c),d.distanceTo(prev.d))*30/step}
  prev={a:a.clone(),b:b2.clone(),c:c.clone(),d:d.clone()}
  const airborne = footY>40
  const handHigh = handY>h.y+55
  const read = airborne ? 'AIRBORNE' : handHigh ? 'HAND HIGH ← uppercut-ish' : ''
  console.log(`${String(f).padStart(3)}  ${h.y.toFixed(0).padStart(5)}  ${handY.toFixed(0).padStart(9)}  ${footY.toFixed(0).padStart(10)}  ${hs.toFixed(0).padStart(7)}  ${fs.toFixed(0).padStart(7)}   ${read}`)
}
