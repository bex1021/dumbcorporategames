// Dialogue data for the 5 required NPCs. Sourced verbatim from the locked
// Blocked_Standup_Content_Pack.md v0.2 (no changes to copy without confirming
// with the user — content is the source of truth for tone).
//
// Tuning pass (Build 1c, 2026-05-25):
//   Negative effects were initially too gentle — full-escalation /
//   calendar-apocalypse endings were mathematically unreachable. We bumped
//   pissedOff and meetingLoad costs ~30–50% on the "bad" choices, added
//   projectStatus drops where the in-fiction outcome implies real schedule
//   pain, and added small projectStatus costs to the long-meeting routes so
//   there's a real tradeoff between alignment-via-meetings and shipping.
//   The "do the work" A-choices still trend best but no longer dominate.

import type { Effects } from '../state/gameStore'

export type SoundCue = 'slack' | 'gmail' | 'calendar' | 'none'

// Some choices foreshadow consequences ("reality clears its throat",
// "an engineer sits up straighter, sensing danger"). delayedEffects is how
// that promise gets paid out — additional meter changes that fire N more
// NPC interactions later, accompanied by a toast.
export type DelayedEffect = {
  delayInteractions: number // fires after this many more NPCs are handled (1 = next NPC)
  effects: Effects // applied at fire time
  toastCopy: string // shown to the player when the effect actually lands
}

export type DialogueChoice = {
  id: string // 'a' | 'b' | 'c' | 'd'
  label: string // button text
  effects: Effects // applied to meters on click
  resultCopy: string // shown after click
  followUp?: string // optional toast copy (Slack/Gmail/Calendar notification)
  sound: SoundCue
  delayedEffects?: DelayedEffect // optional deferred punishment/payoff
}

export type NPCDialogue = {
  npcId: string
  introLine: string
  choices: DialogueChoice[]
}

export const DIALOGUE: Record<string, NPCDialogue> = {
  brent: {
    npcId: 'brent',
    introLine:
      "No blockers. I just need someone to explain what the requirement means by 'simple but powerful.' Also, 'premium but frictionless' appears three times.",
    choices: [
      {
        id: 'a',
        // Best route: real work, small cost in time, real alignment gain
        label: 'Clarify the requirement like a sane person',
        effects: { time: 15, pissedOff: -4, alignment: 1 },
        resultCopy:
          "You ask Product to define 'premium.' A brief silence suggests no one has ever considered this.\n\nThe Engineer makes eye contact for the first time today.",
        followUp: "Slack — Product: 'Could we avoid getting too tactical this early?'",
        sound: 'slack',
      },
      {
        id: 'b',
        // Process: feels productive, slowly clogs the calendar
        label: 'Create a Jira ticket called "Define Premium"',
        effects: { time: 10, meetingLoad: 5, pissedOff: 4, alignment: 1 },
        resultCopy:
          'The blocker now has a ticket number, which makes it feel less like despair and more like governance.\n\nEngineer Trust decreased slightly.',
        followUp: "Gmail — 'You have been mentioned in ALIGN-1842: Define Premium.'",
        sound: 'gmail',
      },
      {
        id: 'c',
        // Meeting route: high meeting load + project slips while you sync.
        // Delayed: the sync spawns a sub-meeting (the tax for scheduling
        // is meetings beget meetings).
        label: 'Schedule a quick sync',
        effects: { time: 30, projectStatus: -3, meetingLoad: 14, pissedOff: 8, alignment: 1 },
        resultCopy:
          'A 30-minute meeting appears where lunch used to be.\n\nEveryone accepts except the person required to make the decision.',
        sound: 'calendar',
        delayedEffects: {
          delayInteractions: 1,
          effects: { meetingLoad: 6 },
          toastCopy:
            "Calendar — The quick sync somehow spawned a sub-meeting. (30m, no agenda.)",
        },
      },
      {
        id: 'd',
        // Dismissive route: protect the narrative, hurt the project hard.
        // Delayed: engineer's PR blocks the sprint a couple NPCs later.
        label: '"Great, sounds like no blockers."',
        effects: { time: 5, projectStatus: -10, pissedOff: 16, alignment: -1 },
        resultCopy:
          'You preserve the standup narrative. Reality takes notes.\n\nThe Engineer says "sure" in a way that shortens your lifespan.',
        sound: 'slack',
        delayedEffects: {
          delayInteractions: 2,
          effects: { projectStatus: -5, pissedOff: 5 },
          toastCopy:
            "Slack — Brent: 'Just realized I literally can't ship without that clarification.'",
        },
      },
    ],
  },

  tasha: {
    npcId: 'tasha',
    introLine:
      'No blockers. Leadership just asked if the design could feel more enterprise, but less B2B. Also more human, but not casual.',
    choices: [
      {
        id: 'a',
        label: 'Ask for specific feedback',
        effects: { time: 15, meetingLoad: 4, pissedOff: -3, alignment: 1 },
        resultCopy:
          'You ask what "enterprise but not B2B" means. The room briefly becomes unsafe for brand adjectives.\n\nDesigner appreciated this, which is dangerous because now they expect clarity.',
        sound: 'slack',
      },
      {
        id: 'b',
        // Forbidden words — relationship damage, rework, no alignment credit
        label: 'Suggest "make it pop"',
        effects: { time: 5, projectStatus: -6, pissedOff: 18, alignment: -1 },
        resultCopy:
          'You have said the forbidden words.\n\nThe Designer acknowledges the input. They will quietly redo the file from scratch and log the time as "iteration."',
        sound: 'none',
      },
      {
        id: 'c',
        // Stakeholder-map route: maxxes alignment but devastates calendar + ship date.
        // Delayed: the stakeholder map has teeth (more meetings appear later).
        label: 'Socialize the design with stakeholders',
        // One of only two +2-alignment choices in the game. Tuned across two
        // passes (now time 16, pissed 13) so a full alignment-max run lands
        // ~10:20 — comfortably under the 90-min deadline even with normal
        // walking — and reliably clears pissed-off 45 with margin. Forcing
        // everyone into a socialization meeting IS the "hated" part.
        effects: { time: 16, projectStatus: -4, meetingLoad: 18, pissedOff: 13, alignment: 2 },
        resultCopy:
          'You transform one opinion into seven opinions and call it alignment.\n\nThe design now has a stakeholder map. The map has teeth.',
        sound: 'calendar',
        delayedEffects: {
          delayInteractions: 1,
          effects: { meetingLoad: 6, pissedOff: 2 },
          toastCopy:
            "Calendar — Stakeholder #4 'has a few thoughts.' 45-min slot added.",
        },
      },
      {
        id: 'd',
        // The phrase enters the source of truth, which means it gets
        // scheduled into a future "brand tension calibration" meeting.
        label: 'Reframe feedback as "brand tension"',
        effects: { time: 10, meetingLoad: 3, pissedOff: -2, alignment: 1 },
        resultCopy:
          'Nobody understands what brand tension is, so nobody can disagree with it.\n\nThe phrase enters the source of truth unchallenged.',
        sound: 'gmail',
      },
    ],
  },

  priya: {
    npcId: 'priya',
    introLine:
      'No blockers. I added one small requirement. It may affect onboarding, permissions, reporting, mobile, and the legal footer, but emotionally it\'s small.',
    choices: [
      {
        id: 'a',
        label: 'Ask them to define MVP',
        effects: { time: 15, meetingLoad: 3, pissedOff: 2, alignment: 1 },
        resultCopy:
          'Product defines MVP as "the smallest version customers would not complain about publicly."\n\nThis is not helpful, but it is a sentence.',
        sound: 'slack',
      },
      {
        id: 'b',
        // Best scope-control move, but engineers know "Phase 2" means
        // "never" — there's a real trust cost. Dropped from align 2 → 1
        // and bumped pissed +3 so it's a real tradeoff, not free.
        label: 'Move the new requirement to Phase 2',
        effects: { time: 10, projectStatus: 3, pissedOff: 8, alignment: 1 },
        resultCopy:
          'The requirement has been moved to Phase 2, a beautiful farm upstate where scope goes to run free.\n\nProduct says "totally" and immediately starts a Phase 2 doc.',
        sound: 'gmail',
      },
      {
        id: 'c',
        // Meeting route: alignment via process + project slip + heavy calendar
        label: 'Schedule scope alignment',
        effects: { time: 30, projectStatus: -3, meetingLoad: 16, pissedOff: 9, alignment: 1 },
        resultCopy:
          'You create a meeting to determine whether the small thing is small.\n\nIt is not small.',
        sound: 'calendar',
      },
      {
        id: 'd',
        // Sloppy yes: small fast hit now, biggest project drop in the game.
        // Delayed: the "small" change cracks onboarding two NPCs later.
        label: 'Accept the small change',
        effects: { time: 5, projectStatus: -12, pissedOff: 13, alignment: 0 },
        resultCopy:
          'You accept the change because today has already developed a plot.\n\nSomewhere, an engineer sits up straighter, sensing danger.',
        sound: 'slack',
        delayedEffects: {
          delayInteractions: 2,
          effects: { projectStatus: -6, pissedOff: 3 },
          toastCopy:
            "Slack — Brent: 'The small change just broke onboarding for new users. Cool cool cool.'",
        },
      },
    ],
  },

  chad: {
    npcId: 'chad',
    introLine:
      'No blockers. I may have told the client this would be live Thursday. Not committed committed. More like relationship committed.',
    choices: [
      {
        id: 'a',
        // Honest investigation: surfaces the truth, project still moves
        label: 'Ask what exactly was promised',
        effects: { time: 15, projectStatus: -3, pissedOff: 4, alignment: 1 },
        resultCopy:
          'Sales describes a feature, a strategy, and a legally binding vibe.\n\nYou learn the client has screenshots of a thing that does not exist.',
        sound: 'gmail',
      },
      {
        id: 'b',
        // Best diplomatic move, but reframing a committed date makes some
        // people antsy — bumped pissed -2 → +3 so it's not a free win.
        label: 'Reframe Thursday as "target state"',
        effects: { time: 10, pissedOff: 3, alignment: 2 },
        resultCopy:
          'Thursday is no longer a date. It is a directional aspiration.\n\nSales nods like this was the plan all along.',
        sound: 'slack',
      },
      {
        id: 'c',
        // Escalation route: leadership chaos
        label: 'Loop in leadership',
        effects: { time: 20, projectStatus: -5, meetingLoad: 12, pissedOff: 12, alignment: 1 },
        resultCopy:
          'You summon leadership. The air pressure changes.\n\nAn executive reacts with a thumbs-up emoji, which everyone interprets differently.',
        sound: 'slack',
      },
      {
        id: 'd',
        // Risk-monitor theater: stays Green on dashboard, eats project silently.
        // Delayed: reality, which has been clearing its throat, escalates.
        label: 'Mark risk as "being monitored"',
        effects: { time: 5, projectStatus: -8, pissedOff: 9, alignment: 1 },
        resultCopy:
          'The risk is now being monitored, which means it can hurt you later with documentation.\n\nDashboard remains Green. Reality clears its throat.',
        sound: 'gmail',
        delayedEffects: {
          delayInteractions: 2,
          effects: { projectStatus: -5, pissedOff: 4 },
          toastCopy:
            "Gmail — Auto: 'Risk ALN-1842 has been auto-escalated to Red after 48hrs of monitoring.'",
        },
      },
    ],
  },

  diane: {
    npcId: 'diane',
    introLine:
      'Just a quick check-in. A few themes have surfaced in 1:1s — nothing actionable per se. Reminder that all feedback should be actionable, kind, and legally survivable. Also someone used "ownership" in a way that created concern.',
    choices: [
      {
        id: 'a',
        label: 'Ask HR for approved performance language',
        effects: { time: 20, meetingLoad: 5, pissedOff: -3, alignment: 1 },
        resultCopy:
          'HR provides six phrases that sound supportive and mean nothing.\n\n"Opportunity to increase cross-functional impact" has entered your inventory.',
        sound: 'gmail',
      },
      {
        id: 'b',
        // It's actually a non-answer — calms the room but doesn't produce
        // real "alignment artifacts." Dropped align 1 → 0; pissed cooldown
        // stays because it does defuse.
        label: 'Say "This feels like a growth moment"',
        effects: { time: 5, pissedOff: -2, alignment: 0 },
        resultCopy:
          'Everyone becomes calmer and less honest.\n\nThe office temperature drops by two degrees.',
        sound: 'none',
      },
      {
        id: 'c',
        // Calibration route: huge meeting cost + alignment payoff
        label: 'Schedule feedback calibration',
        // The other +2-alignment choice. Same tuning as Tasha C: time 16,
        // pissed 13, so the alignment-max run fits the deadline and clears
        // the Aligned-but-Hated corridor (align ≥7, pissed ≥45) with margin.
        effects: { time: 16, projectStatus: -2, meetingLoad: 18, pissedOff: 13, alignment: 2 },
        resultCopy:
          'You create a meeting where everyone will agree that words have consequences, then choose worse words.',
        sound: 'calendar',
      },
      {
        id: 'd',
        // Avoid HR: looks free, but Diane logs it (real cost).
        // Delayed: HR's notes resurface as a "follow-up needed" flag.
        label: 'Ignore HR gently',
        effects: { time: 5, pissedOff: 12, alignment: -1 },
        resultCopy:
          'You nod with enough warmth to avoid follow-up.\n\nHR writes something down anyway.',
        sound: 'gmail',
        delayedEffects: {
          delayInteractions: 1,
          effects: { pissedOff: 6 },
          toastCopy:
            "Gmail — Diane: 'Per our earlier convo. Let's circle back. Adding [skip-level] for visibility.'",
        },
      },
    ],
  },
}

export function getDialogue(npcId: string): NPCDialogue | undefined {
  return DIALOGUE[npcId]
}
