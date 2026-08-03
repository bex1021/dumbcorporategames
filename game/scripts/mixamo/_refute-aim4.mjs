import { readFileSync } from 'node:fs'; import { join } from 'node:path'
import * as THREE from 'three'; import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
const st=()=>({addEventListener(){},removeEventListener(){},style:{},setAttribute(){},set src(_){}})
globalThis.self??=globalThis; globalThis.window??=globalThis
globalThis.document??={createElementNS:()=>({style:{},...st()}),createElement:()=>({getContext:()=>null,...st()})}
const dir='/Users/rebeccaleung/blocked/game/public/models/_mixamo_glb'
const TRIM={jab:[11,26,1.09],throw:[27,48,1.33]}
const norm=s=>s.replace(/^mixamorig\d+/,'mixamorig')
const L=new GLTFLoader(); const p=b=>new Promise((r,j)=>L.parse(b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength),'',r,j))
for(const n of Object.keys(TRIM)){
  const g=await p(readFileSync(join(dir,`${n}.glb`)))
  const src=g.animations.find(x=>x.tracks.length>0); const c=src.clone(); c.tracks.forEach(t=>t.name=norm(t.name))
  const cut=THREE.AnimationUtils.subclip(c,n,TRIM[n][0],TRIM[n][1],30)
  const kept=new Set(cut.tracks.map(t=>t.name))
  const dropped=c.tracks.filter(t=>!kept.has(t.name)).map(t=>t.name.replace('mixamorig',''))
  console.log(`\n${n}: DROPPED ${dropped.length}/${c.tracks.length} tracks (zero keyframes inside frames ${TRIM[n][0]}..${TRIM[n][1]})`)
  console.log('  '+dropped.join('  '))
}
