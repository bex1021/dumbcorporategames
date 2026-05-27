// Ambient Slack ticker. Picks a random AMBIENT_POOL message every
// 25-45 seconds while phase === 'playing'. Avoids repeating the most-recent
// few picks to keep the feed varied.
//
// Every new message plays the Slack knock (audio file, see AudioManager) —
// the older rate limit was removed per user direction so each ping is
// audible. Spacing comes from the random interval (25-45s) itself, plus
// the gate against active-dialogue / recovery / ended phases.

import { useEffect, useRef } from 'react'
import { AMBIENT_POOL } from '../content/slack'
import { useGameStore } from '../state/gameStore'
import { audio } from '../audio/AudioManager'

// Slowed from 25-45s → 45-90s after the audit flagged that ambient pings
// were too frequent: a 5-minute run got 10+ Slack knocks, making the
// "Permanent Lurker" achievement (never open Slack) feel like a denial-of-
// service rather than a play style, and pushing "Inbox Zero" (<5 unread)
// out of reach without deliberate Slack-flicking. Doubling the interval
// roughly halves the per-run ping count.
const MIN_INTERVAL_MS = 45_000
const MAX_INTERVAL_MS = 90_000
const REPEAT_AVOIDANCE = 6

export function useSlackTicker() {
  const recentIdsRef = useRef<number[]>([])

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>
    let cancelled = false

    const tick = () => {
      const state = useGameStore.getState()
      // Only tick during active gameplay. Pause for intro / ended / recovery
      // (recovery is its own panel; we don't want pings competing for focus).
      if (
        state.phase === 'playing' &&
        !state.activeDialogue &&
        !state.pendingRecovery &&
        !state.ending
      ) {
        const pick = pickAmbient(recentIdsRef.current)
        recentIdsRef.current = [...recentIdsRef.current, pick.index].slice(-REPEAT_AVOIDANCE)

        useGameStore.getState().pushSlackMessage({
          npcId: pick.template.npcId,
          npcName: pick.template.npcName,
          channel: pick.template.channel,
          text: pick.template.text,
          isDelayed: false,
        })

        // Every ambient ping plays the Slack knock — no rate limit. Overlap
        // is fine: AudioBufferSourceNode handles concurrent plays cleanly.
        audio.play('slack')
      }
      if (!cancelled) {
        timer = setTimeout(tick, randomInterval())
      }
    }

    timer = setTimeout(tick, randomInterval())
    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [])
}

function randomInterval(): number {
  return MIN_INTERVAL_MS + Math.random() * (MAX_INTERVAL_MS - MIN_INTERVAL_MS)
}

function pickAmbient(recentIds: number[]): { index: number; template: typeof AMBIENT_POOL[number] } {
  // Try a few times to avoid recent repeats; fall back to any pick if pool small.
  for (let attempt = 0; attempt < 8; attempt++) {
    const index = Math.floor(Math.random() * AMBIENT_POOL.length)
    if (!recentIds.includes(index)) {
      return { index, template: AMBIENT_POOL[index] }
    }
  }
  const index = Math.floor(Math.random() * AMBIENT_POOL.length)
  return { index, template: AMBIENT_POOL[index] }
}
