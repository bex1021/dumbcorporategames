// Ambient Slack message pool. The "running channel" the player can dip in
// and out of — populated with in-character chatter that mirrors what the
// NPCs would actually be saying about the project on a normal Wednesday.
//
// Each message is plain flavor — no game-mechanical consequences. The
// delayed-effect system (Build 2b) feeds its own messages into the same
// panel via the store's pushSlackMessage action.

export type SlackTemplate = {
  npcId: string // matches NPCS ids; 'system' for non-character
  npcName: string
  channel: string // '#engineering', '#design', '#general', 'DM' (to PM)
  text: string
}

// Stable starter pings that appear at game start, in order. These set the
// scene: things are already happening when you arrive at your desk.
export const STARTER_PINGS: SlackTemplate[] = [
  {
    npcId: 'system',
    npcName: 'Slack',
    channel: '#announcements',
    text: 'Reminder: standup at 10:00 AM sharp. Please be aligned by then. 💚',
  },
  {
    npcId: 'chad',
    npcName: 'Chad',
    channel: '#sales',
    text: "Closed Acme last night 🎉 They think we're shipping Thursday. Probably fine.",
  },
  {
    npcId: 'priya',
    npcName: 'Priya',
    channel: '#product',
    text: "Updated the PRD this morning. Mostly typos. Also a new feature.",
  },
]

// Rolling ambient pool. The ticker picks one of these at random every
// ~25-45 seconds. Repeat avoidance handled in the ticker (recent IDs).
export const AMBIENT_POOL: SlackTemplate[] = [
  // Brent — Engineering
  {
    npcId: 'brent',
    npcName: 'Brent',
    channel: '#engineering',
    text: "finally figured out why staging crashed at 3am. spoiler: it was the thing i said it would be.",
  },
  {
    npcId: 'brent',
    npcName: 'Brent',
    channel: '#engineering',
    text: "anyone know if we own this dependency or if it's still upstream's responsibility 👀",
  },
  {
    npcId: 'brent',
    npcName: 'Brent',
    channel: 'DM',
    text: "quick q: is 'Define Premium' still a P0? want to make sure i'm not blocking the wrong thing",
  },
  {
    npcId: 'brent',
    npcName: 'Brent',
    channel: '#engineering',
    text: "opened ALN-1847: deduplicate the deduplication logic. yes this is a real ticket.",
  },

  // Tasha — Design
  {
    npcId: 'tasha',
    npcName: 'Tasha',
    channel: '#design',
    text: "leadership wants the colors to feel more aspirational. proposed: same colors, slightly more saturated 🎨",
  },
  {
    npcId: 'tasha',
    npcName: 'Tasha',
    channel: '#design',
    text: "Figma got slow again. closing 47 tabs.",
  },
  {
    npcId: 'tasha',
    npcName: 'Tasha',
    channel: 'DM',
    text: "re: the design — do we have a working definition of 'pop' yet?",
  },
  {
    npcId: 'tasha',
    npcName: 'Tasha',
    channel: '#design',
    text: "new logo lockup ready for review. it's the old one.",
  },

  // Priya — Product
  {
    npcId: 'priya',
    npcName: 'Priya',
    channel: '#product',
    text: "quick FYI: the small change is no longer small.",
  },
  {
    npcId: 'priya',
    npcName: 'Priya',
    channel: '#product',
    text: "moving 'auth flow' to Phase 2.5 (a new phase i just invented).",
  },
  {
    npcId: 'priya',
    npcName: 'Priya',
    channel: 'DM',
    text: "wondering if we should sync on scope today. it's getting interesting.",
  },
  {
    npcId: 'priya',
    npcName: 'Priya',
    channel: '#general',
    text: "reminder that the product strategy is 'be incredible' 🙏",
  },

  // Chad — Sales
  {
    npcId: 'chad',
    npcName: 'Chad',
    channel: 'DM',
    text: "hey just checking in. how's the thing for that thing going?",
  },
  {
    npcId: 'chad',
    npcName: 'Chad',
    channel: '#sales',
    text: "great call w/ the prospect. promised them three things i'll explain later.",
  },
  {
    npcId: 'chad',
    npcName: 'Chad',
    channel: '#general',
    text: "anyone seen the latest from the client? they have... opinions.",
  },
  {
    npcId: 'chad',
    npcName: 'Chad',
    channel: '#sales',
    text: "just confirming — Thursday demo is still happening, right? right?",
  },

  // Diane — HR
  {
    npcId: 'diane',
    npcName: 'Diane',
    channel: 'DM',
    text: "hey, do you have 15 minutes today? all my 1:1 slots are taken but I can find something",
  },
  {
    npcId: 'diane',
    npcName: 'Diane',
    channel: '#general',
    text: "kindness audit update: we're at 73% kind this week 💚 let's push for 75!",
  },
  {
    npcId: 'diane',
    npcName: 'Diane',
    channel: 'DM',
    text: "gentle reminder that all feedback should be actionable, kind, and legally survivable",
  },

  // Exec
  {
    npcId: 'exec',
    npcName: 'Exec',
    channel: 'DM',
    text: "quick FYI status must stay GREEN today. you got this 💪",
  },
  {
    npcId: 'exec',
    npcName: 'Exec',
    channel: '#leadership',
    text: "leaning into impact this Q. let's go team! 🙌",
  },
  {
    npcId: 'exec',
    npcName: 'Exec',
    channel: 'DM',
    text: "heard the morning sync went well. love the leadership presence 👏",
  },

  // System / ambient noise
  {
    npcId: 'system',
    npcName: 'Slackbot',
    channel: '#engineering',
    text: 'Alert: prod CPU at 73%. Probably nothing.',
  },
  {
    npcId: 'system',
    npcName: 'Slackbot',
    channel: '#general',
    text: 'Reminder: kitchen restock is Friday. The good seltzer is back.',
  },
  {
    npcId: 'system',
    npcName: 'Slackbot',
    channel: '#announcements',
    text: 'Fire alarm test today between 10am and 4pm. Please ignore unless real.',
  },
]
