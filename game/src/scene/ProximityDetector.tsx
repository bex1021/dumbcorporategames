// Tracks which NPC the PM is currently nearest to (within interact range).
// Updates the game store only when the nearest NPC changes — no per-frame
// re-renders of consumers.

import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { NPCS } from '../config/constants'
import { useGameStore } from '../state/gameStore'
import { playerPosition } from '../state/playerState'

const INTERACT_RANGE = 2.8 // meters
const INTERACT_RANGE_SQ = INTERACT_RANGE * INTERACT_RANGE

export function ProximityDetector() {
  const setNearbyNPC = useGameStore((s) => s.setNearbyNPC)
  const currentRef = useRef<string | null>(null)

  useFrame(() => {
    let nearestId: string | null = null
    let nearestDistSq = INTERACT_RANGE_SQ

    for (const npc of NPCS) {
      const dx = playerPosition.x - npc.x
      const dz = playerPosition.z - npc.z
      const dSq = dx * dx + dz * dz
      if (dSq < nearestDistSq) {
        nearestDistSq = dSq
        nearestId = npc.id
      }
    }

    if (nearestId !== currentRef.current) {
      currentRef.current = nearestId
      setNearbyNPC(nearestId)
    }
  })

  return null
}
