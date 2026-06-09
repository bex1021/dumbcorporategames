// Third-person follow camera for Lunch Dash.
//
// Same locked principle as the office FollowCamera — camera sits rigidly
// BEHIND the car so controls stay aligned (forward always drives "into the
// screen", left/right pivot car + world together). Retuned for a car: further
// back, higher, and with a little position lag (vehicles feel better with a
// touch of follow softness than the office's perfectly-rigid rig). No
// office-bounds clamp — this is an open world.

import { useFrame, useThree } from '@react-three/fiber'
import { useEffect } from 'react'
import { Vector3 } from 'three'
import { DRIVE_CAMERA } from './driveConfig'
import { carPosition, carFacing, carAir } from './carState'
import { crash } from './crashState'
import { terrainHeight } from './terrain'

const desired = new Vector3()
const look = new Vector3()

export function DriveCamera() {
  const { camera } = useThree()

  useEffect(() => {
    if ('fov' in camera) {
      ;(camera as { fov: number }).fov = DRIVE_CAMERA.fov
      camera.updateProjectionMatrix()
    }
  }, [camera])

  useFrame((_, delta) => {
    // Behind the car = +(sin, cos) — the opposite of forward = -(sin, cos).
    const sin = Math.sin(carFacing.y)
    const cos = Math.cos(carFacing.y)
    // Car's ACTUAL height (air-aware): equals terrain when grounded, rises on a
    // jump — so the camera lifts with the car off a crest instead of clipping
    // into the hillside.
    const ty = carAir.y
    // Camera sits behind the car; on a slope that's higher/lower ground than the
    // car. Keep it above WHICHEVER is higher (the ground under the camera, or
    // the car) so it never sinks into the hillside or flies up off a crest.
    const camX = carPosition.x + sin * DRIVE_CAMERA.distance
    const camZ = carPosition.z + cos * DRIVE_CAMERA.distance
    const camGround = terrainHeight(camX, camZ)
    desired.set(camX, Math.max(camGround, ty) + DRIVE_CAMERA.height, camZ)
    // Soft follow (clamped delta keeps it stable after a tab refocus).
    const a = 1 - Math.exp(-DRIVE_CAMERA.followRate * Math.min(delta, 0.05))
    camera.position.lerp(desired, a)

    // crash shake — jolt the camera, decaying quickly
    if (crash.shake > 0.001) {
      const t = performance.now()
      const s = crash.shake * 0.7
      camera.position.x += Math.sin(t * 0.09) * s
      camera.position.y += Math.sin(t * 0.13 + 1.7) * s * 0.6
      camera.position.z += Math.sin(t * 0.07 + 3.1) * s * 0.5
      crash.shake = Math.max(0, crash.shake - Math.min(delta, 0.05) * 3.5)
    }

    // aim slightly up/down the road ahead — but CLAMP the rise so a steep hill
    // doesn't pitch the camera into the sky and lose the car.
    const aheadX = carPosition.x - sin * DRIVE_CAMERA.lookAhead
    const aheadZ = carPosition.z - cos * DRIVE_CAMERA.lookAhead
    const rise = terrainHeight(aheadX, aheadZ) - ty
    const bias = Math.max(-3, Math.min(4.5, rise * 0.45))
    look.set(carPosition.x, ty + DRIVE_CAMERA.lookHeight + bias, carPosition.z)
    camera.lookAt(look)
  })

  return null
}
