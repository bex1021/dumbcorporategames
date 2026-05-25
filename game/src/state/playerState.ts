import { Vector3 } from 'three'
import { PLAYER } from '../config/constants'

// Shared player transform — mutated in place by Player, read by FollowCamera.
// Not React state: avoids per-frame re-renders.
export const playerPosition = new Vector3(PLAYER.spawnX, 0, PLAYER.spawnZ)
export const playerVelocity = new Vector3(0, 0, 0) // XZ velocity in m/s
export const playerFacing = { y: 0 } // facing -Z (into office, away from PM desk)
