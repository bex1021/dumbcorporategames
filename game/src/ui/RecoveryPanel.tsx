// Calendar Apocalypse recovery panel — fires when meetingLoad ≥ 80 mid-standup
// after the player closes a dialogue. Gives one chance to decline / focus /
// delegate before the apocalypse ending lands.
//
// Two-phase UI to match DialoguePanel:
//   1. Four recovery options with visible EffectChips
//   2. Result copy + Continue button (which actually applies the effects)
//
// The fourth option ("Embrace it") is the joke choice: no meter help, lets
// the apocalypse land cleanly. Players can opt into the bad ending if they
// want. (Sometimes the calendar IS the message.)
//
// Locks PM movement + the E key while open (handled in Player.tsx and
// useInteractKey.ts by checking pendingRecovery).

import { useEffect, useState } from 'react'
import { useGameStore, type Effects } from '../state/gameStore'
import { audio } from '../audio/AudioManager'
import { EffectChip } from './EffectChip'

type RecoveryChoice = {
  id: string
  label: string
  effects: Effects
  flavor: string
  resultCopy: string
}

// Recovery choices are intentionally a 4-option pattern matching the NPC
// dialogue, but tuned so at least two routes survive (decline / focus) and
// one ends in the apocalypse anyway (embrace it).
const CHOICES: RecoveryChoice[] = [
  {
    id: 'decline',
    // Was -30 meeting; -25 is still a strong escape but no longer nuclear,
    // leaving room for Delegate (now -22) to be a real competing option.
    label: 'Decline anything without a clear owner',
    effects: { time: 10, meetingLoad: -25, pissedOff: 7, alignment: -1 },
    flavor: 'Fast cleanup. People will notice.',
    resultCopy:
      'You decline 7 meetings using only the words "will review async."\n\nThree of those organizers reach out separately to ask if everything is okay.',
  },
  {
    id: 'focus',
    label: 'Block your calendar with "Focus Time"',
    effects: { time: 15, meetingLoad: -22, pissedOff: -1, alignment: -2 },
    flavor: 'Invisible but effective. Impact suffers.',
    resultCopy:
      'Your status is now "Heads down — deep work."\n\nNo one disturbs you. No one knows you exist. Your visibility metric quietly bleeds out.',
  },
  {
    id: 'delegate',
    // Bumped -15 → -22 so this is a legitimate competitor to Decline at
    // moderate apocalypse levels; without the alignment hit Decline carries.
    label: 'Delegate the optional ones to your skip-level',
    effects: { time: 10, meetingLoad: -22, pissedOff: 2, alignment: 0 },
    flavor: 'Mild relief. Skip-level remembers nothing.',
    resultCopy:
      'You forward six meeting invites with "Adding [skip-level] for visibility."\n\nThey accept all of them and attend none. The meetings happen anyway.',
  },
  {
    id: 'embrace',
    label: 'Accept all of them. Reply "looking forward to it."',
    effects: { time: 5, alignment: 1 },
    flavor: 'Excellent visibility. Sometimes the calendar is the message.',
    resultCopy:
      'You attend back-to-back-to-back. You eat lunch on a call. You speak only in nods.\n\nThis was never recoverable.',
  },
]

export function RecoveryPanel() {
  const pendingRecovery = useGameStore((s) => s.pendingRecovery)
  const applyRecovery = useGameStore((s) => s.applyRecovery)

  // Local two-phase state: which choice did the player pick, if any?
  // null = showing the 4 choices; set = showing the result + Continue.
  const [picked, setPicked] = useState<RecoveryChoice | null>(null)

  // Ping the calendar sound the moment the panel opens. Single fire — keyed
  // off the boolean activation, not the meter value.
  useEffect(() => {
    if (pendingRecovery === 'calendar-apocalypse') {
      audio.play('calendar')
    } else {
      // Panel just closed (recovery applied or game ended). Reset local state
      // so a future apocalypse opens fresh.
      setPicked(null)
    }
  }, [pendingRecovery])

  if (pendingRecovery !== 'calendar-apocalypse') return null

  const handlePick = (choice: RecoveryChoice) => {
    setPicked(choice)
  }

  const handleContinue = () => {
    if (!picked) return
    applyRecovery(picked.effects)
    // pendingRecovery clears via applyRecovery; the useEffect above will
    // reset `picked` to null on the next render.
  }

  return (
    <div className="pointer-events-auto fixed inset-0 z-40 flex items-center justify-center bg-ink-900/70 backdrop-blur-sm p-6">
      <div className="max-w-xl w-full bg-ink-900 border border-rose-700/50 rounded-lg shadow-2xl text-beige-100 overflow-hidden">
        {/* Header */}
        <div
          className="px-5 py-4 border-b border-beige-300/20"
          style={{
            background:
              'linear-gradient(90deg, rgba(196,74,74,0.25), transparent)',
          }}
        >
          <div className="text-rose-300 text-[10px] uppercase tracking-widest mb-1">
            Calendar pressure spike
          </div>
          <h2 className="text-2xl font-medium text-beige-50">
            Your calendar is about to swallow you
          </h2>
          <p className="text-sm text-beige-300 mt-1">
            You have one move before the rest of the day disappears.
          </p>
        </div>

        {/* Body — choices OR result */}
        {!picked ? (
          <div className="px-3 py-3 flex flex-col gap-2">
            {CHOICES.map((c) => (
              <RecoveryChoiceButton
                key={c.id}
                choice={c}
                onClick={() => handlePick(c)}
              />
            ))}
          </div>
        ) : (
          <div className="px-5 py-4 flex flex-col gap-4">
            <div className="text-[15px] leading-relaxed text-beige-100 whitespace-pre-line">
              {picked.resultCopy}
            </div>
            <div className="flex flex-wrap gap-1.5">
              {effectEntries(picked.effects).map(([meter, value]) => (
                <EffectChip key={meter} meter={meter} value={value} />
              ))}
            </div>
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

function RecoveryChoiceButton({
  choice,
  onClick,
}: {
  choice: RecoveryChoice
  onClick: () => void
}) {
  const eff = choice.effects
  return (
    <button
      onClick={onClick}
      className="text-left p-3 rounded border border-beige-300/20 bg-ink-700/40 hover:bg-ink-700/70 hover:border-beige-300/50 transition group"
    >
      <div className="text-beige-50 text-sm leading-snug mb-0.5">
        {choice.label}
      </div>
      <div className="text-[11px] text-beige-300 italic mb-1.5">{choice.flavor}</div>
      <div className="flex flex-wrap gap-1.5">
        {effectEntries(eff).map(([meter, value]) => (
          <EffectChip key={meter} meter={meter} value={value} />
        ))}
      </div>
    </button>
  )
}

function effectEntries(
  eff: Effects
): Array<['time' | 'projectStatus' | 'pissedOff' | 'meetingLoad' | 'alignment', number]> {
  const order: Array<keyof Effects> = [
    'time',
    'projectStatus',
    'pissedOff',
    'meetingLoad',
    'alignment',
  ]
  return order
    .filter((k) => eff[k] !== undefined && eff[k] !== 0)
    .map((k) => [
      k as 'time' | 'projectStatus' | 'pissedOff' | 'meetingLoad' | 'alignment',
      eff[k] as number,
    ])
}
