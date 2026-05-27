// Right-side dialogue panel. Two phases:
//   1. NPC intro line + 4 choices with visible effect chips
//   2. After click: result copy + Continue button to close
//
// Keyboard shortcuts when this panel is open:
//   - 1 / 2 / 3 / 4  → pick the corresponding choice
//   - Enter / Space  → advance past the result screen (same as Continue button)
//
// Locks PM movement while open (Player.tsx checks store.activeDialogue).

import { useEffect, useRef } from 'react'
import { getDialogue, type DialogueChoice } from '../content/dialogue'
import { NPCS } from '../config/constants'
import { useGameStore, type Effects } from '../state/gameStore'
import { audio } from '../audio/AudioManager'
import { EffectChip } from './EffectChip'

export function DialoguePanel() {
  const activeDialogue = useGameStore((s) => s.activeDialogue)
  const choiceResult = useGameStore((s) => s.choiceResult)
  const applyEffects = useGameStore((s) => s.applyEffects)
  const recordChoice = useGameStore((s) => s.recordChoice)
  const markHandled = useGameStore((s) => s.markHandled)
  const closeDialogue = useGameStore((s) => s.closeDialogue)
  const triggerBark = useGameStore((s) => s.triggerBark)
  const queueDelayedEffect = useGameStore((s) => s.queueDelayedEffect)

  // Compute dialogue + NPC up-front so hooks below can reference them.
  // We CANNOT early-return before all hooks are declared (React rules).
  const dialogue = activeDialogue ? getDialogue(activeDialogue) : null
  const npc = activeDialogue ? NPCS.find((n) => n.id === activeDialogue) : null

  const handleChoice = (choice: DialogueChoice) => {
    if (!activeDialogue) return
    applyEffects(choice.effects)
    audio.play(choice.sound)
    // Queue any delayed punishment to fire after N more NPCs are handled.
    // The toast surfaces via DelayedToast — see Build 2b.
    if (choice.delayedEffects) {
      queueDelayedEffect({
        interactionsRemaining: choice.delayedEffects.delayInteractions,
        effects: choice.delayedEffects.effects,
        toastCopy: choice.delayedEffects.toastCopy,
      })
    }
    recordChoice(activeDialogue, choice.id, choice.resultCopy, choice.followUp)
  }

  const handleContinue = () => {
    if (!activeDialogue) return
    const npcId = activeDialogue
    markHandled(npcId)
    closeDialogue()
    triggerBark(npcId)
  }

  // ---- Keyboard shortcuts ----
  // The handlers above close over current state, so we route the keydown
  // through a ref to always see the latest closure. Otherwise we'd have
  // to put every dependency in the useEffect deps array, which gets
  // brittle as the panel evolves.
  const handlersRef = useRef({ handleChoice, handleContinue })
  handlersRef.current = { handleChoice, handleContinue }

  useEffect(() => {
    if (!activeDialogue || !dialogue) return
    const onKey = (e: KeyboardEvent) => {
      if (!choiceResult) {
        // Pick a choice by number key (1–4 → choices[0–3]).
        if (/^[1-4]$/.test(e.key)) {
          const index = parseInt(e.key, 10) - 1
          if (index < dialogue.choices.length) {
            e.preventDefault()
            handlersRef.current.handleChoice(dialogue.choices[index])
          }
        }
      } else {
        // Advance past the result with Enter or Space.
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          handlersRef.current.handleContinue()
        }
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [activeDialogue, choiceResult, dialogue])

  // Hooks done — now we can early-return safely.
  if (!activeDialogue || !dialogue || !npc) return null

  return (
    <div className="pointer-events-auto fixed inset-y-0 right-0 w-full max-w-md z-40 flex items-center">
      <div className="m-4 w-full bg-ink-900/95 backdrop-blur-md border border-beige-300/30 rounded-lg shadow-2xl text-beige-100 overflow-hidden">
        {/* Header */}
        <div className="px-5 py-3 border-b border-beige-300/20 flex items-center gap-3">
          <div
            className="w-3 h-3 rounded-sm"
            style={{ backgroundColor: npc.color }}
          />
          <div>
            <div className="text-beige-50 font-medium">{npc.name}</div>
            <div className="text-beige-300 text-xs uppercase tracking-widest">
              {npc.role}
            </div>
          </div>
        </div>

        {/* Intro line */}
        <div className="px-5 py-4 text-[15px] leading-relaxed border-b border-beige-300/10 italic text-beige-100">
          “{dialogue.introLine}”
        </div>

        {/* Body — choices OR result */}
        {!choiceResult ? (
          <>
            <div className="px-3 py-3 flex flex-col gap-2">
              {dialogue.choices.map((c, i) => (
                <ChoiceButton
                  key={c.id}
                  index={i + 1}
                  choice={c}
                  onClick={() => handleChoice(c)}
                />
              ))}
            </div>
            {/* Hint line — keyboard shortcuts */}
            <div className="px-5 pb-3 text-[10px] uppercase tracking-widest text-beige-300/70 text-right">
              press 1–4 to choose · ESC to close
            </div>
          </>
        ) : (
          <div className="px-5 py-4 flex flex-col gap-4">
            <div className="text-[15px] leading-relaxed text-beige-100 whitespace-pre-line">
              {choiceResult.resultCopy}
            </div>
            {choiceResult.followUp && (
              <div className="text-xs text-beige-300 border-l-2 border-beige-300/40 pl-3 italic">
                {choiceResult.followUp}
              </div>
            )}
            <button
              onClick={handleContinue}
              className="self-end mt-2 px-4 py-2 bg-beige-100 text-ink-900 font-medium rounded hover:bg-beige-50 transition"
            >
              Continue →
            </button>
            <div className="text-[10px] uppercase tracking-widest text-beige-300/70 text-right">
              press enter / space to continue
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function ChoiceButton({
  index,
  choice,
  onClick,
}: {
  index: number
  choice: DialogueChoice
  onClick: () => void
}) {
  const eff = choice.effects
  return (
    <button
      onClick={onClick}
      className="text-left p-3 rounded border border-beige-300/20 bg-ink-700/40 hover:bg-ink-700/70 hover:border-beige-300/50 transition group flex gap-3"
    >
      {/* Number badge — corresponds to the keyboard shortcut (1–4). */}
      <span className="shrink-0 mt-0.5 w-6 h-6 flex items-center justify-center rounded border border-beige-300/30 bg-ink-900/60 text-beige-100 text-xs font-mono font-semibold group-hover:border-beige-300/60">
        {index}
      </span>
      <div className="flex-1 min-w-0">
        <div className="text-beige-50 group-hover:text-beige-50 text-sm leading-snug mb-1.5">
          {choice.label}
        </div>
        <div className="flex flex-wrap gap-1.5">
          {effectEntries(eff).map(([meter, value]) => (
            <EffectChip key={meter} meter={meter} value={value} />
          ))}
          {choice.delayedEffects && <LaterChip />}
        </div>
      </div>
    </button>
  )
}

// Ambiguous "consequences later" indicator. We don't reveal the specific
// delayed effects — the uncertainty is the dynamic we want.
function LaterChip() {
  return (
    <span
      className="inline-block text-[10px] font-mono tracking-wider px-1.5 py-0.5 rounded border bg-amber-900/40 text-amber-200 border-amber-700/40"
      title="Has consequences later in the standup"
    >
      ?? later
    </span>
  )
}

function effectEntries(eff: Effects): Array<['time' | 'projectStatus' | 'pissedOff' | 'meetingLoad' | 'alignment', number]> {
  const order: Array<keyof Effects> = [
    'time',
    'projectStatus',
    'pissedOff',
    'meetingLoad',
    'alignment',
  ]
  return order
    .filter((k) => eff[k] !== undefined && eff[k] !== 0)
    .map((k) => [k as 'time' | 'projectStatus' | 'pissedOff' | 'meetingLoad' | 'alignment', eff[k] as number])
}
