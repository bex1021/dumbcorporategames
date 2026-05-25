// Tank-style controls:
//   ← / →  rotate PM continuously
//   ↑      walk forward in PM's current facing
//   ↓      walk backward (slower)
// Camera stays rigidly behind PM (see FollowCamera).
//
// Animation pipeline — combine raw Mixamo GLBs at runtime instead of trusting
// the merge script's Player.glb:
//   - Load Player_Idle.glb for the SCENE (mesh + skeleton). The mesh is
//     skinned to unsuffixed bones (mixamorig9Hips, etc).
//   - Load Player_Walking.glb just to grab its Walk clip. Its tracks
//     reference unsuffixed bone names too, which match Idle's scene.
//   - Concatenate the clips and pass to a single useAnimations call.
//   - Crossfade between 'Idle' and 'Walk' on the same mixer.
//
// We previously tried scripts/merge-mixamo-glb.mjs's output (Player.glb) but
// it produced a duplicate skeleton whose Walk-clip tracks targeted bones
// the mesh wasn't skinned to → walk played into T-pose. Bypassing the
// merged file dodges that bug entirely.

import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { useGLTF, useAnimations } from '@react-three/drei'
import { Group, AnimationClip } from 'three'
import { useKeyboard } from '../hooks/useKeyboard'
import { OFFICE, PLAYER, ROOM_COLLIDERS } from '../config/constants'
import { playerPosition, playerVelocity, playerFacing } from '../state/playerState'
import { useGameStore } from '../state/gameStore'

useGLTF.preload('/models/Player_Idle.glb')
useGLTF.preload('/models/Player_Walking.glb')

const CROSSFADE_S = 0.18
// Clip names AFTER our useMemo renames them — see combinedAnimations below.
const IDLE_NAME = 'Idle'
const WALK_NAME = 'Walk'

export function Player() {
  const outerRef = useRef<Group>(null)
  const animRef = useRef<Group>(null!)
  const keys = useKeyboard()

  // Idle GLB hosts the mesh + scene we render.
  const idle = useGLTF('/models/Player_Idle.glb')
  // Walking GLB is loaded purely for its clip; its own scene is unused.
  const walking = useGLTF('/models/Player_Walking.glb')

  // Build a combined animations list. Mixamo's raw clip names are "mixamo.com"
  // or "Take 001" — both useless. Pick the non-empty clip from each file and
  // rename them to "Idle" and "Walk" so we can address them by name below.
  //
  // We also drop the root-motion position track (Hips.position) from Walk so
  // it walks in place rather than translating the skeleton off-screen.
  const combinedAnimations = useMemo(() => {
    const idleClip = pickAndRename(idle.animations, IDLE_NAME)
    const walkClipRaw = pickAndRename(walking.animations, WALK_NAME)
    const walkClip = walkClipRaw ? stripRootMotion(walkClipRaw) : null
    return [idleClip, walkClip].filter((c): c is AnimationClip => c !== null)
  }, [idle.animations, walking.animations])

  const { actions } = useAnimations(combinedAnimations, animRef)

  // Crossfade target — stored in a ref so we only fire on TRANSITION.
  const currentRef = useRef<'Idle' | 'Walk'>('Idle')

  useEffect(() => {
    const idleAction = actions[IDLE_NAME]
    if (idleAction) idleAction.reset().fadeIn(CROSSFADE_S).play()
    return () => {
      Object.values(actions).forEach((a) => a?.stop())
    }
  }, [actions])

  useFrame((_, delta) => {
    const group = outerRef.current
    if (!group) return

    const { activeDialogue, phase, pendingRecovery } = useGameStore.getState()
    const inputLocked =
      phase !== 'playing' || activeDialogue !== null || pendingRecovery !== null

    let turn = 0
    if (!inputLocked && keys.current.left) turn += 1
    if (!inputLocked && keys.current.right) turn -= 1
    playerFacing.y += turn * PLAYER.rotationSpeed * delta

    let throttle = 0
    if (!inputLocked && keys.current.forward) throttle += 1
    if (!inputLocked && keys.current.back) throttle -= PLAYER.backwardSpeedFactor
    const moving = throttle !== 0

    const sin = Math.sin(playerFacing.y)
    const cos = Math.cos(playerFacing.y)
    const fwdX = -sin
    const fwdZ = -cos

    const targetVx = fwdX * throttle * PLAYER.walkSpeed
    const targetVz = fwdZ * throttle * PLAYER.walkSpeed

    const approach = 1 - Math.exp(-PLAYER.accel * delta)
    playerVelocity.x += (targetVx - playerVelocity.x) * approach
    playerVelocity.z += (targetVz - playerVelocity.z) * approach

    if (Math.abs(playerVelocity.x) < 0.01 && !moving) playerVelocity.x = 0
    if (Math.abs(playerVelocity.z) < 0.01 && !moving) playerVelocity.z = 0

    const limX = OFFICE.halfWidth - PLAYER.radius - 0.15
    const limZ = OFFICE.halfDepth - PLAYER.radius - 0.15
    const r = PLAYER.radius

    let nextX = playerPosition.x + playerVelocity.x * delta
    let nextZ = playerPosition.z + playerVelocity.z * delta

    if (nextX > limX) {
      nextX = limX
      playerVelocity.x = 0
    } else if (nextX < -limX) {
      nextX = -limX
      playerVelocity.x = 0
    }

    for (const c of ROOM_COLLIDERS) {
      const overlapsZ = playerPosition.z + r > c.minZ && playerPosition.z - r < c.maxZ
      const overlapsX = nextX + r > c.minX && nextX - r < c.maxX
      if (overlapsX && overlapsZ) {
        if (playerPosition.x < c.minX) nextX = c.minX - r
        else nextX = c.maxX + r
        playerVelocity.x = 0
      }
    }

    playerPosition.x = nextX

    if (nextZ > limZ) {
      nextZ = limZ
      playerVelocity.z = 0
    } else if (nextZ < -limZ) {
      nextZ = -limZ
      playerVelocity.z = 0
    }

    for (const c of ROOM_COLLIDERS) {
      const overlapsX = playerPosition.x + r > c.minX && playerPosition.x - r < c.maxX
      const overlapsZ = nextZ + r > c.minZ && nextZ - r < c.maxZ
      if (overlapsX && overlapsZ) {
        if (playerPosition.z < c.minZ) nextZ = c.minZ - r
        else nextZ = c.maxZ + r
        playerVelocity.z = 0
      }
    }

    playerPosition.z = nextZ

    group.position.set(playerPosition.x, 0, playerPosition.z)
    group.rotation.y = playerFacing.y

    // Crossfade Idle ↔ Walk on speed threshold crossing only.
    const speed = Math.hypot(playerVelocity.x, playerVelocity.z)
    const desired: 'Idle' | 'Walk' = speed > 0.2 ? 'Walk' : 'Idle'
    if (desired !== currentRef.current) {
      const prev = actions[currentRef.current]
      const next = actions[desired]
      if (prev && next) {
        next.reset().play()
        prev.crossFadeTo(next, CROSSFADE_S, false)
      } else if (next) {
        next.reset().fadeIn(CROSSFADE_S).play()
      }
      currentRef.current = desired
    }
  })

  return (
    <group ref={outerRef}>
      {/* Static Mixamo correction: 0.01 scale (cm → m), π Y-rotation to make
          the character face +Z instead of Mixamo's default -Z. */}
      <group rotation={[0, Math.PI, 0]} scale={0.01}>
        <group ref={animRef}>
          {/* Mount Player_Idle.glb's scene — this is what's rendered. The
              mesh is skinned to the unsuffixed bones in this scene; Walk
              clip's tracks (from Walking.glb) target those same names. */}
          <primitive object={idle.scene} />
        </group>
      </group>
    </group>
  )
}

// ---- helpers ----

// Pick the first clip with actual tracks (Mixamo files sometimes contain an
// empty "Take 001" clip) and clone it under a fresh stable name so we can
// address it consistently in the actions map.
function pickAndRename(animations: AnimationClip[], newName: string): AnimationClip | null {
  const found = animations.find((c) => c.tracks.length > 0)
  if (!found) return null
  const cloned = found.clone() as AnimationClip
  cloned.name = newName
  return cloned
}

// Drop the root bone's position track (Mixamo "Walking" walks the skeleton
// forward; we want walk-in-place so our controlled position can drive
// movement without conflict).
function stripRootMotion(clip: AnimationClip): AnimationClip {
  const cloned = clip.clone() as AnimationClip
  cloned.tracks = cloned.tracks.filter((t) => {
    const isPosition = t.name.endsWith('.position')
    if (!isPosition) return true
    return !/(?:mixamorig\d*Hips|Hips|Root|Armature)\.position$/.test(t.name)
  })
  return cloned
}
