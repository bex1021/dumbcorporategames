// The one sanctioned break from the third-person follow rule: a locked side-on
// fighter camera on the long axis of the table. Eases toward the fighters'
// midpoint and pulls in as they close (previewing the round-3 dolly).

import { useEffect } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { BODY, CAMERA } from './fightConfig'
import { leonard, opponent, renderX, renderY } from './fighterState'

export function FightCamera() {
  const { camera } = useThree()

  useEffect(() => {
    if (import.meta.env.DEV) (window as unknown as { __cam?: unknown }).__cam = camera
  }, [camera])

  useFrame(() => {
    const mid = (renderX(leonard) + renderX(opponent)) / 2
    const gap = Math.abs(renderX(opponent) - renderX(leonard))
    // Track jumps: lift the frame toward the higher fighter so heads stay in shot.
    const topY = Math.max(renderY(leonard), renderY(opponent))
    // Closer fighters → tighter framing.
    // gap now runs ~0.7 (locked up) to ~3.6 (round start) after the ×0.6 rescale
    const t = Math.min(1, Math.max(0, (gap - 1.2) / 2.4))
    let dist = CAMERA.zoomTight + (CAMERA.zoomWide - CAMERA.zoomTight) * t

    // FRAME THE TALLEST FIGHTER. The Exec stands ~1.4× a normal build, which
    // put his head above the top of frame — the camera was framing for
    // Leonard's height regardless of who he was fighting. Work out the height
    // actually on screen and back off until it fits, with headroom.
    const tallest = Math.max(1, opponent.heightScale) * BODY.height
    const needed = Math.max(tallest + topY, BODY.height) * 1.5 // + headroom
    const halfFov = (CAMERA.fov * Math.PI) / 360
    const fitDist = needed / 2 / Math.tan(halfFov)
    dist = Math.max(dist, fitDist)

    const tx = mid
    const tz = dist
    camera.position.x += (tx - camera.position.x) * CAMERA.followLerp
    camera.position.z += (tz - camera.position.z) * CAMERA.followLerp
    // Aim between the two fighters' centres of mass, so a towering opponent
    // lifts the shot instead of hanging out of the top of it.
    const aimY = (BODY.height + tallest) / 4 + topY * 0.4
    camera.position.y += (aimY + 0.5 - camera.position.y) * CAMERA.followLerp
    camera.lookAt(mid, aimY, 0)
  })

  return null
}
