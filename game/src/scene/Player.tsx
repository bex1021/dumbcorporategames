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
import { Group, AnimationClip, type Object3D } from 'three'
import { useKeyboard } from '../hooks/useKeyboard'
import { OFFICE, PLAYER, ROOM_COLLIDERS } from '../config/constants'
import { playerPosition, playerVelocity, playerFacing } from '../state/playerState'
import { useGameStore } from '../state/gameStore'
import { slapState } from '../state/slapState'
import { audio } from '../audio/AudioManager'

// How often to fire a footstep while moving. The Mixamo Walk animation
// plays at a FIXED cadence (timeScale=1) regardless of player movement
// speed — so the visual foot strikes happen at a constant rate, even when
// PM walks backward (which uses the same clip just covering less ground).
//
// Standard Mixamo Walk cycle is ~1.07s for a full 2-step cycle, so one
// step = ~0.53s. We use 0.55 to slightly stagger ahead of perfect sync,
// which sounds more natural than a tight metronome lock.
const STEP_BASE_INTERVAL_S = 0.55

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
  //
  // Note: previously we also stripped right-arm tracks here so the slap
  // animation could drive the bone without mixer interference — but that
  // left the arm stuck in T-pose when not slapping (Mixamo's bind pose has
  // arms straight out). Now we let the mixer animate the arm normally and
  // only override bone.rotation.x during an active slap.
  const combinedAnimations = useMemo(() => {
    const idleClip = pickAndRename(idle.animations, IDLE_NAME)
    const walkClipRaw = pickAndRename(walking.animations, WALK_NAME)
    const walkClip = walkClipRaw ? stripRootMotion(walkClipRaw) : null
    return [idleClip, walkClip].filter((c): c is AnimationClip => c !== null)
  }, [idle.animations, walking.animations])

  const { actions } = useAnimations(combinedAnimations, animRef)

  // Crossfade target — stored in a ref so we only fire on TRANSITION.
  const currentRef = useRef<'Idle' | 'Walk'>('Idle')

  // Footstep cadence state: time of last step + parity flag for L/R pitch.
  // Kept in refs so they don't trigger React re-renders every frame.
  const lastStepRef = useRef(0)
  const stepParityRef = useRef(0)

  // Right-arm slap animation state. The right upper-arm bone is located
  // lazily on the first frame the skeleton is mounted (animRef.traverse).
  // slapStartTimeRef holds the start time of the current slap animation;
  // 0 means "no slap currently playing". lastTriggerRef tracks the last
  // observed slapState.printerSlapTrigger value so we only react to
  // increments.
  const rightArmBoneRef = useRef<Object3D | null>(null)
  const slapStartTimeRef = useRef(0)
  const lastTriggerRef = useRef(0)

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

    // Footstep audio: fire a step every STEP_BASE_INTERVAL_S while moving.
    // No speed scaling — the Mixamo Walk animation plays at a fixed cadence
    // regardless of actual movement velocity (backward walking uses the
    // same clip just covering less ground per cycle). Alternate pitch each
    // step so the rhythm doesn't sound robotic.
    if (speed > 0.2) {
      const now = performance.now() / 1000
      if (now - lastStepRef.current >= STEP_BASE_INTERVAL_S) {
        lastStepRef.current = now
        const pitch = stepParityRef.current === 0 ? 1.0 : 0.92
        audio.playFootstep({ pitch })
        stepParityRef.current = 1 - stepParityRef.current
      }
    }

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

  // ---- Slap-the-printer animation ----
  //
  // Triggered by gameStore.interactObject('printer') — i.e. only when the
  // player presses E near the printer to "Unjam the printer". When the
  // slap is NOT active, this useFrame leaves the bone alone so the
  // AnimationMixer's normal Idle/Walk arm motion plays.
  //
  // Motion: horizontal "side-to-front" swat. Arm starts at the body's
  // side (rest), winds back briefly, then swings forward across the body
  // toward the printer, then returns. Rotation around the bone's Z axis
  // (perpendicular to the arm length, in the body's transverse plane)
  // gives that horizontal swat instead of an overhead chop.
  //
  // Additive rotation: we ADD to whatever the mixer set this frame, so
  // the slap rides on top of the idle/walk arm motion. Once the slap
  // ends, we stop touching the bone entirely.
  useFrame(() => {
    // Lazy-find the right arm bone the first time we have a skeleton.
    if (!rightArmBoneRef.current && animRef.current) {
      animRef.current.traverse((obj) => {
        if (
          !rightArmBoneRef.current &&
          /^mixamorig\d*RightArm$/.test(obj.name)
        ) {
          rightArmBoneRef.current = obj
        }
      })
    }
    const bone = rightArmBoneRef.current
    if (!bone) return

    // React to slap triggers from the gameStore (interactObject('printer')).
    const trigger = slapState.printerSlapTrigger
    if (trigger > lastTriggerRef.current) {
      lastTriggerRef.current = trigger
      slapStartTimeRef.current = performance.now() / 1000
    }

    const start = slapStartTimeRef.current
    if (start <= 0) {
      // No slap in flight — DO NOT touch bone.rotation. Let the
      // AnimationMixer animate the arm normally via Idle/Walk clips.
      return
    }
    const SLAP_DUR = 0.6
    const elapsed = performance.now() / 1000 - start
    if (elapsed >= SLAP_DUR) {
      // Slap done — relinquish control back to the mixer.
      slapStartTimeRef.current = 0
      return
    }

    // Three-phase ease for a horizontal swat:
    //   0–0.10s   wind back  (arm gathers slightly to the outside)
    //   0.10–0.25 swing       (arm sweeps forward across body)
    //   0.25–0.60 recover     (arm drifts back to rest)
    //
    // Sign of rotDelta determines which direction the arm swings — if the
    // empirical result swings backward instead of forward, flip the sign.
    const WIND_END = 0.1
    const SWING_END = 0.25
    let rotDelta: number
    if (elapsed < WIND_END) {
      const t = elapsed / WIND_END
      rotDelta = 0.35 * t // small wind-back
    } else if (elapsed < SWING_END) {
      const t = (elapsed - WIND_END) / (SWING_END - WIND_END)
      rotDelta = 0.35 + (-1.6 - 0.35) * t // big sweep forward (negative side)
    } else {
      const t = (elapsed - SWING_END) / (SLAP_DUR - SWING_END)
      rotDelta = -1.6 * (1 - t) // recover to rest
    }
    bone.rotation.z += rotDelta
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

