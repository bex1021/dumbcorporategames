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
import { pointInBuilding } from './cityLayout'

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
    // Boom length is normally the configured distance, but if a building sits
    // behind the car the camera would end up inside a wall — so march the boom
    // in until the camera point is clear. The floor is 5 m: closer than that and
    // the steep look-down drops the car to the very bottom of the frame (where
    // the HUD bar hides it), so we'd rather accept a little wall than lose the
    // car. That still lifts the camera out of the deep-inside-a-building case.
    let dist = DRIVE_CAMERA.distance
    while (dist > 5 && pointInBuilding(carPosition.x + sin * dist, carPosition.z + cos * dist, 1.0)) {
      dist -= 0.5
    }
    const camX = carPosition.x + sin * dist
    const camZ = carPosition.z + cos * dist
    const camGround = terrainHeight(camX, camZ)
    // Scale height with the boom so the look-DOWN angle (and thus the car's spot
    // on screen) stays constant when the boom pulls in near a building — a short
    // boom at full height would look down too steeply and drop the car low.
    const camHeight = DRIVE_CAMERA.height * Math.max(0.66, dist / DRIVE_CAMERA.distance)
    desired.set(camX, Math.max(camGround, ty) + camHeight, camZ)
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

    // Aim a touch up/down the road ahead for a sense of the grade — but the
    // UP bias is capped HARD (+1.2 m). Any higher and the look-target rises above
    // the camera, pitching it up to look up the hill and dropping the car clean
    // off the bottom of the frame (the "where's my car?" bug). Downhill bias can
    // be larger since looking down only raises the car in frame, never hides it.
    const aheadX = carPosition.x - sin * DRIVE_CAMERA.lookAhead
    const aheadZ = carPosition.z - cos * DRIVE_CAMERA.lookAhead
    const rise = terrainHeight(aheadX, aheadZ) - ty
    const bias = Math.max(-2.5, Math.min(1.2, rise * 0.2))
    look.set(carPosition.x, ty + DRIVE_CAMERA.lookHeight + bias, carPosition.z)
    camera.lookAt(look)
  })

  return null
}
