// Bottom-center HUD: shows the interact prompt when PM is near an NPC,
// falls back to the controls hint when nothing's in range.
// Both keyboard (E) and click trigger dialogue.
// Handled NPCs show a muted "handled" tag instead of an interact prompt.

import { NPCS, OBJECT_INTERACTIONS } from '../config/constants'
import { useGameStore } from '../state/gameStore'
import { getDialogue } from '../content/dialogue'

export function InteractPrompt() {
  const nearbyNPC = useGameStore((s) => s.nearbyNPC)
  const handled = useGameStore((s) => s.handledNPCs)
  const openDialogue = useGameStore((s) => s.openDialogue)
  const triggerBark = useGameStore((s) => s.triggerBark)
  const interactObject = useGameStore((s) => s.interactObject)
  const activeDialogue = useGameStore((s) => s.activeDialogue)
  const copingUseCounts = useGameStore((s) => s.copingUseCounts)

  const npc = nearbyNPC ? NPCS.find((n) => n.id === nearbyNPC) : null
  const isHandled = npc ? handled.has(npc.id) : false
  // Object-NPC interaction config (if any) — drives the action label + progress.
  const objectConfig = npc ? OBJECT_INTERACTIONS[npc.id] : undefined
  const objectUses = npc ? copingUseCounts[npc.id] ?? 0 : 0
  const objectExhausted = objectConfig ? objectUses >= objectConfig.maxUses : false
  // Object interactions stay clickable until exhausted; stakeholder NPCs
  // stop being clickable once their dialogue is handled.
  const canClick =
    !!npc && !activeDialogue && (objectConfig ? !objectExhausted : !isHandled)

  // Object NPCs: if they have an OBJECT_INTERACTIONS entry, run the
  // multi-use mechanic. Otherwise just pop the static bark. Stakeholder
  // NPCs open dialogue.
  const handleClick = () => {
    if (!canClick || !npc) return
    if (!getDialogue(npc.id)) {
      if (OBJECT_INTERACTIONS[npc.id]) {
        interactObject(npc.id)
      } else {
        triggerBark(npc.id)
      }
      return
    }
    openDialogue(npc.id)
  }

  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-4 flex justify-center">
      {npc ? (
        isHandled ? (
          // Handled stakeholder NPCs: show their bark line instead of a prompt.
          <div className="bg-ink-900/75 backdrop-blur-sm px-4 py-2 rounded text-beige-100 font-mono text-xs tracking-wider border border-beige-300/30 max-w-xl">
            <span className="text-emerald-400 mr-2">✓</span>
            <span className="text-beige-300">{npc.name}:</span>{' '}
            <span className="italic">{npc.bark}</span>
          </div>
        ) : objectConfig && objectExhausted ? (
          // Maxed-out object interaction (printer/phyllis): muted prompt with
          // the achievement-style completion mark.
          <div className="bg-ink-900/75 backdrop-blur-sm px-4 py-2 rounded text-beige-100 font-mono text-xs tracking-wider border border-amber-500/40 max-w-xl">
            <span className="text-amber-300 mr-2">★</span>
            <span className="text-beige-300">{npc.name}:</span>{' '}
            <span className="italic">{objectConfig.exhaustedBark}</span>
          </div>
        ) : (
          // Active prompt: keyboard hint + clickable button
          <button
            onClick={handleClick}
            disabled={!canClick}
            className="pointer-events-auto bg-ink-900/85 backdrop-blur-sm px-5 py-2.5 rounded text-beige-100 font-mono text-sm tracking-wider border border-beige-300/40 shadow-lg hover:border-beige-100/60 hover:bg-ink-900/95 transition disabled:opacity-60 cursor-pointer"
          >
            <span className="inline-block w-6 h-6 mr-2 -ml-1 align-middle bg-beige-100 text-ink-900 rounded text-center font-bold text-xs leading-6">
              E
            </span>
            {objectConfig ? (
              // Multi-use object: "Unjam the printer (3/5)"
              <span>
                {objectConfig.actionLabel}{' '}
                <span className="text-beige-300">
                  ({objectUses}/{objectConfig.maxUses})
                </span>
              </span>
            ) : npc.role === 'Object' ? (
              <span>Interact with {npc.name}</span>
            ) : npc.role === 'Plant' ? (
              <span>Sit with {npc.name}</span>
            ) : (
              <span>
                Talk to <span className="text-beige-50 font-medium">{npc.name}</span>{' '}
                <span className="text-beige-300">· {npc.role}</span>
              </span>
            )}
          </button>
        )
      ) : (
        <div className="bg-ink-900/65 backdrop-blur-sm px-4 py-2 rounded text-beige-300 font-mono text-xs tracking-wider">
          ↑ forward · ↓ back · ← → turn · approach an NPC to interact
        </div>
      )}
    </div>
  )
}
