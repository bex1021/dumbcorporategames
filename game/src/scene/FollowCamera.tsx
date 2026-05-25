// Rigid third-person follow camera: always directly behind the PM, no rotation
// lag. This keeps the controls aligned — pressing forward always walks the PM
// "into the screen", left/right always pivot PM + world around together.

import { useFrame, useThree } from '@react-three/fiber'
import { useEffect } from 'react'
import { Vector3 } from 'three'
import { CAMERA, OFFICE } from '../config/constants'
import { playerPosition, playerFacing } from '../state/playerState'

const desiredPos = new Vector3()
const lookAt = new Vector3()

export function FollowCamera() {
  const { camera } = useThree()

  useEffect(() => {
    if ('fov' in camera) {
      ;(camera as any).fov = CAMERA.fov
      camera.updateProjectionMatrix()
    }
  }, [camera])

  useFrame(() => {
    // Forward direction at facing y (after Three.js Y rotation):
    //   forward = (-sin(y), 0, -cos(y))
    // Behind PM (where camera sits) = -forward:
    //   behind = (sin(y), 0, cos(y))
    const sin = Math.sin(playerFacing.y)
    const cos = Math.cos(playerFacing.y)
    desiredPos.set(
      playerPosition.x + sin * CAMERA.distance,
      CAMERA.height,
      playerPosition.z + cos * CAMERA.distance
    )

    // Clamp camera position inside the office so it can't punch through walls.
    // When PM is near a wall, the camera naturally pulls in.
    const limX = OFFICE.halfWidth - CAMERA.boundsMargin
    const limZ = OFFICE.halfDepth - CAMERA.boundsMargin
    desiredPos.x = Math.max(-limX, Math.min(limX, desiredPos.x))
    desiredPos.z = Math.max(-limZ, Math.min(limZ, desiredPos.z))

    // Rigid follow — no lerp, no lag. Camera is glued to the "behind PM" point.
    camera.position.copy(desiredPos)

    // Always look at PM's chest height
    lookAt.set(playerPosition.x, CAMERA.lookHeight, playerPosition.z)
    camera.lookAt(lookAt)
  })

  return null
}
