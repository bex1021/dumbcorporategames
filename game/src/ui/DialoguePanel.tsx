// Right-side dialogue panel. Two phases:
//   1. NPC intro line + 4 choices with visible effect chips
//   2. After click: result copy + Continue button to close
//
// Locks PM movement while open (Player.tsx checks store.activeDialogue).

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

  if (!activeDialogue) return null
  const dialogue = getDialogue(activeDialogue)
  if (!dialogue) return null

  const npc = NPCS.find((n) => n.id === activeDialogue)
  if (!npc) return null

  const handleChoice = (choice: DialogueChoice) => {
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
    const npcId = activeDialogue
    markHandled(npcId)
    closeDialogue()
    triggerBark(npcId)
  }

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
          <div className="px-3 py-3 flex flex-col gap-2">
            {dialogue.choices.map((c) => (
              <ChoiceButton
                key={c.id}
                choice={c}
                onClick={() => handleChoice(c)}
              />
            ))}
          </div>
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
          </div>
        )}
      </div>
    </div>
  )
}

function ChoiceButton({
  choice,
  onClick,
}: {
  choice: DialogueChoice
  onClick: () => void
}) {
  const eff = choice.effects
  return (
    <button
      onClick={onClick}
      className="text-left p-3 rounded border border-beige-300/20 bg-ink-700/40 hover:bg-ink-700/70 hover:border-beige-300/50 transition group"
    >
      <div className="text-beige-50 group-hover:text-beige-50 text-sm leading-snug mb-1.5">
        {choice.label}
      </div>
      <div className="flex flex-wrap gap-1.5">
        {effectEntries(eff).map(([meter, value]) => (
          <EffectChip key={meter} meter={meter} value={value} />
        ))}
        {choice.delayedEffects && <LaterChip />}
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
