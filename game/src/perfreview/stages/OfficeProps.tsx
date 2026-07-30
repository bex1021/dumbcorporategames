// Shared office dressing for every stage: the Alignly-branded motivational
// posters, drifting in the scenery. This is still an office — the fight is a
// meeting — so the posters are the cheapest way to keep that fiction present
// even inside a Tron grid or a sunset boardroom.
//
// They drift on the STAGE CLOCK, so they hang motionless during the impact
// freeze along with everything else, and never move at all under reduced
// motion. Placement is always outside the fight band.
import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { usePosterTextures, useStageClock, type PosterVariant } from './stageKit'

export type PosterPlacement = {
  variant: PosterVariant
  pos: [number, number, number]
  /** base yaw; the drift adds a small sway on top */
  rotY?: number
  scale?: number
  /** seconds per bob cycle — vary it so they never move in lockstep */
  period?: number
  phase?: number
}

const ASPECT = 384 / 512 // poster canvases are portrait

export function FloatingPosters({ items }: { items: readonly PosterPlacement[] }) {
  // De-duplicate variants so each distinct poster costs exactly one texture.
  const variants = Array.from(new Set(items.map((i) => i.variant)))
  const textures = usePosterTextures(variants)
  const refs = useRef<(THREE.Group | null)[]>([])
  const clock = useStageClock()

  useFrame(() => {
    const t = clock.t
    for (let i = 0; i < items.length; i++) {
      const g = refs.current[i]
      if (!g) continue
      const it = items[i]
      const period = it.period ?? 9
      const phase = it.phase ?? 0
      const k = (t / period) * Math.PI * 2 + phase
      // slow vertical bob + a lazy sway, as if hung on nothing at all
      g.position.y = it.pos[1] + Math.sin(k) * 0.16
      g.rotation.y = (it.rotY ?? 0) + Math.sin(k * 0.6) * 0.09
      g.rotation.z = Math.sin(k * 0.45 + 1.1) * 0.035
    }
  })

  return (
    <>
      {items.map((it, i) => {
        const s = it.scale ?? 1
        return (
          <group
            key={`${it.variant}:${it.pos.join(',')}`}
            ref={(el) => {
              refs.current[i] = el
            }}
            position={it.pos}
            rotation={[0, it.rotY ?? 0, 0]}
          >
            <mesh>
              <planeGeometry args={[1.05 * ASPECT * s, 1.05 * s]} />
              <meshBasicMaterial
                map={textures[variants.indexOf(it.variant)]}
                transparent
                toneMapped={false}
                side={THREE.DoubleSide}
              />
            </mesh>
          </group>
        )
      })}
    </>
  )
}
