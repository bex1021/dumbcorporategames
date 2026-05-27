// Coping action bar — always-visible row of self-care moves the PM can use
// between NPC interactions to manage their meters. Diminishing returns
// prevent farming a single action (Vent, Vent, Vent → infinite pissedOff
// reduction). Adds a small but real layer of resource management.
//
// Positioned bottom-left to stay out of the InteractPrompt's way.
//
// Locked (visible but non-interactive) during dialogue or recovery — the PM
// can't ghost a 1:1 to go cry.

import { useState } from 'react'
import { useGameStore, type Effects } from '../state/gameStore'
import { audio } from '../audio/AudioManager'
import { playerPosition, playerFacing, playerVelocity } from '../state/playerState'
import { EffectChip } from './EffectChip'

// Bathroom interior center — must match Bathroom.tsx geometry. PM is
// teleported here when "Cry in Bathroom" fires, facing +X toward the
// mirror on the right wall.
const BATHROOM_TELEPORT = { x: 16, z: 11.5, facingY: -Math.PI / 2 }

type CopingAction = {
  id: string
  icon: string
  label: string
  // The "fresh" effects at 0 prior uses. Pissed-Off reduction scales down
  // with use count (see scaledEffects); time stays the same; alignment
  // bonus only applies to the first use.
  baseEffects: Effects
  flavor: string
}

// Time costs bumped from the initial pass — they were negligible against
// the 75-min standup budget, making coping effectively free. Now each use
// is a real time decision: Vent +5, Coffee +8, Cry +15 (heavy hitter
// but expensive), Meme +4.
const ACTIONS: CopingAction[] = [
  {
    id: 'vent',
    icon: '💬',
    label: 'Vent in DM',
    baseEffects: { time: 5, pissedOff: -8 },
    flavor: 'Slack to a trusted peer. Cathartic. Increasingly suspicious.',
  },
  {
    id: 'coffee',
    icon: '☕',
    label: 'Coffee Run',
    baseEffects: { time: 8, pissedOff: -4 },
    flavor: 'You stand near the kettle. It buys you four minutes of nothing.',
  },
  {
    id: 'bathroom',
    icon: '🚪',
    label: 'Cry in Bathroom',
    baseEffects: { time: 15, pissedOff: -12, alignment: -1 },
    flavor: 'Recharge: high. Visibility: zero. HR notices the third time.',
  },
  {
    id: 'meme',
    icon: '🖼️',
    label: 'Send Meme',
    baseEffects: { time: 4, pissedOff: -3, alignment: 1 },
    flavor: 'You post in #random. Three react with 💀. Team morale +epsilon.',
  },
]

// Pissed-off scaling by prior use count. After 4+ uses, you basically
// can't reduce pissedOff with coping anymore. Time cost stays constant.
function pissedOffScale(uses: number): number {
  if (uses <= 0) return 1.0
  if (uses === 1) return 0.6
  if (uses === 2) return 0.3
  return 0.1
}

function scaledEffects(action: CopingAction, uses: number): Effects {
  const scale = pissedOffScale(uses)
  const out: Effects = {}
  if (action.baseEffects.time !== undefined) out.time = action.baseEffects.time
  if (action.baseEffects.pissedOff !== undefined) {
    // Pissed-Off effects are always negative (they reduce stress); scale
    // toward 0 as use count rises.
    const scaled = Math.round(action.baseEffects.pissedOff * scale)
    if (scaled !== 0) out.pissedOff = scaled
  }
  // Alignment bonus only applies the first time (novelty cost).
  if (action.baseEffects.alignment !== undefined && action.baseEffects.alignment > 0) {
    if (uses === 0) out.alignment = action.baseEffects.alignment
  }
  // Alignment PENALTY (Cry in Bathroom) applies every time — HR is taking notes.
  if (action.baseEffects.alignment !== undefined && action.baseEffects.alignment < 0) {
    out.alignment = action.baseEffects.alignment
  }
  // Send Meme cringe penalty: 3rd+ post in a row starts to mildly piss
  // people off — that one guy posts way too much and everyone notices.
  if (action.id === 'meme' && uses >= 3) {
    out.pissedOff = (out.pissedOff ?? 0) + 1
  }
  return out
}

export function CopingBar() {
  const phase = useGameStore((s) => s.phase)
  const activeDialogue = useGameStore((s) => s.activeDialogue)
  const pendingRecovery = useGameStore((s) => s.pendingRecovery)
  const copingUseCounts = useGameStore((s) => s.copingUseCounts)
  const applyEffects = useGameStore((s) => s.applyEffects)
  const incrementCoping = useGameStore((s) => s.incrementCoping)
  // Which action is currently hovered — drives the floating tooltip card.
  const [hoveredId, setHoveredId] = useState<string | null>(null)

  if (phase !== 'playing') return null
  const locked = activeDialogue !== null || pendingRecovery !== null

  const handleClick = (action: CopingAction) => {
    const uses = copingUseCounts[action.id] ?? 0
    const effects = scaledEffects(action, uses)
    applyEffects(effects)
    incrementCoping(action.id)
    audio.play('slack') // soft ping for any coping action

    // Cry in Bathroom teleports the PM to the actual bathroom room
    // carved out of the front-right corner. Mutate the shared transform
    // refs directly — the Player useFrame reads playerPosition each
    // frame, so this takes effect on the next render. Zero velocity so
    // PM doesn't carry forward motion across the teleport.
    if (action.id === 'bathroom') {
      playerPosition.x = BATHROOM_TELEPORT.x
      playerPosition.z = BATHROOM_TELEPORT.z
      playerVelocity.x = 0
      playerVelocity.z = 0
      playerFacing.y = BATHROOM_TELEPORT.facingY
    }
  }

  const hoveredAction = ACTIONS.find((a) => a.id === hoveredId) ?? null
  const hoveredUses = hoveredAction ? copingUseCounts[hoveredAction.id] ?? 0 : 0

  return (
    <div
      className={`pointer-events-${locked ? 'none' : 'auto'} fixed bottom-4 left-4 z-20`}
    >
      {/* Tooltip — appears above the bar when an action is hovered.
          Shows the action's flavor + the effects that the NEXT click would
          actually apply (already scaled for diminishing returns). */}
      {hoveredAction && (
        <div className="mb-2 max-w-xs bg-ink-900/95 backdrop-blur-sm border border-beige-300/40 rounded-md shadow-2xl px-3 py-2.5">
          <div className="flex items-center gap-1.5 mb-1">
            <span className="text-base leading-none">{hoveredAction.icon}</span>
            <span className="text-beige-50 text-sm font-medium">
              {hoveredAction.label}
            </span>
          </div>
          <div className="text-beige-300 text-[11px] italic leading-snug mb-2">
            {hoveredAction.flavor}
          </div>
          {hoveredUses >= 4 ? (
            <div className="text-rose-300 text-[11px]">
              Exhausted. The bit no longer lands.
            </div>
          ) : (
            <>
              <div className="text-beige-300 text-[10px] uppercase tracking-widest mb-1">
                Next click
              </div>
              <div className="flex flex-wrap gap-1">
                {effectEntries(scaledEffects(hoveredAction, hoveredUses)).map(
                  ([meter, value]) => (
                    <EffectChip key={meter} meter={meter} value={value} />
                  )
                )}
              </div>
              {hoveredUses > 0 && (
                <div className="text-beige-300 text-[10px] mt-1.5">
                  Used {hoveredUses}× · diminishing returns
                </div>
              )}
            </>
          )}
        </div>
      )}

      <div className="bg-ink-900/85 backdrop-blur-sm rounded border border-beige-300/20 p-1.5">
        <div className="text-beige-300 text-[9px] uppercase tracking-widest px-1 mb-1">
          Coping
        </div>
        <div className="flex gap-1.5">
          {ACTIONS.map((a) => {
            const uses = copingUseCounts[a.id] ?? 0
            const exhausted = uses >= 4
            return (
              <button
                key={a.id}
                onClick={() => handleClick(a)}
                onMouseEnter={() => setHoveredId(a.id)}
                onMouseLeave={() => setHoveredId((cur) => (cur === a.id ? null : cur))}
                onFocus={() => setHoveredId(a.id)}
                onBlur={() => setHoveredId((cur) => (cur === a.id ? null : cur))}
                disabled={locked || exhausted}
                className={[
                  'flex flex-col items-center px-2 py-1 rounded border text-xs transition',
                  exhausted
                    ? 'border-beige-300/10 bg-ink-700/20 text-beige-300/40 cursor-not-allowed'
                    : 'border-beige-300/20 bg-ink-700/40 hover:bg-ink-700/70 hover:border-beige-300/50 text-beige-100 cursor-pointer',
                ].join(' ')}
              >
                <span className="text-base leading-none mb-0.5">{a.icon}</span>
                <span className="text-[10px] font-medium leading-none whitespace-nowrap">
                  {a.label}
                </span>
                <PotencyDots uses={uses} />
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// Mirror of effectEntries in DialoguePanel — same shape, same sort order.
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

function PotencyDots({ uses }: { uses: number }) {
  // 3 dots; filled = remaining potency. After 3 uses, all hollow → exhausted-ish.
  const totalSlots = 3
  const filled = Math.max(0, totalSlots - uses)
  return (
    <div className="flex gap-0.5 mt-0.5">
      {Array.from({ length: totalSlots }).map((_, i) => (
        <span
          key={i}
          className={`inline-block w-1 h-1 rounded-full ${
            i < filled ? 'bg-beige-100' : 'bg-beige-300/30'
          }`}
        />
      ))}
    </div>
  )
}
