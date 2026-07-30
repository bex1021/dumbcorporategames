// Keyboard → Leonard's Intent, with the two forgiveness systems a fighter
// lives or dies on: an input BUFFER (a press just before you can act still
// fires — blueprint feel-floor item #3) and double-tap dash detection.
//
// Module-global, read once per fixed sim step by FightWorld. Single-key
// everything (J/K/S/L + A/D), matching the campaign's keyboard-only fiction.
//
// NOTE: the design locks the special to a J+K chord; chord detection muddies
// feel-testing, so the graybox binds it to a clean key (I). Build F swaps in
// the real J+K chord once the fight feel is proven.

import { MOVE, FEEL, FRAME } from './fightConfig'
import { leonard, type Intent } from './fighterState'

const held = { left: false, right: false, block: false }
let bufMove: string | null = null
let bufAt = 0
// Jump and dash are BUFFERED the same way attacks are. They used to be raw
// one-frame pulses that readLeonardIntent cleared on sight — so a W or a
// double-tap pressed while you were mid-recovery, mid-landing or in hitstun
// was consumed here, ignored by the sim (which only reads intent when you're
// actionable), and silently thrown away. That is the "jumping feels
// unresponsive" report: the input wasn't late, it was deleted.
let bufJumpAt = -1
let bufDash: -1 | 0 | 1 = 0
let bufDashAt = -1
const lastTap = { left: -1, right: -1 }

const BUFFER_S = FEEL.inputBufferFrames * FRAME
const now = () => performance.now() / 1000

const KEY: Record<string, string> = {
  KeyJ: 'clarify',
  KeyK: 'pushback',
  KeyL: 'offline',
  KeyI: 'phased',
}

function onKeyDown(e: KeyboardEvent): void {
  if (e.repeat) return // ignore auto-repeat
  switch (e.code) {
    case 'KeyA':
    case 'ArrowLeft':
      e.preventDefault()
      if (now() - lastTap.left < MOVE.doubleTapWindow) { bufDash = -1; bufDashAt = now() }
      lastTap.left = now()
      held.left = true
      return
    case 'KeyD':
    case 'ArrowRight':
      e.preventDefault()
      if (now() - lastTap.right < MOVE.doubleTapWindow) { bufDash = 1; bufDashAt = now() }
      lastTap.right = now()
      held.right = true
      return
    case 'KeyS':
    case 'ArrowDown':
      e.preventDefault()
      held.block = true
      return
    case 'KeyW':
    case 'ArrowUp':
      e.preventDefault()
      bufJumpAt = now() // tap up = jump (genre-standard: a direction, not a button)
      return
  }
  let move = KEY[e.code]
  if (move) {
    // DERAIL (hostile UI): while the conversation is derailed, your attack
    // keys stop meaning what they meant — J and K swap for 3s (🔀 shown).
    if (leonard.keySwapT > 0) {
      if (move === 'clarify') move = 'pushback'
      else if (move === 'pushback') move = 'clarify'
    }
    bufMove = move
    bufAt = now()
  }
}

function onKeyUp(e: KeyboardEvent): void {
  switch (e.code) {
    case 'KeyA':
    case 'ArrowLeft':
      held.left = false
      return
    case 'KeyD':
    case 'ArrowRight':
      held.right = false
      return
    case 'KeyS':
    case 'ArrowDown':
      held.block = false
      return
  }
}

export function initFightInput(): void {
  window.addEventListener('keydown', onKeyDown)
  window.addEventListener('keyup', onKeyUp)
}

export function disposeFightInput(): void {
  window.removeEventListener('keydown', onKeyDown)
  window.removeEventListener('keyup', onKeyUp)
  held.left = held.right = held.block = false
  bufMove = null
  bufDash = 0
  bufDashAt = -1
  bufJumpAt = -1
}

/** The player's intent for this sim frame. Buffered attack auto-expires; the
 *  fighter consumes it only when actionable, so buffering across recovery
 *  works without double-firing (all moves outlast the buffer window). */
export function readLeonardIntent(): Intent {
  const walk = ((held.right ? 1 : 0) - (held.left ? 1 : 0)) as -1 | 0 | 1
  const t = now()

  // Everything below survives its whole buffer window instead of being wiped
  // on the first read, so an input pressed a fraction early is still there on
  // the frame you become actionable.
  //
  // INVARIANT: the buffer window must stay SHORTER than the shortest action it
  // can trigger (jab ≈ 25 frames, dash 14, a hop ≈ 42). That is what stops one
  // press firing twice — by the time you're free again the buffer has lapsed,
  // so no explicit "consume" step is needed. Do not raise
  // FEEL.inputBufferFrames past ~14 without revisiting this.
  let move: string | null = null
  if (bufMove) {
    if (t - bufAt <= BUFFER_S) move = bufMove
    else bufMove = null
  }
  const jump = bufJumpAt >= 0 && t - bufJumpAt <= BUFFER_S
  if (bufJumpAt >= 0 && t - bufJumpAt > BUFFER_S) bufJumpAt = -1

  let dash: -1 | 0 | 1 = 0
  if (bufDash !== 0) {
    if (t - bufDashAt <= BUFFER_S) dash = bufDash
    else bufDash = 0
  }

  return { walk, dash, block: held.block, move, jump }
}
