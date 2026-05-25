// Loads a rigged GLB character and plays the first animation in the file.
// Multiple animation states are handled at the parent level by mounting
// multiple GLBHumanoid instances and toggling visibility.
//
// IMPORTANT: do NOT add intermediate groups between the ref'd group and the
// primitive — it breaks Drei's useAnimations binding. Apply orientation
// corrections in a wrapper group ABOVE this component in the tree instead.
//
// Root-motion stripping (e.g. for Mixamo Walking) is done by preprocessing
// the GLB via scripts/strip-root-motion.mjs, NOT in code.

import { useEffect, useMemo, useRef } from 'react'
import { useGLTF, useAnimations } from '@react-three/drei'
import { Group } from 'three'
import { clone as cloneSkinned } from 'three/examples/jsm/utils/SkeletonUtils.js'

type Props = {
  url: string
  visible?: boolean
  scale?: number
}

export function GLBHumanoid({ url, visible = true, scale = 0.01 }: Props) {
  const group = useRef<Group>(null)
  const { scene, animations } = useGLTF(url)

  // Per-instance clone so multiple NPCs from the same GLB don't share state.
  const clonedScene = useMemo(() => cloneSkinned(scene), [scene])

  const { actions, names } = useAnimations(animations, group)

  useEffect(() => {
    if (!names.length) return
    // Mixamo files often contain an empty "Take 001" clip alongside the real
    // animation. Pick the first clip that actually has tracks — otherwise the
    // character renders in bind pose (T-pose) because the empty clip "plays"
    // but does nothing.
    const target =
      names.find((n) => {
        const a = actions[n]
        const clip = a?.getClip?.()
        return clip && clip.duration > 0 && clip.tracks.length > 0
      }) ?? names[0]
    const action = actions[target]
    if (action) {
      action.reset().fadeIn(0.2).play()
    }
    return () => {
      const a = actions[target]
      if (a) a.fadeOut(0.2)
    }
  }, [actions, names])

  return (
    <group ref={group} scale={scale} visible={visible}>
      <primitive object={clonedScene} />
    </group>
  )
}

useGLTF.preload('/models/Player_Idle.glb')
useGLTF.preload('/models/Player_Walking.glb')
useGLTF.preload('/models/Male1_Sitting.glb')
useGLTF.preload('/models/Male1_idle.glb')
useGLTF.preload('/models/Female1_Sitting.glb')
useGLTF.preload('/models/Female1_idle.glb')
useGLTF.preload('/models/Soldier.glb')
