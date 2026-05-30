import { create, type StoreApi, type UseBoundStore } from 'zustand'
import {
  evaluateAchievements,
  loadUnlocked,
  saveUnlocked,
  type RunSnapshot,
} from '../content/achievements'
import { STARTER_PINGS } from '../content/slack'
import { OBJECT_INTERACTIONS } from '../config/constants'
import { slapState } from './slapState'

// ---- Meter thresholds (named tiers from blueprint v0.3) ----

export const PROJECT_TIERS = [
  { min: 70, label: 'Green', color: '#4ea96b' },
  { min: 40, label: 'Yellow', color: '#d4a93a' },
  { min: 0, label: 'Red', color: '#c44a4a' },
] as const

export const PISSED_OFF_TIERS = [
  { min: 90, label: 'Meltdown', color: '#8b1a1a' },
  { min: 75, label: 'Glassdoor Draft', color: '#b03030' },
  { min: 60, label: 'Looping In Leadership', color: '#c4633a' },
  { min: 40, label: 'Per My Last Email', color: '#d4933a' },
  { min: 20, label: 'Slightly Tight Smile', color: '#c4a93a' },
  { min: 0, label: 'Fine', color: '#7aa66c' },
] as const

export const MEETING_LOAD_TIERS = [
  // Trigger lowered 80 → 75: the meeting-heavy choices cost so much time that
  // no path could reach 80 before the 90-min deadline (peak was 79), making the
  // recovery panel + Calendar Apocalypse ending + achievement unreachable.
  // 75 still needs ~4 of 5 stakeholders handled as meetings — deliberate
  // over-scheduling, not an accident. (Found by the Phase-1 playtest harness.)
  { min: 75, label: 'Calendar Apocalypse', color: '#8b1a1a' },
  { min: 60, label: 'Pre-Read Required', color: '#b04a30' },
  { min: 40, label: 'Concerning', color: '#c4933a' },
  { min: 20, label: 'Manageable', color: '#c4a93a' },
  { min: 0, label: 'Low', color: '#7aa66c' },
] as const

export const ALIGNMENT_TIERS = [
  { min: 8, label: 'Aggressively Aligned', color: '#4ea96b' },
  { min: 4, label: 'Sufficient Artifacts', color: '#7aa66c' },
  { min: 0, label: 'Performative Flailing', color: '#c4a93a' },
] as const

export function tierFor<T extends { min: number; label: string; color: string }>(
  tiers: readonly T[],
  value: number
): T {
  // tiers are listed high-to-low; find first whose min is <=
  for (const t of tiers) {
    if (value >= t.min) return t
  }
  return tiers[tiers.length - 1]
}

// ---- Effect chip shape ----

export type Effects = Partial<{
  time: number // minutes
  projectStatus: number
  pissedOff: number
  meetingLoad: number
  alignment: number
}>

// A delayed effect waiting in the queue. interactionsRemaining counts down
// each time markHandled fires; when it hits 0 the effects apply and the
// toastCopy is surfaced via recentDelayedToast.
export type QueuedDelayedEffect = {
  interactionsRemaining: number
  effects: Effects
  toastCopy: string
}

// A single message in the Slack panel feed.
export type SlackMessage = {
  id: string // unique
  npcId: string // matches NPCS color palette where applicable
  npcName: string
  channel: string // '#engineering' | '#design' | '#general' | 'DM' | etc
  text: string
  timestamp: number // ms since startGame (used for "now / 1m / 5m ago" display)
  isDelayed: boolean // true if pushed by the delayed-effect queue (highlighted)
}

// ---- Store ----

const WIN_NPC_COUNT = 5 // required NPC roster: Brent, Tasha, Priya, Chad, Diane

// Soft deadline: standup starts at 9:00 AM + this many minutes (so 10:15 AM
// for budget=75). Past the deadline the standup "starts without you" — the
// run still completes if you finish handling all 5 NPCs, but the performance
// rating takes a penalty per minute late. See LATE_PENALTY_PER_MINUTE.
export const STANDUP_TIME_MINUTES = 75
export const LATE_PENALTY_PER_MINUTE = 2
// Hard fail deadline: the 10:15 standup is at 75 min; you get a 15-minute
// grace, then it's over. Cross 90 min (10:30 AM) and the run ends in a loss
// no matter your meters. Closes the "take forever, never fail" exploit.
export const HARD_DEADLINE_MINUTES = 90

export type Ending =
  | 'standup-complete'
  | 'green-enough'
  | 'pyrrhic-alignment'
  | 'full-escalation'
  | 'calendar-apocalypse'
  | 'missed-standup'

type State = {
  // Meters
  timeMinutes: number // minutes since 9:00 AM
  projectStatus: number // 0–100
  pissedOff: number // 0–100
  meetingLoad: number // 0–100
  alignment: number // 0+ (Corporate Progress)

  // Progress tracking
  handledNPCs: Set<string>
  copingUseCounts: Record<string, number>

  // Per-NPC choice memory — populated by recordChoice (which fires when a
  // player picks a dialogue option, before Continue). Sprint Retrospective
  // ending reads this to place tickets in their final columns based on
  // which option the player picked for each stakeholder.
  npcChoices: Record<string, string>

  // Phase
  phase: 'intro' | 'playing' | 'ended'
  ending: Ending | null

  // Proximity (which NPC is the player currently near, if any)
  nearbyNPC: string | null

  // Dialogue state
  activeDialogue: string | null // NPC id with open dialogue panel
  choiceResult: {
    npcId: string
    choiceId: string
    resultCopy: string
    followUp?: string
  } | null

  // The NPC whose bark line is currently floating (after dialogue close OR
  // a one-shot object interaction). Cleared automatically after a few seconds.
  recentBarkNPC: string | null
  // Optional override text. When null, BarkBubble falls back to the NPC's
  // static `bark` field. We set this for object-interaction bursts where
  // the text rotates per use (printer, Phyllis).
  recentBarkText: string | null

  // When meetingLoad crosses 80 mid-standup we don't immediately end the game.
  // We pause for a recovery panel — one chance for the PM to claw back some
  // meeting load (decline, delegate, focus-time) before chaos lands.
  // null = no recovery active. The recovery panel only renders while this is set.
  pendingRecovery: 'calendar-apocalypse' | null

  // Delayed effects queue — see QueuedDelayedEffect. Each entry counts down
  // on every markHandled and fires when interactionsRemaining hits 0.
  pendingDelayedEffects: QueuedDelayedEffect[]

  // Toast surface for the most-recently-fired delayed effect. Auto-clears
  // after ~5 seconds (similar pattern to recentBarkNPC).
  recentDelayedToast: string | null

  // Run-scoped achievement-tracking flags. Reset on reset(); evaluated when
  // the game ends to determine which achievements unlocked.
  runRecoveryTriggered: boolean
  runDelayedFireCount: number
  // Has the player opened the Slack panel at any point this run? Used by
  // the Permanent Lurker achievement (false at end of run) and Inbox Zero
  // (true + low unread at end).
  runSlackOpened: boolean

  // Persisted across runs via localStorage. Set of achievement IDs ever
  // unlocked by this player. Newly-unlocked IDs from the most recent run
  // are tracked in lastUnlockedAchievements (only the *first-time-ever*
  // unlocks — used for the "NEW" badge). earnedThisRun captures *every*
  // achievement whose condition was met by the run that just ended, even
  // ones the player already had — that's what drives the ending-screen
  // pop-in celebration so it fires on every replay.
  unlockedAchievements: Set<string>
  lastUnlockedAchievements: string[]
  earnedThisRun: string[]

  // Slack panel — ambient flavor pings + delayed-effect notifications all
  // flow through this single feed. unreadCount = messages added while
  // slackOpen=false. opening the panel clears it.
  slackMessages: SlackMessage[]
  slackOpen: boolean
  unreadSlack: number

  // Actions
  startGame: () => void
  applyEffects: (e: Effects) => void
  // Accrue game-time from walking. Called by Player.tsx as the PM moves
  // (distance-based, so standing still is free). Trips the hard deadline.
  addWalkTime: (minutes: number) => void
  markHandled: (npcId: string) => void
  incrementCoping: (actionId: string) => void
  setNearbyNPC: (npcId: string | null) => void
  openDialogue: (npcId: string) => void
  closeDialogue: () => void
  // triggerBark — pop a floating bark over the NPC. Optional `text` override
  // for one-shot interactions (rotating barks); otherwise the BarkBubble
  // falls back to the NPC's static `bark` field from constants.
  triggerBark: (npcId: string, text?: string) => void
  // Object-NPC interaction (Printer, Phyllis). Increments use count,
  // applies effects, pops the bark line for this press.
  interactObject: (npcId: string) => void
  recordChoice: (
    npcId: string,
    choiceId: string,
    resultCopy: string,
    followUp?: string
  ) => void
  applyRecovery: (e: Effects) => void
  queueDelayedEffect: (d: QueuedDelayedEffect) => void
  clearDelayedToast: () => void
  // Slack actions — see SlackMessage. pushSlackMessage handles both ambient
  // ticker pings and delayed-effect surfacing (isDelayed flag).
  pushSlackMessage: (msg: Omit<SlackMessage, 'id' | 'timestamp'>) => void
  toggleSlack: () => void
  closeSlack: () => void
  endGame: (ending: Ending) => void
  reset: () => void
}

const INITIAL: Omit<
  State,
  | 'startGame'
  | 'applyEffects'
  | 'addWalkTime'
  | 'markHandled'
  | 'incrementCoping'
  | 'setNearbyNPC'
  | 'openDialogue'
  | 'closeDialogue'
  | 'triggerBark'
  | 'interactObject'
  | 'recordChoice'
  | 'applyRecovery'
  | 'queueDelayedEffect'
  | 'clearDelayedToast'
  | 'pushSlackMessage'
  | 'toggleSlack'
  | 'closeSlack'
  | 'endGame'
  | 'reset'
> = {
  timeMinutes: 0,
  // Starting buffer tuned (Build 1c) so the chaos endings (full-escalation /
  // calendar-apocalypse) are actually reachable with deliberately bad play.
  // 80 gives ~30 points of project headroom; worst-case dialogue path drops
  // ~36 points, landing the player just under the red threshold.
  projectStatus: 80,
  pissedOff: 10,
  meetingLoad: 5,
  alignment: 0,
  handledNPCs: new Set<string>(),
  copingUseCounts: {},
  npcChoices: {},
  phase: 'intro',
  ending: null,
  nearbyNPC: null,
  activeDialogue: null,
  choiceResult: null,
  recentBarkNPC: null,
  recentBarkText: null,
  pendingRecovery: null,
  pendingDelayedEffects: [],
  recentDelayedToast: null,
  runRecoveryTriggered: false,
  runDelayedFireCount: 0,
  runSlackOpened: false,
  // Filled in at store creation from localStorage; INITIAL has the default
  // empty set so the reset() spread doesn't wipe achievements.
  unlockedAchievements: new Set<string>(),
  lastUnlockedAchievements: [],
  earnedThisRun: [],
  slackMessages: [],
  slackOpen: false,
  unreadSlack: 0,
}

const BARK_DURATION_MS = 3500
const DELAYED_TOAST_DURATION_MS = 5500

const REQUIRED_NPC_IDS = ['brent', 'tasha', 'priya', 'chad', 'diane']

// HMR-safe singleton. In dev, Vite can hot-reload this module multiple
// times (every time we edit gameStore.ts OR any module that imports it).
// Each re-evaluation would normally call `create()` again and produce a
// NEW store — leaving components subscribed to the OLD store while writes
// (like setNearbyNPC from ProximityDetector) hit the NEW one. Symptom:
// the InteractPrompt button shows "Talk to Brent" but pressing E sees
// nearbyNPC=null because useInteractKey reads from a different store.
//
// Stashing the store on globalThis under a Symbol key guarantees that all
// module instances find the same store object. State persists across HMR.
const STORE_KEY = Symbol.for('blocked.gameStore.v1')
// Explicit Zustand store type — without this, TS infers a union from the
// `existing ?? (...)` expression below that's too ambiguous to call as a
// hook (production build fails with TS2349 "expression is not callable").
type GameStoreHook = UseBoundStore<StoreApi<State>>
type GlobalWithStore = typeof globalThis & {
  [STORE_KEY]?: GameStoreHook
}

const existing = (globalThis as GlobalWithStore)[STORE_KEY]

export const useGameStore: GameStoreHook =
  existing ??
  ((globalThis as GlobalWithStore)[STORE_KEY] = create<State>((set, get) => ({
  ...INITIAL,
  // Hydrate persisted achievements at store creation. Overrides the empty
  // Set from INITIAL. reset() also re-reads via INITIAL spread + reseed below.
  unlockedAchievements: loadUnlocked(),

  startGame: () => {
    // Seed the Slack feed with starter pings so the channel feels "alive"
    // the moment the player walks in. Marked as not-delayed.
    const now = Date.now()
    const seeded: SlackMessage[] = STARTER_PINGS.map((p, i) => ({
      id: `seed-${i}`,
      npcId: p.npcId,
      npcName: p.npcName,
      channel: p.channel,
      text: p.text,
      timestamp: now - (STARTER_PINGS.length - i) * 30_000, // staggered "minutes ago"
      isDelayed: false,
    }))
    set({ phase: 'playing', slackMessages: seeded, unreadSlack: seeded.length })
  },

  applyEffects: (e) =>
    set((s) => {
      const timeMinutes = s.timeMinutes + (e.time ?? 0)
      const projectStatus = clamp(s.projectStatus + (e.projectStatus ?? 0), 0, 100)
      const pissedOff = clamp(s.pissedOff + (e.pissedOff ?? 0), 0, 100)
      const meetingLoad = clamp(s.meetingLoad + (e.meetingLoad ?? 0), 0, 100)
      const alignment = Math.max(0, s.alignment + (e.alignment ?? 0))
      const base = { timeMinutes, projectStatus, pissedOff, meetingLoad, alignment }
      // Hard deadline: a costly choice (e.g. a +30m option, or Cry in
      // Bathroom's +15m) can push you past 10:30 — that's a loss.
      if (s.phase === 'playing' && timeMinutes >= HARD_DEADLINE_MINUTES) {
        return { ...base, ...missedStandupPatch(s, base) }
      }
      return base
    }),

  // Walking burns the clock. Player.tsx feeds whole game-minutes here as the
  // PM moves around. Trips the same hard deadline as everything else.
  addWalkTime: (minutes) =>
    set((s) => {
      if (s.phase !== 'playing' || minutes <= 0) return {}
      const timeMinutes = s.timeMinutes + minutes
      if (timeMinutes >= HARD_DEADLINE_MINUTES) {
        return {
          timeMinutes,
          ...missedStandupPatch(s, {
            timeMinutes,
            projectStatus: s.projectStatus,
            pissedOff: s.pissedOff,
            meetingLoad: s.meetingLoad,
            alignment: s.alignment,
          }),
        }
      }
      return { timeMinutes }
    }),

  markHandled: (npcId) => {
    // Compute the patch outside set() so we can also schedule the toast
    // auto-clear (setTimeout) without nesting effects inside the reducer.
    const s = get()
    const next = new Set(s.handledNPCs)
    next.add(npcId)

    // Drain the delayed-effects queue (Build 2b): every NPC handled
    // decrements the counters; any counter ≤ 0 fires its effects NOW and
    // is removed. Multiple toasts concatenate into one recentDelayedToast.
    // Fires BEFORE failure checks so a delayed punishment can legitimately
    // end the game ("reality clears its throat" → BAM, escalation).
    let projectStatus = s.projectStatus
    let pissedOff = s.pissedOff
    let meetingLoad = s.meetingLoad
    let alignment = s.alignment
    let timeMinutes = s.timeMinutes
    const remainingQueue: QueuedDelayedEffect[] = []
    const firedToasts: string[] = []
    for (const q of s.pendingDelayedEffects) {
      const newRemaining = q.interactionsRemaining - 1
      if (newRemaining <= 0) {
        const e = q.effects
        projectStatus = clamp(projectStatus + (e.projectStatus ?? 0), 0, 100)
        pissedOff = clamp(pissedOff + (e.pissedOff ?? 0), 0, 100)
        meetingLoad = clamp(meetingLoad + (e.meetingLoad ?? 0), 0, 100)
        alignment = Math.max(0, alignment + (e.alignment ?? 0))
        timeMinutes = timeMinutes + (e.time ?? 0)
        firedToasts.push(q.toastCopy)
      } else {
        remainingQueue.push({ ...q, interactionsRemaining: newRemaining })
      }
    }

    // Run-scoped achievement counters: delayed fires accumulate over the run.
    const runDelayedFireCount = s.runDelayedFireCount + firedToasts.length

    // Persist delayed-effect notifications into the Slack feed so the player
    // can scroll back to them — the top-center toast is ephemeral, the panel
    // is the receipt log.
    const slackPushed: SlackMessage[] = firedToasts.map((t, i) => ({
      id: `delayed-${Date.now()}-${i}`,
      npcId: 'system',
      npcName: 'Notifications',
      channel: '#notifications',
      text: t,
      isDelayed: true,
      timestamp: Date.now(),
    }))
    const slackPatch =
      slackPushed.length > 0
        ? {
            slackMessages: [...s.slackMessages, ...slackPushed].slice(-60),
            unreadSlack: s.slackOpen ? s.unreadSlack : s.unreadSlack + slackPushed.length,
          }
        : {}

    const meterPatch = {
      projectStatus,
      pissedOff,
      meetingLoad,
      alignment,
      timeMinutes,
      pendingDelayedEffects: remainingQueue,
      runDelayedFireCount,
      ...slackPatch,
    }
    const toastPatch: { recentDelayedToast?: string } =
      firedToasts.length > 0 ? { recentDelayedToast: firedToasts.join('\n\n') } : {}

    // Local helper: when this branch ends the game, evaluate achievements
    // against final state and persist. Returns the unlock patch to merge in.
    const endingPatch = (ending: Ending) =>
      finalizeAchievements(
        {
          ending,
          projectStatus,
          pissedOff,
          meetingLoad,
          alignment,
          timeMinutes,
          copingUseCounts: s.copingUseCounts,
          recoveryTriggered: s.runRecoveryTriggered,
          delayedFireCount: runDelayedFireCount,
          slackOpenedAtAll: s.runSlackOpened,
          finalUnreadSlack: s.unreadSlack,
        },
        s.unlockedAchievements
      )

    // Failure checks now run against UPDATED meters (post-delayed-fire).
    if (pissedOff >= 75 || projectStatus < 45) {
      set({
        ...meterPatch,
        ...toastPatch,
        handledNPCs: next,
        phase: 'ended',
        ending: 'full-escalation',
        ...endingPatch('full-escalation'),
      })
    } else if (meetingLoad >= 75) {
      // Recovery panel coming up — game not ended yet; just flag the trigger
      // for achievement evaluation later when the run actually finishes.
      // Threshold 75 (was 80): see MEETING_LOAD_TIERS note — 80 was unreachable.
      set({
        ...meterPatch,
        ...toastPatch,
        handledNPCs: next,
        pendingRecovery: 'calendar-apocalypse',
        runRecoveryTriggered: true,
      })
    } else {
      const allHandled = REQUIRED_NPC_IDS.every((id) => next.has(id))
      if (!allHandled) {
        set({ ...meterPatch, ...toastPatch, handledNPCs: next })
      } else {
        // Pick ending based on (updated) meter state.
        // The pyrrhic-alignment check comes BEFORE standup-complete /
        // green-enough so that an "alignment ≥ 8 but team is furious" run
        // gets its own ending rather than landing in the clean-win bucket.
        let ending: Ending
        if (pissedOff >= 75) ending = 'full-escalation'
        else if (meetingLoad >= 75) ending = 'calendar-apocalypse'
        else if (projectStatus < 45) ending = 'full-escalation'
        else if (alignment >= 6 && pissedOff >= 40) ending = 'pyrrhic-alignment'
        else if (projectStatus < 70) ending = 'green-enough'
        else ending = 'standup-complete'
        set({
          ...meterPatch,
          ...toastPatch,
          handledNPCs: next,
          phase: 'ended',
          ending,
          ...endingPatch(ending),
        })
      }
    }

    // Schedule auto-clear of the toast. Idempotent — only clears if the
    // same toast is still showing (a newer toast would have replaced it).
    if (firedToasts.length > 0) {
      const just = firedToasts.join('\n\n')
      setTimeout(() => {
        if (get().recentDelayedToast === just) {
          set({ recentDelayedToast: null })
        }
      }, DELAYED_TOAST_DURATION_MS)
    }
  },

  incrementCoping: (actionId) =>
    set((s) => ({
      copingUseCounts: { ...s.copingUseCounts, [actionId]: (s.copingUseCounts[actionId] ?? 0) + 1 },
    })),

  setNearbyNPC: (npcId) => set({ nearbyNPC: npcId }),

  openDialogue: (npcId) => set({ activeDialogue: npcId, choiceResult: null }),

  closeDialogue: () => set({ activeDialogue: null, choiceResult: null }),

  triggerBark: (npcId, text) => {
    set({ recentBarkNPC: npcId, recentBarkText: text ?? null })
    setTimeout(() => {
      // Only clear if the same NPC is still the recent bark — a more recent
      // interaction may have replaced it, in which case let that one finish.
      if (get().recentBarkNPC === npcId) {
        set({ recentBarkNPC: null, recentBarkText: null })
      }
    }, BARK_DURATION_MS)
  },

  interactObject: (npcId) => {
    const config = OBJECT_INTERACTIONS[npcId]
    if (!config) return
    const s = get()
    const uses = s.copingUseCounts[npcId] ?? 0
    if (uses >= config.maxUses) {
      // Already maxed out — pop the exhausted bark; no meter effect.
      // We still call triggerBark via setTimeout so the timeout clears.
      set({ recentBarkNPC: npcId, recentBarkText: config.exhaustedBark })
      setTimeout(() => {
        if (get().recentBarkNPC === npcId) {
          set({ recentBarkNPC: null, recentBarkText: null })
        }
      }, BARK_DURATION_MS)
      return
    }
    const e = config.effects
    set({
      copingUseCounts: { ...s.copingUseCounts, [npcId]: uses + 1 },
      timeMinutes: s.timeMinutes + (e.time ?? 0),
      projectStatus: clamp(s.projectStatus + (e.projectStatus ?? 0), 0, 100),
      pissedOff: clamp(s.pissedOff + (e.pissedOff ?? 0), 0, 100),
      meetingLoad: clamp(s.meetingLoad + (e.meetingLoad ?? 0), 0, 100),
      alignment: Math.max(0, s.alignment + (e.alignment ?? 0)),
      recentBarkNPC: npcId,
      recentBarkText: config.barks[uses] ?? config.barks[config.barks.length - 1],
    })
    // Printer-specific: Leonard physically slaps the printer when the
    // player chooses "Unjam the printer". Player.tsx watches this counter
    // and runs a ~0.7s slap arc on the right arm. Other object NPCs
    // (Phyllis, Coffee) don't get the slap.
    if (npcId === 'printer') {
      slapState.printerSlapTrigger++
    }
    setTimeout(() => {
      if (get().recentBarkNPC === npcId) {
        set({ recentBarkNPC: null, recentBarkText: null })
      }
    }, BARK_DURATION_MS)
  },

  recordChoice: (npcId, choiceId, resultCopy, followUp) =>
    set((s) => ({
      choiceResult: { npcId, choiceId, resultCopy, followUp },
      // Persist the pick so the retro board knows what the player did with
      // this stakeholder, even after the dialogue closes.
      npcChoices: { ...s.npcChoices, [npcId]: choiceId },
    })),

  queueDelayedEffect: (d) =>
    set((s) => ({ pendingDelayedEffects: [...s.pendingDelayedEffects, d] })),

  clearDelayedToast: () => set({ recentDelayedToast: null }),

  pushSlackMessage: (msg) =>
    set((s) => {
      const id = `slack-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
      const next: SlackMessage = {
        id,
        npcId: msg.npcId,
        npcName: msg.npcName,
        channel: msg.channel,
        text: msg.text,
        isDelayed: msg.isDelayed,
        timestamp: Date.now(),
      }
      // Cap the feed at 60 to avoid unbounded growth across long runs.
      const trimmed = [...s.slackMessages, next].slice(-60)
      // If panel is open, treat as read; otherwise increment unread badge.
      const unreadSlack = s.slackOpen ? s.unreadSlack : s.unreadSlack + 1
      return { slackMessages: trimmed, unreadSlack }
    }),

  toggleSlack: () =>
    set((s) => {
      const opening = !s.slackOpen
      return {
        slackOpen: opening,
        unreadSlack: opening ? 0 : s.unreadSlack,
        // Sticky flag — once true for this run, stays true even if you
        // close the panel again. Used by the Permanent Lurker / Inbox Zero
        // achievements at end of run.
        runSlackOpened: s.runSlackOpened || opening,
      }
    }),

  closeSlack: () => set({ slackOpen: false }),

  applyRecovery: (e) =>
    set((s) => {
      // Apply effects identically to applyEffects, then re-evaluate game-end
      // conditions. This is the only path out of pendingRecovery.
      const meetingLoad = clamp(s.meetingLoad + (e.meetingLoad ?? 0), 0, 100)
      const pissedOff = clamp(s.pissedOff + (e.pissedOff ?? 0), 0, 100)
      const projectStatus = clamp(s.projectStatus + (e.projectStatus ?? 0), 0, 100)
      const alignment = Math.max(0, s.alignment + (e.alignment ?? 0))
      const timeMinutes = s.timeMinutes + (e.time ?? 0)
      const base = {
        meetingLoad,
        pissedOff,
        projectStatus,
        alignment,
        timeMinutes,
        pendingRecovery: null,
      } as const

      const endingPatch = (ending: Ending) =>
        finalizeAchievements(
          {
            ending,
            projectStatus,
            pissedOff,
            meetingLoad,
            alignment,
            timeMinutes,
            copingUseCounts: s.copingUseCounts,
            recoveryTriggered: s.runRecoveryTriggered, // already true at this point
            delayedFireCount: s.runDelayedFireCount,
            slackOpenedAtAll: s.runSlackOpened,
            finalUnreadSlack: s.unreadSlack,
          },
          s.unlockedAchievements
        )

      // Did the recovery actually rescue us? If meetingLoad still >= 75,
      // the apocalypse lands. If the player traded calendar for an angry
      // team and tripped that cliff instead, full-escalation takes over.
      if (meetingLoad >= 75) {
        return { ...base, phase: 'ended', ending: 'calendar-apocalypse', ...endingPatch('calendar-apocalypse') }
      }
      if (pissedOff >= 75 || projectStatus < 45) {
        return { ...base, phase: 'ended', ending: 'full-escalation', ...endingPatch('full-escalation') }
      }

      // Recovery happened on the last NPC — run win logic with new meters.
      // Mirrors the win-pick path in markHandled, including the
      // pyrrhic-alignment check.
      const allHandled = REQUIRED_NPC_IDS.every((id) => s.handledNPCs.has(id))
      if (allHandled) {
        let ending: Ending
        if (alignment >= 6 && pissedOff >= 40) ending = 'pyrrhic-alignment'
        else if (projectStatus < 70) ending = 'green-enough'
        else ending = 'standup-complete'
        return { ...base, phase: 'ended', ending, ...endingPatch(ending) }
      }

      // Survived — back to playing.
      return base
    }),

  endGame: (ending) => set({ phase: 'ended', ending }),

  // Reset preserves the persistent achievement set (achievements are
  // cross-run). Everything else snaps back to INITIAL.
  reset: () =>
    set((s) => ({
      ...INITIAL,
      handledNPCs: new Set(),
      copingUseCounts: {},
      npcChoices: {},
      unlockedAchievements: s.unlockedAchievements,
    })),
})))

// ---- Selectors / derived helpers ----

export function selectFormattedTime(s: State): string {
  // Convert minutes since 9:00 AM to a clock string
  const totalMin = 9 * 60 + s.timeMinutes
  const hh = Math.floor(totalMin / 60)
  const mm = totalMin % 60
  const period = hh < 12 ? 'AM' : 'PM'
  const display = ((hh + 11) % 12) + 1
  return `${display}:${mm.toString().padStart(2, '0')} ${period}`
}

export function selectRequiredCountMet(s: State): boolean {
  // The 5 required NPCs are Brent / Tasha / Priya / Chad / Diane
  const required = ['brent', 'tasha', 'priya', 'chad', 'diane']
  return required.every((id) => s.handledNPCs.has(id))
}

export function selectAlignmentMet(s: State): boolean {
  return s.alignment >= 4
}

export function selectWinReady(s: State): boolean {
  // The MVP ends the moment 5 NPCs are handled (per Gemini review)
  return s.handledNPCs.size >= WIN_NPC_COUNT
}

// ---- Performance rating (Build 3b) ----

export type Rating = {
  tier: 'gold' | 'silver' | 'bronze' | 'none'
  score: number
  label: string
  critique: string // PIP-style one-line corporate review
}

// Compute a performance rating from the final state. Failure endings get
// a 'none' tier (no rating shown); wins get bronze/silver/gold by score.
//
// NOTE: this is NOT a zustand selector. It returns a fresh object every
// call, which would cause an infinite-loop "getSnapshot should be cached"
// crash if subscribed via `useGameStore(selectRating)`. Call it from
// already-subscribed primitives instead:
//   const rating = computeRating({ ending, projectStatus, pissedOff, ... })
//
// Formula: project + alignment*8 - pissedOff/2 - meetingLoad/3
//   - Project carries most weight (it's the headline number)
//   - Alignment multiplied (max ~8 unscaled → +64 contribution)
//   - Anger and calendar pressure penalize
//
// Threshold targets calibrated for the worst-tuning case (Build 1c):
//   - All-A-route player ≈ project 83, align 7, pissed 0, meeting 14
//     → score = 83 + 56 - 0 - 4.6 ≈ 134 → Gold
//   - Mixed-realistic player ≈ project 75, align 5, pissed 8, meeting 25
//     → score = 75 + 40 - 4 - 8.3 ≈ 103 → Silver
//   - Sloppy-win player ≈ project 60, align 3, pissed 30, meeting 35
//     → score = 60 + 24 - 15 - 11.7 ≈ 57 → Bronze
export type RatingInput = {
  ending: Ending | null
  projectStatus: number
  pissedOff: number
  meetingLoad: number
  alignment: number
  // Minutes elapsed since 9:00 AM at game end. Used to apply a lateness
  // penalty when timeMinutes > STANDUP_TIME_MINUTES.
  timeMinutes: number
  // How many of the 5 required NPCs the player actually handled. Used as a
  // completion bonus AND as a hard gate for Gold (no Gold for partial runs).
  npcsHandled: number
}

export function computeRating(s: RatingInput): Rating {
  // Failure endings (and the pyrrhic-alignment "satirical win") all skip
  // the corporate-rating system. Pyrrhic ending has its own narrative.
  if (
    s.ending !== 'standup-complete' &&
    s.ending !== 'green-enough'
  ) {
    return {
      tier: 'none',
      score: 0,
      label: '—',
      critique: 'No rating — performance review deferred to a different conversation.',
    }
  }
  // Lateness penalty: each minute past the standup deadline costs
  // LATE_PENALTY_PER_MINUTE off the score. The satirical bit: even taking
  // the "honest path" (all-A choices) blows the deadline by ~5min, so
  // every conscientious run pays this tax.
  const minutesLate = Math.max(0, s.timeMinutes - STANDUP_TIME_MINUTES)
  const latePenalty = minutesLate * LATE_PENALTY_PER_MINUTE
  // Completion bonus: handling all 5 NPCs is worth +15 to the score; a
  // partial run gets proportional credit. This way "completing the standup
  // by talking to everyone" actually matters quantitatively.
  const completionBonus = s.npcsHandled * 3
  const score = Math.round(
    s.projectStatus +
      s.alignment * 9 -
      s.pissedOff / 2 -
      s.meetingLoad / 3 -
      latePenalty +
      completionBonus
  )
  // Lateness suffix appended to the critique so the player sees WHY their
  // score dropped (otherwise the lateness penalty would feel mysterious).
  const lateSuffix =
    minutesLate > 0 ? ` Marked late by ${minutesLate}m to the 10:15 standup.` : ''
  // Force non-Gold for partial completions — you can't get Exceeds
  // Expectations without actually doing the work, even with perfect meters.
  const goldEligible = s.npcsHandled >= 5
  if (score >= 120 && goldEligible) {
    return {
      tier: 'gold',
      score,
      label: 'Exceeds Expectations',
      critique:
        '"Demonstrates exceptional alignment across cross-functional surfaces. Promotion candidate next cycle."' +
        lateSuffix,
    }
  }
  if (score >= 85) {
    return {
      tier: 'silver',
      score,
      label: 'Meets Expectations',
      critique:
        '"Strong ownership and solid stakeholder navigation. Continue developing executive presence."' +
        lateSuffix,
    }
  }
  return {
    tier: 'bronze',
    score,
    label: 'Approaches Expectations',
    critique:
      '"Adequate alignment. Opportunity to be more proactive around stakeholder management."' +
      lateSuffix,
  }
}

function clamp(v: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, v))
}

// End-of-run patch for a "missed-standup" loss (hard deadline crossed).
// Shared by applyEffects (costly choices / coping) and addWalkTime (dawdling)
// so the deadline behaves identically no matter what advanced the clock.
// `s` supplies the run-scoped achievement inputs; `m` the final meters.
function missedStandupPatch(
  s: State,
  m: {
    timeMinutes: number
    projectStatus: number
    pissedOff: number
    meetingLoad: number
    alignment: number
  }
) {
  return {
    phase: 'ended' as const,
    ending: 'missed-standup' as Ending,
    ...finalizeAchievements(
      {
        ending: 'missed-standup',
        projectStatus: m.projectStatus,
        pissedOff: m.pissedOff,
        meetingLoad: m.meetingLoad,
        alignment: m.alignment,
        timeMinutes: m.timeMinutes,
        copingUseCounts: s.copingUseCounts,
        recoveryTriggered: s.runRecoveryTriggered,
        delayedFireCount: s.runDelayedFireCount,
        slackOpenedAtAll: s.runSlackOpened,
        finalUnreadSlack: s.unreadSlack,
      },
      s.unlockedAchievements
    ),
  }
}

// Compute newly-unlocked achievement IDs given a run's final snapshot.
// Returns the merged set (prior ∪ earned) and just the new IDs (for toast).
// Persists to localStorage as a side effect — this is the single
// commit point for achievement state.
function finalizeAchievements(
  snap: RunSnapshot,
  prior: Set<string>
): {
  unlockedAchievements: Set<string>
  lastUnlockedAchievements: string[]
  earnedThisRun: string[]
} {
  const earned = evaluateAchievements(snap)
  const newlyUnlocked = earned.filter((id) => !prior.has(id))
  const merged = new Set(prior)
  for (const id of newlyUnlocked) merged.add(id)
  saveUnlocked(merged)
  // earnedThisRun = every achievement whose condition the snapshot meets,
  // regardless of whether the player already had it. Drives the pop-in
  // celebration on the ending screen so replays still feel rewarding.
  return {
    unlockedAchievements: merged,
    lastUnlockedAchievements: newlyUnlocked,
    earnedThisRun: earned,
  }
}
