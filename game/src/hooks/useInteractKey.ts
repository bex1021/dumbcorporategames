// E key opens the dialogue panel for the NPC the PM is near.
// Only fires when:
//   - phase === 'playing'
//   - no dialogue is already open
//   - no recovery panel is open (Calendar Apocalypse)
//   - PM is near an NPC
//   - that NPC has NOT been handled yet
//   - that NPC has a dialogue tree defined (Object NPCs like the printer
//     and plant don't — they just trigger their bark and don't lock movement)
//
// ESC key universally closes any open dialogue panel, as an escape hatch
// in case something gets stuck.

import { useEffect } from 'react'
import { useGameStore } from '../state/gameStore'
import { getDialogue } from '../content/dialogue'
import { OBJECT_INTERACTIONS } from '../config/constants'

export function useInteractKey() {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // ESC — always works, closes any open dialogue (safety valve).
      if (e.code === 'Escape') {
        const state = useGameStore.getState()
        if (state.activeDialogue) {
          state.closeDialogue()
        }
        return
      }

      const isE = e.code === 'KeyE' || e.key === 'e' || e.key === 'E'
      if (!isE) return
      const state = useGameStore.getState()
      if (state.phase !== 'playing') return
      if (state.activeDialogue) return
      if (state.pendingRecovery) return
      if (!state.nearbyNPC) return
      if (state.handledNPCs.has(state.nearbyNPC)) return

      // Object NPCs (printer, plant) have no dialogue tree. If they have
      // an OBJECT_INTERACTIONS entry, run that (multi-use mechanic +
      // rotating bark). Otherwise just pop the static bark.
      const dialogue = getDialogue(state.nearbyNPC)
      if (!dialogue) {
        if (OBJECT_INTERACTIONS[state.nearbyNPC]) {
          state.interactObject(state.nearbyNPC)
        } else {
          state.triggerBark(state.nearbyNPC)
        }
        return
      }
      state.openDialogue(state.nearbyNPC)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])
}
