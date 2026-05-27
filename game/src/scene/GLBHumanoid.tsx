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
import { AnimationClip, Group } from 'three'
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

  // Strip Head bone tracks from the animations so callers (e.g. the NPC
  // head-turn useFrame in NPCs.tsx) can manipulate the head bone without
  // the AnimationMixer overwriting their changes on the next frame.
  //
  // The Mixamo Sitting/Idle clips include slight head motion that nobody
  // notices anyway — removing it costs nothing and unlocks player-reactive
  // head behavior. Track names look like "mixamorig12Head.quaternion" or
  // "mixamorig12Head.position"; we match by checking for "Head" in the
  // target node portion (everything up to the first dot).
  const filteredAnimations = useMemo(() => {
    return animations.map((clip) => {
      const cloned = clip.clone()
      cloned.tracks = cloned.tracks.filter((track) => {
        const nodeName = track.name.split('.')[0]
        return !nodeName.endsWith('Head') && !nodeName.endsWith('HeadTop_End')
      })
      return cloned
    }) as AnimationClip[]
  }, [animations])

  const { actions, names } = useAnimations(filteredAnimations, group)

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
